import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Hash,
  Bot,
  Settings,
  ScrollText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminHeader } from '@/components/layout/AdminHeader'

const items = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: '仪表盘' },
  { to: '/admin/users', icon: Users, label: '用户管理' },
  { to: '/admin/registrations', icon: UserCheck, label: '注册审核' },
  { to: '/admin/channels', icon: Hash, label: '频道管理' },
  { to: '/admin/ai', icon: Bot, label: 'AI 设置' },
  { to: '/admin/site', icon: Settings, label: '站点设置' },
  { to: '/admin/audit', icon: ScrollText, label: '审计日志' },
]

export function AdminLayout() {
  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <AdminHeader />
      <div className="flex min-h-0 flex-1">
        <aside className="w-48 shrink-0 overflow-y-auto border-border border-r p-2">
          <nav className="flex flex-col gap-1">
            {items.map((it) => (
              <Button
                key={it.to}
                variant="ghost"
                className="w-full justify-start gap-2 aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
                render={<NavLink to={it.to} end={it.end} />}
              >
                <it.icon className="size-4" />
                {it.label}
              </Button>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
