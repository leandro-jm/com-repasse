import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, MessageCircle, Building2, Wifi, WifiOff, AlertTriangle, QrCode, Send } from 'lucide-react';
import { TEMPLATE_PADRAO_ANUNCIO } from '@crm/shared';
import { api } from '@/lib/api';
import { useSession } from '@/providers/session';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';

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
  const { data: cfg } = useQuery({
    queryKey: ['tenant-config', activeTenant?.tenant_id],
    queryFn: () => api.tenants.config<TenantConfig>(),
  });
  return (
    <>
      <PageHeader title="Configurações" description={`Organização: ${activeTenant?.nome}`} />
      <div className="space-y-6">
        <DadosEmpresa cfg={cfg} />
        <TemplateCampanha cfg={cfg} />
        <ConexaoWhatsApp />
      </div>
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
          Mensagem padrão do anúncio. Variáveis: {'{{carro}} {{ano}} {{km}} {{ipva}} {{pneus}} {{gastos}} {{fipe}} {{preco}} {{link}}'}. Vazio usa o padrão.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={salvar} className="space-y-3">
          <Textarea
            rows={9}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={TEMPLATE_PADRAO_ANUNCIO}
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

function ConexaoWhatsApp() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: inst } = useQuery({
    queryKey: ['whatsapp', tenantId],
    queryFn: () =>
      api.whatsapp.get<{
        provider: string;
        api_url: string | null;
        instance_name: string | null;
        numero: string | null;
        status: string;
        tem_api_key: boolean;
      } | null>(),
  });

  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [instance, setInstance] = useState('');
  const [numero, setNumero] = useState('');
  const [provider, setProvider] = useState('evolution');
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [conectando, setConectando] = useState(false);

  // hidrata do registro existente quando carrega
  useEffect(() => {
    if (inst) {
      setApiUrl(inst.api_url ?? '');
      setInstance(inst.instance_name ?? '');
      setNumero(inst.numero ?? '');
      setProvider(inst.provider ?? 'evolution');
    }
  }, [inst]);

  // Provisiona a instância e faz polling do QR/estado até conectar (RF3.9)
  async function conectarQR() {
    setConectando(true);
    setQr(null);
    try {
      const prov = await api.whatsapp.provisionar();
      if (prov.qr) setQr(prov.qr);
      for (let i = 0; i < 20; i++) {
        const st = await api.whatsapp.status();
        if (st.status === 'conectada') {
          toast('WhatsApp conectado!', 'success');
          setQr(null);
          qc.invalidateQueries({ queryKey: ['whatsapp', tenantId] });
          return;
        }
        const q = await api.whatsapp.qr();
        if (q.base64) setQr(q.base64);
        await new Promise((r) => setTimeout(r, 3000));
      }
      toast('Tempo esgotado. Tente novamente.', 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao conectar', 'error');
    } finally {
      setConectando(false);
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.whatsapp.save({
        provider,
        api_url: apiUrl,
        instance_name: instance,
        numero: numero || null,
        ...(apiKey ? { api_key: apiKey } : {}), // só sobrescreve se informado
      });
      toast('Conexão WhatsApp salva', 'success');
      setApiKey('');
      qc.invalidateQueries({ queryKey: ['whatsapp', tenantId] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    } finally {
      setLoading(false);
    }
  }

  const meta = inst ? STATUS_META[inst.status as keyof typeof STATUS_META] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" /> Conexão WhatsApp
          {meta && (
            <Badge variant={meta.variant} className="ml-auto">
              <meta.icon className="mr-1 h-3 w-3" /> {meta.label}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Configure sua própria instância do Evolution API. A API key é armazenada de forma segura e
          nunca exibida novamente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={salvar} className="space-y-4">
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
          <Button type="submit" loading={loading}>
            <Check className="h-4 w-4" /> Salvar conexão
          </Button>
        </form>

        {/* Provisionamento multi-instância + QR (RF3.9) — só Evolution */}
        {provider === 'evolution' && (
        <div className="mt-6 border-t border-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Parear número (QR)</p>
              <p className="text-xs text-muted-foreground">
                Cria a instância no seu Evolution e mostra o QR para escanear no WhatsApp.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={conectarQR} loading={conectando}>
              <QrCode className="h-4 w-4" /> Conectar via QR
            </Button>
          </div>
          {qr && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <img
                src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`}
                alt="QR code do WhatsApp"
                className="h-56 w-56 rounded-lg border border-border bg-white p-2"
              />
              <p className="text-xs text-muted-foreground">
                Abra o WhatsApp → Aparelhos conectados → Conectar aparelho
              </p>
            </div>
          )}
        </div>
        )}
      </CardContent>
    </Card>
  );
}
