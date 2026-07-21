import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Moon, Sun, LogOut, ChevronDown, Check, Car, UserCog, User } from 'lucide-react';
import { useTheme } from '@/providers/theme';
import { useSession } from '@/providers/session';
import { api } from '@/lib/api';
import { NAV, visibleNav } from '@/nav';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

function TenantSwitcher() {
  const { me, activeTenant, switchTenant } = useSession();
  const memberships = me?.memberships ?? [];
  const [open, setOpen] = useState(false);
  if (!activeTenant) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm hover:bg-accent"
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-primary-foreground"
          style={{ backgroundColor: activeTenant.cor_primaria ?? 'hsl(var(--primary))' }}
        >
          {activeTenant.nome.slice(0, 2).toUpperCase()}
        </div>
        <span className="flex-1 truncate font-medium">{activeTenant.nome}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg animate-fade-in">
            {memberships.map((m) => (
              <button
                key={m.tenant_id}
                onClick={async () => {
                  setOpen(false);
                  if (m.tenant_id !== activeTenant.tenant_id) await switchTenant(m.tenant_id);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="flex-1 truncate">{m.nome}</span>
                {m.tenant_id === activeTenant.tenant_id && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { mode, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
      aria-label="Alternar tema"
    >
      {mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { claims, activeTenant, signOut, me, impersonating, reload } = useSession();
  const items = activeTenant
    ? visibleNav(activeTenant.papel, claims.is_super_admin)
    : NAV.filter((i) => i.superAdmin);
  const primary = items.filter((i) => i.primary).slice(0, 4);
  const location = useLocation();

  async function sairImpersonacao() {
    await api.backoffice.stopImpersonate();
    await reload();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — desktop (fixa) */}
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Car className="h-5 w-5" />
          </div>
          <span className="font-semibold">CRM Repasse</span>
        </div>
        <div className="px-3 pb-2">
          <TenantSwitcher />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
              {item.superAdmin && (
                <Badge variant="warning" className="ml-auto">
                  SA
                </Badge>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Banner de impersonation (super-admin operando como um tenant) */}
        {impersonating && (
          <div className="flex shrink-0 items-center gap-2 bg-warning px-4 py-2 text-sm text-warning-foreground">
            <UserCog className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">
              Você está personificando <strong>{activeTenant?.nome}</strong> (suporte)
            </span>
            <button onClick={sairImpersonacao} className="rounded-md bg-black/10 px-2 py-1 font-medium hover:bg-black/20">
              Sair
            </button>
          </div>
        )}

        {/* Topbar fixa — desktop (área do usuário no canto superior direito) */}
        <header className="z-30 hidden shrink-0 items-center justify-end gap-2 border-b border-border bg-card px-6 py-3 lg:flex">
          <NavLink
            to="/perfil"
            className="mr-1 flex max-w-[240px] items-center gap-2 truncate rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <User className="h-4 w-4 shrink-0" />
            <span className="truncate">{me?.user.email}</span>
          </NavLink>
          <ThemeToggle />
          <button
            onClick={signOut}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Sair"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        {/* Topbar — mobile */}
        <header className="z-30 flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-3 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Car className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <TenantSwitcher />
          </div>
          <NavLink
            to="/perfil"
            className="rounded-md p-2 text-muted-foreground hover:bg-accent"
            aria-label="Meu perfil"
          >
            <User className="h-5 w-5" />
          </NavLink>
          <ThemeToggle />
          <button
            onClick={signOut}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent"
            aria-label="Sair"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <main key={location.pathname} className="flex-1 overflow-y-auto animate-fade-in px-4 py-5 pb-24 lg:px-8 lg:py-8 lg:pb-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>

        {/* Bottom-nav — mobile */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card/90 backdrop-blur lg:hidden">
          {primary.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
