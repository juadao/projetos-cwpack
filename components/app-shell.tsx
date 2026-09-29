'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FolderPlus,
  Package,
  Truck,
  ClipboardList,
  Users,
  Settings,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projetos/novo', label: 'Novo Projeto', icon: FolderPlus },
  { href: '/projetos', label: 'Projetos', icon: Package },
  { href: '/checklists', label: 'Checklists Logísticos', icon: Truck },
  { href: '/relatorios', label: 'Relatórios', icon: ClipboardList },
];

const adminNavItems = [
  { href: '/usuarios', label: 'Usuários', icon: Users },
  { href: '/admin/config-testes', label: 'Configurações de Testes', icon: Settings },
];

function getBreadcrumbs(pathname: string) {
  const crumbs: { label: string; href: string }[] = [{ label: 'Início', href: '/' }];
  if (pathname === '/') {
    return [{ label: 'Dashboard', href: '/' }];
  }
  if (pathname.startsWith('/projetos/novo')) {
    crumbs.push({ label: 'Projetos', href: '/projetos' });
    crumbs.push({ label: 'Novo Projeto', href: '/projetos/novo' });
    return crumbs;
  }
  if (pathname.startsWith('/projetos/')) {
    crumbs.push({ label: 'Projetos', href: '/projetos' });
    crumbs.push({ label: 'Detalhes', href: pathname });
    return crumbs;
  }
  if (pathname.startsWith('/projetos')) {
    crumbs.push({ label: 'Projetos', href: '/projetos' });
    return crumbs;
  }
  if (pathname.startsWith('/checklists')) {
    crumbs.push({ label: 'Checklists Logísticos', href: '/checklists' });
    return crumbs;
  }
  if (pathname.startsWith('/usuarios')) {
    crumbs.push({ label: 'Usuários', href: '/usuarios' });
    return crumbs;
  }
  if (pathname.startsWith('/admin/config-testes')) {
    crumbs.push({ label: 'Configurações de Testes', href: '/admin/config-testes' });
    return crumbs;
  }
  if (pathname.startsWith('/relatorios')) {
    crumbs.push({ label: 'Relatórios', href: '/relatorios' });
    return crumbs;
  }
  return crumbs;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, profile, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const breadcrumbs = getBreadcrumbs(pathname);

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!loading && !session && !isLoginPage) {
      router.push('/login');
    }
  }, [loading, session, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-40 border-r border-border bg-card">
        <SidebarContent pathname={pathname} profile={profile} onSignOut={signOut} />
      </aside>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-card border-r border-border animate-slide-in-right">
            <div className="flex justify-end p-4">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SidebarContent
              pathname={pathname}
              profile={profile}
              onSignOut={signOut}
              onNavigate={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-sm px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <nav className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
            {breadcrumbs.map((crumb, i) => (
              <div key={i} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                <Link
                  href={crumb.href}
                  className={cn(
                    'truncate hover:text-primary transition-colors',
                    i === breadcrumbs.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}
                >
                  {crumb.label}
                </Link>
              </div>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                {(profile?.name || 'CW').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-tight">{profile?.name || 'Usuário'}</span>
                <span className="text-xs text-muted-foreground leading-tight">{profile?.role || '—'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 w-full mx-auto max-w-[1800px] overflow-hidden flex flex-col min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  profile,
  onSignOut,
  onNavigate,
}: {
  pathname: string;
  profile: { name: string | null; role: string | null } | null;
  onSignOut: () => Promise<void>;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-border">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
          CW
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">CwPack</p>
          <p className="text-xs text-muted-foreground leading-tight">Projetos de Validação</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
        {(profile?.role === 'Admin' || profile?.role === 'Dono') && (
          <>
            <div className="pt-3 pb-1 px-3 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Administração
            </div>
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User + Sign out */}
      <div className="px-3 py-4 border-t border-border space-y-2">
        <div className="px-3 py-2 rounded-md bg-secondary/50">
          <p className="text-sm font-medium truncate">{profile?.name || 'Usuário'}</p>
          <p className="text-xs text-muted-foreground">{profile?.role || '—'}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSignOut}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
}