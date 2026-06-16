import { useMemo, useState } from 'react'
import { Hash, Search, Lock, Pin, Bot as BotIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useChat } from '@/contexts/ChatContext'
import { useAuth } from '@/contexts/AuthContext'
import { initials } from '@/lib/format'

export function ChatSidebar({ onSelect }: { onSelect?: () => void }) {
  const {
    channels,
    conversations,
    members,
    onlineIds,
    view,
    unreadByChannel,
    selectChannel,
    selectDm,
  } = useChat()
  const { user } = useAuth()
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return members
      .filter((m) => m.id !== user?.id)
      .filter(
        (m) =>
          m.username.toLowerCase().includes(q) || (m.nickname || '').toLowerCase().includes(q),
      )
      .slice(0, 8)
  }, [query, members, user?.id])

  const pick = (fn: () => void) => {
    fn()
    setQuery('')
    onSelect?.()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-border border-b p-2">
        <div className="relative">
          <Search className="-translate-y-1/2 absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索成员发起私信"
            className="[&_input]:pl-8"
          />
        </div>
        {matches.length > 0 && (
          <div className="mt-2 overflow-hidden rounded-lg border">
            {matches.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => pick(() => selectDm(m.id))}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent/60"
              >
                <Avatar className="size-6">
                  <AvatarImage src={m.avatar_url || undefined} />
                  <AvatarFallback>{initials(m.nickname || m.username)}</AvatarFallback>
                </Avatar>
                <span className="truncate font-medium">{m.nickname || m.username}</span>
                {m.role === 'bot' && <BotIcon className="size-3.5 text-primary" />}
                {onlineIds.has(m.id) && <span className="ml-auto size-2 rounded-full bg-success" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="mb-1 px-2 text-muted-foreground text-xs font-medium">频道</div>
        <div className="flex flex-col gap-0.5">
          {channels.map((ch) => {
            const active = view?.type === 'channel' && view.id === ch.id
            const unread = unreadByChannel[ch.id] || 0
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => pick(() => selectChannel(ch.id))}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                  active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                }`}
              >
                {ch.readonly ? (
                  <Lock className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Hash className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{ch.name}</span>
                {ch.pinned && <Pin className="size-3 shrink-0 text-muted-foreground" />}
                {unread > 0 && !active && (
                  <Badge variant="destructive" className="ml-auto h-4 min-w-4 px-1 text-[10px]">
                    {unread}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-4 mb-1 px-2 text-muted-foreground text-xs font-medium">私信</div>
        <div className="flex flex-col gap-0.5">
          {conversations.length === 0 && (
            <div className="px-2 py-2 text-muted-foreground text-xs">还没有私信会话</div>
          )}
          {conversations.map((c) => {
            const active = view?.type === 'dm' && view.userId === c.user.id
            return (
              <button
                key={c.user.id}
                type="button"
                onClick={() => pick(() => selectDm(c.user.id))}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                  active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar className="size-7">
                    <AvatarImage src={c.user.avatar_url || undefined} />
                    <AvatarFallback>{initials(c.user.nickname || c.user.username)}</AvatarFallback>
                  </Avatar>
                  {onlineIds.has(c.user.id) && (
                    <span className="-bottom-0.5 -right-0.5 absolute size-2.5 rounded-full border-2 border-background bg-success" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.user.nickname || c.user.username}</div>
                  {c.last_message && (
                    <div className="truncate text-muted-foreground text-xs">
                      {c.last_message.content}
                    </div>
                  )}
                </div>
                {c.unread > 0 && !active && (
                  <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">
                    {c.unread}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ChatSidebar
