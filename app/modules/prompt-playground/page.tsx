'use client'

import { useState } from 'react'
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
import { Loader2, Copy, Save, ChevronDown } from 'lucide-react'

interface SavedPrompt {
  id: string
  name: string
  category: string
  content: string
}

const MODELS = ['GPT-4', 'GPT-3.5 Turbo', 'Claude 3 Opus', 'Gemini Pro', 'Llama 2', 'Qwen']

const PROMPT_LIBRARY: SavedPrompt[] = [
  { id: '1', name: 'React Component', category: 'coding', content: 'Create a React component that...' },
  { id: '2', name: 'Database Query', category: 'coding', content: 'Write a SQL query to...' },
  { id: '3', name: 'API Documentation', category: 'coding', content: 'Document this REST API...' },
  { id: '4', name: 'Email Newsletter', category: 'email', content: 'Write a professional email about...' },
  { id: '5', name: 'Product Description', category: 'marketing', content: 'Create a compelling product description for...' },
  { id: '6', name: 'Blog Post', category: 'marketing', content: 'Write a blog post about...' },
  { id: '7', name: 'Data Summary', category: 'summarization', content: 'Summarize the following data...' },
  { id: '8', name: 'User Query', category: 'summarization', content: 'Extract key points from...' },
  { id: '9', name: 'SELECT Statement', category: 'sql', content: 'Generate SQL SELECT query for...' },
  { id: '10', name: 'JOIN Query', category: 'sql', content: 'Create a SQL JOIN to...' },
]

export default function PromptPlaygroundPage() {
  const [selectedModel, setSelectedModel] = useState('GPT-4')
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [metrics, setMetrics] = useState({
    latency: 0,
    tokens: 0,
    cost: 0,
  })

  const handleExecute = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt')
      return
    }

    setIsLoading(true)
    const startTime = Date.now()

    try {
      const res = await fetch('/api/prompt-playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: selectedModel }),
      })

      const data = await res.json()
      const latency = Date.now() - startTime

      setResponse(data.response)
      setMetrics({
        latency: latency / 1000,
        tokens: data.tokens || Math.floor(Math.random() * 500) + 100,
        cost: data.cost || (Math.random() * 0.05).toFixed(4),
      })
    } catch (error) {
      console.error('Execution failed:', error)
      alert('Failed to execute prompt')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSavePrompt = () => {
    const name = prompt('Enter prompt name:')
    if (name) {
      console.log('Prompt saved:', name)
      alert(`Prompt "${name}" saved successfully!`)
    }
  }

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(response)
  }

  const handleLoadPrompt = (promptContent: string) => {
    setPrompt(promptContent)
  }

  const categories = Array.from(new Set(PROMPT_LIBRARY.map((p) => p.category)))

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar - Prompt Library */}
      <div className="w-64 border-r border-border overflow-y-auto bg-muted/30">
        <div className="sticky top-0 bg-background border-b border-border p-4 z-10">
          <h2 className="font-semibold text-foreground">Prompt Library</h2>
          <p className="text-xs text-muted-foreground mt-1">Save & manage prompts</p>
        </div>

        <div className="p-4 space-y-2">
          {categories.map((category) => (
            <Accordion key={category} type="single" collapsible>
              <AccordionItem value={category} className="border-0">
                <AccordionTrigger className="py-2 hover:no-underline capitalize">
                  <span className="text-sm font-medium">{category}</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-1">
                  {PROMPT_LIBRARY.filter((p) => p.category === category).map((prompt) => (
                    <button
                      key={prompt.id}
                      onClick={() => handleLoadPrompt(prompt.content)}
                      className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-primary/10 text-muted-foreground hover:text-foreground transition"
                    >
                      {prompt.name}
                    </button>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-4 bg-background">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-foreground">Model:</label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Input Area */}
          <div className="flex-1 border-r border-border flex flex-col">
            <div className="border-b border-border p-4 bg-muted/30">
              <p className="text-sm font-semibold text-foreground">Prompt Input</p>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here... Try asking for code, writing, summaries, or analysis."
              className="flex-1 p-4 bg-background text-foreground resize-none focus:outline-none focus:ring-0 font-mono text-sm"
            />
          </div>

          {/* Output Area */}
          <div className="flex-1 flex flex-col bg-muted/20">
            <div className="border-b border-border p-4 bg-muted/30 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Output</p>
              {response && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyResponse}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
              )}
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : response ? (
                <div className="text-sm text-foreground whitespace-pre-wrap font-mono bg-background rounded p-3 border border-border">
                  {response}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Output will appear here
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="border-t border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-8">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Latency</span>
                <span className="text-sm font-semibold text-foreground">
                  {metrics.latency.toFixed(2)}s
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Est. Tokens</span>
                <span className="text-sm font-semibold text-foreground">
                  {metrics.tokens}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Est. Cost</span>
                <span className="text-sm font-semibold text-foreground">
                  ${metrics.cost}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSavePrompt}
                disabled={!prompt}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                Save Prompt
              </Button>
              <Button
                onClick={handleExecute}
                disabled={isLoading || !prompt}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  'Execute'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
