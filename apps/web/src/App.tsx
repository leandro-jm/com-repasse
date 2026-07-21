import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useSession } from './providers/session';
import { AppShell } from './components/AppShell';
import { PageLoader } from './components/ui/feedback';
import { LandingPage } from './pages/Landing';
import { LoginPage } from './pages/Login';
import { OnboardingPage } from './pages/Onboarding';
import { CarroPublicoPage } from './pages/CarroPublico';
import { OptoutPage } from './pages/Optout';
import { DashboardPage } from './pages/Dashboard';
import { NegociosPage } from './pages/Negocios';
import { NegocioFormPage } from './pages/NegocioForm';
import { ContatosPage, ContatoFormPage } from './pages/Contatos';
import { CampanhasPage, CampanhaDetalhePage } from './pages/Campanhas';
import { CaptacaoPage, InvestimentoFormPage } from './pages/Captacao';
import { CustosPage, LancamentoFormPage } from './pages/Custos';
import { AcordosPage, AcordoFormPage, AcordoDetalhePage } from './pages/Acordos';
import { ConfigPage } from './pages/Config';
import { ContratosPage, ContratoFormPage, TemplateFormPage } from './pages/Contratos';
import { UsuariosPage, CadastroUsuarioPage } from './pages/Usuarios';
import { AssinaturaPage } from './pages/Assinatura';
import { PerfilPage } from './pages/Perfil';
import { BackofficePage } from './pages/Backoffice';

/** Layout-guard: só renderiza as telas do tenant se houver um tenant ativo. */
function RequireTenant() {
  const { activeTenant } = useSession();
  return activeTenant ? <Outlet /> : <Navigate to="/admin" replace />;
}

export function App() {
  const { loading, me } = useSession();

  return (
    <Routes>
      {/* Páginas públicas (sem auth) */}
      <Route path="/c/:id" element={<CarroPublicoPage />} />
      <Route path="/sair/:id" element={<OptoutPage />} />

      <Route
        path="/*"
        element={
          loading ? (
            <PageLoader />
          ) : !me ? (
            <Routes>
              {/* Visitante deslogado: landing na raiz, login em /login */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          ) : me.memberships.length === 0 && !me.claims.is_super_admin ? (
            <OnboardingPage />
          ) : (
            <AppShell>
              <Routes>
                {/* Acessíveis mesmo sem tenant ativo (ex.: super-admin sem organização) */}
                <Route path="/perfil" element={<PerfilPage />} />
                <Route path="/admin" element={<BackofficePage />} />

                {/* Telas que exigem um tenant ativo; senão manda ao back-office */}
                <Route element={<RequireTenant />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/negocios" element={<NegociosPage />} />
                  <Route path="/negocios/novo" element={<NegocioFormPage />} />
                  <Route path="/negocios/:id" element={<NegocioFormPage />} />
                  <Route path="/contatos" element={<ContatosPage />} />
                  <Route path="/contatos/novo" element={<ContatoFormPage />} />
                  <Route path="/contatos/:id" element={<ContatoFormPage />} />
                  <Route path="/campanhas" element={<CampanhasPage />} />
                  <Route path="/campanhas/:id" element={<CampanhaDetalhePage />} />
                  <Route path="/captacao" element={<CaptacaoPage />} />
                  <Route path="/captacao/investimento" element={<InvestimentoFormPage />} />
                  <Route path="/custos" element={<CustosPage />} />
                  <Route path="/custos/novo" element={<LancamentoFormPage />} />
                  <Route path="/acordos" element={<AcordosPage />} />
                  <Route path="/acordos/novo" element={<AcordoFormPage />} />
                  <Route path="/acordos/:id" element={<AcordoDetalhePage />} />
                  <Route path="/contratos" element={<ContratosPage />} />
                  <Route path="/contratos/novo" element={<ContratoFormPage />} />
                  <Route path="/contratos/templates/novo" element={<TemplateFormPage />} />
                  <Route path="/contratos/templates/:id" element={<TemplateFormPage />} />
                  <Route path="/usuarios" element={<UsuariosPage />} />
                  <Route path="/usuarios/novo" element={<CadastroUsuarioPage />} />
                  <Route path="/assinatura" element={<AssinaturaPage />} />
                  <Route path="/config" element={<ConfigPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          )
        }
      />
    </Routes>
  );
}
