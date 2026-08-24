'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
export const dynamic = 'force-dynamic'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
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
import { Loader2, Copy, Save, Search, Play, Settings2, History, Code2, Plus, Trash2, ArrowRight, Heart, GitBranch, X, AlertCircle, CheckCircle2, Filter } from 'lucide-react'

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

const ALL_MODELS = PROVIDERS.flatMap(p => p.models)

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

  return (
    <div className="flex h-full bg-[#0a0a0a] text-white overflow-hidden relative">
      {/* Toast Notification */}
      <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border text-sm font-medium ${
          toast.type === 'success' ? 'bg-[#1a1c20] border-green-500/20 text-green-400' : 'bg-[#1a1c20] border-red-500/20 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
          <button onClick={() => setToast(p => ({ ...p, visible: false }))} className="ml-2 text-[#7d8187] hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      {/* LEFT SIDEBAR: Library */}
      <div className="w-64 border-r border-[#212327] flex flex-col bg-[#0a0a0a] shrink-0">
        <div className="p-4 border-b border-[#212327]">
          <h2 className="font-mono text-[14px] tracking-[1.4px] uppercase text-white mb-4">Library</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7d8187]" />
            <input 
              type="text" 
              placeholder="Search prompts..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1a1c20] border border-[#212327] rounded-sm py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-[#7d8187] transition-colors text-white"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingPrompts ? (
            <div className="flex items-center justify-center p-6 text-xs text-[#7d8187]">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading library...
            </div>
          ) : (
            SECTIONS.map(section => {
              const sectionPrompts = filteredPrompts.filter(p => p.section === section)
              if (sectionPrompts.length === 0 && searchQuery) return null
              
              return (
                <Accordion key={section} type="single" collapsible defaultValue={section === 'My Prompts' ? section : undefined}>
                  <AccordionItem value={section} className="border-0">
                    <AccordionTrigger className="py-2 px-2 hover:no-underline hover:bg-[#1a1c20] rounded-sm transition-colors">
                      <span className="font-mono text-[12px] tracking-[1.2px] text-[#7d8187] uppercase">{section}</span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-1">
                      <div className="space-y-1 mt-1">
                        {sectionPrompts.map(prompt => (
                          <div
                            key={prompt.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleLoadPrompt(prompt)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLoadPrompt(prompt) }}
                            className={`group/card w-full text-left p-3 rounded-sm transition-colors flex flex-col gap-2 cursor-pointer ${
                              activePromptId === prompt.id ? 'bg-[#1a1c20] border border-[#212327]' : 'hover:bg-[#1a1c20] border border-transparent'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-medium leading-tight flex-1">{prompt.name}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-sm uppercase font-mono tracking-wider ${
                                  prompt.status === 'Published' ? 'bg-[#1a1c20] text-[#7d8187] border border-[#212327]' : 'bg-[#ff7a17]/10 text-[#ff7a17] border border-[#ff7a17]/20'
                                }`}>
                                  {prompt.status}
                                </span>
                                <button
                                  onClick={(e) => handleToggleFavorite(prompt.id, !!prompt.is_favorite, e)}
                                  className={`opacity-0 group-hover/card:opacity-100 transition-opacity p-1 rounded-sm hover:bg-[#1a1c20] ${
                                    prompt.is_favorite ? 'text-pink-500 opacity-100' : 'text-[#7d8187] hover:text-pink-400'
                                  }`}
                                  title={prompt.is_favorite ? "Remove favorite" : "Add to favorites"}
                                >
                                  <Heart className={`w-3 h-3 ${prompt.is_favorite ? 'fill-current' : ''}`} />
                                </button>
                                <button
                                  onClick={(e) => handleDeletePrompt(prompt.id, e)}
                                  className="opacity-0 group-hover/card:opacity-100 transition-opacity p-1 rounded-sm hover:bg-red-500/20 text-[#7d8187] hover:text-red-400"
                                  title="Delete prompt"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {prompt.tags && prompt.tags.map(tag => (
                                <span key={tag} className="text-[10px] text-[#7d8187] bg-[#1a1c20] px-1.5 py-0.5 rounded-sm">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                        {sectionPrompts.length === 0 && (
                          <div className="px-2 py-3 text-xs text-[#7d8187] italic">No prompts found</div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )
            })
          )}
        </div>
        
        <div className="p-4 border-t border-[#212327]">
          <Button 
            onClick={handleNewPrompt}
            className="w-full rounded-full bg-transparent border border-white/25 hover:border-white text-white font-normal text-sm h-10"
          >
            <Plus className="w-4 h-4 mr-2" /> New Prompt
          </Button>
        </div>
      </div>

      {/* CENTER PANEL: Playground */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 border-b border-[#212327] flex items-center justify-between px-6 bg-[#0a0a0a]">
          <div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
            <input 
              type="text"
              value={promptName}
              onChange={e => setPromptName(e.target.value)}
              onBlur={() => {
                if (activePromptId && promptName.trim()) {
                  handleUpdatePromptMeta(activePromptId, { name: promptName.trim() })
                }
              }}
              className="text-lg font-normal bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-[#7d8187] rounded px-1 text-white w-full min-w-0 truncate"
            />
            {activePromptId && (
              <span className="text-xs text-[#7d8187] font-mono tracking-wider shrink-0 whitespace-nowrap">
                VERSION {prompts.find(p => p.id === activePromptId)?.latest_version || 1}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#7d8187] mr-2 whitespace-nowrap hidden xl:inline">⌘S to Save</span>
              {activePromptId && (
                <Button variant="outline" size="sm" onClick={handleClonePrompt} className="bg-transparent border-[#212327] hover:bg-[#1a1c20] hover:text-white h-8 shrink-0">
                  <GitBranch className="w-4 h-4 mr-2" /> Clone
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleSavePrompt} className="bg-transparent border-[#212327] hover:bg-[#1a1c20] hover:text-white h-8 shrink-0">
                <Save className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">{activePromptId ? 'Save Version' : 'Save Draft'}</span><span className="sm:hidden">Save</span>
              </Button>
            </div>

            <div className="flex items-center bg-[#1a1c20] p-1 rounded-full border border-[#212327] shrink-0">
              <button 
                onClick={() => setMode('single')}
                className={`px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap ${mode === 'single' ? 'bg-[#363a3f] text-white' : 'text-[#7d8187] hover:text-white'}`}
              >
                Single Run
              </button>
              <button 
                onClick={() => setMode('compare')}
                className={`px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap ${mode === 'compare' ? 'bg-[#363a3f] text-white' : 'text-[#7d8187] hover:text-white'}`}
              >
                Compare
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* TOP HALF: Prompts Column */}
          <div className="flex-1 flex overflow-hidden bg-[#0a0a0a]">
            
            <div className="flex-1 flex flex-col overflow-y-auto">
              {/* System Prompt */}
              <div className="p-6 border-b border-[#212327] flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-mono text-[14px] tracking-[1.4px] uppercase text-[#7d8187]">System Prompt</span>
                </div>
                <textarea
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  placeholder="You are a helpful assistant..."
                  className="w-full h-32 bg-[#1a1c20] border border-[#212327] rounded-sm p-4 text-sm font-mono focus:outline-none focus:border-[#7d8187] resize-y placeholder:text-[#7d8187] text-white"
                />
              </div>

              {/* User Prompt */}
              <div className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-mono text-[14px] tracking-[1.4px] uppercase text-[#7d8187]">User Prompt</span>
                </div>
                <textarea
                  value={userPrompt}
                  onChange={e => setUserPrompt(e.target.value)}
                  placeholder="Enter your instructions here. Use {{variable}} syntax for dynamic inputs."
                  className="w-full h-full min-h-[160px] bg-[#1a1c20] border border-[#212327] rounded-sm p-4 text-sm font-mono focus:outline-none focus:border-[#7d8187] resize-none placeholder:text-[#7d8187] text-white"
                />
              </div>
            </div>

            {/* Variables */}
            {extractedVariables.length > 0 && (
              <div className="w-1/3 min-w-[250px] border-l border-[#212327] p-6 bg-[#0a0a0a] overflow-y-auto">
                <span className="font-mono text-[14px] tracking-[1.4px] uppercase text-[#7d8187] mb-4 block">Variables</span>
                <div className="space-y-4">
                  {extractedVariables.map(v => (
                    <div key={v} className="flex flex-col gap-1.5">
                      <label className="text-xs text-[#dadbdf] font-mono">{v}</label>
                      <input 
                        type="text"
                        value={variables[v] || ''}
                        onChange={e => setVariables(prev => ({...prev, [v]: e.target.value}))}
                        placeholder={`Value for ${v}`}
                        className="w-full bg-[#1a1c20] border border-[#212327] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#7d8187] text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Middle Action Bar */}
          <div className="h-14 border-y border-[#212327] flex items-center justify-between px-6 bg-[#0a0a0a] shrink-0">
            <div className="flex items-center gap-4">
               <span className="text-xs text-[#7d8187]">
                 {extractedVariables.length > 0 ? `${extractedVariables.length} variable(s) detected` : 'Ready to execute'}
               </span>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleExecute}
                size="sm"
                disabled={isExecuting || (!systemPrompt && !userPrompt)}
                className="rounded-full bg-white text-black hover:bg-[#fafaf7] px-8 h-8"
              >
                {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4 mr-2" /> Run</>}
              </Button>
            </div>
          </div>

          {/* BOTTOM HALF: Outputs Column */}
          <div className={`flex-1 flex ${mode === 'compare' ? 'flex-row' : 'flex-col'} overflow-hidden bg-[#0a0a0a]`}>
            
            {/* Model 1 Output */}
            <div className={`flex flex-col h-full ${mode === 'compare' ? 'w-1/2 border-r border-[#212327]' : 'w-full'}`}>
              <div className="p-4 border-b border-[#212327] flex justify-between items-center bg-[#1a1c20]/30">
                <Select value={model1} onValueChange={val => handleModelSelect(val, 1)}>
                  <SelectTrigger className="w-[280px] bg-transparent border-0 font-mono text-[14px] text-white focus:ring-0 p-0 h-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#191919] border-[#212327] text-white">
                    {ALL_MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                {output1 && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-[#7d8187] hover:text-white" onClick={() => navigator.clipboard.writeText(output1)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <div className="flex-1 p-6 overflow-y-auto font-mono text-sm text-[#dadbdf] whitespace-pre-wrap">
                {isExecuting ? (
                  <div className="flex items-center gap-3 text-[#7d8187]">
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating completion...
                  </div>
                ) : output1 ? output1 : <span className="text-[#7d8187]">Output will appear here...</span>}
              </div>
              {/* Metrics 1 */}
              {output1 && !isExecuting && (
                <div className="p-3 border-t border-[#212327] bg-[#1a1c20]/30 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-mono text-[#7d8187]">
                  <span className="whitespace-nowrap">{metrics1.latency.toFixed(2)}s</span>
                  <span className="whitespace-nowrap">{metrics1.inputTokens} In / {metrics1.outputTokens} Out</span>
                  <span className="whitespace-nowrap">Est. ${metrics1.cost.toFixed(4)}</span>
                </div>
              )}
            </div>

            {/* Model 2 Output (Compare Mode Only) */}
            {mode === 'compare' && (
              <div className="w-1/2 flex flex-col h-full bg-[#0a0a0a]">
                <div className="p-4 border-b border-[#212327] flex justify-between items-center bg-[#1a1c20]/30">
                  <Select value={model2} onValueChange={val => handleModelSelect(val, 2)}>
                    <SelectTrigger className="w-[280px] bg-transparent border-0 font-mono text-[14px] text-white focus:ring-0 p-0 h-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#191919] border-[#212327] text-white">
                      {ALL_MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {output2 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-[#7d8187] hover:text-white" onClick={() => navigator.clipboard.writeText(output2)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <div className="flex-1 p-6 overflow-y-auto font-mono text-sm text-[#dadbdf] whitespace-pre-wrap">
                  {isExecuting ? (
                    <div className="flex items-center gap-3 text-[#7d8187]">
                      <Loader2 className="w-4 h-4 animate-spin" /> Generating comparison...
                    </div>
                  ) : output2 ? output2 : <span className="text-[#7d8187]">Output will appear here...</span>}
                </div>
                {/* Metrics 2 */}
                {output2 && !isExecuting && (
                  <div className="p-3 border-t border-[#212327] bg-[#1a1c20]/30 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-mono text-[#7d8187]">
                    <span className="whitespace-nowrap">{metrics2.latency.toFixed(2)}s</span>
                    <span className="whitespace-nowrap">{metrics2.inputTokens} In / {metrics2.outputTokens} Out</span>
                    <span className="whitespace-nowrap">Est. ${metrics2.cost.toFixed(4)}</span>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR: Settings & Tools */}
      <div className="w-80 border-l border-[#212327] flex flex-col bg-[#0a0a0a]">
        <Tabs defaultValue="settings" className="w-full h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b border-[#212327] bg-[#0a0a0a] p-0 h-12">
            <TabsTrigger value="settings" className="flex-1 rounded-none data-[state=active]:bg-[#1a1c20] data-[state=active]:text-white text-[#7d8187] data-[state=active]:shadow-none py-3 font-mono text-[12px] uppercase tracking-wider">
              <Settings2 className="w-3.5 h-3.5 mr-2" /> Params
            </TabsTrigger>
            <TabsTrigger value="schema" className="flex-1 rounded-none data-[state=active]:bg-[#1a1c20] data-[state=active]:text-white text-[#7d8187] data-[state=active]:shadow-none py-3 font-mono text-[12px] uppercase tracking-wider">
              <Code2 className="w-3.5 h-3.5 mr-2" /> Schema
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 rounded-none data-[state=active]:bg-[#1a1c20] data-[state=active]:text-white text-[#7d8187] data-[state=active]:shadow-none py-3 font-mono text-[12px] uppercase tracking-wider">
              <History className="w-3.5 h-3.5 mr-2" /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="flex-1 p-6 m-0 outline-none overflow-y-auto">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-xs text-[#dadbdf]">Temperature</label>
                  <span className="text-xs text-[#7d8187] font-mono">{temperature}</span>
                </div>
                <input 
                  type="range" min="0" max="2" step="0.1" 
                  value={temperature} 
                  onChange={e => setTemperature(e.target.value)}
                  className="w-full accent-white"
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-xs text-[#dadbdf]">Max Tokens</label>
                  <span className="text-xs text-[#7d8187] font-mono">{maxTokens}</span>
                </div>
                <input 
                  type="range" min="256" max="8192" step="256" 
                  value={maxTokens} 
                  onChange={e => setMaxTokens(e.target.value)}
                  className="w-full accent-white"
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-xs text-[#dadbdf]">Top P</label>
                  <span className="text-xs text-[#7d8187] font-mono">{topP}</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05" 
                  value={topP} 
                  onChange={e => setTopP(e.target.value)}
                  className="w-full accent-white"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schema" className="flex-1 p-6 m-0 outline-none overflow-y-auto flex flex-col">
             <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-white">Enable JSON Schema</span>
                <button 
                  onClick={() => setIsSchemaEnabled(!isSchemaEnabled)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${isSchemaEnabled ? 'bg-white' : 'bg-[#363a3f]'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-transform ${isSchemaEnabled ? 'left-[22px]' : 'left-0.5 bg-[#7d8187]'}`} />
                </button>
             </div>
             {isSchemaEnabled && (
               <div className="flex-1 flex flex-col">
                 <p className="text-xs text-[#7d8187] mb-3">Define the expected output structure using JSON Schema.</p>
                 <textarea
                   value={jsonSchema}
                   onChange={e => setJsonSchema(e.target.value)}
                   placeholder='{&#10;  "type": "object",&#10;  "properties": {&#10;    "name": { "type": "string" }&#10;  }&#10;}'
                   className="flex-1 w-full bg-[#1a1c20] border border-[#212327] rounded-sm p-3 text-xs font-mono text-[#dadbdf] focus:outline-none focus:border-[#7d8187] resize-none"
                 />
               </div>
             )}
          </TabsContent>

          <TabsContent value="history" className="flex-1 p-0 m-0 outline-none overflow-y-auto">
             <div className="sticky top-0 bg-[#0a0a0a] p-3 border-b border-[#212327] flex justify-between items-center z-10">
               <span className="text-xs text-[#7d8187]">Recent Runs</span>
               <button 
                 onClick={() => {
                   setHistoryFilterByPrompt(!historyFilterByPrompt)
                   fetchHistory(!historyFilterByPrompt)
                 }}
                 title="Filter by Active Prompt"
                 className={`p-1.5 rounded-sm transition-colors ${historyFilterByPrompt ? 'bg-white text-black' : 'text-[#7d8187] hover:bg-[#1a1c20] hover:text-white'}`}
               >
                 <Filter className="w-3.5 h-3.5" />
               </button>
             </div>
             <div className="divide-y divide-[#212327]">
               {history.map(run => (
                 <div key={run.id} className="p-4 hover:bg-[#1a1c20] transition-colors cursor-pointer group">
                   <div className="flex justify-between items-start mb-2">
                     <span className="text-xs text-white">{run.provider} • {run.model}</span>
                     <div className="flex items-center gap-2">
                       <span className="text-[10px] text-[#7d8187] font-mono">{new Date(run.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       <button onClick={(e) => { e.stopPropagation(); handleReplayHistory(run); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#212327] rounded-sm text-[#7d8187] hover:text-white transition-all">
                         <Play className="w-3 h-3" />
                       </button>
                     </div>
                   </div>
                   <div className="flex gap-3 text-[11px] font-mono text-[#7d8187]">
                     <span className={run.status === 'Success' ? 'text-[#ff7a17]' : 'text-red-500'}>
                       {run.status}
                     </span>
                     <span>{(run.latency_ms / 1000).toFixed(1)}s</span>
                     <span>${run.estimated_cost_usd.toFixed(4)}</span>
                   </div>
                 </div>
               ))}
               {history.length === 0 && (
                 <div className="p-4 text-xs text-[#7d8187] italic">No execution history recorded</div>
               )}
             </div>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  )
}
