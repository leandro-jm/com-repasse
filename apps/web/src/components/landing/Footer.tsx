import { Link } from 'react-router-dom';
import { Car } from 'lucide-react';
import { COMPANY, LOGIN_URL, PRODUCT, SIGNUP_URL, WHATSAPP_URL } from './constants';

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Car className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold tracking-tight">{PRODUCT}</span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              O CRM completo para repassadores de veículos: gestão de negócios, contratos, acordos e
              financeiro — com campanhas no WhatsApp oficial. Sem planilha frágil.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Produto</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#recursos" className="hover:text-foreground">
                  Recursos
                </a>
              </li>
              <li>
                <a href="#como-funciona" className="hover:text-foreground">
                  Como funciona
                </a>
              </li>
              <li>
                <a href="#planos" className="hover:text-foreground">
                  Planos
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-foreground">
                  Dúvidas
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Comece agora</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to={SIGNUP_URL} className="hover:text-foreground">
                  Teste grátis
                </Link>
              </li>
              <li>
                <Link to={LOGIN_URL} className="hover:text-foreground">
                  Entrar
                </Link>
              </li>
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  Falar no WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {PRODUCT}. Uma solução distribuída pela{' '}
            <span className="font-medium text-foreground">{COMPANY}</span>.
          </p>
          <p>Feito para repassadores de veículos.</p>
        </div>
      </div>
    </footer>
  );
}
