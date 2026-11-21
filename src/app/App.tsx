import { BrowserRouter, Navigate, Route, Routes, useParams, Link } from 'react-router-dom'
import { getTenantSlug } from '@/lib/tenant'
import { AuthProvider } from '@/features/auth/AuthContext'
import { HomeRedirect, RequireAuth, RequireSuperadmin } from '@/features/auth/Guards'
import LoginPage from '@/features/auth/LoginPage'
import ResetPasswordPage from '@/features/auth/ResetPasswordPage'
import { ToastProvider } from '@/components/ui/Feedback'
import PublicMenuPage from '@/features/public-menu/PublicMenuPage'
import SuperLayout from '@/features/superadmin/SuperLayout'
import DashboardPage from '@/features/superadmin/DashboardPage'
import RestaurantsPage from '@/features/superadmin/RestaurantsPage'
import RestaurantDetailPage from '@/features/superadmin/RestaurantDetailPage'
import PlansPage from '@/features/superadmin/PlansPage'
import PanelLayout from '@/features/panel/PanelLayout'
import CategoriesPage from '@/features/panel/CategoriesPage'
import ProductsPage from '@/features/panel/ProductsPage'
import PromotionsPage from '@/features/panel/PromotionsPage'
import ThemePage from '@/features/panel/ThemePage'
import QRPage from '@/features/panel/QRPage'
import StatsPage from '@/features/panel/StatsPage'
import InfoPage from '@/features/panel/InfoPage'

function PublicMenuRoute() {
  const { slug } = useParams()
  return <PublicMenuPage slug={(slug ?? '').toLowerCase()} />
}

function NotFound() {
  return (
    <div className="mx-auto mt-24 max-w-md text-center">
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <Link to="/" className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">Volver al inicio</Link>
    </div>
  )
}

export default function App() {
  // Si se abre desde el subdominio de un restaurante, se muestra directamente su menú público.
  const tenant = getTenantSlug()
  if (tenant) return <PublicMenuPage slug={tenant} />

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/m/:slug" element={<PublicMenuRoute />} />

            <Route path="/superadmin" element={<RequireSuperadmin><SuperLayout /></RequireSuperadmin>}>
              <Route index element={<DashboardPage />} />
              <Route path="restaurants" element={<RestaurantsPage />} />
              <Route path="restaurants/:id" element={<RestaurantDetailPage />} />
              <Route path="plans" element={<PlansPage />} />
            </Route>

            <Route path="/panel" element={<HomeRedirect />} />
            <Route path="/panel/:rid" element={<RequireAuth><PanelLayout /></RequireAuth>}>
              <Route index element={<Navigate to="products" replace />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="promotions" element={<PromotionsPage />} />
              <Route path="theme" element={<ThemePage />} />
              <Route path="qr" element={<QRPage />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="info" element={<InfoPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
