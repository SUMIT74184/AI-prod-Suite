'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatInterfaceProps {
  messages: Message[]
  streamingMessageId?: string
}

// ---------------------------------------------------------------------------
// Markdown Parsing Helpers
// ---------------------------------------------------------------------------

interface Block {
  type: 'code' | 'text'
  language?: string
  content: string
}

const parseBlocks = (text: string): Block[] => {
  const lines = text.split('\n')
  const blocks: Block[] = []
  let inCodeBlock = false
  let currentLanguage = ''
  let currentContent: string[] = []

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({
          type: 'code',
          language: currentLanguage,
          content: currentContent.join('\n'),
        })
        inCodeBlock = false
        currentLanguage = ''
        currentContent = []
      } else {
        if (currentContent.length > 0) {
          blocks.push({
            type: 'text',
            content: currentContent.join('\n'),
          })
        }
        inCodeBlock = true
        currentLanguage = line.trim().slice(3).trim()
        currentContent = []
      }
    } else {
      currentContent.push(line)
    }
  }

  if (currentContent.length > 0) {
    blocks.push({
      type: inCodeBlock ? 'code' : 'text',
      language: inCodeBlock ? currentLanguage : undefined,
      content: currentContent.join('\n'),
    })
  }

  return blocks
}

function CodeBlock({ language, content }: { language?: string; content: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-4 rounded-xl border border-[#212327] bg-[#111111] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#212327] bg-[#161616] text-xs font-mono text-[#7d8187]">
        <span>{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="px-2.5 py-1 rounded border border-[#212327] hover:bg-[#202020] hover:text-white transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] font-mono text-[#dadbdf] leading-relaxed custom-scrollbar bg-[#0d0d0d]">
        <code>{content}</code>
      </pre>
    </div>
  )
}

const renderInlineStyles = (text: string, appendCursor: boolean) => {
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
  const parts = text.split(regex)

  const jsxParts = parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="px-1.5 py-0.5 mx-0.5 rounded bg-[#202020] border border-[#2d2d2d] text-[#ffc285] font-mono text-[13px] align-middle">
          {part.slice(1, -1)}
        </code>
      )
    } else if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    } else if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index} className="italic text-[#dadbdf]">{part.slice(1, -1)}</em>
    }
    return part
  })

  if (appendCursor) {
    jsxParts.push(
      <span
        key="cursor"
        className="inline-block w-1.5 h-4 ml-1 bg-[#ff7a17] animate-[pulse_1s_infinite] align-middle"
      />
    )
  }

  return <>{jsxParts}</>
}

const renderTextBlock = (text: string, isStreamingMessage: boolean, isLastBlock: boolean) => {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let currentList: React.ReactNode[] = []
  let currentListType: 'ul' | 'ol' | null = null

  const flushList = (key: string) => {
    if (currentList.length > 0) {
      if (currentListType === 'ul') {
        elements.push(
          <ul key={`ul-${key}`} className="list-disc pl-6 space-y-1.5 my-2 text-[#dadbdf]">
            {currentList}
          </ul>
        )
      } else if (currentListType === 'ol') {
        elements.push(
          <ol key={`ol-${key}`} className="list-decimal pl-6 space-y-1.5 my-2 text-[#dadbdf]">
            {currentList}
          </ol>
        )
      }
      currentList = []
      currentListType = null
    }
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    const isLastLine = idx === lines.length - 1

    if (trimmed.startsWith('# ')) {
      flushList(idx.toString())
      elements.push(
        <h1 key={idx} className="text-xl font-bold text-white mt-4 mb-2">
          {renderInlineStyles(trimmed.slice(2), isStreamingMessage && isLastBlock && isLastLine)}
        </h1>
      )
    } else if (trimmed.startsWith('## ')) {
      flushList(idx.toString())
      elements.push(
        <h2 key={idx} className="text-lg font-bold text-white mt-3 mb-2">
          {renderInlineStyles(trimmed.slice(3), isStreamingMessage && isLastBlock && isLastLine)}
        </h2>
      )
    } else if (trimmed.startsWith('### ')) {
      flushList(idx.toString())
      elements.push(
        <h3 key={idx} className="text-base font-bold text-white mt-2.5 mb-1.5">
          {renderInlineStyles(trimmed.slice(4), isStreamingMessage && isLastBlock && isLastLine)}
        </h3>
      )
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (currentListType !== 'ul') {
        flushList(idx.toString())
        currentListType = 'ul'
      }
      currentList.push(
        <li key={idx} className="leading-relaxed">
          {renderInlineStyles(trimmed.slice(2), isStreamingMessage && isLastBlock && isLastLine)}
        </li>
      )
    } else if (/^\d+\.\s/.test(trimmed)) {
      if (currentListType !== 'ol') {
        flushList(idx.toString())
        currentListType = 'ol'
      }
      const content = trimmed.replace(/^\d+\.\s/, '')
      currentList.push(
        <li key={idx} className="leading-relaxed">
          {renderInlineStyles(content, isStreamingMessage && isLastBlock && isLastLine)}
        </li>
      )
    } else if (trimmed.startsWith('> ')) {
      flushList(idx.toString())
      elements.push(
        <blockquote key={idx} className="border-l-2 border-[#ff7a17] pl-4 py-1 my-2 text-[#a1a1aa] italic bg-[#161616] rounded-r">
          {renderInlineStyles(trimmed.slice(2), isStreamingMessage && isLastBlock && isLastLine)}
        </blockquote>
      )
    } else {
      if (trimmed === '') {
        flushList(idx.toString())
        elements.push(<div key={idx} className="h-2" />)
      } else {
        flushList(idx.toString())
        elements.push(
          <p key={idx} className="my-1.5 leading-relaxed text-[#dadbdf]">
            {renderInlineStyles(trimmed, isStreamingMessage && isLastBlock && isLastLine)}
          </p>
        )
      }
    }
  })

  flushList('final')
  return elements
}

const renderMessageContent = (content: string, isStreamingMessage: boolean) => {
  const blocks = parseBlocks(content)
  return (
    <div className="space-y-1">
      {blocks.map((block, idx) => {
        const isLastBlock = idx === blocks.length - 1
        if (block.type === 'code') {
          return (
            <CodeBlock
              key={idx}
              language={block.language}
              content={block.content}
            />
          )
        } else {
          return (
            <div key={idx}>
              {renderTextBlock(block.content, isStreamingMessage, isLastBlock)}
            </div>
          )
        }
      })}
    </div>
  )
}

function AIWaveLoader() {
  return (
    <div className="flex items-center justify-center gap-[2px] h-[14px] w-[14px]">
      <style>{`
        @keyframes ai-wave-pulse {
          0%, 100% { height: 4px; }
          50% { height: 14px; }
        }
      `}</style>
      <div 
        className="w-[2px] rounded-full bg-white" 
        style={{ animation: 'ai-wave-pulse 0.8s ease-in-out infinite', animationDelay: '0s' }} 
      />
      <div 
        className="w-[2px] rounded-full bg-white" 
        style={{ animation: 'ai-wave-pulse 0.8s ease-in-out infinite', animationDelay: '0.15s' }} 
      />
      <div 
        className="w-[2px] rounded-full bg-white" 
        style={{ animation: 'ai-wave-pulse 0.8s ease-in-out infinite', animationDelay: '0.3s' }} 
      />
      <div 
        className="w-[2px] rounded-full bg-white" 
        style={{ animation: 'ai-wave-pulse 0.8s ease-in-out infinite', animationDelay: '0.45s' }} 
      />
    </div>
  )
}

function RoundWaveAvatar() {
  return (
    <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5">
      <div className="relative w-8 h-8 flex items-center justify-center">
        <style>{`
          @keyframes siri-pulse {
            0%, 100% { transform: scale(0.85); opacity: 0.5; }
            50% { transform: scale(1.15); opacity: 0.9; }
          }
          @keyframes siri-rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        {/* Wave Layer 1 */}
        <div 
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#ff7a17] via-[#ffb97a] to-[#ff7a17] opacity-60 blur-[1px]"
          style={{ 
            animation: 'siri-pulse 1.4s ease-in-out infinite, siri-rotate 5s linear infinite',
          }}
        />
        {/* Wave Layer 2 */}
        <div 
          className="absolute inset-[3px] rounded-full bg-gradient-to-br from-[#7c3aed] via-[#ff7a17] to-[#a0c3ec] opacity-50 blur-[2px]"
          style={{ 
            animation: 'siri-pulse 1.8s ease-in-out infinite, siri-rotate 4s linear infinite reverse',
            animationDelay: '0.2s'
          }}
        />
        {/* Wave Layer 3 */}
        <div 
          className="absolute inset-[5px] rounded-full bg-gradient-to-r from-[#ff7a17] to-[#7c3aed] opacity-70 blur-[1.5px]"
          style={{ 
            animation: 'siri-pulse 1.1s ease-in-out infinite',
            animationDelay: '0.4s'
          }}
        />
        {/* Center glowing core */}
        <div className="absolute w-2.5 h-2.5 rounded-full bg-white opacity-95 shadow-[0_0_8px_#ffffff]" />
      </div>
    </div>
  )
}

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-2 px-1 text-[#7d8187]">
      <span className="text-xs font-mono select-none">Thinking</span>
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a17] animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a17] animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a17] animate-bounce" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ChatInterface({ messages, streamingMessageId }: ChatInterfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleScroll = () => {
    const container = containerRef.current
    if (!container) return
    const threshold = 100
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold
    isAtBottomRef.current = isAtBottom
  }

  const scrollToBottom = (force = false) => {
    const container = containerRef.current
    if (!container) return
    if (isAtBottomRef.current || force) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'auto',
      })
    }
  }

  // Scroll on message updates (force on user send, auto on stream)
  useEffect(() => {
    const isUserLast = messages[messages.length - 1]?.role === 'user'
    scrollToBottom(isUserLast)
  }, [messages])

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto bg-[#0a0a0a] custom-scrollbar"
    >
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {messages.map(message => {
          const isStreaming = message.id === streamingMessageId
          return (
            <div
              key={message.id}
              className="flex gap-4 group xai-animate-in w-full"
            >
              {/* Avatar */}
              {message.role === 'user' ? (
                <div className="relative flex-shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-[#1a1c20] border border-[#212327] text-[#7d8187] flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <RoundWaveAvatar />
              )}

              {/* Message Content */}
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-normal text-white">
                    {message.role === 'user' ? 'You' : 'Agent'}
                  </span>
                  {isClient && (
                    <span className="xai-caption-mono-sm text-[#7d8187] opacity-0 group-hover:opacity-100 transition-opacity">
                      {format(message.timestamp, 'HH:mm')}
                    </span>
                  )}
                </div>
                <div className="text-[#dadbdf] leading-relaxed max-w-none xai-body-md">
                  {message.role === 'user'
                    ? <div className="whitespace-pre-wrap">{message.content}</div>
                    : message.content === ''
                      ? <ThinkingIndicator />
                      : renderMessageContent(message.content, isStreaming)
                  }
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
