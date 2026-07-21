import { Link } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PLANS, WHATSAPP_URL } from './constants';

function PlanCta({ href, cta, highlight }: { href: string; cta: string; highlight?: boolean }) {
  const variant = highlight ? 'default' : 'outline';
  // Links externos (WhatsApp) abrem em nova aba; rotas internas usam o router.
  if (href.startsWith('http')) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        <Button variant={variant} className="w-full">
          {cta}
        </Button>
      </a>
    );
  }
  return (
    <Link to={href} className="block">
      <Button variant={variant} className="w-full">
        {cta}
      </Button>
    </Link>
  );
}

export function Pricing() {
  return (
    <section id="planos" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Planos que crescem com você</h2>
        <p className="mt-4 text-muted-foreground">
          Comece com teste grátis e evolua quando fizer sentido. Valores sob consulta.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          Teste grátis para começar · PIX, boleto ou cartão
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              'flex h-full flex-col p-6',
              plan.highlight && 'relative border-primary shadow-lg ring-1 ring-primary lg:-mt-4 lg:pb-8',
            )}
          >
            {plan.badge && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{plan.badge}</Badge>
            )}
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

            <div className="mt-5">
              <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
              <p className="mt-1 text-xs text-muted-foreground">{plan.priceHint}</p>
            </div>

            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <PlanCta href={plan.href} cta={plan.cta} highlight={plan.highlight} />
            </div>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Precisa de algo sob medida?{' '}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          Fale com um especialista
        </a>
        .
      </p>
    </section>
  );
}
