import {
  Car,
  UserCheck,
  FileText,
  Scale,
  BarChart3,
  Target,
  MessageCircle,
  Globe,
  type LucideIcon,
} from 'lucide-react';

/** Empresa go-to-market. Piloto: Carvalho Júnior. */
export const COMPANY = 'Niflow';
export const PRODUCT = 'CRM Repasse';

// TODO(niflow): trocar pelo número real de WhatsApp da Niflow.
const WHATSAPP_NUMBER = '55XXXXXXXXXXX';
const WHATSAPP_MESSAGE =
  'Olá! Tenho interesse no CRM Repasse e queria falar com um especialista.';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE,
)}`;

/** CTA de teste grátis → abre o cadastro no app. */
export const SIGNUP_URL = '/login?modo=signup';
export const LOGIN_URL = '/login';

export type NavLink = { label: string; href: string };
export const NAV_LINKS: NavLink[] = [
  { label: 'Recursos', href: '#recursos' },
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Planos', href: '#planos' },
  { label: 'Dúvidas', href: '#faq' },
];

export type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};
// Ordem proposital: a gestão de vendas vem primeiro; o WhatsApp é um dos recursos.
export const FEATURES: Feature[] = [
  {
    icon: Car,
    title: 'Gestão de negócios e veículos',
    description:
      'Uma base única, filtrável por período, status e origem, com fotos e lucro calculado automático. Sua operação inteira de repasse em um só lugar.',
  },
  {
    icon: UserCheck,
    title: 'Base de contatos organizada',
    description:
      'Segmente compradores por tipo, cidade e tags, com consentimento (opt-in) e importação por CSV. Toda a sua carteira sob controle.',
  },
  {
    icon: FileText,
    title: 'Contrato de compra e venda em PDF',
    description:
      'Contrato pré-preenchido com dados do carro, vendedor e comprador, exportável em PDF e guardado junto ao negócio.',
  },
  {
    icon: Scale,
    title: 'Acordos e jurídico',
    description:
      'Controle de disputas e acordos com saldo devedor calculado e pagamentos vinculados. Nunca perca quem te deve.',
  },
  {
    icon: BarChart3,
    title: 'Financeiro e DRE',
    description:
      'DRE mensal automática: receita, custos, comissões, ticket médio e evolução vs. mês anterior. Faturamento e resultado sem planilha.',
  },
  {
    icon: Target,
    title: 'Analítico e ROI por canal',
    description:
      'Descubra qual canal de captação (OLX, ADS e outros) realmente dá lucro, com custo por venda, CPL e receita por origem.',
  },
  {
    icon: MessageCircle,
    title: 'Campanhas no WhatsApp oficial',
    description:
      'Anuncie cada carro novo para a sua base de compradores usando os canais oficiais do WhatsApp, com registro de entregas e leituras.',
  },
  {
    icon: Globe,
    title: 'Página pública do carro',
    description:
      'Cada anúncio leva a uma página com todas as fotos e detalhes do veículo. Vitrine pronta sem precisar de site ou catálogo.',
  },
];

export type Step = { title: string; description: string };
export const STEPS: Step[] = [
  { title: 'Crie sua conta', description: 'Comece o teste grátis em minutos, direto do navegador.' },
  {
    title: 'Centralize negócios e contatos',
    description: 'Cadastre ou importe por CSV e tenha toda a operação em um só lugar.',
  },
  {
    title: 'Conecte o WhatsApp oficial',
    description: 'Anuncie os carros e fale com os compradores pelos canais oficiais.',
  },
  {
    title: 'Feche com contrato',
    description: 'Gere o contrato de compra e venda em PDF e registre o negócio.',
  },
  {
    title: 'Acompanhe os resultados',
    description: 'DRE, ROI por canal e acordos atualizados automaticamente.',
  },
];

export type Plan = {
  name: string;
  tagline: string;
  price: string;
  priceHint: string;
  features: string[];
  cta: string;
  href: string;
  highlight?: boolean;
  badge?: string;
};
export const PLANS: Plan[] = [
  {
    name: 'Starter',
    tagline: 'Para organizar a operação de repasse.',
    price: 'Sob consulta',
    priceHint: 'Inclui teste grátis',
    features: [
      'Gestão de negócios, veículos e contatos',
      'Contrato de compra e venda em PDF',
      'Página pública do carro',
      'Campanhas no WhatsApp oficial',
    ],
    cta: 'Começar teste grátis',
    href: SIGNUP_URL,
  },
  {
    name: 'Pro',
    tagline: 'Para gerir tudo e medir o resultado.',
    price: 'Sob consulta',
    priceHint: 'Inclui teste grátis',
    features: [
      'Tudo do Starter',
      'Financeiro e DRE completa',
      'Analítico e ROI por canal',
      'Acordos e módulo jurídico',
      'Mais usuários, contatos e envios',
    ],
    cta: 'Começar teste grátis',
    href: SIGNUP_URL,
    highlight: true,
    badge: 'Mais popular',
  },
  {
    name: 'Agência',
    tagline: 'Revenda com a sua própria marca.',
    price: 'Sob consulta',
    priceHint: 'White-label',
    features: [
      'Tudo do Pro',
      'White-label (logo, cores e domínio)',
      'Multi-cliente para revenda',
      'Suporte e onboarding dedicados',
    ],
    cta: 'Falar com especialista',
    href: WHATSAPP_URL,
  },
];

export type Faq = { question: string; answer: string };
export const FAQ: Faq[] = [
  {
    question: 'O CRM é só para disparar mensagem no WhatsApp?',
    answer:
      'Não. Ele cuida de toda a gestão do repasse: negócios e veículos, contatos, contratos em PDF, acordos, faturamento e análises. As campanhas de WhatsApp são um dos recursos, não o único.',
  },
  {
    question: 'A integração com o WhatsApp é oficial?',
    answer:
      'Sim. As campanhas usam os canais oficiais do WhatsApp e os contatos entram com opt-in registrado — dentro das regras da plataforma.',
  },
  {
    question: 'Preciso instalar algum aplicativo?',
    answer:
      'Não. O CRM Repasse roda no navegador e é pensado para o dia a dia no celular. Nada para baixar ou atualizar.',
  },
  {
    question: 'Como funciona o teste grátis?',
    answer:
      'Você cria sua conta, cadastra seus negócios e contatos e já começa a usar a gestão completa. Sem cartão para começar.',
  },
  {
    question: 'Meus dados ficam seguros? E a LGPD?',
    answer:
      'Sim. Os contatos entram com opt-in registrado e cada cliente tem seus dados isolados no banco (RLS por tenant), sem vazamento entre contas.',
  },
  {
    question: 'Posso revender com a minha marca?',
    answer:
      'Pode. No plano Agência o produto é white-label: sua logo, suas cores e seu domínio, para você atender vários clientes.',
  },
];
