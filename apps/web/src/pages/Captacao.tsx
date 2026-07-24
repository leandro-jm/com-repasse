import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/providers/session';
import { brl } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/primitives';
import { PageLoader, EmptyState } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';

interface RoiLinha {
  fonte_id: string | null;
  fonte: string;
  num_vendas: number;
  lucro_bruto: number;
  lucro_liquido: number;
  ticket_medio: number;
  participacao_pct: number | null;
  leads: number;
  investimento: number;
  custo_captadora: number;
  cpl: number | null;
  cps: number | null;
}

const LISTA = '/captacao';
const ANO = new Date().getFullYear();

export function CaptacaoPage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const navigate = useNavigate();
  const [ano, setAno] = useState(ANO);

  const { data, isLoading } = useQuery({
    queryKey: ['roi', tenantId, ano],
    queryFn: () => api.financeiro.roi<RoiLinha[]>(`${ano}-01-01`, `${ano}-12-31`),
  });

  return (
    <>
      <PageHeader
        title="Captação / ROI"
        description="Retorno por canal de aquisição, com CPL, CPS e custo de captadora."
        action={
          <div className="flex gap-2">
            <Select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="w-28">
              {[ANO, ANO - 1, ANO - 2].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
            <Button onClick={() => navigate('/captacao/investimento')}>
              <Plus className="h-4 w-4" /> Investimento
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <PageLoader />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Sem dados no período"
          description="Cadastre negócios com fonte e lance investimentos por canal para ver o ROI."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>ROI por canal — {ano}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-3">Canal</th>
                  <th className="p-3 text-right">Vendas</th>
                  <th className="p-3 text-right">Lucro líq.</th>
                  <th className="p-3 text-right">Ticket</th>
                  <th className="p-3 text-right">Leads</th>
                  <th className="p-3 text-right">Investido</th>
                  <th className="p-3 text-right">CPL</th>
                  <th className="p-3 text-right">CPS</th>
                  <th className="p-3 text-right">Captadora</th>
                  <th className="p-3 text-right">Part.</th>
                </tr>
              </thead>
              <tbody>
                {data!.map((r) => (
                  <tr key={r.fonte_id ?? 'sem'} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium">{r.fonte}</td>
                    <td className="p-3 text-right">{r.num_vendas}</td>
                    <td className="p-3 text-right">{brl(Number(r.lucro_liquido))}</td>
                    {/* Ticket = lucro líquido ÷ nº de vendas. */}
                    <td className="p-3 text-right">
                      {brl(r.num_vendas > 0 ? Number(r.lucro_liquido) / r.num_vendas : 0)}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">{r.leads}</td>
                    <td className="p-3 text-right">{brl(Number(r.investimento))}</td>
                    <td className="p-3 text-right">{r.cpl == null ? '—' : brl(Number(r.cpl))}</td>
                    <td className="p-3 text-right">{r.cps == null ? '—' : brl(Number(r.cps))}</td>
                    <td className="p-3 text-right">{brl(Number(r.custo_captadora))}</td>
                    <td className="p-3 text-right">{r.participacao_pct == null ? '—' : `${Number(r.participacao_pct).toFixed(0)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </>
  );
}

/** Tela de investimento por canal (substitui o antigo modal). */
export function InvestimentoFormPage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: fontes } = useQuery({
    queryKey: ['fontes', tenantId],
    queryFn: () => api.negocios.fontes<{ id: string; nome: string }[]>(),
  });

  const [fonteId, setFonteId] = useState('');
  useEffect(() => {
    if (!fonteId && fontes?.[0]) setFonteId(fontes[0].id);
  }, [fontes, fonteId]);
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [investimento, setInvestimento] = useState('');
  const [leads, setLeads] = useState('');
  const [captadora, setCaptadora] = useState('');
  const [loading, setLoading] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.financeiro.salvarInvestimento({
        fonte_id: fonteId || null,
        competencia,
        investimento: Number(investimento || 0),
        leads: Number(leads || 0),
        custo_captadora: Number(captadora || 0),
      });
      toast('Investimento salvo', 'success');
      qc.invalidateQueries({ queryKey: ['roi'] });
      navigate(LISTA);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Investimento por canal"
        description="Some ao mês/canal (CPL/CPS)."
        backTo={LISTA}
      />
      <Card className="mx-auto max-w-lg p-5 sm:p-6">
        <form onSubmit={salvar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Canal">
              <Select value={fonteId} onChange={(e) => setFonteId(e.target.value)}>
                {(fontes ?? []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Competência">
              <Input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
            </Field>
            <Field label="Investimento (R$)">
              <Input type="number" step="0.01" value={investimento} onChange={(e) => setInvestimento(e.target.value)} />
            </Field>
            <Field label="Leads">
              <Input type="number" value={leads} onChange={(e) => setLeads(e.target.value)} />
            </Field>
            <Field label="Custo captadora (R$)" className="col-span-2">
              <Input type="number" step="0.01" value={captadora} onChange={(e) => setCaptadora(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(LISTA)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              <Check className="h-4 w-4" /> Salvar
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
