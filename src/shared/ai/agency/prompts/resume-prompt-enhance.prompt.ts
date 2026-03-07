interface JobContext {
    title?: string;
    seniority_level?: string;
    employment_type?: string;
    industry?: string;
    location?: string;
    technical_skills?: string[];
    soft_skills?: string[];
    languages?: unknown[];
    certifications?: string;
    requirements?: string;
}

const formatJobSection = (job: JobContext): string => {
    const lines: string[] = [
        "====================",
        "JOB CONTEXT",
        "====================",
        `Role: ${job.title ?? "Not specified"}`,
        `Seniority: ${job.seniority_level ?? "Not specified"}`,
        `Employment Type: ${job.employment_type ?? "Not specified"}`,
        `Industry: ${job.industry ?? "Not specified"}`,
        `Location: ${job.location ?? "Not specified"}`,
    ];

    if (Array.isArray(job.technical_skills) && job.technical_skills.length) {
        lines.push("", "Required Technical Skills:");
        job.technical_skills.forEach((s) => lines.push(`  - ${s}`));
    }

    if (Array.isArray(job.soft_skills) && job.soft_skills.length) {
        lines.push("", "Preferred Soft Skills:");
        job.soft_skills.forEach((s) => lines.push(`  - ${s}`));
    }

    if (Array.isArray(job.languages) && job.languages.length) {
        lines.push("", "Language Requirements:");
        job.languages.forEach((l) => lines.push(`  - ${JSON.stringify(l)}`));
    }

    if (job.certifications) {
        lines.push("", `Certifications: ${job.certifications}`);
    }

    if (job.requirements) {
        lines.push("", "Explicit Requirements:", job.requirements);
    }

    return lines.join("\n");
};

export const buildEnhanceResumePromptSystemMessage = (job?: JobContext): string => {
    const jobBlock = job ? `\n\n${formatJobSection(job)}\n\nUse the job details above as your primary reference when improving rules and suggesting new ones.` : "";

    return `
You are a senior technical recruiter and hiring strategist helping an agency craft a precise, high-signal AI prompt for automated resume screening.${jobBlock}

====================
AVAILABLE ACTION TAGS
====================
The agency controls three automated actions via special tags in the prompt:
  [shortlist]       → immediately move the candidate to the shortlist
  [send invitation] → automatically send an interview invitation email
  [deny]            → automatically reject the candidate

Each rule must start with exactly one of these tags, followed by a clear condition on the same line.

====================
YOUR TASK
====================
1. ENHANCE the agency's existing rules — make each one specific, measurable, and unambiguous. Replace vague adjectives ("good", "strong", "some") with concrete thresholds (years, numbers, named technologies).

2. SUGGEST additional smart rules the agency has NOT written yet, grounded in the job context. Think like an experienced recruiter: what signals would you look for in a resume for this exact role? Add rules for red flags, green flags, deal-breakers, and exceptional candidates. Be creative and thorough.

3. STRUCTURE the output as follows:
   - General guidance lines (no tag) at the top, if any
   - Then all tagged rules, one per line
   - Group [deny] rules first, then [shortlist], then [send invitation]

====================
STRICT OUTPUT RULES
====================
- Preserve every existing [shortlist], [send invitation], and [deny] tag exactly — do NOT rename them.
- One rule per line — never merge two rules on the same line.
- Return ONLY the final prompt text — no headers, no explanations, no markdown, no code blocks.
- Do NOT invent tags beyond the three above.
- If the original prompt has untagged lines, preserve them (improve wording if vague).
`.trim();
};

export const buildEnhanceResumePromptUserMessage = (rawPrompt: string) =>
    `Here is the agency's current resume analysis prompt. Enhance it and suggest additional smart rules based on the job context provided. Return only the final improved prompt text.\n\n---\n${rawPrompt.trim()}\n---`;
