import { useState } from 'react'
import { Megaphone } from 'lucide-react'
import { ChatSidebar } from '@/components/chat/ChatSidebar'
import { ConversationHeader } from '@/components/chat/ConversationHeader'
import { MessageList } from '@/components/chat/MessageList'
import { MessageComposer } from '@/components/chat/MessageComposer'
import { Sheet, SheetPopup, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useChat } from '@/contexts/ChatContext'
import { useSettings } from '@/contexts/SettingsContext'

export default function ChatPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { view } = useChat()
  const { settings } = useSettings()

  const viewKey = view ? `${view.type}:${view.type === 'channel' ? view.id : view.userId}` : 'none'

  return (
    <div className="flex h-full">
      <aside className="hidden w-72 shrink-0 border-border border-r md:block">
        <ChatSidebar />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetPopup side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>导航</SheetTitle>
          </SheetHeader>
          <ChatSidebar onSelect={() => setMobileOpen(false)} />
        </SheetPopup>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <ConversationHeader onOpenSidebar={() => setMobileOpen(true)} />
        {settings.announcement && (
          <div className="flex items-center gap-2 border-border border-b bg-warning/10 px-4 py-2 text-sm">
            <Megaphone className="size-4 shrink-0 text-warning-foreground" />
            <span className="text-warning-foreground">{settings.announcement}</span>
          </div>
        )}
        {view ? (
          <>
            <MessageList key={viewKey} />
            <MessageComposer />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            选择一个频道或会话开始聊天
          </div>
        )}
      </div>
    </div>
  )
}
