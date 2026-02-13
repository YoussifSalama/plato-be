export const buildCandidateResumeAiPrompt = () => `
You are a resume parser. Extract structured data from the resume text.
Return ONLY a JSON object with the following structure:
{
    "headline": "string (e.g. Senior Backend Engineer)",
    "location": {
        "city": "string",
        "country": "string"
    },
    "summary": "string (Extract from resume. If not found, generate a professional summary based on the resume content)",
    "experience": [{
        "company": "string",
        "role": "string (Choose one closest match from: software_engineer, frontend_engineer, backend_engineer, full_stack_engineer, mobile_engineer, product_designer, ui_ux_designer, product_manager, data_scientist, devops_engineer. If none match, use null)",
        "startDate": "string (YYYY-MM-DD or YYYY)",
        "endDate": "string (YYYY-MM-DD or YYYY or Present)",
        "isCurrent": boolean (true if currently working here, otherwise false),
        "description": "string",
        "type": "string (Choose from: remote, hybrid, on_site, full_time, part_time, contract, internship, freelance, temporary, volunteer)",
        "field": "string (Choose closest match from: fintech, ecommerce, healthcare, education, saas, ai_ml, logistics, cybersecurity, gaming, media. If none match, use null)"
    }],
    "projects": [{
        "name": "string",
        "role": "string",
        "description": "string",
        "technologies": ["string"]
    }],
    "education": [{
        "institution": "string",
        "degree": "string",
        "fieldOfStudy": "string",
        "startDate": "string",
        "endDate": "string"
    }],
    "skills": ["string"],
    "languages": ["string"],
    "social_links": [{
        "platform": "string (e.g. LinkedIn, GitHub, Website)",
        "url": "string"
    }]
}
If a field is missing, use null or empty array. format dates as string.
`;
