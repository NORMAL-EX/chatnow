import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MoreHorizontal,
  Pencil,
  Undo2,
  MessageSquare,
  SmilePlus,
  Reply,
  Copy,
  AtSign,
  UserRound,
} from 'lucide-react'
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
import { ContextMenu, useContextMenu, type CtxItem } from '@/components/ui/context-menu'
import { MarkdownContent } from '@/components/chat/MarkdownContent'
import { useChat } from '@/contexts/ChatContext'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/lib/toast'
import { initials, formatTime } from '@/lib/format'
import { api, ApiError } from '@/lib/api'
import type { Message } from '@/lib/types'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '😢', '🔥', '👀']

/** Identity badge shown next to a sender's name. */
function RoleBadge({ role }: { role?: string }) {
  if (role === 'super_admin')
    return (
      <Badge className="h-4 border-transparent bg-amber-500/15 px-1 text-[10px] text-amber-600 dark:text-amber-400">
        系统管理员
      </Badge>
    )
  if (role === 'admin')
    return (
      <Badge className="h-4 border-transparent bg-sky-500/15 px-1 text-[10px] text-sky-600 dark:text-sky-400">
        管理员
      </Badge>
    )
  if (role === 'bot')
    return <Badge className="h-4 border-transparent bg-primary/15 px-1 text-[10px] text-primary">AI</Badge>
  return (
    <Badge variant="outline" className="h-4 px-1 text-[10px] text-muted-foreground">
      成员
    </Badge>
  )
}

export function MessageItem({ message }: { message: Message }) {
  const { user } = useAuth()
  const { toggleReaction, recallMessage, editMessage, selectDm, setReplyTo, requestMention } =
    useChat()
  const navigate = useNavigate()
  const ctx = useContextMenu()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const [revealed, setRevealed] = useState<string | null>(null)

  const sender = message.sender
  const isOwn = sender?.id === user?.id
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isSuper = user?.role === 'super_admin'
  const gone = message.deleted || message.recalled
  const withinWindow = Date.now() - new Date(message.created_at).getTime() < 40_000
  const canEdit = isOwn && !message.is_bot && !gone
  const canRecall = !gone && (isAdmin || (isOwn && !message.is_bot && withinWindow))

  const onReact = async (emoji: string) => {
    try {
      await toggleReaction(message.id, emoji)
    } catch {
      toast.error('操作失败')
    }
  }

  const onRecall = async () => {
    try {
      await recallMessage(message.id)
    } catch (e) {
      toast.error('撤回失败', e instanceof ApiError ? e.message : undefined)
    }
  }

  const onReveal = async () => {
    try {
      const { content } = await api.admin.revealMessage(message.id)
      setRevealed(content)
    } catch (e) {
      toast.error('查看失败', e instanceof ApiError ? e.message : undefined)
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

  const startReply = () =>
    setReplyTo({
      id: message.id,
      author: sender?.nickname || sender?.username || '用户',
      snippet: message.content || '[图片/空]',
    })
  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      toast.success('已复制')
    } catch {
      toast.error('复制失败')
    }
  }

  // Right-click menu items (role/permission-aware).
  const ctxItems: CtxItem[] = []
  if (!gone) {
    ctxItems.push({ label: '回复', icon: <Reply className="size-4" />, onSelect: startReply })
    ctxItems.push({ label: '复制文本', icon: <Copy className="size-4" />, onSelect: copyText })
  }
  if (sender && !isOwn && sender.role !== 'bot') {
    ctxItems.push({
      label: '发私信',
      icon: <MessageSquare className="size-4" />,
      onSelect: () => selectDm(sender.id),
      separatorBefore: !gone,
    })
    ctxItems.push({
      label: '@ TA',
      icon: <AtSign className="size-4" />,
      onSelect: () => requestMention(sender.username),
    })
  }
  if (sender) {
    ctxItems.push({
      label: '查看资料',
      icon: <UserRound className="size-4" />,
      onSelect: () => navigate(`/u/${sender.id}`),
    })
  }
  if (canRecall) {
    ctxItems.push({
      label: '撤回',
      icon: <Undo2 className="size-4" />,
      onSelect: onRecall,
      destructive: true,
      separatorBefore: true,
    })
  }

  return (
    <div
      className="group flex gap-3 px-4 py-1.5 hover:bg-muted/40"
      onContextMenu={(e) => {
        if (ctxItems.length) ctx.open(e)
      }}
    >
      {ctx.pos && (
        <ContextMenu x={ctx.pos.x} y={ctx.pos.y} items={ctxItems} onClose={ctx.close} />
      )}
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
          <RoleBadge role={sender?.role} />
          <span className="text-muted-foreground text-xs">{formatTime(message.created_at)}</span>
          {message.edited && <span className="text-muted-foreground text-xs">(已编辑)</span>}
        </div>

        {message.recalled ? (
          <div className="text-muted-foreground text-sm italic">
            此消息已被撤回
            {isSuper &&
              (revealed === null ? (
                <button
                  type="button"
                  onClick={onReveal}
                  className="ml-2 text-primary not-italic hover:underline"
                >
                  点击查看
                </button>
              ) : (
                <div className="mt-1 rounded-md border border-dashed border-border p-2 not-italic">
                  <MarkdownContent content={revealed} />
                </div>
              ))}
          </div>
        ) : message.deleted ? (
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

        {message.reactions.length > 0 && !gone && (
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

      {!gone && !editing && (
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
              {canRecall && (
                <>
                  {(canEdit || (!isOwn && sender?.role !== 'bot')) && <MenuSeparator />}
                  <MenuItem onClick={onRecall} variant="destructive" className="flex items-center gap-2">
                    <Undo2 className="size-4" />
                    撤回
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
