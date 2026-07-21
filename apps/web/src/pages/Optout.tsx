import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

export function OptoutPage() {
  const { id } = useParams<{ id: string }>();
  const [estado, setEstado] = useState<'processando' | 'ok' | 'erro'>('processando');
  const enviado = useRef<string | null>(null);

  useEffect(() => {
    // guarda contra o duplo-disparo do StrictMode (POST com efeito colateral)
    if (!id || enviado.current === id) return;
    enviado.current = id;
    api.publico
      .optout(id)
      .then((r) => setEstado(r.ok ? 'ok' : 'erro'))
      .catch(() => setEstado('erro'));
  }, [id]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center">
        {estado === 'processando' && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Processando…</p>
          </>
        )}
        {estado === 'ok' && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h1 className="mt-4 text-lg font-semibold">Descadastro concluído</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Você não receberá mais mensagens desta lista. Se mudar de ideia, fale com o vendedor.
            </p>
          </>
        )}
        {estado === 'erro' && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-lg font-semibold">Link inválido</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Não foi possível processar o descadastro. Tente novamente pelo link recebido.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
