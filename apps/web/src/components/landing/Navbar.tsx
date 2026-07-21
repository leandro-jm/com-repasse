import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Menu, Moon, Sun, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/providers/theme';
import { cn } from '@/lib/utils';
import { LOGIN_URL, NAV_LINKS, PRODUCT, SIGNUP_URL } from './constants';

function Brand() {
  return (
    <a href="#top" className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Car className="h-5 w-5" />
      </span>
      <span className="text-lg font-bold tracking-tight">{PRODUCT}</span>
    </a>
  );
}

function ThemeToggle() {
  const { mode, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      aria-label="Alternar tema"
    >
      {mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Link to={LOGIN_URL}>
            <Button variant="ghost" size="sm">
              Entrar
            </Button>
          </Link>
          <Link to={SIGNUP_URL}>
            <Button size="sm">Teste grátis</Button>
          </Link>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      <div
        className={cn(
          'overflow-hidden border-t border-border/60 md:hidden',
          open ? 'max-h-96' : 'max-h-0 border-t-0',
        )}
      >
        <div className="space-y-1 px-4 py-3">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <div className="flex gap-2 pt-2">
            <Link to={LOGIN_URL} className="flex-1" onClick={() => setOpen(false)}>
              <Button variant="outline" className="w-full">
                Entrar
              </Button>
            </Link>
            <Link to={SIGNUP_URL} className="flex-1" onClick={() => setOpen(false)}>
              <Button className="w-full">Teste grátis</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
