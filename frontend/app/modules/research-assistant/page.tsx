'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
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
          <ChatInterface messages={messages} streamingMessageId={streamingMessageId} />

          {/* Quick Actions Row */}
          <div className="flex-shrink-0 pt-2 pb-0">
            <QuickActions onAction={handleQuickAction} />
          </div>

          {/* Input Area */}
          <div className="bg-transparent p-4 pb-8 flex-shrink-0">
            <div className="max-w-3xl mx-auto space-y-3">
              {/* Tracked Files Upload Progress */}
              {trackedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {trackedFiles.map((tf, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-[#191919] border border-[#212327] rounded-full">
                      <FileText className="w-3.5 h-3.5 text-[#7d8187]" />
                      <span className="text-xs text-white max-w-[120px] truncate">{tf.file.name}</span>
                      {tf.status === 'uploading' || tf.status === 'processing' ? (
                        <Loader2 className="w-3 h-3 animate-spin text-[#ffc285]" />
                      ) : tf.status === 'indexed' ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <span className="text-[10px] text-red-400 font-mono">error</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Generating indicator */}
              {isGenerating && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#191919] border border-[#212327]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6366f1]" />
                  <span className="text-xs text-[#7d8187] font-mono">Generating structured output…</span>
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
        <div className="absolute bottom-full left-0 mb-3 w-64 bg-[#1a1c20] border border-[#2a2d32] rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
          <div className="p-1">
            <div className="px-3 py-2 text-xs font-semibold text-[#7d8187] uppercase tracking-wider">Ingest Sources</div>
            <button
              type="button"
              onClick={handleFileClick}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-[#2a2d32] rounded-lg transition-colors text-left"
            >
              <UploadCloud className="w-4 h-4 text-[#a855f7]" />
              Upload Files / Images
            </button>
            <button
              type="button"
              onClick={() => { setInputMode('youtube'); setMenuOpen(false); setInput(''); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-[#2a2d32] rounded-lg transition-colors text-left"
            >
              <PlaySquare className="w-4 h-4 text-[#ff7a17]" />
              Ingest YouTube URL
            </button>
            <button
              type="button"
              onClick={() => { setInputMode('web'); setMenuOpen(false); setInput(''); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-[#2a2d32] rounded-lg transition-colors text-left"
            >
              <Link2 className="w-4 h-4 text-[#06b6d4]" />
              Ingest Web URL
            </button>

            <div className="h-px bg-[#2a2d32] my-1 mx-2" />
            <div className="px-3 py-2 text-xs font-semibold text-[#7d8187] uppercase tracking-wider">Quick Actions</div>
            <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
              {actions.map(action => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => { onAction(action.id); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-[#2a2d32] rounded-lg transition-colors text-left"
                >
                  <span className="text-[#a1a1aa]">{action.icon}</span>
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
        className="relative flex items-center w-full bg-[#191919] border border-[#212327] rounded-3xl overflow-hidden focus-within:border-[rgba(255,255,255,0.25)] transition-all pl-2 pr-2 py-1"
      >
        {/* Left Toggle / Mode Indicator */}
        {inputMode === 'chat' ? (
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 ml-1 rounded-full text-[#7d8187] hover:text-white hover:bg-[#2a2d32] transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        ) : (
          <div className="flex items-center gap-2 pl-3">
            {inputMode === 'youtube' ? <PlaySquare className="w-5 h-5 text-[#ff7a17]" /> : <Link2 className="w-5 h-5 text-[#06b6d4]" />}
            <button
              type="button"
              onClick={() => { setInputMode('chat'); setInput(''); }}
              className="p-1 rounded-full text-[#7d8187] hover:text-white hover:bg-[#2a2d32] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
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
          className="flex-1 bg-transparent text-white placeholder-[#7d8187] focus:outline-none px-3 py-2.5 text-[15px] font-normal min-h-[44px]"
        />

        <div className="flex items-center ml-2">
          {/* Status Indicator for URL modes */}
          {(inputMode === 'youtube' && youtubeStatus === 'ingesting') || (inputMode === 'web' && webUrlStatus === 'ingesting') ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#7d8187] mr-2" />
          ) : null}

          {isSending ? (
            <button
              type="button"
              onClick={onStopStream}
              className="p-2 rounded-full flex items-center justify-center transition-all bg-[#2a2d32] hover:bg-[#3a3d42] text-white"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className={cn(
                'p-2 rounded-full flex items-center justify-center transition-all',
                input.trim() ? 'bg-white text-[#0a0a0a] hover:opacity-90' : 'bg-[#1a1c20] text-[#7d8187]'
              )}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
