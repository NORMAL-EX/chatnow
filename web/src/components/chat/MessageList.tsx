import { useEffect, useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { MessageItem } from '@/components/chat/MessageItem'
import { MarkdownContent } from '@/components/chat/MarkdownContent'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useChat } from '@/contexts/ChatContext'
import { useAuth } from '@/contexts/AuthContext'
import { initials, formatTime, dayLabel } from '@/lib/format'
import type { DirectMessage } from '@/lib/types'

function DayDivider({ label }: { label: string }) {
  return (
    <div className="my-3 flex items-center gap-3 px-4">
      <div className="h-px flex-1 bg-border" />
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

function DMBubble({ dm }: { dm: DirectMessage }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const mine = dm.sender_id === user?.id
  const sender = dm.sender
  if (mine) {
    return (
      <div className="flex justify-end px-4 py-1">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground">
          <MarkdownContent content={dm.content} />
          <div className="mt-0.5 text-right text-[10px] text-primary-foreground/70">
            {formatTime(dm.created_at)}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex gap-2 px-4 py-1">
      <button type="button" onClick={() => sender && navigate(`/u/${sender.id}`)} className="shrink-0 self-end">
        <Avatar className="size-7">
          <AvatarImage src={sender?.avatar_url || undefined} />
          <AvatarFallback>{initials(sender?.nickname || sender?.username || '?')}</AvatarFallback>
        </Avatar>
      </button>
      <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
        <MarkdownContent content={dm.content} />
        <div className="mt-0.5 text-[10px] text-muted-foreground">{formatTime(dm.created_at)}</div>
      </div>
    </div>
  )
}

export function MessageList() {
  const {
    view,
    messages,
    dmMessages,
    channelHasMore,
    dmHasMore,
    loadingMessages,
    loadMore,
    typingUserIds,
    membersById,
  } = useChat()

  const isChannel = view?.type === 'channel'
  const items = isChannel ? messages : dmMessages
  const hasMore = isChannel ? channelHasMore : dmHasMore

  const scrollRef = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const loadingMore = useRef(false)
  const prevHeight = useRef(0)

  // Reset sticky-to-bottom whenever the conversation changes.
  useEffect(() => {
    stick.current = true
  }, [view?.type, isChannel ? view?.id : view?.userId])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (loadingMore.current) {
      el.scrollTop = el.scrollHeight - prevHeight.current
      loadingMore.current = false
    } else if (stick.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [items])

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (el.scrollTop < 60 && hasMore && !loadingMore.current) {
      prevHeight.current = el.scrollHeight
      loadingMore.current = true
      loadMore()
    }
  }

  const typingNames = typingUserIds
    .map((id) => membersById.get(id)?.nickname || membersById.get(id)?.username)
    .filter(Boolean)

  let lastDay = ''

  return (
    <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
      {hasMore && (
        <div className="flex justify-center py-2 text-muted-foreground text-xs">
          <Loader2 className="size-4 animate-spin" />
        </div>
      )}
      {!hasMore && items.length > 0 && (
        <div className="py-3 text-center text-muted-foreground text-xs">没有更多消息了</div>
      )}
      {loadingMessages && items.length === 0 && (
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
          加载中…
        </div>
      )}
      {!loadingMessages && items.length === 0 && (
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
          还没有消息,来说点什么吧
        </div>
      )}

      <div className="flex flex-col py-2">
        {isChannel
          ? messages.map((m) => {
              const d = dayLabel(m.created_at)
              const showDay = d !== lastDay
              lastDay = d
              return (
                <div key={m.id}>
                  {showDay && <DayDivider label={d} />}
                  <MessageItem message={m} />
                </div>
              )
            })
          : dmMessages.map((m) => {
              const d = dayLabel(m.created_at)
              const showDay = d !== lastDay
              lastDay = d
              return (
                <div key={m.id}>
                  {showDay && <DayDivider label={d} />}
                  <DMBubble dm={m} />
                </div>
              )
            })}
      </div>

      {typingNames.length > 0 && (
        <div className="px-4 pb-2 text-muted-foreground text-xs">
          {typingNames.join('、')} 正在输入…
        </div>
      )}
    </div>
  )
}

export default MessageList
