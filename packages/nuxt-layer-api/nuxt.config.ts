import type { ResumeFormatSettingsAts, ResumeFormatSettingsHuman } from '@int/schema';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  COVER_LETTER_CHARACTER_BUFFER_DEFAULTS,
  COVER_LETTER_CHARACTER_LIMIT_DEFAULTS
} from '@int/schema';

const createFormatSettingsDefaults = () =>
  ({
    ats: {
      spacing: { marginX: 20, marginY: 15, fontSize: 12, lineHeight: 1.2, blockSpacing: 5 },
      localization: { language: 'en-US', dateFormat: 'MMM yyyy', pageFormat: 'A4' }
    },
    human: {
      spacing: { marginX: 20, marginY: 15, fontSize: 12, lineHeight: 1.2, blockSpacing: 5 },
      localization: { language: 'en-US', dateFormat: 'MMM yyyy', pageFormat: 'A4' }
    }
  }) satisfies { ats: ResumeFormatSettingsAts; human: ResumeFormatSettingsHuman };

export default defineNuxtConfig({
  compatibilityDate: '2026-01-22',

  modules: ['nuxt-auth-utils', '@pinia/nuxt'],
  extends: ['@int/utils'],

  runtimeConfig: {
    databaseUrl: 'postgresql://postgres:postgres@localhost:5432/resume_editor',
    suppressionPepper: 'dev-pepper-not-for-production',
    suppressionTtlDays: 180,
    llm: {
      openaiApiKey: '',
      geminiApiKey: '',
      debugLogs: false,
      openaiPromptCache: {
        enabled: process.env.NUXT_LLM_OPENAI_PROMPT_CACHE_ENABLED !== 'false',
        minPrefixTokens: Number(
          process.env.NUXT_LLM_OPENAI_PROMPT_CACHE_MIN_PREFIX_TOKENS ?? '1024'
        ),
        safetyBufferTokens: Number(
          process.env.NUXT_LLM_OPENAI_PROMPT_CACHE_SAFETY_BUFFER_TOKENS ?? '256'
        )
      },
      geminiCache: {
        enabled: process.env.NUXT_LLM_GEMINI_CACHE_ENABLED !== 'false',
        ttlSeconds: Number(process.env.NUXT_LLM_GEMINI_CACHE_TTL_SECONDS ?? '300')
      },
      fallbackLlmModel: {
        provider: process.env.NUXT_LLM_FALLBACK_PROVIDER ?? 'openai',
        model: process.env.NUXT_LLM_FALLBACK_MODEL ?? 'gpt-4.1-mini',
        price: {
          input: Number(process.env.NUXT_LLM_FALLBACK_PRICE_INPUT ?? '0.4'),
          output: Number(process.env.NUXT_LLM_FALLBACK_PRICE_OUTPUT ?? '1.6'),
          cache: Number(process.env.NUXT_LLM_FALLBACK_PRICE_CACHE ?? '0')
        }
      },
      coverLetterHumanizer: {
        minNaturalnessScore: Number(
          process.env.NUXT_LLM_COVER_LETTER_MIN_NATURALNESS_SCORE ?? '75'
        ),
        maxAiRiskScore: Number(process.env.NUXT_LLM_COVER_LETTER_MAX_AI_RISK_SCORE ?? '35'),
        maxRewritePasses: Number(process.env.NUXT_LLM_COVER_LETTER_MAX_REWRITE_PASSES ?? '1'),
        debugLogs: process.env.NUXT_LLM_COVER_LETTER_HUMANIZER_DEBUG_LOGS !== 'false'
      }
    },
    resume: {
      // Maximum number of versions to keep per resume
      maxVersions: 10
    },
    storage: {
      blobReadWriteToken: '',
      baseUrl: '/storage',
      baseDir: ''
    },
    session: {
      // Session duration: 7 days
      maxAge: 60 * 60 * 24 * 7,
      name: 'nuxt-session',
      password: 'change-me-in-production-min-32-chars',
      cookie: {
        sameSite: 'lax',
        // Secure in production (HTTPS), false in dev
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
      }
    },
    oauth: {
      // Google OAuth configuration
      google: {
        clientId: '',
        clientSecret: ''
      },
      // LinkedIn OAuth configuration
      linkedin: {
        clientId: '',
        clientSecret: ''
      }
    },
    email: {
      // Resend API key for sending emails
      resendApiKey: '',
      from: 'ApplyKit <noreply@applykit.com>'
    },
    redirects: {
      authDefault: '/'
    },
    public: {
      apiCallTimeoutMs: 120000,
      appUrl: 'http://localhost:3000',
      siteUrl: '',
      formatSettings: {
        defaults: createFormatSettingsDefaults()
      },
      coverLetter: {
        minLengthLimitCharacters: COVER_LETTER_CHARACTER_LIMIT_DEFAULTS.MIN,
        maxLengthLimitCharacters: COVER_LETTER_CHARACTER_LIMIT_DEFAULTS.MAX,
        additionalInstructionsMaxCharacters: 1000,
        targetBufferRatio: COVER_LETTER_CHARACTER_BUFFER_DEFAULTS.TARGET_BUFFER_RATIO,
        targetBufferSmallLimitThreshold:
          COVER_LETTER_CHARACTER_BUFFER_DEFAULTS.TARGET_BUFFER_SMALL_LIMIT_THRESHOLD,
        targetBufferSmallMin: COVER_LETTER_CHARACTER_BUFFER_DEFAULTS.TARGET_BUFFER_SMALL_MIN,
        targetBufferSmallMax: COVER_LETTER_CHARACTER_BUFFER_DEFAULTS.TARGET_BUFFER_SMALL_MAX,
        targetBufferMin: COVER_LETTER_CHARACTER_BUFFER_DEFAULTS.TARGET_BUFFER_MIN,
        targetBufferMax: COVER_LETTER_CHARACTER_BUFFER_DEFAULTS.TARGET_BUFFER_MAX
      }
    }
  },

  typescript: {
    strict: true,
    typeCheck: false
  },

  nitro: {
    vercel: {
      functions: {
        maxDuration: 60,
        memory: 1024
      }
    },
    externals: {
      inline: [
        '@sparticuz/chromium-min',
        'follow-redirects',
        'tar-fs',
        'tar-stream',
        'pump',
        'streamx',
        'fast-fifo',
        'b4a',
        'once',
        'end-of-stream',
        'wrappy',
        'text-decoder-utf8',
        'events-universal',
        'text-decoder'
      ]
    },
    // Fix CJS→ESM interop: follow-redirects calls assert() as a function.
    // Rollup's getDefaultExportFromNamespaceIfNotNamed returns the namespace
    // object (non-callable) when the module has multiple named exports.
    // This shim re-exports only the default so the helper returns the callable.
    alias: {
      assert: fileURLToPath(new URL('./server/utils/assert-shim.mjs', import.meta.url))
    }
  },

  alias: { '@layer/api': fileURLToPath(new URL('./', import.meta.url)) }
});
