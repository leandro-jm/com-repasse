import { cn } from '@/lib/utils';

export interface TabItem<T extends string> {
  value: T;
  label: string;
}

/** Abas controladas (WAI-ARIA, ativação automática). O estado mora em quem chama. */
export function Tabs<T extends string>({
  value,
  onValueChange,
  items,
  label,
  className,
}: {
  value: T;
  onValueChange: (v: T) => void;
  items: TabItem<T>[];
  /** aria-label do tablist. */
  label: string;
  className?: string;
}) {
  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, i: number) {
    const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const prox = (i + passo + items.length) % items.length;
    onValueChange(items[prox].value);
    (e.currentTarget.parentElement?.children[prox] as HTMLElement | undefined)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('inline-flex items-center gap-1 rounded-lg bg-muted p-1', className)}
    >
      {items.map((t, i) => {
        const ativa = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            id={`aba-${t.value}`}
            aria-selected={ativa}
            aria-controls={`painel-${t.value}`}
            tabIndex={ativa ? 0 : -1}
            onClick={() => onValueChange(t.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              ativa
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <div role="tabpanel" id={`painel-${value}`} aria-labelledby={`aba-${value}`}>
      {children}
    </div>
  );
}
