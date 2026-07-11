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
    <div className="border-t border-border px-6 py-4 bg-card">
      <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Quick Actions</p>
      <div className="flex flex-wrap gap-2">
        {actions.map(action => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                'bg-background border border-border text-foreground',
                'hover:bg-muted/50 hover:border-primary/50 transition-all duration-200',
                'group'
              )}
              title={action.description}
            >
              <Icon className="w-4 h-4 group-hover:text-primary transition-colors" />
              <span>{action.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
