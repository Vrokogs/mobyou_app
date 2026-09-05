"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Trophy, Medal, TrendingUp, Store, Bike, Building2, Users, Target,
  ArrowUp, ArrowDown,
} from "lucide-react";
import { BarChart } from "@/components/ui/bar-chart";
import { Podio } from "@/components/ranking/podio";
import { iniciais } from "@/lib/avatar";
import { UNIDADES_VENDA, VENDEDORES_ATACADO } from "@/lib/constants";

interface Venda {
  id: string;
  unidade: string | null;
  modelo: string | null;
  valor_total: number | null;
  vendedor_id: string;
  unidade_negocio: string | null;
  data_venda: string | null;
  created_at: string;
  vendedor: { nome: string } | null;
}

interface Vendedor {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  avatar_url: string | null;
}

const brl = (n: number) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const medalha = ["text-yellow-500", "text-gray-400", "text-amber-700"];

// Usada enquanto a migration 037 não roda. É a regra que já vale hoje.
const META_MOTOS_PADRAO = 13;

interface RankingVendasProps {
  // Faturamento total da empresa: só o gestor vê.
  podeVerFaturamento: boolean;
}

export function RankingVendas({ podeVerFaturamento }: RankingVendasProps) {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [metaLoja, setMetaLoja] = useState(META_MOTOS_PADRAO);
  const [loading, setLoading] = useState(true);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const now = new Date();
  const [periodo, setPeriodo] = useState<string>(`${now.getFullYear()}-${now.getMonth()}`);

  // Competência: a venda pertence ao mês em que aconteceu (data_venda), não ao
  // mês em que foi cadastrada. Nota antiga importada hoje entra no mês certo.
  const competencia = (v: Venda) => (v.data_venda ?? v.created_at).slice(0, 10);

  const carregar = useCallback(async () => {
    const supabase = createClient();
    const [vRes, pRes, cRes] = await Promise.all([
      supabase.from("vendas").select("*, vendedor:profiles!vendedor_id(nome)").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, nome, email, ativo, avatar_url").eq("role", "vendedor").order("nome"),
      supabase.from("empresa_config").select("meta_motos_loja").limit(1).maybeSingle(),
    ]);
    setVendas((vRes.data ?? []) as unknown as Venda[]);
    setVendedores((pRes.data ?? []) as unknown as Vendedor[]);
    // A coluna só existe depois da migration 037; até lá vale o padrão.
    const cfg = cRes.data as { meta_motos_loja?: number | null } | null;
    setMetaLoja(cfg?.meta_motos_loja ?? META_MOTOS_PADRAO);
    setAtualizadoEm(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // O ranking acompanha os lançamentos: qualquer venda inserida, editada ou
  // apagada — por qualquer pessoa, em qualquer tela — recarrega os números aqui
  // sem precisar atualizar a página.
  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel("ranking-vendas")
      .on("postgres_changes", { event: "*", schema: "public", table: "vendas" }, () => {
        carregar();
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [carregar]);

  // Rede de segurança: se o Realtime não estiver ligado para "vendas" (a
  // migration 037 cuida disso), o ranking ainda se atualiza quando a pessoa
  // volta para esta aba — o caso comum é lançar a venda noutra aba e voltar.
  useEffect(() => {
    const aoVoltar = () => { if (!document.hidden) carregar(); };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => document.removeEventListener("visibilitychange", aoVoltar);
  }, [carregar]);

  const [ano, mes] = periodo.split("-").map(Number);
  const noPeriodo = (v: Venda, a: number, m: number) => {
    const iso = competencia(v);
    return Number(iso.slice(0, 4)) === a && (m === -1 || Number(iso.slice(5, 7)) - 1 === m);
  };

  const doPeriodo = vendas.filter((v) => noPeriodo(v, ano, mes));

  // Período anterior, base da coluna de evolução: num mês fechado é o mês antes
  // dele; no ano inteiro, o ano anterior.
  const ant = mes === -1
    ? { ano: ano - 1, mes: -1 }
    : { ano: mes === 0 ? ano - 1 : ano, mes: mes === 0 ? 11 : mes - 1 };
  const doAnterior = vendas.filter((v) => noPeriodo(v, ant.ano, ant.mes));

  const vendasVarejo = doPeriodo.filter((v) => (v.unidade_negocio ?? "varejo") !== "atacado");
  const varejoAnterior = doAnterior.filter((v) => (v.unidade_negocio ?? "varejo") !== "atacado");
  const vendasAtacado = doPeriodo.filter((v) => v.unidade_negocio === "atacado");

  const ativos = vendedores.filter((v) => v.ativo);

  // Ranking do VAREJO: só vendedores ativos, individualmente. Vendas de quem
  // saiu da equipe não entram no ranking (mas seguem no faturamento).
  const porVendedor = ativos.map((vd) => {
    const suas = vendasVarejo.filter((v) => v.vendedor_id === vd.id);
    const total = suas.reduce((s, v) => s + (v.valor_total ?? 0), 0);
    const antes = varejoAnterior
      .filter((v) => v.vendedor_id === vd.id)
      .reduce((s, v) => s + (v.valor_total ?? 0), 0);
    return {
      id: vd.id,
      nome: vd.nome,
      avatarUrl: vd.avatar_url,
      qtd: suas.length,
      total,
      // Quanto vale, em média, cada moto que ele vendeu.
      ticket: suas.length > 0 ? total / suas.length : 0,
      // Sem venda no período anterior não há base de comparação — fica nulo,
      // em vez de virar um "+100%" que não quer dizer nada.
      evolucao: antes > 0 ? ((total - antes) / antes) * 100 : null,
    };
  });
  porVendedor.sort((a, b) => b.total - a.total || b.qtd - a.qtd);

  const totalAtacado = vendasAtacado.reduce((s, v) => s + (v.valor_total ?? 0), 0);
  const qtdAtacado = vendasAtacado.length;
  const duplaAtacado = vendedores.filter((v) => VENDEDORES_ATACADO.includes((v.email || "").toLowerCase()));

  const totalGeral = doPeriodo.reduce((s, v) => s + (v.valor_total ?? 0), 0);
  const qtdGeral = doPeriodo.length;
  const venderam = porVendedor.filter((v) => v.qtd > 0).length;

  // Média entre quem de fato vendeu — dividir por toda a equipe afundaria o
  // número sempre que alguém entrasse no time sem ter vendido ainda.
  const mediaPorVendedor = venderam > 0
    ? porVendedor.reduce((s, v) => s + v.total, 0) / venderam
    : 0;
  const totalAnterior = doAnterior.reduce((s, v) => s + (v.valor_total ?? 0), 0);
  const evolucaoGeral = totalAnterior > 0
    ? ((totalGeral - totalAnterior) / totalAnterior) * 100
    : null;

  // Meta: motos vendidas por loja no mês. A da empresa é a soma das lojas.
  const porUnidade = UNIDADES_VENDA.map((u) => {
    const vu = doPeriodo.filter((v) => v.unidade === u);
    return {
      unidade: u,
      qtd: vu.length,
      total: vu.reduce((s, v) => s + (v.valor_total ?? 0), 0),
      progresso: Math.min(100, (vu.length / metaLoja) * 100),
    };
  });
  const metaEmpresa = metaLoja * UNIDADES_VENDA.length;
  const progressoEmpresa = Math.min(100, (qtdGeral / metaEmpresa) * 100);

  // Opções: os últimos 12 meses e o fechamento de cada ano com venda.
  const opcoes: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opcoes.push({
      value: `${d.getFullYear()}-${d.getMonth()}`,
      label: `${MESES[d.getMonth()]}/${d.getFullYear()}${i === 0 ? " (atual)" : ""}`,
    });
  }
  const anosComVenda = Array.from(new Set(vendas.map((v) => Number(competencia(v).slice(0, 4)))))
    .filter((a) => !Number.isNaN(a))
    .sort((a, b) => b - a);
  for (const a of anosComVenda) opcoes.push({ value: `${a}--1`, label: `Ano ${a} (fechamento)` });

  const periodoLabel = opcoes.find((op) => op.value === periodo)?.label ?? "";

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const noPodio = porVendedor.filter((v) => v.qtd > 0).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Vitrine do ranking. Fundo escuro para as fotos e o pódio ganharem
          destaque — é a tela que a equipe abre para se comparar. */}
      <div className="rank-hero overflow-hidden rounded-2xl p-5 text-white sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <Trophy className="h-7 w-7 text-amber-400" /> Ranking de Vendas
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Acompanhe quem está acelerando mais resultados.
            </p>
            {atualizadoEm && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-white/40">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Atualiza sozinho a cada venda lançada · {atualizadoEm.toLocaleTimeString("pt-BR")}
              </p>
            )}
          </div>
          <Select
            items={Object.fromEntries(opcoes.map((o) => [o.value, o.label]))}
            value={periodo}
            onValueChange={(v) => v && setPeriodo(v)}
          >
            <SelectTrigger className="w-52 border-white/15 bg-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {opcoes.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {podeVerFaturamento && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p className="flex items-center gap-1.5 text-xs text-white/60">
                <TrendingUp className="h-3.5 w-3.5 text-amber-400" /> Total vendido no período
              </p>
              <p className="mt-1 text-2xl font-bold text-primary">{brl(totalGeral)}</p>
              <p className="mt-0.5 text-xs text-white/50">
                {qtdGeral} moto{qtdGeral === 1 ? "" : "s"} vendida{qtdGeral === 1 ? "" : "s"}
              </p>
            </div>
          )}

          {podeVerFaturamento && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p className="flex items-center gap-1.5 text-xs text-white/60">
                <Users className="h-3.5 w-3.5 text-emerald-400" /> Média por vendedor
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">{brl(mediaPorVendedor)}</p>
              <p className="mt-0.5 text-xs text-white/50">
                {evolucaoGeral === null
                  ? `entre os ${venderam} que venderam`
                  : `${evolucaoGeral >= 0 ? "+" : ""}${evolucaoGeral.toFixed(0)}% no total vs. período anterior`}
              </p>
            </div>
          )}

          {/* Meta em MOTOS, não em reais: são 13 por loja no mês. */}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <p className="flex items-center gap-1.5 text-xs text-white/60">
              <Target className="h-3.5 w-3.5 text-violet-400" /> Meta do mês
            </p>
            <p className="mt-1 text-2xl font-bold text-violet-300">
              {qtdGeral}<span className="text-base font-normal text-white/50"> / {metaEmpresa} motos</span>
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-r bg-violet-400 transition-[width] duration-500" style={{ width: `${progressoEmpresa}%` }} />
            </div>
            <p className="mt-1 text-xs text-white/50">
              {progressoEmpresa.toFixed(0)}% concluída · {metaLoja} por loja
            </p>
          </div>

          {!podeVerFaturamento && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p className="flex items-center gap-1.5 text-xs text-white/60">
                <Bike className="h-3.5 w-3.5 text-amber-400" /> Vendedores que venderam
              </p>
              <p className="mt-1 text-2xl font-bold">
                {venderam}<span className="text-base font-normal text-white/50"> / {ativos.length}</span>
              </p>
            </div>
          )}
        </div>

        {noPodio.length > 0 ? (
          <div className="mt-8">
            <Podio colocados={noPodio} formatar={brl} mostrarValor={podeVerFaturamento} />
          </div>
        ) : (
          <p className="mt-7 rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center text-sm text-white/50">
            Nenhuma venda registrada em {periodoLabel}.
          </p>
        )}
      </div>

      {/* Ranking completo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Medal className="h-4 w-4 text-muted-foreground" /> Ranking completo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {porVendedor.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum vendedor cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Pos.</TableHead>
                  <TableHead>Vendedor</TableHead>
                  {podeVerFaturamento && <TableHead>Vendas</TableHead>}
                  <TableHead>Motos</TableHead>
                  {podeVerFaturamento && <TableHead>Ticket médio</TableHead>}
                  <TableHead>Evolução</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porVendedor.map((v, i) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {i < 3 ? <Trophy className={`h-4 w-4 ${medalha[i]}`} /> : i + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          {v.avatarUrl && <AvatarImage src={v.avatarUrl} alt={v.nome} />}
                          <AvatarFallback className="bg-muted text-[10px] font-semibold">
                            {iniciais(v.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{v.nome}</span>
                        {v.qtd === 0 && (
                          <Badge variant="secondary" className="bg-gray-100 text-[10px] text-gray-600">
                            sem vendas
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {podeVerFaturamento && (
                      <TableCell className="font-semibold tabular-nums">{brl(v.total)}</TableCell>
                    )}
                    <TableCell className="tabular-nums">{v.qtd}</TableCell>
                    {podeVerFaturamento && (
                      <TableCell className="tabular-nums text-muted-foreground">
                        {v.qtd > 0 ? brl(v.ticket) : "---"}
                      </TableCell>
                    )}
                    <TableCell>
                      {v.evolucao === null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <span className={`flex items-center gap-1 text-xs font-medium ${v.evolucao >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {v.evolucao >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {v.evolucao >= 0 ? "+" : ""}{v.evolucao.toFixed(0)}%
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            A evolução compara com o período anterior. Quem não vendeu antes fica com
            &quot;—&quot;: sem base, não há percentual possível.
          </p>
        </CardContent>
      </Card>

      {/* Meta por loja */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-muted-foreground" /> Meta por loja — {metaLoja} motos no mês
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {porUnidade.map((u) => (
            <div key={u.unidade} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{u.unidade}</span>
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground tabular-nums">{u.qtd}</span> / {metaLoja} motos
                  {u.qtd >= metaLoja && (
                    <Badge variant="secondary" className="ml-2 bg-emerald-100 text-[10px] text-emerald-700">
                      meta batida
                    </Badge>
                  )}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-sm bg-muted">
                <div
                  className={`h-full rounded-r transition-[width] duration-500 ${u.qtd >= metaLoja ? "bg-emerald-500" : "bg-primary"}`}
                  style={{ width: `${u.progresso}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Atacado — dividido 50/50 */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-purple-600" /> Atacado — Julia &amp; Robert (50/50)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Total do atacado no período</p>
              {podeVerFaturamento && <p className="text-2xl font-bold text-purple-700">{brl(totalAtacado)}</p>}
              <p className="text-xs text-muted-foreground">{qtdAtacado} venda(s) de atacado</p>
            </div>
            <p className="max-w-xs text-xs text-muted-foreground">
              As vendas de atacado são somadas e divididas igualmente entre Julia e
              Robert, independentemente de quem lançou cada uma.
            </p>
          </div>
          {podeVerFaturamento && (
            <div className="grid grid-cols-2 gap-3">
              {(duplaAtacado.length ? duplaAtacado : [{ id: "j", nome: "Julia" }, { id: "r", nome: "Robert" }]).map((v) => (
                <div key={v.id} className="rounded-lg border bg-white p-3 text-center">
                  <p className="text-sm font-medium">{v.nome}</p>
                  <p className="mt-1 text-xl font-bold text-purple-700">{brl(totalAtacado / 2)}</p>
                  <p className="text-[11px] text-muted-foreground">50% do atacado</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Faturamento por loja */}
      {podeVerFaturamento && (
        <BarChart
          titulo="Faturamento das unidades"
          icon={Store}
          descricao={`Quanto cada loja vendeu em ${periodoLabel}.`}
          cor="#0E9F6E"
          formatar={brl}
          itens={porUnidade.map((u) => ({
            id: u.unidade,
            rotulo: u.unidade,
            valor: u.total,
            detalhe: `${u.qtd} moto${u.qtd === 1 ? "" : "s"}`,
          }))}
        />
      )}
    </div>
  );
}
