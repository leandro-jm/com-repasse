import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, DollarSign, Wifi, WifiOff, AlertTriangle, LogIn, Ban, Play } from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/providers/session';
import { brl } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';
import { StatCard, PageLoader, EmptyState } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';

const INST_META: Record<string, { variant: 'success' | 'secondary' | 'destructive'; icon: typeof Wifi }> = {
  conectada: { variant: 'success', icon: Wifi },
  desconectada: { variant: 'secondary', icon: WifiOff },
  banida: { variant: 'destructive', icon: AlertTriangle },
};

interface TenantRow {
  id: string;
  nome: string;
  slug: string;
  status_assinatura: string;
  plano_id: string | null;
  override_limite_envios_mes: number | null;
  created_at: string;
}
interface Overview {
  tenants: TenantRow[];
  planos: { id: string; nome: string; preco_mensal: number; limite_envios_mes: number }[];
  instances: { tenant_id: string; numero: string | null; status: string; provider: string }[];
}

export function BackofficePage() {
  const { claims, reload } = useSession();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['backoffice'],
    enabled: claims.is_super_admin,
    queryFn: () => api.backoffice.overview<Overview>(),
  });

  if (!claims.is_super_admin) {
    return (
      <>
        <PageHeader title="Back-office" />
        <EmptyState icon={Building2} title="Acesso restrito" description="Área exclusiva do super-admin da plataforma." />
      </>
    );
  }
  if (isLoading || !data) return <PageLoader />;

  const planoById = new Map(data.planos.map((p) => [p.id, p]));
  const instByTenant = new Map(data.instances.map((i) => [i.tenant_id, i]));
  const ativos = data.tenants.filter((t) => t.status_assinatura === 'ativa');
  const mrr = ativos.reduce((s, t) => s + Number(planoById.get(t.plano_id ?? '')?.preco_mensal ?? 0), 0);
  const refresh = () => qc.invalidateQueries({ queryKey: ['backoffice'] });

  async function alternarStatus(t: TenantRow) {
    const novo = t.status_assinatura === 'cancelada' ? 'ativa' : 'cancelada';
    try {
      await api.backoffice.setStatus(t.id, novo);
      toast(novo === 'ativa' ? 'Tenant reativado' : 'Tenant suspenso', 'success');
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro', 'error');
    }
  }

  async function impersonar(t: TenantRow) {
    try {
      await api.backoffice.impersonate(t.id);
      await reload();
      navigate('/');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro', 'error');
    }
  }

  return (
    <>
      <PageHeader title="Back-office" description="Gestão de tenants e saúde da plataforma (super-admin)" />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Tenants ativos" value={String(ativos.length)} icon={Building2} />
        <StatCard label="Total de tenants" value={String(data.tenants.length)} icon={Users} />
        <StatCard label="MRR estimado" value={brl(mrr)} icon={DollarSign} tone="success" />
      </div>

      <div className="space-y-3">
        {data.tenants.map((t) => {
          const inst = instByTenant.get(t.id);
          const im = inst ? INST_META[inst.status] : null;
          const plano = planoById.get(t.plano_id ?? '');
          const suspenso = t.status_assinatura === 'cancelada';
          return (
            <Card key={t.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">/{t.slug} · {plano?.nome ?? '—'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {im && inst && (
                    <Badge variant={im.variant}>
                      <im.icon className="mr-1 h-3 w-3" /> {inst.status}
                    </Badge>
                  )}
                  <Badge variant={suspenso ? 'destructive' : t.status_assinatura === 'ativa' ? 'success' : 'secondary'}>
                    {t.status_assinatura}
                  </Badge>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <OverrideLimite tenant={t} plano={plano} onSaved={refresh} />
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => impersonar(t)}>
                  <LogIn className="h-3.5 w-3.5" /> Entrar como
                </Button>
                <Button
                  variant={suspenso ? 'secondary' : 'destructive'}
                  size="sm"
                  onClick={() => alternarStatus(t)}
                >
                  {suspenso ? <Play className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                  {suspenso ? 'Reativar' : 'Suspender'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function OverrideLimite({
  tenant,
  plano,
  onSaved,
}: {
  tenant: TenantRow;
  plano?: { limite_envios_mes: number };
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [val, setVal] = useState(
    tenant.override_limite_envios_mes != null ? String(tenant.override_limite_envios_mes) : '',
  );
  const [saving, setSaving] = useState(false);

  async function salvar() {
    setSaving(true);
    try {
      await api.backoffice.setLimite(tenant.id, val === '' ? null : Number(val));
      toast('Limite atualizado', 'success');
      onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Envios/mês:</span>
      <Input
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={`plano ${plano?.limite_envios_mes ?? '—'}`}
        className="h-8 w-28 text-sm"
      />
      <Button variant="ghost" size="sm" onClick={salvar} loading={saving}>
        Salvar
      </Button>
    </div>
  );
}
