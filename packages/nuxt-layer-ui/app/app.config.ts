/**
 * App Config - UI Theme Tokens
 *
 * Single source of truth for Nuxt UI Pro theme configuration
 * Per docs/design/mvp.md requirements
 */

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'violet',
      neutral: 'slate'
    }
  },

  theme: {
    radius: 0.9 // Soft, B2C-friendly rounded corners
  }
});
