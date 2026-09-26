import { useState } from 'react'
import { RouterProvider } from 'react-router'
import type { Services } from '@/services'
import { createAppRouter } from './Router'
import { ServicesProvider } from './ServicesProvider'

interface AppProps {
  readonly services: Services
}

export function App({ services }: AppProps) {
  const [router] = useState(createAppRouter)

  return (
    <ServicesProvider services={services}>
      <RouterProvider router={router} />
    </ServicesProvider>
  )
}
