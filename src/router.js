import { createRouter, createWebHistory } from 'vue-router'
import TrackView from './components/TrackView.vue'
import Parameter from './components/Parameter.vue'
import MarshallingVisualization from './components/MarshallingVisualization.vue'
import WheelRailContact from './components/WheelRailContact.vue'

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
  },
  {
    path: '/wheel-rail-contact',
    name: 'wheel-rail-contact',
    component: WheelRailContact
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

