import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontal, Pencil, Trash2, MessageSquare, SmilePlus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Menu,
  MenuTrigger,
  MenuPopup,
  MenuItem,
  MenuSeparator,
} from '@/components/ui/menu'
import { Popover, PopoverTrigger, PopoverPopup } from '@/components/ui/popover'
import { MarkdownContent } from '@/components/chat/MarkdownContent'
import { useChat } from '@/contexts/ChatContext'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/lib/toast'
import { initials, formatTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import type { Message } from '@/lib/types'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '😢', '🔥', '👀']

export function MessageItem({ message }: { message: Message }) {
  const { user } = useAuth()
  const { toggleReaction, deleteMessage, editMessage, selectDm } = useChat()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)

  const sender = message.sender
  const isOwn = sender?.id === user?.id
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const canEdit = isOwn && !message.is_bot && !message.deleted
  const canDelete = (isOwn || isAdmin) && !message.deleted

  const onReact = async (emoji: string) => {
    try {
      await toggleReaction(message.id, emoji)
    } catch {
      toast.error('操作失败')
    }
  }

  const onDelete = async () => {
    try {
      await deleteMessage(message.id)
    } catch (e) {
      toast.error('删除失败', e instanceof ApiError ? e.message : undefined)
    }
  }

  const onSaveEdit = async () => {
    const text = draft.trim()
    if (!text) return
    try {
      await editMessage(message.id, text)
      setEditing(false)
    } catch (e) {
      toast.error('编辑失败', e instanceof ApiError ? e.message : undefined)
    }
  }

  return (
    <div className="group flex gap-3 px-4 py-1.5 hover:bg-muted/40">
      <button
        type="button"
        onClick={() => sender && navigate(`/u/${sender.id}`)}
        className="mt-0.5 shrink-0"
      >
        <Avatar className="size-9">
          <AvatarImage src={sender?.avatar_url || undefined} alt={sender?.nickname} />
          <AvatarFallback>{initials(sender?.nickname || sender?.username || '?')}</AvatarFallback>
        </Avatar>
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => sender && navigate(`/u/${sender.id}`)}
            className="font-medium text-sm hover:underline"
          >
            {sender?.nickname || sender?.username || '未知用户'}
          </button>
          {message.is_bot && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              BOT
            </Badge>
          )}
          <span className="text-muted-foreground text-xs">{formatTime(message.created_at)}</span>
          {message.edited && <span className="text-muted-foreground text-xs">(已编辑)</span>}
        </div>

        {message.deleted ? (
          <p className="text-muted-foreground text-sm italic">(消息已删除)</p>
        ) : editing ? (
          <div className="mt-1 flex flex-col gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSaveEdit()
                if (e.key === 'Escape') setEditing(false)
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="default" onClick={onSaveEdit}>
                保存
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(false)
                  setDraft(message.content)
                }}
              >
                取消
              </Button>
              <span className="self-center text-muted-foreground text-xs">Ctrl+Enter 保存 · Esc 取消</span>
            </div>
          </div>
        ) : (
          <MarkdownContent content={message.content} />
        )}

        {message.reactions.length > 0 && !message.deleted && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map((r) => (
              <Button
                key={r.emoji}
                size="xs"
                variant={r.reacted || r.user_ids.includes(user?.id ?? -1) ? 'secondary' : 'outline'}
                className="h-6 gap-1 px-1.5"
                onClick={() => onReact(r.emoji)}
              >
                <span>{r.emoji}</span>
                <span className="text-xs">{r.count}</span>
              </Button>
            ))}
          </div>
        )}
      </div>

      {!message.deleted && !editing && (
        <div className="flex items-start gap-1 self-start opacity-0 transition-opacity group-hover:opacity-100">
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline" size="icon-xs" aria-label="添加表情">
                  <SmilePlus />
                </Button>
              }
            />
            <PopoverPopup className="w-auto" align="end">
              <div className="flex gap-1">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onReact(emoji)}
                    className="rounded-md p-1 text-lg hover:bg-accent"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverPopup>
          </Popover>

          <Menu>
            <MenuTrigger
              render={
                <Button variant="outline" size="icon-xs" aria-label="更多操作">
                  <MoreHorizontal />
                </Button>
              }
            />
            <MenuPopup className="min-w-[140px] menu-popup-animated" align="end">
              {!isOwn && sender && sender.role !== 'bot' && (
                <MenuItem onClick={() => selectDm(sender.id)} className="flex items-center gap-2">
                  <MessageSquare className="size-4" />
                  发私信
                </MenuItem>
              )}
              {canEdit && (
                <MenuItem onClick={() => setEditing(true)} className="flex items-center gap-2">
                  <Pencil className="size-4" />
                  编辑
                </MenuItem>
              )}
              {canDelete && (
                <>
                  {(canEdit || (!isOwn && sender?.role !== 'bot')) && <MenuSeparator />}
                  <MenuItem onClick={onDelete} variant="destructive" className="flex items-center gap-2">
                    <Trash2 className="size-4" />
                    删除
                  </MenuItem>
                </>
              )}
            </MenuPopup>
          </Menu>
        </div>
      )}
    </div>
  )
}

export default MessageItem
