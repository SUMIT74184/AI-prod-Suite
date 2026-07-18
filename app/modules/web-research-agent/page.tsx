'use client'

import { useState } from 'react'
export const dynamic = 'force-dynamic'
import { Button } from '@/components/ui/button'
import { Loader2, Download, Check, Clock } from 'lucide-react'

interface Step {
  id: string
  name: string
  status: 'pending' | 'in-progress' | 'completed' | 'error'
}

export default function WebResearchAgentPage() {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [report, setReport] = useState('')
  const [steps, setSteps] = useState<Step[]>([
    { id: '1', name: 'Search', status: 'pending' },
    { id: '2', name: 'Collect', status: 'pending' },
    { id: '3', name: 'Read', status: 'pending' },
    { id: '4', name: 'Summarize', status: 'pending' },
    { id: '5', name: 'Compare', status: 'pending' },
    { id: '6', name: 'Generate Report', status: 'pending' },
  ])

  const handleSearch = async () => {
    if (!query.trim()) {
      alert('Please enter a research topic')
      return
    }

    setIsSearching(true)
    setReport('')
    setSteps((prev) => prev.map((s) => ({ ...s, status: 'pending' })))

    try {
      const response = await fetch('/api/py/web-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      
      if (!response.ok) {
         throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const data = await response.json()

      // Simulate step progression
      for (let i = 0; i < steps.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 800))
        setSteps((prev) =>
          prev.map((step, idx) => {
            if (idx === i) return { ...step, status: 'in-progress' }
            if (idx < i) return { ...step, status: 'completed' }
            return step
          })
        )
      }

      setSteps((prev) => prev.map((s) => ({ ...s, status: 'completed' })))
      setReport(data.report)
    } catch (error) {
      console.error('Search failed:', error)
      setSteps((prev) => prev.map((s) => ({ ...s, status: 'error' })))
      alert('Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  const handleExportMarkdown = () => {
    const element = document.createElement('a')
    element.setAttribute(
      'href',
      `data:text/markdown;charset=utf-8,${encodeURIComponent(report)}`
    )
    element.setAttribute('download', `research-${Date.now()}.md`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-[#212327] p-6">
        <p className="xai-caption-mono-sm text-[#7d8187] mb-1">Research</p>
        <h1 className="xai-display-sm text-white">Web Research Agent</h1>
        <p className="text-[#7d8187] mt-2 font-normal">
          Enter a topic and let AI research, analyze, and generate comprehensive reports
        </p>
      </div>

      {/* Search Bar */}
      <div className="p-6">
        <div className="max-w-2xl">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Research Kubernetes, Machine Learning, Web3, Python Best Practices..."
              className="flex-1 px-4 py-3 rounded-lg border border-[#212327] bg-[#1a1c20] text-white placeholder-[#7d8187] focus:outline-none focus:border-[rgba(255,255,255,0.25)] transition-colors font-normal"
              disabled={isSearching}
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              size="lg"
              className="gap-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Researching...
                </>
              ) : (
                'Research'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
        {/* Progress Stepper */}
        <div className="lg:col-span-1">
          <div className="bg-[#191919] rounded-lg p-4 border border-[#212327] sticky top-6">
            <h3 className="xai-caption-mono-sm text-[#7d8187] mb-4">Progress</h3>
            <div className="space-y-3">
              {steps.map((step) => (
                <div key={step.id} className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div className="relative mt-1">
                    {step.status === 'pending' && (
                      <div className="w-6 h-6 rounded-full border border-[#212327] bg-[#0a0a0a]" />
                    )}
                    {step.status === 'in-progress' && (
                      <div className="w-6 h-6 rounded-full border border-[rgba(255,255,255,0.25)] bg-[#1a1c20] flex items-center justify-center">
                        <Loader2 className="w-3 h-3 animate-spin text-white" />
                      </div>
                    )}
                    {step.status === 'completed' && (
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                        <Check className="w-4 h-4 text-[#0a0a0a]" />
                      </div>
                    )}
                    {step.status === 'error' && (
                      <div className="w-6 h-6 rounded-full bg-[#ff4444] flex items-center justify-center">
                        <span className="text-white text-sm">!</span>
                      </div>
                    )}
                  </div>

                  {/* Step Text */}
                  <div className="flex-1 relative">
                    <p
                      className={`text-sm font-normal ${
                        step.status === 'in-progress'
                          ? 'text-white'
                          : step.status === 'completed'
                            ? 'text-white'
                            : step.status === 'error'
                              ? 'text-[#ff4444]'
                              : 'text-[#7d8187]'
                      }`}
                    >
                      {step.name}
                    </p>
                    {step.status === 'pending' && !isSearching && (
                      <p className="xai-caption-mono-sm text-[#7d8187]" style={{ fontSize: '10px' }}>Waiting</p>
                    )}
                    {step.status === 'in-progress' && (
                      <p className="xai-caption-mono-sm text-white" style={{ fontSize: '10px' }}>In progress...</p>
                    )}
                    {step.status === 'completed' && (
                      <p className="xai-caption-mono-sm text-[#7d8187]" style={{ fontSize: '10px' }}>Done</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Report Area */}
        <div className="lg:col-span-3">
          <div className="bg-[#191919] border border-[#212327] rounded-lg h-full flex flex-col">
            {/* Report Header */}
            <div className="border-b border-[#212327] p-4 flex items-center justify-between">
              <h3 className="xai-caption-mono-sm text-[#7d8187]">Research Report</h3>
              {report && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportMarkdown}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Markdown
                </Button>
              )}
            </div>

            {/* Report Content */}
            <div className="flex-1 overflow-auto p-6">
              {!isSearching && !report && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-[#7d8187]">
                  <Clock className="w-12 h-12 opacity-20" />
                  <p className="font-normal">Enter a topic and click Research to get started</p>
                </div>
              )}

              {isSearching && !report && (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                  <p className="text-white font-normal">Generating comprehensive report...</p>
                </div>
              )}

              {report && (
                <div className="max-w-none">
                  <div className="text-sm text-[#dadbdf] whitespace-pre-wrap leading-relaxed font-normal">
                    {report}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
