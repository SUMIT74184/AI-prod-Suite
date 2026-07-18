'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FileUploadZone from '@/components/file-upload-zone'
import { Loader2, Copy, AlertCircle, Shield, Lightbulb, BookOpen, Zap, Wrench, TestTube, Terminal } from 'lucide-react'
import Link from 'next/link'

interface ReviewResult {
  bugs: string[]
  security: string[]
  improvements: string[]
  explanation: string
  complexity: string
  refactoring: string[]
  unitTests: string
}

export default function CodeReviewerPage() {
  const [code, setCode] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null)
  const [activeTab, setActiveTab] = useState('input')

  const handleReview = async () => {
    if (!code.trim()) {
      alert('Please enter code to review')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/py/code-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      if (!response.ok) {
        throw new Error('Backend returned an error')
      }

      const data = await response.json()
      setReviewResult(data)
      setActiveTab('results')
    } catch (error) {
      console.error('Review failed:', error)
      alert('Failed to review code. Is the Python backend running?')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code)
  }

  const handleFilesSelected = (files: File[]) => {
    setUploadedFiles(files)
    // Auto-read the first file into the textarea
    if (files.length > 0) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result
        if (typeof content === 'string') {
          setCode(content)
        }
      }
      reader.readAsText(files[0])
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="border-b border-[#212327] p-4 flex items-center justify-between">
        <div>
          <p className="xai-caption-mono-sm text-[#7d8187] mb-1">Code</p>
          <h1 className="xai-display-xs text-white">AI Code Reviewer</h1>
          <p className="text-sm text-[#7d8187] mt-1 font-normal">
            Get AI-powered feedback on your code for bugs, security, and improvements
          </p>
        </div>
        <Link href="/modules/code-reviewer/docs">
          <Button variant="outline" size="sm" className="gap-2">
            <Terminal className="w-4 h-4" />
            CLI Docs
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-[#212327] bg-[#0a0a0a] px-4 h-12">
          <TabsTrigger value="input">Input Code</TabsTrigger>
          <TabsTrigger value="results" disabled={!reviewResult}>
            Review Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="flex-1 overflow-hidden p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            {/* Code Input Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-normal text-white">Paste Your Code</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCode}
                  disabled={!code}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your code here... (JavaScript, Python, TypeScript, etc.)"
                className="flex-1 p-3 rounded-lg border border-[#212327] bg-[#1a1c20] text-white font-mono text-sm resize-none focus:outline-none focus:border-[rgba(255,255,255,0.25)] placeholder-[#7d8187] font-normal transition-colors"
              />
              <div className="xai-caption-mono-sm text-[#7d8187]">
                {code.length} characters
              </div>
            </div>

            {/* File Upload Section */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-normal text-white">Or Upload Files</label>
              <div className="flex-1">
                <FileUploadZone
                  onFilesSelected={handleFilesSelected}
                  acceptedTypes={['text/plain', 'application/zip', 'text/x-python', 'text/javascript', 'text/typescript']}
                />
              </div>
              {uploadedFiles && uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="xai-caption-mono-sm text-[#7d8187]">Selected Files:</p>
                  <div className="space-y-1">
                    {uploadedFiles.map((file: File, idx: number) => (
                      <div key={idx} className="text-xs text-[#7d8187] bg-[#191919] border border-[#212327] rounded-lg px-3 py-1.5">
                        {file.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-4 border-t border-[#212327] pt-4">
            <Button
              onClick={handleReview}
              disabled={isLoading || !code.trim()}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Reviewing...
                </>
              ) : (
                'Review Code'
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="results" className="flex-1 overflow-auto p-4">
          {reviewResult && (
            <div className="space-y-4 max-w-4xl">
              {/* Results using Tabs */}
              <Tabs defaultValue="bugs" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="bugs" className="flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Bugs</span>
                  </TabsTrigger>
                  <TabsTrigger value="security" className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline">Security</span>
                  </TabsTrigger>
                  <TabsTrigger value="improvements" className="flex items-center gap-1">
                    <Lightbulb className="w-4 h-4" />
                    <span className="hidden sm:inline">Improve</span>
                  </TabsTrigger>
                  <TabsTrigger value="details" className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span className="hidden sm:inline">Details</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="bugs" className="space-y-2 mt-4">
                  {reviewResult.bugs && reviewResult.bugs.length > 0 ? (
                    reviewResult.bugs.map((bug: string, idx: number) => (
                      <div key={idx} className="bg-[#191919] rounded-lg p-3 border-l-2 border-[#ff4444] text-sm border border-[#212327]">
                        <p className="font-normal text-[#ff4444]">Bug {idx + 1}</p>
                        <p className="text-[#dadbdf] mt-1">{bug}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[#7d8187] text-center py-8">No bugs detected! ✓</p>
                  )}
                </TabsContent>

                <TabsContent value="security" className="space-y-2 mt-4">
                  {reviewResult.security && reviewResult.security.length > 0 ? (
                    reviewResult.security.map((issue: string, idx: number) => (
                      <div key={idx} className="bg-[#191919] rounded-lg p-3 border-l-2 border-[#ffc285] text-sm border border-[#212327]">
                        <p className="font-normal text-[#ffc285]">Issue {idx + 1}</p>
                        <p className="text-[#dadbdf] mt-1">{issue}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[#7d8187] text-center py-8">No security issues found! ✓</p>
                  )}
                </TabsContent>

                <TabsContent value="improvements" className="space-y-2 mt-4">
                  {reviewResult.improvements && reviewResult.improvements.length > 0 ? (
                    reviewResult.improvements.map((improvement: string, idx: number) => (
                      <div key={idx} className="bg-[#191919] rounded-lg p-3 border-l-2 border-[#a0c3ec] text-sm border border-[#212327]">
                        <p className="font-normal text-[#a0c3ec]">Suggestion {idx + 1}</p>
                        <p className="text-[#dadbdf] mt-1">{improvement}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[#7d8187] text-center py-8">No improvements suggested.</p>
                  )}
                </TabsContent>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="bg-[#191919] rounded-lg p-4 border-l-2 border-white border border-[#212327]">
                    <p className="font-normal text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Explanation
                    </p>
                    <p className="text-[#dadbdf] mt-2 text-sm">{reviewResult.explanation}</p>
                  </div>

                  <div className="bg-[#191919] rounded-lg p-4 border-l-2 border-[#7c3aed] border border-[#212327]">
                    <p className="font-normal text-[#c4b5fd] flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Complexity Analysis
                    </p>
                    <p className="text-[#dadbdf] mt-2 text-sm whitespace-pre-wrap">{reviewResult.complexity}</p>
                  </div>

                  <div className="bg-[#191919] rounded-lg p-4 border-l-2 border-[#a0c3ec] border border-[#212327]">
                    <p className="font-normal text-[#a0c3ec] flex items-center gap-2">
                      <TestTube className="w-4 h-4" />
                      Unit Tests
                    </p>
                    <pre className="text-[#dadbdf] mt-2 text-xs overflow-x-auto bg-[#1a1c20] p-2 rounded-lg border border-[#212327] font-mono">{reviewResult.unitTests}</pre>
                  </div>

                  {reviewResult.refactoring && reviewResult.refactoring.length > 0 && (
                    <div className="bg-[#191919] rounded-lg p-4 border-l-2 border-[#ff7a17] border border-[#212327]">
                      <p className="font-normal text-[#ff7a17] flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        Refactoring Suggestions
                      </p>
                      <ul className="text-[#dadbdf] mt-2 text-sm space-y-1">
                        {reviewResult.refactoring.map((suggestion: string, idx: number) => (
                          <li key={idx}>• {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
