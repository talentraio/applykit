<template>
  <div class="resume-tab-ai-enhance">
    <div class="resume-tab-ai-enhance__content">
      <!-- Coming Soon Icon -->
      <div class="resume-tab-ai-enhance__icon">
        <UIcon name="i-lucide-sparkles" class="h-12 w-12 text-primary" />
      </div>

      <!-- Title -->
      <h3 class="resume-tab-ai-enhance__title">
        {{ $t('resume.ai.title') }}
      </h3>

      <!-- Description -->
      <p class="resume-tab-ai-enhance__description">
        {{ $t('resume.ai.description') }}
      </p>

      <!-- Features List -->
      <ul class="resume-tab-ai-enhance__features">
        <li>
          <UIcon name="i-lucide-check" class="h-4 w-4 text-primary" />
          {{ $t('resume.ai.feature1') }}
        </li>
        <li>
          <UIcon name="i-lucide-check" class="h-4 w-4 text-primary" />
          {{ $t('resume.ai.feature2') }}
        </li>
        <li>
          <UIcon name="i-lucide-check" class="h-4 w-4 text-primary" />
          {{ $t('resume.ai.feature3') }}
        </li>
      </ul>

      <!-- Coming Soon Badge -->
      <UBadge color="primary" variant="soft" size="lg">
        {{ $t('resume.ai.comingSoon') }}
      </UBadge>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * AI Enhance Tab Placeholder
 *
 * Placeholder component showing "Coming Soon" for AI enhancement features.
 * Will be replaced with actual AI-powered resume enhancement tools.
 *
 * Planned features:
 * - Improve bullet points
 * - Enhance summary
 * - Optimize for ATS
 * - Suggest skills
 *
 * Related: T037 (US3)
 */

defineOptions({ name: 'ResumeTabAIEnhance' });
</script>

<style lang="scss">
.resume-tab-ai-enhance {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;

  &__content {
    text-align: center;
    max-width: 400px;
  }

  &__icon {
    display: flex;
    justify-content: center;
    margin-bottom: 1.5rem;

    > * {
      padding: 1rem;
      border-radius: 9999px;
      background-color: var(--color-primary-100);

      @media (prefers-color-scheme: dark) {
        background-color: var(--color-primary-900);
      }
    }
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  &__description {
    font-size: 0.875rem;
    color: var(--color-neutral-500);
    margin-bottom: 1.5rem;
  }

  &__features {
    list-style: none;
    padding: 0;
    margin: 0 0 1.5rem;
    text-align: left;

    li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0;
      font-size: 0.875rem;
    }
  }
}
</style>
