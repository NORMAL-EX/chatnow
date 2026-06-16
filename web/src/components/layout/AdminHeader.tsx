import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { UserMenu } from '@/components/layout/UserMenu'
import { useSettings } from '@/contexts/SettingsContext'

export function AdminHeader() {
  const { settings } = useSettings()
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <Button variant="outline" size="sm" render={<Link to="/" />}>
        <ArrowLeft className="size-4" />
        返回聊天
      </Button>
      <span className="font-bold">{settings.site_title || 'Murmur'} · 管理后台</span>
      <div className="flex-1" />
      <ThemeToggle />
      <UserMenu />
    </header>
  )
}

export default AdminHeader
