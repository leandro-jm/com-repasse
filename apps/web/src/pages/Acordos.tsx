import { useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Scale, Check, Paperclip, Download, Trash2, Upload, ExternalLink } from 'lucide-react';
import {
  ANEXO_ACCEPT,
  MAX_ANEXOS_ACORDO,
  MAX_ANEXO_BYTES,
  anexoTipoValido,
  STATUS_ACORDO,
  TIPO_ACORDO,
} from '@crm/shared';
import { api } from '@/lib/api';
import { useSession } from '@/providers/session';
import { brl } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field, Input, Select, Textarea } from '@/components/ui/primitives';
import type { BadgeProps } from '@/components/ui/badge';
import { EmptyState, PageLoader } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';

type TipoAcordo = 'pagamento' | 'recebimento';

interface Acordo {
  id: string;
  codigo_caso: string | null;
  caso: string;
  responsavel: string | null;
  tipo: TipoAcordo | null;
  valor_original: number;
  valor_recuperado_pago: number;
  saldo: number;
  status: string;
  observacoes: string | null;
  link_drive: string | null;
}

interface Pagamento {
  id: string;
  data: string | null;
  beneficiario: string | null;
  valor: number;
  observacoes: string | null;
}

const LISTA = '/acordos';

const STATUS_LABEL: Record<string, string> = {
  em_pagamento: 'Em pagamento',
  notificacao_extrajudicial: 'Notificação Extrajudicial',
  nao_cumpriu_acordo: 'Não cumpriu acordo',
  aguardando: 'Aguardando',
  pago: 'Pago',
};
const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  pago: 'success',
  em_pagamento: 'default',
  aguardando: 'secondary',
  notificacao_extrajudicial: 'warning',
  nao_cumpriu_acordo: 'destructive',
};
const TIPO_LABEL: Record<string, string> = { pagamento: 'Pagamento', recebimento: 'Recebimento' };

const hoje = () => new Date().toISOString().slice(0, 10);

export function AcordosPage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['acordos', tenantId],
    queryFn: () => api.financeiro.acordos<Acordo[]>(),
  });

  async function remover(a: Acordo) {
    if (
      !confirm(
        `Excluir o acordo "${a.caso}"? Os pagamentos e anexos também serão removidos. Esta ação não pode ser desfeita.`,
      )
    )
      return;
    try {
      await api.financeiro.removerAcordo(a.id);
      toast('Acordo excluído', 'success');
      qc.invalidateQueries({ queryKey: ['acordos', tenantId] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir', 'error');
    }
  }

  return (
    <>
      <PageHeader
        title="Acordos"
        description="Controle jurídico de acordos e pagamentos, com saldo automático."
        action={
          <Button onClick={() => navigate('/acordos/novo')}>
            <Plus className="h-4 w-4" /> Novo acordo
          </Button>
        }
      />

      {isLoading ? (
        <PageLoader />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={Scale} title="Nenhum acordo" description="Registre casos e acompanhe o saldo devedor." />
      ) : (
        <div className="space-y-3">
          {data!.map((a) => (
            <Card key={a.id} className="cursor-pointer p-4 hover:bg-accent/40" onClick={() => navigate(`/acordos/${a.id}`)}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {a.codigo_caso && (
                      <span className="font-mono text-xs text-muted-foreground">{a.codigo_caso}</span>
                    )}
                    {a.tipo && (
                      <Badge variant="outline" className="shrink-0">{TIPO_LABEL[a.tipo] ?? a.tipo}</Badge>
                    )}
                  </div>
                  <p className="font-medium">{a.caso}</p>
                  <p className="text-xs text-muted-foreground">{a.responsavel ?? 'Sem responsável'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge variant={STATUS_VARIANT[a.status] ?? 'default'}>
                    {STATUS_LABEL[a.status] ?? a.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      remover(a);
                    }}
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Original</p>
                  <p className="font-medium">{brl(Number(a.valor_original))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pago/Recuperado</p>
                  <p className="font-medium">{brl(Number(a.valor_recuperado_pago))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className="font-semibold text-destructive">{brl(Number(a.saldo))}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/** Tela de novo acordo (substitui o antigo modal). */
export function AcordoFormPage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [caso, setCaso] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [tipo, setTipo] = useState<'' | TipoAcordo>('');
  const [valor, setValor] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [linkDrive, setLinkDrive] = useState('');
  const [loading, setLoading] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.financeiro.criarAcordo({
        caso,
        responsavel: responsavel || null,
        tipo,
        valor_original: Number(valor || 0),
        saldo: Number(valor || 0),
        observacoes: observacoes || null,
        link_drive: linkDrive || '',
      });
      toast('Acordo criado', 'success');
      qc.invalidateQueries({ queryKey: ['acordos', tenantId] });
      navigate(LISTA);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Novo acordo" backTo={LISTA} />
      <Card className="mx-auto max-w-lg p-5 sm:p-6">
        <form onSubmit={salvar} className="space-y-4">
          <Field label="Caso">
            <Input value={caso} onChange={(e) => setCaso(e.target.value)} required />
          </Field>
          <Field label="Tipo de acordo">
            <Select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoAcordo)}
              required
            >
              <option value="" disabled>
                Selecione…
              </option>
              {TIPO_ACORDO.map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Responsável">
            <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </Field>
          <Field label="Valor original">
            <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required />
          </Field>
          <Field label="Link do drive (URL)">
            <Input type="url" placeholder="https://…" value={linkDrive} onChange={(e) => setLinkDrive(e.target.value)} />
          </Field>
          <Field label="Observação">
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(LISTA)}>Cancelar</Button>
            <Button type="submit" loading={loading}><Check className="h-4 w-4" /> Salvar</Button>
          </div>
        </form>
      </Card>
    </>
  );
}

/** Tela de detalhe do acordo: resumo + pagamentos + anexos (substitui o antigo modal). */
export function AcordoDetalhePage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { id } = useParams();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [salvandoStatus, setSalvandoStatus] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['acordos', tenantId],
    queryFn: () => api.financeiro.acordos<Acordo[]>(),
  });

  if (isLoading) return <PageLoader />;
  const acordo = (data ?? []).find((a) => a.id === id) ?? null;
  if (!acordo) return <Navigate to={LISTA} replace />;

  async function mudarStatus(status: string) {
    setSalvandoStatus(true);
    try {
      await api.financeiro.atualizarAcordo(acordo!.id, { status });
      await qc.invalidateQueries({ queryKey: ['acordos', tenantId] });
      toast('Status atualizado', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao atualizar', 'error');
    } finally {
      setSalvandoStatus(false);
    }
  }

  return (
    <>
      <PageHeader title={acordo.caso} description={`Saldo atual: ${brl(Number(acordo.saldo))}`} backTo={LISTA} />
      <div className="mx-auto max-w-lg space-y-5">
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {acordo.codigo_caso && (
                <span className="font-mono text-sm text-muted-foreground">{acordo.codigo_caso}</span>
              )}
              {acordo.tipo && <Badge variant="outline">{TIPO_LABEL[acordo.tipo] ?? acordo.tipo}</Badge>}
            </div>
          </div>
          <Field label="Status">
            <Select
              value={acordo.status}
              disabled={salvandoStatus}
              onChange={(e) => mudarStatus(e.target.value)}
            >
              {STATUS_ACORDO.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          {acordo.observacoes && (
            <div>
              <p className="text-sm font-medium">Observação</p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{acordo.observacoes}</p>
            </div>
          )}
          {acordo.link_drive && (
            <a
              href={acordo.link_drive}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" /> Abrir drive
            </a>
          )}
        </Card>
        <Card className="p-5">
          <Pagamentos acordo={acordo} />
        </Card>
        <Card className="p-5">
          <AnexosAcordo acordoId={acordo.id} />
        </Card>
      </div>
    </>
  );
}

function Pagamentos({ acordo }: { acordo: Acordo }) {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [valor, setValor] = useState('');
  const [benef, setBenef] = useState('');
  const [data, setData] = useState(hoje());
  const [obs, setObs] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: pagamentos } = useQuery({
    queryKey: ['acordo_pag', acordo.id],
    queryFn: () => api.financeiro.pagamentos<Pagamento[]>(acordo.id),
  });

  async function addPagamento(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.financeiro.addPagamento(acordo.id, {
        valor: Number(valor || 0),
        beneficiario: benef || null,
        data: data || undefined,
        observacoes: obs || null,
      });
      setValor('');
      setBenef('');
      setData(hoje());
      setObs('');
      qc.invalidateQueries({ queryKey: ['acordo_pag', acordo.id] });
      qc.invalidateQueries({ queryKey: ['acordos', tenantId] });
      toast('Pagamento registrado (saldo atualizado)', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao registrar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={addPagamento} className="mb-4 space-y-2">
        <div className="flex items-end gap-2">
          <Field label="Beneficiário" className="flex-1">
            <Input value={benef} onChange={(e) => setBenef(e.target.value)} />
          </Field>
          <Field label="Data">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Field>
        </div>
        <div className="flex items-end gap-2">
          <Field label="Observação" className="flex-1">
            <Input value={obs} onChange={(e) => setObs(e.target.value)} />
          </Field>
          <Field label="Valor">
            <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required />
          </Field>
          <Button type="submit" loading={loading}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </form>
      <div className="space-y-1">
        {(pagamentos ?? []).map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate">{p.beneficiario ?? '—'}</span>
                {p.data && <span className="shrink-0 text-xs text-muted-foreground">{p.data}</span>}
              </div>
              {p.observacoes && <p className="truncate text-xs text-muted-foreground">{p.observacoes}</p>}
            </div>
            <span className="shrink-0 font-medium">{brl(Number(p.valor))}</span>
          </div>
        ))}
        {(pagamentos ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sem pagamentos ainda.</p>}
      </div>
    </>
  );
}

interface Anexo {
  id: string;
  nome: string;
  tipo: string | null;
  tamanho: number | null;
}

function AnexosAcordo({ acordoId }: { acordoId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  const { data } = useQuery({
    queryKey: ['acordo_anexos', acordoId],
    queryFn: () => api.financeiro.anexos<Anexo[]>(acordoId),
  });
  const total = data?.length ?? 0;

  async function selecionar(files: File[]) {
    if (files.length === 0) return;
    if (total + files.length > MAX_ANEXOS_ACORDO) {
      toast(`Máximo de ${MAX_ANEXOS_ACORDO} anexos por acordo`, 'error');
      return;
    }
    for (const f of files) {
      if (f.size > MAX_ANEXO_BYTES) return toast(`"${f.name}" excede 5 MB`, 'error');
      if (!anexoTipoValido(f.type)) return toast(`"${f.name}": só imagem, PDF ou DOC`, 'error');
    }
    setEnviando(true);
    try {
      await api.financeiro.uploadAnexos(acordoId, files);
      toast('Anexo(s) enviado(s)', 'success');
      qc.invalidateQueries({ queryKey: ['acordo_anexos', acordoId] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha no upload', 'error');
    } finally {
      setEnviando(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function baixar(id: string) {
    try {
      const { url } = await api.financeiro.downloadAnexo(id);
      if (url) window.open(url, '_blank');
      else toast('Link indisponível', 'error');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao baixar', 'error');
    }
  }
  async function remover(id: string) {
    if (!confirm('Remover este anexo?')) return;
    try {
      await api.financeiro.removerAnexo(id);
      qc.invalidateQueries({ queryKey: ['acordo_anexos', acordoId] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao remover', 'error');
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">Anexos ({total}/{MAX_ANEXOS_ACORDO})</h3>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ANEXO_ACCEPT}
          className="hidden"
          onChange={(e) => selecionar(Array.from(e.target.files ?? []))}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={enviando}
          disabled={total >= MAX_ANEXOS_ACORDO}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" /> Anexar
        </Button>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">Imagens, PDF ou DOC · até 5 MB cada.</p>
      <div className="space-y-1">
        {(data ?? []).map((a) => (
          <div key={a.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
            <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{a.nome}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {a.tamanho ? `${(a.tamanho / 1024 / 1024).toFixed(1)} MB` : ''}
            </span>
            <button onClick={() => baixar(a.id)} className="text-muted-foreground hover:text-foreground" aria-label="Baixar">
              <Download className="h-4 w-4" />
            </button>
            <button onClick={() => remover(a.id)} className="text-destructive" aria-label="Remover">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {total === 0 && <p className="text-sm text-muted-foreground">Nenhum anexo.</p>}
      </div>
    </div>
  );
}
