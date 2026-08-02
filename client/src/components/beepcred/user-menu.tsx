import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { canAccessAdmin } from '@/lib/admin-access';
import { useAuth } from '@/providers/auth-provider';

export function BeepCredUserMenu() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <span className="text-sm text-muted-foreground">…</span>;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/login">Sign in</Link>
        </Button>
        <Button size="sm" asChild>
          <Link to="/register">Register</Link>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar_url || undefined} alt="" />
            <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm">
          <p className="font-medium">{user.display_name || `@${user.username}`}</p>
          <p className="text-xs text-muted-foreground">@{user.username} · cred {user.cred_score}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account/profile">Edit profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account/submissions">My submissions</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account/ratings">My ratings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account/comments">My comments</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account/reports">My reports</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account/garage">My garage</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/user/${encodeURIComponent(user.username)}`}>Public profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/submit">Submit plate</Link>
        </DropdownMenuItem>
        {canAccessAdmin(user) && (
          <DropdownMenuItem asChild>
            <Link to="/admin">Admin</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void logout().then(() => navigate('/login'));
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
