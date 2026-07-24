import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Car, Gauge, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { brl, hexToHslString } from '@/lib/utils';
import { PageLoader } from '@/components/ui/feedback';

interface CarroPublico {
  carro: string;
  ano: number | null;
  km: number | null;
  preco_pedido: number | null;
  fipe: number | null;
  ipva_status: string | null;
  pneus: string | null;
  fotos: { url: string; is_capa: boolean }[];
  tenant: { nome: string; logo_url: string | null; cor_primaria: string | null };
}

export function CarroPublicoPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CarroPublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [foto, setFoto] = useState(0);

  useEffect(() => {
    setFoto(0); // evita índice de foto "preso" ao trocar de carro na mesma rota
    setLoading(true);
    api.publico
      .carro<CarroPublico>(id!)
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    // branding do tenant na página pública (RF12.3)
    const cor = data?.tenant?.cor_primaria;
    if (cor) {
      const hsl = hexToHslString(cor);
      if (hsl) document.documentElement.style.setProperty('--primary', hsl);
    }
    // limpa ao desmontar/trocar p/ não vazar a cor do último tenant visitado
    return () => {
      document.documentElement.style.removeProperty('--primary');
    };
  }, [data]);

  if (loading) return <PageLoader />;
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Anúncio não encontrado ou removido.
      </div>
    );
  }

  const fotos = data.fotos?.length ? data.fotos : [];
  const temSpecs = data.ano != null || data.km != null || data.fipe != null;
  const temLinhas = !!data.ipva_status || !!data.pneus;
  const temDetalhes = fotos.length > 0 || data.preco_pedido != null || temSpecs || temLinhas;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          {data.tenant.logo_url ? (
            <img src={data.tenant.logo_url} alt="" className="h-8 w-8 rounded" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Car className="h-5 w-5" />
            </div>
          )}
          <span className="font-semibold">{data.tenant.nome}</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="space-y-2">
          <div className="aspect-video overflow-hidden rounded-xl bg-muted">
            {fotos.length > 0 ? (
              <img src={fotos[foto].url} alt={data.carro} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <Car className="h-12 w-12 opacity-40" />
                <span className="text-sm">Fotos em breve</span>
              </div>
            )}
          </div>
          {fotos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {fotos.map((f, i) => (
                <button
                  key={i}
                  onClick={() => setFoto(i)}
                  className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${
                    i === foto ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <img src={f.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{data.carro}</h1>
            {data.preco_pedido != null ? (
              <p className="mt-1 text-3xl font-bold text-primary">{brl(data.preco_pedido)}</p>
            ) : (
              <p className="mt-1 text-lg font-medium text-muted-foreground">Valor sob consulta</p>
            )}
          </div>

          {temSpecs && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.ano != null && <Info icon={Calendar} label="Ano" value={String(data.ano)} />}
              {data.km != null && (
                <Info icon={Gauge} label="KM" value={`${data.km.toLocaleString('pt-BR')} km`} />
              )}
              {data.fipe != null && <Info icon={Car} label="FIPE" value={brl(data.fipe)} />}
            </div>
          )}

          {temLinhas && (
            <dl className="divide-y divide-border rounded-xl border border-border">
              {data.ipva_status && (
                <Row label="IPVA" value={data.ipva_status === 'pago' ? 'Pago' : 'Em aberto'} />
              )}
              {data.pneus && <Row label="Pneus" value={data.pneus} />}
            </dl>
          )}

          {!temDetalhes && (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Mais informações e fotos deste veículo em breve.
              <br />
              Fale com <span className="font-medium text-foreground">{data.tenant.nome}</span> para
              saber todos os detalhes.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
