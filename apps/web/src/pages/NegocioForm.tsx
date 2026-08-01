import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ImagePlus, Send, X } from 'lucide-react';
import { lucroNegocio, MAX_FOTOS_POR_NEGOCIO } from '@crm/shared';
import { api } from '@/lib/api';
import { useSession } from '@/providers/session';
import { brl, cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select, Textarea, Switch } from '@/components/ui/primitives';
import { PageLoader } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import type { Negocio } from './Negocios';

const LISTA = '/negocios';

type NumKey =
  | 'valor_compra'
  | 'custos_pagos_cliente'
  | 'valor_venda'
  | 'custos_operacionais'
  | 'comissao_terceiros';

/** Tela de criação/edição de negócio (substitui o antigo modal). */
export function NegocioFormPage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { id } = useParams();
  const editando = !!id;

  const { data: fontes } = useQuery({
    queryKey: ['fontes', tenantId],
    queryFn: () => api.negocios.fontes<{ id: string; nome: string }[]>(),
  });

  const { data: negocios, isLoading } = useQuery({
    queryKey: ['negocios', tenantId],
    queryFn: () => api.negocios.list<Negocio[]>(),
    enabled: editando,
  });

  const negocio = editando ? (negocios ?? []).find((n) => n.id === id) ?? null : null;

  if (editando && isLoading) return <PageLoader />;

  return (
    <>
      <PageHeader title={editando ? 'Editar negócio' : 'Novo negócio'} backTo={LISTA} />
      <NegocioForm key={negocio?.id ?? 'novo'} negocio={negocio} fontes={fontes ?? []} />
    </>
  );
}

function NegocioForm({
  negocio,
  fontes,
}: {
  negocio: Negocio | null;
  fontes: { id: string; nome: string }[];
}) {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState({
    carro: negocio?.carro ?? '',
    placa: negocio?.placa ?? '',
    ano: negocio?.ano ?? '',
    km: negocio?.km ?? '',
    data_negocio: negocio?.data_negocio ?? new Date().toISOString().slice(0, 10),
    data_retirada: negocio?.data_retirada ?? '',
    data_entrega: negocio?.data_entrega ?? '',
    valor_compra: negocio?.valor_compra ?? 0,
    custos_pagos_cliente: negocio?.custos_pagos_cliente ?? 0,
    valor_venda: negocio?.valor_venda ?? 0,
    custos_operacionais: negocio?.custos_operacionais ?? 0,
    comissao_terceiros: negocio?.comissao_terceiros ?? 0,
    fonte_id: negocio?.fonte_id ?? '',
    status: negocio?.status ?? 'em_negociacao',
    ipva_status: negocio?.ipva_status ?? '',
    pneus: negocio?.pneus ?? '',
    gastos: negocio?.gastos ?? '',
    fipe: negocio?.fipe ?? '',
    preco_pedido: negocio?.preco_pedido ?? '',
    observacoes: negocio?.observacoes ?? '',
  });
  const [fotos, setFotos] = useState<File[]>([]);
  const [fotosExistentes, setFotosExistentes] = useState(0);
  const [enviarLista, setEnviarLista] = useState(false);
  const [grupoEnvio, setGrupoEnvio] = useState('');
  const [loading, setLoading] = useState(false);

  // grupos p/ o disparo segmentado (tags dos contatos)
  const { data: grupos } = useQuery({
    queryKey: ['grupos', tenantId],
    queryFn: () => api.contatos.grupos<string[]>(),
  });

  // ao editar, conta as fotos já existentes p/ respeitar o limite (RF1.4)
  useEffect(() => {
    if (negocio) {
      api.negocios
        .fotos<unknown[]>(negocio.id)
        .then((list) => setFotosExistentes(list.length))
        .catch(() => setFotosExistentes(0));
    }
  }, [negocio]);

  const restanteFotos = Math.max(0, MAX_FOTOS_POR_NEGOCIO - fotosExistentes - fotos.length);

  function adicionarFotos(selecionadas: File[]) {
    const espaco = MAX_FOTOS_POR_NEGOCIO - fotosExistentes - fotos.length;
    if (espaco <= 0) {
      toast(`Limite de ${MAX_FOTOS_POR_NEGOCIO} fotos por negócio atingido`, 'error');
      return;
    }
    if (selecionadas.length > espaco) {
      toast(`Só cabem mais ${espaco} foto(s); as excedentes foram ignoradas`, 'info');
    }
    setFotos((s) => [...s, ...selecionadas.slice(0, espaco)]);
  }

  const num = (v: string | number) => (v === '' ? 0 : Number(v));
  const lucro = lucroNegocio({
    valor_venda: num(f.valor_venda),
    valor_compra: num(f.valor_compra),
    custos_pagos_cliente: num(f.custos_pagos_cliente),
    custos_operacionais: num(f.custos_operacionais),
    comissao_terceiros: num(f.comissao_terceiros),
  });

  function setNum(k: NumKey, v: string) {
    setF((s) => ({ ...s, [k]: v }));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        carro: f.carro,
        placa: f.placa || null,
        ano: f.ano ? Number(f.ano) : null,
        km: f.km ? Number(f.km) : null,
        data_negocio: f.data_negocio,
        data_retirada: f.data_retirada || null,
        data_entrega: f.data_entrega || null,
        valor_compra: num(f.valor_compra),
        custos_pagos_cliente: num(f.custos_pagos_cliente),
        valor_venda: num(f.valor_venda),
        custos_operacionais: num(f.custos_operacionais),
        comissao_terceiros: num(f.comissao_terceiros),
        fonte_id: f.fonte_id || null,
        status: f.status as 'em_negociacao' | 'vendido' | 'entregue' | 'problema',
        ipva_status: (f.ipva_status || null) as 'pago' | 'aberto' | null,
        pneus: f.pneus || null,
        gastos: f.gastos || null,
        fipe: f.fipe ? Number(f.fipe) : null,
        preco_pedido: f.preco_pedido ? Number(f.preco_pedido) : null,
        observacoes: f.observacoes || null,
      };

      let negocioId = negocio?.id;
      if (negocio) {
        await api.negocios.update(negocio.id, payload);
      } else {
        const criado = await api.negocios.create<{ id: string }>(payload);
        negocioId = criado.id;
      }

      if (fotos.length && negocioId) await api.storage.uploadFotos(negocioId, fotos);

      // RF3.1 — disparo ao marcar "enviar para a lista"
      if (enviarLista && negocioId) {
        try {
          const r = await api.campanhas.novoCarro({
            negocio_id: negocioId,
            grupo: grupoEnvio || null,
            dados: {
              carro: f.carro,
              ano: f.ano ? Number(f.ano) : null,
              km: f.km ? Number(f.km) : null,
              ipva_status: (f.ipva_status || null) as 'pago' | 'aberto' | null,
              pneus: f.pneus || null,
              gastos: f.gastos || null,
              fipe: f.fipe ? Number(f.fipe) : null,
              preco_pedido: f.preco_pedido ? Number(f.preco_pedido) : null,
              observacao: f.observacoes || null,
            },
          });
          toast(
            `Salvo + campanha para ${r.total} contatos${grupoEnvio ? ` (grupo ${grupoEnvio})` : ''}`,
            'success',
          );
        } catch (campErr) {
          toast(`Salvo, mas campanha falhou: ${campErr instanceof Error ? campErr.message : ''}`, 'error');
        }
      } else {
        toast('Negócio salvo', 'success');
      }
      qc.invalidateQueries({ queryKey: ['negocios', tenantId] });
      navigate(LISTA);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto max-w-2xl p-5 sm:p-6">
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Carro" className="col-span-2">
            <Input value={f.carro} onChange={(e) => setF({ ...f, carro: e.target.value })} required />
          </Field>
          <Field label="Placa">
            <Input value={f.placa} onChange={(e) => setF({ ...f, placa: e.target.value })} />
          </Field>
          <Field label="Data do negócio">
            <Input type="date" value={f.data_negocio} onChange={(e) => setF({ ...f, data_negocio: e.target.value })} />
          </Field>
          <Field label="Ano">
            <Input type="number" value={f.ano} onChange={(e) => setF({ ...f, ano: e.target.value })} />
          </Field>
          <Field label="KM">
            <Input type="number" value={f.km} onChange={(e) => setF({ ...f, km: e.target.value })} />
          </Field>
          <Field label="Recebimento do carro">
            <Input type="date" value={f.data_retirada} onChange={(e) => setF({ ...f, data_retirada: e.target.value })} />
          </Field>
          <Field label="Entrega do carro">
            <Input type="date" value={f.data_entrega} onChange={(e) => setF({ ...f, data_entrega: e.target.value })} />
          </Field>
        </div>

        {/* Valores + lucro ao vivo (RB1) */}
        <div className="rounded-lg border border-border p-3">
          <div className="grid grid-cols-2 gap-3">
            <MoneyField label="Valor de compra" value={f.valor_compra} onChange={(v) => setNum('valor_compra', v)} />
            <MoneyField label="Valor de venda" value={f.valor_venda} onChange={(v) => setNum('valor_venda', v)} />
            <MoneyField label="Custos pagos cliente" value={f.custos_pagos_cliente} onChange={(v) => setNum('custos_pagos_cliente', v)} />
            <MoneyField label="Custos operacionais" value={f.custos_operacionais} onChange={(v) => setNum('custos_operacionais', v)} />
            <MoneyField label="Comissão terceiros" value={f.comissao_terceiros} onChange={(v) => setNum('comissao_terceiros', v)} />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">Lucro (calculado)</span>
            <span className={cn('text-lg font-bold', lucro >= 0 ? 'text-success' : 'text-destructive')}>
              {brl(lucro)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              <option value="em_negociacao">Em negociação</option>
              <option value="vendido">Vendido</option>
              <option value="entregue">Entregue</option>
              <option value="problema">Problema</option>
            </Select>
          </Field>
          <Field label="Fonte">
            <Select value={f.fonte_id} onChange={(e) => setF({ ...f, fonte_id: e.target.value })}>
              <option value="">—</option>
              {fontes.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* Campos do anúncio (RF1.3) */}
        <details className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer text-sm font-medium">Dados do anúncio</summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="IPVA">
              <Select value={f.ipva_status} onChange={(e) => setF({ ...f, ipva_status: e.target.value })}>
                <option value="">—</option>
                <option value="pago">Pago</option>
                <option value="aberto">Em aberto</option>
              </Select>
            </Field>
            <Field label="Pneus">
              <Input value={f.pneus} onChange={(e) => setF({ ...f, pneus: e.target.value })} />
            </Field>
            <MoneyField label="FIPE" value={f.fipe} onChange={(v) => setF({ ...f, fipe: v })} />
            <MoneyField label="Preço pedido" value={f.preco_pedido} onChange={(v) => setF({ ...f, preco_pedido: v })} />
            <Field label="Gastos" className="col-span-2">
              <Input value={f.gastos} onChange={(e) => setF({ ...f, gastos: e.target.value })} />
            </Field>
          </div>
        </details>

        <Field label="Observações">
          <Textarea value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} />
        </Field>

        {/* Fotos (RF1.4) — máx. MAX_FOTOS_POR_NEGOCIO por negócio */}
        <Field
          label={`Fotos (a 1ª vira capa) — ${fotosExistentes + fotos.length}/${MAX_FOTOS_POR_NEGOCIO}`}
        >
          <label
            className={cn(
              'flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground',
              restanteFotos > 0 ? 'cursor-pointer hover:bg-accent/50' : 'cursor-not-allowed opacity-60',
            )}
          >
            <ImagePlus className="h-4 w-4" />
            {restanteFotos > 0
              ? `Selecionar fotos (até mais ${restanteFotos})`
              : `Limite de ${MAX_FOTOS_POR_NEGOCIO} fotos atingido`}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={restanteFotos <= 0}
              className="hidden"
              onChange={(e) => {
                adicionarFotos(Array.from(e.target.files ?? []));
                e.target.value = '';
              }}
            />
          </label>
          {fotos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {fotos.map((file, i) => (
                <div key={i} className="relative">
                  <img src={URL.createObjectURL(file)} alt="" className="h-16 w-16 rounded-md object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotos((s) => s.filter((_, j) => j !== i))}
                    className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Field>

        {/* RF3.1 — enviar para a lista */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <label className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Send className="h-4 w-4 text-primary" /> Enviar para a lista (dispara campanha)
            </span>
            <Switch checked={enviarLista} onCheckedChange={setEnviarLista} />
          </label>
          {enviarLista && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Destinatários
              </label>
              <Select value={grupoEnvio} onChange={(e) => setGrupoEnvio(e.target.value)}>
                <option value="">Todos os elegíveis (opt-in + ativo)</option>
                {(grupos ?? []).map((g) => (
                  <option key={g} value={g}>
                    Grupo: {g}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => navigate(LISTA)}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            <Check className="h-4 w-4" /> Salvar
          </Button>
        </div>
      </form>
    </Card>
  );
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
