import { createRouter, createWebHistory } from 'vue-router'
import PracticeView from '../views/PracticeView.vue'
import LibraryView from '../views/LibraryView.vue'
import StatsView from '../views/StatsView.vue'
import SettingsView from '../views/SettingsView.vue'
import ShareView from '../views/ShareView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'practice', component: PracticeView },
    { path: '/library', name: 'library', component: LibraryView },
    { path: '/stats', name: 'stats', component: StatsView },
    { path: '/settings', name: 'settings', component: SettingsView },
    {
      path: '/s/:id',
      name: 'share',
      component: ShareView,
      meta: { minimal: true },
    },
  ],
})

export default router
