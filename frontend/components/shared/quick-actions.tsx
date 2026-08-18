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
    <div className="px-4 pb-4 pt-2 bg-transparent relative z-10">
      <div className="flex flex-wrap gap-2 justify-center max-w-3xl mx-auto">
        {actions.map(action => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-normal border border-[rgba(255,255,255,0.25)] text-[#7d8187] hover:text-white hover:border-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-all duration-200 group"
            >
              <Icon className="w-3.5 h-3.5 group-hover:text-white transition-colors" />
              <span>{action.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
