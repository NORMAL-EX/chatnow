import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Camera, Save, MessageSquare, ArrowLeft } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/AuthContext'
import { useChat } from '@/contexts/ChatContext'
import { api, ApiError } from '@/lib/api'
import { toast } from '@/lib/toast'
import { initials } from '@/lib/format'
import type { Role, User } from '@/lib/types'

const ROLE_LABEL: Record<Role, string> = {
  super_admin: '超级管理员',
  admin: '管理员',
  user: '用户',
  bot: '机器人',
}

export default function ProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, setUser } = useAuth()
  const { selectDm, onlineIds } = useChat()

  const targetId = id ? Number(id) : user?.id
  const isSelf = targetId === user?.id

  const [profile, setProfile] = useState<User | null>(isSelf ? user : null)
  const [loading, setLoading] = useState(!isSelf)

  // editable fields (self)
  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isSelf) {
      setProfile(user)
      setNickname(user?.nickname ?? '')
      setBio(user?.bio ?? '')
      return
    }
    if (!targetId) return
    setLoading(true)
    api
      .user(targetId)
      .then(setProfile)
      .catch(() => toast.error('用户不存在'))
      .finally(() => setLoading(false))
  }, [targetId, isSelf, user])

  const onSave = async () => {
    setSaving(true)
    try {
      const updated = await api.updateMe({
        nickname,
        bio,
        ...(password ? { password } : {}),
      })
      setUser(updated)
      setProfile(updated)
      setPassword('')
      toast.success('已保存')
    } catch (e) {
      toast.error('保存失败', e instanceof ApiError ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { avatar_url } = await api.uploadAvatar(file)
      const updated = { ...(user as User), avatar_url }
      setUser(updated)
      setProfile(updated)
      toast.success('头像已更新')
    } catch (err) {
      toast.error('上传失败', err instanceof ApiError ? err.message : undefined)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    )
  }
  if (!profile) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">用户不存在</div>
  }

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6">
      <Button variant="outline" size="sm" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="size-4" />
        返回
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="size-20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {initials(profile.nickname || profile.username)}
                </AvatarFallback>
              </Avatar>
              {isSelf && (
                <>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="-bottom-1 -right-1 absolute rounded-full"
                    onClick={() => fileRef.current?.click()}
                    aria-label="更换头像"
                  >
                    <Camera className="size-3.5" />
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onAvatar}
                  />
                </>
              )}
            </div>
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2">
                {profile.nickname || profile.username}
                <Badge variant="secondary">{ROLE_LABEL[profile.role]}</Badge>
              </CardTitle>
              <p className="text-muted-foreground text-sm">@{profile.username}</p>
              {!isSelf && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {onlineIds.has(profile.id) ? '🟢 在线' : '⚪ 离线'}
                </p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {isSelf ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nickname">昵称</Label>
                <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bio">简介</Label>
                <Textarea id="bio" value={bio} rows={3} onChange={(e) => setBio(e.target.value)} placeholder="介绍一下自己吧" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">修改密码(留空则不变)</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 位"
                  autoComplete="new-password"
                />
              </div>
              <Button variant="default" onClick={onSave} disabled={saving} className="self-start">
                {saving ? <Spinner className="size-4" /> : <Save className="size-4" />}
                保存
              </Button>
            </>
          ) : (
            <>
              {profile.bio ? (
                <p className="whitespace-pre-wrap text-sm">{profile.bio}</p>
              ) : (
                <p className="text-muted-foreground text-sm">这个人很神秘,什么都没留下</p>
              )}
              {profile.role !== 'bot' && (
                <Button
                  variant="default"
                  className="self-start"
                  onClick={() => {
                    selectDm(profile.id)
                    navigate('/')
                  }}
                >
                  <MessageSquare className="size-4" />
                  发私信
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
