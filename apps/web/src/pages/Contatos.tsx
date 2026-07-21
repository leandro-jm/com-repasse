import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, Users, Search, MessageCircle, Check } from 'lucide-react';
import { normalizarTelefoneBR, TIPO_CONTATO } from '@crm/shared';
import { api } from '@/lib/api';
import { useSession } from '@/providers/session';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field, Input, Select, Switch } from '@/components/ui/primitives';
import { EmptyState, PageLoader } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';

type TipoContato = (typeof TIPO_CONTATO)[number];

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  tipo: TipoContato;
  cidade: string | null;
  tags: string[];
  opt_in_whatsapp: boolean;
  ativo: boolean;
}

const LISTA = '/contatos';

export function ContatosPage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busca, setBusca] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['contatos', tenantId],
    queryFn: () => api.contatos.list<Contato[]>(),
  });

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase();
    return (data ?? []).filter(
      (c) => c.nome.toLowerCase().includes(q) || c.telefone.includes(q),
    );
  }, [data, busca]);

  async function importCSV(file: File) {
    const text = await file.text();
    const linhas = text.split(/\r?\n/).filter(Boolean);
    // aceita header opcional: nome,telefone,tipo,cidade
    const start = linhas[0]?.toLowerCase().includes('telefone') ? 1 : 0;
    const rows = linhas.slice(start).map((l) => {
      const [nome, tel, tipo, cidade] = l.split(/[,;]/).map((s) => s?.trim());
      return {
        nome: nome || 'Sem nome',
        telefone: normalizarTelefoneBR(tel ?? '') ?? tel ?? '',
        tipo: ((TIPO_CONTATO as readonly string[]).includes(tipo)
          ? tipo
          : 'lojista') as TipoContato,
        cidade: cidade || null,
        opt_in_whatsapp: true,
        ativo: true,
      };
    });
    try {
      const { inserted } = await api.contatos.bulk(rows);
      toast(`${inserted} contatos importados`, 'success');
      qc.invalidateQueries({ queryKey: ['contatos', tenantId] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao importar', 'error');
    }
  }

  const optInCount = (data ?? []).filter((c) => c.opt_in_whatsapp && c.ativo).length;

  return (
    <>
      <PageHeader
        title="Contatos"
        description={`${data?.length ?? 0} contatos · ${optInCount} elegíveis para campanha`}
        action={
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importCSV(f);
                e.target.value = ''; // permite reimportar o mesmo arquivo
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> CSV
            </Button>
            <Button onClick={() => navigate('/contatos/novo')}>
              <Plus className="h-4 w-4" /> Novo
            </Button>
          </div>
        }
      />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <PageLoader />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum contato"
          description="Cadastre contatos ou importe um CSV (nome,telefone,tipo,cidade) para montar a lista de transmissão."
          action={
            <Button onClick={() => navigate('/contatos/novo')}>
              <Plus className="h-4 w-4" /> Cadastrar contato
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-border">
          {filtrados.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/contatos/${c.id}`)}
              className="flex w-full items-center gap-3 p-4 text-left hover:bg-accent/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary">
                {c.nome.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.nome}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {c.telefone} {c.cidade ? `· ${c.cidade}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {c.opt_in_whatsapp && c.ativo && (
                  <Badge variant="success">
                    <MessageCircle className="mr-1 h-3 w-3" /> opt-in
                  </Badge>
                )}
                {!c.ativo && <Badge variant="secondary">inativo</Badge>}
              </div>
            </button>
          ))}
        </Card>
      )}
    </>
  );
}

/** Tela de criação/edição de contato (substitui o antigo modal). */
export function ContatoFormPage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { id } = useParams();
  const editando = !!id;

  const { data, isLoading } = useQuery({
    queryKey: ['contatos', tenantId],
    queryFn: () => api.contatos.list<Contato[]>(),
    enabled: editando,
  });

  if (editando && isLoading) return <PageLoader />;
  const contato = editando ? (data ?? []).find((c) => c.id === id) ?? null : null;
  if (editando && !contato) return <Navigate to={LISTA} replace />;

  return (
    <>
      <PageHeader title={editando ? 'Editar contato' : 'Novo contato'} backTo={LISTA} />
      <ContatoForm key={contato?.id ?? 'novo'} contato={contato} />
    </>
  );
}

function ContatoForm({ contato }: { contato: Contato | null }) {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [nome, setNome] = useState(contato?.nome ?? '');
  const [telefone, setTelefone] = useState(contato?.telefone ?? '');
  const [tipo, setTipo] = useState<TipoContato>(contato?.tipo ?? 'lojista');
  const [cidade, setCidade] = useState(contato?.cidade ?? '');
  const [optIn, setOptIn] = useState(contato?.opt_in_whatsapp ?? true);
  const [ativo, setAtivo] = useState(contato?.ativo ?? true);
  const [loading, setLoading] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const tel = normalizarTelefoneBR(telefone) ?? telefone;
    const payload = {
      nome,
      telefone: tel,
      tipo,
      cidade: cidade || null,
      opt_in_whatsapp: optIn,
      ativo,
    };
    try {
      if (contato) await api.contatos.update(contato.id, payload);
      else await api.contatos.create(payload);
      toast('Contato salvo', 'success');
      qc.invalidateQueries({ queryKey: ['contatos', tenantId] });
      navigate(LISTA);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto max-w-lg p-5 sm:p-6">
      <form onSubmit={salvar} className="space-y-4">
        <Field label="Nome">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </Field>
        <Field label="Telefone (WhatsApp)">
          <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} required placeholder="(11) 98888-7777" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoContato)}>
              <option value="lojista">Lojista</option>
              <option value="cliente_final">Cliente final</option>
              <option value="captador">Captador</option>
            </Select>
          </Field>
          <Field label="Cidade">
            <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center justify-between rounded-lg border border-border p-3">
          <span className="text-sm font-medium">Opt-in WhatsApp (consentimento)</span>
          <Switch checked={optIn} onCheckedChange={setOptIn} />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-border p-3">
          <span className="text-sm font-medium">Ativo</span>
          <Switch checked={ativo} onCheckedChange={setAtivo} />
        </label>
        <div className="flex justify-end gap-2 pt-2">
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
