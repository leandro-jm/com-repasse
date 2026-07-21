import {
  LayoutDashboard,
  Car,
  Users,
  Send,
  Wallet,
  Scale,
  FileText,
  Settings,
  Building2,
  TrendingUp,
  UserCog,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';
import type { Papel } from '@crm/shared';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  papeis?: Papel[]; // se definido, só estes papéis veem
  primary?: boolean; // aparece na bottom-nav mobile
  superAdmin?: boolean;
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, primary: true },
  { to: '/negocios', label: 'Negócios', icon: Car, primary: true },
  { to: '/contatos', label: 'Contatos', icon: Users, primary: true },
  { to: '/campanhas', label: 'Campanhas', icon: Send, primary: true },
  { to: '/captacao', label: 'Captação/ROI', icon: TrendingUp, papeis: ['owner', 'admin', 'financeiro', 'viewer'] },
  { to: '/custos', label: 'Custos', icon: Wallet, papeis: ['owner', 'admin', 'financeiro', 'viewer'] },
  { to: '/acordos', label: 'Acordos', icon: Scale, papeis: ['owner', 'admin', 'financeiro', 'viewer'] },
  { to: '/contratos', label: 'Contratos', icon: FileText },
  { to: '/usuarios', label: 'Usuários', icon: UserCog, papeis: ['owner', 'admin'] },
  { to: '/assinatura', label: 'Assinatura', icon: CreditCard, papeis: ['owner', 'admin'] },
  { to: '/config', label: 'Configurações', icon: Settings, papeis: ['owner', 'admin'] },
  { to: '/admin', label: 'Back-office', icon: Building2, superAdmin: true },
];

export function visibleNav(papel: Papel | null, isSuper: boolean): NavItem[] {
  return NAV.filter((item) => {
    if (item.superAdmin) return isSuper;
    if (item.papeis && papel && !item.papeis.includes(papel)) return false;
    return true;
  });
}
