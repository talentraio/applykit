import process from 'node:process';

/**
 * Nitro plugin: validates that suppressionPepper is set in production.
 * Fails fast with a clear error if missing.
 */
export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const config = useRuntimeConfig();

  if (!config.suppressionPepper) {
    throw new Error(
      'NUXT_SUPPRESSION_PEPPER is required in production. ' + 'Generate with: openssl rand -hex 32'
    );
  }
});
