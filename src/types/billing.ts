import type { PlanLimits } from '@/types'

export interface BillingSettings {
  id: number
  trial_days: number
  mp_enabled: boolean
  yape_number: string | null
  yape_name: string | null
  bank_name: string | null
  bank_account: string | null
  bank_cci: string | null
  contact_whatsapp: string | null
}

export interface PaymentOrder {
  id: string
  restaurant_id: string
  subscription_id: string
  plan_id: string
  months: number
  amount: number
  provider: 'manual' | 'mercadopago'
  status: 'pending' | 'paid' | 'rejected' | 'cancelled'
  external_id: string | null
  proof_path: string | null
  note: string | null
  review_note: string | null
  created_at: string
  paid_at: string | null
  restaurants?: { name: string; slug: string } | null
  plans?: { name: string } | null
}

export interface PublicPlan { id: string; code: string; name: string; price: number; limits: PlanLimits }
export interface PublicPlansResponse { trial_days: number; plans: PublicPlan[] }

export const MONTH_OPTIONS = [1, 3, 6, 12] as const
export const monthsLabel = (m: number) => (m === 1 ? '1 mes' : `${m} meses`)
export const MENU_SETUP_FEE = 5