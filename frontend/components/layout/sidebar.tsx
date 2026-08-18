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
  Settings,
} from 'lucide-react'

import { cn } from '@/lib/utils'

interface ConversationItem {
  id: string
  title: string
  module: string
}

const modules = [
  { id: 'research-assistant', label: 'Research Assistant', icon: Brain },
  { id: 'code-reviewer', label: 'Code Reviewer', icon: Code2 },
  { id: 'prompt-playground', label: 'Prompt Playground', icon: Lightbulb },
  { id: 'web-research-agent', label: 'Web Research', icon: Search },
  { id: 'workflow-automation', label: 'Workflows', icon: Workflow },
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
        'flex flex-col bg-[#0a0a0a] border-r border-[#212327] transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#212327]">
        {!isCollapsed && (
          <Link href="/" className="text-[15px] font-normal text-white flex items-center gap-2.5 tracking-tight hover:opacity-80 transition-opacity">
            <Brain className="w-5 h-5" />
            AI Suite
          </Link>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-[#1a1c20] rounded-lg transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4 h-4 text-[#7d8187]" />
        </button>
      </div>

      {/* New Conversation Button */}
      {!isCollapsed && (
        <div className="px-3 mt-4">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-[rgba(255,255,255,0.25)] text-white text-sm font-normal hover:border-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] transition-all">
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>
      )}

      {/* Modules Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <div className={!isCollapsed ? 'mb-6' : 'mb-4'}>
          {!isCollapsed && (
            <p className="px-3 xai-caption-mono-sm text-[#7d8187] mb-3">
              Modules
            </p>
          )}
          <div className="space-y-0.5">
            {modules.map(module => {
              const Icon = module.icon
              const isActive = pathname.includes(module.id)
              return (
                <Link
                  key={module.id}
                  href={`/modules/${module.id}`}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-[#1a1c20] text-white border-l-2 border-white'
                      : 'text-[#7d8187] hover:text-white hover:bg-[#1a1c20]/50'
                  )}
                  title={isCollapsed ? module.label : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && <span className="text-sm font-normal truncate">{module.label}</span>}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Conversations History */}
        {!isCollapsed && conversations.length > 0 && (
          <div>
            <p className="px-3 xai-caption-mono-sm text-[#7d8187] mb-3">
              Recent
            </p>
            <div className="space-y-0.5">
              {conversations.map(conv => (
                <Link
                  key={conv.id}
                  href={`/modules/${conv.module}?sessionId=${conv.id}`}
                  className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#1a1c20]/50 transition-colors"
                >
                  <span className="flex-1 text-sm text-[#7d8187] group-hover:text-white truncate font-normal transition-colors">
                    {conv.title}
                  </span>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[rgba(255,68,68,0.15)] rounded-full transition-all"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3 text-[#ff4444]" />
                  </button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#212327]">
          <Link
            href="/modules/settings"
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#7d8187] hover:text-white hover:bg-[#1a1c20]/50 rounded-lg transition-all font-normal"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
        </div>
      )}
    </aside>
  )
}
