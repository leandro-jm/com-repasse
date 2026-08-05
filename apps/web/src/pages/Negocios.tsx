import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Car, Filter, Trash2 } from 'lucide-react';
import { STATUS_NEGOCIO } from '@crm/shared';
import { api } from '@/lib/api';
import { useSession } from '@/providers/session';
import { brl, dataBR, cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, PageLoader } from '@/components/ui/feedback';
import { Select } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';

export interface Negocio {
  id: string;
  data_negocio: string;
  carro: string;
  placa: string | null;
  ano: number | null;
  km: number | null;
  data_retirada: string | null;
  data_entrega: string | null;
  valor_compra: number;
  custos_pagos_cliente: number;
  valor_venda: number;
  custos_operacionais: number;
  comissao_terceiros: number;
  lucro: number;
  fonte_id: string | null;
  documento_comprador_id: string | null;
  status: string;
  observacoes: string | null;
}

/** Normaliza placa p/ busca: sem hífen/espaço e minúscula (ABC-1D23 → abc1d23). */
const normalizarPlaca = (s: string) => s.replace(/[^a-z0-9]/gi, '').toLowerCase();

const STATUS_META: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  em_negociacao: { label: 'Em negociação', variant: 'secondary' },
  vendido: { label: 'Vendido', variant: 'default' },
  entregue: { label: 'Entregue', variant: 'success' },
  problema: { label: 'Problema', variant: 'destructive' },
};

export function NegociosPage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [fStatus, setFStatus] = useState('');
  const [fFonte, setFFonte] = useState('');
  const [fMes, setFMes] = useState('');
  const [fPlaca, setFPlaca] = useState('');

  const { data: fontes } = useQuery({
    queryKey: ['fontes', tenantId],
    queryFn: () => api.negocios.fontes<{ id: string; nome: string }[]>(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['negocios', tenantId],
    queryFn: () => api.negocios.list<Negocio[]>(),
  });

  // RF1.6 — tabela única filtrada por período/status/fonte/placa
  const placaBusca = normalizarPlaca(fPlaca);
  const filtrados = useMemo(() => {
    return (data ?? []).filter((n) => {
      if (fStatus && n.status !== fStatus) return false;
      if (fFonte && n.fonte_id !== fFonte) return false;
      if (fMes && !n.data_negocio.startsWith(fMes)) return false;
      if (placaBusca && !normalizarPlaca(n.placa ?? '').includes(placaBusca)) return false;
      return true;
    });
  }, [data, fStatus, fFonte, fMes, placaBusca]);

  const totalLucro = filtrados.reduce((s, n) => s + Number(n.lucro), 0);

  async function remover(n: Negocio) {
    if (
      !confirm(
        `Excluir o negócio "${n.carro}"? Os contratos gerados e as fotos deste negócio também serão removidos. Esta ação não pode ser desfeita.`,
      )
    )
      return;
    try {
      await api.negocios.remover(n.id);
      toast('Negócio excluído', 'success');
      qc.invalidateQueries({ queryKey: ['negocios', tenantId] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir', 'error');
    }
  }

  return (
    <>
      <PageHeader
        title="Negócios"
        description={`${filtrados.length} negócios · lucro ${brl(totalLucro)}`}
        action={
          <Button onClick={() => navigate('/negocios/novo')}>
            <Plus className="h-4 w-4" /> Novo negócio
          </Button>
        }
      />

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          value={fPlaca}
          onChange={(e) => setFPlaca(e.target.value)}
          placeholder="Buscar por placa"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        />
        <input
          type="month"
          value={fMes}
          onChange={(e) => setFMes(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        />
        <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-9 w-auto">
          <option value="">Todos os status</option>
          {STATUS_NEGOCIO.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </Select>
        <Select value={fFonte} onChange={(e) => setFFonte(e.target.value)} className="h-9 w-auto">
          <option value="">Todas as fontes</option>
          {fontes?.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </Select>
        {(fStatus || fFonte || fMes || fPlaca) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFStatus('');
              setFFonte('');
              setFMes('');
              setFPlaca('');
            }}
          >
            Limpar
          </Button>
        )}
      </Card>

      {isLoading ? (
        <PageLoader />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Nenhum negócio"
          description="Cadastre a entrada de um carro para começar a controlar lucro e fotos."
          action={
            <Button onClick={() => navigate('/negocios/novo')}>
              <Plus className="h-4 w-4" /> Cadastrar negócio
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtrados.map((n) => {
            const meta = STATUS_META[n.status];
            const lucro = Number(n.lucro);
            return (
              <Card key={n.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <button className="min-w-0 text-left" onClick={() => navigate(`/negocios/${n.id}`)}>
                    <p className="truncate font-semibold">{n.carro}</p>
                    <p className="text-xs text-muted-foreground">
                      {n.placa ? `${n.placa} · ` : ''}
                      {n.ano ?? '—'} · {dataBR(n.data_negocio)}
                    </p>
                  </button>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Lucro</p>
                    <p className={cn('text-lg font-bold', lucro >= 0 ? 'text-success' : 'text-destructive')}>
                      {brl(lucro)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Venda {brl(n.valor_venda)}</p>
                    <p>Compra {brl(n.valor_compra)}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/negocios/${n.id}`)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remover(n)} aria-label="Excluir">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
