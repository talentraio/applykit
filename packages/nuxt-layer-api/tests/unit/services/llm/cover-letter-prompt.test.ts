import type { ResumeContent } from '@int/schema';
import { COVER_LETTER_LENGTH_PRESET_MAP } from '@int/schema';
import { describe, expect, it } from 'vitest';
import { createCoverLetterUserPrompt } from '../../../../server/services/llm/prompts/cover-letter';

const resumeContentFixture: ResumeContent = {
  personalInfo: {
    fullName: 'Test User',
    email: 'test@example.com'
  },
  summary: 'Senior frontend engineer',
  experience: [
    {
      company: 'Acme',
      position: 'Frontend Engineer',
      startDate: '2022-01',
      description: 'Built product features'
    }
  ],
  education: [
    {
      institution: 'Tech University',
      degree: 'BSc',
      startDate: '2017-09'
    }
  ],
  skills: [
    {
      type: 'Frontend',
      skills: ['Vue', 'TypeScript']
    }
  ]
};

describe('createCoverLetterUserPrompt', () => {
  it('adds adaptive soft target for minimum character preset', () => {
    const prompt = createCoverLetterUserPrompt({
      resumeContent: resumeContentFixture,
      vacancy: {
        company: 'Acme',
        jobPosition: 'Frontend Engineer',
        description: 'Build UI'
      },
      settings: {
        language: 'en',
        type: 'message',
        tone: 'professional',
        lengthPreset: COVER_LETTER_LENGTH_PRESET_MAP.MIN_CHARS,
        characterLimit: 300,
        recipientName: null,
        includeSubjectLine: false,
        instructions: null
      }
    });

    expect(prompt).toContain(
      'Minimum characters (hard limit): 300. Soft target for generation: 315.'
    );
  });

  it('adds adaptive soft target for maximum character preset', () => {
    const prompt = createCoverLetterUserPrompt({
      resumeContent: resumeContentFixture,
      vacancy: {
        company: 'Acme',
        jobPosition: 'Frontend Engineer',
        description: 'Build UI'
      },
      settings: {
        language: 'en',
        type: 'message',
        tone: 'professional',
        lengthPreset: COVER_LETTER_LENGTH_PRESET_MAP.MAX_CHARS,
        characterLimit: 200,
        recipientName: null,
        includeSubjectLine: false,
        instructions: null
      }
    });

    expect(prompt).toContain(
      'Maximum characters (hard limit): 200. Soft target for generation: 190.'
    );
  });

  it('applies runtime-configured buffer values', () => {
    const prompt = createCoverLetterUserPrompt(
      {
        resumeContent: resumeContentFixture,
        vacancy: {
          company: 'Acme',
          jobPosition: 'Frontend Engineer',
          description: 'Build UI'
        },
        settings: {
          language: 'en',
          type: 'message',
          tone: 'professional',
          lengthPreset: COVER_LETTER_LENGTH_PRESET_MAP.MIN_CHARS,
          characterLimit: 300,
          recipientName: null,
          includeSubjectLine: false,
          instructions: null
        }
      },
      {
        characterBufferConfig: {
          targetBufferRatio: 0.1,
          targetBufferSmallLimitThreshold: 120,
          targetBufferSmallMin: 5,
          targetBufferSmallMax: 8,
          targetBufferMin: 10,
          targetBufferMax: 30
        }
      }
    );

    expect(prompt).toContain(
      'Minimum characters (hard limit): 300. Soft target for generation: 330.'
    );
  });
});
