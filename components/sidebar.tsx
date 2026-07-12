'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Brain,
  Code2,
  Lightbulb,
  Search,
  Workflow,
  Menu,
  Plus,
  Trash2,
  ChevronDown,
} from 'lucide-react'

import { cn } from '@/lib/utils'

interface ConversationItem {
  id: string
  title: string
  module: string
}

const modules = [
  { id: 'research-assistant', label: 'AI Research Assistant', icon: Brain },
  { id: 'code-reviewer', label: 'AI Code Reviewer', icon: Code2 },
  { id: 'prompt-playground', label: 'Prompt Playground', icon: Lightbulb },
  { id: 'web-research-agent', label: 'Web Research Agent', icon: Search },
  { id: 'workflow-automation', label: 'Workflow Automation', icon: Workflow },
]

export default function Sidebar() {
  const pathname = usePathname()
  
  // Temporary: Clerk disabled per user request
  const userId = "demo-user"
  
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)

  const fetchConversations = async () => {
    if (!userId) return
    try {
      // In production this URL should be dynamic based on environment
      const res = await fetch(`http://localhost:8000/api/py/conversations?user_id=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch (e) {
      console.error('Failed to fetch conversations:', e)
    }
  }

  useEffect(() => {
    fetchConversations()
    
    // Set up a custom event listener to refresh conversations when a new one is created
    const handleRefresh = () => fetchConversations()
    window.addEventListener('refresh-conversations', handleRefresh)
    return () => window.removeEventListener('refresh-conversations', handleRefresh)
  }, [userId])

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await fetch(`http://localhost:8000/api/py/ingest/${id}`, { method: 'DELETE' })
      setConversations(conversations.filter(c => c.id !== id))
    } catch (e) {
      console.error('Failed to delete conversation:', e)
    }
  }

  return (
    <aside
      className={cn(
        'flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <h1 className="text-lg font-bold text-sidebar-foreground flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Suite
          </h1>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-sidebar-accent rounded transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5 text-sidebar-foreground" />
        </button>
      </div>

      {/* New Conversation Button */}
      {!isCollapsed && (
        <button className="mx-4 mt-4 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground rounded-md transition-colors shadow-sm text-xs font-medium">
          <Plus className="w-3.5 h-3.5" />
          New Chat
        </button>
      )}

      {/* Modules Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <div className={!isCollapsed ? 'mb-6' : 'mb-4'}>
          {!isCollapsed && (
            <p className="px-3 text-xs font-semibold text-sidebar-foreground/60 mb-3 uppercase">
              Modules
            </p>
          )}
          <div className="space-y-1">
            {modules.map(module => {
              const Icon = module.icon
              const isActive = pathname.includes(module.id)
              return (
                <Link
                  key={module.id}
                  href={`/modules/${module.id}`}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                  title={isCollapsed ? module.label : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && <span className="text-sm truncate">{module.label}</span>}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Conversations History */}
        {!isCollapsed && conversations.length > 0 && (
          <div>
            <p className="px-3 text-xs font-semibold text-sidebar-foreground/60 mb-3 uppercase">
              Recent Conversations
            </p>
            <div className="space-y-1">
              {conversations.map(conv => (
                <Link
                  key={conv.id}
                  href={`/modules/${conv.module}?sessionId=${conv.id}`}
                  className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent/30 transition-colors"
                >
                  <span className="flex-1 text-sm text-sidebar-foreground truncate">
                    {conv.title}
                  </span>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Link href="/modules/settings" className="w-full flex items-center justify-between px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/30 rounded-lg transition-colors">
            <span>Settings</span>
            <ChevronDown className="w-4 h-4" />
          </Link>
        </div>
      )}
    </aside>
  )
}
