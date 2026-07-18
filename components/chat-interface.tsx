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
}

export default function ChatInterface({ messages }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {messages.map(message => (
          <div
            key={message.id}
            className="flex gap-4 group xai-animate-in w-full"
          >
            {/* Avatar */}
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border',
                message.role === 'user'
                  ? 'bg-[#1a1c20] border-[#212327] text-[#7d8187]'
                  : 'bg-[#ff7a17] border-[#ff7a17] text-white'
              )}
            >
              {message.role === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>

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
              <div className="text-[#dadbdf] leading-relaxed max-w-none whitespace-pre-wrap xai-body-md">
                {message.content}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} className="h-4" />
      </div>
    </div>
  )
}
