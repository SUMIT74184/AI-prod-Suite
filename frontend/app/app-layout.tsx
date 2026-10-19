'use client'

import { ReactNode } from 'react'
import Sidebar from '@/components/layout/sidebar'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-[#0a0a0a] font-sans text-white selection:bg-[#ff7a17]/30">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
