import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Send, MessageCircle, CheckCheck, AlertTriangle, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/providers/session';
import { dataBR, cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, PageLoader } from '@/components/ui/feedback';

interface Campanha {
  id: string;
  tipo: string;
  template_texto: string;
  status: string;
  total_destinatarios: number;
  total_enviados: number;
  total_falhas: number;
  created_at: string;
}

const LISTA = '/campanhas';

const ENVIO_META: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
  pendente: { label: 'Pendente', icon: Clock, cls: 'text-muted-foreground' },
  enviado: { label: 'Enviado', icon: CheckCheck, cls: 'text-primary' },
  entregue: { label: 'Entregue', icon: CheckCheck, cls: 'text-success' },
  lido: { label: 'Lido', icon: CheckCheck, cls: 'text-success' },
  falha: { label: 'Falha', icon: AlertTriangle, cls: 'text-destructive' },
};

export function CampanhasPage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['campanhas', tenantId],
    queryFn: () => api.campanhas.list<Campanha[]>(),
    refetchInterval: 5000, // acompanha o progresso do worker
  });

  return (
    <>
      <PageHeader
        title="Campanhas"
        description="Disparos de WhatsApp e saúde de entrega. Crie disparos ao salvar um negócio com 'enviar para a lista'."
      />

      {isLoading ? (
        <PageLoader />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={Send}
          title="Nenhuma campanha"
          description="Ao cadastrar um carro e marcar 'enviar para a lista', a campanha aparece aqui com o status de cada destinatário."
        />
      ) : (
        <div className="space-y-3">
          {data!.map((c) => {
            const pct = c.total_destinatarios
              ? Math.round((c.total_enviados / c.total_destinatarios) * 100)
              : 0;
            return (
              <Card key={c.id} className="cursor-pointer p-4 hover:bg-accent/40" onClick={() => navigate(`/campanhas/${c.id}`)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {c.tipo === 'novo_carro' ? 'Novo carro' : 'Manual'}
                      </p>
                      <p className="text-xs text-muted-foreground">{dataBR(c.created_at)}</p>
                    </div>
                  </div>
                  <Badge variant={c.status === 'concluida' ? 'success' : 'secondary'}>{c.status}</Badge>
                </div>
                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>{c.total_enviados}/{c.total_destinatarios} enviados</span>
                    {c.total_falhas > 0 && <span className="text-destructive">{c.total_falhas} falhas</span>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

/** Tela de detalhes da campanha (substitui o antigo modal). */
export function CampanhaDetalhePage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { id } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['campanhas', tenantId],
    queryFn: () => api.campanhas.list<Campanha[]>(),
  });

  const { data: envios } = useQuery({
    queryKey: ['envios', id],
    queryFn: () =>
      api.campanhas.envios<
        {
          id: string;
          status: string;
          erro: string | null;
          contatos: { nome: string; telefone: string } | null;
        }[]
      >(id!),
    refetchInterval: 4000,
    enabled: !!id,
  });

  if (isLoading) return <PageLoader />;
  const campanha = (data ?? []).find((c) => c.id === id) ?? null;
  if (!campanha) return <Navigate to={LISTA} replace />;

  return (
    <>
      <PageHeader title="Detalhes da campanha" backTo={LISTA} />
      <Card className="mx-auto max-w-lg p-5 sm:p-6">
        <div className="mb-4 whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 text-sm">
          {campanha.template_texto}
        </div>
        <h3 className="mb-2 text-sm font-medium">Destinatários ({envios?.length ?? 0})</h3>
        <div className="max-h-[60vh] space-y-1 overflow-y-auto">
          {(envios ?? []).map((e) => {
            const meta = ENVIO_META[e.status] ?? ENVIO_META.pendente;
            const Icon = meta.icon;
            const contato = e.contatos as unknown as { nome: string; telefone: string } | null;
            return (
              <div key={e.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                <Icon className={cn('h-4 w-4 shrink-0', meta.cls)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{contato?.nome ?? '—'}</p>
                  {e.erro && <p className="truncate text-xs text-destructive">{e.erro}</p>}
                </div>
                <span className={cn('shrink-0 text-xs', meta.cls)}>{meta.label}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
