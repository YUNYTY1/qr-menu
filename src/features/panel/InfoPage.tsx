import { PageHeader } from '@/components/ui/Feedback'
import RestaurantInfoForm from '@/features/restaurants/RestaurantInfoForm'
import BranchesManager from './BranchesManager'
import { useRestaurant } from './RestaurantContext'

export default function InfoPage() {
  const { restaurant, canWrite, reload } = useRestaurant()
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Mi restaurante" subtitle="Datos que se muestran en tu menú público." />
      <RestaurantInfoForm key={restaurant.id + restaurant.name} restaurant={restaurant} disabled={!canWrite} onSaved={reload} />
      <BranchesManager />
    </div>
  )
}
