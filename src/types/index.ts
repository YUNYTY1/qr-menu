export type SubStatus = 'activo' | 'pendiente' | 'vencido' | 'suspendido' | 'cancelado'

export interface PlanLimits {
  max_products: number // -1 = ilimitado
  max_branches: number // -1 = ilimitado
  advanced_theme: boolean
  promotions: boolean
  stats: boolean
  branch_stats: boolean
}

export interface Plan {
  id: string
  code: string
  name: string
  price: number
  setup_fee: number
  limits: PlanLimits
  is_active: boolean
}

export interface HourRow { label: string; value: string }
export interface Socials { instagram?: string; facebook?: string; tiktok?: string; website?: string }

export interface Restaurant {
  id: string
  slug: string
  name: string
  description: string | null
  address: string | null
  phone: string | null
  whatsapp: string | null
  currency: string
  logo_url: string | null
  cover_url: string | null
  hours: HourRow[]
  socials: Socials
  created_at: string
}

export type PublicRestaurant = Pick<Restaurant,
  'id' | 'slug' | 'name' | 'description' | 'address' | 'phone' | 'whatsapp' | 'currency' | 'logo_url' | 'cover_url' | 'hours' | 'socials'>

export interface Subscription {
  id: string
  restaurant_id: string
  plan_id: string
  status: SubStatus
  start_date: string | null
  end_date: string | null
  notes: string | null
  plans?: Plan | null
}

export interface Payment {
  id: string
  subscription_id: string
  restaurant_id: string
  amount: number
  type: 'configuracion' | 'mensualidad' | 'otro'
  method: string | null
  note: string | null
  paid_at: string
}

export interface Branch {
  id: string
  restaurant_id: string
  name: string
  address: string | null
  phone: string | null
  whatsapp: string | null
  is_active: boolean
}

export interface Category {
  id: string
  restaurant_id: string
  name: string
  image_url: string | null
  sort_order: number
  is_visible: boolean
}

export interface Product {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  is_published: boolean
  sort_order: number
}

export type BgMode = 'plantilla' | 'color' | 'degradado' | 'textura'
export type BgGradient = 'atardecer' | 'oceano' | 'menta' | 'rosa' | 'arena' | 'noche' | 'bosque' | 'vino' | 'uva'
export type BgTexture = 'puntos' | 'lineas' | 'cuadricula' | 'papel'

export interface Theme {
  restaurant_id?: string
  template: 'clasico' | 'moderno' | 'oscuro' | 'elegante'
  primary_color: string
  secondary_color: string
  button_color: string
  font: 'Inter' | 'Poppins' | 'Montserrat' | 'Playfair Display' | 'Lora'
  card_style: 'redondeada' | 'plana' | 'sombra'
  layout: 'cuadricula' | 'lista' | 'grande'
  bg_mode: BgMode
  bg_color: string
  bg_gradient: BgGradient
  bg_texture: BgTexture
}

export interface Promotion {
  id: string
  restaurant_id: string
  title: string
  description: string | null
  image_url: string | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
}

export interface Profile { id: string; email: string | null; full_name: string | null; is_superadmin: boolean }
export interface Membership {
  restaurant_id: string
  role: 'owner' | 'editor'
  restaurant: { id: string; name: string; slug: string }
}

export interface PublicMenuData {
  restaurant: PublicRestaurant
  theme: Theme
  branches: Branch[]
  categories: Category[]
  products: Product[]
  promotions: Promotion[]
}
export type PublicMenuResponse =
  | ({ available: true; status: SubStatus } & PublicMenuData)
  | { available: false; status: SubStatus; restaurant: { name: string; logo_url: string | null } }