import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Papel } from '@crm/shared';
import { api, tokens, type Me, type Membership } from '@/lib/api';
import { useTheme } from './theme';

export type TenantMembership = Membership;

interface SessionState {
  loading: boolean;
  me: Me | null;
  activeTenant: (Membership & { papel: Papel }) | null;
  impersonating: boolean;
  claims: { tenant_id: string | null; papel: Papel | null; is_super_admin: boolean };
  reload: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionState>(null as unknown as SessionState);
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { setBrandColor } = useTheme();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);

  const reload = useCallback(async () => {
    if (!tokens.get()) {
      setMe(null);
      return;
    }
    try {
      setMe(await api.auth.me());
    } catch {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  // reage a login/logout feito em outras partes (evento custom)
  useEffect(() => {
    const handler = () => reload();
    window.addEventListener('crm-auth-changed', handler);
    return () => window.removeEventListener('crm-auth-changed', handler);
  }, [reload]);

  const impersonating = !!me?.impersonating;
  const activeTenant =
    (me?.impersonating as (Membership & { papel: Papel }) | undefined) ??
    (me?.memberships.find((m) => m.tenant_id === me?.claims.tenant_id) as
      | (Membership & { papel: Papel })
      | undefined) ??
    (me?.memberships[0] as (Membership & { papel: Papel }) | undefined) ??
    null;

  useEffect(() => {
    setBrandColor(activeTenant?.cor_primaria ?? null);
  }, [activeTenant, setBrandColor]);

  const switchTenant = useCallback(
    async (tenantId: string) => {
      await api.tenants.switch(tenantId);
      await reload();
    },
    [reload],
  );

  const signOut = useCallback(async () => {
    await api.auth.logout();
    setMe(null);
  }, []);

  const claims = {
    tenant_id: me?.claims.tenant_id ?? null,
    papel: (me?.claims.papel as Papel | null) ?? null,
    is_super_admin: me?.claims.is_super_admin ?? false,
  };

  return (
    <Ctx.Provider
      value={{ loading, me, activeTenant, impersonating, claims, reload, switchTenant, signOut }}
    >
      {children}
    </Ctx.Provider>
  );
}
