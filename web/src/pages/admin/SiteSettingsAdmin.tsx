import { useEffect, useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from '@/components/ui/select'
import { api, ApiError } from '@/lib/api'
import { toast } from '@/lib/toast'
import { useSettings } from '@/contexts/SettingsContext'

export default function SiteSettingsAdmin() {
  const { refresh } = useSettings()
  const [raw, setRaw] = useState<Record<string, string> | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.admin.getSettings().then(setRaw).catch(() => toast.error('加载失败'))
  }, [])

  const get = (k: string) => raw?.[k] ?? ''
  const set = (k: string, v: string) => setRaw((p) => (p ? { ...p, [k]: v } : p))
  const getBool = (k: string) => get(k) === 'true'

  const onSave = async () => {
    if (!raw) return
    setSaving(true)
    try {
      await api.admin.putSettings({
        site_title: get('site_title'),
        site_description: get('site_description'),
        announcement: get('announcement'),
        default_theme: get('default_theme') || 'system',
        registration_open: getBool('registration_open'),
        registration_review: getBool('registration_review'),
        allow_dm: getBool('allow_dm'),
        max_message_length: Number(get('max_message_length')) || 2000,
        rate_limit_messages: Number(get('rate_limit_messages')) || 10,
        rate_limit_window_seconds: Number(get('rate_limit_window_seconds')) || 30,
        rate_limit_admin_messages: Number(get('rate_limit_admin_messages')) || 60,
      })
      await refresh()
      toast.success('站点设置已保存')
    } catch (e) {
      toast.error('保存失败', e instanceof ApiError ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  if (!raw) return <div className="text-muted-foreground">加载中…</div>

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="font-bold text-2xl">站点设置</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>站点标题</Label>
            <Input value={get('site_title')} onChange={(e) => set('site_title', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>站点描述</Label>
            <Input value={get('site_description')} onChange={(e) => set('site_description', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>公告(显示在聊天顶部,留空则隐藏)</Label>
            <Textarea rows={2} value={get('announcement')} onChange={(e) => set('announcement', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>默认主题</Label>
            <Select value={get('default_theme') || 'system'} onValueChange={(v) => set('default_theme', v as string)}>
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value="system">跟随系统</SelectItem>
                <SelectItem value="light">浅色</SelectItem>
                <SelectItem value="dark">深色</SelectItem>
              </SelectPopup>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">注册与权限</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex items-center justify-between">
            <span className="text-sm">开放注册</span>
            <Switch checked={getBool('registration_open')} onCheckedChange={(v) => set('registration_open', String(v))} />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">注册需审核</span>
            <Switch checked={getBool('registration_review')} onCheckedChange={(v) => set('registration_review', String(v))} />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">允许私信</span>
            <Switch checked={getBool('allow_dm')} onCheckedChange={(v) => set('allow_dm', String(v))} />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">消息与频率</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>单条消息最大长度</Label>
            <Input type="number" value={get('max_message_length')} onChange={(e) => set('max_message_length', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>普通用户:窗口内可发条数</Label>
            <Input type="number" value={get('rate_limit_messages')} onChange={(e) => set('rate_limit_messages', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>频率窗口(秒)</Label>
            <Input type="number" value={get('rate_limit_window_seconds')} onChange={(e) => set('rate_limit_window_seconds', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>管理员:窗口内可发条数</Label>
            <Input type="number" value={get('rate_limit_admin_messages')} onChange={(e) => set('rate_limit_admin_messages', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Button variant="default" onClick={onSave} disabled={saving} className="self-start">
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        保存设置
      </Button>
    </div>
  )
}
