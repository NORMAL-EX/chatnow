import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { useAuth } from '@/contexts/AuthContext'
import { useChatSocket } from '@/hooks/useChatSocket'
import type {
  Channel,
  Conversation,
  DirectMessage,
  MentionNotice,
  Message,
  User,
  WSInbound,
} from '@/lib/types'

type View = { type: 'channel'; id: number } | { type: 'dm'; userId: number }

interface ChatContextType {
  connected: boolean
  channels: Channel[]
  members: User[]
  membersById: Map<number, User>
  onlineIds: Set<number>
  view: View | null

  // channel view
  messages: Message[]
  channelHasMore: boolean
  loadingMessages: boolean
  unreadByChannel: Record<number, number>

  // dm view
  conversations: Conversation[]
  dmMessages: DirectMessage[]
  dmHasMore: boolean

  // notifications
  mentions: MentionNotice[]
  mentionUnread: number

  typingUserIds: number[]
  cooldownUntil: number

  selectChannel: (id: number) => void
  selectDm: (userId: number) => void
  loadMore: () => void
  sendMessage: (content: string) => void
  sendDm: (content: string) => void
  editMessage: (id: number, content: string) => Promise<void>
  deleteMessage: (id: number) => Promise<void>
  toggleReaction: (id: number, emoji: string) => Promise<void>
  sendTyping: () => void
  refreshChannels: () => Promise<void>
  refreshConversations: () => Promise<void>
  markMentionsRead: () => Promise<void>
  totalDmUnread: number
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

function upsert(list: Message[], msg: Message): Message[] {
  const idx = list.findIndex((m) => m.id === msg.id)
  if (idx >= 0) {
    const next = list.slice()
    next[idx] = msg
    return next
  }
  return [...list, msg]
}

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const myId = user?.id ?? 0

  const [channels, setChannels] = useState<Channel[]>([])
  const [members, setMembers] = useState<User[]>([])
  const [onlineIds, setOnlineIds] = useState<Set<number>>(new Set())
  const [view, setView] = useState<View | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [channelHasMore, setChannelHasMore] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [unreadByChannel, setUnreadByChannel] = useState<Record<number, number>>({})

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([])
  const [dmHasMore, setDmHasMore] = useState(false)

  const [mentions, setMentions] = useState<MentionNotice[]>([])
  const [typingUserIds, setTypingUserIds] = useState<number[]>([])
  const [cooldownUntil, setCooldownUntil] = useState(0)

  const viewRef = useRef<View | null>(null)
  viewRef.current = view
  const requestKey = useRef(0)
  const typingTimers = useRef<Record<number, number>>({})
  const lastTypingSent = useRef(0)

  const membersById = new Map(members.map((m) => [m.id, m]))
  const mentionUnread = mentions.filter((m) => !m.read_at).length
  const totalDmUnread = conversations.reduce((sum, c) => sum + c.unread, 0)

  // ---- socket event handling ----
  const handleEvent = useCallback(
    (e: WSInbound) => {
      switch (e.type) {
        case 'ready':
        case 'presence':
          setOnlineIds(new Set(e.online_user_ids))
          break
        case 'chat_message':
        case 'bot_reply': {
          const m = e.message
          const v = viewRef.current
          if (v?.type === 'channel' && v.id === m.channel_id) {
            setMessages((prev) => upsert(prev, m))
          } else {
            setUnreadByChannel((prev) => ({
              ...prev,
              [m.channel_id]: (prev[m.channel_id] || 0) + 1,
            }))
          }
          break
        }
        case 'message_update': {
          const m = e.message
          const v = viewRef.current
          if (v?.type === 'channel' && v.id === m.channel_id) {
            setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)))
          }
          break
        }
        case 'message_delete': {
          const v = viewRef.current
          if (v?.type === 'channel' && v.id === e.channel_id) {
            setMessages((prev) =>
              prev.map((x) =>
                x.id === e.message_id ? { ...x, deleted: true, content: '' } : x,
              ),
            )
          }
          break
        }
        case 'reaction': {
          const v = viewRef.current
          if (v?.type === 'channel' && v.id === e.channel_id) {
            setMessages((prev) =>
              prev.map((x) => (x.id === e.message_id ? { ...x, reactions: e.reactions } : x)),
            )
          }
          break
        }
        case 'dm_message': {
          const m = e.message
          const partner = m.sender_id === myId ? m.receiver_id : m.sender_id
          const v = viewRef.current
          if (v?.type === 'dm' && v.userId === partner) {
            setDmMessages((prev) =>
              prev.some((x) => x.id === m.id) ? prev : [...prev, m],
            )
            if (m.sender_id === partner) void api.markDmRead(partner)
          }
          void refreshConversationsRef.current()
          if (m.sender_id !== myId && !(v?.type === 'dm' && v.userId === partner)) {
            const who = membersByIdRef.current.get(m.sender_id)
            toast.message('新私信', `${who?.nickname || '有人'} 给你发来私信`)
          }
          break
        }
        case 'mention': {
          setMentions((prev) => [e.mention, ...prev.filter((x) => x.id !== e.mention.id)])
          toast.info('有人提到了你', e.mention.message?.content?.slice(0, 60))
          break
        }
        case 'typing': {
          const uid = e.user_id
          if (uid === myId) break
          const v = viewRef.current
          const relevant =
            (e.channel_id && v?.type === 'channel' && v.id === e.channel_id) ||
            (e.from && v?.type === 'dm' && v.userId === e.from)
          if (!relevant) break
          setTypingUserIds((prev) => (prev.includes(uid) ? prev : [...prev, uid]))
          window.clearTimeout(typingTimers.current[uid])
          typingTimers.current[uid] = window.setTimeout(() => {
            setTypingUserIds((prev) => prev.filter((x) => x !== uid))
          }, 3500)
          break
        }
        case 'error': {
          if (e.code === 'rate_limited' && e.retry_after) {
            setCooldownUntil(Date.now() + e.retry_after * 1000)
          }
          toast.error('发送失败', e.message)
          break
        }
      }
    },
    [myId],
  )

  const { connected, send } = useChatSocket(handleEvent)

  // refs to call latest versions inside the socket handler
  const refreshConversationsRef = useRef<() => Promise<void>>(async () => {})
  const membersByIdRef = useRef(membersById)
  membersByIdRef.current = membersById

  const refreshChannels = useCallback(async () => {
    try {
      setChannels(await api.channels())
    } catch {
      /* ignore */
    }
  }, [])

  const refreshConversations = useCallback(async () => {
    try {
      setConversations(await api.conversations())
    } catch {
      /* ignore */
    }
  }, [])
  refreshConversationsRef.current = refreshConversations

  const refreshMembers = useCallback(async () => {
    try {
      setMembers(await api.members())
    } catch {
      /* ignore */
    }
  }, [])

  const refreshMentions = useCallback(async () => {
    try {
      setMentions(await api.mentions())
    } catch {
      /* ignore */
    }
  }, [])

  // bootstrap once authenticated
  useEffect(() => {
    if (!myId) return
    void refreshChannels()
    void refreshMembers()
    void refreshConversations()
    void refreshMentions()
  }, [myId, refreshChannels, refreshMembers, refreshConversations, refreshMentions])

  // pick a default channel
  useEffect(() => {
    if (!view && channels.length > 0) {
      setView({ type: 'channel', id: channels[0].id })
    }
  }, [channels, view])

  // load messages when the channel view changes
  useEffect(() => {
    if (view?.type !== 'channel') return
    const id = view.id
    const key = ++requestKey.current
    setLoadingMessages(true)
    setTypingUserIds([])
    api
      .channelMessages(id)
      .then((res) => {
        if (key !== requestKey.current) return
        setMessages(res.items)
        setChannelHasMore(res.has_more)
        setUnreadByChannel((prev) => ({ ...prev, [id]: 0 }))
      })
      .catch(() => {})
      .finally(() => {
        if (key === requestKey.current) setLoadingMessages(false)
      })
  }, [view])

  // load dm messages when the dm view changes
  useEffect(() => {
    if (view?.type !== 'dm') return
    const uid = view.userId
    const key = ++requestKey.current
    setTypingUserIds([])
    api
      .dmMessages(uid)
      .then((res) => {
        if (key !== requestKey.current) return
        setDmMessages(res.items)
        setDmHasMore(res.has_more)
        void refreshConversations()
      })
      .catch(() => {})
  }, [view, refreshConversations])

  const selectChannel = useCallback((id: number) => setView({ type: 'channel', id }), [])
  const selectDm = useCallback((userId: number) => setView({ type: 'dm', userId }), [])

  const loadMore = useCallback(() => {
    const v = viewRef.current
    if (!v) return
    if (v.type === 'channel') {
      if (!channelHasMore || messages.length === 0) return
      const before = messages[0].id
      api.channelMessages(v.id, before).then((res) => {
        setMessages((prev) => [...res.items, ...prev])
        setChannelHasMore(res.has_more)
      })
    } else {
      if (!dmHasMore || dmMessages.length === 0) return
      const before = dmMessages[0].id
      api.dmMessages(v.userId, before).then((res) => {
        setDmMessages((prev) => [...res.items, ...prev])
        setDmHasMore(res.has_more)
      })
    }
  }, [channelHasMore, messages, dmHasMore, dmMessages])

  const sendMessage = useCallback(
    (content: string) => {
      const v = viewRef.current
      if (v?.type !== 'channel') return
      if (!send({ type: 'chat_message', channel_id: v.id, content })) {
        toast.error('连接已断开', '正在重连,请稍候')
      }
    },
    [send],
  )

  const sendDm = useCallback(
    (content: string) => {
      const v = viewRef.current
      if (v?.type !== 'dm') return
      if (!send({ type: 'dm_message', to: v.userId, content })) {
        toast.error('连接已断开', '正在重连,请稍候')
      }
    },
    [send],
  )

  const editMessage = useCallback(async (id: number, content: string) => {
    await api.editMessage(id, content)
  }, [])

  const deleteMessage = useCallback(async (id: number) => {
    await api.deleteMessage(id)
  }, [])

  const toggleReaction = useCallback(async (id: number, emoji: string) => {
    await api.toggleReaction(id, emoji)
  }, [])

  const sendTyping = useCallback(() => {
    const v = viewRef.current
    if (!v) return
    const now = Date.now()
    if (now - lastTypingSent.current < 1500) return
    lastTypingSent.current = now
    if (v.type === 'channel') send({ type: 'typing', channel_id: v.id })
    else send({ type: 'typing', to: v.userId })
  }, [send])

  const markMentionsRead = useCallback(async () => {
    await api.readAllMentions()
    setMentions((prev) => prev.map((m) => ({ ...m, read_at: m.read_at || new Date().toISOString() })))
  }, [])

  const value: ChatContextType = {
    connected,
    channels,
    members,
    membersById,
    onlineIds,
    view,
    messages,
    channelHasMore,
    loadingMessages,
    unreadByChannel,
    conversations,
    dmMessages,
    dmHasMore,
    mentions,
    mentionUnread,
    typingUserIds,
    cooldownUntil,
    selectChannel,
    selectDm,
    loadMore,
    sendMessage,
    sendDm,
    editMessage,
    deleteMessage,
    toggleReaction,
    sendTyping,
    refreshChannels,
    refreshConversations,
    markMentionsRead,
    totalDmUnread,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
