import React from 'react';
import { Home, Search, Film, Tv, List, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
interface NavItemProps {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}
const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'group flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 relative',
      isActive
        ? 'bg-primary shadow-[0_0_20px_rgba(0,209,255,0.4)] text-white'
        : 'text-white/60 hover:text-white hover:bg-white/10'
    )}
    title={label}
  >
    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
    {isActive && (
      <span className="absolute left-[-12px] w-1 h-8 bg-primary rounded-r-full shadow-[2px_0_10px_rgba(0,209,255,0.8)]" />
    )}
  </button>
);
interface SideNavProps {
  activePath?: string;
  onNavigate?: (path: string) => void;
}
export const SideNav: React.FC<SideNavProps> = ({ activePath = 'home', onNavigate }) => {
  const navItems = [
    {
      id: 'home',
      icon: Home,
      label: 'Home',
    },
    {
      id: 'search',
      icon: Search,
      label: 'Search',
    },
    {
      id: 'movies',
      icon: Film,
      label: 'Movies',
    },
    {
      id: 'tv',
      icon: Tv,
      label: 'TV Shows',
    },
    {
      id: 'mylist',
      icon: List,
      label: 'My List',
    },
  ];
  return (
    <div className="fixed left-0 top-0 h-screen w-24 flex flex-col items-center py-8 z-50">
      <div className="flex flex-col items-center gap-6 px-4 py-8 rounded-3xl bg-white/5 backdrop-blur-[20px] border border-white/10 h-full shadow-2xl">
        <div className="mb-8 p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
          <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center font-bold text-primary text-xl">
            G
          </div>
        </div>

        <nav className="flex flex-col gap-4 flex-1">
          {navItems.map(item => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activePath === item.id}
              onClick={() => onNavigate?.(item.id)}
            />
          ))}
        </nav>

        <div className="mt-auto">
          <NavItem
            icon={Settings}
            label="Settings"
            isActive={activePath === 'settings'}
            onClick={() => onNavigate?.('settings')}
          />
        </div>
      </div>
    </div>
  );
};
