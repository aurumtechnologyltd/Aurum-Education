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
import { Send, Bot, User, Sparkles, FileQuestion, Trash2, Download, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { ChatSidebar } from './ChatSidebar'

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
  session_id?: string
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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load chat history when session changes
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!currentSessionId) {
        setMessages([])
        return
      }

      setHistoryLoading(true)
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', currentSessionId)
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
          timestamp: new Date(row.created_at || new Date()),
          sources: row.sources as Array<{ chunk_id: number; similarity: number; metadata?: any }> | undefined,
          model_used: row.model_used || undefined,
          provider: row.provider || undefined,
          tokens_used: row.tokens_used as { input: number; output: number } | undefined,
          credits_deducted: row.credits_deducted || undefined,
          session_id: (row as any).session_id
        }))

        setMessages(historyMessages)
      } catch (err) {
        console.error('Error loading chat history:', err)
      } finally {
        setHistoryLoading(false)
      }
    }

    loadChatHistory()
  }, [currentSessionId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleNewChat = () => {
    setCurrentSessionId(null)
    setMessages([])
    setInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      session_id: currentSessionId || undefined
    }

    // Optimistically add user message
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
          session_id: currentSessionId, // Pass current session ID if exists
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      })

      if (error) throw error

      // If a new session was created by the backend, update our state
      if (data.session_id && data.session_id !== currentSessionId) {
        setCurrentSessionId(data.session_id)
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || 'I apologize, but I could not generate a response.',
        timestamp: new Date(),
        sources: data.sources || [],
        session_id: data.session_id
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
    if (!currentSessionId) return

    const confirmClear = window.confirm(
      'Are you sure you want to clear this chat session? This action cannot be undone.'
    )

    if (!confirmClear) return

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', currentSessionId)

      if (error) {
        throw error
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

        messages.forEach((message) => {
          const timestamp = message.timestamp.toLocaleString()
          const role = message.role === 'user' ? 'You' : 'Assistant'

          content += `[${timestamp}] ${role}:\n`
          content += `${message.content}\n`

          // Add sources for assistant messages
          if (message.role === 'assistant' && message.sources && message.sources.length > 0) {
            content += `Sources: ${message.sources.map(s => `Chunk ${s.chunk_id}`).join(', ')}\n`
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

        messages.forEach((message) => {
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
      <Card className="border-dashed h-[600px] flex items-center justify-center">
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
    <div className="flex h-[600px] gap-4">
      {/* Sidebar */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          isSidebarOpen ? "w-64 flex-shrink-0" : "w-0"
        )}
      >
        <ChatSidebar
          courseId={courseId}
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onNewChat={handleNewChat}
        />
      </div>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="h-8 w-8"
              title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </Button>
            <h3 className="text-sm font-medium text-muted-foreground">
              {currentSessionId ? 'Current Chat' : 'Select or Start a New Chat'}
            </h3>
          </div>

          {messages.length > 0 && (
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
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
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={loading || historyLoading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Chat
              </Button>
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 min-h-0 overflow-hidden bg-background">
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto p-4"
          >
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <h3 className="text-lg font-medium mb-2">Loading Chat...</h3>
              </div>
            ) : !currentSessionId ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 opacity-50">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Select a chat from the sidebar or start a new one.</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Start a New Conversation</h3>
                <p className="text-muted-foreground max-w-sm mb-6">
                  Ask questions about your syllabus or course materials.
                </p>
                <div className="space-y-2 text-sm w-full max-w-sm mx-auto">
                  <button
                    className="block w-full text-left px-4 py-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-transparent hover:border-border"
                    onClick={() => setInput("What are the key topics in this course?")}
                  >
                    "What are the key topics in this course?"
                  </button>
                  <button
                    className="block w-full text-left px-4 py-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-transparent hover:border-border"
                    onClick={() => setInput("When are the assignments due?")}
                  >
                    "When are the assignments due?"
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-3xl mx-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-4 group',
                      message.role === 'user' ? 'flex-row-reverse' : ''
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border'
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
                        'flex-1 max-w-[85%]',
                        message.role === 'user' ? 'text-right' : ''
                      )}
                    >
                      <div className={cn(
                        "inline-block rounded-2xl px-4 py-3 shadow-sm",
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-card border text-card-foreground rounded-tl-sm'
                      )}>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                      </div>

                      {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                        <div className="mt-2 pl-1">
                          <p className="text-xs text-muted-foreground mb-1.5 font-medium flex items-center gap-1">
                            <FileQuestion className="w-3 h-3" /> Sources
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {message.sources.map((source, idx) => (
                              <div
                                key={idx}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-muted/50 text-muted-foreground border hover:bg-muted transition-colors cursor-help"
                                title={`Original Chunk ID: ${source.chunk_id} (Similarity: ${(source.similarity * 100).toFixed(0)}%)`}
                              >
                                {source.metadata?.page_number ? `Page ${source.metadata.page_number}` : `Source ${idx + 1}`}
                                <span className="ml-1.5 opacity-50">|</span>
                                <span className="ml-1.5 font-mono text-[10px] opacity-70">
                                  {(source.similarity * 100).toFixed(0)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center shadow-sm">
                      <Bot className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="bg-card border rounded-2xl rounded-tl-sm px-4 py-4 shadow-sm">
                      <div className="flex gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-3 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={currentSessionId ? "Ask about your syllabus..." : "Start a new chat first..."}
                disabled={loading} // Removing !currentSessionId check to allow "New Chat" on first message if none selected? 
                // Wait, if no session ID, we create one automatically on first message.
                // So enabling input is fine.
                className="flex-1 pr-12 h-11 shadow-sm"
              />
              <div className="absolute right-1.5 top-1.5">
                <Button
                  type="submit"
                  size="icon"
                  disabled={loading || !input.trim()}
                  className="h-8 w-8"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              AI can make mistakes. Please verify important information from your original documents.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

