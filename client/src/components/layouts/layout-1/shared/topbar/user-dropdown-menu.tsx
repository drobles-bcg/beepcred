import { ReactNode } from 'react';
import { Flag, LogOut, MessageSquare, Settings, Star, Upload, UserCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserDropdownMenu({ trigger }: { trigger: ReactNode }) {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await logout();
    navigate('/login');
  }

  if (loading) {
    return <>{trigger}</>;
  }

  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" side="bottom" align="end">
          <DropdownMenuItem asChild>
            <Link to="/login">Sign in</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/register">Create account</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" side="bottom" align="end">
        <div className="flex items-center gap-2 p-3">
          <Avatar className="size-9">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link
              to="/account/profile"
              className="block truncate text-sm font-semibold hover:text-primary"
            >
              {user.display_name || user.username}
            </Link>
            <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/account/profile" className="flex items-center gap-2">
            <Settings className="size-4" />
            Edit profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/user/${encodeURIComponent(user.username)}`} className="flex items-center gap-2">
            <UserCircle className="size-4" />
            Public profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account/submissions" className="flex items-center gap-2">
            <Upload className="size-4" />
            My submissions
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account/ratings" className="flex items-center gap-2">
            <Star className="size-4" />
            My ratings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account/comments" className="flex items-center gap-2">
            <MessageSquare className="size-4" />
            My comments
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account/reports" className="flex items-center gap-2">
            <Flag className="size-4" />
            My reports
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="p-2">
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => void handleSignOut()}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
