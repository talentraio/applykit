/**
 * Preview Types for A4 Resume Rendering
 *
 * Types for FlowCV-style A4 preview with zoom scaling
 * and block-based pagination.
 *
 * Related: T016 (US2)
 */

import type {
  CertificationEntry,
  CustomSectionItem,
  EducationEntry,
  ExperienceEntry,
  PersonalInfo,
  ResumeLanguage,
  SkillGroup
} from '@int/schema';

/**
 * Block content types for pagination
 */
export type BlockKind =
  | 'section-heading'
  | 'personal-info'
  | 'summary-paragraph'
  | 'experience-header'
  | 'experience-description'
  | 'experience-bullet'
  | 'experience-technologies'
  | 'education-entry'
  | 'skill-group'
  | 'certification-entry'
  | 'language-entry'
  | 'custom-section-item';

/**
 * Section identifiers for grouping blocks
 */
export type SectionId =
  | 'personal-info'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'certifications'
  | 'languages'
  | `custom-${string}`;

/**
 * Block payload types mapped to block kinds
 */
export type BlockPayload = {
  'section-heading': { title: string };
  'personal-info': PersonalInfo;
  'summary-paragraph': { text: string };
  'experience-header': Pick<
    ExperienceEntry,
    'company' | 'position' | 'location' | 'startDate' | 'endDate'
  >;
  'experience-description': { text: string };
  'experience-bullet': { text: string };
  'experience-technologies': { technologies: string[] };
  'education-entry': EducationEntry;
  'skill-group': SkillGroup;
  'certification-entry': CertificationEntry;
  'language-entry': ResumeLanguage;
  'custom-section-item': CustomSectionItem;
};

/**
 * Generic block model for pagination
 *
 * Each block represents a discrete unit of content
 * that can be measured and paginated.
 */
export type BlockModel<K extends BlockKind = BlockKind> = {
  /** Unique block identifier */
  id: string;
  /** Block content type */
  kind: K;
  /** Section this block belongs to */
  section: SectionId;
  /**
   * Number of following blocks to keep together on same page.
   * Used for section headings and experience headers.
   * @example 1 = keep this block with next block
   */
  keepWithNext?: number;
  /**
   * Whether this block can be split across pages.
   * Currently not used - all blocks are atomic.
   */
  splittable?: boolean;
  /** Block content data */
  payload: K extends keyof BlockPayload ? BlockPayload[K] : unknown;
};

/**
 * Page model containing blocks that fit on one A4 page
 */
export type PageModel = {
  /** Zero-based page index */
  index: number;
  /** Blocks assigned to this page */
  blocks: BlockModel[];
};

/**
 * Measured block with calculated height
 */
export type MeasuredBlock = BlockModel & {
  /** Block height in pixels */
  height: number;
};

/**
 * Preview type (ATS or Human readable)
 */
export type PreviewType = 'ats' | 'human';

/**
 * Page dimensions and settings
 */
export type PageDimensions = {
  /** Page width in mm */
  width: number;
  /** Page height in mm */
  height: number;
  /** Padding/margin in mm */
  padding: number;
};

/**
 * A4 page dimensions (ISO 216)
 */
export const A4_DIMENSIONS: PageDimensions = {
  width: 210,
  height: 297,
  padding: 20
};

/**
 * Convert mm to px at 96 DPI (standard screen resolution)
 */
export const MM_TO_PX = 96 / 25.4; // ≈ 3.78

/**
 * A4 dimensions in pixels at 96 DPI
 */
export const A4_WIDTH_PX = A4_DIMENSIONS.width * MM_TO_PX; // ≈ 794px
export const A4_HEIGHT_PX = A4_DIMENSIONS.height * MM_TO_PX; // ≈ 1123px
