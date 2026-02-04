/**
 * useResumeBlocks Composable
 *
 * Converts ResumeContent to flat BlockModel[] for pagination.
 * Each block is a discrete unit that can be measured and paginated.
 *
 * Related: T017 (US2)
 */

import type { ResumeContent } from '@int/schema';
import type { BlockModel, SectionId } from '../types/preview';

/**
 * Generate unique block ID
 */
function generateBlockId(section: SectionId, kind: string, index?: number): string {
  const suffix = index !== undefined ? `-${index}` : '';
  return `${section}-${kind}${suffix}`;
}

/**
 * Convert ResumeContent to BlockModel array for pagination
 *
 * @param content - Resume content to convert
 * @returns Reactive computed array of blocks
 */
export function useResumeBlocks(content: Ref<ResumeContent> | ComputedRef<ResumeContent>) {
  const blocks = computed<BlockModel[]>(() => {
    const result: BlockModel[] = [];
    const data = unref(content);

    // Personal Info block
    result.push({
      id: generateBlockId('personal-info', 'personal-info'),
      kind: 'personal-info',
      section: 'personal-info',
      payload: data.personalInfo
    });

    // Summary section
    if (data.summary) {
      result.push({
        id: generateBlockId('summary', 'section-heading'),
        kind: 'section-heading',
        section: 'summary',
        keepWithNext: 1, // Keep with next paragraph
        payload: { title: 'summary' }
      });

      result.push({
        id: generateBlockId('summary', 'summary-paragraph'),
        kind: 'summary-paragraph',
        section: 'summary',
        payload: { text: data.summary }
      });
    }

    // Skills section
    if (data.skills.length > 0) {
      result.push({
        id: generateBlockId('skills', 'section-heading'),
        kind: 'section-heading',
        section: 'skills',
        keepWithNext: 1,
        payload: { title: 'skills' }
      });

      data.skills.forEach((group, groupIndex) => {
        result.push({
          id: generateBlockId('skills', 'skill-group', groupIndex),
          kind: 'skill-group',
          section: 'skills',
          payload: group
        });
      });
    }

    // Experience section
    if (data.experience.length > 0) {
      result.push({
        id: generateBlockId('experience', 'section-heading'),
        kind: 'section-heading',
        section: 'experience',
        keepWithNext: 1, // Keep with first experience
        payload: { title: 'experience' }
      });

      data.experience.forEach((exp, expIndex) => {
        // Experience header (company, position, dates)
        result.push({
          id: generateBlockId('experience', 'experience-header', expIndex),
          kind: 'experience-header',
          section: 'experience',
          keepWithNext: 1, // Keep with description
          payload: {
            company: exp.company,
            position: exp.position,
            location: exp.location,
            startDate: exp.startDate,
            endDate: exp.endDate
          }
        });

        // Experience description
        if (exp.description) {
          result.push({
            id: generateBlockId('experience', 'experience-description', expIndex),
            kind: 'experience-description',
            section: 'experience',
            payload: {
              text: exp.description
            }
          });
        }

        // Experience bullets
        if (exp.bullets?.length) {
          exp.bullets.forEach((bullet, bulletIndex) => {
            result.push({
              id: `experience-${expIndex}-bullet-${bulletIndex}`,
              kind: 'experience-bullet',
              section: 'experience',
              payload: { text: bullet }
            });
          });
        }

        if (exp.technologies?.length) {
          result.push({
            id: generateBlockId('experience', 'experience-technologies', expIndex),
            kind: 'experience-technologies',
            section: 'experience',
            payload: { technologies: exp.technologies }
          });
        }
      });
    }

    // Education section
    if (data.education.length > 0) {
      result.push({
        id: generateBlockId('education', 'section-heading'),
        kind: 'section-heading',
        section: 'education',
        keepWithNext: 1,
        payload: { title: 'education' }
      });

      data.education.forEach((edu, eduIndex) => {
        result.push({
          id: generateBlockId('education', 'education-entry', eduIndex),
          kind: 'education-entry',
          section: 'education',
          payload: edu
        });
      });
    }

    // Certifications section
    if (data.certifications?.length) {
      result.push({
        id: generateBlockId('certifications', 'section-heading'),
        kind: 'section-heading',
        section: 'certifications',
        keepWithNext: 1,
        payload: { title: 'certifications' }
      });

      data.certifications.forEach((cert, certIndex) => {
        result.push({
          id: generateBlockId('certifications', 'certification-entry', certIndex),
          kind: 'certification-entry',
          section: 'certifications',
          payload: cert
        });
      });
    }

    // Custom sections
    if (data.customSections?.length) {
      data.customSections.forEach((customSection, sectionIndex) => {
        const sectionId: SectionId = `custom-${sectionIndex}`;

        result.push({
          id: generateBlockId(sectionId, 'section-heading'),
          kind: 'section-heading',
          section: sectionId,
          keepWithNext: 1,
          payload: { title: customSection.sectionTitle }
        });

        customSection.items.forEach((item, itemIndex) => {
          result.push({
            id: `${sectionId}-item-${itemIndex}`,
            kind: 'custom-section-item',
            section: sectionId,
            payload: item
          });
        });
      });
    }

    // Languages section
    if (data.languages?.length) {
      result.push({
        id: generateBlockId('languages', 'section-heading'),
        kind: 'section-heading',
        section: 'languages',
        keepWithNext: 1,
        payload: { title: 'languages' }
      });

      data.languages.forEach((lang, langIndex) => {
        result.push({
          id: generateBlockId('languages', 'language-entry', langIndex),
          kind: 'language-entry',
          section: 'languages',
          payload: lang
        });
      });
    }

    return result;
  });

  return { blocks };
}
