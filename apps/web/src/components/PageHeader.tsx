import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function PageHeader({
  title,
  description,
  action,
  backTo,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Se definido, mostra um botão "voltar" que leva a esta rota (telas que substituíram modais). */
  backTo?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {backTo !== undefined && (
          <Link
            to={backTo}
            aria-label="Voltar"
            className="mt-0.5 shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
