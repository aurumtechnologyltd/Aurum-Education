import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Plus, MessageSquare, Trash2, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ChatSession {
    id: string
    title: string
    updated_at: string
}

interface ChatSidebarProps {
    courseId: string
    currentSessionId: string | null
    onSelectSession: (sessionId: string) => void
    onNewChat: () => void
    disabled?: boolean
}

export function ChatSidebar({
    courseId,
    currentSessionId,
    onSelectSession,
    onNewChat,
    disabled
}: ChatSidebarProps) {
    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadSessions()
    }, [courseId, currentSessionId])

    const loadSessions = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('chat_sessions' as any)
                .select('id, title, updated_at')
                .eq('course_id', courseId)
                .order('updated_at', { ascending: false })

            if (error) throw error
            setSessions((data as any) || [])
        } catch (err) {
            console.error('Failed to load sessions:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation()
        if (!window.confirm('Are you sure you want to delete this chat?')) return

        try {
            const { error } = await supabase
                .from('chat_sessions' as any)
                .delete()
                .eq('id', sessionId)

            if (error) throw error

            setSessions(prev => prev.filter(s => s.id !== sessionId))
            if (currentSessionId === sessionId) {
                onNewChat()
            }
        } catch (err) {
            console.error('Failed to delete session:', err)
        }
    }

    return (
        <div className="w-64 border-r h-full flex flex-col bg-muted/10">
            <div className="p-4">
                <Button
                    onClick={onNewChat}
                    className="w-full justify-start gap-2"
                    variant="outline"
                    disabled={disabled}
                >
                    <Plus className="w-4 h-4" />
                    New Chat
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
                {loading ? (
                    <div className="text-center py-4 text-xs text-muted-foreground">
                        Loading...
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-8 px-4 text-xs text-muted-foreground">
                        No chat history yet. Start a new conversation!
                    </div>
                ) : (
                    sessions.map(session => (
                        <div
                            key={session.id}
                            onClick={() => onSelectSession(session.id)}
                            className={cn(
                                "group flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer transition-colors hover:bg-muted",
                                currentSessionId === session.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground"
                            )}
                        >
                            <MessageSquare className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1 truncate text-left">
                                {session.title || 'Untitled Chat'}
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <MoreVertical className="w-3 h-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={(e) => handleDeleteSession(e as any, session.id)}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
