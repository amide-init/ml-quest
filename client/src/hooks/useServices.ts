import { createContext, useContext } from 'react'
import type { Services } from '@/services'

/** Provided by app/ServicesProvider. Not exported from the hooks barrel on purpose. */
export const ServicesContext = createContext<Services | null>(null)

/** Access services from other hooks. Pages and components never call this directly. */
export function useServices(): Services {
  const services = useContext(ServicesContext)
  if (!services) {
    throw new Error('useServices() must be used inside <ServicesProvider>.')
  }
  return services
}
