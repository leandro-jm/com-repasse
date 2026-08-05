import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, ImagePlus, X } from 'lucide-react';
import { MAX_FOTOS_CAMPANHA, TEMPLATE_PADRAO_CAMPANHA } from '@crm/shared';
import { api } from '@/lib/api';
import { useSession } from '@/providers/session';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Select, Textarea } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';

const LISTA = '/campanhas';

interface WhatsNumero {
  id: string;
  label: string | null;
  numero: string | null;
  instance_name: string | null;
  status: string;
}

/** Nome amigável de um número (label → numero → instância). */
function nomeNumero(n: WhatsNumero) {
  return n.label || n.numero || n.instance_name || 'Número WhatsApp';
}

/** Tela de disparo manual: texto livre + até MAX_FOTOS_CAMPANHA fotos + grupo. */
export function CampanhaNovaPage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [texto, setTexto] = useState('');
  const [fotos, setFotos] = useState<File[]>([]);
  const [grupo, setGrupo] = useState('');
  const [instanceId, setInstanceId] = useState('');
  const [loading, setLoading] = useState(false);

  // carrega o template do tenant (ou o padrão) como texto inicial
  const { data: cfg } = useQuery({
    queryKey: ['tenant-config', tenantId],
    queryFn: () => api.tenants.config<{ template_campanha: string | null }>(),
  });
  useEffect(() => {
    if (cfg) setTexto(cfg.template_campanha || TEMPLATE_PADRAO_CAMPANHA);
  }, [cfg]);

  // grupos p/ segmentar o disparo (tags dos contatos)
  const { data: grupos } = useQuery({
    queryKey: ['grupos', tenantId],
    queryFn: () => api.contatos.grupos<string[]>(),
  });

  // números de WhatsApp cadastrados — a campanha usa 1 deles (obrigatório).
  // O pareamento é feito por fora (Evolution), então basta não estar banido.
  const { data: numeros } = useQuery({
    queryKey: ['whatsapp', tenantId],
    queryFn: () => api.whatsapp.list<WhatsNumero[]>(),
  });
  const disponiveis = (numeros ?? []).filter((n) => n.status !== 'banida');

  const restanteFotos = Math.max(0, MAX_FOTOS_CAMPANHA - fotos.length);

  function adicionarFotos(selecionadas: File[]) {
    const espaco = MAX_FOTOS_CAMPANHA - fotos.length;
    if (espaco <= 0) {
      toast(`Limite de ${MAX_FOTOS_CAMPANHA} fotos por campanha atingido`, 'error');
      return;
    }
    if (selecionadas.length > espaco) {
      toast(`Só cabem mais ${espaco} foto(s); as excedentes foram ignoradas`, 'info');
    }
    setFotos((s) => [...s, ...selecionadas.slice(0, espaco)]);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) {
      toast('Informe o texto da campanha', 'error');
      return;
    }
    if (!instanceId) {
      toast('Escolha o número de WhatsApp da campanha', 'error');
      return;
    }
    setLoading(true);
    try {
      const { id } = await api.campanhas.criar({ texto: texto.trim() });
      if (fotos.length) await api.storage.uploadFotosCampanha(id, fotos);
      const r = await api.campanhas.enviar(id, { instance_id: instanceId, grupo: grupo || null });
      toast(
        `Campanha enfileirada para ${r.total} contatos${grupo ? ` (grupo ${grupo})` : ''}`,
        'success',
      );
      qc.invalidateQueries({ queryKey: ['campanhas', tenantId] });
      navigate(LISTA);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao enviar campanha', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Nova campanha" backTo={LISTA} />
      <Card className="mx-auto max-w-2xl p-5 sm:p-6">
        <form onSubmit={enviar} className="space-y-4">
          <Field label="Texto da mensagem">
            <Textarea
              rows={8}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={TEMPLATE_PADRAO_CAMPANHA}
              required
            />
          </Field>

          <Field label={`Fotos — ${fotos.length}/${MAX_FOTOS_CAMPANHA}`}>
            <label
              className={cn(
                'flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground',
                restanteFotos > 0 ? 'cursor-pointer hover:bg-accent/50' : 'cursor-not-allowed opacity-60',
              )}
            >
              <ImagePlus className="h-4 w-4" />
              {restanteFotos > 0
                ? `Selecionar fotos (até mais ${restanteFotos})`
                : `Limite de ${MAX_FOTOS_CAMPANHA} fotos atingido`}
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

          <Field label="Número de envio">
            <Select value={instanceId} onChange={(e) => setInstanceId(e.target.value)} required>
              <option value="">Selecione o número</option>
              {disponiveis.map((n) => (
                <option key={n.id} value={n.id}>
                  {nomeNumero(n)}
                </option>
              ))}
            </Select>
            {disponiveis.length === 0 && (
              <p className="mt-1 text-xs text-destructive">
                Nenhum número cadastrado. Adicione um número em Configurações → Conexão WhatsApp.
              </p>
            )}
          </Field>

          <Field label="Destinatários">
            <Select value={grupo} onChange={(e) => setGrupo(e.target.value)}>
              <option value="">Todos os elegíveis (opt-in + ativo)</option>
              {(grupos ?? []).map((g) => (
                <option key={g} value={g}>
                  Grupo: {g}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => navigate(LISTA)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading} disabled={disponiveis.length === 0}>
              <Send className="h-4 w-4" /> Enviar campanha
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
