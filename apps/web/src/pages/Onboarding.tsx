import { useState } from 'react';
import { Building2, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/providers/session';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/primitives';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function OnboardingPage() {
  const { toast } = useToast();
  const { reload, switchTenant, signOut } = useSession();
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // sufixo aleatório maior reduz colisão com o unique constraint do slug
      const slug = `${slugify(nome)}-${Math.random().toString(36).slice(2, 8)}`;
      const { tenant_id } = await api.tenants.create(nome, slug);
      // reemite o JWT já com o tenant ativo e recarrega a sessão
      await switchTenant(tenant_id);
      await reload();
      toast('Organização criada! Bem-vindo 🎉', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao criar organização', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <CardTitle>Crie sua organização</CardTitle>
            <CardDescription>
              Cada repassador tem seu próprio espaço isolado — seus negócios, contatos e número de
              WhatsApp. Você será o owner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={criar} className="space-y-4">
              <Field label="Nome da empresa">
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Carvalho Júnior Repasses"
                  required
                />
              </Field>
              <Button type="submit" className="w-full" loading={loading}>
                Criar e começar
              </Button>
            </form>
          </CardContent>
        </Card>
        <button
          onClick={signOut}
          className="mx-auto flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </div>
  );
}
