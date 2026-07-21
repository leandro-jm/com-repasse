import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/providers/session';
import { brl, dataBR } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';

interface Plano {
  id: string;
  nome: string;
  preco_mensal: number;
  limite_usuarios: number;
  limite_contatos: number;
  limite_envios_mes: number;
  white_label: boolean;
}
interface BillingData {
  assinatura: { status: string; gateway: string | null } | null;
  tenant: { plano_id: string | null; status_assinatura: string; trial_expira_em: string | null };
  planos: Plano[];
}

const STATUS: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  ativa: 'success',
  trial: 'secondary',
  inadimplente: 'warning',
  cancelada: 'destructive',
};

export function AssinaturaPage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['billing', tenantId],
    queryFn: () => api.billing.get<BillingData>(),
  });

  if (isLoading || !data) return <PageLoader />;

  const atualId = data.tenant.plano_id;

  async function assinar(p: Plano) {
    if (!confirm(`Assinar o plano ${p.nome} por ${brl(Number(p.preco_mensal))}/mês?`)) return;
    try {
      const r = await api.billing.assinar(p.id);
      if (r.checkout_url) {
        window.open(r.checkout_url, '_blank');
      } else {
        toast(`Plano ${p.nome} ativado`, 'success');
      }
      qc.invalidateQueries({ queryKey: ['billing', tenantId] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao assinar', 'error');
    }
  }

  return (
    <>
      <PageHeader title="Assinatura" description="Plano, limites e cobrança da sua organização." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Situação atual
            <Badge variant={STATUS[data.tenant.status_assinatura] ?? 'secondary'} className="ml-auto">
              {data.tenant.status_assinatura}
            </Badge>
          </CardTitle>
          <CardDescription>
            {data.tenant.trial_expira_em && data.tenant.status_assinatura === 'trial'
              ? `Trial até ${dataBR(data.tenant.trial_expira_em)}`
              : data.assinatura?.gateway
                ? `Gateway: ${data.assinatura.gateway}`
                : 'Sem cobrança ativa'}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {data.planos.map((p) => {
          const atual = p.id === atualId;
          return (
            <Card key={p.id} className={atual ? 'border-primary ring-1 ring-primary' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {p.nome}
                  {atual && <Badge variant="default">atual</Badge>}
                </CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">{brl(Number(p.preco_mensal))}</span>
                  <span className="text-muted-foreground">/mês</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{p.limite_usuarios} usuários</p>
                <p>{p.limite_contatos} contatos</p>
                <p>{p.limite_envios_mes.toLocaleString('pt-BR')} envios/mês</p>
                <p>{p.white_label ? 'White-label incluso' : 'Sem white-label'}</p>
                <Button
                  className="mt-3 w-full"
                  variant={atual ? 'outline' : 'default'}
                  disabled={atual}
                  onClick={() => assinar(p)}
                >
                  {atual ? (
                    <>
                      <Check className="h-4 w-4" /> Plano atual
                    </>
                  ) : (
                    'Assinar'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
