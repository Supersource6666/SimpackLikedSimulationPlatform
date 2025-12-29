import { createRouter, createWebHistory } from 'vue-router'
import TrackView from './components/TrackView.vue'
import Parameter from './components/Parameter.vue'
import MarshallingVisualization from './components/MarshallingVisualization.vue'

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
    path: '/marshalling-visualization',
    name: 'marshalling-visualization',
    component: MarshallingVisualization
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

