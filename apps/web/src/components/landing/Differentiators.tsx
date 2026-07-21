import { Check, Smartphone, Lock, Palette, Zap, Layers } from 'lucide-react';

const ITEMS = [
  {
    icon: Zap,
    title: 'Sem pipeline complexo',
    description: 'Carro de repasse gira rápido. Nada de funil interminável — foco em fechar.',
  },
  {
    icon: Layers,
    title: 'Sem catálogo para manter',
    description: 'Você não tem estoque parado; cada carro vira uma página pública na hora.',
  },
  {
    icon: Smartphone,
    title: 'Mobile-first, na nuvem',
    description: 'Feito para operar do celular, no pátio ou na rua. Nada para instalar.',
  },
  {
    icon: Lock,
    title: 'Isolamento por tenant (RLS)',
    description: 'Seus dados isolados no banco, sem vazamento entre contas.',
  },
  {
    icon: Palette,
    title: 'White-label opcional',
    description: 'No plano Agência, use sua marca, cores e domínio para revender.',
  },
];

export function Differentiators() {
  return (
    <section className="border-y border-border/60 bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Não é um CRM genérico. É feito para repasse.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Cada decisão do produto parte de como o repassador realmente trabalha.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((it) => (
            <div key={it.title} className="flex gap-4 rounded-xl border border-border bg-card p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <it.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="flex items-center gap-1.5 font-semibold">
                  <Check className="h-4 w-4 text-success" />
                  {it.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{it.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
