import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Download, Check, Trash2, AlertTriangle } from 'lucide-react';
import { ehAdminTenant, TEMPLATE_PADRAO_CONTRATO, VARIAVEIS_CONTRATO } from '@crm/shared';
import { api } from '@/lib/api';
import { useSession } from '@/providers/session';
import { dataBR } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/primitives';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { EmptyState, PageLoader } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';

interface Contrato {
  id: string;
  negocio_id: string;
  dados_cliente: { comprador_nome?: string };
  status: string;
  created_at: string;
}
interface NegocioOpt {
  id: string;
  carro: string;
  status: string;
}
interface Template {
  id: string;
  nome: string;
  corpo: string;
  padrao: boolean;
  created_at: string;
}

const LISTA = '/contratos';
const LISTA_TEMPLATES = '/contratos?aba=templates';

type Aba = 'contratos' | 'templates';

export function ContratosPage() {
  const { activeTenant } = useSession();
  const navigate = useNavigate();
  const isAdmin = ehAdminTenant(activeTenant?.papel);
  const [sp, setSp] = useSearchParams();
  // não-admin não tem a aba: ?aba=templates na mão cai na lista de contratos
  const aba: Aba = isAdmin && sp.get('aba') === 'templates' ? 'templates' : 'contratos';

  return (
    <>
      <PageHeader
        title="Contratos"
        description={
          aba === 'templates'
            ? 'Modelos de contrato usados na geração do PDF.'
            : 'Gere o contrato de compra e venda pré-preenchido em PDF.'
        }
        action={
          aba === 'templates' ? (
            <Button onClick={() => navigate('/contratos/templates/novo')}>
              <Plus className="h-4 w-4" /> Novo template
            </Button>
          ) : (
            <Button onClick={() => navigate('/contratos/novo')}>
              <Plus className="h-4 w-4" /> Gerar contrato
            </Button>
          )
        }
      />

      {isAdmin && (
        <Tabs<Aba>
          className="mb-4"
          label="Seções de contratos"
          value={aba}
          onValueChange={(v) => setSp(v === 'contratos' ? {} : { aba: v })}
          items={[
            { value: 'contratos', label: 'Contratos' },
            { value: 'templates', label: 'Templates' },
          ]}
        />
      )}

      <TabPanel value={aba}>{aba === 'templates' ? <TemplatesTab /> : <ContratosTab />}</TabPanel>
    </>
  );
}

function ContratosTab() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['contratos', tenantId],
    queryFn: () => api.contratos.list<Contrato[]>(),
  });
  const { data: negocios } = useQuery({
    queryKey: ['negocios', tenantId],
    queryFn: () => api.negocios.list<NegocioOpt[]>(),
  });

  const carroById = new Map((negocios ?? []).map((n) => [n.id, n.carro]));

  async function baixar(id: string) {
    try {
      const { url } = await api.contratos.download(id);
      if (url) window.open(url, '_blank');
      else toast('Link indisponível', 'error');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao baixar', 'error');
    }
  }

  async function remover(id: string) {
    if (!confirm('Excluir este contrato? O PDF também será removido. Esta ação não pode ser desfeita.'))
      return;
    try {
      await api.contratos.remover(id);
      toast('Contrato excluído', 'success');
      qc.invalidateQueries({ queryKey: ['contratos', tenantId] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir', 'error');
    }
  }

  if (isLoading) return <PageLoader />;
  if ((data ?? []).length === 0)
    return (
      <EmptyState
        icon={FileText}
        title="Nenhum contrato"
        description="Gere um contrato a partir de um negócio; ele fica salvo aqui em PDF."
        action={
          <Button onClick={() => navigate('/contratos/novo')}>
            <Plus className="h-4 w-4" /> Gerar contrato
          </Button>
        }
      />
    );

  return (
    <Card className="divide-y divide-border">
      {data!.map((ct) => (
        <div key={ct.id} className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate font-medium">{carroById.get(ct.negocio_id) ?? 'Negócio'}</p>
            <p className="truncate text-xs text-muted-foreground">
              {ct.dados_cliente?.comprador_nome ?? '—'} · {dataBR(ct.created_at)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={ct.status === 'gerado' ? 'success' : 'secondary'}>{ct.status}</Badge>
            <Button variant="outline" size="sm" onClick={() => baixar(ct.id)}>
              <Download className="h-3.5 w-3.5" /> PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={() => remover(ct.id)} aria-label="Excluir">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </Card>
  );
}

function TemplatesTab() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['contrato-templates', tenantId],
    queryFn: () => api.contratos.templates.list<Template[]>(),
  });

  async function remover(e: React.MouseEvent, tpl: Template) {
    e.stopPropagation();
    if (!confirm('Remover este template? Contratos já gerados continuam disponíveis.')) return;
    try {
      await api.contratos.templates.remover(tpl.id);
      toast('Template removido', 'success');
      qc.invalidateQueries({ queryKey: ['contrato-templates', tenantId] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao remover', 'error');
    }
  }

  if (isLoading) return <PageLoader />;
  if (isError)
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Não foi possível carregar os templates"
        description={error instanceof Error ? error.message : 'Erro ao buscar a lista.'}
        action={
          <Button
            variant="outline"
            onClick={() => qc.invalidateQueries({ queryKey: ['contrato-templates', tenantId] })}
          >
            Tentar de novo
          </Button>
        }
      />
    );
  if ((data ?? []).length === 0)
    return (
      <EmptyState
        icon={FileText}
        title="Nenhum template"
        description="Sem template cadastrado, o contrato usa o modelo padrão do sistema."
        action={
          <Button onClick={() => navigate('/contratos/templates/novo')}>
            <Plus className="h-4 w-4" /> Novo template
          </Button>
        }
      />
    );

  return (
    <Card className="divide-y divide-border">
      {data!.map((tpl) => (
        <div
          key={tpl.id}
          role="button"
          tabIndex={0}
          onClick={() => navigate(`/contratos/templates/${tpl.id}`)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') navigate(`/contratos/templates/${tpl.id}`);
          }}
          className="flex cursor-pointer items-center justify-between gap-3 p-4 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{tpl.nome}</p>
            <p className="truncate text-xs text-muted-foreground">
              Criado em {dataBR(tpl.created_at)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {tpl.padrao && <Badge variant="success">padrão</Badge>}
            <Button variant="ghost" size="sm" onClick={(e) => remover(e, tpl)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </Card>
  );
}

/** Tela de criação/edição de tipo de template (RF8.3) — owner/admin. */
export function TemplateFormPage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { id } = useParams();
  const editando = !!id;

  const { data, isLoading } = useQuery({
    queryKey: ['contrato-templates', tenantId],
    queryFn: () => api.contratos.templates.list<Template[]>(),
    enabled: editando,
  });

  if (!ehAdminTenant(activeTenant?.papel)) return <Navigate to={LISTA} replace />;
  if (editando && isLoading) return <PageLoader />;
  const tpl = editando ? (data ?? []).find((t) => t.id === id) ?? null : null;
  if (editando && !tpl) return <Navigate to={LISTA_TEMPLATES} replace />;

  return (
    <>
      <PageHeader
        title={editando ? 'Editar template' : 'Novo template'}
        description="Modelo do contrato de compra e venda. Vazio na geração usa o padrão do sistema."
        backTo={LISTA_TEMPLATES}
      />
      <TemplateForm key={tpl?.id ?? 'novo'} tpl={tpl} />
    </>
  );
}

function TemplateForm({ tpl }: { tpl: Template | null }) {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [nome, setNome] = useState(tpl?.nome ?? '');
  const [corpo, setCorpo] = useState(tpl?.corpo ?? '');
  const [padrao, setPadrao] = useState(tpl?.padrao ?? false);
  const [loading, setLoading] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = { nome, corpo, padrao };
    try {
      if (tpl) await api.contratos.templates.update(tpl.id, payload);
      else await api.contratos.templates.create(payload);
      toast('Template salvo', 'success');
      qc.invalidateQueries({ queryKey: ['contrato-templates', tenantId] });
      navigate(LISTA_TEMPLATES);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto max-w-3xl p-5 sm:p-6">
      <form onSubmit={salvar} className="space-y-4">
        <Field label="Nome">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            placeholder="Ex.: Repasse lojista"
          />
        </Field>
        <Field label="Corpo do contrato">
          <Textarea
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            required
            rows={16}
            className="font-mono text-xs"
            placeholder={TEMPLATE_PADRAO_CONTRATO}
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Variáveis: {VARIAVEIS_CONTRATO.map((v) => `{{${v}}}`).join(' ')}
        </p>
        <label className="flex items-center justify-between rounded-lg border border-border p-3">
          <span className="text-sm font-medium">Usar como padrão</span>
          <Switch checked={padrao} onCheckedChange={setPadrao} />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(LISTA_TEMPLATES)}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            <Check className="h-4 w-4" /> Salvar template
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Tela de geração de contrato (substitui o antigo modal). */
export function ContratoFormPage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: negocios } = useQuery({
    queryKey: ['negocios', tenantId],
    queryFn: () => api.negocios.list<NegocioOpt[]>(),
  });
  const { data: templates } = useQuery({
    queryKey: ['contrato-templates', tenantId],
    queryFn: () => api.contratos.templates.list<Template[]>(),
  });

  const [negocioId, setNegocioId] = useState('');
  useEffect(() => {
    if (!negocioId && negocios?.[0]) setNegocioId(negocios[0].id);
  }, [negocios, negocioId]);
  const [templateId, setTemplateId] = useState('');
  useEffect(() => {
    if (!templateId && templates?.length)
      setTemplateId((templates.find((t) => t.padrao) ?? templates[0]).id);
  }, [templates, templateId]);
  const [nome, setNome] = useState('');
  const [doc, setDoc] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('');
  const [loading, setLoading] = useState(false);

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.contratos.gerar({
        negocio_id: negocioId,
        template_id: templateId || null, // '' quebraria o uuid() do schema
        dados_cliente: {
          comprador_nome: nome,
          comprador_doc: doc,
          comprador_endereco: endereco,
          cidade,
        },
      });
      toast('Contrato gerado', 'success');
      qc.invalidateQueries({ queryKey: ['contratos', tenantId] });
      if (r.url) window.open(r.url, '_blank');
      navigate(LISTA);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao gerar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Gerar contrato"
        description="Dados do comprador para preencher o contrato."
        backTo={LISTA}
      />
      <Card className="mx-auto max-w-lg p-5 sm:p-6">
        <form onSubmit={gerar} className="space-y-4">
          <Field label="Negócio">
            <Select value={negocioId} onChange={(e) => setNegocioId(e.target.value)} required>
              {(negocios ?? []).map((n) => (
                <option key={n.id} value={n.id}>
                  {n.carro}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Template">
            <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {(templates ?? []).length === 0 && <option value="">Padrão do sistema</option>}
              {(templates ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                  {t.padrao ? ' (padrão)' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nome do comprador">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CPF/CNPJ">
              <Input value={doc} onChange={(e) => setDoc(e.target.value)} />
            </Field>
            <Field label="Cidade">
              <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
            </Field>
          </div>
          <Field label="Endereço">
            <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(LISTA)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              <Check className="h-4 w-4" /> Gerar PDF
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
