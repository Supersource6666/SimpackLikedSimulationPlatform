import { createRouter, createWebHistory } from 'vue-router'
import TrackView from './components/TrackView.vue'
import TrackParams from './components/TrackParams.vue'
import TrackInspection from './components/TrackInspection.vue'

const routes = [
  {
    path: '/',
    name: 'TrackParams',
    component: TrackParams
  },
  {
    path: '/track',
    name: 'TrackView',
    component: TrackView
  },
  {
    path: '/inspection',
    name: 'TrackInspection',
    component: TrackInspection
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router