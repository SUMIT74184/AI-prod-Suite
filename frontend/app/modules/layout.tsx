import AppLayout from '@/app/app-layout'
import { ReactNode } from 'react'

export default function ModulesLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
