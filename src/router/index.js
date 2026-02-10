import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
// import laravelServer from '@/api/laravelServer'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      redirect: '/arc-gis'
    },
    {
      path: '/arc-gis',
      name: 'arc-gis',
      component: () => import('@/views/Map/MapArcGis.vue'),
      meta: {
        requiresAuth: false
      }
    },
    {
      path: '/map-2d',
      name: 'map-2d',
      component: () => import('@/views/Map/MapLeaflet.vue'),
      meta: {
        requiresAuth: false
      }
    },
    {
      path: '/map-3d',
      name: 'map-3d',
      component: () => import('@/views/Map/MapLibre.vue'),
      meta: {
        requiresAuth: false
      }
    },
    {
      path: '/assessment',
      name: 'assessment',
      component: () => import('@/views/Assessment/AssessmentView.vue')
    },
    // {
    //   path: '/public-spaces',
    //   name: 'public-spaces',
    //   component: () => import('@/views/PublicSpace/PublicSpaceList.vue'),
    //   meta: {
    //     requiresAuth: false
    //   }
    // },
    // {
    //   path: '/threats',
    //   name: 'threats',
    //   component: () => import('@/views/Threat/ThreatList.vue'),
    //   meta: {
    //     requiresAuth: false
    //   }
    // },
    {
      path: '/cases',
      name: 'cases',
      component: () => import('@/views/Case/CaseView.vue')
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/User/UserView.vue')
    },
    {
      path: '/groups',
      name: 'groups',
      component: () => import('@/views/Group/GroupView.vue')
    },
    {
      path: '/scenario-session',
      name: 'scenario-session',
      component: () => import('@/views/Scenario/ScenarioView.vue')
    }
    // {
    //   path: '/debug',
    //   name: 'debug',
    //   component: () => import('../views/Debug/TestMap.vue')
    // }
  ]
})

// router.beforeEach((to, from, next) => {
//   if (to.matched.some((record) => record.meta.requiresAuth)) {
//     laravelServer
//       .getUserData()
//       .then(() => {
//         next()
//       })
//       .catch(() => {
//         next({ name: 'error' })
//       })
//   } else {
//     next()
//   }
// })

export default router
