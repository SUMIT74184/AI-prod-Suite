'use client'

import { BookMarked, Edit3, HelpCircle, Lightbulb, Quote, Network, Presentation } from 'lucide-react'

interface QuickActionsProps {
  onAction: (action: string) => void
}

const actions = [
  { id: 'summary', label: 'Summary', icon: Lightbulb },
  { id: 'notes', label: 'Notes', icon: Edit3 },
  { id: 'flashcards', label: 'Flashcards', icon: BookMarked },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle },
  { id: 'citations', label: 'Citations', icon: Quote },
  { id: 'mindmap', label: 'Mind Map', icon: Network },
  { id: 'deck_report', label: 'Deck Report', icon: Presentation },
]

export default function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="relative z-10 px-6 pb-2 pt-1">
      <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-1.5">
        {actions.map(action => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              className="group inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[12.5px] text-gray-400 transition-all duration-200 hover:border-[#ff7a17]/35 hover:bg-[#ff7a17]/[0.06] hover:text-white"
            >
              <Icon className="h-3.5 w-3.5 text-gray-500 transition-colors group-hover:text-[#ffc285]" strokeWidth={1.75} />
              <span>{action.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
