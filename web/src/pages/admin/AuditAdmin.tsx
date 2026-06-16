import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { AuditLog, Paginated } from '@/lib/types'

const ACTION_LABEL: Record<string, string> = {
  'channel.create': '创建频道',
  'channel.update': '修改频道',
  'channel.delete': '删除频道',
  'user.update': '修改用户',
  'user.delete': '删除用户',
  'message.delete': '删除消息',
  'registration.approve': '通过注册',
  'registration.reject': '拒绝注册',
  'settings.update': '修改设置',
}

export default function AuditAdmin() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paginated<AuditLog> | null>(null)

  const load = useCallback(() => {
    api.admin.auditLogs(page).then(setData).catch(() => {})
  }, [page])
  useEffect(load, [load])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-2xl">审计日志</h1>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>操作者</TableHead>
              <TableHead>动作</TableHead>
              <TableHead>目标</TableHead>
              <TableHead>详情</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                  {formatDateTime(l.created_at)}
                </TableCell>
                <TableCell className="text-sm">
                  {l.actor ? `${l.actor.nickname || l.actor.username}` : `#${l.actor_id}`}
                </TableCell>
                <TableCell className="text-sm">{ACTION_LABEL[l.action] || l.action}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{l.target}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground text-xs">{l.detail}</TableCell>
              </TableRow>
            ))}
            {data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  暂无日志
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          上一页
        </Button>
        <span className="text-sm tabular-nums">
          {page} / {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          下一页
        </Button>
      </div>
    </div>
  )
}
