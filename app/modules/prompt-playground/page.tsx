'use client'

import { useState, useMemo, useEffect } from 'react'
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
import { Loader2, Copy, Save, Search, Play, Settings2, History, Code2, Plus, Trash2, ArrowRight } from 'lucide-react'

// --- Mock Data ---

interface SavedPrompt {
  id: string
  name: string
  section: 'My Prompts' | 'Team Prompts' | 'Templates' | 'Favorites'
  status: 'Draft' | 'Published'
  tags: string[]
  systemPrompt: string
  userPrompt: string
  version: number
}

const MOCK_PROMPTS: SavedPrompt[] = [
  { 
    id: '1', 
    name: 'Customer Support Email', 
    section: 'My Prompts', 
    status: 'Published', 
    tags: ['Email', 'Support'], 
    systemPrompt: 'You are a helpful customer support agent for Acme Corp. Always be polite and concise.', 
    userPrompt: 'Draft an email responding to a customer named {{customer_name}} about their delayed order of {{product}}. The new ETA is {{eta}}.',
    version: 3 
  },
  { 
    id: '2', 
    name: 'Code Reviewer', 
    section: 'Team Prompts', 
    status: 'Draft', 
    tags: ['Coding'], 
    systemPrompt: 'You are an expert senior software engineer. Review the provided code for bugs, performance, and style.', 
    userPrompt: 'Review the following {{language}} code:\n\n{{code}}',
    version: 1 
  },
  { 
    id: '3', 
    name: 'Meeting Summarizer', 
    section: 'Favorites', 
    status: 'Published', 
    tags: ['Summarization'], 
    systemPrompt: 'Extract action items, key decisions, and a brief summary from the meeting transcript.', 
    userPrompt: 'Transcript:\n{{transcript}}',
    version: 5 
  },
]

const MODELS = ['GPT-4', 'GPT-3.5 Turbo', 'Claude 3 Opus', 'Gemini 1.5 Pro', 'Llama 3', 'Qwen 2.5']

interface RunHistoryItem {
  id: string
  timestamp: string
  version: number
  model: string
  latency: number
  inputTokens: number
  outputTokens: number
  cost: number
  status: 'Success' | 'Error'
}

const MOCK_HISTORY: RunHistoryItem[] = [
  { id: 'h1', timestamp: '2 mins ago', version: 3, model: 'GPT-4', latency: 2.4, inputTokens: 45, outputTokens: 120, cost: 0.0035, status: 'Success' },
  { id: 'h2', timestamp: '1 hour ago', version: 2, model: 'Claude 3 Opus', latency: 4.1, inputTokens: 40, outputTokens: 95, cost: 0.0028, status: 'Success' },
  { id: 'h3', timestamp: '2 days ago', version: 1, model: 'GPT-3.5 Turbo', latency: 0.8, inputTokens: 38, outputTokens: 10, cost: 0.0001, status: 'Error' },
]

export default function PromptPlaygroundPage() {
  const [activePromptId, setActivePromptId] = useState<string | null>(null)
  const [mode, setMode] = useState<'single' | 'compare'>('single')
  
  const [systemPrompt, setSystemPrompt] = useState('')
  const [userPrompt, setUserPrompt] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [model1, setModel1] = useState(MODELS[0])
  const [model2, setModel2] = useState(MODELS[1])
  
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

  // Extract variables via regex {{var}}
  const extractedVariables = useMemo(() => {
    const regex = /{{([^}]+)}}/g
    const matches = Array.from(`${systemPrompt} ${userPrompt}`.matchAll(regex))
    return Array.from(new Set(matches.map(m => m[1].trim())))
  }, [systemPrompt, userPrompt])

  const handleLoadPrompt = (prompt: SavedPrompt) => {
    setActivePromptId(prompt.id)
    setSystemPrompt(prompt.systemPrompt)
    setUserPrompt(prompt.userPrompt)
    setVariables({})
    setOutput1('')
    setOutput2('')
    setMetrics1({ latency: 0, inputTokens: 0, outputTokens: 0, cost: 0 })
    setMetrics2({ latency: 0, inputTokens: 0, outputTokens: 0, cost: 0 })
  }

  const handleExecute = async () => {
    setIsExecuting(true)
    
    // Mock Execution Delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const mockOutput = "This is a mocked response based on the provided prompts and variables. In a real backend, this would stream the LLM completion."
    
    setOutput1(`[${model1}] ` + mockOutput)
    setMetrics1({
      latency: 1.5,
      inputTokens: Math.floor(Math.random() * 100) + 50,
      outputTokens: Math.floor(Math.random() * 200) + 100,
      cost: Number((Math.random() * 0.01).toFixed(4))
    })

    if (mode === 'compare') {
      setOutput2(`[${model2}] ` + mockOutput + " Slightly different phrasing for comparison.")
      setMetrics2({
        latency: 1.8,
        inputTokens: Math.floor(Math.random() * 100) + 50,
        outputTokens: Math.floor(Math.random() * 200) + 100,
        cost: Number((Math.random() * 0.01).toFixed(4))
      })
    }
    
    setIsExecuting(false)
  }

  const SECTIONS = ['My Prompts', 'Team Prompts', 'Templates', 'Favorites'] as const

  const filteredPrompts = MOCK_PROMPTS.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="flex h-full bg-[#0a0a0a] text-white overflow-hidden">
      
      {/* LEFT SIDEBAR: Library */}
      <div className="w-72 border-r border-[#212327] flex flex-col bg-[#0a0a0a]">
        <div className="p-4 border-b border-[#212327]">
          <h2 className="font-mono text-[14px] tracking-[1.4px] uppercase text-white mb-4">Library</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7d8187]" />
            <input 
              type="text" 
              placeholder="Search prompts..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1a1c20] border border-[#212327] rounded-sm py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-[#7d8187] transition-colors"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {SECTIONS.map(section => {
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
                        <button
                          key={prompt.id}
                          onClick={() => handleLoadPrompt(prompt)}
                          className={`w-full text-left p-3 rounded-sm transition-colors flex flex-col gap-2 ${
                            activePromptId === prompt.id ? 'bg-[#1a1c20] border border-[#212327]' : 'hover:bg-[#1a1c20] border border-transparent'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium leading-tight">{prompt.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-sm uppercase font-mono tracking-wider ${
                              prompt.status === 'Published' ? 'bg-[#1a1c20] text-[#7d8187] border border-[#212327]' : 'bg-[#ff7a17]/10 text-[#ff7a17] border border-[#ff7a17]/20'
                            }`}>
                              {prompt.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {prompt.tags.map(tag => (
                              <span key={tag} className="text-[10px] text-[#7d8187] bg-[#1a1c20] px-1.5 py-0.5 rounded-sm">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </button>
                      ))}
                      {sectionPrompts.length === 0 && (
                        <div className="px-2 py-3 text-xs text-[#7d8187] italic">No prompts found</div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )
          })}
        </div>
        
        <div className="p-4 border-t border-[#212327]">
          <Button className="w-full rounded-full bg-transparent border border-white/25 hover:border-white text-white font-normal text-sm h-10">
            <Plus className="w-4 h-4 mr-2" /> New Prompt
          </Button>
        </div>
      </div>

      {/* CENTER PANEL: Playground */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 border-b border-[#212327] flex items-center justify-between px-6 bg-[#0a0a0a]">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-normal">
              {activePromptId ? MOCK_PROMPTS.find(p => p.id === activePromptId)?.name : 'Untitled Prompt'}
            </h1>
            {activePromptId && (
              <span className="text-xs font-mono text-[#7d8187]">v{MOCK_PROMPTS.find(p => p.id === activePromptId)?.version}</span>
            )}
          </div>
          
          <div className="flex items-center bg-[#1a1c20] p-1 rounded-full border border-[#212327]">
            <button 
              onClick={() => setMode('single')}
              className={`px-4 py-1.5 text-sm rounded-full transition-colors ${mode === 'single' ? 'bg-[#363a3f] text-white' : 'text-[#7d8187] hover:text-white'}`}
            >
              Single Run
            </button>
            <button 
              onClick={() => setMode('compare')}
              className={`px-4 py-1.5 text-sm rounded-full transition-colors ${mode === 'compare' ? 'bg-[#363a3f] text-white' : 'text-[#7d8187] hover:text-white'}`}
            >
              Compare
            </button>
          </div>
        </div>

        {/* Workspace Area */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Prompts Column */}
          <div className="w-1/2 min-w-[400px] border-r border-[#212327] flex flex-col bg-[#0a0a0a] overflow-y-auto">
            
            {/* System Prompt */}
            <div className="p-6 border-b border-[#212327] flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <span className="font-mono text-[14px] tracking-[1.4px] uppercase text-[#7d8187]">System Prompt</span>
              </div>
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant..."
                className="w-full h-32 bg-[#1a1c20] border border-[#212327] rounded-sm p-4 text-sm font-mono focus:outline-none focus:border-[#7d8187] resize-y placeholder:text-[#7d8187]"
              />
            </div>

            {/* User Prompt */}
            <div className="p-6 border-b border-[#212327] flex flex-col flex-1">
              <div className="flex justify-between items-center mb-3">
                <span className="font-mono text-[14px] tracking-[1.4px] uppercase text-[#7d8187]">User Prompt</span>
              </div>
              <textarea
                value={userPrompt}
                onChange={e => setUserPrompt(e.target.value)}
                placeholder="Enter your instructions here. Use {{variable}} syntax for dynamic inputs."
                className="w-full h-full min-h-[200px] bg-[#1a1c20] border border-[#212327] rounded-sm p-4 text-sm font-mono focus:outline-none focus:border-[#7d8187] resize-none placeholder:text-[#7d8187]"
              />
            </div>

            {/* Variables */}
            {extractedVariables.length > 0 && (
              <div className="p-6 bg-[#0a0a0a]">
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
                        className="w-full bg-[#1a1c20] border border-[#212327] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#7d8187]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Outputs Column */}
          <div className={`flex-1 flex ${mode === 'compare' ? 'flex-row' : 'flex-col'} overflow-hidden bg-[#0a0a0a]`}>
            
            {/* Model 1 Output */}
            <div className={`flex flex-col h-full ${mode === 'compare' ? 'w-1/2 border-r border-[#212327]' : 'w-full'}`}>
              <div className="p-4 border-b border-[#212327] flex justify-between items-center bg-[#1a1c20]/30">
                <Select value={model1} onValueChange={setModel1}>
                  <SelectTrigger className="w-[180px] bg-transparent border-0 font-mono text-[14px] text-white focus:ring-0 p-0 h-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#191919] border-[#212327] text-white">
                    {MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                {output1 && <Button variant="ghost" size="icon" className="h-6 w-6 text-[#7d8187] hover:text-white" onClick={() => navigator.clipboard.writeText(output1)}><Copy className="w-3.5 h-3.5" /></Button>}
              </div>
              <div className="flex-1 p-6 overflow-y-auto font-mono text-sm text-[#dadbdf] whitespace-pre-wrap">
                {isExecuting ? (
                  <div className="flex items-center gap-3 text-[#7d8187]">
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                  </div>
                ) : output1 ? output1 : <span className="text-[#7d8187]">Output will appear here...</span>}
              </div>
              {/* Metrics 1 */}
              {output1 && !isExecuting && (
                <div className="p-3 border-t border-[#212327] bg-[#1a1c20]/30 flex gap-4 text-[11px] font-mono text-[#7d8187]">
                  <span>{metrics1.latency.toFixed(2)}s</span>
                  <span>{metrics1.inputTokens} In / {metrics1.outputTokens} Out</span>
                  <span>Est. ${metrics1.cost.toFixed(4)}</span>
                </div>
              )}
            </div>

            {/* Model 2 Output (Compare Mode Only) */}
            {mode === 'compare' && (
              <div className="w-1/2 flex flex-col h-full bg-[#0a0a0a]">
                <div className="p-4 border-b border-[#212327] flex justify-between items-center bg-[#1a1c20]/30">
                  <Select value={model2} onValueChange={setModel2}>
                    <SelectTrigger className="w-[180px] bg-transparent border-0 font-mono text-[14px] text-white focus:ring-0 p-0 h-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#191919] border-[#212327] text-white">
                      {MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {output2 && <Button variant="ghost" size="icon" className="h-6 w-6 text-[#7d8187] hover:text-white" onClick={() => navigator.clipboard.writeText(output2)}><Copy className="w-3.5 h-3.5" /></Button>}
                </div>
                <div className="flex-1 p-6 overflow-y-auto font-mono text-sm text-[#dadbdf] whitespace-pre-wrap">
                  {isExecuting ? (
                    <div className="flex items-center gap-3 text-[#7d8187]">
                      <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                    </div>
                  ) : output2 ? output2 : <span className="text-[#7d8187]">Output will appear here...</span>}
                </div>
                {/* Metrics 2 */}
                {output2 && !isExecuting && (
                  <div className="p-3 border-t border-[#212327] bg-[#1a1c20]/30 flex gap-4 text-[11px] font-mono text-[#7d8187]">
                    <span>{metrics2.latency.toFixed(2)}s</span>
                    <span>{metrics2.inputTokens} In / {metrics2.outputTokens} Out</span>
                    <span>Est. ${metrics2.cost.toFixed(4)}</span>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Global Action Bar */}
        <div className="h-16 border-t border-[#212327] flex items-center justify-between px-6 bg-[#0a0a0a]">
          <div className="flex items-center gap-4">
             {/* Total run metrics could go here if single run */}
             <span className="text-xs text-[#7d8187]">
               {extractedVariables.length > 0 ? `${extractedVariables.length} variable(s) detected` : 'Ready to execute'}
             </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-full bg-transparent border-[#212327] text-white hover:bg-[#1a1c20]">
              <Save className="w-4 h-4 mr-2" /> Save Draft
            </Button>
            <Button variant="outline" className="rounded-full bg-transparent border-[#212327] text-white hover:bg-[#1a1c20]">
              Publish
            </Button>
            <Button 
              onClick={handleExecute}
              disabled={isExecuting || (!systemPrompt && !userPrompt)}
              className="rounded-full bg-white text-black hover:bg-[#fafaf7] px-8"
            >
              {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4 mr-2" /> Run</>}
            </Button>
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
             <div className="divide-y divide-[#212327]">
               {MOCK_HISTORY.map(run => (
                 <div key={run.id} className="p-4 hover:bg-[#1a1c20] transition-colors cursor-pointer group">
                   <div className="flex justify-between items-start mb-2">
                     <span className="text-xs text-white">v{run.version} • {run.model}</span>
                     <span className="text-[10px] text-[#7d8187] font-mono">{run.timestamp}</span>
                   </div>
                   <div className="flex gap-3 text-[11px] font-mono text-[#7d8187]">
                     <span className={run.status === 'Success' ? 'text-[#ff7a17]' : 'text-red-500'}>
                       {run.status}
                     </span>
                     <span>{run.latency.toFixed(1)}s</span>
                     <span>${run.cost.toFixed(4)}</span>
                   </div>
                 </div>
               ))}
             </div>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  )
}
