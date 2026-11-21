import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Feedback'

export default function PlanGate({ allowed, feature, children }: { allowed: boolean; feature: string; children: ReactNode }) {
  if (allowed) return <>{children}</>
  return (
    <Card className="mx-auto max-w-lg text-center">
      <p className="text-lg font-semibold">{feature} no está incluido en tu plan</p>
      <p className="mt-2 text-sm text-slate-500">Contacta a Grupo Underty para actualizar tu plan y habilitar esta función.</p>
    </Card>
  )
}
