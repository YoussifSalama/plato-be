import { InterviewService } from "./interview.service";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type SessionFixture = {
    id: number;
    invitation_token: {
        candidate: {
            candidate_name?: string | null;
            f_name?: string | null;
            l_name?: string | null;
        } | null;
        interview_resource: {
            language: "ar" | "en";
            agency_snapshot: Record<string, unknown>;
            job_snapshot: Record<string, unknown>;
            resume_snapshot: Record<string, unknown>;
            prepared_questions: string[];
            updated_at: Date;
        } | null;
    } | null;
};

function createSessionFixture(overrides?: Partial<SessionFixture>): SessionFixture {
    return {
        id: 99,
        invitation_token: {
            candidate: {
                candidate_name: "Sara Ali",
                f_name: "Sara",
                l_name: "Ali",
            },
            interview_resource: {
                language: "ar",
                agency_snapshot: { company_name: "Plato Agency" },
                job_snapshot: {
                    title: "Frontend Engineer",
                    description: "Build scalable UI.",
                    requirements: "React, TypeScript",
                },
                resume_snapshot: {
                    resume: { parsed: "5 years in React and TypeScript." },
                    structured: { data: { name: "Sara Ali" } },
                },
                prepared_questions: ["Tell me about yourself.", "Explain a difficult bug you solved."],
                updated_at: new Date("2026-03-06T10:00:00.000Z"),
            },
        },
        ...overrides,
    };
}

describe("InterviewService prompt isolation and v3 policy", () => {
    let service: InterviewService;
    let findUniqueMock: any;

    beforeEach(() => {
        service = Object.create(InterviewService.prototype) as InterviewService;
        findUniqueMock = jest.fn();
        (service as unknown as { prisma: unknown }).prisma = {
            interviewSession: {
                findUnique: findUniqueMock,
            },
        };
    });

    it("builds instructions with agency/job/candidate briefing embedded in flow block", () => {
        const instructions = (service as unknown as {
            buildRealtimeInstructionsFromSnapshots: (params: {
                language: "ar" | "en";
                candidateName: string;
                agencySnapshot: Record<string, unknown>;
                jobSnapshot: Record<string, unknown>;
                resumeSnapshot: Record<string, unknown>;
                preparedQuestions: string[];
                customPrompt?: string | null;
            }) => string;
        }).buildRealtimeInstructionsFromSnapshots({
            language: "en",
            candidateName: "Omar Nasser",
            agencySnapshot: {
                company_name: "Plato Agency",
                company_industry: "Tech",
                company_size: "50-200",
                company_description: "A leading AI recruitment platform.",
            },
            jobSnapshot: {
                title: "Backend Engineer",
                description: "Build APIs.",
                requirements: "NestJS, PostgreSQL",
            },
            resumeSnapshot: { resume: { parsed: "Worked on API platforms." } },
            preparedQuestions: ["What is your strongest backend project?"],
            customPrompt: "Keep answers concise and practical.",
        });

        expect(instructions).toContain("Plato Agency");
        expect(instructions).toContain("Backend Engineer");
        expect(instructions).toContain("Omar Nasser");
        expect(instructions).toContain("Normalize text for speech:");
        expect(instructions).toContain("Keep answers concise and practical.");
    });

    it("builds deterministic personalized first message per language", () => {
        const buildFirstMessage = (service as unknown as {
            buildFirstMessage: (params: {
                language: "ar" | "en";
                candidateName: string;
                jobTitle: string;
                agencyName: string;
            }) => string;
        }).buildFirstMessage.bind(service);

        const english = buildFirstMessage({
            language: "en",
            candidateName: "Omar",
            jobTitle: "QA Engineer",
            agencyName: "Plato Agency",
        });
        const arabic = buildFirstMessage({
            language: "ar",
            candidateName: "Omar",
            jobTitle: "QA Engineer",
            agencyName: "Plato Agency",
        });

        expect(english).toContain("Omar");
        expect(english).toContain("QA Engineer");
        expect(english).toContain("Plato Agency");
        expect(arabic).toContain("Omar");
        expect(arabic).toContain("QA Engineer");
        expect(arabic).toContain("Plato Agency");
    });

    it("returns isolated runtime context and changes context_version when snapshots change", async () => {
        const first = createSessionFixture();
        const second = createSessionFixture({
            invitation_token: {
                candidate: { candidate_name: "Mona Hassan", f_name: "Mona", l_name: "Hassan" },
                interview_resource: {
                    language: "ar",
                    agency_snapshot: { company_name: "Plato Agency" },
                    job_snapshot: {
                        title: "Frontend Engineer",
                        description: "Build scalable UI and optimize performance.",
                        requirements: "React, TypeScript, profiling",
                    },
                    resume_snapshot: {
                        resume: { parsed: "8 years in frontend architecture." },
                        structured: { data: { name: "Mona Hassan" } },
                    },
                    prepared_questions: ["Tell me about yourself.", "How do you optimize React renders?"],
                    updated_at: new Date("2026-03-06T10:00:00.000Z"),
                },
            },
        });

        findUniqueMock.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

        const firstContext = await service.buildElevenLabsSessionContext(99);
        const secondContext = await service.buildElevenLabsSessionContext(99);

        expect(firstContext.language).toBe("ar");
        expect(firstContext.dialect).toBe("ar-EG");
        expect(firstContext.first_message).toContain("Sara Ali");
        expect(firstContext.instructions).toContain("Plato Agency");
        expect(firstContext.instructions).toContain("Frontend Engineer");
        expect(firstContext.dynamic_variables.interview_language).toBe("ar");

        expect(secondContext.first_message).toContain("Mona Hassan");
        expect(secondContext.instructions).toContain("Mona Hassan");
        expect(secondContext.instructions).toContain("optimize React renders");
        expect(secondContext.context_version).not.toBe(firstContext.context_version);
    });
});
