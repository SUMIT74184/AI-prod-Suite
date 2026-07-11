'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import ChatInterface from '@/components/chat-interface'
import QuickActions from '@/components/quick-actions'
import FileUploadZone from '@/components/file-upload-zone'
import { PlaySquare } from 'lucide-react'

export default function ResearchAssistantPage() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'assistant' as const,
      content: 'Welcome to the AI Research Assistant! I can help you analyze documents, generate summaries, create notes, make flashcards, build quizzes, and manage citations. You can also paste a YouTube URL below for video analysis.',
      timestamp: new Date(),
    },
  ])

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [youtubeUrl, setYoutubeUrl] = useState('')

  const handleSendMessage = async (message: string) => {
    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: message,
      timestamp: new Date(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)

    try {
      const response = await fetch('/api/py/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          youtube_url: youtubeUrl
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
    }
  }

  const handleQuickAction = (action: string) => {
    const prompts: Record<string, string> = {
      summary: 'Please generate a comprehensive summary of the uploaded document or video.',
      notes: 'Create detailed notes from the content.',
      flashcards: 'Generate flashcards for key concepts.',
      quiz: 'Create a quiz with 5 questions based on the content.',
      citations: 'Extract and format all citations.',
      mindmap: 'Generate a hierarchical mind map structure for the key concepts.',
      deck_report: 'Create an outline and slide-by-slide content for a presentation deck.',
    }

    if (prompts[action]) {
      handleSendMessage(prompts[action])
    }
  }

  const handleFilesSelected = (files: File[]) => {
    setUploadedFiles(files)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-2xl font-bold text-foreground">AI Research Assistant</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload documents and analyze them with AI-powered insights
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatInterface messages={messages} />

        {/* Quick Actions */}
        <QuickActions onAction={handleQuickAction} />

        {/* File Upload Zone */}
        <FileUploadZone 
          onFilesSelected={handleFilesSelected}
          uploadedFiles={uploadedFiles}
        />

        {/* Chat Input */}
        <div className="border-t border-border p-4 bg-card">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Youtube URL Input */}
            <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-lg border border-border focus-within:ring-2 focus-within:ring-primary/50 transition-all">
              <PlaySquare className="w-5 h-5 text-red-500" />
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Paste a YouTube URL to analyze..."
                className="flex-1 bg-transparent text-sm text-foreground focus:outline-none placeholder-muted-foreground"
              />
            </div>
            <ChatInput onSendMessage={handleSendMessage} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ChatInput({ onSendMessage }: { onSendMessage: (msg: string) => void }) {
  const [input, setInput] = useState('')
  const [isComposing, setIsComposing] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isComposing) {
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
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        placeholder="Ask me anything about your research..."
        className="flex-1 px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <button
        type="submit"
        disabled={!input.trim()}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        Send
      </button>
    </form>
  )
}
