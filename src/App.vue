<template>
  <div class="shell" :class="{ minimal: isMinimal }">
    <header v-if="!isMinimal" class="top">
      <router-link class="brand" to="/">
        <img class="brand-icon" src="/favicon.svg" alt="" width="28" height="28" />
        TypeLocal
      </router-link>
      <nav class="nav">
        <router-link to="/">练习</router-link>
        <router-link to="/library">词库</router-link>
        <router-link to="/stats">统计</router-link>
        <router-link to="/settings">设置</router-link>
      </nav>
    </header>
    <main class="main" :class="{ 'main-minimal': isMinimal }">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isMinimal = computed(() => Boolean(route.meta.minimal))
</script>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  line-height: 1;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.25rem;
  letter-spacing: -0.02em;
  color: var(--ink);
  text-decoration: none;
}

.brand-icon {
  display: block;
  width: 1.15em;
  height: 1.15em;
  /* 该 SVG 上重下轻，略下移与大写字母顶齐 */
  transform: translateY(0.10em);
  flex-shrink: 0;
}

.nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
}

.nav a {
  color: var(--ink-muted);
  text-decoration: none;
  font-size: 0.95rem;
  padding: 0.2rem 0;
  border-bottom: 2px solid transparent;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.nav a:hover,
.nav a.router-link-active {
  color: var(--ink);
  border-bottom-color: var(--accent);
}

.main {
  flex: 1;
  width: min(920px, 100%);
  margin: 0 auto;
  padding: 1.75rem 1.25rem 3rem;
}

.main-minimal {
  width: min(480px, 100%);
  padding-top: 1.25rem;
}
</style>
