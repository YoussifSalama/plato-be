import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { Job, JobWorkplaceType } from '@generated/prisma';
import { OpenAiService } from 'src/shared/services/openai.service';
import { buildJobScoringPrompt } from 'src/shared/ai/candidate/prompts/scoring.prompt';

type MatchedJob = {
    id: number;
    match_score: number;
    matched_skills: string[];
    missing_skills: string[];
    ai_reasoning?: string | null;
    has_applied: boolean;
};

@Injectable()
export class JobMatchingService {
    private readonly logger = new Logger(JobMatchingService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly openaiService: OpenAiService,
    ) { }

    private get openai() {
        return this.openaiService.getRotatedClient().client;
    }

    private calculateSkillMatch(
        candidateSkills: string[],
        jobSkills: string[]
    ) {
        if (!jobSkills.length) return { score: 0, matched: [], missing: [] };

        const normalizedCandidateSkills = candidateSkills.map(s => s.toLowerCase().trim());
        const normalizedJobSkills = jobSkills.map(s => s.toLowerCase().trim());

        const matched = normalizedJobSkills.filter(skill =>
            normalizedCandidateSkills.some(cs => cs.includes(skill) || skill.includes(cs))
        );

        const missing = normalizedJobSkills.filter(skill =>
            !normalizedCandidateSkills.some(cs => cs.includes(skill) || skill.includes(cs))
        );

        const score = (matched.length / jobSkills.length) * 100;

        return {
            score: Math.round(score),
            matched,
            missing
        };
    }

    private async getAppliedJobIds(candidateId: number): Promise<Set<number>> {
        const applications = await this.prisma.jobApplication.findMany({
            where: { candidate_id: candidateId },
            select: { job_id: true }
        });
        return new Set(applications.map(app => app.job_id));
    }

    async getSavedMatches(candidateId: number) {
        const [matches, appliedJobIds] = await Promise.all([
            this.prisma.jobMatch.findMany({
                where: { candidate_id: candidateId },
                include: {
                    job: {
                        include: {
                            agency: {
                                select: {
                                    company_name: true,
                                    company_industry: true,
                                    company_size: true
                                }
                            }
                        }
                    }
                },
                orderBy: { match_score: 'desc' }
            }),
            this.getAppliedJobIds(candidateId)
        ]);

        return matches.map(match => ({
            ...match.job,
            match_score: match.match_score,
            matched_skills: match.matched_skills,
            missing_skills: match.missing_skills,
            ai_reasoning: match.ai_reasoning || undefined,
            has_applied: appliedJobIds.has(match.job_id)
        }));
    }

    private async saveMatches(candidateId: number, matches: MatchedJob[]) {
        // Delete existing matches for this candidate
        await this.prisma.jobMatch.deleteMany({
            where: { candidate_id: candidateId }
        });

        // Save new matches
        await this.prisma.jobMatch.createMany({
            data: matches.map(match => ({
                candidate_id: candidateId,
                job_id: match.id,
                match_score: match.match_score,
                ai_reasoning: match.ai_reasoning || null,
                matched_skills: match.matched_skills,
                missing_skills: match.missing_skills,
            }))
        });
    }

    async refreshMatches(candidateId: number) {
        this.logger.log(`Refreshing job matches for candidate ${candidateId}`);
        const matches = await this.computeMatches(candidateId);
        // Note: saveMatches expects MatchedJob which now has has_applied, 
        // but prisma create doesn't need has_applied. 
        // The saveMatches function maps the input carefully so it ignores extra fields if not destructured,
        // but let's check the map inside saveMatches.
        // It uses: job_id: match.id, match_score: match.match_score... 
        // It does NOT try to save has_applied to JobMatch table (which is correct).
        await this.saveMatches(candidateId, matches);
        return matches;
    }

    private async computeMatches(candidateId: number): Promise<MatchedJob[]> {
        // 1. Fetch Candidate Profile and Resume Data
        const profile = await this.prisma.profile.findUnique({
            where: { candidate_id: candidateId },
            include: {
                experiences: true,
            }
        });

        if (!profile) {
            throw new BadRequestException("Complete your profile to get job matches.");
        }

        const resumeData = profile.resume_parsed as {
            skills?: string[];
            languages?: string[];
            education?: { degree?: string }[];
        } | null;

        const candidateSkills = resumeData?.skills ?? [];
        const candidateExperiences = profile.experiences || [];

        const candidateLocation = profile.location?.toLowerCase().trim();

        // 2. Fetch Active Jobs
        const jobs = await this.prisma.job.findMany({
            where: {
                is_active: true,
            },
            include: {
                agency: {
                    select: {
                        company_name: true,
                        company_industry: true,
                        company_size: true
                    }
                }
            }
        });

        // 3. Preliminary Score and Filter (Heuristic)
        const heuristicMatches = jobs.map(job => {
            let score = 0;

            const isRemote = job.workplace_type === JobWorkplaceType.remote;
            const locationMatch = candidateLocation && job.location.toLowerCase().includes(candidateLocation);

            if (isRemote || locationMatch) {
                score += 20;
            }

            const allJobSkills = [...(job.technical_skills ?? []), ...(job.soft_skills ?? [])];
            const skillAnalysis = this.calculateSkillMatch(candidateSkills, allJobSkills);

            score += (skillAnalysis.score * 0.8);

            return {
                ...job,
                heuristic_score: Math.round(score),
                matched_skills: skillAnalysis.matched,
                missing_skills: skillAnalysis.missing,
                match_score: 0,
                ai_reasoning: null as string | null
            };
        });

        const threshold = 20;
        const topMatches = heuristicMatches
            .filter(j => j.heuristic_score >= threshold)
            .sort((a, b) => b.heuristic_score - a.heuristic_score)
            .slice(0, 5);

        // Fetch applied jobs efficiently
        const appliedJobIds = await this.getAppliedJobIds(candidateId);

        // 4. AI Re-ranking
        const aiScoredMatches = await Promise.all(topMatches.map(async (job) => {
            try {
                const prompt = buildJobScoringPrompt(
                    { skills: candidateSkills, experiences: candidateExperiences },
                    {
                        title: job.title,
                        description: job.description || "",
                        skills: [...(job.technical_skills || []), ...(job.soft_skills || [])]
                    }
                );

                const response = await this.openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.2,
                    response_format: { type: "json_object" }
                });

                const content = response.choices[0].message.content;
                const result = content ? JSON.parse(content) as { score: number, reasoning: string } : { score: job.heuristic_score, reasoning: null };

                return {
                    ...job,
                    match_score: result.score,
                    ai_reasoning: result.reasoning,
                    has_applied: appliedJobIds.has(job.id)
                };
            } catch (error) {
                this.logger.error(`AI scoring failed for job ${job.id}: ${error instanceof Error ? error.message : error}`);
                return {
                    ...job,
                    match_score: job.heuristic_score,
                    has_applied: appliedJobIds.has(job.id)
                };
            }
        }));

        return aiScoredMatches.sort((a, b) => b.match_score - a.match_score);
    }

    async matchJobs(candidateId: number) {
        // Check if matches exist
        const existingMatches = await this.prisma.jobMatch.count({
            where: { candidate_id: candidateId }
        });

        if (existingMatches > 0) {
            // Return saved matches
            return this.getSavedMatches(candidateId);
        }

        // Compute and save new matches
        const matches = await this.computeMatches(candidateId);
        await this.saveMatches(candidateId, matches);
        return matches;
    }
}
