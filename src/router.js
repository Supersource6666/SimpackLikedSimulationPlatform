import { createRouter, createWebHistory } from 'vue-router'
import Parameter from './components/Parameter.vue'
import WheelRailContact from './components/WheelRailContact.vue'

const routes = [
  {
    path: '/',
    name: 'Parameter',
    component: Parameter
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

