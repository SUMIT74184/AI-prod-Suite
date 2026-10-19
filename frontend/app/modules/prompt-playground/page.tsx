'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
export const dynamic = 'force-dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectGroup,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Loader2, Copy, Save, Search, Play, Settings2, History, Code2, Plus, Trash2, Heart, GitBranch, X, AlertCircle, CheckCircle2, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModuleHeader, MonoLabel, StatusDot, Kbd, ui } from '@/components/workspace/kit'
import { SegmentTabs } from '@/components/workspace/review-report'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface SavedPrompt {
  id: string
  name: string
  description?: string
  section: string
  status: string
  tags: string[]
  system_prompt?: string
  user_prompt?: string
  latest_version: number
  is_favorite?: boolean
}

interface RunHistoryItem {
  id: string
  timestamp: string
  version_id?: string
  provider: string
  model: string
  latency_ms: number
  input_tokens: number
  output_tokens: number
  estimated_cost_usd: number
  status: string
  output_text?: string
}

const PROVIDERS = [
  { name: 'OpenAI', models: ['GPT-4o', 'GPT-4o-mini', 'GPT-4-turbo', 'GPT-3.5-turbo'] },
  { name: 'Anthropic', models: ['Claude 3.5 Sonnet', 'Claude 3 Opus', 'Claude 3 Haiku'] },
  { name: 'Gemini', models: ['Gemini 1.5 Pro', 'Gemini 1.5 Flash', 'Gemini 2.0 Flash'] },
  { name: 'OpenRouter', models: [
    'nvidia/nemotron-3-ultra-550b-a55b:free',
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3-8b-instruct:free',
    'deepseek/deepseek-chat-v3-0324:free'
  ] },
]

export default function PromptPlaygroundPage() {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([])
  const [activePromptId, setActivePromptId] = useState<string | null>(null)
  const [promptName, setPromptName] = useState<string>('Untitled Prompt')
  const [mode, setMode] = useState<'single' | 'compare'>('single')
  
  const [systemPrompt, setSystemPrompt] = useState('')
  const [userPrompt, setUserPrompt] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [provider1, setProvider1] = useState('OpenAI')
  const [model1, setModel1] = useState('GPT-4o')
  
  const [provider2, setProvider2] = useState('Anthropic')
  const [model2, setModel2] = useState('Claude 3.5 Sonnet')
  
  const [temperature, setTemperature] = useState('0.7')
  const [maxTokens, setMaxTokens] = useState('2048')
  
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [jsonSchema, setJsonSchema] = useState('')
  const [isSchemaEnabled, setIsSchemaEnabled] = useState(false)
  
  const [isExecuting, setIsExecuting] = useState(false)
  const [output1, setOutput1] = useState('')
  const [output2, setOutput2] = useState('')
  
  const [metrics1, setMetrics1] = useState({ latency: 0, inputTokens: 0, outputTokens: 0, cost: 0 })
  const [metrics2, setMetrics2] = useState({ latency: 0, inputTokens: 0, outputTokens: 0, cost: 0 })
  const [history, setHistory] = useState<RunHistoryItem[]>([])
  const [loadingPrompts, setLoadingPrompts] = useState(true)

  // New feature states
  const [topP, setTopP] = useState('1.0')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({ message: '', type: 'success', visible: false })
  const toastTimeout = useRef<NodeJS.Timeout | null>(null)
  const [historyFilterByPrompt, setHistoryFilterByPrompt] = useState(false)

  // Fetch prompts on mount
  useEffect(() => {
    fetchPrompts()
    fetchHistory()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!isExecuting && (systemPrompt || userPrompt)) handleExecute()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSavePrompt()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        handleNewPrompt()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const showToast = (message: string, type: 'success' | 'error') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current)
    setToast({ message, type, visible: true })
    toastTimeout.current = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000)
  }

  const fetchPrompts = async () => {
    try {
      setLoadingPrompts(true)
      const res = await fetch(`${API_BASE_URL}/api/py/prompt-playground/prompts`)
      if (res.ok) {
        const data = await res.json()
        setPrompts(data)
        if (data.length > 0 && !activePromptId) {
          handleLoadPrompt(data[0])
        }
      }
    } catch (err) {
      console.error('Error fetching prompts:', err)
    } finally {
      setLoadingPrompts(false)
    }
  }

  const fetchHistory = async (filterByPrompt?: boolean) => {
    try {
      const useFilter = filterByPrompt ?? historyFilterByPrompt
      const url = useFilter && activePromptId
        ? `${API_BASE_URL}/api/py/prompt-playground/history?prompt_id=${activePromptId}`
        : `${API_BASE_URL}/api/py/prompt-playground/history`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    }
  }

  // Extract variables via regex {{var}}
  const extractedVariables = useMemo(() => {
    const regex = /{{([^}]+)}}/g
    const matches = Array.from(`${systemPrompt} ${userPrompt}`.matchAll(regex))
    return Array.from(new Set(matches.map(m => m[1].trim())))
  }, [systemPrompt, userPrompt])

  const handleLoadPrompt = (prompt: SavedPrompt) => {
    setActivePromptId(prompt.id)
    setPromptName(prompt.name)
    setSystemPrompt(prompt.system_prompt || '')
    setUserPrompt(prompt.user_prompt || '')
    setVariables({})
    setOutput1('')
    setOutput2('')
    setMetrics1({ latency: 0, inputTokens: 0, outputTokens: 0, cost: 0 })
    setMetrics2({ latency: 0, inputTokens: 0, outputTokens: 0, cost: 0 })
  }

  const handleNewPrompt = () => {
    setActivePromptId(null)
    setPromptName('New Prompt Draft')
    setSystemPrompt('')
    setUserPrompt('')
    setVariables({})
    setOutput1('')
    setOutput2('')
    setMetrics1({ latency: 0, inputTokens: 0, outputTokens: 0, cost: 0 })
    setMetrics2({ latency: 0, inputTokens: 0, outputTokens: 0, cost: 0 })
  }

  const handleDeletePrompt = async (promptId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this prompt and all its versions?')) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/py/prompt-playground/prompts/${promptId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        if (activePromptId === promptId) handleNewPrompt()
        fetchPrompts()
        fetchHistory()
        showToast('Prompt deleted', 'success')
      }
    } catch (err) {
      showToast('Failed to delete prompt', 'error')
    }
  }

  const handleUpdatePromptMeta = async (promptId: string, updates: { name?: string; section?: string; tags?: string[]; is_favorite?: boolean }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/py/prompt-playground/prompts/${promptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (res.ok) fetchPrompts()
    } catch (err) {
      showToast('Failed to update prompt', 'error')
    }
  }

  const handleToggleFavorite = async (promptId: string, currentFav: boolean, e: React.MouseEvent) => {
    e.stopPropagation()
    await handleUpdatePromptMeta(promptId, { is_favorite: !currentFav })
  }

  const handleClonePrompt = async () => {
    if (!activePromptId) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/py/prompt-playground/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Copy of ${promptName}`,
          section: 'My Prompts',
          tags: ['Cloned'],
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
          default_provider: provider1,
          default_model: model1,
        })
      })
      if (res.ok) {
        const newPrompt = await res.json()
        fetchPrompts()
        setActivePromptId(newPrompt.id)
        setPromptName(`Copy of ${promptName}`)
        showToast('Prompt cloned', 'success')
      }
    } catch (err) {
      showToast('Failed to clone prompt', 'error')
    }
  }

  const handleReplayHistory = (run: RunHistoryItem) => {
    handleModelSelect(run.model, 1)
    setOutput1(run.output_text || '')
    setMetrics1({
      latency: run.latency_ms / 1000,
      inputTokens: run.input_tokens,
      outputTokens: run.output_tokens,
      cost: run.estimated_cost_usd
    })
    showToast(`Loaded run from ${run.provider} • ${run.model}`, 'success')
  }

  const handleSavePrompt = async () => {
    try {
      if (activePromptId) {
        const res = await fetch(`${API_BASE_URL}/api/py/prompt-playground/prompts/${activePromptId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_prompt: systemPrompt,
            user_prompt: userPrompt,
            provider: provider1,
            model: model1,
          })
        })
        if (res.ok) {
          fetchPrompts()
          showToast('Version saved', 'success')
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/api/py/prompt-playground/prompts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: promptName,
            section: 'My Prompts',
            tags: ['Draft'],
            system_prompt: systemPrompt,
            user_prompt: userPrompt,
            default_provider: provider1,
            default_model: model1,
          })
        })
        if (res.ok) {
          const newPrompt = await res.json()
          fetchPrompts()
          setActivePromptId(newPrompt.id)
          showToast('Prompt created', 'success')
        }
      }
    } catch (err) {
      showToast('Failed to save prompt', 'error')
    }
  }

  const handleExecute = async () => {
    setIsExecuting(true)
    setOutput1('')
    setOutput2('')
    
    try {
      if (mode === 'single') {
        const payload = {
          prompt_id: activePromptId,
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
          variables: variables,
          model_config: {
            provider: provider1,
            model: model1,
            temperature: parseFloat(temperature),
            max_tokens: parseInt(maxTokens, 10),
            top_p: parseFloat(topP),
            json_mode: isSchemaEnabled,
            json_schema: isSchemaEnabled ? jsonSchema : undefined,
          }
        }

        const res = await fetch(`${API_BASE_URL}/api/py/prompt-playground/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (res.ok && res.body) {
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let done = false
          while (!done) {
            const { value, done: doneReading } = await reader.read()
            done = doneReading
            if (value) {
              const chunk = decoder.decode(value, { stream: true })
              const events = chunk.split('\n\n')
              for (const event of events) {
                if (event.startsWith('data: ')) {
                  const dataStr = event.slice(6)
                  if (dataStr === '[DONE]') break
                  try {
                    const parsed = JSON.parse(dataStr)
                    if (parsed.type === 'token') {
                      setOutput1(prev => prev + parsed.content)
                    } else if (parsed.type === 'metrics') {
                      setMetrics1({
                        latency: parsed.latency_ms / 1000,
                        inputTokens: parsed.input_tokens,
                        outputTokens: parsed.output_tokens,
                        cost: parsed.estimated_cost_usd
                      })
                    } else if (parsed.type === 'error') {
                      showToast(parsed.message, 'error')
                    }
                  } catch (e) {
                    // Ignore parse errors from partial chunks
                  }
                }
              }
            }
          }
        } else {
          showToast('Failed to execute prompt', 'error')
        }
      } else {
        // Compare Mode across multiple models
        const payload = {
          prompt_id: activePromptId,
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
          variables: variables,
          models: [
            {
              provider: provider1,
              model: model1,
              temperature: parseFloat(temperature),
              max_tokens: parseInt(maxTokens, 10),
            },
            {
              provider: provider2,
              model: model2,
              temperature: parseFloat(temperature),
              max_tokens: parseInt(maxTokens, 10),
            }
          ]
        }

        const res = await fetch(`${API_BASE_URL}/api/py/prompt-playground/compare`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (res.ok) {
          const data = await res.json()
          const [res1, res2] = data.results
          if (res1) {
            setOutput1(res1.output_text)
            setMetrics1({
              latency: res1.metrics.latency_ms / 1000,
              inputTokens: res1.metrics.input_tokens,
              outputTokens: res1.metrics.output_tokens,
              cost: res1.metrics.estimated_cost_usd
            })
          }
          if (res2) {
            setOutput2(res2.output_text)
            setMetrics2({
              latency: res2.metrics.latency_ms / 1000,
              inputTokens: res2.metrics.input_tokens,
              outputTokens: res2.metrics.output_tokens,
              cost: res2.metrics.estimated_cost_usd
            })
          }
        }
      }
      fetchHistory()
    } catch (err) {
      console.error('Execution error:', err)
    } finally {
      setIsExecuting(false)
    }
  }

  const SECTIONS = ['My Prompts', 'Team Prompts', 'Templates', 'Favorites'] as const

  const filteredPrompts = prompts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.tags && p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
  )

  const handleModelSelect = (val: string, target: 1 | 2) => {
    let matchedProvider = 'OpenAI'
    for (const p of PROVIDERS) {
      if (p.models.includes(val)) {
        matchedProvider = p.name
        break
      }
    }
    if (target === 1) {
      setModel1(val)
      setProvider1(matchedProvider)
    } else {
      setModel2(val)
      setProvider2(matchedProvider)
    }
  }

  const activePrompt = prompts.find(p => p.id === activePromptId)

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#0a0a0a] text-white">
      {/* Toast Notification */}
      <div className={cn('absolute left-1/2 top-4 z-50 -translate-x-1/2 transition-all duration-300', toast.visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-4 opacity-0')}>
        <div className={cn(
          'flex items-center gap-2 rounded-full border bg-[#111113]/95 py-2 pl-3 pr-2 text-[13px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl',
          toast.type === 'success' ? 'border-emerald-400/20 text-emerald-300' : 'border-red-400/20 text-red-300'
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.message}
          <button onClick={() => setToast(p => ({ ...p, visible: false }))} className="ml-1 rounded-full p-1 text-gray-500 hover:bg-white/10 hover:text-white">
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      <ModuleHeader
        index="M.03"
        section="Prompting"
        title="Prompt"
        accent="Playground"
        description="Version, compare and benchmark prompts across providers"
        actions={
          <>
            <span className="hidden items-center gap-1.5 text-[11px] text-gray-500 xl:flex">
              <Kbd>⌘↵</Kbd> run <Kbd>⌘S</Kbd> save <Kbd>⌘N</Kbd> new
            </span>
            <SegmentTabs
              value={mode}
              onChange={setMode}
              tabs={[
                { id: 'single', label: 'Single Run' },
                { id: 'compare', label: 'Compare' },
              ]}
            />
          </>
        }
      />

      <div className="flex min-h-0 flex-1">
        {/* LEFT SIDEBAR: Library */}
        <div className="flex w-64 shrink-0 flex-col border-r border-white/[0.06] bg-[#070708]">
          <div className="space-y-3 border-b border-white/[0.06] p-4">
            <MonoLabel index="01">Library</MonoLabel>
            <div className="ws-field flex h-9 items-center gap-2 px-3">
              <Search className="h-3.5 w-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-[13px] text-white placeholder-gray-600 outline-none"
              />
            </div>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {loadingPrompts ? (
              <div className="flex items-center justify-center p-6 font-mono text-[11px] uppercase tracking-wider text-gray-500">
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-[#ffc285]" /> Loading library...
              </div>
            ) : (
              SECTIONS.map(section => {
                const sectionPrompts = filteredPrompts.filter(p => p.section === section)
                if (sectionPrompts.length === 0 && searchQuery) return null

                return (
                  <Accordion key={section} type="single" collapsible defaultValue={section === 'My Prompts' ? section : undefined}>
                    <AccordionItem value={section} className="border-0">
                      <AccordionTrigger className="rounded-lg px-2 py-2 text-gray-500 hover:bg-white/[0.03] hover:text-white hover:no-underline [&>svg]:h-3.5 [&>svg]:w-3.5">
                        <span className="flex items-center gap-2 font-mono text-[10.5px] font-normal uppercase tracking-[0.14em]">
                          {section}
                          <span className="text-gray-700">{sectionPrompts.length}</span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="px-0 pb-2">
                        <div className="mt-0.5 space-y-1">
                          {sectionPrompts.map(prompt => {
                            const isActive = activePromptId === prompt.id
                            return (
                              <div
                                key={prompt.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleLoadPrompt(prompt)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLoadPrompt(prompt) }}
                                className={cn(
                                  'group/card relative flex w-full cursor-pointer flex-col gap-2 overflow-hidden rounded-xl border p-3 text-left transition-colors',
                                  isActive ? 'border-[#ff7a17]/30 bg-[#ff7a17]/[0.05]' : 'border-transparent hover:border-white/[0.06] hover:bg-white/[0.03]'
                                )}
                              >
                                {isActive && <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-[#ff7a17]" />}
                                <div className="flex items-start justify-between gap-2">
                                  <span className={cn('flex-1 text-[13px] leading-tight', isActive ? 'text-white' : 'text-gray-300')}>{prompt.name}</span>
                                  <div className="flex shrink-0 items-center gap-0.5">
                                    <button
                                      onClick={(e) => handleToggleFavorite(prompt.id, !!prompt.is_favorite, e)}
                                      className={cn(
                                        'rounded-md p-1 transition-opacity hover:bg-white/[0.06]',
                                        prompt.is_favorite ? 'text-[#ffc285] opacity-100' : 'text-gray-500 opacity-0 hover:text-[#ffc285] group-hover/card:opacity-100'
                                      )}
                                      title={prompt.is_favorite ? "Remove favorite" : "Add to favorites"}
                                    >
                                      <Heart className={cn('h-3 w-3', prompt.is_favorite && 'fill-current')} />
                                    </button>
                                    <button
                                      onClick={(e) => handleDeletePrompt(prompt.id, e)}
                                      className="rounded-md p-1 text-gray-500 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-300 group-hover/card:opacity-100"
                                      title="Delete prompt"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className={cn(
                                    'rounded-full border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider',
                                    prompt.status === 'Published' ? 'border-emerald-400/20 text-emerald-300/80' : 'border-[#ff7a17]/25 text-[#ffc285]'
                                  )}>
                                    {prompt.status}
                                  </span>
                                  {prompt.tags && prompt.tags.map(tag => (
                                    <span key={tag} className="rounded-full bg-white/[0.04] px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-gray-500">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                          {sectionPrompts.length === 0 && (
                            <div className="px-3 py-2 text-[12px] text-gray-600">No prompts found</div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )
              })
            )}
          </div>

          <div className="border-t border-white/[0.06] p-3">
            <button onClick={handleNewPrompt} className={cn(ui.btnOutline, 'h-9 w-full')}>
              <Plus className="h-3.5 w-3.5" /> New Prompt
            </button>
          </div>
        </div>

        {/* CENTER PANEL: Playground */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Prompt toolbar */}
          <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <input
                type="text"
                value={promptName}
                onChange={e => setPromptName(e.target.value)}
                onBlur={() => {
                  if (activePromptId && promptName.trim()) {
                    handleUpdatePromptMeta(activePromptId, { name: promptName.trim() })
                  }
                }}
                className="w-full min-w-0 truncate rounded-lg border border-transparent bg-transparent px-2 py-1 text-[17px] tracking-tight text-white transition-colors hover:border-white/[0.08] focus:border-[#ff7a17]/40 focus:outline-none"
              />
              {activePromptId && (
                <span className={cn(ui.chip, 'shrink-0')}>
                  <GitBranch className="h-3 w-3 text-[#ffc285]" />
                  v{activePrompt?.latest_version || 1}
                </span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {activePromptId && (
                <button onClick={handleClonePrompt} className={ui.btnOutline}>
                  <Copy className="h-3.5 w-3.5" /> Clone
                </button>
              )}
              <button onClick={handleSavePrompt} className={ui.btnOutline}>
                <Save className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{activePromptId ? 'Save Version' : 'Save Draft'}</span><span className="sm:hidden">Save</span>
              </button>
            </div>
          </div>

          {/* Workspace Area */}
          <div className="flex flex-1 flex-col overflow-hidden">

            {/* TOP HALF: Prompts Column */}
            <div className="flex flex-1 overflow-hidden">
              <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
                {/* System Prompt */}
                <div className="flex flex-col">
                  <MonoLabel index="02" className="mb-2.5">System prompt</MonoLabel>
                  <textarea
                    value={systemPrompt}
                    onChange={e => setSystemPrompt(e.target.value)}
                    placeholder="You are a helpful assistant..."
                    className="ws-field h-28 w-full resize-y p-4 font-mono text-[13px] leading-relaxed"
                  />
                </div>

                {/* User Prompt */}
                <div className="flex flex-1 flex-col">
                  <MonoLabel index="03" className="mb-2.5">User prompt</MonoLabel>
                  <textarea
                    value={userPrompt}
                    onChange={e => setUserPrompt(e.target.value)}
                    placeholder="Enter your instructions here. Use {{variable}} syntax for dynamic inputs."
                    className="ws-field h-full min-h-[140px] w-full resize-none p-4 font-mono text-[13px] leading-relaxed"
                  />
                </div>
              </div>

              {/* Variables */}
              {extractedVariables.length > 0 && (
                <div className="w-1/3 min-w-[240px] overflow-y-auto border-l border-white/[0.06] bg-[#070708] p-6">
                  <MonoLabel index="◆" className="mb-4">Variables · {extractedVariables.length}</MonoLabel>
                  <div className="space-y-4">
                    {extractedVariables.map(v => (
                      <div key={v} className="flex flex-col gap-1.5">
                        <label className="font-mono text-[12px] text-[#ffc285]">{`{{${v}}}`}</label>
                        <input
                          type="text"
                          value={variables[v] || ''}
                          onChange={e => setVariables(prev => ({ ...prev, [v]: e.target.value }))}
                          placeholder={`Value for ${v}`}
                          className="ws-field h-9 w-full px-3 text-[13px]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Middle Action Bar */}
            <div className="flex h-14 shrink-0 items-center justify-between border-y border-white/[0.06] bg-[#070708] px-6">
              <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-gray-500">
                <StatusDot tone={isExecuting ? 'live' : 'idle'} />
                {isExecuting ? 'Executing…' : extractedVariables.length > 0 ? `${extractedVariables.length} variable(s) detected` : 'Ready to execute'}
              </span>
              <button
                onClick={handleExecute}
                disabled={isExecuting || (!systemPrompt && !userPrompt)}
                className={cn(ui.btnPrimary, 'h-9 px-6')}
              >
                {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-3.5 w-3.5 fill-current" /> Run</>}
              </button>
            </div>

            {/* BOTTOM HALF: Outputs Column */}
            <div className={cn('flex flex-1 overflow-hidden', mode === 'compare' ? 'flex-row' : 'flex-col')}>
              <OutputPane
                tag={mode === 'compare' ? 'A' : undefined}
                model={model1}
                onModelChange={val => handleModelSelect(val, 1)}
                output={output1}
                metrics={metrics1}
                isExecuting={isExecuting}
                loadingText="Generating completion..."
                className={mode === 'compare' ? 'w-1/2 border-r border-white/[0.06]' : 'w-full'}
              />
              {/* Model 2 Output (Compare Mode Only) */}
              {mode === 'compare' && (
                <OutputPane
                  tag="B"
                  model={model2}
                  onModelChange={val => handleModelSelect(val, 2)}
                  output={output2}
                  metrics={metrics2}
                  isExecuting={isExecuting}
                  loadingText="Generating comparison..."
                  className="w-1/2"
                />
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: Settings & Tools */}
        <div className="flex w-80 shrink-0 flex-col border-l border-white/[0.06] bg-[#070708]">
          <Tabs defaultValue="settings" className="flex h-full w-full flex-col">
            <TabsList className="h-12 w-full justify-start gap-0 rounded-none border-0 border-b border-white/[0.06] bg-transparent p-0">
              {[
                { v: 'settings', icon: Settings2, label: 'Params' },
                { v: 'schema', icon: Code2, label: 'Schema' },
                { v: 'history', icon: History, label: 'History' },
              ].map(t => (
                <TabsTrigger
                  key={t.v}
                  value={t.v}
                  className="relative h-full flex-1 rounded-none border-0 font-mono text-[10.5px] uppercase tracking-[0.14em] text-gray-500 after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-[#ff7a17] after:opacity-0 after:transition-opacity data-[state=active]:border-0 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:after:opacity-100"
                >
                  <t.icon className="mr-1.5 h-3.5 w-3.5" /> {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="settings" className="m-0 flex-1 overflow-y-auto p-6 outline-none">
              <div className="space-y-7">
                {[
                  { label: 'Temperature', value: temperature, set: setTemperature, min: '0', max: '2', step: '0.1' },
                  { label: 'Max Tokens', value: maxTokens, set: setMaxTokens, min: '256', max: '8192', step: '256' },
                  { label: 'Top P', value: topP, set: setTopP, min: '0', max: '1', step: '0.05' },
                ].map(p => (
                  <div key={p.label} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] text-gray-300">{p.label}</label>
                      <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] tabular-nums text-[#ffc285]">{p.value}</span>
                    </div>
                    <input
                      type="range" min={p.min} max={p.max} step={p.step}
                      value={p.value}
                      onChange={e => p.set(e.target.value)}
                      className="ws-range w-full"
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="schema" className="m-0 flex flex-1 flex-col overflow-y-auto p-6 outline-none">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[13px] text-gray-300">Enable JSON Schema</span>
                <button
                  onClick={() => setIsSchemaEnabled(!isSchemaEnabled)}
                  className={cn('relative h-5 w-9 rounded-full border transition-colors', isSchemaEnabled ? 'border-[#ff7a17]/60 bg-[#ff7a17]' : 'border-white/10 bg-white/[0.06]')}
                  aria-pressed={isSchemaEnabled}
                  aria-label="Toggle JSON schema"
                >
                  <span className={cn('absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all', isSchemaEnabled ? 'left-[18px] bg-white' : 'left-0.5 bg-gray-500')} />
                </button>
              </div>
              {isSchemaEnabled && (
                <div className="flex flex-1 flex-col">
                  <p className="mb-3 text-[12.5px] text-gray-500">Define the expected output structure using JSON Schema.</p>
                  <textarea
                    value={jsonSchema}
                    onChange={e => setJsonSchema(e.target.value)}
                    placeholder='{&#10;  "type": "object",&#10;  "properties": {&#10;    "name": { "type": "string" }&#10;  }&#10;}'
                    className="ws-field w-full flex-1 resize-none p-3 font-mono text-[12px]"
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="m-0 flex-1 overflow-y-auto p-0 outline-none">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#070708]/95 px-4 py-3 backdrop-blur">
                <span className={ui.mono}>Recent runs · {history.length}</span>
                <button
                  onClick={() => {
                    setHistoryFilterByPrompt(!historyFilterByPrompt)
                    fetchHistory(!historyFilterByPrompt)
                  }}
                  title="Filter by Active Prompt"
                  className={cn('rounded-full p-1.5 transition-colors', historyFilterByPrompt ? 'bg-[#ff7a17] text-black' : 'text-gray-500 hover:bg-white/[0.06] hover:text-white')}
                >
                  <Filter className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="divide-y divide-white/[0.05]">
                {history.map(run => (
                  <div key={run.id} className="group cursor-pointer px-4 py-3.5 transition-colors hover:bg-white/[0.03]">
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <span className="truncate text-[12.5px] text-gray-200">{run.provider} · {run.model}</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="font-mono text-[10px] text-gray-600">{new Date(run.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleReplayHistory(run); }} className="rounded-full p-1 text-gray-500 opacity-0 transition-all hover:bg-white/[0.08] hover:text-[#ffc285] group-hover:opacity-100" title="Load this run">
                          <Play className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[10.5px] text-gray-500">
                      <span className={cn('flex items-center gap-1.5', run.status === 'Success' ? 'text-emerald-300/80' : 'text-red-300')}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', run.status === 'Success' ? 'bg-emerald-400' : 'bg-red-400')} />
                        {run.status}
                      </span>
                      <span>{(run.latency_ms / 1000).toFixed(1)}s</span>
                      <span>${run.estimated_cost_usd.toFixed(4)}</span>
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="p-6 text-center text-[12.5px] text-gray-600">No execution history recorded</div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// OutputPane — model picker + streamed output + run metrics
// ---------------------------------------------------------------------------
function OutputPane({
  tag, model, onModelChange, output, metrics, isExecuting, loadingText, className,
}: {
  tag?: string
  model: string
  onModelChange: (val: string) => void
  output: string
  metrics: { latency: number; inputTokens: number; outputTokens: number; cost: number }
  isExecuting: boolean
  loadingText: string
  className?: string
}) {
  return (
    <div className={cn('flex h-full min-w-0 flex-col', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {tag && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#ff7a17]/15 font-mono text-[10px] text-[#ffc285]">{tag}</span>}
          <Select value={model} onValueChange={onModelChange}>
            <SelectTrigger className="h-8 w-auto max-w-[300px] gap-2 rounded-full border-white/[0.08] bg-white/[0.02] px-3 font-mono text-[12px] text-white ring-offset-0 focus:ring-0 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-white/10 bg-[#111113] text-white">
              {PROVIDERS.map(p => (
                <SelectGroup key={p.name}>
                  <div className="px-2 pb-1 pt-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-gray-600">{p.name}</div>
                  {p.models.map(m => <SelectItem key={m} value={m} className="rounded-lg font-mono text-[12px] focus:bg-white/[0.06]">{m}</SelectItem>)}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
        {output && (
          <button className={ui.iconBtn} onClick={() => navigator.clipboard.writeText(output)} title="Copy output">
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto whitespace-pre-wrap p-6 font-mono text-[13px] leading-relaxed text-gray-300">
        {isExecuting ? (
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin text-[#ffc285]" /> {loadingText}
          </div>
        ) : output ? output : <span className="text-gray-600">Output will appear here...</span>}
      </div>
      {output && !isExecuting && (
        <div className="flex flex-wrap gap-1.5 border-t border-white/[0.06] px-5 py-2.5">
          <span className={ui.chip}>{metrics.latency.toFixed(2)}s</span>
          <span className={ui.chip}>{metrics.inputTokens} in / {metrics.outputTokens} out</span>
          <span className={ui.chip}>est. ${metrics.cost.toFixed(4)}</span>
        </div>
      )}
    </div>
  )
}
