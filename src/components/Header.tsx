import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Sun, Moon, Zap, LogIn, UserPlus, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { auth } from '../lib/firebase';
import { Logo } from './Logo';

export default function Header() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  const themeOptions: { id: 'light' | 'dark' | 'midnight', icon: React.ReactNode }[] = [
    { id: 'light', icon: <Sun size={18} /> },
    { id: 'midnight', icon: <Zap size={18} /> },
    { id: 'dark', icon: <Moon size={18} /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border transition-colors">
      <div className="px-6 md:px-12 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <Link to="/" className="flex items-center gap-3 font-black text-2xl tracking-tighter text-primary italic uppercase group">
              <Logo className="w-10 h-10 group-hover:rotate-12 transition-transform duration-300 shadow-xl shadow-primary/20" />
              <span className="hidden sm:block">Learnify</span>
           </Link>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-center bg-muted/50 rounded-full p-1 border border-border">
            {themeOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={`p-2 rounded-full transition-all ${
                  theme === opt.id 
                    ? 'bg-primary text-primary-foreground shadow-lg scale-110' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={`${opt.id.charAt(0).toUpperCase() + opt.id.slice(1)} Mode`}
              >
                {opt.icon}
              </button>
            ))}
          </div>

          {!user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium hover:text-primary transition-colors"
              >
                <LogIn size={18} />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <UserPlus size={18} />
                <span>Sign Up</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                {profile?.displayName || user.email}
                <span className="ml-2 text-xs opacity-60 bg-muted px-2 py-0.5 rounded-full capitalize">
                  {profile?.role}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-red-500/10 text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
