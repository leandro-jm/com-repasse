import { ChevronDown } from 'lucide-react';
import { FAQ } from './constants';

export function Faq() {
  return (
    <section id="faq" className="border-y border-border/60 bg-muted/30 py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Perguntas frequentes</h2>
          <p className="mt-4 text-muted-foreground">
            As dúvidas que todo repassador faz antes de começar.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.question}
              className="group rounded-xl border border-border bg-card px-5 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium">
                {item.question}
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="pb-4 text-sm text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
