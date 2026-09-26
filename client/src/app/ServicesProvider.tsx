import type { ReactNode } from 'react'
import { ServicesContext } from '@/hooks/useServices'
import type { Services } from '@/services'

interface ServicesProviderProps {
  readonly services: Services
  readonly children: ReactNode
}

export function ServicesProvider({ services, children }: ServicesProviderProps) {
  return <ServicesContext value={services}>{children}</ServicesContext>
}
