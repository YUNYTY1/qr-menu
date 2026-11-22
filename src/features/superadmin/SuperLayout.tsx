import { Outlet } from 'react-router-dom'
import AdminShell, { type NavItem } from '@/components/ui/AdminShell'

const nav: NavItem[] = [
  { to: '/superadmin', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/superadmin/restaurants', label: 'Restaurantes', icon: 'store' },
  { to: '/superadmin/plans', label: 'Planes', icon: 'plans' },
  { to: '/superadmin/payments', label: 'Pagos', icon: 'check' },
]

export default function SuperLayout() {
  return <AdminShell title="Grupo Underty" nav={nav}><Outlet /></AdminShell>
}
