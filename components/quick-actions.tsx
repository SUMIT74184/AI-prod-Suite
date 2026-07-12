'use client'

import { BookMarked, Edit3, HelpCircle, Lightbulb, Quote, Network, Presentation } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickActionsProps {
  onAction: (action: string) => void
}

const actions = [
  { id: 'summary', label: 'Summary', icon: Lightbulb, description: 'Generate a summary' },
  { id: 'notes', label: 'Notes', icon: Edit3, description: 'Create notes' },
  { id: 'flashcards', label: 'Flashcards', icon: BookMarked, description: 'Make flashcards' },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle, description: 'Create a quiz' },
  { id: 'citations', label: 'Citations', icon: Quote, description: 'Extract citations' },
  { id: 'mindmap', label: 'Mind Map', icon: Network, description: 'Generate a mind map structure' },
  { id: 'deck_report', label: 'Deck Report', icon: Presentation, description: 'Create a slide deck report' },
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
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium',
                'bg-transparent border border-border/80 text-muted-foreground',
                'hover:bg-foreground/5 hover:text-foreground hover:border-foreground/20 transition-all duration-200',
                'group shadow-sm'
              )}
              title={action.description}
            >
              <Icon className="w-3.5 h-3.5 group-hover:text-foreground transition-colors" />
              <span>{action.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
