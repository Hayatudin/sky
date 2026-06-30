'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSession, signOut } from '@/lib/auth-client';
import { ROUTE_ACCESS, ROLE_CONFIG, type Role } from '@/lib/role-config';
import {
  LayoutDashboard,
  UserPlus,
  FileText,
  Settings,
  LogOut,
  Users,
  ClipboardList,
  FolderOpen,
  UserCheck,
  ShieldCheck,
  Loader2,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

const allNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Entry', href: '/quick-registration', icon: ClipboardList },
  { label: 'Records', href: '/quick-registered', icon: Users },
  { label: 'Available Passport', href: '/available-passport', icon: FolderOpen },
  { label: 'Registration', href: '/registration', icon: UserPlus },
  { label: 'Candidates', href: '/candidates', icon: Users },
  { label: 'CV Generator', href: '/cv-generator', icon: FileText },
  { label: 'Generated CVs', href: '/generated-cvs', icon: FolderOpen },
  { label: 'Fit Candidates', href: '/fit-candidates', icon: UserCheck },
  { label: 'Visa Selected', href: '/requested', icon: ClipboardList },
  { label: 'Available Candidates', href: '/agency/available-candidates', icon: Users },
  { label: 'Contracts', href: '/agency/contracts', icon: ClipboardList },
  { label: 'Invoice', href: '/invoice', icon: FileText },
  { label: 'Candidate Deployment', href: '/deployments', icon: ClipboardList },
  { label: 'Brokers', href: '/brokers', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Backup CVs', href: '/backup', icon: FolderOpen },
  { label: 'Users', href: '/users', icon: ShieldCheck },
];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
  isMobile?: boolean;
  onNavigate?: () => void;
}

function SkyAgencyMark({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
        <span className="text-white font-black text-xs tracking-tight">SKY</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
        <span className="text-white font-black text-xs tracking-tight">SKY</span>
      </div>
      <div className="min-w-0">
        <p className="text-white font-bold text-[15px] leading-tight truncate">SKY Agency</p>
        <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Management System</p>
      </div>
    </div>
  );
}

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobile, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  const role = ((session?.user as any)?.role ?? 'user') as string;

  const navItems = allNavItems.filter(item => {
    const allowedRoles = ROUTE_ACCESS[item.href];
    if (!allowedRoles) return false;
    return allowedRoles.includes(role as Role);
  });

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const handleNavClick = () => {
    if (onNavigate) onNavigate();
  };

  const roleConfig = ROLE_CONFIG[role as Role];
  const roleLabel = roleConfig?.label || role.replace('_', ' ');
  const showLabels = isMobile || !isCollapsed;

  return (
    <aside
      className={cn(
        'relative shrink-0 h-full lg:h-screen flex flex-col z-40 transition-all duration-300 overflow-hidden',
        'bg-[#1e293b] border-r border-slate-700/60',
        isMobile ? 'w-72' : (isCollapsed ? 'w-[72px]' : 'w-[260px]')
      )}
    >
      {/* Header / Brand */}
      <div
        className={cn(
          'shrink-0 border-b border-slate-700/60 flex items-center',
          showLabels ? 'justify-between px-4 py-4' : 'flex-col gap-3 px-2 py-4'
        )}
      >
        {showLabels ? (
          <>
            <SkyAgencyMark />
            <div className="flex items-center gap-1">
              {isMobile && (
                <button
                  onClick={onNavigate}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              )}
              {!isMobile && (
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose size={18} />
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <SkyAgencyMark compact />
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors w-full flex justify-center"
              title="Expand sidebar"
            >
              <PanelLeftOpen size={18} />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden sidebar-scroll">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              title={!showLabels ? item.label : undefined}
              className={cn(
                'flex items-center rounded-lg transition-all duration-200 group relative',
                showLabels ? 'gap-3 px-3 py-2.5 mx-1' : 'justify-center py-2.5 mx-1',
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-100'
              )}
            >
              <Icon size={18} className="shrink-0" />
              {showLabels && (
                <span className="text-[13px] font-medium whitespace-nowrap truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="shrink-0 border-t border-slate-700/60 p-2 space-y-1">
        {showLabels && session?.user && (
          <div className="px-3 py-2.5 mb-1 rounded-lg bg-slate-800/80 border border-slate-700/50">
            <p className="text-white text-sm font-semibold truncate">{session.user.name}</p>
            <p className="text-slate-500 text-[10px] truncate mt-0.5">{session.user.email}</p>
            <span className="inline-block mt-2 text-[9px] px-2 py-0.5 rounded-md bg-primary/20 text-primary-light font-bold uppercase tracking-wide">
              {roleLabel}
            </span>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 w-full cursor-pointer',
            showLabels ? 'gap-3 px-3 py-2.5 mx-1' : 'justify-center py-2.5 mx-1'
          )}
          title={!showLabels ? 'Logout' : undefined}
        >
          {isPending ? (
            <Loader2 size={18} className="shrink-0 animate-spin" />
          ) : (
            <LogOut size={18} className="shrink-0" />
          )}
          {showLabels && <span className="text-[13px] font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
