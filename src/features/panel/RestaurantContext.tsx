import { createContext, useContext } from 'react'
import type { Plan, PlanLimits, Restaurant, SubStatus, Subscription } from '@/types'

export type PendingNavigationAction =
  | { type: 'route'; to: string }
  | { type: 'signOut' }
  | null

export interface RestaurantCtx {
  restaurant: Restaurant
  subscription: Subscription | null
  plan: Plan | null
  limits: PlanLimits
  status: SubStatus
  canWrite: boolean
  isSuperadmin: boolean
  reload: () => void
  hasUnsavedChanges?: boolean
  setHasUnsavedChanges?: (dirty: boolean) => void
  requestNavigation?: (action: NonNullable<PendingNavigationAction>) => boolean
}

export const FULL_LIMITS: PlanLimits = {
  max_products: -1,
  max_branches: -1,
  advanced_theme: true,
  promotions: true,
  stats: true,
  branch_stats: true,
}

export const STARTER_LIMITS: PlanLimits = {
  max_products: 30,
  max_branches: 0,
  advanced_theme: false,
  promotions: false,
  stats: false,
  branch_stats: false,
}

export const RestaurantContext = createContext<RestaurantCtx>(null!)
export const useRestaurant = () => useContext(RestaurantContext)