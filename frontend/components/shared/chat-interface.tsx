'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
                      : (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-xl font-bold text-white mt-6 mb-4" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-lg font-bold text-white mt-5 mb-3" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-base font-bold text-white mt-4 mb-2" {...props} />,
                              p: ({node, ...props}) => <p className="mb-4 text-[#dadbdf] leading-relaxed text-sm" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-2 mb-4 text-[#dadbdf] text-sm" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal pl-6 space-y-2 mb-4 text-[#dadbdf] text-sm" {...props} />,
                              li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                              em: ({node, ...props}) => <em className="italic text-[#dadbdf]" {...props} />,
                              blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-[#ff7a17] pl-4 py-2 my-4 text-[#a1a1aa] italic bg-[#161616] rounded-r text-sm" {...props} />,
                              table: ({node, ...props}) => (
                                <div className="overflow-x-auto my-6">
                                  <table className="w-full text-left border-collapse text-sm text-[#dadbdf]" {...props} />
                                </div>
                              ),
                              thead: ({node, ...props}) => <thead className="bg-[#1a1c20]" {...props} />,
                              th: ({node, ...props}) => <th className="px-4 py-3 border border-[#212327] font-semibold text-white" {...props} />,
                              td: ({node, ...props}) => <td className="px-4 py-3 border border-[#212327]" {...props} />,
                              hr: ({node, ...props}) => <hr className="my-6 border-[#212327]" {...props} />,
                              code(props) {
                                const {children, className, node, ...rest} = props
                                const match = /language-(\w+)/.exec(className || '')
                                return match ? (
                                  <CodeBlock language={match[1]} content={String(children).replace(/\n$/, '')} />
                                ) : (
                                  <code {...rest} className="px-1.5 py-0.5 mx-0.5 rounded bg-[#202020] border border-[#2d2d2d] text-[#ffc285] font-mono text-[13px] align-middle">
                                    {children}
                                  </code>
                                )
                              }
                            }}
                          >
                            {message.content + (isStreaming ? '\n\n▍' : '')}
                          </ReactMarkdown>
                        </div>
                      )
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
