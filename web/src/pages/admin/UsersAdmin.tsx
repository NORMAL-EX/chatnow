import { useCallback, useEffect, useState } from 'react'
import { MoreHorizontal, Ban, ShieldCheck, ShieldOff, Gauge, Trash2, Undo2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Menu, MenuTrigger, MenuPopup, MenuItem, MenuSeparator } from '@/components/ui/menu'
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from '@/components/ui/select'
import {
  NumberField,
  NumberFieldGroup,
  NumberFieldDecrement,
  NumberFieldInput,
  NumberFieldIncrement,
} from '@/components/ui/number-field'
import {
  AlertDialog,
  AlertDialogPopup,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/contexts/AuthContext'
import { api, ApiError } from '@/lib/api'
import { toast } from '@/lib/toast'
import { initials } from '@/lib/format'
import type { Paginated, Role, User } from '@/lib/types'

const ROLE_LABEL: Record<Role, string> = {
  super_admin: '超级管理员',
  admin: '管理员',
  user: '用户',
  bot: '机器人',
}

function rateText(v: number) {
  if (v < 0) return '默认'
  if (v === 0) return '不限'
  return `${v}/分`
}

export default function UsersAdmin() {
  const { user: me } = useAuth()
  const isSuper = me?.role === 'super_admin'

  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paginated<User> | null>(null)
  const [loading, setLoading] = useState(false)

  const [rateUser, setRateUser] = useState<User | null>(null)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api.admin.users(q, page))
    } catch {
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [q, page])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  const act = async (fn: () => Promise<unknown>, ok = '已更新') => {
    try {
      await fn()
      toast.success(ok)
      load()
    } catch (e) {
      toast.error('操作失败', e instanceof ApiError ? e.message : undefined)
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-2xl">用户管理</h1>

      <Input
        value={q}
        onChange={(e) => {
          setPage(1)
          setQ(e.target.value)
        }}
        placeholder="搜索用户名或昵称"
        className="max-w-xs"
      />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>频率</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((u) => {
              const locked = u.role === 'super_admin' || (!isSuper && u.role === 'admin')
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback>{initials(u.nickname || u.username)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-sm">{u.nickname || u.username}</div>
                        <div className="truncate text-muted-foreground text-xs">@{u.username}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'user' ? 'outline' : 'secondary'}>
                      {ROLE_LABEL[u.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.status === 'active' && <Badge variant="outline">正常</Badge>}
                    {u.status === 'banned' && <Badge variant="destructive">已封禁</Badge>}
                    {u.status === 'pending' && <Badge variant="secondary">待审核</Badge>}
                  </TableCell>
                  <TableCell className="tabular-nums text-sm">{rateText(u.rate_limit_per_min)}</TableCell>
                  <TableCell className="text-right">
                    <Menu>
                      <MenuTrigger
                        render={
                          <Button variant="outline" size="icon-sm" disabled={locked} aria-label="操作">
                            <MoreHorizontal />
                          </Button>
                        }
                      />
                      <MenuPopup className="min-w-[170px] menu-popup-animated" align="end">
                        {u.status === 'banned' ? (
                          <MenuItem
                            className="flex items-center gap-2"
                            onClick={() => act(() => api.admin.updateUser(u.id, { status: 'active' }))}
                          >
                            <Undo2 className="size-4" />
                            解除封禁
                          </MenuItem>
                        ) : (
                          <MenuItem
                            className="flex items-center gap-2"
                            onClick={() => act(() => api.admin.updateUser(u.id, { status: 'banned' }))}
                          >
                            <Ban className="size-4" />
                            封禁
                          </MenuItem>
                        )}
                        <MenuItem className="flex items-center gap-2" onClick={() => setRateUser(u)}>
                          <Gauge className="size-4" />
                          调整频率
                        </MenuItem>
                        {isSuper && u.role === 'user' && (
                          <MenuItem
                            className="flex items-center gap-2"
                            onClick={() => act(() => api.admin.updateUser(u.id, { role: 'admin' }))}
                          >
                            <ShieldCheck className="size-4" />
                            设为管理员
                          </MenuItem>
                        )}
                        {isSuper && u.role === 'admin' && (
                          <MenuItem
                            className="flex items-center gap-2"
                            onClick={() => act(() => api.admin.updateUser(u.id, { role: 'user' }))}
                          >
                            <ShieldOff className="size-4" />
                            取消管理员
                          </MenuItem>
                        )}
                        {isSuper && (
                          <>
                            <MenuSeparator />
                            <MenuItem
                              variant="destructive"
                              className="flex items-center gap-2"
                              onClick={() => setDeleteUser(u)}
                            >
                              <Trash2 className="size-4" />
                              删除用户
                            </MenuItem>
                          </>
                        )}
                      </MenuPopup>
                    </Menu>
                  </TableCell>
                </TableRow>
              )
            })}
            {!loading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  没有找到用户
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">共 {data?.total ?? 0} 名用户</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            上一页
          </Button>
          <span className="text-sm tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </Button>
        </div>
      </div>

      {rateUser && (
        <RateDialog
          user={rateUser}
          onClose={() => setRateUser(null)}
          onSaved={() => {
            setRateUser(null)
            load()
          }}
        />
      )}

      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>删除用户</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 @{deleteUser?.username} 吗?此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>取消</AlertDialogClose>
            <AlertDialogClose
              render={<Button variant="destructive" />}
              onClick={() =>
                deleteUser && act(() => api.admin.deleteUser(deleteUser.id), '已删除')
              }
            >
              删除
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  )
}

function RateDialog({
  user,
  onClose,
  onSaved,
}: {
  user: User
  onClose: () => void
  onSaved: () => void
}) {
  const initialMode = user.rate_limit_per_min < 0 ? 'inherit' : user.rate_limit_per_min === 0 ? 'unlimited' : 'custom'
  const [mode, setMode] = useState(initialMode)
  const [value, setValue] = useState(user.rate_limit_per_min > 0 ? user.rate_limit_per_min : 10)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const rate = mode === 'inherit' ? -1 : mode === 'unlimited' ? 0 : Math.max(1, value)
    setSaving(true)
    try {
      await api.admin.updateUser(user.id, { rate_limit_per_min: rate })
      toast.success('频率已更新')
      onSaved()
    } catch (e) {
      toast.error('保存失败', e instanceof ApiError ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogPopup className="max-w-sm">
        <DialogHeader>
          <DialogTitle>发送频率 · @{user.username}</DialogTitle>
          <DialogDescription>限制该用户在单位时间内可发送的消息数量。</DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-4">
          <Select value={mode} onValueChange={(v) => setMode(v as string)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value="inherit">继承全局默认</SelectItem>
              <SelectItem value="unlimited">不限制</SelectItem>
              <SelectItem value="custom">自定义</SelectItem>
            </SelectPopup>
          </Select>
          {mode === 'custom' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-sm">每分钟最多消息数</span>
              <NumberField
                value={value}
                onValueChange={(v) => setValue(v ?? 1)}
                min={1}
                max={600}
              >
                <NumberFieldGroup>
                  <NumberFieldDecrement />
                  <NumberFieldInput />
                  <NumberFieldIncrement />
                </NumberFieldGroup>
              </NumberField>
            </div>
          )}
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
          <Button variant="default" onClick={save} disabled={saving}>
            保存
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  )
}
