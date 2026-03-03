import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { User, LogOut, QrCode, Heart } from 'lucide-react';

export function Header({ onShowAuth, onShowQRScanner }) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className="absolute top-4 right-4 z-[1000] flex gap-2">
      <Button
        onClick={onShowQRScanner}
        variant="outline"
        className="gap-2 bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:bg-white"
        data-testid="header-qr-btn"
      >
        <QrCode size={18} />
        <span className="hidden sm:inline">Scan QR</span>
      </Button>

      {isAuthenticated ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:bg-white"
              data-testid="user-menu-btn"
            >
              <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center">
                <span className="text-xs font-medium text-white">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:inline max-w-[100px] truncate">{user?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Heart size={16} />
              My Favorites
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
              onClick={logout}
              data-testid="logout-btn"
            >
              <LogOut size={16} />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          onClick={onShowAuth}
          className="gap-2 bg-white/90 backdrop-blur-sm shadow-lg text-slate-900 hover:bg-white border border-slate-200"
          variant="outline"
          data-testid="signin-btn"
        >
          <User size={18} />
          Sign In
        </Button>
      )}
    </div>
  );
}
