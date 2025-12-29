import { createRouter, createWebHistory } from 'vue-router'
import TrackView from './components/TrackView.vue'
import Parameter from './components/Parameter.vue'
import TrackInspection from './components/TrackInspection.vue'

const routes = [
  {
    path: '/',
    name: 'Parameter',
    component: Parameter
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