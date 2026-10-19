'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import ChatInterface from '@/components/shared/chat-interface'
import QuickActions from '@/components/shared/quick-actions'
import FileUploadZone from '@/components/shared/file-upload-zone'
import MindmapViewer, { MindmapNode } from '@/components/shared/mindmap-viewer'
import {
  PlaySquare, Link2, Loader2, CheckCircle2, Database,
  Trash2, ArrowUp, Brain, FileText, BookOpen, Layers,
  Plus, Image as ImageIcon, File as FileIcon, Globe, X,
  FileSpreadsheet, MessageSquare, Lightbulb, Map, UploadCloud, Square
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModuleHeader, EmptyState, MonoLabel, ui } from '@/components/workspace/kit'
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

function ResearchAssistantContent() {
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
        'welcome to Lumina research assistant',
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
  const [streamingMessageId, setStreamingMessageId] = useState<string | undefined>(undefined)
  const abortControllerRef = useRef<AbortController | null>(null)

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
        const res = await fetch(`/api/py/conversations/${urlSessionId}`)
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
  const handleYoutubeIngest = async (url?: string) => {
    const targetUrl = typeof url === 'string' ? url : youtubeUrl;
    if (!targetUrl.trim()) return
    setYoutubeUrl(targetUrl);
    setYoutubeStatus('ingesting')
    setIsIngesting(true)
    try {
      const res = await fetch('/api/py/ingest/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, youtube_url: targetUrl }),
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
  const handleWebUrlIngest = async (url?: string) => {
    const targetUrl = typeof url === 'string' ? url : webUrl;
    if (!targetUrl.trim()) return
    setWebUrl(targetUrl);
    setWebUrlStatus('ingesting')
    setIsIngesting(true)
    try {
      const res = await fetch('/api/py/ingest/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, url: targetUrl }),
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

    const assistantMsgId = (Date.now() + 1).toString()
    setStreamingMessageId(assistantMsgId)
    abortControllerRef.current = new AbortController()

    // Add placeholder assistant message
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: 'assistant' as const, content: '', timestamp: new Date() },
    ])

    try {
      if (messages.length <= 1) window.dispatchEvent(new Event('refresh-conversations'))
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const res = await fetch(`${backendUrl}/api/py/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          session_id: sessionId,
          user_id: userId,
          module: 'research-assistant',
          top_k: topK,
        }),
      })
      if (!res.ok) throw new Error('Backend error')

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream reader')

      const decoder = new TextDecoder()
      let accumulatedText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulatedText += chunk
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: accumulatedText } : msg
          )
        )
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Stream manually stopped
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: 'Error: Could not connect to the backend or stream response. Is the Python server running?' }
              : msg
          )
        )
      }
    } finally {
      setIsSending(false)
      setStreamingMessageId(undefined)
      abortControllerRef.current = null
    }
  }

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  // ---------------------------------------------------------------------------
  // Quick Actions — call /api/py/generate/* endpoints
  // ---------------------------------------------------------------------------
  const handleQuickAction = async (action: string) => {
    // Chat-based actions go through the normal chat flow
    const chatActions: Record<string, string> = {
      quiz: 'Create a quiz with 5 challenging questions based on the key topics in the ingested content (or our conversation history if no content is ingested).',
      citations: 'Extract and format all citations, references, and sources mentioned in the ingested content (or our conversation history).',
      deck_report: 'Generate a comprehensive deck report detailing the main arguments, supporting evidence, and key takeaways from the ingested content (or our conversation history if no content is ingested).',
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
      await fetch(`/api/py/ingest/${sessionId}`, { method: 'DELETE' })
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
    <div className="flex h-full flex-1 overflow-hidden bg-[#0a0a0a]">
      {/* Left: Chat area */}
      <div className={cn('flex h-full min-w-0 flex-col transition-all', activePanel ? 'w-[55%]' : 'w-full')}>
        <ModuleHeader
          index="M.01"
          section="Research"
          title="AI Research"
          accent="Assistant"
          description="RAG-powered document analysis · summary · notes · flashcards · mind maps"
          actions={
            sessionInfo?.has_data && (
              <>
                <span className={ui.chip}>
                  <Database className="h-3 w-3 text-[#ffc285]" />
                  {sessionInfo.total_chunks} chunks · {sessionInfo.sources.length} source{sessionInfo.sources.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={handleClearSession}
                  className={cn(ui.iconBtn, 'hover:bg-red-500/10 hover:text-red-300')}
                  title="Clear all ingested data"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )
          }
        />

        {/* Chat */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {messages.length <= 1 && !isSending ? <ResearchIntro /> : <ChatInterface messages={messages} streamingMessageId={streamingMessageId} />}

          {/* Quick Actions Row */}
          <div className="flex-shrink-0">
            <QuickActions onAction={handleQuickAction} />
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 px-6 pb-6 pt-2">
            <div className="mx-auto max-w-3xl space-y-3">
              {/* Tracked Files Upload Progress */}
              {trackedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {trackedFiles.map((tf, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] py-1 pl-2.5 pr-3">
                      <FileText className="h-3.5 w-3.5 text-[#a0c3ec]" />
                      <span className="max-w-[140px] truncate text-[12px] text-gray-200">{tf.file.name}</span>
                      {tf.status === 'uploading' || tf.status === 'processing' ? (
                        <Loader2 className="h-3 w-3 animate-spin text-[#ffc285]" />
                      ) : tf.status === 'indexed' ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <span className="font-mono text-[10px] uppercase text-red-300">error</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Generating indicator */}
              {isGenerating && (
                <div className="relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-[#ff7a17]/20 bg-[#ff7a17]/[0.05] px-3.5 py-2.5">
                  <span className="lab-beam pointer-events-none absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-[#ff7a17]/15 to-transparent" />
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#ffc285]" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ffc285]">Generating structured output…</span>
                </div>
              )}

              {/* Chat input */}
              <ChatInput
                onSendMessage={handleSendMessage}
                isSending={isSending}
                onFilesSelected={handleFilesSelected}
                onAction={handleQuickAction}
                onYoutubeIngest={(url) => { setYoutubeUrl(url); setTimeout(() => handleYoutubeIngest(url), 10); }}
                onWebUrlIngest={(url) => { setWebUrl(url); setTimeout(() => handleWebUrlIngest(url), 10); }}
                youtubeStatus={youtubeStatus}
                webUrlStatus={webUrlStatus}
                onStopStream={handleStopStream}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right: Structured output panel */}
      {activePanel && (
        <div className="flex h-full w-[45%] flex-col overflow-hidden border-l border-white/[0.06] bg-[#070708]">
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
// ResearchIntro — first-run state before any conversation
// ---------------------------------------------------------------------------
function ResearchIntro() {
  const steps = [
    { n: '01', icon: UploadCloud, title: 'Ingest sources', body: 'PDFs, docs, images, YouTube transcripts or any web page — via the + button.' },
    { n: '02', icon: MessageSquare, title: 'Ask anything', body: 'Answers are retrieved from your sources, not recalled from memory.' },
    { n: '03', icon: Layers, title: 'Generate artefacts', body: 'Summaries, notes, flashcards, quizzes, citations and mind maps.' },
  ]
  return (
    <div className="relative flex-1 overflow-y-auto">
      <EmptyState
        icon={Brain}
        title="Welcome to Lumina."
        accent="Your research bench."
        body="Bring your material, then interrogate it. Every answer is grounded in the sources you've indexed for this session."
      >
        <div className="grid w-full max-w-2xl gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.06] text-left sm:grid-cols-3">
          {steps.map(s => (
            <div key={s.n} className="bg-[#0b0b0c] p-4">
              <div className="mb-3 flex items-center justify-between">
                <s.icon className="h-4 w-4 text-[#ffc285]" strokeWidth={1.5} />
                <span className="font-mono text-[10px] text-gray-600">{s.n}</span>
              </div>
              <p className="text-[13.5px] text-white">{s.title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-gray-500">{s.body}</p>
            </div>
          ))}
        </div>
      </EmptyState>
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
    easy: 'text-emerald-300 border-emerald-400/25 bg-emerald-500/10',
    medium: 'text-amber-300 border-amber-400/25 bg-amber-500/10',
    hard: 'text-red-300 border-red-400/25 bg-red-500/10',
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div>
          <MonoLabel index="◆">Study set</MonoLabel>
          <p className="mt-1 text-[16px] tracking-tight text-white">
            Flashcards <span className="lab-serif text-gray-400">· {cards.length} cards</span>
          </p>
        </div>
        <button onClick={onClose} className={ui.iconBtn} aria-label="Close flashcards">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress */}
      <div className="h-px w-full bg-white/[0.06]">
        <div className="h-px bg-gradient-to-r from-[#ffc285] to-[#ff7a17] transition-all duration-500" style={{ width: `${((currentIdx + 1) / cards.length) * 100}%` }} />
      </div>

      {/* Card */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <div className="lab-grid-bg lab-grid-fade pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative w-full max-w-md">
          <div className="mb-3 flex items-center justify-between">
            <span className={ui.mono}>{card.category}</span>
            <span className={cn('rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider', difficultyColor[card.difficulty] || 'border-white/10 text-gray-400')}>
              {card.difficulty}
            </span>
          </div>

          <button
            onClick={onFlip}
            className={cn(
              'group relative flex min-h-[220px] w-full flex-col justify-between overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300',
              flipped
                ? 'border-[#ff7a17]/30 bg-gradient-to-br from-[#ff7a17]/[0.08] to-transparent shadow-[0_30px_80px_-30px_rgba(255,122,23,0.4)]'
                : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20'
            )}
          >
            <span className={cn('font-mono text-[10.5px] uppercase tracking-[0.16em]', flipped ? 'text-[#ffc285]' : 'text-gray-500')}>
              {flipped ? 'Answer' : 'Question'}
            </span>
            <p className={cn('my-4 leading-relaxed text-white', flipped ? 'text-[15px]' : 'text-[18px] tracking-tight')}>
              {flipped ? card.back : card.front}
            </p>
            <span className="font-mono text-[10px] uppercase tracking-wider text-gray-600 transition-colors group-hover:text-gray-400">
              {flipped ? '↺ Click to see question' : '↻ Click to reveal answer'}
            </span>
          </button>
        </div>

        {/* Navigation */}
        <div className="relative flex items-center gap-4">
          <button onClick={onPrev} disabled={currentIdx === 0} className={ui.btnOutline}>
            ← Prev
          </button>
          <span className="w-16 text-center font-mono text-[12px] tabular-nums text-gray-400">
            {currentIdx + 1} / {cards.length}
          </span>
          <button onClick={onNext} disabled={currentIdx === cards.length - 1} className={ui.btnOutline}>
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
function ChatInput({
  onSendMessage,
  isSending,
  onFilesSelected,
  onAction,
  onYoutubeIngest,
  onWebUrlIngest,
  youtubeStatus,
  webUrlStatus,
  onStopStream
}: {
  onSendMessage: (msg: string) => void;
  isSending?: boolean;
  onFilesSelected: (files: File[]) => void;
  onAction: (action: string) => void;
  onYoutubeIngest: (url: string) => void;
  onWebUrlIngest: (url: string) => void;
  youtubeStatus: string;
  webUrlStatus: string;
  onStopStream: () => void;
}) {
  const [input, setInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [inputMode, setInputMode] = useState<'chat' | 'youtube' | 'web'>('chat');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    if (inputMode === 'youtube') {
      onYoutubeIngest(input);
      setInput('');
      setInputMode('chat');
    } else if (inputMode === 'web') {
      onWebUrlIngest(input);
      setInput('');
      setInputMode('chat');
    } else {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
    setMenuOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const actions = [
    { id: 'summary', label: 'Summary', icon: <FileText className="w-4 h-4" /> },
    { id: 'notes', label: 'Notes', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'flashcards', label: 'Flashcards', icon: <Layers className="w-4 h-4" /> },
    { id: 'quiz', label: 'Quiz', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'citations', label: 'Citations', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'mindmap', label: 'Mindmap', icon: <Map className="w-4 h-4" /> },
    { id: 'deck_report', label: 'Deck Report', icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  return (
    <div className="relative w-full" ref={menuRef}>
      {/* Hidden File Input */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.txt,.md,.csv,.doc,.docx,.png,.jpg,.jpeg"
      />

      {/* Dropdown Menu */}
      {menuOpen && (
        <div className="absolute bottom-full left-0 z-50 mb-3 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#111113]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
          <div className="p-1.5">
            <div className="px-2.5 pb-1.5 pt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">Ingest sources</div>
            {[
              { onClick: handleFileClick, icon: <UploadCloud className="h-4 w-4 text-[#c4b5fd]" />, label: 'Upload files / images', hint: 'PDF · DOCX · TXT · PNG' },
              { onClick: () => { setInputMode('youtube'); setMenuOpen(false); setInput(''); }, icon: <PlaySquare className="h-4 w-4 text-[#ff7a17]" />, label: 'YouTube URL', hint: 'Transcript' },
              { onClick: () => { setInputMode('web'); setMenuOpen(false); setInput(''); }, icon: <Link2 className="h-4 w-4 text-[#a0c3ec]" />, label: 'Web page URL', hint: 'Article · docs' },
            ].map(item => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[13.5px] text-gray-200 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">{item.icon}</span>
                <span className="flex-1">
                  {item.label}
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-gray-600">{item.hint}</span>
                </span>
              </button>
            ))}

            <div className="mx-2 my-1.5 h-px bg-white/[0.06]" />
            <div className="px-2.5 pb-1.5 pt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">Quick actions</div>
            <div className="grid max-h-[220px] grid-cols-2 gap-0.5 overflow-y-auto">
              {actions.map(action => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => { onAction(action.id); setMenuOpen(false); }}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-gray-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <span className="text-gray-500">{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="ws-field relative flex w-full items-center gap-1 rounded-2xl p-1.5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]"
      >
        {/* Left Toggle / Mode Indicator */}
        {inputMode === 'chat' ? (
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl transition-all',
              menuOpen ? 'rotate-45 bg-white/10 text-white' : 'text-gray-400 hover:bg-white/[0.06] hover:text-white'
            )}
            aria-label="Add sources or run an action"
          >
            <Plus className="h-[18px] w-[18px]" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] py-1 pl-2.5 pr-1">
            {inputMode === 'youtube' ? <PlaySquare className="h-3.5 w-3.5 text-[#ff7a17]" /> : <Link2 className="h-3.5 w-3.5 text-[#a0c3ec]" />}
            <span className="font-mono text-[10px] uppercase tracking-wider text-gray-300">{inputMode === 'youtube' ? 'YouTube' : 'Web URL'}</span>
            <button
              type="button"
              onClick={() => { setInputMode('chat'); setInput(''); }}
              className="rounded-md p-1 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Cancel URL mode"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            inputMode === 'youtube' ? "Paste YouTube URL..." :
              inputMode === 'web' ? "Paste any web page URL..." :
                "Ask anything about your ingested content…"
          }
          className="min-h-[40px] flex-1 bg-transparent px-2 text-[14.5px] text-white placeholder-gray-600 focus:outline-none"
        />

        <div className="flex items-center gap-1">
          {/* Status Indicator for URL modes */}
          {(inputMode === 'youtube' && youtubeStatus === 'ingesting') || (inputMode === 'web' && webUrlStatus === 'ingesting') ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin text-[#ffc285]" />
          ) : null}

          {isSending ? (
            <button
              type="button"
              onClick={onStopStream}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white transition-colors hover:bg-white/[0.12]"
              aria-label="Stop generating"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl transition-all',
                input.trim() ? 'bg-white text-black shadow-[0_0_24px_-6px_rgba(255,194,133,0.7)] hover:bg-[#ffc285]' : 'bg-white/[0.04] text-gray-600'
              )}
              aria-label="Send"
            >
              <ArrowUp className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>
      </form>
      <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
        Enter to send · + to ingest sources or run an action
      </p>
    </div>
  )
}

export default function ResearchAssistantPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-5 w-5 animate-spin text-[#ffc285]" />
      </div>
    }>
      <ResearchAssistantContent />
    </Suspense>
  )
}
