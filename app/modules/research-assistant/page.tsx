'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import ChatInterface from '@/components/chat-interface'
import QuickActions from '@/components/quick-actions'
import FileUploadZone from '@/components/file-upload-zone'
import { PlaySquare, Loader2, CheckCircle2, Database, Trash2, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSearchParams, useRouter } from 'next/navigation'

// Generate a unique session ID for this page mount
function generateSessionId(): string {
  return crypto.randomUUID()
}

type FileStatus = 'pending' | 'uploading' | 'processing' | 'indexed' | 'error'

interface TrackedFile {
  file: File
  status: FileStatus
  chunkCount?: number
  error?: string
}

interface SessionInfo {
  session_id: string
  total_chunks: number
  sources: string[]
  has_data: boolean
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ResearchAssistantPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Temporary: Clerk disabled per user request
  const userId = "demo-user"

  // Use session ID from URL or generate a new one
  const [sessionId, setSessionId] = useState<string>(
    searchParams.get('sessionId') || generateSessionId()
  )

  // When URL changes, update sessionId if it changed
  useEffect(() => {
    const urlSessionId = searchParams.get('sessionId')
    if (urlSessionId && urlSessionId !== sessionId) {
      setSessionId(urlSessionId)
    }
  }, [searchParams])

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Welcome to the AI Research Assistant! Upload documents or paste a YouTube URL to build your knowledge base. I\'ll use RAG (Retrieval-Augmented Generation) to find the most relevant parts of your content when answering questions.\n\n**Quick start:**\n1. Upload a PDF, DOCX, or TXT file below\n2. Or paste a YouTube URL\n3. Then ask me anything about the content!',
      timestamp: new Date(),
    },
  ])

  const [trackedFiles, setTrackedFiles] = useState<TrackedFile[]>([])
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isIngesting, setIsIngesting] = useState(false)
  const [youtubeStatus, setYoutubeStatus] = useState<'idle' | 'ingesting' | 'done' | 'error'>('idle')
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [isSending, setIsSending] = useState(false)

  // Fetch conversation history if sessionId exists in URL
  useEffect(() => {
    const fetchHistory = async () => {
      if (!userId) return
      const urlSessionId = searchParams.get('sessionId')
      if (urlSessionId) {
        try {
          const res = await fetch(`http://localhost:8000/api/py/conversations/${urlSessionId}`)
          if (res.ok) {
            const data = await res.json()
            if (data.messages && data.messages.length > 0) {
              setMessages(data.messages.map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: new Date(m.timestamp)
              })))
            }
          }
        } catch (e) {
          console.error('Failed to load chat history:', e)
        }
      }
    }
    fetchHistory()
  }, [searchParams, userId])

  // Fetch session info periodically when data is being ingested
  const fetchSessionInfo = useCallback(async () => {
    try {
      const res = await fetch(`/api/py/ingest/status/${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        setSessionInfo(data)
      }
    } catch {
      // Silently fail — session might not exist yet
    }
  }, [sessionId])

  // Poll session info after ingestion
  useEffect(() => {
    if (sessionInfo?.has_data || trackedFiles.some(f => f.status === 'indexed')) {
      fetchSessionInfo()
    }
  }, [trackedFiles, fetchSessionInfo, sessionInfo?.has_data])

  // --- FILE INGESTION ---
  const ingestFile = async (file: File): Promise<{ success: boolean; chunk_count?: number; error?: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('session_id', sessionId)

    const response = await fetch('/api/py/ingest/file', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(errorData.detail || 'Upload failed')
    }

    return await response.json()
  }

  const handleFilesSelected = async (files: File[]) => {
    // Add files to tracking with 'uploading' status
    const newTracked: TrackedFile[] = files.map(f => ({
      file: f,
      status: 'uploading' as FileStatus,
    }))

    setTrackedFiles(prev => [...prev, ...newTracked])
    setIsIngesting(true)

    // Ingest each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        // Update status to processing
        setTrackedFiles(prev =>
          prev.map(tf =>
            tf.file === file ? { ...tf, status: 'processing' as FileStatus } : tf
          )
        )

        const result = await ingestFile(file)

        // Update status to indexed
        setTrackedFiles(prev =>
          prev.map(tf =>
            tf.file === file
              ? {
                ...tf,
                status: result.success ? ('indexed' as FileStatus) : ('error' as FileStatus),
                chunkCount: result.chunk_count,
                error: result.error,
              }
              : tf
          )
        )
      } catch (error: any) {
        setTrackedFiles(prev =>
          prev.map(tf =>
            tf.file === file
              ? { ...tf, status: 'error' as FileStatus, error: error.message }
              : tf
          )
        )
      }
    }

    setIsIngesting(false)
    fetchSessionInfo()
  }

  // --- YOUTUBE INGESTION ---
  const handleYoutubeIngest = async () => {
    if (!youtubeUrl.trim()) return

    setYoutubeStatus('ingesting')
    setIsIngesting(true)

    try {
      const response = await fetch('/api/py/ingest/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          youtube_url: youtubeUrl,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'YouTube ingestion failed' }))
        throw new Error(errorData.detail || 'YouTube ingestion failed')
      }

      const result = await response.json()
      if (result.success) {
        setYoutubeStatus('done')
        fetchSessionInfo()
      } else {
        setYoutubeStatus('error')
      }
    } catch (error) {
      console.error(error)
      setYoutubeStatus('error')
    } finally {
      setIsIngesting(false)
    }
  }

  // --- CHAT ---
  const handleSendMessageWithOptions = async (message: string, topK: number = 5) => {
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: message,
      timestamp: new Date(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setIsSending(true)

    try {
      // Notify sidebar to refresh conversations if it's the first message
      if (messages.length <= 1) {
        window.dispatchEvent(new Event('refresh-conversations'))
      }

      const response = await fetch('/api/py/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          session_id: sessionId,
          user_id: userId || 'anonymous',
          module: 'research-assistant',
          top_k: topK,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to communicate with AI')
      }

      const data = await response.json()

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: data.reply,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error(error)
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: 'Error: Could not connect to the backend. Is the Python server running?',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsSending(false)
    }
  }

  const handleSendMessage = async (message: string) => {
    handleSendMessageWithOptions(message, 5)
  }

  const handleQuickAction = (action: string) => {
    const prompts: Record<string, string> = {
      summary: 'Please generate a comprehensive summary covering all the main topics, arguments, and conclusions from the ingested content.',
      notes: 'Create detailed, well-organized study notes covering all key topics, definitions, and important details from the ingested content.',
      flashcards: 'Generate flashcards for all key concepts, terms, and important facts from the ingested content.',
      quiz: 'Create a quiz with 5 challenging questions based on the key topics and details in the ingested content.',
      citations: 'Extract and format all citations, references, and sources mentioned in the ingested content.',
      mindmap: 'Generate a hierarchical mind map structure covering all the major topics and subtopics from the ingested content.',
      deck_report: 'Create a complete presentation deck outline with slide-by-slide content covering all major topics from the ingested content.',
    }

    // Quick actions need more context than a specific question
    // Use higher top_k to retrieve more chunks for broad actions
    const QUICK_ACTION_TOP_K = 20

    if (prompts[action]) {
      handleSendMessageWithOptions(prompts[action], QUICK_ACTION_TOP_K)
    }
  }

  // --- CLEAR SESSION ---
  const handleClearSession = async () => {
    try {
      await fetch(`http://localhost:8000/api/py/ingest/${sessionId}`, { method: 'DELETE' })
      window.dispatchEvent(new Event('refresh-conversations'))
      router.push('/modules/research-assistant')

      setSessionId(generateSessionId())
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: 'Session cleared. Starting a new research session.',
          timestamp: new Date(),
        },
      ])
      setTrackedFiles([])
      setYoutubeUrl('')
      setYoutubeStatus('idle')
      setSessionInfo(null)
    } catch (error) {
      console.error('Failed to clear session:', error)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Research Assistant</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload documents and analyze them with RAG-powered AI insights
            </p>
          </div>

          {/* Session Info Badge */}
          {sessionInfo?.has_data && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                <Database className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">
                  {sessionInfo.total_chunks} chunks indexed
                </span>
              </div>
              <button
                onClick={handleClearSession}
                className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-md hover:bg-red-500/10"
                title="Clear all ingested data"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatInterface messages={messages} />

        {/* Quick Actions */}
        <QuickActions onAction={handleQuickAction} />

        {/* File Upload Zone */}
        <FileUploadZone
          onFilesSelected={handleFilesSelected}
          uploadedFiles={[]}
          trackedFiles={trackedFiles}
        />

        {/* Chat Input Area */}
        <div className="bg-transparent p-4 pb-8 relative z-10">
          <div className="max-w-3xl mx-auto space-y-4">

            {/* Youtube URL Input (Subtle above chat) */}
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 max-w-md w-full bg-card/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border shadow-sm hover:shadow transition-all focus-within:ring-2 focus-within:ring-primary/20">
                <PlaySquare className="w-4 h-4 text-red-500/80 shrink-0" />
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value)
                    if (youtubeStatus !== 'idle') setYoutubeStatus('idle')
                  }}
                  placeholder="Paste YouTube URL to ingest..."
                  className="flex-1 bg-transparent text-xs text-foreground focus:outline-none placeholder-muted-foreground min-w-0"
                />
                {youtubeStatus === 'done' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <button
                    onClick={handleYoutubeIngest}
                    disabled={!youtubeUrl.trim() || youtubeStatus === 'ingesting'}
                    className="text-[10px] uppercase tracking-wider font-semibold px-2 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded hover:bg-red-500/20 disabled:opacity-50 transition-colors flex items-center shrink-0"
                  >
                    {youtubeStatus === 'ingesting' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Ingest'}
                  </button>
                )}
              </div>
            </div>

            <ChatInput onSendMessage={handleSendMessage} isSending={isSending} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ChatInput({
  onSendMessage,
  isSending,
}: {
  onSendMessage: (msg: string) => void
  isSending?: boolean
}) {
  const [input, setInput] = useState('')
  const [isComposing, setIsComposing] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isComposing && !isSending) {
      onSendMessage(input)
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      handleSubmit(e)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-end w-full bg-card border border-border/80 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.1)] rounded-[24px] overflow-hidden focus-within:ring-1 focus-within:ring-foreground/20 focus-within:border-foreground/30 transition-all pl-4 pr-2 py-2"
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        placeholder="How can I help you with this research?"
        className="flex-1 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none py-2 text-[15px] min-h-[44px]"
      />
      <div className="flex items-center ml-2 mb-1">
        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className={cn(
            "p-2 rounded-full flex items-center justify-center transition-all",
            input.trim() && !isSending
              ? "bg-foreground text-background hover:opacity-90"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ArrowUp className="w-5 h-5" />
          )}
        </button>
      </div>
    </form>
  )
}
