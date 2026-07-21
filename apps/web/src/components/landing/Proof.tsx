import { BadgeCheck, Building2 } from 'lucide-react';
import { COMPANY } from './constants';

export function Proof() {
  return (
    <section className="border-b border-border/60 bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-4 py-8 text-center text-sm text-muted-foreground sm:flex-row sm:gap-10 sm:px-6">
        <span className="inline-flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-success" />
          Validado com repassador real — piloto{' '}
          <span className="font-medium text-foreground">Carvalho Júnior</span>
        </span>
        <span className="hidden h-4 w-px bg-border sm:block" />
        <span className="inline-flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Distribuído pela <span className="font-medium text-foreground">{COMPANY}</span>
        </span>
      </div>
    </section>
  );
}
