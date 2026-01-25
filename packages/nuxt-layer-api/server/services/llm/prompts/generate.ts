/**
 * Generate Prompt
 *
 * System prompt for LLM resume tailoring
 *
 * Input: Base resume JSON, vacancy description, user profile
 * Output: Tailored resume JSON + match scores (before and after)
 *
 * Related: T104 (US5)
 */

export const GENERATE_SYSTEM_PROMPT = `You are an expert resume optimization assistant. Your task is to tailor a resume to match a specific job vacancy while maintaining factual accuracy.

**Your Goal:**
1. Analyze the job vacancy requirements
2. Optimize the resume to highlight relevant skills and experience
3. Assign match scores (0-100) before and after optimization

**What You Can Modify:**
- **Summary:** Rewrite to emphasize relevant skills and align with the job description
- **Experience descriptions:** Reorder bullet points, emphasize relevant achievements, de-emphasize less relevant details
- **Skills order:** Prioritize skills mentioned in the job description
- **Projects and links:** Highlight projects most relevant to the position
- **Certifications order:** Prioritize relevant certifications

**What You MUST NOT Modify:**
- Personal information (name, email, phone, location, URLs)
- Company names, positions, or dates in experience
- Education institutions, degrees, or dates
- Skill names (only reorder, never add or remove skills)
- Certification names or dates
- Languages or proficiency levels
- Do NOT add skills, experiences, or qualifications that are not in the original resume
- Do NOT exaggerate or fabricate information

**Match Score Rules:**
1. **Before score (0-100):** How well the ORIGINAL resume matches the vacancy
   - Consider: relevant skills, experience level, industry match, role alignment
   - Be realistic and objective

2. **After score (0-100):** How well the TAILORED resume matches the vacancy
   - Should be higher than "before" score (unless already optimal)
   - Improvement should reflect: better keyword alignment, emphasized relevant experience, optimized summary
   - Be realistic: even perfect tailoring cannot create missing qualifications

**Scoring Guidelines:**
- 90-100: Exceptional match, all key requirements met
- 80-89: Strong match, most requirements met
- 70-79: Good match, core requirements met
- 60-69: Moderate match, some requirements met
- 50-59: Weak match, few requirements met
- 0-49: Poor match, minimal alignment

**Output Schema:**
{
  "content": {
    // Same structure as input resume (ResumeContent)
    // Only optimized/reordered, never fabricated
  },
  "matchScoreBefore": number (0-100, how original resume matched),
  "matchScoreAfter": number (0-100, how tailored resume matches)
}

**Important:**
- Return ONLY valid JSON, no explanations or markdown
- Ensure matchScoreAfter >= matchScoreBefore (tailoring should improve or maintain score)
- Maintain all date formats (YYYY-MM), URLs, and data types from original
- Keep the same structure, only optimize content and ordering
- Be honest in scoring: don't inflate scores unrealistically`;

/**
 * Create user prompt for resume generation
 *
 * @param baseResume - Original resume content (JSON)
 * @param vacancy - Vacancy details (company, position, description)
 * @param vacancy.company - Vacancy company name
 * @param vacancy.jobPosition - Vacancy job title or role
 * @param vacancy.description - Vacancy description text
 * @param profile - Optional user profile for additional context
 * @param profile.preferredJobTitle - User's preferred job title
 * @param profile.targetIndustries - User's target industries
 * @param profile.careerGoals - User's career goals
 * @returns User prompt for LLM
 */
export function createGenerateUserPrompt(
  baseResume: unknown,
  vacancy: {
    company: string;
    jobPosition: string | null;
    description: string;
  },
  profile?: {
    preferredJobTitle?: string | null;
    targetIndustries?: string | null;
    careerGoals?: string | null;
  }
): string {
  const position = vacancy.jobPosition ? ` - ${vacancy.jobPosition}` : '';

  let prompt = `Tailor the following resume for this job vacancy:

**Vacancy:**
Company: ${vacancy.company}${position}
Description:
${vacancy.description}
`;

  if (profile) {
    const profileContext = [];
    if (profile.preferredJobTitle) {
      profileContext.push(`Target role: ${profile.preferredJobTitle}`);
    }
    if (profile.targetIndustries) {
      profileContext.push(`Target industries: ${profile.targetIndustries}`);
    }
    if (profile.careerGoals) {
      profileContext.push(`Career goals: ${profile.careerGoals}`);
    }

    if (profileContext.length > 0) {
      prompt += `\n**Candidate Profile:**\n${profileContext.join('\n')}\n`;
    }
  }

  prompt += `
**Original Resume:**
${JSON.stringify(baseResume, null, 2)}

Remember to:
- Optimize the resume to match the vacancy requirements
- Maintain factual accuracy (no fabrication)
- Provide realistic before/after match scores (0-100)
- Keep all dates in YYYY-MM format
- Preserve all URLs and data types
- Return only valid JSON with content and scores`;

  return prompt;
}
