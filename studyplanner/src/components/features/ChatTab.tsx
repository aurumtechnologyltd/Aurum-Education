import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Send, Bot, User, Sparkles, FileQuestion, Trash2, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Array<{ chunk_id: number; similarity: number; metadata?: any }>
  model_used?: string
  provider?: string
  tokens_used?: { input: number; output: number }
  credits_deducted?: number
}

interface ChatTabProps {
  courseId: string
  hasDocuments: boolean
}

export function ChatTab({ courseId, hasDocuments }: ChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load chat history when courseId changes
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!courseId) return

      setHistoryLoading(true)
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('course_id', courseId)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Failed to load chat history:', error)
          return
        }

        // Map database rows to Message interface
        const historyMessages: Message[] = (data || []).map(row => ({
          id: row.id,
          role: row.role as 'user' | 'assistant',
          content: row.content,
          timestamp: new Date(row.created_at),
          sources: row.sources as Array<{ chunk_id: number; similarity: number; metadata?: any }> | undefined,
          model_used: row.model_used || undefined,
          provider: row.provider || undefined,
          tokens_used: row.tokens_used as { input: number; output: number } | undefined,
          credits_deducted: row.credits_deducted || undefined,
        }))

        setMessages(historyMessages)
      } catch (err) {
        console.error('Error loading chat history:', err)
      } finally {
        setHistoryLoading(false)
      }
    }

    loadChatHistory()
  }, [courseId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      // Call the RAG Edge Function
      const { data, error } = await supabase.functions.invoke('chat-rag', {
        body: {
          course_id: courseId,
          query: userMessage.content,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      })

      if (error) throw error

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || 'I apologize, but I could not generate a response.',
        timestamp: new Date(),
        sources: data.sources || [],
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      console.error('Chat error:', err)
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure you have uploaded and processed a syllabus document first. Note: Study resources are not used for chat.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleClearHistory = async () => {
    const confirmClear = window.confirm(
      'Are you sure you want to clear all chat history for this course? This action cannot be undone.'
    )

    if (!confirmClear) return

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('course_id', courseId)

      if (error) {
        console.error('Failed to clear chat history:', error)
        alert('Failed to clear chat history. Please try again.')
        return
      }

      // Clear local state
      setMessages([])
    } catch (err) {
      console.error('Error clearing chat history:', err)
      alert('Failed to clear chat history. Please try again.')
    }
  }

  const handleExportTranscript = async (format: 'txt' | 'md' = 'txt') => {
    if (messages.length === 0) return

    try {
      // Get course information for filename
      const { data: course } = await supabase
        .from('courses')
        .select('name')
        .eq('id', courseId)
        .single()

      const courseName = course?.name || 'Unknown Course'
      const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const filename = `Aurum Chat Transcript - ${courseName} - ${date}.${format}`

      let content = ''

      if (format === 'txt') {
        // Plain text format
        content = `Aurum Education - Chat Transcript\n`
        content += `Course: ${courseName}\n`
        content += `Date: ${new Date().toLocaleDateString()}\n`
        content += `Messages: ${messages.length}\n`
        content += `========================================\n\n`

        messages.forEach((message, index) => {
          const timestamp = message.timestamp.toLocaleString()
          const role = message.role === 'user' ? 'You' : 'Assistant'

          content += `[${timestamp}] ${role}:\n`
          content += `${message.content}\n`

          // Add sources for assistant messages
          if (message.role === 'assistant' && message.sources && message.sources.length > 0) {
            content += `Sources: ${message.sources.map(s => `Chunk ${s.chunk_id}`).join(', ')}\n`
          }

          // Add metadata for assistant messages
          if (message.role === 'assistant' && message.model_used) {
            content += `Model: ${message.model_used} (${message.provider})\n`
            if (message.tokens_used) {
              content += `Tokens: ${message.tokens_used.input} input, ${message.tokens_used.output} output\n`
            }
            if (message.credits_deducted && message.credits_deducted > 0) {
              content += `Credits: ${message.credits_deducted}\n`
            }
          }

          content += '\n'
        })
      } else {
        // Markdown format
        content = `# Aurum Education - Chat Transcript\n\n`
        content += `**Course:** ${courseName}\n`
        content += `**Date:** ${new Date().toLocaleDateString()}\n`
        content += `**Messages:** ${messages.length}\n\n`
        content += `---\n\n`

        messages.forEach((message, index) => {
          const timestamp = message.timestamp.toLocaleString()
          const role = message.role === 'user' ? '👤 You' : '🤖 Assistant'

          content += `## ${role} (${timestamp})\n\n`
          content += `${message.content}\n\n`

          // Add sources for assistant messages
          if (message.role === 'assistant' && message.sources && message.sources.length > 0) {
            content += `**Sources:**\n`
            message.sources.forEach(source => {
              content += `- Chunk ${source.chunk_id} (similarity: ${(source.similarity * 100).toFixed(1)}%)\n`
            })
            content += '\n'
          }

          // Add metadata for assistant messages
          if (message.role === 'assistant' && message.model_used) {
            content += `**Model:** ${message.model_used} (${message.provider})\n`
            if (message.tokens_used) {
              content += `**Tokens:** ${message.tokens_used.input} input, ${message.tokens_used.output} output\n`
            }
            if (message.credits_deducted && message.credits_deducted > 0) {
              content += `**Credits:** ${message.credits_deducted}\n`
            }
            content += '\n'
          }

          content += `---\n\n`
        })
      }

      // Create and trigger download
      const blob = new Blob([content], { type: format === 'md' ? 'text/markdown' : 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

    } catch (err) {
      console.error('Error exporting transcript:', err)
      alert('Failed to export transcript. Please try again.')
    }
  }

  if (!hasDocuments) {
    return (
      <Card className="border-dashed">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <FileQuestion className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Documents Yet</h3>
          <p className="text-muted-foreground max-w-sm">
            Upload and process a syllabus document in the Documents tab to start chatting with your course materials.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-[600px] overflow-hidden">
      {/* Chat Header */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-sm font-medium text-muted-foreground">Chat History</h3>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || historyLoading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExportTranscript('txt')}>
                  Export as .txt
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportTranscript('md')}>
                  Export as .md
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearHistory}
              className="text-destructive hover:text-destructive"
              disabled={loading || historyLoading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear History
            </Button>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div 
          ref={scrollRef}
          className="h-full overflow-y-auto p-4"
        >
        {historyLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h3 className="text-lg font-medium mb-2">Loading Chat History</h3>
            <p className="text-muted-foreground max-w-sm">
              Retrieving your previous conversations...
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Ask About Your Syllabus</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              I can help you understand your course materials. Try asking:
            </p>
            <div className="space-y-2 text-sm">
              <button 
                className="block w-full text-left px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                onClick={() => setInput("When is the midterm exam?")}
              >
                "When is the midterm exam?"
              </button>
              <button 
                className="block w-full text-left px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                onClick={() => setInput("What's the grading policy?")}
              >
                "What's the grading policy?"
              </button>
              <button 
                className="block w-full text-left px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                onClick={() => setInput("Summarize the course objectives")}
              >
                "Summarize the course objectives"
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3 max-w-[85%]',
                  message.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={cn(
                    'px-4 py-3 rounded-2xl text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted text-foreground rounded-tl-sm'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Sources:</p>
                      <div className="flex flex-wrap gap-1">
                        {message.sources.map((source, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground"
                            title={`Similarity: ${(source.similarity * 100).toFixed(1)}%`}
                          >
                            Chunk {source.chunk_id}
                            {source.metadata?.chunk_index !== undefined && ` (Page ${Math.floor((source.metadata.chunk_index as number) / 5) + 1})`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t p-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your syllabus..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  )
}

