import process from 'node:process'

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',

  modules: ['nuxt-auth-utils'],

  runtimeConfig: {
    session: {
      // Session duration: 7 days
      maxAge: 60 * 60 * 24 * 7,
      name: 'nuxt-session',
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
        clientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET || ''
      }
    }
  },

  typescript: {
    strict: true,
    typeCheck: true
  }
})
