import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Wallet, Check, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/providers/session';
import { brl, dataBR } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { EmptyState, PageLoader } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';

interface Lancamento {
  id: string;
  data_pagamento: string;
  descricao: string;
  valor: number;
  centro_custo_id: string;
  centros_custo: { nome: string } | null;
}

const LISTA = '/custos';

export function CustosPage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['lancamentos', tenantId],
    queryFn: () => api.financeiro.custos<Lancamento[]>(),
  });

  const total = (data ?? []).reduce((s, l) => s + Number(l.valor), 0);

  async function remover(l: Lancamento) {
    if (!confirm(`Excluir o lançamento "${l.descricao}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.financeiro.removerCusto(l.id);
      toast('Lançamento excluído', 'success');
      qc.invalidateQueries({ queryKey: ['lancamentos', tenantId] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir', 'error');
    }
  }

  return (
    <>
      <PageHeader
        title="Custos"
        description={`${data?.length ?? 0} lançamentos · total ${brl(total)}`}
        action={
          <Button onClick={() => navigate('/custos/novo')}>
            <Plus className="h-4 w-4" /> Lançamento
          </Button>
        }
      />

      {isLoading ? (
        <PageLoader />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={Wallet} title="Sem lançamentos" description="Registre custos por centro de custo para alimentar o DRE." />
      ) : (
        <Card className="divide-y divide-border">
          {data!.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">{l.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  {l.centros_custo?.nome} · {dataBR(l.data_pagamento)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-semibold">{brl(Number(l.valor))}</span>
                <Button variant="ghost" size="icon" onClick={() => remover(l)} aria-label="Excluir">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}

/** Tela de novo lançamento (substitui o antigo modal). */
export function LancamentoFormPage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: centros } = useQuery({
    queryKey: ['centros', tenantId],
    queryFn: () => api.financeiro.centros<{ id: string; nome: string }[]>(),
  });

  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [centro, setCentro] = useState('');
  useEffect(() => {
    if (!centro && centros?.[0]) setCentro(centros[0].id);
  }, [centros, centro]);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState('');
  const [loading, setLoading] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.financeiro.criarCusto({
        descricao,
        valor: Number(valor || 0),
        centro_custo_id: centro,
        data_pagamento: data,
        observacoes: obs || null,
      });
      toast('Lançamento registrado', 'success');
      qc.invalidateQueries({ queryKey: ['lancamentos', tenantId] });
      navigate(LISTA);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Novo lançamento" backTo={LISTA} />
      <Card className="mx-auto max-w-lg p-5 sm:p-6">
        <form onSubmit={salvar} className="space-y-4">
          <Field label="Descrição">
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor">
              <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required />
            </Field>
            <Field label="Data">
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </Field>
          </div>
          <Field label="Centro de custo">
            <Select value={centro} onChange={(e) => setCentro(e.target.value)} required>
              {(centros ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Observações">
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
          </Field>
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
