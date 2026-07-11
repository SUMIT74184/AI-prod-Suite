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
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={cn(
              'flex gap-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-300',
              message.role === 'user' && 'flex-row-reverse'
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              {message.role === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>

            {/* Message Content */}
            <div
              className={cn(
                'flex-1 space-y-1',
                message.role === 'user' && 'text-right'
              )}
            >
              <div
                className={cn(
                  'inline-block px-4 py-3 rounded-lg max-w-2xl break-words',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-secondary text-secondary-foreground rounded-bl-none'
                )}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
              </div>
              {isClient && (
                <p className={cn(
                  'text-xs text-muted-foreground px-4',
                  message.role === 'user' && 'text-right'
                )}>
                  {format(message.timestamp, 'HH:mm')}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
