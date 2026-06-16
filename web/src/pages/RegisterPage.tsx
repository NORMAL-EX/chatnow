import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { api, ApiError, setToken } from '@/lib/api'
import { toast } from '@/lib/toast'

export default function RegisterPage() {
  const { register, isAuthed, setUser } = useAuth()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  const [step, setStep] = useState<'form' | 'code'>('form')
  const [code, setCode] = useState('')
  const needEmail = settings.registration_email_verify

  if (isAuthed) return <Navigate to="/" replace />

  if (!settings.registration_open) {
    return (
      <AuthLayout title="注册已关闭">
        <Alert>
          <AlertTitle>暂不开放注册</AlertTitle>
          <AlertDescription>管理员已关闭新用户注册,请稍后再试或联系管理员。</AlertDescription>
        </Alert>
        <p className="mt-4 text-center text-muted-foreground text-sm">
          已有账号?{' '}
          <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            返回登录
          </Link>
        </p>
      </AuthLayout>
    )
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (password !== confirm) {
      toast.error('两次输入的密码不一致')
      return
    }
    if (password.length < 6) {
      toast.error('密码至少 6 位')
      return
    }
    setBusy(true)
    try {
      const res = await register(
        username.trim(),
        password,
        nickname.trim() || undefined,
        needEmail ? email.trim() : undefined,
      )
      if (res.emailVerification) {
        toast.success('验证码已发送', '请查收邮箱并输入 6 位验证码')
        setStep('code')
      } else if (res.pending) {
        toast.success('注册成功', '账号需管理员审核,通过后即可登录')
        navigate('/login')
      } else {
        toast.success('注册成功')
        navigate('/')
      }
    } catch (err) {
      toast.error('注册失败', err instanceof ApiError ? err.message : '注册失败')
    } finally {
      setBusy(false)
    }
  }

  const onVerify = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const res = await api.verifyEmail({ username: username.trim(), code: code.trim() })
      if ('token' in res) {
        setToken(res.token)
        setUser(res.user)
        toast.success('注册成功')
        navigate('/')
      } else {
        toast.success('邮箱已验证', '账号需管理员审核,通过后即可登录')
        navigate('/login')
      }
    } catch (err) {
      toast.error('验证失败', err instanceof ApiError ? err.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const onResend = async () => {
    try {
      await api.resendCode(username.trim())
      toast.success('验证码已重新发送')
    } catch (err) {
      toast.error('发送失败', err instanceof ApiError ? err.message : undefined)
    }
  }

  if (step === 'code') {
    return (
      <AuthLayout title="验证邮箱" subtitle={`验证码已发送至 ${email}`}>
        <form onSubmit={onVerify} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">6 位验证码</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoFocus
              required
              placeholder="请输入邮件中的验证码"
            />
          </div>
          <Button type="submit" variant="default" disabled={busy || code.length !== 6} className="w-full">
            {busy && <Spinner className="size-4" />}
            完成验证
          </Button>
        </form>
        <div className="mt-4 flex items-center justify-between text-sm">
          <button type="button" onClick={onResend} className="text-foreground underline-offset-4 hover:underline">
            重新发送验证码
          </button>
          <button type="button" onClick={() => setStep('form')} className="text-muted-foreground hover:underline">
            返回修改
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="注册" subtitle={settings.registration_review ? '注册后需管理员审核' : '创建你的账号'}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">用户名</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            placeholder="字母、数字、下划线"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nickname">昵称(可选)</Label>
          <Input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="显示名称"
          />
        </div>
        {needEmail && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder="用于接收验证码"
            />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            placeholder="至少 6 位"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">确认密码</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            placeholder="再次输入密码"
          />
        </div>
        <Button type="submit" variant="default" disabled={busy} className="mt-2 w-full">
          {busy && <Spinner className="size-4" />}
          注册
        </Button>
      </form>
      <p className="mt-4 text-center text-muted-foreground text-sm">
        已有账号?{' '}
        <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          返回登录
        </Link>
      </p>
    </AuthLayout>
  )
}
