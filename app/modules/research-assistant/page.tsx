'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import ChatInterface from '@/components/chat-interface'
import QuickActions from '@/components/quick-actions'
import FileUploadZone from '@/components/file-upload-zone'
import MindmapViewer, { MindmapNode } from '@/components/mindmap-viewer'
import {
  PlaySquare, Link2, Loader2, CheckCircle2, Database,
  Trash2, ArrowUp, Brain, FileText, BookOpen, Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSearchParams, useRouter } from 'next/navigation'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

function generateSessionId(): string {
  return crypto.randomUUID()
}

type FileStatus = 'pending' | 'uploading' | 'processing' | 'indexed' | 'error'
type IngestStatus = 'idle' | 'ingesting' | 'done' | 'error'

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

// Panel shown in the right side when a structured output is generated
type PanelType = 'mindmap' | 'flashcards' | null

interface FlashcardItem {
  id: number
  front: string
  back: string
  category: string
  difficulty: string
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function ResearchAssistantPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const userId = 'demo-user'

  const [sessionId, setSessionId] = useState<string>(
    searchParams.get('sessionId') || generateSessionId()
  )

  // Sync session ID from URL
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
        'Welcome to the AI Research Assistant!\n\nUpload documents, paste a **YouTube URL**, or add any **web page link** to build your knowledge base. I use RAG (Retrieval-Augmented Generation) to find the most relevant parts of your content when answering questions.\n\n**Quick start:**\n1. Upload a PDF, DOCX, or TXT file\n2. Paste a YouTube URL or any web link\n3. Use the quick-action buttons to generate summaries, notes, flashcards, or a mind map\n4. Ask me anything about the content!',
      timestamp: new Date(),
    },
  ])

  const [trackedFiles, setTrackedFiles] = useState<TrackedFile[]>([])
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [webUrl, setWebUrl] = useState('')
  const [youtubeStatus, setYoutubeStatus] = useState<IngestStatus>('idle')
  const [webUrlStatus, setWebUrlStatus] = useState<IngestStatus>('idle')
  const [isIngesting, setIsIngesting] = useState(false)
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [isSending, setIsSending] = useState(false)

  // Structured output panel
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const [mindmapTree, setMindmapTree] = useState<MindmapNode | null>(null)
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([])
  const [currentFlashcardIdx, setCurrentFlashcardIdx] = useState(0)
  const [flashcardFlipped, setFlashcardFlipped] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // ---------------------------------------------------------------------------
  // Load conversation history from URL param
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchHistory = async () => {
      const urlSessionId = searchParams.get('sessionId')
      if (!urlSessionId) return
      try {
        const res = await fetch(`http://localhost:8000/api/py/conversations/${urlSessionId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.messages?.length > 0) {
            setMessages(
              data.messages.map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: new Date(m.timestamp),
              }))
            )
          }
        }
      } catch {
        // Silently fail — history load is non-critical
      }
    }
    fetchHistory()
  }, [searchParams])

  // ---------------------------------------------------------------------------
  // Session info polling
  // ---------------------------------------------------------------------------
  const fetchSessionInfo = useCallback(async () => {
    try {
      const res = await fetch(`/api/py/ingest/status/${sessionId}`)
      if (res.ok) setSessionInfo(await res.json())
    } catch {
      // Silently fail
    }
  }, [sessionId])

  useEffect(() => {
    if (sessionInfo?.has_data || trackedFiles.some((f) => f.status === 'indexed')) {
      fetchSessionInfo()
    }
  }, [trackedFiles, fetchSessionInfo, sessionInfo?.has_data])

  // ---------------------------------------------------------------------------
  // File ingestion
  // ---------------------------------------------------------------------------
  const ingestFileToBackend = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('session_id', sessionId)
    const res = await fetch('/api/py/ingest/file', { method: 'POST', body: formData })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(err.detail || 'Upload failed')
    }
    return await res.json()
  }

  const handleFilesSelected = async (files: File[]) => {
    const newTracked: TrackedFile[] = files.map((f) => ({ file: f, status: 'uploading' }))
    setTrackedFiles((prev) => [...prev, ...newTracked])
    setIsIngesting(true)
    for (const file of files) {
      setTrackedFiles((prev) =>
        prev.map((tf) => (tf.file === file ? { ...tf, status: 'processing' } : tf))
      )
      try {
        const result = await ingestFileToBackend(file)
        setTrackedFiles((prev) =>
          prev.map((tf) =>
            tf.file === file
              ? { ...tf, status: result.success ? 'indexed' : 'error', chunkCount: result.chunk_count, error: result.error }
              : tf
          )
        )
      } catch (err: any) {
        setTrackedFiles((prev) =>
          prev.map((tf) => (tf.file === file ? { ...tf, status: 'error', error: err.message } : tf))
        )
      }
    }
    setIsIngesting(false)
    fetchSessionInfo()
  }

  // ---------------------------------------------------------------------------
  // YouTube ingestion
  // ---------------------------------------------------------------------------
  const handleYoutubeIngest = async () => {
    if (!youtubeUrl.trim()) return
    setYoutubeStatus('ingesting')
    setIsIngesting(true)
    try {
      const res = await fetch('/api/py/ingest/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, youtube_url: youtubeUrl }),
      })
      const result = await res.json()
      setYoutubeStatus(result.success ? 'done' : 'error')
      if (result.success) fetchSessionInfo()
    } catch {
      setYoutubeStatus('error')
    } finally {
      setIsIngesting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Web URL ingestion (NEW)
  // ---------------------------------------------------------------------------
  const handleWebUrlIngest = async () => {
    if (!webUrl.trim()) return
    setWebUrlStatus('ingesting')
    setIsIngesting(true)
    try {
      const res = await fetch('/api/py/ingest/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, url: webUrl }),
      })
      const result = await res.json()
      setWebUrlStatus(result.success ? 'done' : 'error')
      if (result.success) fetchSessionInfo()
    } catch {
      setWebUrlStatus('error')
    } finally {
      setIsIngesting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Chat
  // ---------------------------------------------------------------------------
  const handleSendMessage = async (message: string, topK = 5) => {
    const userMsg = { id: Date.now().toString(), role: 'user' as const, content: message, timestamp: new Date() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setIsSending(true)
    try {
      if (messages.length <= 1) window.dispatchEvent(new Event('refresh-conversations'))
      const res = await fetch('/api/py/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          session_id: sessionId,
          user_id: userId,
          module: 'research-assistant',
          top_k: topK,
        }),
      })
      if (!res.ok) throw new Error('Backend error')
      const data = await res.json()
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply, timestamp: new Date() },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Error: Could not connect to the backend. Is the Python server running?', timestamp: new Date() },
      ])
    } finally {
      setIsSending(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Quick Actions — call /api/py/generate/* endpoints
  // ---------------------------------------------------------------------------
  const handleQuickAction = async (action: string) => {
    // Chat-based actions go through the normal chat flow
    const chatActions: Record<string, string> = {
      quiz: 'Create a quiz with 5 challenging questions based on the key topics in the ingested content.',
      citations: 'Extract and format all citations, references, and sources mentioned in the ingested content.',
    }

    if (chatActions[action]) {
      handleSendMessage(chatActions[action], 20)
      return
    }

    // Generation actions use the dedicated /generate/* endpoints
    const generationActions: Record<string, string> = {
      summary: '/api/py/generate/summary',
      notes: '/api/py/generate/notes',
      flashcards: '/api/py/generate/flashcards',
      mindmap: '/api/py/generate/mindmap',
    }

    const endpoint = generationActions[action]
    if (!endpoint) return

    setIsGenerating(true)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, top_k: 20 }),
      })
      const data = await res.json()

      if (action === 'mindmap' && data.tree) {
        setMindmapTree(data.tree)
        setActivePanel('mindmap')
        return
      }

      if (action === 'flashcards' && data.flashcards?.length > 0) {
        setFlashcards(data.flashcards)
        setCurrentFlashcardIdx(0)
        setFlashcardFlipped(false)
        setActivePanel('flashcards')
        return
      }

      // Summary and notes → add to chat as assistant message
      const content = data.markdown || data.raw_markdown || data.error || 'No output generated.'
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'assistant', content, timestamp: new Date() },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'assistant', content: 'Error: Generation failed. Is the backend running?', timestamp: new Date() },
      ])
    } finally {
      setIsGenerating(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Clear session
  // ---------------------------------------------------------------------------
  const handleClearSession = async () => {
    try {
      await fetch(`http://localhost:8000/api/py/ingest/${sessionId}`, { method: 'DELETE' })
      window.dispatchEvent(new Event('refresh-conversations'))
      router.push('/modules/research-assistant')
      setSessionId(generateSessionId())
      setMessages([{ id: '1', role: 'assistant', content: 'Session cleared. Starting a new research session.', timestamp: new Date() }])
      setTrackedFiles([])
      setYoutubeUrl('')
      setWebUrl('')
      setYoutubeStatus('idle')
      setWebUrlStatus('idle')
      setSessionInfo(null)
      setActivePanel(null)
    } catch {
      // Silently fail
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex-1 flex h-full bg-[#0a0a0a] overflow-hidden">
      {/* Left: Chat area */}
      <div className={cn('flex flex-col h-full transition-all', activePanel ? 'w-[55%]' : 'w-full')}>
        {/* Header */}
        <div className="border-b border-[#212327] px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="xai-caption-mono-sm text-[#7d8187] mb-1">Research</p>
              <h1 className="xai-display-xs text-white">AI Research Assistant</h1>
              <p className="text-sm text-[#7d8187] mt-1 font-normal">
                RAG-powered document analysis · summary · notes · flashcards · mind maps
              </p>
            </div>
            {sessionInfo?.has_data && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-[rgba(255,255,255,0.15)]">
                  <Database className="w-3.5 h-3.5 text-white" />
                  <span className="text-xs text-white font-normal">
                    {sessionInfo.total_chunks} chunks · {sessionInfo.sources.length} source{sessionInfo.sources.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={handleClearSession}
                  className="p-1.5 text-[#7d8187] hover:text-[#ff4444] transition-colors rounded-full hover:bg-[rgba(255,68,68,0.1)]"
                  title="Clear all ingested data"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <ChatInterface messages={messages} />

          {/* Quick Actions */}
          <div className="flex-shrink-0">
            <QuickActions onAction={handleQuickAction} />
          </div>

          {/* File Upload */}
          <div className="flex-shrink-0">
            <FileUploadZone onFilesSelected={handleFilesSelected} uploadedFiles={[]} trackedFiles={trackedFiles} />
          </div>

          {/* Input Area */}
          <div className="bg-transparent p-4 pb-8 flex-shrink-0">
            <div className="max-w-3xl mx-auto space-y-3">
              {/* YouTube + Web URL row */}
              <div className="grid grid-cols-2 gap-2">
                {/* YouTube URL */}
                <UrlIngestInput
                  icon={<PlaySquare className="w-4 h-4 text-[#ff7a17]" />}
                  placeholder="Paste YouTube URL..."
                  value={youtubeUrl}
                  onChange={(v) => { setYoutubeUrl(v); if (youtubeStatus !== 'idle') setYoutubeStatus('idle') }}
                  onIngest={handleYoutubeIngest}
                  status={youtubeStatus}
                  buttonColor="text-[#ff7a17]"
                />
                {/* Web URL */}
                <UrlIngestInput
                  icon={<Link2 className="w-4 h-4 text-[#06b6d4]" />}
                  placeholder="Paste any web page URL..."
                  value={webUrl}
                  onChange={(v) => { setWebUrl(v); if (webUrlStatus !== 'idle') setWebUrlStatus('idle') }}
                  onIngest={handleWebUrlIngest}
                  status={webUrlStatus}
                  buttonColor="text-[#06b6d4]"
                />
              </div>

              {/* Generating indicator */}
              {isGenerating && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#191919] border border-[#212327]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6366f1]" />
                  <span className="text-xs text-[#7d8187] font-mono">Generating structured output…</span>
                </div>
              )}

              {/* Chat input */}
              <ChatInput onSendMessage={handleSendMessage} isSending={isSending} />
            </div>
          </div>
        </div>
      </div>

      {/* Right: Structured output panel */}
      {activePanel && (
        <div className="w-[45%] border-l border-[#212327] h-full overflow-hidden flex flex-col">
          {activePanel === 'mindmap' && mindmapTree && (
            <MindmapViewer tree={mindmapTree} onClose={() => setActivePanel(null)} />
          )}
          {activePanel === 'flashcards' && flashcards.length > 0 && (
            <FlashcardsPanel
              cards={flashcards}
              currentIdx={currentFlashcardIdx}
              flipped={flashcardFlipped}
              onFlip={() => setFlashcardFlipped((f) => !f)}
              onPrev={() => { setCurrentFlashcardIdx((i) => Math.max(0, i - 1)); setFlashcardFlipped(false) }}
              onNext={() => { setCurrentFlashcardIdx((i) => Math.min(flashcards.length - 1, i + 1)); setFlashcardFlipped(false) }}
              onClose={() => setActivePanel(null)}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// UrlIngestInput — reusable URL input bar
// ---------------------------------------------------------------------------
function UrlIngestInput({
  icon, placeholder, value, onChange, onIngest, status, buttonColor,
}: {
  icon: React.ReactNode
  placeholder: string
  value: string
  onChange: (v: string) => void
  onIngest: () => void
  status: IngestStatus
  buttonColor: string
}) {
  return (
    <div className="flex items-center gap-2 bg-[#191919] px-3 py-1.5 rounded-full border border-[#212327] hover:border-[rgba(255,255,255,0.2)] focus-within:border-[rgba(255,255,255,0.2)] transition-all">
      <span className="flex-shrink-0">{icon}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onIngest()}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-xs text-white focus:outline-none placeholder-[#7d8187] min-w-0 font-normal"
      />
      {status === 'done' ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
      ) : status === 'error' ? (
        <span className="text-[10px] text-red-400 font-mono flex-shrink-0">error</span>
      ) : (
        <button
          onClick={onIngest}
          disabled={!value.trim() || status === 'ingesting'}
          className={cn('text-[10px] font-mono px-2 py-0.5 rounded-full hover:bg-white/5 disabled:opacity-40 transition-colors flex-shrink-0', buttonColor)}
        >
          {status === 'ingesting' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Ingest'}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FlashcardsPanel — interactive flashcard viewer
// ---------------------------------------------------------------------------
function FlashcardsPanel({
  cards, currentIdx, flipped, onFlip, onPrev, onNext, onClose,
}: {
  cards: FlashcardItem[]
  currentIdx: number
  flipped: boolean
  onFlip: () => void
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}) {
  const card = cards[currentIdx]
  const difficultyColor: Record<string, string> = {
    easy: 'text-emerald-400',
    medium: 'text-amber-400',
    hard: 'text-red-400',
  }

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2024] bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Flashcards</span>
          <span className="text-xs text-[#4a4a4a] font-mono">{currentIdx + 1} / {cards.length}</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full text-[#4a4a4a] hover:text-white hover:bg-[#1e2024] transition-colors">
          <span className="text-xs font-mono">✕</span>
        </button>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <div className="w-full max-w-sm">
          {/* Category + difficulty */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono text-[#4a4a4a] uppercase tracking-widest">{card.category}</span>
            <span className={cn('text-[10px] font-mono uppercase', difficultyColor[card.difficulty] || 'text-[#4a4a4a]')}>
              {card.difficulty}
            </span>
          </div>

          {/* Flip card */}
          <button
            onClick={onFlip}
            className="w-full min-h-[180px] p-6 rounded-2xl border border-[#212327] bg-[#141414] hover:border-[rgba(255,255,255,0.15)] transition-all text-left flex flex-col justify-center gap-3"
          >
            <span className="text-[10px] font-mono text-[#4a4a4a] uppercase">{flipped ? 'Answer' : 'Question'}</span>
            <p className="text-white text-sm leading-relaxed font-medium">
              {flipped ? card.back : card.front}
            </p>
            <span className="text-[10px] text-[#4a4a4a] font-mono mt-2">
              {flipped ? 'Click to see question' : 'Click to reveal answer'}
            </span>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={onPrev}
            disabled={currentIdx === 0}
            className="px-4 py-1.5 rounded-full text-xs font-mono border border-[#212327] text-[#7d8187] hover:text-white hover:border-[rgba(255,255,255,0.25)] disabled:opacity-30 transition-all"
          >
            ← Prev
          </button>
          <span className="text-xs text-[#4a4a4a] font-mono w-16 text-center">
            {currentIdx + 1} / {cards.length}
          </span>
          <button
            onClick={onNext}
            disabled={currentIdx === cards.length - 1}
            className="px-4 py-1.5 rounded-full text-xs font-mono border border-[#212327] text-[#7d8187] hover:text-white hover:border-[rgba(255,255,255,0.25)] disabled:opacity-30 transition-all"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ChatInput
// ---------------------------------------------------------------------------
function ChatInput({ onSendMessage, isSending }: { onSendMessage: (msg: string) => void; isSending?: boolean }) {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isSending) {
      onSendMessage(input)
      setInput('')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-end w-full bg-[#191919] border border-[#212327] rounded-full overflow-hidden focus-within:border-[rgba(255,255,255,0.25)] transition-all pl-4 pr-2 py-2"
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e) }}
        placeholder="Ask anything about your ingested content…"
        className="flex-1 bg-transparent text-white placeholder-[#7d8187] focus:outline-none py-2 text-[15px] font-normal min-h-[44px]"
      />
      <div className="flex items-center ml-2 mb-1">
        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className={cn(
            'p-2 rounded-full flex items-center justify-center transition-all',
            input.trim() && !isSending ? 'bg-white text-[#0a0a0a] hover:opacity-90' : 'bg-[#1a1c20] text-[#7d8187]'
          )}
        >
          {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
        </button>
      </div>
    </form>
  )
}
