export const buildJobScoringPrompt = (
    resume: { skills: string[], experiences: any[] },
    job: { title: string, description: string, skills: string[] }
) => {
    return `
You are an expert talent evaluator and hiring strategist. Your task is to analyze the candidate’s profile and compare it with the job requirements, then return ONLY a valid JSON object in the exact format provided below.

Candidate Profile:

Skills: ${resume.skills.join(', ')}

Experience: ${JSON.stringify(resume.experiences)}

Job Details:

Title: ${job.title}

Skills Required: ${job.skills.join(', ')}

Description: ${job.description}

Instructions:

Compare the candidate’s skills to the required skills.

Identify matching skills, missing skills, and partial matches.

Evaluate the relevance of the candidate’s experience to the job.

Based on all evidence, assign a score from 0 to 100 (100 = perfect match).

Provide a brief one-sentence reasoning.

Return ONLY a valid JSON object. No extra text, no markdown, no explanation.

JSON format to return:
{
"score": number,
"reasoning": string
}
    `.trim();
};
