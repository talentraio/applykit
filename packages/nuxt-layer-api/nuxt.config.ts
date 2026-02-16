import type { ResumeFormatSettingsAts, ResumeFormatSettingsHuman } from '@int/schema';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

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
      formatSettings: {
        defaults: createFormatSettingsDefaults()
      }
    }
  },

  typescript: {
    strict: true,
    typeCheck: false
  },

  routeRules: {
    '/api/pdf/**': {
      vercel: { maxDuration: 60, memory: 1024 }
    }
  },

  nitro: {
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
    }
  },

  alias: { '@layer/api': fileURLToPath(new URL('./', import.meta.url)) }
});
