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
        market: 'default',
        grammaticalGender: 'neutral',
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
        market: 'default',
        grammaticalGender: 'neutral',
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
          market: 'default',
          grammaticalGender: 'neutral',
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

  it('adds strict letter structure instructions for sender header and signature', () => {
    const prompt = createCoverLetterUserPrompt({
      resumeContent: resumeContentFixture,
      vacancy: {
        company: 'Acme',
        jobPosition: 'Frontend Engineer',
        description: 'Build UI'
      },
      settings: {
        language: 'en',
        market: 'default',
        grammaticalGender: 'neutral',
        type: 'letter',
        tone: 'professional',
        lengthPreset: COVER_LETTER_LENGTH_PRESET_MAP.STANDARD,
        characterLimit: null,
        recipientName: null,
        includeSubjectLine: false,
        instructions: null
      }
    });

    expect(prompt).toContain('Output must generate only the core English letter content');
    expect(prompt).toContain(
      'do not include sender header, date line, formal sign-off phrase, or signature name'
    );
    expect(prompt).toContain('Do not use em dash (—) or en dash (–);');
  });

  it('adds strict message structure rules without formal signature block', () => {
    const prompt = createCoverLetterUserPrompt({
      resumeContent: resumeContentFixture,
      vacancy: {
        company: 'Acme',
        jobPosition: 'Frontend Engineer',
        description: 'Build UI'
      },
      settings: {
        language: 'en',
        market: 'default',
        grammaticalGender: 'neutral',
        type: 'message',
        tone: 'professional',
        lengthPreset: COVER_LETTER_LENGTH_PRESET_MAP.STANDARD,
        characterLimit: null,
        recipientName: null,
        includeSubjectLine: true,
        instructions: null
      }
    });

    expect(prompt).toContain('no sender header block');
    expect(prompt).toContain('no formal signature block');
    expect(prompt).toContain('Provide a short and natural "subjectLine"');
  });

  it('includes retry validation feedback in prompt when provided', () => {
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
          market: 'default',
          grammaticalGender: 'neutral',
          type: 'letter',
          tone: 'professional',
          lengthPreset: COVER_LETTER_LENGTH_PRESET_MAP.STANDARD,
          characterLimit: null,
          recipientName: null,
          includeSubjectLine: false,
          instructions: null
        }
      },
      {
        retryValidationFeedback: '1. Add sender header\n2. Add formal closing'
      }
    );

    expect(prompt).toContain('Validation feedback from previous attempt:');
    expect(prompt).toContain('1. Add sender header');
    expect(prompt).toContain('2. Add formal closing');
  });

  it('adds strict recipient guidance for max_chars message mode', () => {
    const prompt = createCoverLetterUserPrompt({
      resumeContent: resumeContentFixture,
      vacancy: {
        company: 'Acme',
        jobPosition: 'Frontend Engineer',
        description: 'Build UI'
      },
      settings: {
        language: 'da-DK',
        market: 'dk',
        grammaticalGender: 'neutral',
        type: 'message',
        tone: 'professional',
        lengthPreset: COVER_LETTER_LENGTH_PRESET_MAP.MAX_CHARS,
        characterLimit: 300,
        recipientName: 'Alex',
        includeSubjectLine: false,
        instructions: null
      }
    });

    expect(prompt).toContain('avoid formal greeting');
    expect(prompt).toContain('This is strict: stay at or below hard limit');
  });

  it('adds ukrainian neutral grammatical instruction when neutral gender is selected', () => {
    const prompt = createCoverLetterUserPrompt({
      resumeContent: resumeContentFixture,
      vacancy: {
        company: 'Acme',
        jobPosition: 'Frontend Engineer',
        description: 'Build UI'
      },
      settings: {
        language: 'uk-UA',
        market: 'ua',
        grammaticalGender: 'neutral',
        type: 'message',
        tone: 'professional',
        lengthPreset: COVER_LETTER_LENGTH_PRESET_MAP.STANDARD,
        characterLimit: null,
        recipientName: null,
        includeSubjectLine: false,
        instructions: null
      }
    });

    expect(prompt).toContain('avoid gender-marked wording when possible');
  });
});
