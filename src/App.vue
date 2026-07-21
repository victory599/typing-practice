<template>
  <div class="shell">
    <header class="top">
      <router-link class="brand" to="/">TypeLocal</router-link>
      <nav class="nav">
        <router-link to="/">练习</router-link>
        <router-link to="/library">词库</router-link>
        <router-link to="/stats">统计</router-link>
        <router-link to="/settings">设置</router-link>
      </nav>
    </header>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
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
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.25rem;
  letter-spacing: -0.02em;
  color: var(--ink);
  text-decoration: none;
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
</style>
