'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  Flame,
  CheckCircle2,
  Percent,
  Plus,
  Search,
  Package,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Project, TestProduct, PipelineStatus } from '@/lib/types';
import { PIPELINE_STATUSES } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const PIPELINE_COLORS: Record<string, string> = {
  'Solicitação Recebida': 'border-slate-300 bg-slate-50',
  'Em Análise': 'border-indigo-300 bg-indigo-50',
  'Em Preparação': 'border-amber-300 bg-amber-50',
  'Agendado': 'border-blue-300 bg-blue-50',
  'Teste em Andamento': 'border-orange-300 bg-orange-50',
  'Em Negociação Comercial': 'border-emerald-300 bg-emerald-50',
  'Venda Fechada': 'border-green-400 bg-green-50',
  'Sem Retorno': 'border-red-400 bg-red-50',
};

const PIPELINE_DOT: Record<string, string> = {
  'Solicitação Recebida': 'bg-slate-400',
  'Em Análise': 'bg-indigo-500',
  'Em Preparação': 'bg-amber-500',
  'Agendado': 'bg-blue-500',
  'Teste em Andamento': 'bg-orange-500',
  'Em Negociação Comercial': 'bg-emerald-500',
  'Venda Fechada': 'bg-green-600',
  'Sem Retorno': 'bg-red-500',
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [testProducts, setTestProducts] = useState<TestProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);

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

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const inPreparation = projects.filter(
    (p) =>
      p.pipeline_status === 'Solicitação Recebida' ||
      p.pipeline_status === 'Em Análise' ||
      p.pipeline_status === 'Em Preparação' ||
      p.pipeline_status === 'Agendado'
  );

  const inField = projects.filter(
    (p) => p.pipeline_status === 'Teste em Andamento'
  );

  const closedThisMonth = projects.filter((p) => {
    if (p.pipeline_status !== 'Venda Fechada') return false;
    const d = new Date(p.updated_at || '');
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const createdThisMonth = projects.filter((p) => {
    const d = new Date(p.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const conversionRate = createdThisMonth.length > 0
    ? Math.round((closedThisMonth.length / createdThisMonth.length) * 100)
    : 0;

  const filteredProjects = projects.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.client_name?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.cnpj?.includes(search)
    );
  });

  const handleDragStart = (id: string) => setDraggedId(id);

  const handleDrop = async (status: PipelineStatus) => {
    if (!draggedId) return;
    const project = projects.find((p) => p.id === draggedId);
    if (project?.pipeline_status === status) {
      setDraggedId(null);
      return;
    }
    const { error } = await supabase
      .from('projects')
      .update({ pipeline_status: status, updated_at: new Date().toISOString() })
      .eq('id', draggedId);
    if (error) {
      toast({ title: 'Erro ao mover projeto', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Projeto movido', description: `${project?.client_name || 'Projeto'} → ${status}` });
      loadData();
    }
    setDraggedId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Ciclo de projetos de validação — {profile?.role === 'Dono' ? 'visão geral (Dono)' : profile?.role === 'Admin' ? 'visão geral (Admin)' : 'seus projetos'}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/projetos/novo">
            <Plus className="h-4 w-4 mr-1" />
            Novo Projeto
          </Link>
        </Button>
      </div>

      {/* 4 Lifecycle Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        <LifecycleCard
          icon={ClipboardCheck}
          label="Em Preparação"
          value={String(inPreparation.length)}
          color="text-blue-600 bg-blue-50"
        />
        <LifecycleCard
          icon={Flame}
          label="Testes em Andamento"
          value={String(inField.length)}
          color="text-orange-600 bg-orange-50"
        />
        <LifecycleCard
          icon={CheckCircle2}
          label="Vendas no Mês"
          value={String(closedThisMonth.length)}
          color="text-emerald-600 bg-emerald-50"
        />
        <LifecycleCard
          icon={Percent}
          label="Conversão"
          value={`${conversionRate}%`}
          color="text-primary bg-primary/10"
        />
      </div>

      {/* Search */}
      <div className="relative max-w-md shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, código, CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Kanban Board — grid layout, no horizontal scroll */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 flex-1 min-h-0">
        {PIPELINE_STATUSES.map((status) => {
          const columnProjects = filteredProjects.filter((p) => p.pipeline_status === status);
          return (
            <div
              key={status}
              className="flex flex-col min-h-0 rounded-lg border border-border bg-card/50 overflow-hidden"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(status)}
            >
              {/* Column header */}
              <div className={cn('border-b-2 px-2.5 py-1.5 shrink-0', PIPELINE_COLORS[status] || 'border-border bg-secondary/50')}>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', PIPELINE_DOT[status] || 'bg-muted-foreground')} />
                    <span className="text-xs font-semibold truncate">{status}</span>
                  </div>
                  <span className="text-[10px] font-bold bg-white/70 rounded-full px-1.5 py-0.5 shrink-0">
                    {columnProjects.length}
                  </span>
                </div>
              </div>
              {/* Cards */}
              <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1.5 p-1.5 min-h-0">
                {columnProjects.length === 0 ? (
                  <div className="text-center py-6 text-[10px] text-muted-foreground/50">
                    Vazio
                  </div>
                ) : (
                  columnProjects.map((project) => {
                    const projTests = testProducts.filter((t) => t.project_id === project.id);
                    const approved = projTests.filter((t) => t.final_result === 'Aprovado').length;
                    return (
                      <Link
                        key={project.id}
                        href={`/projetos/${project.id}`}
                        draggable
                        onDragStart={() => handleDragStart(project.id)}
                        className={cn(
                          'block p-2 rounded-md border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing',
                          draggedId === project.id && 'opacity-50'
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-medium truncate flex-1">
                            {project.client_name || 'Cliente não identificado'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {project.code && (
                            <span className="text-[10px] text-muted-foreground font-mono">{project.code}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground truncate">
                            {project.city || '—'}/{project.state || '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-muted-foreground">
                            {projTests.length} testes
                          </span>
                          {projTests.length > 0 && (
                            <span className="text-[10px] font-medium text-emerald-600">
                              {approved} aprov.
                            </span>
                          )}
                          {project.monthly_potential ? (
                            <span className="text-[10px] font-medium text-primary">
                              {formatCurrency(project.monthly_potential)}
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {projects.length === 0 && (
        <Card className="shrink-0">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-4">Nenhum projeto cadastrado ainda.</p>
            <Button asChild variant="outline">
              <Link href="/projetos/novo">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Projeto
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LifecycleCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium truncate">{label}</p>
            <p className="text-xl font-bold mt-0.5">{value}</p>
          </div>
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', color)}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}