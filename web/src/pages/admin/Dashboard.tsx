import { useEffect, useState } from 'react'
import { Users, UserCheck, MessageSquare, Wifi, Bot, Hash } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { DashboardStats } from '@/lib/types'

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: number | string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-foreground">
          <Icon className="size-5" />
        </span>
        <div>
          <div className="font-bold text-2xl tabular-nums">{value}</div>
          <div className="text-muted-foreground text-xs">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    api.admin.stats().then(setStats).catch(() => {})
  }, [])

  const max = stats ? Math.max(1, ...stats.recent_messages_7d) : 1

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-bold text-2xl">仪表盘</h1>

      {!stats ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard icon={Users} label="用户总数" value={stats.users} />
          <StatCard icon={UserCheck} label="待审核" value={stats.pending} />
          <StatCard icon={MessageSquare} label="消息总数" value={stats.messages} />
          <StatCard icon={Wifi} label="当前在线" value={stats.online} />
          <StatCard icon={Bot} label="AI 调用" value={stats.ai_calls} />
          <StatCard icon={Hash} label="频道数" value={stats.channels} />
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-4 font-medium">最近 7 天消息量</h2>
          {stats ? (
            <div className="flex h-40 items-end gap-2">
              {stats.recent_messages_7d.map((n, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-primary/80 transition-all"
                      style={{ height: `${(n / max) * 100}%`, minHeight: n > 0 ? 4 : 0 }}
                      title={`${n} 条`}
                    />
                  </div>
                  <span className="text-muted-foreground text-[10px]">
                    {i === 6 ? '今天' : `${6 - i}天前`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
