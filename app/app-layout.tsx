'use client'

import { ReactNode } from 'react'
import Sidebar from '@/components/sidebar'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
