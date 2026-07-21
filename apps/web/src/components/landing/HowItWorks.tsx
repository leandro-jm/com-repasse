import { STEPS } from './constants';

export function HowItWorks() {
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Do cadastro ao contrato assinado em 5 passos
        </h2>
        <p className="mt-4 text-muted-foreground">
          Sem consultoria, sem instalação. Você mesmo coloca para rodar no mesmo dia.
        </p>
      </div>

      <ol className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, i) => (
          <li key={step.title} className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
              {i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className="absolute left-11 top-5 hidden h-px w-[calc(100%-2.75rem)] bg-border lg:block"
              />
            )}
            <h3 className="mt-4 font-semibold">{step.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
