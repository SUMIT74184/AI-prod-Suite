'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { Markdown } from '@/components/workspace/markdown'

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

function AIWaveLoader() {
  return (
    <div className="flex items-center justify-center gap-[2px] h-[10px] w-[12px]">
      <style>{`
        @keyframes ai-wave-pulse {
          0%, 100% { height: 3px; }
          50% { height: 10px; }
        }
      `}</style>
      <div 
        className="w-[2px] rounded-full bg-[#ffc285]" 
        style={{ animation: 'ai-wave-pulse 0.8s ease-in-out infinite', animationDelay: '0s' }} 
      />
      <div 
        className="w-[2px] rounded-full bg-[#ffc285]" 
        style={{ animation: 'ai-wave-pulse 0.8s ease-in-out infinite', animationDelay: '0.15s' }} 
      />
      <div 
        className="w-[2px] rounded-full bg-[#ffc285]" 
        style={{ animation: 'ai-wave-pulse 0.8s ease-in-out infinite', animationDelay: '0.3s' }} 
      />
      <div 
        className="w-[2px] rounded-full bg-[#ffc285]" 
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
    <div className="flex items-center gap-2 py-1 text-gray-500">
      <span className="select-none font-mono text-[10.5px] uppercase tracking-[0.16em]">Thinking</span>
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
      className="flex-1 overflow-y-auto bg-transparent"
    >
      <div className="mx-auto max-w-3xl space-y-8 px-6 py-10">
        {messages.map(message => {
          const isStreaming = message.id === streamingMessageId

          if (message.role === 'user') {
            return (
              <div key={message.id} className="xai-animate-in group flex justify-end">
                <div className="max-w-[85%]">
                  <div className="mb-1.5 flex items-center justify-end gap-2">
                    {isClient && (
                      <span className="font-mono text-[10px] text-gray-600 opacity-0 transition-opacity group-hover:opacity-100">
                        {format(message.timestamp, 'HH:mm')}
                      </span>
                    )}
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-gray-500">You</span>
                  </div>
                  <div className="whitespace-pre-wrap rounded-2xl rounded-tr-md border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[14.5px] leading-relaxed text-gray-100">
                    {message.content}
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div key={message.id} className="xai-animate-in group flex w-full gap-4">
              <RoundWaveAvatar />
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#ffc285]">Agent</span>
                  {isStreaming && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff7a17]/25 bg-[#ff7a17]/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-[#ffc285]">
                      <AIWaveLoader />
                      Streaming
                    </span>
                  )}
                  {isClient && (
                    <span className="font-mono text-[10px] text-gray-600 opacity-0 transition-opacity group-hover:opacity-100">
                      {format(message.timestamp, 'HH:mm')}
                    </span>
                  )}
                </div>
                {message.content === ''
                  ? <ThinkingIndicator />
                  : <Markdown content={message.content + (isStreaming ? ' ▍' : '')} />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
