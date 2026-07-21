import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, User, KeyRound } from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/providers/session';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/primitives';
import { PageLoader } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';

interface Perfil {
  id: string;
  nome: string | null;
  email: string;
  telefone: string | null;
}

export function PerfilPage() {
  const { data, isLoading } = useQuery({ queryKey: ['perfil'], queryFn: () => api.perfil.get<Perfil>() });
  return (
    <>
      <PageHeader title="Meu perfil" description="Gerencie seus dados e senha de acesso." />
      {isLoading || !data ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          <DadosPessoais perfil={data} />
          <TrocarSenha />
        </div>
      )}
    </>
  );
}

function DadosPessoais({ perfil }: { perfil: Perfil }) {
  const { toast } = useToast();
  const { reload } = useSession();
  const qc = useQueryClient();
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNome(perfil.nome ?? '');
    setTelefone(perfil.telefone ?? '');
  }, [perfil]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.perfil.update({ nome, telefone });
      toast('Perfil atualizado', 'success');
      qc.invalidateQueries({ queryKey: ['perfil'] });
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
          <User className="h-5 w-5" /> Dados pessoais
        </CardTitle>
        <CardDescription>Nome e telefone exibidos na sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={salvar} className="space-y-4">
          <Field label="E-mail">
            <Input value={perfil.email} disabled />
          </Field>
          <Field label="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </Field>
          <Field label="Telefone">
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="+55 11 98888-7777" />
          </Field>
          <Button type="submit" loading={loading}>
            <Check className="h-4 w-4" /> Salvar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TrocarSenha() {
  const { toast } = useToast();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [conf, setConf] = useState('');
  const [loading, setLoading] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (nova !== conf) {
      toast('A confirmação não confere com a nova senha', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.perfil.trocarSenha(atual, nova);
      toast('Senha alterada com sucesso', 'success');
      setAtual('');
      setNova('');
      setConf('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao trocar senha', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" /> Trocar senha
        </CardTitle>
        <CardDescription>Confirme a senha atual para definir uma nova.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={salvar} className="space-y-4">
          <Field label="Senha atual">
            <Input type="password" value={atual} onChange={(e) => setAtual(e.target.value)} required autoComplete="current-password" />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nova senha">
              <Input type="password" value={nova} onChange={(e) => setNova(e.target.value)} required minLength={6} autoComplete="new-password" />
            </Field>
            <Field label="Confirmar nova senha">
              <Input type="password" value={conf} onChange={(e) => setConf(e.target.value)} required minLength={6} autoComplete="new-password" />
            </Field>
          </div>
          <Button type="submit" loading={loading}>
            <KeyRound className="h-4 w-4" /> Alterar senha
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
