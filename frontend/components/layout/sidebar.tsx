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
  PanelLeftClose,
  PanelLeftOpen,
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
import { Logo } from '@/components/marketing/site-chrome'

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
        'relative flex h-full shrink-0 flex-col border-r border-white/[0.06] bg-[#070708] transition-[width] duration-300',
        isCollapsed ? 'w-[68px]' : 'w-[264px]'
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_80%_100%_at_0%_0%,rgba(255,122,23,0.07),transparent)]" />

      {/* Header */}
      <div className={cn('relative flex h-16 shrink-0 items-center border-b border-white/[0.06]', isCollapsed ? 'justify-center' : 'justify-between px-4')}>
        {!isCollapsed && <Logo />}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-white"
          aria-label="Toggle sidebar"
        >
          {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* New Conversation Button */}
      <div className="relative mt-4 px-3">
        <button
          className={cn(
            'group flex w-full items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] text-[13px] text-gray-200 transition-all hover:border-white/25 hover:bg-white/[0.06] hover:text-white',
            isCollapsed ? 'h-10 justify-center' : 'px-3.5 py-2'
          )}
          title={isCollapsed ? 'New chat' : undefined}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-black transition-colors group-hover:bg-[#ffc285]">
            <Plus className="h-3 w-3" strokeWidth={2.5} />
          </span>
          {!isCollapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Modules Navigation */}
      <nav className="relative flex-1 overflow-y-auto px-3 py-5">
        {!isCollapsed && (
          <div className="mb-3 flex items-center gap-2.5 px-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-gray-500">
            <span className="text-[#ff7a17]">//</span>
            Workspace
          </div>
        )}
        <div className="space-y-0.5">
          {modules.map((module, moduleIdx) => {
            const Icon = module.icon
            const isActive = pathname.includes(module.id)
            const isExpanded = expandedModules[module.id]
            const moduleConvs = conversations.filter(c => c.module === module.id)

            return (
              <div key={module.id}>
                <div
                  className={cn(
                    'group relative flex items-center rounded-xl transition-colors duration-200',
                    isCollapsed ? 'justify-center p-1.5' : 'gap-1 py-1.5 pl-1.5 pr-1.5',
                    isActive ? 'bg-white/[0.05] text-white' : 'text-gray-400 hover:bg-white/[0.03] hover:text-white'
                  )}
                >
                  {isActive && <span className="absolute -left-3 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[#ff7a17] shadow-[0_0_10px_#ff7a17]" />}
                  <Link
                    href={`/modules/${module.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                    title={isCollapsed ? module.label : undefined}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors',
                        isActive
                          ? 'border-[#ff7a17]/30 bg-[#ff7a17]/10 text-[#ffc285]'
                          : 'border-white/[0.06] bg-white/[0.02] text-gray-500 group-hover:text-gray-200'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </span>
                    {!isCollapsed && <span className="truncate text-[13.5px]">{module.label}</span>}
                  </Link>

                  {!isCollapsed && (moduleConvs.length > 0 ? (
                    <button
                      onClick={(e) => toggleModule(e, module.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white/[0.08] hover:text-white"
                      aria-label="Toggle folder"
                    >
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                  ) : (
                    <span className="pr-1.5 font-mono text-[10px] text-gray-600">0{moduleIdx + 1}</span>
                  ))}
                </div>

                {/* Nested Conversations History */}
                {!isCollapsed && isExpanded && moduleConvs.length > 0 && (
                  <div className="mb-2 ml-[22px] mt-1 space-y-px border-l border-white/[0.06] pl-2.5">
                    {moduleConvs.map(conv => {
                      const isCurrent = pathname.includes(conv.module) && typeof window !== 'undefined' && window.location.search.includes(conv.id)
                      return (
                        <div key={conv.id} className="group/item relative">
                          <Link
                            href={`/modules/${conv.module}?sessionId=${conv.id}`}
                            className={cn(
                              'flex items-center gap-2 overflow-hidden rounded-lg px-2 py-1.5 transition-colors',
                              isCurrent ? 'bg-white/[0.04] text-white' : 'text-gray-500 hover:bg-white/[0.03] hover:text-gray-200'
                            )}
                          >
                            {isCurrent && <span className="h-1 w-1 shrink-0 rounded-full bg-[#ff7a17]" />}
                            {editingId === conv.id ? (
                              <input
                                autoFocus
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                onKeyDown={e => handleKeyDown(e, conv.id)}
                                onBlur={() => saveEditing(conv.id)}
                                className="w-full min-w-0 flex-1 border-b border-[#ff7a17] bg-transparent text-[12.5px] text-white outline-none"
                                onClick={e => { e.preventDefault(); e.stopPropagation() }}
                              />
                            ) : (
                              <span className="block truncate text-[12.5px] transition-all duration-200 group-hover/item:pr-6">
                                {conv.title}
                              </span>
                            )}
                          </Link>

                          {/* 3 Dots Menu Button */}
                          {editingId !== conv.id && (
                            <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center opacity-0 transition-opacity group-hover/item:opacity-100">
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setMenuId(menuId === conv.id ? null : conv.id)
                                }}
                                className="conversation-menu-trigger rounded-md p-1 text-gray-500 transition-colors hover:bg-white/[0.08] hover:text-white"
                                aria-label="Open menu"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Dropdown Menu */}
                          {menuId === conv.id && (
                            <div
                              className="conversation-menu-content absolute right-0 top-8 z-[100] w-36 overflow-hidden rounded-xl border border-white/10 bg-[#111113]/95 p-1 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl"
                              onClick={e => e.stopPropagation()}
                            >
                              <button
                                onClick={(e) => {
                                  // togglePin(conv.id) placeholder for future pin functionality
                                  setMenuId(null)
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-gray-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                              >
                                <Pin className="h-3.5 w-3.5" />
                                Pin
                              </button>
                              <button
                                onClick={(e) => {
                                  startEditing(e, conv.id, conv.title)
                                  setMenuId(null)
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-gray-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                Rename
                              </button>
                              <div className="mx-1 my-1 h-px bg-white/[0.06]" />
                              <button
                                onClick={(e) => {
                                  deleteConversation(conv.id, e)
                                  setMenuId(null)
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-red-300/90 transition-colors hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="relative shrink-0 space-y-2 border-t border-white/[0.06] p-3">
        <Link
          href="/modules/settings"
          title={isCollapsed ? 'Settings' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-xl text-[13.5px] transition-colors',
            isCollapsed ? 'justify-center p-1.5' : 'px-1.5 py-1.5',
            pathname.includes('/settings') ? 'bg-white/[0.05] text-white' : 'text-gray-400 hover:bg-white/[0.03] hover:text-white'
          )}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <Settings className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
          {!isCollapsed && <span>Settings</span>}
        </Link>
        {!isCollapsed && (
          <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ffc285] to-[#ff7a17] font-mono text-[11px] text-black">
                {userId.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12.5px] text-gray-200">{userId}</p>
                <p className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-gray-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  Agents online
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
