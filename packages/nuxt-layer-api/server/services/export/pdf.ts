import type { ExportFormat, ResumeContent } from '@int/schema';
import type { Buffer } from 'node:buffer';
import type { Page } from 'playwright-core';
import { EXPORT_FORMAT_MAP } from '@int/schema';
import { chromium } from 'playwright-core';

/**
 * PDF Export Service
 *
 * Generates PDF resumes using Playwright (headless Chrome)
 * Supports ATS (plain, machine-readable) and Human (styled) formats
 *
 * Related: T115 (US6)
 */

/**
 * Export options
 */
export type ExportOptions = {
  /**
   * Export format
   */
  format: ExportFormat;

  /**
   * Page title for PDF metadata
   */
  title?: string;

  /**
   * Custom margins (in mm)
   */
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };

  /**
   * Viewport width for rendering (default: 1280)
   */
  viewportWidth?: number;

  /**
   * Viewport height for rendering (default: 1024)
   */
  viewportHeight?: number;

  /**
   * Wait for selector before generating PDF
   */
  waitForSelector?: string;

  /**
   * Additional wait time in ms after page load (default: 500)
   */
  waitTime?: number;
};

/**
 * Export result
 */
export type ExportResult = {
  /**
   * PDF as Buffer
   */
  buffer: Buffer;

  /**
   * PDF size in bytes
   */
  size: number;

  /**
   * Export format used
   */
  format: ExportFormat;

  /**
   * Suggested filename
   */
  filename: string;
};

/**
 * Export error class
 */
export class ExportError extends Error {
  constructor(
    message: string,
    public readonly code: 'BROWSER_LAUNCH_FAILED' | 'PAGE_LOAD_FAILED' | 'PDF_GENERATION_FAILED',
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ExportError';
  }
}

/**
 * Generate ATS-formatted HTML
 *
 * Plain, semantic HTML optimized for ATS parsing
 * No styles, just clean structure
 */
function generateATSHtml(content: ResumeContent, title: string): string {
  const sections: string[] = [];

  // Personal info
  sections.push(`<h1>${content.personalInfo.fullName}</h1>`);
  if (content.personalInfo.email) sections.push(`<p>Email: ${content.personalInfo.email}</p>`);
  if (content.personalInfo.phone) sections.push(`<p>Phone: ${content.personalInfo.phone}</p>`);
  if (content.personalInfo.location)
    sections.push(`<p>Location: ${content.personalInfo.location}</p>`);

  // Summary
  if (content.summary) {
    sections.push(`<h2>Summary</h2>`);
    sections.push(`<p>${content.summary}</p>`);
  }

  // Experience
  if (content.experience && content.experience.length > 0) {
    sections.push(`<h2>Experience</h2>`);
    for (const exp of content.experience) {
      sections.push(`<h3>${exp.position} at ${exp.company}</h3>`);
      sections.push(`<p>${exp.startDate} - ${exp.endDate || 'Present'}</p>`);
      if (exp.description) sections.push(`<p>${exp.description}</p>`);
      if (exp.projects && exp.projects.length > 0) {
        sections.push(`<ul>`);
        for (const project of exp.projects) {
          sections.push(`<li>${project}</li>`);
        }
        sections.push(`</ul>`);
      }
    }
  }

  // Education
  if (content.education && content.education.length > 0) {
    sections.push(`<h2>Education</h2>`);
    for (const edu of content.education) {
      sections.push(`<h3>${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</h3>`);
      sections.push(`<p>${edu.institution}</p>`);
      sections.push(`<p>${edu.startDate} - ${edu.endDate || 'Present'}</p>`);
    }
  }

  // Skills
  if (content.skills && content.skills.length > 0) {
    sections.push(`<h2>Skills</h2>`);
    sections.push(`<ul>`);
    for (const skill of content.skills) {
      sections.push(`<li>${skill}</li>`);
    }
    sections.push(`</ul>`);
  }

  // Certifications
  if (content.certifications && content.certifications.length > 0) {
    sections.push(`<h2>Certifications</h2>`);
    sections.push(`<ul>`);
    for (const cert of content.certifications) {
      sections.push(`<li>${cert.name} - ${cert.issuer}${cert.date ? ` (${cert.date})` : ''}</li>`);
    }
    sections.push(`</ul>`);
  }

  // Languages
  if (content.languages && content.languages.length > 0) {
    sections.push(`<h2>Languages</h2>`);
    sections.push(`<ul>`);
    for (const lang of content.languages) {
      sections.push(`<li>${lang.language}${lang.level ? ` - ${lang.level}` : ''}</li>`);
    }
    sections.push(`</ul>`);
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 20px;
      color: #000;
    }
    h1 { font-size: 24px; margin-bottom: 10px; }
    h2 { font-size: 18px; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #000; }
    h3 { font-size: 16px; margin-top: 15px; margin-bottom: 5px; }
    p { margin: 5px 0; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin: 5px 0; }
  </style>
</head>
<body>
  ${sections.join('\n')}
</body>
</html>
  `.trim();
}

/**
 * Generate Human-formatted HTML
 *
 * Styled, visually appealing HTML for human readers
 * Uses professional design with hierarchy and spacing
 */
function generateHumanHtml(content: ResumeContent, title: string): string {
  const sections: string[] = [];

  // Header section
  sections.push(`
    <header class="resume-header">
      <h1 class="resume-name">${content.personalInfo.fullName}</h1>
      <div class="resume-contact">
        ${content.personalInfo.email ? `<span class="contact-item">${content.personalInfo.email}</span>` : ''}
        ${content.personalInfo.phone ? `<span class="contact-item">${content.personalInfo.phone}</span>` : ''}
        ${content.personalInfo.location ? `<span class="contact-item">${content.personalInfo.location}</span>` : ''}
      </div>
    </header>
  `);

  // Summary
  if (content.summary) {
    sections.push(`
      <section class="resume-section">
        <h2 class="section-title">Professional Summary</h2>
        <p class="summary-text">${content.summary}</p>
      </section>
    `);
  }

  // Experience
  if (content.experience && content.experience.length > 0) {
    const experienceItems = content.experience
      .map(
        exp => `
      <div class="experience-item">
        <div class="experience-header">
          <h3 class="position-title">${exp.position}</h3>
          <span class="date-range">${exp.startDate} - ${exp.endDate || 'Present'}</span>
        </div>
        <div class="company-name">${exp.company}</div>
        ${exp.description ? `<p class="experience-description">${exp.description}</p>` : ''}
        ${
          exp.projects && exp.projects.length > 0
            ? `
        <ul class="achievements-list">
          ${exp.projects.map((project: string) => `<li>${project}</li>`).join('\n')}
        </ul>
        `
            : ''
        }
      </div>
    `
      )
      .join('\n');

    sections.push(`
      <section class="resume-section">
        <h2 class="section-title">Experience</h2>
        ${experienceItems}
      </section>
    `);
  }

  // Education
  if (content.education && content.education.length > 0) {
    const educationItems = content.education
      .map(
        edu => `
      <div class="education-item">
        <div class="education-header">
          <h3 class="degree-title">${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</h3>
          <span class="date-range">${edu.startDate} - ${edu.endDate || 'Present'}</span>
        </div>
        <div class="institution-name">${edu.institution}</div>
      </div>
    `
      )
      .join('\n');

    sections.push(`
      <section class="resume-section">
        <h2 class="section-title">Education</h2>
        ${educationItems}
      </section>
    `);
  }

  // Skills
  if (content.skills && content.skills.length > 0) {
    const skillsHtml = content.skills
      .map(skill => `<span class="skill-tag">${skill}</span>`)
      .join('\n');

    sections.push(`
      <section class="resume-section">
        <h2 class="section-title">Skills</h2>
        <div class="skills-container">
          ${skillsHtml}
        </div>
      </section>
    `);
  }

  // Certifications
  if (content.certifications && content.certifications.length > 0) {
    const certificationsHtml = content.certifications
      .map(
        cert => `
      <div class="certification-item">
        <strong>${cert.name}</strong> - ${cert.issuer}${cert.date ? ` (${cert.date})` : ''}
      </div>
    `
      )
      .join('\n');

    sections.push(`
      <section class="resume-section">
        <h2 class="section-title">Certifications</h2>
        ${certificationsHtml}
      </section>
    `);
  }

  // Languages
  if (content.languages && content.languages.length > 0) {
    const languagesHtml = content.languages
      .map(
        lang => `
      <span class="language-tag">${lang.language}${lang.level ? ` - ${lang.level}` : ''}</span>
    `
      )
      .join('\n');

    sections.push(`
      <section class="resume-section">
        <h2 class="section-title">Languages</h2>
        <div class="languages-container">
          ${languagesHtml}
        </div>
      </section>
    `);
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }

    .resume-header {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #4f46e5;
    }

    .resume-name {
      font-size: 32px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 10px;
    }

    .resume-contact {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      color: #6b7280;
      font-size: 14px;
    }

    .contact-item::before {
      content: '•';
      margin-right: 8px;
    }

    .contact-item:first-child::before {
      content: '';
      margin-right: 0;
    }

    .resume-section {
      margin-bottom: 30px;
    }

    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #4f46e5;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-text {
      color: #4b5563;
      line-height: 1.7;
    }

    .experience-item,
    .education-item {
      margin-bottom: 20px;
    }

    .experience-header,
    .education-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 5px;
    }

    .position-title,
    .degree-title {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    }

    .date-range {
      font-size: 14px;
      color: #6b7280;
      font-weight: 500;
    }

    .company-name,
    .institution-name {
      font-size: 16px;
      color: #4b5563;
      margin-bottom: 8px;
    }

    .experience-description,
    .education-details {
      color: #4b5563;
      margin-bottom: 10px;
      line-height: 1.6;
    }

    .achievements-list {
      list-style-type: disc;
      margin-left: 20px;
      color: #4b5563;
    }

    .achievements-list li {
      margin-bottom: 5px;
    }

    .skills-container,
    .languages-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .skill-tag,
    .language-tag {
      display: inline-block;
      padding: 6px 12px;
      background-color: #e0e7ff;
      color: #4f46e5;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
    }

    .certification-item {
      margin-bottom: 10px;
      color: #4b5563;
      line-height: 1.6;
    }

    .certification-item strong {
      color: #1f2937;
    }

    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  ${sections.join('\n')}
</body>
</html>
  `.trim();
}

/**
 * Export resume to PDF
 *
 * @param content - Resume content to export
 * @param options - Export options
 * @returns PDF buffer and metadata
 * @throws ExportError if PDF generation fails
 */
export async function exportResumeToPDF(
  content: ResumeContent,
  options: ExportOptions
): Promise<ExportResult> {
  const {
    format,
    title = `${content.personalInfo.fullName} - Resume`,
    margins = {},
    viewportWidth = 1280,
    viewportHeight = 1024,
    waitTime = 500
  } = options;

  let browser;
  let page: Page | undefined;

  try {
    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Create page
    page = await browser.newPage({
      viewport: { width: viewportWidth, height: viewportHeight }
    });

    // Generate HTML based on format
    const html =
      format === EXPORT_FORMAT_MAP.ATS
        ? generateATSHtml(content, title)
        : generateHumanHtml(content, title);

    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle'
    });

    // Wait for additional time
    if (waitTime > 0) {
      await page.waitForTimeout(waitTime);
    }

    // Wait for selector if provided
    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: 5000 });
    }

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: margins.top ?? 20,
        right: margins.right ?? 20,
        bottom: margins.bottom ?? 20,
        left: margins.left ?? 20
      }
    });

    // Generate filename
    const sanitizedName = content.personalInfo.fullName.replace(/[^a-z0-9]/gi, '_');
    const formatSuffix = format === EXPORT_FORMAT_MAP.ATS ? 'ATS' : 'Human';
    const filename = `${sanitizedName}_Resume_${formatSuffix}.pdf`;

    return {
      buffer: pdfBuffer,
      size: pdfBuffer.length,
      format,
      filename
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('browser')) {
      throw new ExportError(
        'Failed to launch browser for PDF generation',
        'BROWSER_LAUNCH_FAILED',
        error
      );
    }
    if (error instanceof Error && error.message.includes('page')) {
      throw new ExportError('Failed to load page for PDF generation', 'PAGE_LOAD_FAILED', error);
    }
    throw new ExportError(
      `PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'PDF_GENERATION_FAILED',
      error
    );
  } finally {
    // Cleanup
    if (page) {
      await page.close().catch(() => {
        // Ignore cleanup errors
      });
    }
    if (browser) {
      await browser.close().catch(() => {
        // Ignore cleanup errors
      });
    }
  }
}
