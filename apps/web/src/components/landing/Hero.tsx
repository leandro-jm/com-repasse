import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, LayoutDashboard, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/feedback';
import { SIGNUP_URL, WHATSAPP_URL } from './constants';

function PlatformMock() {
  const negocios = [
    { car: 'Honda Civic 2019', status: 'Vendido', cls: 'text-success' },
    { car: 'Toyota Corolla 2020', status: 'Contrato gerado', cls: 'text-primary' },
    { car: 'Jeep Compass 2018', status: 'Em negociação', cls: 'text-muted-foreground' },
  ];
  return (
    <Card className="w-full max-w-md p-5 shadow-lg">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LayoutDashboard className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">Painel do repasse · Julho</p>
          <p className="text-xs text-muted-foreground">Negócios, financeiro e campanhas</p>
        </div>
        <Badge className="ml-auto">Ao vivo</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCard label="Vendas no mês" value="12" hint="ticket médio R$ 38k" />
        <StatCard label="Lucro (DRE)" value="R$ 42,8k" hint="+18% vs. mês anterior" tone="success" />
      </div>

      <div className="mt-4 space-y-2">
        {negocios.map((n) => (
          <div
            key={n.car}
            className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2"
          >
            <span className="text-sm">{n.car}</span>
            <span className={`text-xs font-medium ${n.cls}`}>{n.status}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
        <MessageCircle className="h-4 w-4" />
        WhatsApp oficial conectado
      </div>
    </Card>
  );
}

export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-background via-background to-primary/5"
    >
      {/* grid sutil de fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
        style={{
          backgroundImage:
            'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2">
        <div className="animate-slide-up">
          <Badge className="gap-1">Feito para repassadores de veículos</Badge>

          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            O CRM completo para o seu repasse de veículos —{' '}
            <span className="text-primary">do primeiro anúncio ao contrato assinado</span>.
          </h1>

          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Gerencie negócios e contatos, feche com contrato em PDF, controle acordos e faturamento,
            acompanhe seu lucro no painel — e anuncie cada carro pelo WhatsApp oficial. Tudo em um só
            lugar, direto do celular.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to={SIGNUP_URL}>
              <Button size="lg" className="w-full gap-2 sm:w-auto">
                Começar teste grátis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="w-full gap-2 sm:w-auto">
                <MessageCircle className="h-4 w-4" />
                Falar com especialista
              </Button>
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Gestão, contratos e financeiro integrados
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              WhatsApp oficial · contatos com opt-in (LGPD)
            </span>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <PlatformMock />
        </div>
      </div>
    </section>
  );
}
