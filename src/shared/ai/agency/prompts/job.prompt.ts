const formatList = (label: string, values?: string[]) => {
    if (!values || values.length === 0) return "";
    return `${label}: ${values.join(", ")}`;
};

export const buildJobAiPrompt = (context: {
    title: string;
    seniority_level?: string;
    industry?: string;
    employment_type?: string;
    workplace_type?: string;
    location?: string;
    technical_skills?: string[];
    soft_skills?: string[];
    target?: "description" | "requirements" | "both";
}) => {
    const lines = [
        `Title: ${context.title}`,
        context.seniority_level ? `Seniority: ${context.seniority_level}` : "",
        context.industry ? `Industry: ${context.industry}` : "",
        context.employment_type ? `Employment Type: ${context.employment_type}` : "",
        context.workplace_type ? `Workplace Type: ${context.workplace_type}` : "",
        context.location ? `Location: ${context.location}` : "",
        formatList("Technical Skills", context.technical_skills),
        formatList("Soft Skills", context.soft_skills),
    ]
        .filter(Boolean)
        .join("\n");

    const target = context.target ?? "both";

    return `
You are an HR writing assistant.
Return ONLY valid JSON. No markdown. No extra text.

Context:
${lines}

Task:
- Generate concise, professional job content in English.
- Output HTML strings using <p>, <ul>, <li>, <strong> only.
- Keep content relevant to the title and skills.
- If a field is not requested, return an empty string for it.

Output JSON schema:
{
  "description": string,
  "requirements": string
}

Target: ${target}
    `.trim();
};

