import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, MessageCircle, Building2, Wifi, WifiOff, AlertTriangle, RefreshCw, Send, Tag, Plus, FileText, Pencil, Trash2, X } from 'lucide-react';
import { TEMPLATE_PADRAO_CAMPANHA } from '@crm/shared';
import { api } from '@/lib/api';
import { useSession } from '@/providers/session';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';

type ConfigAba = 'empresa' | 'personalizados' | 'whatsapp' | 'campanha';

interface TenantConfig {
  nome: string;
  cor_primaria: string | null;
  logo_url: string | null;
  dominio_custom: string | null;
  email_remetente: string | null;
  template_campanha: string | null;
}

export function ConfigPage() {
  const { activeTenant } = useSession();
  const [aba, setAba] = useState<ConfigAba>('empresa');
  const { data: cfg } = useQuery({
    queryKey: ['tenant-config', activeTenant?.tenant_id],
    queryFn: () => api.tenants.config<TenantConfig>(),
  });
  return (
    <>
      <PageHeader title="Configurações" description={`Organização: ${activeTenant?.nome}`} />
      <Tabs<ConfigAba>
        className="mb-6"
        label="Seções de configurações"
        value={aba}
        onValueChange={setAba}
        items={[
          { value: 'empresa', label: 'Dados da empresa & white-label' },
          { value: 'personalizados', label: 'Dados personalizados' },
          { value: 'whatsapp', label: 'Conexão WhatsApp' },
          { value: 'campanha', label: 'Template de campanha' },
        ]}
      />
      <TabPanel value={aba}>
        {aba === 'empresa' && <DadosEmpresa cfg={cfg} />}
        {aba === 'personalizados' && (
          <div className="space-y-6">
            <FontesLead />
            <DocumentosComprador />
          </div>
        )}
        {aba === 'whatsapp' && <ConexaoWhatsApp />}
        {aba === 'campanha' && <TemplateCampanha cfg={cfg} />}
      </TabPanel>
    </>
  );
}

function DadosEmpresa({ cfg }: { cfg?: TenantConfig }) {
  const { activeTenant, reload } = useSession();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#2563eb');
  const [logo, setLogo] = useState('');
  const [dominio, setDominio] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cfg) {
      setNome(cfg.nome ?? '');
      setCor(cfg.cor_primaria ?? '#2563eb');
      setLogo(cfg.logo_url ?? '');
      setDominio(cfg.dominio_custom ?? '');
      setEmail(cfg.email_remetente ?? '');
    }
  }, [cfg]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.tenants.update({
        nome,
        cor_primaria: cor,
        logo_url: logo,
        dominio_custom: dominio,
        email_remetente: email,
      });
      toast('Dados atualizados', 'success');
      qc.invalidateQueries({ queryKey: ['tenant-config', activeTenant?.tenant_id] });
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" /> Dados da empresa & white-label
        </CardTitle>
        <CardDescription>
          Nome, marca e domínio próprio aplicados no app e na página pública do carro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={salvar} className="space-y-4">
          <Field label="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </Field>
          <Field label="Cor primária">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="h-10 w-14 rounded border border-input bg-background"
              />
              <Input value={cor} onChange={(e) => setCor(e.target.value)} className="w-32" />
            </div>
          </Field>
          <Field label="Logo (URL)">
            <Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://.../logo.png" />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Domínio próprio">
              <Input value={dominio} onChange={(e) => setDominio(e.target.value)} placeholder="cliente.seucrm.com" />
            </Field>
            <Field label="E-mail remetente">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@cliente.com" />
            </Field>
          </div>
          <Button type="submit" loading={loading}>
            <Check className="h-4 w-4" /> Salvar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface Fonte {
  id: string;
  nome: string;
  tipo: 'pago' | 'organico';
  ativo: boolean;
}

function FontesLead() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: fontes } = useQuery({
    queryKey: ['fontes-todas', tenantId],
    queryFn: () => api.negocios.fontesTodas<Fonte[]>(),
  });

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'pago' | 'organico'>('pago');
  const [loading, setLoading] = useState(false);

  // Revalida tanto a lista de admin quanto a lista ativa dos seletores.
  function invalidar() {
    qc.invalidateQueries({ queryKey: ['fontes-todas', tenantId] });
    qc.invalidateQueries({ queryKey: ['fontes', tenantId] });
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setLoading(true);
    try {
      await api.negocios.criarFonte({ nome: nome.trim(), tipo });
      setNome('');
      setTipo('pago');
      toast('Fonte adicionada', 'success');
      invalidar();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao adicionar', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function atualizar(id: string, patch: Partial<Fonte>) {
    try {
      await api.negocios.atualizarFonte(id, patch);
      invalidar();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" /> Fontes de lead
        </CardTitle>
        <CardDescription>
          Canais de origem exibidos no cadastro de negócios e no ROI de captação. Desativar
          preserva o histórico e apenas oculta a fonte dos seletores.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={adicionar} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nova fonte (ex.: Facebook)"
            className="sm:flex-1"
          />
          <Select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as 'pago' | 'organico')}
            className="sm:w-40"
          >
            <option value="pago">Pago</option>
            <option value="organico">Orgânico</option>
          </Select>
          <Button type="submit" loading={loading}>
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </form>

        <div className="mt-4 divide-y divide-border">
          {(fontes ?? []).map((f) => (
            <div key={f.id} className={cn('flex items-center gap-2 py-2', !f.ativo && 'opacity-60')}>
              <Input
                key={f.nome}
                defaultValue={f.nome}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== f.nome) atualizar(f.id, { nome: v });
                  else e.target.value = f.nome;
                }}
                className="h-9 flex-1"
              />
              <Select
                value={f.tipo}
                onChange={(e) => atualizar(f.id, { tipo: e.target.value as 'pago' | 'organico' })}
                className="h-9 w-32"
              >
                <option value="pago">Pago</option>
                <option value="organico">Orgânico</option>
              </Select>
              {!f.ativo && <Badge variant="secondary">inativa</Badge>}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => atualizar(f.id, { ativo: !f.ativo })}
              >
                {f.ativo ? 'Desativar' : 'Reativar'}
              </Button>
            </div>
          ))}
          {fontes?.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">Nenhuma fonte cadastrada ainda.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface Documento {
  id: string;
  nome: string;
  ativo: boolean;
}

function DocumentosComprador() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: documentos } = useQuery({
    queryKey: ['documentos-comprador-todas', tenantId],
    queryFn: () => api.negocios.documentosTodos<Documento[]>(),
  });

  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);

  // Revalida tanto a lista de admin quanto a lista ativa dos seletores.
  function invalidar() {
    qc.invalidateQueries({ queryKey: ['documentos-comprador-todas', tenantId] });
    qc.invalidateQueries({ queryKey: ['documentos-comprador', tenantId] });
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setLoading(true);
    try {
      await api.negocios.criarDocumento({ nome: nome.trim() });
      setNome('');
      toast('Documento adicionado', 'success');
      invalidar();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao adicionar', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function atualizar(id: string, patch: Partial<Documento>) {
    try {
      await api.negocios.atualizarDocumento(id, patch);
      invalidar();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" /> Documento do comprador
        </CardTitle>
        <CardDescription>
          Opções exibidas no select do cadastro de negócios (ex.: Procuração, DUT). Desativar
          preserva o histórico e apenas oculta a opção dos seletores.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={adicionar} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Novo documento (ex.: Recibo)"
            className="sm:flex-1"
          />
          <Button type="submit" loading={loading}>
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </form>

        <div className="mt-4 divide-y divide-border">
          {(documentos ?? []).map((d) => (
            <div key={d.id} className={cn('flex items-center gap-2 py-2', !d.ativo && 'opacity-60')}>
              <Input
                key={d.nome}
                defaultValue={d.nome}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== d.nome) atualizar(d.id, { nome: v });
                  else e.target.value = d.nome;
                }}
                className="h-9 flex-1"
              />
              {!d.ativo && <Badge variant="secondary">inativo</Badge>}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => atualizar(d.id, { ativo: !d.ativo })}
              >
                {d.ativo ? 'Desativar' : 'Reativar'}
              </Button>
            </div>
          ))}
          {documentos?.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">Nenhum documento cadastrado ainda.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateCampanha({ cfg }: { cfg?: TenantConfig }) {
  const { toast } = useToast();
  const { activeTenant } = useSession();
  const qc = useQueryClient();
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cfg) setTexto(cfg.template_campanha ?? '');
  }, [cfg]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.tenants.update({ template_campanha: texto });
      toast('Template salvo', 'success');
      qc.invalidateQueries({ queryKey: ['tenant-config', activeTenant?.tenant_id] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" /> Template de campanha
        </CardTitle>
        <CardDescription>
          Texto padrão que já vem preenchido ao criar uma nova campanha. É enviado como
          está (texto livre) e pode ser editado a cada disparo. Vazio usa o padrão do sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={salvar} className="space-y-3">
          <Textarea
            rows={9}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={TEMPLATE_PADRAO_CAMPANHA}
            className="font-mono text-xs"
          />
          <Button type="submit" loading={loading}>
            <Check className="h-4 w-4" /> Salvar template
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const STATUS_META = {
  conectada: { label: 'Conectada', variant: 'success' as const, icon: Wifi },
  desconectada: { label: 'Desconectada', variant: 'secondary' as const, icon: WifiOff },
  banida: { label: 'Banida', variant: 'destructive' as const, icon: AlertTriangle },
};

interface WhatsInstance {
  id: string;
  provider: string;
  api_url: string | null;
  instance_name: string | null;
  numero: string | null;
  label: string | null;
  status: string;
  last_seen: string | null;
  tem_api_key: boolean;
  throttle_min_ms: number;
  throttle_max_ms: number;
}

/** Nome amigável de um número (label → numero → instância). */
function nomeInstancia(inst: WhatsInstance) {
  return inst.label || inst.numero || inst.instance_name || 'Número WhatsApp';
}

function ConexaoWhatsApp() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: instancias } = useQuery({
    queryKey: ['whatsapp', tenantId],
    queryFn: () => api.whatsapp.list<WhatsInstance[]>(),
  });

  // null = nada aberto; 'new' = criando; objeto = editando aquele número
  const [editando, setEditando] = useState<WhatsInstance | 'new' | null>(null);

  async function remover(inst: WhatsInstance) {
    if (!confirm(`Remover o número "${nomeInstancia(inst)}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.whatsapp.remover(inst.id);
      toast('Número removido', 'success');
      qc.invalidateQueries({ queryKey: ['whatsapp', tenantId] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao remover', 'error');
    }
  }

  const lista = instancias ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" /> Conexão WhatsApp
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setEditando('new')}
          >
            <Plus className="h-4 w-4" /> Adicionar número
          </Button>
        </CardTitle>
        <CardDescription>
          Cadastre um ou mais números. Cada campanha escolhe qual número usar. A API key é armazenada
          de forma segura e nunca exibida novamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {lista.length === 0 && editando !== 'new' && (
          <p className="text-sm text-muted-foreground">
            Nenhum número cadastrado ainda. Clique em “Adicionar número”.
          </p>
        )}

        {lista.map((inst) => {
          const meta = STATUS_META[inst.status as keyof typeof STATUS_META];
          return editando !== 'new' && typeof editando === 'object' && editando?.id === inst.id ? (
            <NumeroForm key={inst.id} inst={inst} tenantId={tenantId} onClose={() => setEditando(null)} />
          ) : (
            <div key={inst.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{nomeInstancia(inst)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {inst.instance_name}
                    {inst.numero ? ` · ${inst.numero}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {meta && (
                    <Badge variant={meta.variant}>
                      <meta.icon className="mr-1 h-3 w-3" /> {meta.label}
                    </Badge>
                  )}
                  {inst.provider === 'evolution' && (
                    <VerificarConexao inst={inst} tenantId={tenantId} />
                  )}
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(inst)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => remover(inst)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {editando === 'new' && (
          <NumeroForm key="new" inst={null} tenantId={tenantId} onClose={() => setEditando(null)} />
        )}
      </CardContent>
    </Card>
  );
}

/** Formulário de criação/edição de um número WhatsApp. */
function NumeroForm({
  inst,
  tenantId,
  onClose,
}: {
  inst: WhatsInstance | null;
  tenantId: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const editando = !!inst;

  const [provider, setProvider] = useState(inst?.provider ?? 'evolution');
  const [apiUrl, setApiUrl] = useState(inst?.api_url ?? '');
  const [apiKey, setApiKey] = useState('');
  const [instance, setInstance] = useState(inst?.instance_name ?? '');
  const [numero, setNumero] = useState(inst?.numero ?? '');
  const [label, setLabel] = useState(inst?.label ?? '');
  const [throttleMin, setThrottleMin] = useState(String(inst?.throttle_min_ms ?? 4000));
  const [throttleMax, setThrottleMax] = useState(String(inst?.throttle_max_ms ?? 12000));
  const [loading, setLoading] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        provider,
        api_url: apiUrl,
        instance_name: instance,
        numero: numero || null,
        label: label || null,
        throttle_min_ms: Number(throttleMin),
        throttle_max_ms: Number(throttleMax),
        ...(apiKey ? { api_key: apiKey } : {}), // só sobrescreve/envia se informado
      };
      if (editando) await api.whatsapp.atualizar(inst!.id, body);
      else await api.whatsapp.criar(body);
      toast(editando ? 'Número atualizado' : 'Número adicionado', 'success');
      qc.invalidateQueries({ queryKey: ['whatsapp', tenantId] });
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{editando ? 'Editar número' : 'Novo número'}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <Field label="Nome (apelido)">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Vendas" />
      </Field>
      <Field label="Provedor">
        <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="evolution">Evolution API</option>
          <option value="cloud_api">WhatsApp Cloud API (oficial)</option>
        </Select>
      </Field>
      <Field label="URL da API">
        <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://evolution.seudominio.com" required />
      </Field>
      <Field label="Instância">
        <Input value={instance} onChange={(e) => setInstance(e.target.value)} placeholder="minha-instancia" required />
      </Field>
      <Field label={inst?.tem_api_key ? 'API key (preencha para trocar)' : 'API key'}>
        <Input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={inst?.tem_api_key ? '••••••••' : ''}
          required={!inst?.tem_api_key}
        />
      </Field>
      <Field label="Número (E.164)">
        <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="+5511988887777" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Intervalo mínimo (ms)">
          <Input type="number" min={0} value={throttleMin} onChange={(e) => setThrottleMin(e.target.value)} placeholder="4000" />
        </Field>
        <Field label="Intervalo máximo (ms)">
          <Input type="number" min={0} value={throttleMax} onChange={(e) => setThrottleMax(e.target.value)} placeholder="12000" />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Tempo de espera aleatório entre cada mensagem da campanha (evita bloqueio). O worker aguarda
        um valor aleatório entre o mínimo e o máximo. Padrão: 4000–12000 ms.
      </p>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          <Check className="h-4 w-4" /> {editando ? 'Salvar' : 'Adicionar'}
        </Button>
      </div>
    </form>
  );
}

/** Verifica o estado real da conexão no Evolution (o pareamento é feito por fora). */
function VerificarConexao({ inst, tenantId }: { inst: WhatsInstance; tenantId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [verificando, setVerificando] = useState(false);

  async function verificar() {
    setVerificando(true);
    try {
      const st = await api.whatsapp.status(inst.id);
      toast(
        st.status === 'conectada' ? 'Número conectado' : 'Número desconectado',
        st.status === 'conectada' ? 'success' : 'info',
      );
      qc.invalidateQueries({ queryKey: ['whatsapp', tenantId] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao verificar', 'error');
    } finally {
      setVerificando(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={verificar}
      loading={verificando}
      title="Verificar conexão"
    >
      <RefreshCw className="h-4 w-4" />
    </Button>
  );
}
