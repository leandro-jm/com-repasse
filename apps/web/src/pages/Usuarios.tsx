import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Check, Trash2, Eye, EyeOff, Users, AlertTriangle } from 'lucide-react';
import { PAPEIS } from '@crm/shared';
import { api } from '@/lib/api';
import { useSession } from '@/providers/session';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field, Input, Select } from '@/components/ui/primitives';
import { PageLoader, EmptyState } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';

interface Membro {
  usuario_id: string;
  papel: string;
  ativo: boolean;
  nome: string | null;
  email: string;
}

const LISTA = '/usuarios';
const NOVO = '/usuarios/novo';
const SENHA_MIN = 6;

const PAPEL_LABEL: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  operador: 'Operador',
  financeiro: 'Financeiro',
  viewer: 'Viewer',
};

export function UsuariosPage() {
  const { activeTenant, me } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['membros', tenantId],
    queryFn: () => api.membros.list<Membro[]>(),
  });

  async function mudarPapel(m: Membro, papel: string) {
    try {
      await api.membros.setPapel(m.usuario_id, papel);
      toast('Papel atualizado', 'success');
      qc.invalidateQueries({ queryKey: ['membros', tenantId] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro', 'error');
    }
  }

  async function remover(m: Membro) {
    if (!confirm(`Remover ${m.email} deste tenant?`)) return;
    try {
      await api.membros.remover(m.usuario_id);
      toast('Membro removido', 'success');
      qc.invalidateQueries({ queryKey: ['membros', tenantId] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro', 'error');
    }
  }

  const membros = data ?? [];

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Cadastre e gerencie quem tem acesso a esta organização."
        action={
          <Button onClick={() => navigate(NOVO)}>
            <UserPlus className="h-4 w-4" /> Cadastrar
          </Button>
        }
      />

      {isLoading ? (
        <PageLoader />
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Não foi possível carregar os usuários"
          description={error instanceof Error ? error.message : 'Erro ao buscar a lista.'}
          action={
            <Button
              variant="outline"
              onClick={() => qc.invalidateQueries({ queryKey: ['membros', tenantId] })}
            >
              Tentar de novo
            </Button>
          }
        />
      ) : membros.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum usuário ainda"
          description="Cadastre a primeira pessoa que terá acesso a esta organização."
          action={
            <Button onClick={() => navigate(NOVO)}>
              <UserPlus className="h-4 w-4" /> Cadastrar
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-border">
          {membros.map((m) => {
            const eu = m.usuario_id === me?.user.id;
            return (
              <div key={m.usuario_id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary">
                  {(m.nome ?? m.email).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {m.nome ?? m.email} {eu && <span className="text-xs text-muted-foreground">(você)</span>}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                </div>
                {!m.ativo && <Badge variant="secondary">inativo</Badge>}
                <Select
                  value={m.papel}
                  onChange={(e) => mudarPapel(m, e.target.value)}
                  disabled={eu}
                  className="h-9 w-36"
                >
                  {PAPEIS.map((p) => (
                    <option key={p} value={p}>
                      {PAPEL_LABEL[p]}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={eu}
                  onClick={() => remover(m)}
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </Card>
      )}
    </>
  );
}

/** Tela de cadastro de usuário: o admin define a senha diretamente. */
export function CadastroUsuarioPage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [papel, setPapel] = useState('operador');
  const [loading, setLoading] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < SENHA_MIN) {
      toast(`A senha deve ter ao menos ${SENHA_MIN} caracteres`, 'error');
      return;
    }
    setLoading(true);
    try {
      const r = await api.membros.cadastrar({ email, nome, senha, papel });
      qc.invalidateQueries({ queryKey: ['membros', tenantId] });
      toast(
        r.criado ? 'Usuário cadastrado' : 'Usuário existente vinculado à organização',
        'success',
      );
      navigate(LISTA);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao cadastrar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Cadastrar usuário" backTo={LISTA} />
      <Card className="mx-auto max-w-lg p-5 sm:p-6">
        <form onSubmit={enviar} className="space-y-4">
          <Field label="Nome (opcional)">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Senha">
            <div className="relative">
              <Input
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                minLength={SENHA_MIN}
                required
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Mínimo de {SENHA_MIN} caracteres. Compartilhe a senha com a pessoa; ela pode trocá-la depois.
            </p>
          </Field>
          <Field label="Papel">
            <Select value={papel} onChange={(e) => setPapel(e.target.value)}>
              {PAPEIS.filter((p) => p !== 'owner').map((p) => (
                <option key={p} value={p}>
                  {PAPEL_LABEL[p]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(LISTA)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              <Check className="h-4 w-4" /> Cadastrar
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
