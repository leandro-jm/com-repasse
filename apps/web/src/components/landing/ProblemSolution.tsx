import { ArrowRight, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/card';

const PROBLEMS = [
  'Planilha frágil, uma aba por mês, cheia de #REF! e #DIV/0!.',
  'Negócios, contatos e contratos espalhados entre WhatsApp, papel e cabeça.',
  'Sem saber o lucro real por carro nem quais acordos ainda estão em aberto.',
  'Anúncios feitos um a um, sem registro de quem recebeu.',
];

const SOLUTIONS = [
  'Uma base única e confiável de negócios, com lucro calculado automático.',
  'Contatos, contratos e acordos organizados e ligados a cada negócio.',
  'DRE mensal, ROI por canal e saldo de acordos sempre atualizados.',
  'Campanhas no WhatsApp oficial para avisar os compradores certos de uma vez.',
];

export function ProblemSolution() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Do caos da planilha ao controle total
        </h2>
        <p className="mt-4 text-muted-foreground">
          O jeito antigo de tocar o repasse trava suas vendas. O CRM Repasse resolve cada uma dessas
          dores.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-destructive/30 bg-destructive/5 p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <X className="h-4 w-4" />
            </span>
            Como é hoje
          </h3>
          <ul className="mt-5 space-y-3">
            {PROBLEMS.map((p) => (
              <li key={p} className="flex gap-3 text-sm text-muted-foreground">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                {p}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="border-success/30 bg-success/5 p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-4 w-4" />
            </span>
            Com o CRM Repasse
          </h3>
          <ul className="mt-5 space-y-3">
            {SOLUTIONS.map((s) => (
              <li key={s} className="flex gap-3 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {s}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>Menos improviso, mais vendas fechadas</span>
        <ArrowRight className="h-4 w-4 text-primary" />
      </div>
    </section>
  );
}
