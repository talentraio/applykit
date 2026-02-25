import type { ResumeContent } from '@int/schema';
import { LLM_SCENARIO_KEY_MAP } from '@int/schema';
import { describe, expect, it, vi } from 'vitest';
import { generateCoverLetterWithLLM } from '../../../../server/services/llm/cover-letter';

const { callLLMMock } = vi.hoisted(() => ({
  callLLMMock: vi.fn()
}));

vi.mock('../../../../server/services/llm/index', () => ({
  callLLM: callLLMMock,
  LLMError: class MockLLMError extends Error {
    code?: string;

    constructor(message: string, code?: string) {
      super(message);
      this.code = code;
    }
  }
}));

const resumeContentFixture: ResumeContent = {
  personalInfo: {
    fullName: 'Test User',
    email: 'test@example.com',
    phone: '+45 12 34 56 78',
    linkedin: 'https://linkedin.com/in/test-user'
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

const validLetterMarkdown = `Test User
test@example.com
+45 12 34 56 78
linkedin.com/in/test-user

Dear Hiring Team,

I am applying for the Frontend Engineer role at Acme. I focus on practical delivery and clear communication.

My recent work includes Vue and TypeScript product development, which matches your needs.

Best regards,
Test User`;

describe('generateCoverLetterWithLLM', () => {
  it('retries when output violates validation rules and injects feedback', async () => {
    callLLMMock.mockReset();
    callLLMMock
      .mockResolvedValueOnce({
        content: JSON.stringify({
          contentMarkdown: `Test User
test@example.com

Dear Hiring Team,

As an AI, I am applying for the role and my skills align very well.

Best regards,
Test User`,
          subjectLine: null
        }),
        tokensUsed: 100,
        cost: 0.01,
        provider: 'openai',
        providerType: 'platform',
        model: 'gpt-4.1-mini'
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          contentMarkdown: validLetterMarkdown,
          subjectLine: null
        }),
        tokensUsed: 120,
        cost: 0.015,
        provider: 'openai',
        providerType: 'platform',
        model: 'gpt-4.1-mini'
      });

    const result = await generateCoverLetterWithLLM(
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
          lengthPreset: 'standard',
          characterLimit: null,
          recipientName: null,
          includeSubjectLine: false,
          instructions: null
        }
      },
      {
        maxRetries: 1
      }
    );

    expect(callLLMMock).toHaveBeenCalledTimes(2);
    expect(result.usage.attemptsUsed).toBe(2);
    expect(result.contentMarkdown).toContain('Sincerely,');

    const retryPrompt = callLLMMock.mock.calls[1]?.[0]?.prompt;
    expect(retryPrompt).toContain('Validation feedback from previous attempt:');
    expect(retryPrompt).toContain('Do not mention AI');
  });

  it('autofixes message output by stripping formal sign-off and signature', async () => {
    callLLMMock.mockReset();
    callLLMMock.mockResolvedValue({
      content: JSON.stringify({
        contentMarkdown:
          'Hello team,\n\nI am applying for this position.\n\nBest regards,\nTest User',
        subjectLine: null
      }),
      tokensUsed: 80,
      cost: 0.009,
      provider: 'openai',
      providerType: 'platform',
      model: 'gpt-4.1-mini'
    });

    const result = await generateCoverLetterWithLLM(
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
          lengthPreset: 'standard',
          characterLimit: null,
          recipientName: null,
          includeSubjectLine: false,
          instructions: null
        }
      },
      {
        maxRetries: 0
      }
    );

    expect(result.contentMarkdown).toContain('Hello team');
    expect(result.contentMarkdown).not.toContain('Best regards');
    expect(result.contentMarkdown).not.toContain('Test User');
  });

  it('runs critic quality scoring without rewrite when rewrite passes are disabled', async () => {
    callLLMMock.mockReset();
    callLLMMock
      .mockResolvedValueOnce({
        content: JSON.stringify({
          contentMarkdown: validLetterMarkdown,
          subjectLine: null
        }),
        tokensUsed: 80,
        cost: 0.009,
        provider: 'openai',
        providerType: 'platform',
        model: 'gpt-5-mini'
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          naturalnessScore: 68,
          aiPatternRiskScore: 44,
          specificityScore: 76,
          localeFitScore: 82,
          rewriteRecommended: true,
          issues: ['Text sounds too template-like in opening sentence.'],
          targetedFixes: ['Use a more concrete, role-specific opening line.']
        }),
        tokensUsed: 40,
        cost: 0.004,
        provider: 'openai',
        providerType: 'platform',
        model: 'gpt-5-mini'
      });

    const result = await generateCoverLetterWithLLM(
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
          lengthPreset: 'standard',
          characterLimit: null,
          recipientName: null,
          includeSubjectLine: false,
          instructions: null
        }
      },
      {
        maxRetries: 0,
        humanizerConfig: {
          provider: 'openai',
          model: 'gpt-5-mini',
          minNaturalnessScore: 75,
          maxAiRiskScore: 35,
          maxRewritePasses: 0,
          debugLogs: false
        }
      }
    );

    expect(callLLMMock).toHaveBeenCalledTimes(2);
    expect(result.contentMarkdown).toContain('Sincerely,');
  });

  it('retries critic parsing once when critic returns invalid JSON', async () => {
    callLLMMock.mockReset();
    callLLMMock
      .mockResolvedValueOnce({
        content: JSON.stringify({
          contentMarkdown: validLetterMarkdown,
          subjectLine: null
        }),
        tokensUsed: 80,
        cost: 0.009,
        provider: 'openai',
        providerType: 'platform',
        model: 'gpt-5-mini'
      })
      .mockResolvedValueOnce({
        content: '{"naturalnessScore":72',
        tokensUsed: 20,
        cost: 0.002,
        provider: 'openai',
        providerType: 'platform',
        model: 'gpt-5-mini'
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          naturalnessScore: 78,
          aiPatternRiskScore: 24,
          specificityScore: 74,
          localeFitScore: 81,
          rewriteRecommended: false,
          issues: [],
          targetedFixes: []
        }),
        tokensUsed: 25,
        cost: 0.003,
        provider: 'openai',
        providerType: 'platform',
        model: 'gpt-5-mini'
      });

    const result = await generateCoverLetterWithLLM(
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
          lengthPreset: 'standard',
          characterLimit: null,
          recipientName: null,
          includeSubjectLine: false,
          instructions: null
        }
      },
      {
        maxRetries: 0,
        humanizerConfig: {
          provider: 'openai',
          model: 'gpt-5-mini',
          minNaturalnessScore: 75,
          maxAiRiskScore: 35,
          maxRewritePasses: 1,
          debugLogs: false
        }
      }
    );

    expect(callLLMMock).toHaveBeenCalledTimes(3);
    expect(result.contentMarkdown).toContain('Sincerely,');
  });

  it('runs rewrite pass when critic scores fail configured thresholds', async () => {
    callLLMMock.mockReset();
    callLLMMock
      .mockResolvedValueOnce({
        content: JSON.stringify({
          contentMarkdown: validLetterMarkdown,
          subjectLine: null
        }),
        tokensUsed: 80,
        cost: 0.009,
        provider: 'openai',
        providerType: 'platform',
        model: 'gpt-5-mini'
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          naturalnessScore: 61,
          aiPatternRiskScore: 49,
          specificityScore: 70,
          localeFitScore: 78,
          rewriteRecommended: true,
          issues: ['Overly generic opening and repetitive sentence rhythm.'],
          targetedFixes: ['Use concrete evidence and vary sentence cadence.']
        }),
        tokensUsed: 40,
        cost: 0.004,
        provider: 'openai',
        providerType: 'platform',
        model: 'gpt-5-mini'
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          contentMarkdown: `Dear Hiring Team,

I am applying for the Frontend Engineer role at Acme. I build stable UI systems with practical delivery focus.

In my recent work, I led Vue and TypeScript implementation for product features and team-level standards.

I would welcome a short conversation about how I can support your roadmap this quarter.

Sincerely,
Test User`,
          subjectLine: null
        }),
        tokensUsed: 70,
        cost: 0.007,
        provider: 'openai',
        providerType: 'platform',
        model: 'gpt-5-mini'
      });

    const result = await generateCoverLetterWithLLM(
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
          lengthPreset: 'standard',
          characterLimit: null,
          recipientName: null,
          includeSubjectLine: false,
          instructions: null
        }
      },
      {
        maxRetries: 0,
        humanizerConfig: {
          provider: 'openai',
          model: 'gpt-5-mini',
          minNaturalnessScore: 75,
          maxAiRiskScore: 35,
          maxRewritePasses: 1,
          debugLogs: false
        }
      }
    );

    expect(callLLMMock).toHaveBeenCalledTimes(3);
    expect(result.contentMarkdown).toContain('stable UI systems with practical delivery focus');
    expect(callLLMMock.mock.calls[2]?.[1]?.scenario).toBe(
      LLM_SCENARIO_KEY_MAP.COVER_LETTER_HUMANIZER_CRITIC
    );
    expect(callLLMMock.mock.calls[2]?.[1]?.respectRequestReasoningEffort).toBe(true);
    expect(callLLMMock.mock.calls[2]?.[1]?.respectRequestMaxTokens).toBe(true);
    expect(callLLMMock.mock.calls[2]?.[0]?.reasoningEffort).toBe('low');
  });

  it('autofixes long-dash punctuation without retry', async () => {
    callLLMMock.mockReset();
    callLLMMock.mockResolvedValue({
      content: JSON.stringify({
        contentMarkdown: `Test User
test@example.com

Dear Hiring Team,

I deliver frontend platforms — with practical execution.

Best regards,
Test User`,
        subjectLine: null
      }),
      tokensUsed: 90,
      cost: 0.01,
      provider: 'openai',
      providerType: 'platform',
      model: 'gpt-5-mini'
    });

    const result = await generateCoverLetterWithLLM(
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
          lengthPreset: 'standard',
          characterLimit: null,
          recipientName: null,
          includeSubjectLine: false,
          instructions: null
        }
      },
      {
        maxRetries: 1
      }
    );

    expect(result.usage.attemptsUsed).toBe(1);
    expect(result.contentMarkdown).not.toContain('—');
    expect(result.contentMarkdown).toContain(
      'I deliver frontend platforms - with practical execution.'
    );
  });

  it.each([
    {
      language: 'en' as const,
      market: 'default' as const,
      grammaticalGender: 'neutral' as const,
      legacyDateLine: 'January 1, 2000',
      expectedDateLine: '23 February 2026',
      contentMarkdown: `Test User
test@example.com
January 1, 2000

Dear Hiring Team,

I am applying for the role and can deliver practical frontend outcomes.

Best regards,
Test User`
    },
    {
      language: 'da-DK' as const,
      market: 'dk' as const,
      grammaticalGender: 'neutral' as const,
      legacyDateLine: '1. januar 2000',
      expectedDateLine: '23 februar 2026',
      contentMarkdown: `Test User
test@example.com
1. januar 2000

Hej Mette

Jeg søger rollen og kan levere stabile frontend-løsninger i praksis.

Venlig hilsen
Test User`
    },
    {
      language: 'uk-UA' as const,
      market: 'ua' as const,
      grammaticalGender: 'masculine' as const,
      legacyDateLine: '1 січня 2000 р.',
      expectedDateLine: '23 лютого 2026 р.',
      contentMarkdown: `Test User
test@example.com
1 січня 2000 р.

Добрий день!

Подаюся на роль і можу підсилити команду практичним досвідом.

З повагою
Test User`
    }
  ])(
    'normalizes letter date line to current locale date for %s',
    async ({
      contentMarkdown,
      expectedDateLine,
      grammaticalGender,
      language,
      legacyDateLine,
      market
    }) => {
      callLLMMock.mockReset();
      callLLMMock.mockResolvedValue({
        content: JSON.stringify({
          contentMarkdown,
          subjectLine: null
        }),
        tokensUsed: 100,
        cost: 0.01,
        provider: 'openai',
        providerType: 'platform',
        model: 'gpt-4.1'
      });

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-23T12:00:00.000Z'));

      try {
        const result = await generateCoverLetterWithLLM(
          {
            resumeContent: resumeContentFixture,
            vacancy: {
              company: 'Acme',
              jobPosition: 'Frontend Engineer',
              description: 'Build UI'
            },
            settings: {
              language,
              market,
              grammaticalGender,
              type: 'letter',
              tone: 'professional',
              lengthPreset: 'standard',
              characterLimit: null,
              recipientName: null,
              includeSubjectLine: false,
              instructions: null
            }
          },
          {
            maxRetries: 0
          }
        );

        expect(callLLMMock).toHaveBeenCalledTimes(1);
        expect(result.contentMarkdown.startsWith('Test User\n')).toBe(true);
        expect(result.contentMarkdown).toContain('test@example.com');
        expect(result.contentMarkdown.replaceAll('\\.', '.')).toContain(expectedDateLine);
        expect(result.contentMarkdown).not.toContain(legacyDateLine);
      } finally {
        vi.useRealTimers();
      }
    }
  );

  it('deduplicates top-level date lines in letter normalization', async () => {
    callLLMMock.mockReset();
    callLLMMock.mockResolvedValue({
      content: JSON.stringify({
        contentMarkdown: `Test User
test@example.com
+45 12 34 56 78

24 лютого 2026 р.

24 лютого 2026 р.

Добрий день!

Подаюся на роль і можу підсилити команду практичним досвідом.

З повагою
Test User`,
        subjectLine: null
      }),
      tokensUsed: 90,
      cost: 0.01,
      provider: 'openai',
      providerType: 'platform',
      model: 'gpt-5-mini'
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-24T12:00:00.000Z'));

    try {
      const result = await generateCoverLetterWithLLM(
        {
          resumeContent: resumeContentFixture,
          vacancy: {
            company: 'Acme',
            jobPosition: 'Frontend Engineer',
            description: 'Build UI'
          },
          settings: {
            language: 'uk-UA',
            market: 'ua',
            grammaticalGender: 'masculine',
            type: 'letter',
            tone: 'friendly',
            lengthPreset: 'standard',
            characterLimit: null,
            recipientName: null,
            includeSubjectLine: false,
            instructions: null
          }
        },
        {
          maxRetries: 0
        }
      );

      const expectedDate = '24 лютого 2026 р.';
      const dateOccurrences = result.contentMarkdown.split(expectedDate).length - 1;
      expect(dateOccurrences).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(['gpt-5-mini', 'gpt-4.1', 'gpt-5.2', 'gemini-2.5-flash'])(
    'preserves usage model metadata for %s',
    async modelName => {
      callLLMMock.mockReset();
      callLLMMock.mockResolvedValue({
        content: JSON.stringify({
          contentMarkdown: validLetterMarkdown,
          subjectLine: null
        }),
        tokensUsed: 110,
        cost: 0.012,
        provider: modelName.startsWith('gemini') ? 'gemini' : 'openai',
        providerType: 'platform',
        model: modelName
      });

      const result = await generateCoverLetterWithLLM(
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
            lengthPreset: 'standard',
            characterLimit: null,
            recipientName: null,
            includeSubjectLine: false,
            instructions: null
          }
        },
        {
          maxRetries: 0
        }
      );

      expect(result.usage.model).toBe(modelName);
    }
  );

  it('runs semantic compression pass for max_chars message and keeps complete sentence', async () => {
    callLLMMock.mockReset();
    callLLMMock
      .mockResolvedValueOnce({
        content: JSON.stringify({
          contentMarkdown:
            'Hej Alex, jeg søger rollen som Principal Engineer hos LEGO Group, og min erfaring med Vue, TypeScript, Node.js og platformarkitektur matcher jeres behov. Jeg har ledet teams og leveret stabile løsninger med høj kvalitet og tydelig kommunikation på tværs af stakeholders. Best regards, Test User',
          subjectLine: null
        }),
        tokensUsed: 130,
        cost: 0.013,
        provider: 'openai',
        providerType: 'platform',
        model: 'gpt-5-mini'
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          contentMarkdown:
            'Jeg søger rollen som Principal Engineer hos LEGO Group. Jeg bygger stabile platforme og leverer tydelig teknisk retning på tværs af teams.',
          subjectLine: null
        }),
        tokensUsed: 70,
        cost: 0.007,
        provider: 'openai',
        providerType: 'platform',
        model: 'gpt-5-mini'
      });

    const result = await generateCoverLetterWithLLM(
      {
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
          lengthPreset: 'max_chars',
          characterLimit: 180,
          recipientName: 'Alex',
          includeSubjectLine: false,
          instructions: null
        }
      },
      {
        maxRetries: 0
      }
    );

    expect(callLLMMock).toHaveBeenCalledTimes(2);
    expect(result.contentMarkdown.length).toBeLessThanOrEqual(180);
    expect(result.contentMarkdown).not.toContain('Best regards');
    expect(/[.!?]$/.test(result.contentMarkdown)).toBe(true);
  });

  it('normalizes ukrainian letter footer to deterministic signature from resume', async () => {
    callLLMMock.mockReset();
    callLLMMock.mockResolvedValue({
      content: JSON.stringify({
        contentMarkdown: `alex.huzei@example.com
+45 12 34 56 78

Добрий день!

Подаюся на позицію Principal Engineer. Маю досвід побудови фронтенд платформ і командної технічної координації.

З повагою
Олександр Гузей`,
        subjectLine: null
      }),
      tokensUsed: 90,
      cost: 0.01,
      provider: 'openai',
      providerType: 'platform',
      model: 'gpt-5-mini'
    });

    const result = await generateCoverLetterWithLLM(
      {
        resumeContent: {
          ...resumeContentFixture,
          personalInfo: {
            ...resumeContentFixture.personalInfo,
            fullName: 'Oleksandr Huzei',
            email: 'alex.huzei@example.com'
          }
        },
        vacancy: {
          company: 'Acme',
          jobPosition: 'Principal Engineer',
          description: 'Build UI'
        },
        settings: {
          language: 'uk-UA',
          market: 'ua',
          grammaticalGender: 'masculine',
          type: 'letter',
          tone: 'professional',
          lengthPreset: 'standard',
          characterLimit: null,
          recipientName: null,
          includeSubjectLine: false,
          instructions: null
        }
      },
      {
        maxRetries: 0
      }
    );

    expect(callLLMMock).toHaveBeenCalledTimes(1);
    expect(result.contentMarkdown).toContain('Oleksandr Huzei');
    expect(result.contentMarkdown).not.toContain('Олександр Гузей');
  });

  it('autofixes missing ukrainian letter structure blocks without extra retry', async () => {
    callLLMMock.mockReset();
    callLLMMock.mockResolvedValue({
      content: JSON.stringify({
        contentMarkdown:
          'Подаюся на позицію Principal Engineer. Маю досвід побудови фронтенд платформ та технічного лідерства.',
        subjectLine: null
      }),
      tokensUsed: 95,
      cost: 0.011,
      provider: 'openai',
      providerType: 'platform',
      model: 'gpt-5-mini'
    });

    const result = await generateCoverLetterWithLLM(
      {
        resumeContent: {
          ...resumeContentFixture,
          personalInfo: {
            ...resumeContentFixture.personalInfo,
            fullName: 'Олександр Гузей',
            email: 'oleksandr.guzei@example.com'
          }
        },
        vacancy: {
          company: 'Acme',
          jobPosition: 'Principal Engineer',
          description: 'Build UI'
        },
        settings: {
          language: 'uk-UA',
          market: 'ua',
          grammaticalGender: 'masculine',
          type: 'letter',
          tone: 'professional',
          lengthPreset: 'standard',
          characterLimit: null,
          recipientName: null,
          includeSubjectLine: false,
          instructions: null
        }
      },
      {
        maxRetries: 0
      }
    );

    expect(callLLMMock).toHaveBeenCalledTimes(1);
    expect(result.contentMarkdown).toContain('oleksandr.guzei@example.com');
    expect(result.contentMarkdown).toContain('Добрий день!');
    expect(result.contentMarkdown).toContain('З повагою');
    expect(result.contentMarkdown).toContain('Олександр Гузей');
  });

  it('keeps english enthusiastic closing "Best," valid after deterministic letter fallback', async () => {
    callLLMMock.mockReset();
    callLLMMock.mockResolvedValue({
      content: JSON.stringify({
        contentMarkdown: 'I can contribute to this role with practical frontend delivery.',
        subjectLine: null
      }),
      tokensUsed: 95,
      cost: 0.011,
      provider: 'openai',
      providerType: 'platform',
      model: 'gpt-5.2'
    });

    const result = await generateCoverLetterWithLLM(
      {
        resumeContent: resumeContentFixture,
        vacancy: {
          company: 'Acme',
          jobPosition: 'Principal Engineer',
          description: 'Build UI'
        },
        settings: {
          language: 'en',
          market: 'dk',
          grammaticalGender: 'neutral',
          type: 'letter',
          tone: 'enthusiastic',
          lengthPreset: 'standard',
          characterLimit: null,
          recipientName: 'Alex',
          includeSubjectLine: false,
          instructions: null
        }
      },
      {
        maxRetries: 0
      }
    );

    expect(callLLMMock).toHaveBeenCalledTimes(1);
    expect(result.contentMarkdown).toContain('\n\nBest,\nTest User');
  });

  it('normalizes letter date line without day-dot marker for markdown-safe rendering', async () => {
    callLLMMock.mockReset();
    callLLMMock.mockResolvedValue({
      content: JSON.stringify({
        contentMarkdown: 'I can deliver frontend outcomes quickly and reliably.',
        subjectLine: null
      }),
      tokensUsed: 80,
      cost: 0.01,
      provider: 'openai',
      providerType: 'platform',
      model: 'gpt-4.1'
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-24T12:00:00.000Z'));

    try {
      const result = await generateCoverLetterWithLLM(
        {
          resumeContent: resumeContentFixture,
          vacancy: {
            company: 'Acme',
            jobPosition: 'Principal Engineer',
            description: 'Build UI'
          },
          settings: {
            language: 'en',
            market: 'dk',
            grammaticalGender: 'neutral',
            type: 'letter',
            tone: 'professional',
            lengthPreset: 'standard',
            characterLimit: null,
            recipientName: 'Alex',
            includeSubjectLine: false,
            instructions: null
          }
        },
        {
          maxRetries: 0
        }
      );

      expect(result.contentMarkdown).toContain('24 February 2026');
    } finally {
      vi.useRealTimers();
    }
  });
});
