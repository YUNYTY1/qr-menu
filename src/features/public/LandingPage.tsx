import { useEffect } from 'react'
import { supabase, unwrap } from '@/lib/supabase'
import { useData } from '@/hooks/useData'
import type { PublicPlansResponse } from '@/types/billing'
import { Header } from './landing/Header'
import { Hero } from './landing/Hero'
import { Steps } from './landing/Steps'
import { Features } from './landing/Features'
import { AiImport } from './landing/AiImport'
import { Customize } from './landing/Customize'
import { Plans } from './landing/Plans'
import { Faq, Cta } from './landing/Faq'
import { Footer } from './landing/Footer'

export default function LandingPage() {
  const { data } = useData(() => unwrap<PublicPlansResponse>(supabase.rpc('get_public_plans')), [])
  const trial = data?.trial_days ?? 7

  // iOS Safari solo activa :active (efecto de pulsado) si hay algún listener de touch
  useEffect(() => {
    const noop = () => {}
    document.addEventListener('touchstart', noop, { passive: true })
    return () => document.removeEventListener('touchstart', noop)
  }, [])

  return (
    <div className="min-h-screen bg-cream text-gray-900">
      <Header />
      <Hero trial={trial} />
      <Steps />
      <Features />
      <AiImport />
      <Customize />
      <Plans data={data} trial={trial} />
      <section id="faq" className="scroll-mt-20 bg-cream pb-14 pt-14 sm:pb-20 sm:pt-20">
        <Faq />
        <Cta trial={trial} />
      </section>
      <Footer />
    </div>
  )
}