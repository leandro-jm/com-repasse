import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Car } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/primitives';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/providers/theme';
import { Moon, Sun } from 'lucide-react';

export function LoginPage() {
  const { toast } = useToast();
  const { mode, toggle } = useTheme();
  const [searchParams] = useSearchParams();
  const [modo, setModo] = useState<'login' | 'signup'>(
    searchParams.get('modo') === 'signup' ? 'signup' : 'login',
  );
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (modo === 'signup') {
        await api.auth.signup(email, senha, nome);
        toast('Conta criada! Entrando…', 'success');
      }
      await api.auth.login(email, senha);
      window.dispatchEvent(new Event('crm-auth-changed'));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha na autenticação', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Link
        to="/"
        className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao site
      </Link>
      <button
        onClick={toggle}
        className="absolute right-4 top-4 rounded-md p-2 text-muted-foreground hover:bg-accent"
        aria-label="Alternar tema"
      >
        {mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Car className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">CRM Repasse</h1>
          <p className="text-sm text-muted-foreground">
            {modo === 'login' ? 'Entre na sua conta' : 'Crie sua conta de repassador'}
          </p>
        </div>

        <Card>
          <CardContent className="pt-5">
            <form onSubmit={onSubmit} className="space-y-4">
              {modo === 'signup' && (
                <Field label="Nome">
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
                </Field>
              )}
              <Field label="E-mail">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </Field>
              <Field label="Senha">
                <Input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                />
              </Field>
              <Button type="submit" className="w-full" loading={loading}>
                {modo === 'login' ? 'Entrar' : 'Criar conta'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          {modo === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
          <button
            className="font-medium text-primary hover:underline"
            onClick={() => setModo((m) => (m === 'login' ? 'signup' : 'login'))}
          >
            {modo === 'login' ? 'Criar conta' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  );
}
