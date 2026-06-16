import { useNavigate } from 'react-router-dom'
import { Bell, AtSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverTrigger, PopoverPopup } from '@/components/ui/popover'
import { useChat } from '@/contexts/ChatContext'
import { formatRelative } from '@/lib/format'

export function MentionsBell() {
  const { mentions, mentionUnread, markMentionsRead, selectChannel } = useChat()
  const navigate = useNavigate()

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="icon" className="relative rounded-lg button-header" aria-label="提及通知">
            <Bell />
            {mentionUnread > 0 && (
              <Badge
                variant="destructive"
                className="-right-1 -top-1 absolute flex h-4 min-w-4 items-center justify-center px-1 text-[10px]"
              >
                {mentionUnread > 99 ? '99+' : mentionUnread}
              </Badge>
            )}
          </Button>
        }
      />
      <PopoverPopup align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="font-medium text-sm">提及</span>
          {mentionUnread > 0 && (
            <Button variant="ghost" size="xs" onClick={() => void markMentionsRead()}>
              全部已读
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {mentions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground text-sm">
              <AtSign className="size-6 opacity-50" />
              暂无提及
            </div>
          ) : (
            mentions.slice(0, 20).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  selectChannel(m.channel_id)
                  navigate('/')
                  void markMentionsRead()
                }}
                className={`flex w-full flex-col gap-0.5 border-b px-3 py-2 text-left last:border-b-0 hover:bg-accent/50 ${
                  m.read_at ? '' : 'bg-primary/5'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-sm">
                    {m.message?.sender?.nickname || m.message?.sender?.username || '有人'} 提到了你
                  </span>
                  <span className="shrink-0 text-muted-foreground text-xs">
                    {formatRelative(m.created_at)}
                  </span>
                </div>
                <span className="truncate text-muted-foreground text-xs">
                  {m.message?.content || '(消息已删除)'}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverPopup>
    </Popover>
  )
}

export default MentionsBell
