export const ROUTES = {
  root: '/',
  login: '/login',
  dashboard: '/dashboard',
  auth: {
    callback: '/auth/callback',
    credentials: '/auth/credentials',
    signout: '/auth/signout',
  },
  api: {
    auth: {
      user: '/api/auth/user',
    },
  },
} as const

export type RoutePath = typeof ROUTES[keyof typeof ROUTES]
