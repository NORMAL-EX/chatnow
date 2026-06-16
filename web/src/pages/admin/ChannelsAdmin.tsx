import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Hash, Lock, Pin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogPanel,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogPopup,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from '@/components/ui/alert-dialog'
import { api, ApiError } from '@/lib/api'
import { toast } from '@/lib/toast'
import type { Channel } from '@/lib/types'

export default function ChannelsAdmin() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [editing, setEditing] = useState<Channel | null>(null)
  const [creating, setCreating] = useState(false)
  const [removing, setRemoving] = useState<Channel | null>(null)

  const load = () => api.channels().then(setChannels).catch(() => {})
  useEffect(() => {
    load()
  }, [])

  const onDelete = async () => {
    if (!removing) return
    try {
      await api.deleteChannel(removing.id)
      toast.success('频道已删除')
      setRemoving(null)
      load()
    } catch (e) {
      toast.error('删除失败', e instanceof ApiError ? e.message : undefined)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-2xl">频道管理</h1>
        <Button variant="default" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          新建频道
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {channels.map((ch) => (
          <Card key={ch.id}>
            <CardContent className="flex items-center gap-3 p-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent">
                {ch.readonly ? <Lock className="size-4" /> : <Hash className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{ch.name}</span>
                  {ch.pinned && (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Pin className="size-3" /> 置顶
                    </Badge>
                  )}
                  {ch.readonly && (
                    <Badge variant="secondary" className="text-[10px]">
                      只读
                    </Badge>
                  )}
                </div>
                <div className="truncate text-muted-foreground text-xs">
                  {ch.description || `/${ch.slug}`}
                </div>
              </div>
              <Button variant="outline" size="icon-sm" onClick={() => setEditing(ch)} aria-label="编辑">
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon-sm"
                onClick={() => setRemoving(ch)}
                aria-label="删除"
              >
                <Trash2 className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {(creating || editing) && (
        <ChannelDialog
          channel={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={() => {
            setCreating(false)
            setEditing(null)
            load()
          }}
        />
      )}

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>删除频道</AlertDialogTitle>
            <AlertDialogDescription>
              删除频道「{removing?.name}」会同时删除其中的所有消息,且不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>取消</AlertDialogClose>
            <AlertDialogClose render={<Button variant="destructive" />} onClick={onDelete}>
              删除
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  )
}

function ChannelDialog({
  channel,
  onClose,
  onSaved,
}: {
  channel: Channel | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(channel?.name ?? '')
  const [description, setDescription] = useState(channel?.description ?? '')
  const [readonly, setReadonly] = useState(channel?.readonly ?? false)
  const [pinned, setPinned] = useState(channel?.pinned ?? false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) {
      toast.error('频道名不能为空')
      return
    }
    setSaving(true)
    try {
      if (channel) {
        await api.updateChannel(channel.id, { name, description, readonly, pinned })
      } else {
        const created = await api.createChannel({ name, description })
        if (readonly || pinned) {
          await api.updateChannel(created.id, { readonly, pinned })
        }
      }
      toast.success('已保存')
      onSaved()
    } catch (e) {
      toast.error('保存失败', e instanceof ApiError ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>{channel ? '编辑频道' : '新建频道'}</DialogTitle>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cname">频道名</Label>
            <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cdesc">描述</Label>
            <Textarea id="cdesc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <label className="flex items-center justify-between">
            <span className="text-sm">只读(仅管理员可发言)</span>
            <Switch checked={readonly} onCheckedChange={setReadonly} />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">置顶频道</span>
            <Switch checked={pinned} onCheckedChange={setPinned} />
          </label>
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
