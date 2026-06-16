import { useEffect, useState } from 'react'
import { Bot, Plug, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { api, ApiError } from '@/lib/api'
import { toast } from '@/lib/toast'
import { useSettings } from '@/contexts/SettingsContext'
import type { AISettings } from '@/lib/types'

export default function AISettingsAdmin() {
  const { refresh: refreshSettings } = useSettings()
  const [s, setS] = useState<AISettings | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; reply?: string } | null>(null)
  const [tools, setTools] = useState(false)

  useEffect(() => {
    api.admin.getAISettings().then(setS).catch(() => toast.error('加载失败'))
    api.admin
      .getSettings()
      .then((m) => setTools(m.ai_tools_enabled === 'true'))
      .catch(() => {})
  }, [])

  const set = <K extends keyof AISettings>(key: K, value: AISettings[K]) =>
    setS((prev) => (prev ? { ...prev, [key]: value } : prev))

  const doSave = async (): Promise<boolean> => {
    if (!s) return false
    const payload: Record<string, string | number | boolean> = {
      ai_enabled: s.ai_enabled,
      ai_base_url: s.ai_base_url,
      ai_model: s.ai_model,
      ai_system_prompt: s.ai_system_prompt,
      ai_temperature: s.ai_temperature,
      ai_max_tokens: s.ai_max_tokens,
      ai_context_char_limit: s.ai_context_char_limit,
      ai_cooldown_seconds: s.ai_cooldown_seconds,
      ai_allow_dm: s.ai_allow_dm,
      ai_tools_enabled: tools,
      bot_name: s.bot_name,
      bot_avatar: s.bot_avatar,
    }
    if (apiKey.trim()) payload.ai_api_key = apiKey.trim()
    try {
      await api.admin.putSettings(payload)
      if (apiKey.trim()) {
        setApiKey('')
        setS((prev) => (prev ? { ...prev, ai_api_key_set: true } : prev))
      }
      await refreshSettings()
      return true
    } catch (e) {
      toast.error('保存失败', e instanceof ApiError ? e.message : undefined)
      return false
    }
  }

  const onSave = async () => {
    setSaving(true)
    if (await doSave()) toast.success('AI 设置已保存')
    setSaving(false)
  }

  const onTest = async () => {
    setTesting(true)
    setTestResult(null)
    const saved = await doSave()
    if (!saved) {
      setTesting(false)
      return
    }
    try {
      const res = await api.admin.testAI()
      setTestResult(res)
      if (res.ok) toast.success('连接成功')
      else toast.error('连接失败', res.message)
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof ApiError ? e.message : '测试失败' })
    } finally {
      setTesting(false)
    }
  }

  if (!s) {
    return <div className="text-muted-foreground">加载中…</div>
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="font-bold text-2xl">AI 设置</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="size-4" /> 机器人
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex items-center justify-between">
            <span className="text-sm">启用 AI 机器人</span>
            <Switch checked={s.ai_enabled} onCheckedChange={(v) => set('ai_enabled', v)} />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">允许在私信中触发</span>
            <Switch checked={s.ai_allow_dm} onCheckedChange={(v) => set('ai_allow_dm', v)} />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">机器人工具（联网搜索 / 北京时间 / 管群禁言）</span>
            <Switch checked={tools} onCheckedChange={setTools} />
          </label>
          <p className="text-muted-foreground text-xs">
            开启后 AI 可调用工具：任何人可让其查时间 / 联网搜索；禁言仅限管理员（系统管理员可禁管理员，管理员可禁普通成员，最长 60 天）。需模型支持 function calling。
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>机器人名称</Label>
              <Input value={s.bot_name} onChange={(e) => set('bot_name', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>机器人头像 URL</Label>
              <Input value={s.bot_avatar} onChange={(e) => set('bot_avatar', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">接口与模型</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Base URL（OpenAI 兼容）</Label>
            <Input
              value={s.ai_base_url}
              onChange={(e) => set('ai_base_url', e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>API Key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={s.ai_api_key_set ? '已配置（留空则保持不变）' : '未配置'}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>模型</Label>
            <Input value={s.ai_model} onChange={(e) => set('ai_model', e.target.value)} placeholder="gpt-4o-mini" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>系统提示词（人设）</Label>
            <Textarea
              rows={4}
              value={s.ai_system_prompt}
              onChange={(e) => set('ai_system_prompt', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">生成参数</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>温度 Temperature</Label>
              <span className="text-muted-foreground text-sm tabular-nums">
                {s.ai_temperature.toFixed(1)}
              </span>
            </div>
            <Slider
              value={s.ai_temperature}
              min={0}
              max={2}
              step={0.1}
              onValueChange={(v) => set('ai_temperature', Array.isArray(v) ? v[0] : v)}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <NumberRow
              label="最大 Tokens"
              value={s.ai_max_tokens}
              onChange={(v) => set('ai_max_tokens', v)}
            />
            <NumberRow
              label="上下文字符上限"
              value={s.ai_context_char_limit}
              onChange={(v) => set('ai_context_char_limit', v)}
            />
            <NumberRow
              label="冷却时间（秒）"
              value={s.ai_cooldown_seconds}
              onChange={(v) => set('ai_cooldown_seconds', v)}
            />
          </div>
        </CardContent>
      </Card>

      {testResult && (
        <Alert variant={testResult.ok ? 'success' : 'error'}>
          <AlertTitle>{testResult.ok ? '连接成功' : '连接失败'}</AlertTitle>
          <AlertDescription>
            {testResult.reply ? `回复：${testResult.reply}` : testResult.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button variant="default" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          保存设置
        </Button>
        <Button variant="outline" onClick={onTest} disabled={testing}>
          {testing ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />}
          保存并测试连通性
        </Button>
      </div>
    </div>
  )
}

function NumberRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  )
}
