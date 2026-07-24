import { useState, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Receipt,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/providers/session';
import { brl, dataBR, cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { StatCard, PageLoader, Skeleton } from '@/components/ui/feedback';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/badge';

interface DreLinha {
  competencia: string;
  receita_bruta: number;
  custos_pagos_cliente: number;
  custos_operacionais: number;
  comissao_terceiros: number;
  marketing: number;
  folha: number;
  nao_operacional: number;
  acordos_recebidos: number;
  acordos_pagos: number;
  lucro_liquido: number;
  num_vendas: number;
  ticket_medio: number;
  crescimento_pct: number | null;
}

interface NegocioDetalhe {
  id: string;
  carro: string | null;
  placa: string | null;
  status: string;
  data_negocio: string;
  valor_venda: number;
  valor_compra: number;
  custos_pagos_cliente: number;
  custos_operacionais: number;
  comissao_terceiros: number;
  lucro: number;
}

interface CustoDetalhe {
  id: string;
  descricao: string | null;
  valor: number;
  data_pagamento: string;
  negocio_id: string | null;
  centros_custo: { nome: string; tipo: string } | null;
}

interface AcordoPagDetalhe {
  id: string;
  data: string | null;
  valor: number;
  beneficiario: string | null;
  observacoes: string | null;
  acordos: { codigo_caso: string | null; caso: string; tipo: 'pagamento' | 'recebimento' | null } | null;
}

interface DreDetalhe {
  negocios: NegocioDetalhe[];
  custos: CustoDetalhe[];
  acordos: AcordoPagDetalhe[];
}

const ANO_ATUAL = new Date().getFullYear();

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function DashboardPage() {
  const { activeTenant } = useSession();
  const tenantId = activeTenant!.tenant_id;
  const [ano, setAno] = useState(ANO_ATUAL);
  const [mes, setMes] = useState(''); // '' = ano todo; senão 'MM'
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  const toggle = (competencia: string) =>
    setAbertos((prev) => {
      const next = new Set(prev);
      next.has(competencia) ? next.delete(competencia) : next.add(competencia);
      return next;
    });

  const { data, isLoading } = useQuery({
    queryKey: ['dre', tenantId, ano],
    queryFn: () => api.financeiro.dre<DreLinha[]>(ano),
  });

  if (isLoading) return <PageLoader />;

  const linhas = data ?? [];
  // Filtro por mês: '' = ano todo; senão só a competência YYYY-MM correspondente.
  const linhasFiltradas = mes ? linhas.filter((l) => l.competencia.slice(5) === mes) : linhas;
  const totalReceita = linhasFiltradas.reduce((s, l) => s + Number(l.receita_bruta), 0);
  const totalLucro = linhasFiltradas.reduce((s, l) => s + Number(l.lucro_liquido), 0);
  const totalVendas = linhasFiltradas.reduce((s, l) => s + Number(l.num_vendas), 0);
  // Ticket médio = lucro líquido ÷ nº de vendas.
  const ticketMedio = totalVendas > 0 ? totalLucro / totalVendas : 0;

  const chartData = linhasFiltradas.map((l) => ({
    mes: l.competencia.slice(5),
    lucro: Number(l.lucro_liquido),
  }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="DRE anual e indicadores do negócio"
        action={
          <div className="flex gap-2">
            <Select value={mes} onChange={(e) => setMes(e.target.value)} className="w-36">
              <option value="">Ano todo</option>
              {MESES.map((nome, i) => (
                <option key={nome} value={String(i + 1).padStart(2, '0')}>
                  {nome}
                </option>
              ))}
            </Select>
            <Select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="w-28">
              {[ANO_ATUAL, ANO_ATUAL - 1, ANO_ATUAL - 2].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Receita bruta" value={brl(totalReceita)} icon={DollarSign} />
        <StatCard
          label="Lucro líquido"
          value={brl(totalLucro)}
          icon={TrendingUp}
          tone={totalLucro >= 0 ? 'success' : 'destructive'}
        />
        <StatCard label="Vendas" value={String(totalVendas)} icon={ShoppingCart} />
        <StatCard label="Ticket médio" value={brl(ticketMedio)} icon={Receipt} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {mes
              ? `Lucro líquido — ${MESES[Number(mes) - 1]}/${ano}`
              : `Lucro líquido por mês — ${ano}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  width={40}
                />
                <Tooltip
                  formatter={(v: number) => [brl(v), 'Lucro']}
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  cursor={{ fill: 'hsl(var(--accent))' }}
                />
                <Bar dataKey="lucro" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.lucro >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>DRE mensal</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="p-3">Mês</th>
                <th className="p-3 text-right">Receita bruta</th>
                <th className="p-3 text-right">Lucro líquido</th>
                <th className="p-3 text-right">Vendas</th>
                <th className="p-3 text-right">Cresc.</th>
                <th className="p-3 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {linhasFiltradas.map((l) => {
                const aberto = abertos.has(l.competencia);
                return (
                  <Fragment key={l.competencia}>
                    <tr
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/40"
                      onClick={() => toggle(l.competencia)}
                    >
                      <td className="p-3 font-medium">{l.competencia}</td>
                      <td className="p-3 text-right">{brl(Number(l.receita_bruta))}</td>
                      <td className="p-3 text-right font-medium">{brl(Number(l.lucro_liquido))}</td>
                      <td className="p-3 text-right text-muted-foreground">{l.num_vendas}</td>
                      <td className="p-3 text-right">
                        {l.crescimento_pct == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={Number(l.crescimento_pct) >= 0 ? 'text-success' : 'text-destructive'}>
                            {Number(l.crescimento_pct) >= 0 ? '+' : ''}
                            {Number(l.crescimento_pct).toFixed(0)}%
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          {aberto ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          {aberto ? 'Ocultar' : 'Ver'}
                        </span>
                      </td>
                    </tr>
                    {aberto && (
                      <tr className="border-b border-border last:border-0">
                        <td colSpan={6} className="bg-muted/30 p-0">
                          <DreLinhaDetalhe linha={l} tenantId={tenantId} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

const STATUS_META: Record<
  string,
  { label: string; variant: 'success' | 'destructive' | 'secondary' }
> = {
  vendido: { label: 'Vendido', variant: 'success' },
  entregue: { label: 'Entregue', variant: 'success' },
  em_negociacao: { label: 'Em negociação', variant: 'secondary' },
  problema: { label: 'Problema', variant: 'destructive' },
};

type Bucket = 'marketing' | 'folha' | 'nao_operacional' | 'outros';

const BUCKET_META: { key: Bucket; label: string; deduzido: boolean }[] = [
  { key: 'marketing', label: 'Marketing', deduzido: true },
  { key: 'folha', label: 'Folha', deduzido: true },
  { key: 'nao_operacional', label: 'Não operacional', deduzido: true },
  { key: 'outros', label: 'Outros', deduzido: false },
];

// Espelha o bucketing do RPC dre_anual: marketing/ads e folha por nome do centro,
// não-operacional por tipo. O que sobra é operacional não deduzido no lucro líquido.
function bucketDe(c: CustoDetalhe): Bucket {
  const nome = c.centros_custo?.nome ?? '';
  const tipo = c.centros_custo?.tipo;
  if (/marketing|ads/i.test(nome)) return 'marketing';
  if (/folha/i.test(nome)) return 'folha';
  if (tipo === 'nao_operacional') return 'nao_operacional';
  return 'outros';
}

function DreLinhaDetalhe({ linha, tenantId }: { linha: DreLinha; tenantId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dre-detalhe', tenantId, linha.competencia],
    queryFn: () => api.financeiro.dreDetalhe<DreDetalhe>(linha.competencia),
  });

  const deducoes = [
    { label: 'Custos pagos ao cliente', valor: Number(linha.custos_pagos_cliente) },
    { label: 'Custos operacionais', valor: Number(linha.custos_operacionais) },
    { label: 'Comissão de terceiros', valor: Number(linha.comissao_terceiros) },
    { label: 'Marketing', valor: Number(linha.marketing) },
    { label: 'Folha', valor: Number(linha.folha) },
    { label: 'Não operacional', valor: Number(linha.nao_operacional) },
  ];

  const negocios = data?.negocios ?? [];
  const custos = data?.custos ?? [];
  const acordos = data?.acordos ?? [];
  const totalAcordosReceb = acordos
    .filter((a) => a.acordos?.tipo === 'recebimento')
    .reduce((s, a) => s + Number(a.valor), 0);
  const totalAcordosPagos = acordos
    .filter((a) => a.acordos?.tipo === 'pagamento')
    .reduce((s, a) => s + Number(a.valor), 0);
  const totalVenda = negocios.reduce((s, n) => s + Number(n.valor_venda), 0);
  const totalCompra = negocios.reduce((s, n) => s + Number(n.valor_compra), 0);
  const totalLucroNeg = negocios.reduce((s, n) => s + Number(n.lucro), 0);

  const grupos = BUCKET_META.map((b) => {
    const itens = custos.filter((c) => bucketDe(c) === b.key);
    return { ...b, itens, subtotal: itens.reduce((s, c) => s + Number(c.valor), 0) };
  }).filter((g) => g.itens.length > 0);

  return (
    <div className="space-y-6 p-4">
      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Composição do lucro líquido
        </h4>
        <table className="w-full max-w-md text-sm">
          <tbody>
            <tr className="border-b border-border">
              <td className="py-1.5">Receita bruta</td>
              <td className="py-1.5 text-right font-medium">{brl(Number(linha.receita_bruta))}</td>
            </tr>
            {deducoes.map((d) => (
              <tr key={d.label} className="border-b border-border">
                <td className="py-1.5 text-muted-foreground">(−) {d.label}</td>
                <td className="py-1.5 text-right text-muted-foreground">{brl(d.valor)}</td>
              </tr>
            ))}
            <tr className="border-b border-border">
              <td className="py-1.5 text-muted-foreground">(+) Recebimentos de acordos</td>
              <td className="py-1.5 text-right text-success">{brl(Number(linha.acordos_recebidos))}</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-1.5 text-muted-foreground">(−) Pagamentos de acordos</td>
              <td className="py-1.5 text-right text-muted-foreground">{brl(Number(linha.acordos_pagos))}</td>
            </tr>
            <tr>
              <td className="py-1.5 font-semibold">(=) Lucro líquido</td>
              <td
                className={cn(
                  'py-1.5 text-right font-semibold',
                  Number(linha.lucro_liquido) >= 0 ? 'text-success' : 'text-destructive',
                )}
              >
                {brl(Number(linha.lucro_liquido))}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">
          Não foi possível carregar os lançamentos do mês.
        </p>
      ) : (
        <>
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Vendas do mês ({negocios.length})
            </h4>
            {negocios.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum negócio com data neste mês.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3">Carro</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3 text-right">Venda</th>
                      <th className="py-2 pr-3 text-right">Compra</th>
                      <th className="py-2 pr-3 text-right">Receita</th>
                      <th className="py-2 text-right">Lucro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {negocios.map((n) => {
                      const meta =
                        STATUS_META[n.status] ?? { label: n.status, variant: 'secondary' as const };
                      return (
                        <tr key={n.id} className="border-b border-border last:border-0">
                          <td className="py-2 pr-3">
                            <div className="font-medium">{n.carro ?? '—'}</div>
                            {n.placa && (
                              <div className="text-xs text-muted-foreground">{n.placa}</div>
                            )}
                          </td>
                          <td className="py-2 pr-3">
                            <Badge variant={meta.variant}>{meta.label}</Badge>
                          </td>
                          <td className="py-2 pr-3 text-right">{brl(Number(n.valor_venda))}</td>
                          <td className="py-2 pr-3 text-right">{brl(Number(n.valor_compra))}</td>
                          <td className="py-2 pr-3 text-right">
                            {brl(Number(n.valor_venda) - Number(n.valor_compra))}
                          </td>
                          <td
                            className={cn(
                              'py-2 text-right font-medium',
                              Number(n.lucro) >= 0 ? 'text-success' : 'text-destructive',
                            )}
                          >
                            {brl(Number(n.lucro))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border text-xs font-medium">
                      <td className="py-2 pr-3" colSpan={2}>
                        Total
                      </td>
                      <td className="py-2 pr-3 text-right">{brl(totalVenda)}</td>
                      <td className="py-2 pr-3 text-right">{brl(totalCompra)}</td>
                      <td className="py-2 pr-3 text-right">{brl(totalVenda - totalCompra)}</td>
                      <td className="py-2 text-right">{brl(totalLucroNeg)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Lançamentos de custo ({custos.length})
            </h4>
            {custos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum lançamento de custo pago neste mês.
              </p>
            ) : (
              <div className="space-y-4">
                {grupos.map((g) => (
                  <div key={g.key}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {g.label}
                        {!g.deduzido && (
                          <span className="ml-2 text-xs font-normal text-warning">
                            não entra no lucro líquido
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-medium">{brl(g.subtotal)}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <tbody>
                          {g.itens.map((c) => (
                            <tr key={c.id} className="border-b border-border last:border-0">
                              <td className="whitespace-nowrap py-1.5 pr-3 text-muted-foreground">
                                {dataBR(c.data_pagamento)}
                              </td>
                              <td className="py-1.5 pr-3">{c.descricao ?? '—'}</td>
                              <td className="py-1.5 pr-3 text-xs text-muted-foreground">
                                {c.centros_custo?.nome ?? '—'}
                              </td>
                              <td className="py-1.5 text-right">{brl(Number(c.valor))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pagamentos de acordos ({acordos.length})
            </h4>
            {acordos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum pagamento de acordo com data neste mês.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {acordos.map((a) => {
                      const receb = a.acordos?.tipo === 'recebimento';
                      return (
                        <tr key={a.id} className="border-b border-border last:border-0">
                          <td className="whitespace-nowrap py-1.5 pr-3 text-muted-foreground">
                            {a.data ? dataBR(a.data) : '—'}
                          </td>
                          <td className="py-1.5 pr-3">
                            <span className="font-medium">{a.acordos?.caso ?? '—'}</span>
                            {a.acordos?.codigo_caso && (
                              <span className="ml-2 font-mono text-xs text-muted-foreground">
                                {a.acordos.codigo_caso}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 pr-3">
                            <Badge variant={receb ? 'success' : 'secondary'}>
                              {receb ? 'Recebimento' : 'Pagamento'}
                            </Badge>
                          </td>
                          <td
                            className={cn(
                              'py-1.5 text-right font-medium',
                              receb ? 'text-success' : 'text-destructive',
                            )}
                          >
                            {receb ? '+' : '−'}
                            {brl(Number(a.valor))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border text-xs font-medium">
                      <td className="py-2 pr-3" colSpan={3}>
                        Líquido (recebidos − pagos)
                      </td>
                      <td
                        className={cn(
                          'py-2 text-right',
                          totalAcordosReceb - totalAcordosPagos >= 0 ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {brl(totalAcordosReceb - totalAcordosPagos)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
