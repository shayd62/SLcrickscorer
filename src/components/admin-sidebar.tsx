
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CricLogo } from '@/components/icons';
import { Home, Users, Trophy, BarChart, Bell, Settings, LifeBuoy, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const navItems = [
  { href: '/admin/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/tournaments', icon: Trophy, label: 'Tournaments' },
  { href: '/admin/approvals', icon: Bell, label: 'Approvals' },
  { href: '/admin/analytics', icon: BarChart, label: 'Analytics' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, userProfile, logout } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-gray-900 text-gray-300">
      <div className="flex items-center justify-center h-20 border-b border-gray-800">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
            <CricLogo className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
        </Link>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <Link key={item.label} href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-base",
                pathname.startsWith(item.href)
                  ? 'bg-primary/20 text-primary'
                  : 'hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.label}
            </Button>
          </Link>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-gray-800">
        <Button variant="ghost" className="w-full justify-start text-base hover:bg-gray-800 hover:text-white">
          <LifeBuoy className="mr-3 h-5 w-5" />
          Support
        </Button>
        <div className="mt-4 flex items-center gap-3 p-2 rounded-lg bg-gray-800/50">
            <Avatar className="h-10 w-10">
                <AvatarImage src={userProfile?.photoURL || ''} alt={userProfile?.name || ''} />
                <AvatarFallback>{userProfile?.name?.charAt(0) || 'A'}</AvatarFallback>
            </Avatar>
            <div className='flex-1'>
                <p className="text-sm font-semibold text-white">{userProfile?.name || 'Admin'}</p>
                <p className="text-xs text-gray-400">{userProfile?.email || ''}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="text-gray-400 hover:text-white hover:bg-gray-700">
                <LogOut className="h-5 w-5" />
            </Button>
        </div>
      </div>
    </aside>
  );
}
