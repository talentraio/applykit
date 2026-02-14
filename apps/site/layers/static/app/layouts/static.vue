<template>
  <div class="site-landing-layout">
    <StaticLayoutHeader :app-title="appTitle" class="site-landing-layout__header h-16" />

    <!-- Main Content -->
    <main class="site-landing-layout__main">
      <div class="site-landing-layout__content">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import StaticLayoutHeader from '../components/layout/Header/index.vue';

defineOptions({ name: 'SiteLandingLayout' });
const appTitle = 'ApplyKit';
</script>

<style lang="scss">
.site-landing-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;

  &__main {
    flex: 1;
    min-height: 0;
  }

  &__content {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }
}
</style>
