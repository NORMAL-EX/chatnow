import { useNavigate } from 'react-router-dom'
import { LogOut, User as UserIcon, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Menu, MenuTrigger, MenuPopup, MenuItem, MenuSeparator } from '@/components/ui/menu'
import { useAuth } from '@/contexts/AuthContext'
import { initials } from '@/lib/format'

export function UserMenu() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null

  const onLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button variant="outline" size="icon" className="rounded-full button-header">
            <Avatar className="size-7">
              <AvatarImage src={user.avatar_url || undefined} alt={user.nickname} />
              <AvatarFallback>{initials(user.nickname || user.username)}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <MenuPopup className="min-w-[190px] menu-popup-animated" align="end">
        <div className="px-2 py-1.5">
          <div className="truncate font-medium text-sm">{user.nickname || user.username}</div>
          <div className="truncate text-muted-foreground text-xs">@{user.username}</div>
        </div>
        <MenuSeparator />
        <MenuItem onClick={() => navigate('/me')} className="flex items-center gap-2">
          <UserIcon className="size-4" />
          个人资料
        </MenuItem>
        {isAdmin && (
          <MenuItem onClick={() => navigate('/admin')} className="flex items-center gap-2">
            <Shield className="size-4" />
            管理后台
          </MenuItem>
        )}
        <MenuSeparator />
        <MenuItem onClick={onLogout} variant="destructive" className="flex items-center gap-2">
          <LogOut className="size-4" />
          退出登录
        </MenuItem>
      </MenuPopup>
    </Menu>
  )
}

export default UserMenu
