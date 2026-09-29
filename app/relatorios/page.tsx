'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  DollarSign,
  Percent,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Project, TestProduct } from '@/lib/types';
import { PIPELINE_STATUSES } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FinalResultBadge } from '@/components/status-badges';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [testProducts, setTestProducts] = useState<TestProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [projRes, testRes] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('test_products').select('*'),
    ]);
    setProjects(projRes.data || []);
    setTestProducts(testRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-pulse text-muted-foreground">Carregando...</div></div>;
  }

  // ===== Project-level metrics =====
  const totalProjects = projects.length;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const projectsThisMonth = projects.filter((p) => {
    const d = new Date(p.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const closedProjects = projects.filter((p) => p.pipeline_status === 'Venda Fechada');
  const refusedProjects = projects.filter((p) => p.pipeline_status === 'Recusado');
  const inProgressProjects = projects.filter(
    (p) => p.pipeline_status !== 'Venda Fechada' && p.pipeline_status !== 'Recusado'
  );
  const conversionRate = totalProjects > 0
    ? Math.round((closedProjects.length / totalProjects) * 100)
    : 0;

  const totalPotential = projects.reduce((s, p) => s + (p.monthly_potential || 0), 0);
  const totalClosed = projects.reduce((s, p) => s + (p.monthly_volume_closed || 0), 0);

  // ===== Per-item test rates =====
  const totalTests = testProducts.length;
  const testsWithResult = testProducts.filter((t) => t.final_result);
  const approvedTests = testProducts.filter((t) => t.final_result === 'Aprovado');
  const reprovadoTests = testProducts.filter((t) => t.final_result === 'Reprovado');
  const invalidoTests = testProducts.filter((t) => t.final_result === 'Inválido');
  const parcialTests = testProducts.filter((t) => t.final_result === 'Parcial');
  const pendingTests = testProducts.filter((t) => !t.final_result);

  const approvalRate = testsWithResult.length > 0
    ? Math.round((approvedTests.length / testsWithResult.length) * 100)
    : 0;

  // Per-product success rate
  const productStats: Record<string, { total: number; approved: number; reprovado: number }> = {};
  testProducts.forEach((t) => {
    const name = t.product_name || 'Sem nome';
    if (!productStats[name]) productStats[name] = { total: 0, approved: 0, reprovado: 0 };
    productStats[name].total++;
    if (t.final_result === 'Aprovado') productStats[name].approved++;
    if (t.final_result === 'Reprovado') productStats[name].reprovado++;
  });

  // Pipeline distribution
  const pipelineCounts = PIPELINE_STATUSES.map((status) => ({
    status,
    count: projects.filter((p) => p.pipeline_status === status).length,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground text-sm mt-1">Análise consolidada do portfólio de projetos</p>
      </div>

      {/* Project-level metrics */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Métricas de Projetos</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricBox icon={Package} label="Total de Projetos" value={String(totalProjects)} color="text-blue-600 bg-blue-50" />
          <MetricBox icon={Clock} label="Em Andamento" value={String(inProgressProjects.length)} color="text-amber-600 bg-amber-50" />
          <MetricBox icon={CheckCircle2} label="Venda Fechada" value={String(closedProjects.length)} color="text-emerald-600 bg-emerald-50" />
          <MetricBox icon={XCircle} label="Recusados" value={String(refusedProjects.length)} color="text-red-600 bg-red-50" />
          <MetricBox icon={DollarSign} label="Potencial Mensal" value={formatCurrency(totalPotential)} color="text-primary bg-primary/10" />
          <MetricBox icon={Percent} label="Taxa de Conversão" value={`${conversionRate}%`} color="text-emerald-600 bg-emerald-50" />
        </div>
      </div>

      {/* Pipeline distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Distribuição de Projetos no Funil
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalProjects === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum projeto cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {pipelineCounts.map(({ status, count }) => {
                if (count === 0) return null;
                const pct = Math.round((count / totalProjects) * 100);
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className="w-40 shrink-0 text-sm font-medium truncate">{status}</div>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects created this month */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Projetos Criados no Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          {projectsThisMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum projeto criado neste mês.</p>
          ) : (
            <>
              <p className="text-2xl font-bold mb-3">{projectsThisMonth.length} projeto(s)</p>
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                {projectsThisMonth.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projetos/${p.id}`}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:text-primary transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.client_name || 'Cliente não identificado'}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.code || '—'} • {p.pipeline_status || '—'}
                      </p>
                    </div>
                    {p.monthly_potential ? (
                      <span className="text-sm font-medium text-primary">{formatCurrency(p.monthly_potential)}</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Taxas dos Testes — per-item success rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            Taxas dos Testes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall approval rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Taxa de Aprovação Geral (itens testados)</span>
              <span className="text-lg font-bold">{approvalRate}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${approvalRate}%` }} />
            </div>
          </div>

          {/* Result breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <ResultBox label="Total" value={totalTests} color="bg-blue-50 text-blue-700" />
            <ResultBox label="Aprovados" value={approvedTests.length} color="bg-emerald-50 text-emerald-700" />
            <ResultBox label="Reprovados" value={reprovadoTests.length} color="bg-red-50 text-red-700" />
            <ResultBox label="Inválidos" value={invalidoTests.length} color="bg-gray-100 text-gray-700" />
            <ResultBox label="Pendentes" value={pendingTests.length} color="bg-amber-50 text-amber-700" />
          </div>

          {/* Per-product success rate */}
          {Object.keys(productStats).length > 0 && (
            <div className="pt-2 space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">Taxa de Sucesso por Item Testado</p>
              <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
                {Object.entries(productStats).map(([name, stats]) => {
                  const rate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
                  return (
                    <div key={name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{name}</span>
                        <span className="text-muted-foreground shrink-0 ml-2">
                          {stats.approved}/{stats.total} ({rate}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={cn('h-full transition-all', rate >= 70 ? 'bg-emerald-500' : rate >= 40 ? 'bg-amber-500' : 'bg-red-500')}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent test results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultados Recentes de Testes</CardTitle>
        </CardHeader>
        <CardContent>
          {testProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum teste cadastrado.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
              {testProducts
                .filter((t) => t.final_result)
                .slice(-20)
                .reverse()
                .map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{t.product_name || 'Produto'}</p>
                      <p className="text-xs text-muted-foreground">{t.category || '—'} • {t.seal || 'ATC'}</p>
                    </div>
                    <FinalResultBadge value={t.final_result || null} />
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricBox({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
            <p className={cn('text-xl font-bold mt-1', value.length > 12 && 'text-lg')}>{value}</p>
          </div>
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', color)}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={cn('p-3 rounded-lg', color)}>
      <p className="text-xs">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
