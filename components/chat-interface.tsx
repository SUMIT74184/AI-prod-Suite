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
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {messages.map(message => (
          <div
            key={message.id}
            className="flex gap-5 group animate-in fade-in-50 duration-500 w-full"
          >
            {/* Avatar */}
            <div
              className={cn(
                'w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-1',
                message.role === 'user'
                  ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                  : 'bg-[#D97757] text-white shadow-sm'
              )}
            >
              {message.role === 'user' ? (
                <User className="w-5 h-5" />
              ) : (
                <Bot className="w-5 h-5" />
              )}
            </div>

            {/* Message Content */}
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {message.role === 'user' ? 'You' : 'Agent'}
                </span>
                {isClient && (
                  <span className="text-xs text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    {format(message.timestamp, 'HH:mm')}
                  </span>
                )}
              </div>
              <div className="text-foreground/90 leading-relaxed max-w-none whitespace-pre-wrap">
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
