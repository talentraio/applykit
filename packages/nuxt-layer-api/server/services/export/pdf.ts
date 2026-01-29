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

  /**
   * Profile photo as base64 data URL (for Human format)
   * Example: "data:image/jpeg;base64,/9j/4AAQ..."
   */
  photoDataUrl?: string;
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
 * Format date from YYYY-MM to human-readable format
 */
function formatDate(date: string | null | undefined): string {
  if (!date) return 'Present';
  const [year, month] = date.split('-');
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];
  const monthIndex = Number.parseInt(month ?? '1', 10) - 1;
  return `${monthNames[monthIndex]} ${year}`;
}

/**
 * Generate ATS-formatted HTML
 *
 * Clean, professional HTML optimized for ATS parsing
 * Matches the reference CV format with proper styling
 */
function generateATSHtml(content: ResumeContent, title: string): string {
  const sections: string[] = [];

  // Header: Name + Title + Contact info
  const contactParts: string[] = [];
  if (content.personalInfo.location) contactParts.push(content.personalInfo.location);
  if (content.personalInfo.phone) contactParts.push(content.personalInfo.phone);
  if (content.personalInfo.email) contactParts.push(content.personalInfo.email);
  if (content.personalInfo.linkedin) {
    // Extract display name from LinkedIn URL
    const linkedinDisplay = content.personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, '');
    contactParts.push(linkedinDisplay);
  }
  if (content.personalInfo.github) {
    const githubDisplay = content.personalInfo.github.replace(/^https?:\/\/(www\.)?/, '');
    contactParts.push(githubDisplay);
  }
  if (content.personalInfo.website) {
    const websiteDisplay = content.personalInfo.website.replace(/^https?:\/\/(www\.)?/, '');
    contactParts.push(websiteDisplay);
  }

  sections.push(`
    <header class="resume-header">
      <h1 class="name">${content.personalInfo.fullName}</h1>
      ${content.personalInfo.title ? `<p class="title">${content.personalInfo.title}</p>` : ''}
      ${contactParts.length > 0 ? `<p class="contact">${contactParts.join(' | ')}</p>` : ''}
    </header>
  `);

  // Summary
  if (content.summary) {
    // Split summary into paragraphs for better readability
    const summaryParagraphs = content.summary
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    sections.push(`
      <section class="section">
        <h2 class="section-title">SUMMARY</h2>
        ${summaryParagraphs.map(p => `<p>${p}</p>`).join('\n')}
      </section>
    `);
  }

  // Core Skills (grouped)
  if (content.skills && content.skills.length > 0) {
    const skillsHtml =
      content.skills.length === 1
        ? // Single group - no type label needed
          `<p>${content.skills[0]!.skills.join(', ')}</p>`
        : // Multiple groups - show type labels
          content.skills
            .map(group => `<p><strong>${group.type}:</strong> ${group.skills.join(', ')}</p>`)
            .join('\n');

    sections.push(`
      <section class="section">
        <h2 class="section-title">CORE SKILLS</h2>
        ${skillsHtml}
      </section>
    `);
  }

  // Experience
  if (content.experience && content.experience.length > 0) {
    const experienceHtml = content.experience
      .map(exp => {
        const dateParts: string[] = [];
        dateParts.push(`${formatDate(exp.startDate)} - ${formatDate(exp.endDate)}`);
        if (exp.location) dateParts.push(exp.location);
        if (exp.description && !exp.bullets?.length) dateParts.push(exp.description);

        const bulletsList =
          exp.bullets && exp.bullets.length > 0
            ? `<ul class="bullets">${exp.bullets.map(b => `<li>${b}</li>`).join('\n')}</ul>`
            : '';

        const techLine =
          exp.technologies && exp.technologies.length > 0
            ? `<p class="tech-stack">Tech: ${exp.technologies.join(', ')}.</p>`
            : '';

        return `
        <div class="experience-item">
          <p class="exp-header"><strong>${exp.company}</strong> | <strong>${exp.position}</strong></p>
          <p class="exp-meta">${dateParts.join(' | ')}</p>
          ${bulletsList}
          ${techLine}
        </div>
      `;
      })
      .join('\n');

    sections.push(`
      <section class="section">
        <h2 class="section-title">EXPERIENCE</h2>
        ${experienceHtml}
      </section>
    `);
  }

  // Custom Sections (e.g., Open Source)
  if (content.customSections && content.customSections.length > 0) {
    for (const customSection of content.customSections) {
      const itemsHtml = customSection.items
        .map(item =>
          item.title
            ? `<p><strong>${item.title}</strong> - ${item.description}</p>`
            : `<p>${item.description}</p>`
        )
        .join('\n');

      sections.push(`
        <section class="section">
          <h2 class="section-title">${customSection.sectionTitle.toUpperCase()}</h2>
          ${itemsHtml}
        </section>
      `);
    }
  }

  // Education
  if (content.education && content.education.length > 0) {
    const educationHtml = content.education
      .map(edu => {
        const degree = edu.field ? `${edu.degree}, ${edu.field}` : edu.degree;
        const dates =
          edu.startDate || edu.endDate
            ? ` (${formatDate(edu.startDate)} - ${formatDate(edu.endDate)})`
            : '';
        return `<p>${edu.institution} - ${degree}${dates}.</p>`;
      })
      .join('\n');

    sections.push(`
      <section class="section">
        <h2 class="section-title">EDUCATION</h2>
        ${educationHtml}
      </section>
    `);
  }

  // Certifications
  if (content.certifications && content.certifications.length > 0) {
    const certsHtml = content.certifications
      .map(cert => {
        const issuerPart = cert.issuer ? ` - ${cert.issuer}` : '';
        const datePart = cert.date ? ` (${formatDate(cert.date)})` : '';
        return `<p>${cert.name}${issuerPart}${datePart}.</p>`;
      })
      .join('\n');

    sections.push(`
      <section class="section">
        <h2 class="section-title">CERTIFICATIONS</h2>
        ${certsHtml}
      </section>
    `);
  }

  // Languages (single line)
  if (content.languages && content.languages.length > 0) {
    const langsLine = content.languages.map(l => `${l.language}: ${l.level}`).join(' | ');

    sections.push(`
      <section class="section">
        <h2 class="section-title">LANGUAGES</h2>
        <p>${langsLine}</p>
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
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      padding: 0;
      max-width: 100%;
    }

    .resume-header {
      margin-bottom: 20px;
    }

    .name {
      font-size: 26pt;
      font-weight: bold;
      color: #000;
      margin-bottom: 4px;
    }

    .title {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .contact {
      font-size: 10pt;
      color: #333;
    }

    .section {
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 12pt;
      font-weight: bold;
      color: #000;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }

    .section p {
      margin-bottom: 6px;
    }

    .experience-item {
      margin-bottom: 14px;
    }

    .exp-header {
      margin-bottom: 2px;
    }

    .exp-meta {
      font-size: 10pt;
      color: #333;
      margin-bottom: 6px;
    }

    .bullets {
      margin: 6px 0 6px 20px;
      padding: 0;
    }

    .bullets li {
      margin-bottom: 4px;
    }

    .tech-stack {
      font-size: 10pt;
      color: #333;
      margin-top: 6px;
    }

    strong {
      font-weight: bold;
    }

    @media print {
      body {
        padding: 0;
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
 * Generate Human-formatted HTML
 *
 * Styled, visually appealing HTML for human readers
 * Uses professional design with hierarchy and spacing
 *
 * @param content - Resume content
 * @param title - Page title
 * @param photoDataUrl - Optional profile photo as base64 data URL
 */
function generateHumanHtml(content: ResumeContent, title: string, photoDataUrl?: string): string {
  const sections: string[] = [];

  // Header section with optional photo
  const photoHtml = photoDataUrl
    ? `<img src="${photoDataUrl}" alt="${content.personalInfo.fullName}" class="resume-photo" />`
    : '';

  sections.push(`
    <header class="resume-header${photoDataUrl ? ' with-photo' : ''}">
      ${photoDataUrl ? `<div class="header-photo">${photoHtml}</div>` : ''}
      <div class="header-content">
        <h1 class="resume-name">${content.personalInfo.fullName}</h1>
        ${content.personalInfo.title ? `<p class="resume-title">${content.personalInfo.title}</p>` : ''}
        <div class="resume-contact">
          ${content.personalInfo.email ? `<span class="contact-item">${content.personalInfo.email}</span>` : ''}
          ${content.personalInfo.phone ? `<span class="contact-item">${content.personalInfo.phone}</span>` : ''}
          ${content.personalInfo.location ? `<span class="contact-item">${content.personalInfo.location}</span>` : ''}
        </div>
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

  // Skills (grouped)
  if (content.skills && content.skills.length > 0) {
    const skillsHtml =
      content.skills.length === 1
        ? // Single group - display as tags
          `<div class="skills-container">${content.skills[0]!.skills.map(s => `<span class="skill-tag">${s}</span>`).join('\n')}</div>`
        : // Multiple groups - show categories
          content.skills
            .map(
              group => `
          <div class="skill-group">
            <strong class="skill-type">${group.type}:</strong>
            <span class="skill-list">${group.skills.join(', ')}</span>
          </div>
        `
            )
            .join('\n');

    sections.push(`
      <section class="resume-section">
        <h2 class="section-title">Skills</h2>
        ${skillsHtml}
      </section>
    `);
  }

  // Experience
  if (content.experience && content.experience.length > 0) {
    const experienceItems = content.experience
      .map(exp => {
        const bulletsHtml =
          exp.bullets && exp.bullets.length > 0
            ? `<ul class="achievements-list">${exp.bullets.map(b => `<li>${b}</li>`).join('\n')}</ul>`
            : '';
        const techHtml =
          exp.technologies && exp.technologies.length > 0
            ? `<p class="tech-stack">Tech: ${exp.technologies.join(', ')}</p>`
            : '';

        return `
      <div class="experience-item">
        <div class="experience-header">
          <h3 class="position-title">${exp.position}</h3>
          <span class="date-range">${formatDate(exp.startDate)} - ${formatDate(exp.endDate)}</span>
        </div>
        <div class="company-name">${exp.company}${exp.location ? ` | ${exp.location}` : ''}</div>
        ${exp.description ? `<p class="experience-description">${exp.description}</p>` : ''}
        ${bulletsHtml}
        ${techHtml}
      </div>
    `;
      })
      .join('\n');

    sections.push(`
      <section class="resume-section">
        <h2 class="section-title">Experience</h2>
        ${experienceItems}
      </section>
    `);
  }

  // Custom Sections
  if (content.customSections && content.customSections.length > 0) {
    for (const customSection of content.customSections) {
      const itemsHtml = customSection.items
        .map(item =>
          item.title
            ? `<div class="custom-item"><strong>${item.title}</strong> - ${item.description}</div>`
            : `<div class="custom-item">${item.description}</div>`
        )
        .join('\n');

      sections.push(`
        <section class="resume-section">
          <h2 class="section-title">${customSection.sectionTitle}</h2>
          ${itemsHtml}
        </section>
      `);
    }
  }

  // Education
  if (content.education && content.education.length > 0) {
    const educationItems = content.education
      .map(
        edu => `
      <div class="education-item">
        <div class="education-header">
          <h3 class="degree-title">${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</h3>
          <span class="date-range">${formatDate(edu.startDate)} - ${formatDate(edu.endDate)}</span>
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

  // Certifications
  if (content.certifications && content.certifications.length > 0) {
    const certificationsHtml = content.certifications
      .map(
        cert => `
      <div class="certification-item">
        <strong>${cert.name}</strong>${cert.issuer ? ` - ${cert.issuer}` : ''}${cert.date ? ` (${formatDate(cert.date)})` : ''}
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

    .resume-header.with-photo {
      display: flex;
      gap: 24px;
      align-items: flex-start;
    }

    .header-photo {
      flex-shrink: 0;
    }

    .resume-photo {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #e0e7ff;
    }

    .header-content {
      flex: 1;
    }

    .resume-name {
      font-size: 32px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 6px;
    }

    .resume-title {
      font-size: 14px;
      font-weight: 600;
      color: #4b5563;
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

    .tech-stack {
      font-size: 13px;
      color: #6b7280;
      margin-top: 8px;
    }

    .skill-group {
      margin-bottom: 8px;
      color: #4b5563;
    }

    .skill-type {
      color: #1f2937;
    }

    .skill-list {
      color: #4b5563;
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

    .custom-item {
      margin-bottom: 10px;
      color: #4b5563;
      line-height: 1.6;
    }

    .custom-item strong {
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
    waitTime = 500,
    photoDataUrl
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
        : generateHumanHtml(content, title, photoDataUrl);

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
