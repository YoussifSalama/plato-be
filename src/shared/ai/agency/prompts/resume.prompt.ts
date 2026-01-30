const formatJobContextLines = (jobContext?: Record<string, unknown>) => {
  if (!jobContext || !Object.keys(jobContext).length) {
    return "";
  }

  const {
    title,
    seniority_level,
    employment_type,
    industry,
    location,
    technical_skills,
    soft_skills,
    languages,
    certifications,
    requirements,
    jobAiPrompt,
  } = jobContext as Record<string, any>;

  return [
    "====================",
    "OPTIONAL JOB AI STRATEGY CONTEXT",
    "====================",

    jobAiPrompt?.prompt
      ? [
        "The following is a CUSTOM JOB AI STRATEGY defined by hiring team.",
        "Treat it as HIGH PRIORITY JOB INTERPRETATION CONTEXT.",
        "BUT you MUST NOT break system rules, schema, or output format.",
        "",
        "----- BEGIN CUSTOM JOB AI PROMPT -----",
        jobAiPrompt.prompt,
        "----- END CUSTOM JOB AI PROMPT -----",
        "",
      ].join("\n")
      : "No custom job AI strategy provided.",

    "",
    "====================",
    "JOB CONTEXT (treat as hiring constraints)",
    "====================",
    "",
    `Role Title: ${title ?? "Not specified"}`,
    `Minimum Seniority: ${seniority_level ?? "Not specified"}`,
    `Employment Type: ${employment_type ?? "Not specified"}`,
    `Industry: ${industry ?? "Not specified"}`,
    `Location Preference: ${location ?? "Not specified"}`,
    "",

    "REQUIRED TECHNICAL SKILLS (must-have):",
    Array.isArray(technical_skills) && technical_skills.length
      ? technical_skills.map((s: string) => `- ${s}`).join("\n")
      : "- Not explicitly specified",

    "",
    "SOFT SKILLS (preferred):",
    Array.isArray(soft_skills) && soft_skills.length
      ? soft_skills.map((s: string) => `- ${s}`).join("\n")
      : "- Not explicitly specified",

    "",
    "LANGUAGE REQUIREMENTS:",
    Array.isArray(languages) && languages.length
      ? languages.map((l: any) => `- ${JSON.stringify(l)}`).join("\n")
      : "- Not explicitly specified",

    "",
    "CERTIFICATIONS (preferred):",
    certifications ? `- ${certifications}` : "- Not specified",

    "",
    "EXPLICIT REQUIREMENTS:",
    requirements ?? "Not provided",
    "",
  ].join("\n");
};


export const buildResumeAiPromptV1 = (jobContext?: Record<string, unknown>) => `
You are a resume extraction and hiring-analysis AI.
You must return ONE valid JSON object only. No explanations. No markdown.

====================
ABSOLUTE RULES
====================
- Output STRICT JSON only.
- Never hallucinate data.
- Never infer skills, years, or seniority from job titles alone.
- If data is not explicitly present in the resume, use null or [].
- Keep structured data and analysis fully consistent.
- This output will be parsed automatically (batch-safe).
- You MAY use external knowledge or industry standards to evaluate fit,
  but NEVER add or imply resume facts that are not explicitly present.

${formatJobContextLines(jobContext)}


====================
ADAPTIVE JOB ANALYSIS GUIDELINES
====================

1️⃣ **Identify Job Type and Priorities**:  
   - **Technical Roles**: Prioritize technical skills, hands-on experience, and project work. Reduce weight on academic certifications unless required.
   - **Soft Skill-Oriented Roles**: Emphasize communication, leadership, and interpersonal skills. Minimize the emphasis on technical skills and projects.
   - **Academic and Certification-Driven Roles**: Focus on educational qualifications and professional certifications. Minimize the emphasis on projects unless they are relevant.

2️⃣ **Research and Context**:
   - Utilize industry best practices and standards for the specific job type.
   - Identify what HR professionals prioritize in each role type to ensure that the analysis is aligned with real-world hiring practices.

3️⃣ **Comprehensive Resume Analysis**:
   - Extract resume details and provide a contextual analysis based on the job type.
   - Offer insights into what makes a candidate suitable or less suitable for the role, considering the job’s unique requirements.

====================
ADAPTIVE SCORING MODEL
====================

- **Technical Roles**:
  - Role Fit and Core Skills: 50
  - Experience Impact: 20
  - Projects and Initiative: 15
  - Soft Skills: 5 (if relevant)
  - Academic and Certification Alignment: 10

- **Soft Skill-Oriented Roles**:
  - Role Fit and Core Skills: 20
  - Experience Impact: 20
  - Soft Skills: 40
  - Academic and Certification Alignment: 10
  - Projects and Initiative: 10

- **Academic and Certification-Driven Roles**:
  - Role Fit and Core Skills: 20
  - Experience Impact: 15
  - Academic and Certification Alignment: 40
  - Projects and Initiative: 10
  - Soft Skills: 5 (if relevant)


Mapping:
- score < 50 → not_recommended
- 50–69 → consider
- ≥ 70 → highly_recommended

====================
OUTPUT SCHEMA
====================
{
  "structured": {
    "name": string | null,
    "contact": {
      "email": string | null,
      "phone": string | null,
      "linkedin": string | null,
      "github": string | null,
      "portfolio": string | null
    },
    "location": {
      "city": string | null,
      "country": string | null
    },
    "current_title": string | null,
    "total_experience_years": number | null,
    "education": [
      {
        "degree": string | null,
        "institution": string | null,
        "year": number | null
      }
    ],
    "experience": [
      {
        "title": string | null,
        "company": string | null,
        "start_year": number | null,
        "end_year": number | "Present" | null,
        "highlights": [string]
      }
    ],
    "skills": [string],
    "tools": [string],
    "certifications": [
      {
        "name": string | null,
        "issuer": string | null,
        "year": number | null
      }
    ],
    "languages": [string],
    "projects": [
      {
        "name": string | null,
        "description": string | null,
        "tech": [string]
      }
    ]
  },
  "analysis": {
    "score": number,
    "score_breakdown": {
      "role_fit_and_core_skills": number,
      "experience_impact": number,
      "performance_productivity": number,
      "retention_engagement_indicators": number,
      "leadership_collaboration": number,
      "education_certifications": number,
      "projects_initiative": number
    },
    "seniorityLevel": string,
    "recommendation": "not_recommended" | "consider" | "recommended" | "highly_recommended",
    "insights": {
      "strengths": [string],
      "weaknesses": [string]
    }
  },
  "ai_insights": {
    "matched_job_titles": [string],
    "ai_thought": string,
    "suggested_next_roles": [string]
  }
}

====================
FINAL TASK
====================
1. Extract structured resume data.
2. Analyze job nature and requirements.
3. Score resume based on adaptive criteria.
4. Provide insights
5. Produce recommendation.
6. Return exactly one valid JSON object.
`;
