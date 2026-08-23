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
  ChevronDown,
  ChevronRight,
  Edit2,
  MoreHorizontal,
  Pin,
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
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.conversation-menu-trigger') && !target.closest('.conversation-menu-content')) {
        setMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    // Auto-expand active module when pathname changes
    const activeModule = modules.find(m => pathname.includes(m.id))
    if (activeModule) {
      setExpandedModules(prev => ({ ...prev, [activeModule.id]: true }))
    }
  }, [pathname])

  const toggleModule = (e: React.MouseEvent, moduleId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }))
  }

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

  const startEditing = (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingId(id)
    setEditTitle(title)
  }

  const saveEditing = async (id: string) => {
    if (!editTitle.trim()) {
      setEditingId(null)
      return
    }
    
    try {
      const res = await fetch(`http://localhost:8000/api/py/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() })
      })
      
      if (res.ok) {
        setConversations(conversations.map(c => 
          c.id === id ? { ...c, title: editTitle.trim() } : c
        ))
      }
    } catch (e) {
      console.error('Failed to rename conversation:', e)
    } finally {
      setEditingId(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEditing(id)
    } else if (e.key === 'Escape') {
      setEditingId(null)
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
      <nav className="flex-1 overflow-y-auto px-2 py-4 pb-32">
        <div className={!isCollapsed ? 'mb-6' : 'mb-4'}>
          {!isCollapsed && (
            <p className="px-3 xai-caption-mono-sm text-[#7d8187] mb-3">
              Modules
            </p>
          )}
          <div className="space-y-1">
            {modules.map(module => {
              const Icon = module.icon
              const isActive = pathname.includes(module.id)
              const isExpanded = expandedModules[module.id]
              const moduleConvs = conversations.filter(c => c.module === module.id)

              return (
                <div key={module.id} className="mb-1">
                  <div className={cn(
                    'group flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-[#1a1c20] text-white border-l-2 border-white'
                      : 'text-[#7d8187] hover:text-white hover:bg-[#1a1c20]/50'
                  )}>
                    <Link
                      href={`/modules/${module.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                      title={isCollapsed ? module.label : undefined}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!isCollapsed && <span className="text-sm font-normal truncate">{module.label}</span>}
                    </Link>
                    
                    {!isCollapsed && moduleConvs.length > 0 && (
                      <button
                        onClick={(e) => toggleModule(e, module.id)}
                        className="p-1 hover:bg-[rgba(255,255,255,0.1)] rounded-md transition-colors"
                        aria-label="Toggle folder"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Nested Conversations History */}
                  {!isCollapsed && isExpanded && moduleConvs.length > 0 && (
                    <div className="mt-1 ml-4 border-l border-[#212327] pl-2 space-y-0.5">
                      {moduleConvs.map(conv => (
                        <div key={conv.id} className="relative group/item">
                          <Link
                            href={`/modules/${conv.module}?sessionId=${conv.id}`}
                            className={cn(
                              "flex items-center px-3 py-1.5 rounded-lg hover:bg-[#1a1c20]/50 transition-colors overflow-hidden",
                              pathname.includes(conv.module) && (typeof window !== 'undefined' && window.location.search.includes(conv.id))
                                ? "bg-[#1a1c20]/30 text-white" 
                                : "text-[#7d8187]"
                            )}
                          >
                            {editingId === conv.id ? (
                              <input
                                autoFocus
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                onKeyDown={e => handleKeyDown(e, conv.id)}
                                onBlur={() => saveEditing(conv.id)}
                                className="flex-1 bg-transparent text-[13px] text-white outline-none border-b border-[#ff7a17] w-full min-w-0"
                                onClick={e => { e.preventDefault(); e.stopPropagation() }}
                              />
                            ) : (
                              <span className="block text-[13px] group-hover/item:text-white truncate font-normal transition-all duration-200 group-hover/item:pr-6">
                                {conv.title}
                              </span>
                            )}
                          </Link>
                          
                          {/* 3 Dots Menu Button */}
                          {editingId !== conv.id && (
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 flex items-center transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setMenuId(menuId === conv.id ? null : conv.id)
                                }}
                                className="conversation-menu-trigger p-1 hover:bg-[#212327] text-[#7d8187] hover:text-white rounded-md transition-colors"
                                aria-label="Open menu"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Dropdown Menu */}
                          {menuId === conv.id && (
                            <div 
                              className="conversation-menu-content absolute right-0 top-8 w-32 bg-[#1a1c20] border border-[#212327] rounded-md shadow-xl z-[100] py-1 overflow-hidden"
                              onClick={e => e.stopPropagation()}
                            >
                              <button
                                onClick={(e) => {
                                  // togglePin(conv.id) placeholder for future pin functionality
                                  setMenuId(null)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[#dadbdf] hover:text-white hover:bg-[#212327] transition-colors"
                              >
                                <Pin className="w-3.5 h-3.5" />
                                Pin
                              </button>
                              <button
                                onClick={(e) => {
                                  startEditing(e, conv.id, conv.title)
                                  setMenuId(null)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[#dadbdf] hover:text-white hover:bg-[#212327] transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Rename
                              </button>
                              <button
                                onClick={(e) => {
                                  deleteConversation(conv.id, e)
                                  setMenuId(null)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[#ff4444] hover:bg-[#ff4444]/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
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
