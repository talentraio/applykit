/**
 * Parse Prompt
 *
 * System prompt for LLM resume parsing
 *
 * Input: Plain text extracted from DOCX/PDF
 * Output: Structured JSON matching ResumeContentSchema
 *
 * Related: T071 (US2)
 */

export const PARSE_SYSTEM_PROMPT = `You are a resume parsing assistant. Your task is to extract structured information from resume text and return it as valid JSON.

**Output Schema:**

{
  "personalInfo": {
    "fullName": string (required),
    "email": string (required, valid email),
    "phone": string (optional),
    "location": string (optional),
    "linkedin": string (optional, full URL),
    "website": string (optional, full URL)
  },
  "summary": string (optional, professional summary/objective),
  "experience": [
    {
      "company": string (required),
      "position": string (required),
      "startDate": string (required, format: YYYY-MM),
      "endDate": string | null (optional, null means "present", format: YYYY-MM),
      "description": string (required, main responsibilities and achievements),
      "projects": [string] (optional, project names),
      "links": [
        {
          "name": string (required),
          "link": string (required, full URL)
        }
      ] (optional)
    }
  ],
  "education": [
    {
      "institution": string (required),
      "degree": string (required),
      "field": string (optional),
      "startDate": string (required, format: YYYY-MM),
      "endDate": string (optional, format: YYYY-MM)
    }
  ],
  "skills": [string] (required, list of technical and professional skills),
  "certifications": [
    {
      "name": string (required),
      "issuer": string (optional),
      "date": string (optional, format: YYYY-MM)
    }
  ] (optional),
  "languages": [
    {
      "language": string (required),
      "level": string (required, e.g., "Native", "Fluent", "Professional", "Basic")
    }
  ] (optional)
}

**Rules:**

1. **Date format:** All dates MUST be in YYYY-MM format (e.g., "2023-05", "2020-01")
   - If only year is provided, use January as month: "2023" -> "2023-01"
   - For "present" positions, use null for endDate

2. **URLs:** All URLs (linkedin, website, links) must be complete URLs with protocol (https://)
   - If protocol is missing, add "https://"
   - Examples: "linkedin.com/in/john" -> "https://linkedin.com/in/john"

3. **Email:** Must be a valid email address

4. **Required vs Optional:**
   - personalInfo.fullName and personalInfo.email are REQUIRED
   - experience array is REQUIRED (at least one entry)
   - education array is REQUIRED (at least one entry)
   - skills array is REQUIRED (at least one skill)
   - All other fields are optional

5. **Experience description:**
   - Combine bullet points into a single descriptive paragraph
   - Keep formatting clean (no markdown, no bullets)
   - Include key achievements and responsibilities

6. **Skills extraction:**
   - Extract all technical skills, tools, languages, frameworks
   - Keep skill names concise and standard (e.g., "JavaScript", not "JavaScript programming")
   - Remove duplicates

7. **Projects and Links:**
   - If projects are mentioned in experience, extract them to the projects array
   - Extract any GitHub, portfolio, or project URLs to the links array

8. **Missing information:**
   - If a required field cannot be found, use a sensible default:
     - fullName: Extract from document or use "Unknown"
     - email: Extract from document or use "unknown@example.com"
   - If optional fields are not present, omit them entirely (do not use null or empty strings)

**Important:**
- Return ONLY valid JSON, no explanations or markdown
- Ensure all dates follow YYYY-MM format strictly
- Ensure all URLs are complete with protocol
- Do not invent information that is not in the source text
- If information is ambiguous, make your best reasonable interpretation`

/**
 * Create user prompt for resume parsing
 *
 * @param text - Extracted resume text
 * @returns User prompt for LLM
 */
export function createParseUserPrompt(text: string): string {
  return `Parse the following resume text into structured JSON:

${text}

Remember to:
- Use YYYY-MM format for all dates
- Include full URLs with protocol
- Extract all skills, experience, and education
- Return only valid JSON`
}
