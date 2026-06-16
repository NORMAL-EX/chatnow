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
  const [testing, setTesting] = useState(false)

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
        registration_email_verify: getBool('registration_email_verify'),
        allow_dm: getBool('allow_dm'),
        max_message_length: Number(get('max_message_length')) || 2000,
        rate_limit_messages: Number(get('rate_limit_messages')) || 10,
        rate_limit_window_seconds: Number(get('rate_limit_window_seconds')) || 30,
        rate_limit_admin_messages: Number(get('rate_limit_admin_messages')) || 60,
        smtp_host: get('smtp_host'),
        smtp_port: get('smtp_port') || '587',
        smtp_from: get('smtp_from'),
        smtp_from_name: get('smtp_from_name') || 'Murmur',
        smtp_username: get('smtp_username'),
        smtp_ssl: getBool('smtp_ssl'),
        mail_subject: get('mail_subject'),
        mail_body: get('mail_body'),
        ...(get('smtp_password') ? { smtp_password: get('smtp_password') } : {}),
      })
      await refresh()
      toast.success('站点设置已保存')
    } catch (e) {
      toast.error('保存失败', e instanceof ApiError ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  const onTest = async () => {
    const to = get('smtp_from').trim()
    if (!to) {
      toast.error('请先填写并保存「发件邮箱」')
      return
    }
    setTesting(true)
    try {
      const r = await api.admin.testSmtp(to)
      if (r.ok) toast.success('测试邮件已发送', `已发往 ${to}，请查收`)
      else toast.error('发送失败', r.message)
    } catch (e) {
      toast.error('发送失败', e instanceof ApiError ? e.message : undefined)
    } finally {
      setTesting(false)
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
            <Label>公告（显示在聊天顶部，留空则隐藏）</Label>
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
            <span className="text-sm">注册需邮箱验证（需先配置下方 SMTP）</span>
            <Switch
              checked={getBool('registration_email_verify')}
              onCheckedChange={(v) => set('registration_email_verify', String(v))}
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">允许私信</span>
            <Switch checked={getBool('allow_dm')} onCheckedChange={(v) => set('allow_dm', String(v))} />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">邮件 / SMTP</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            用于发送注册验证码。开启「注册需邮箱验证」前请先填好并保存测试。
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>SMTP 主机</Label>
              <Input value={get('smtp_host')} onChange={(e) => set('smtp_host', e.target.value)} placeholder="smtp.example.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>端口</Label>
              <Input value={get('smtp_port')} onChange={(e) => set('smtp_port', e.target.value)} placeholder="587 或 465" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>发件邮箱</Label>
              <Input type="email" value={get('smtp_from')} onChange={(e) => set('smtp_from', e.target.value)} placeholder="no-reply@example.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>发件人名称</Label>
              <Input value={get('smtp_from_name')} onChange={(e) => set('smtp_from_name', e.target.value)} placeholder="Murmur" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>用户名</Label>
              <Input value={get('smtp_username')} onChange={(e) => set('smtp_username', e.target.value)} autoComplete="off" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>密码 / 授权码</Label>
              <Input
                type="password"
                value={get('smtp_password')}
                onChange={(e) => set('smtp_password', e.target.value)}
                placeholder={raw.smtp_password_set === 'true' ? '已配置（留空不变）' : ''}
                autoComplete="new-password"
              />
            </div>
          </div>
          <label className="flex items-center justify-between">
            <span className="text-sm">使用隐式 TLS（端口 465；587 请关闭）</span>
            <Switch checked={getBool('smtp_ssl')} onCheckedChange={(v) => set('smtp_ssl', String(v))} />
          </label>
          <div className="flex flex-col gap-1.5">
            <Label>邮件主题模板（可用 {'{site}'} 与 {'{code}'}）</Label>
            <Input
              value={get('mail_subject')}
              onChange={(e) => set('mail_subject', e.target.value)}
              placeholder="{site} 注册验证码"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>邮件正文模板（可用 {'{site}'} 与 {'{code}'}）</Label>
            <Textarea
              rows={3}
              value={get('mail_body')}
              onChange={(e) => set('mail_body', e.target.value)}
              placeholder="【{site}】您的注册验证码是 {code}，10 分钟内有效。"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onTest} disabled={testing}>
              {testing ? <Loader2 className="size-4 animate-spin" /> : null}
              测试发送
            </Button>
            <span className="text-muted-foreground text-xs">
              发往「发件邮箱」；请先「保存设置」，测试使用已保存的 SMTP 配置。
            </span>
          </div>
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
            <Label>普通用户：窗口内可发条数</Label>
            <Input type="number" value={get('rate_limit_messages')} onChange={(e) => set('rate_limit_messages', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>频率窗口（秒）</Label>
            <Input type="number" value={get('rate_limit_window_seconds')} onChange={(e) => set('rate_limit_window_seconds', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>管理员：窗口内可发条数</Label>
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
