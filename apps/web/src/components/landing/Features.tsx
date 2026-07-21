import { Card } from '@/components/ui/card';
import { FEATURES } from './constants';

export function Features() {
  return (
    <section id="recursos" className="border-y border-border/60 bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tudo que o repasse precisa, em um só lugar
          </h2>
          <p className="mt-4 text-muted-foreground">
            Da captação do carro ao contrato assinado, com contatos, acordos e financeiro sob
            controle.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card key={f.title} className="group p-6 transition-shadow hover:shadow-md">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
