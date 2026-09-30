'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, GripVertical, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Project, PipelineStatus } from '@/lib/types';
import { PIPELINE_STAGES, PIPELINE_STATUSES } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_STAGE: PipelineStatus = 'Solicitado';

export default function DashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    setProjects((data || []) as Project[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Alteração manual do fluxo (arrastar OU select) — grava direto no projeto
  const moveTo = async (id: string, status: PipelineStatus, current: string | null) => {
    if (status === current) return;
    // Atualização otimista na tela
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, pipeline_status: status } : p))
    );
    setDraggedId(null);
    const { error } = await supabase
      .from('projects')
      .update({ pipeline_status: status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro ao mover', description: error.message, variant: 'destructive' });
      loadData();
    } else {
      const proj = projects.find((p) => p.id === id);
      toast({ title: 'Projeto movido', description: `${proj?.client_name || 'Projeto'} → ${status}` });
    }
  };

  const visible = projects.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.client_name || '').toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.cnpj || '').includes(search.trim())
    );
  });

  // Projeto sem status definido entra em "Solicitado"
  const stageOf = (p: Project): PipelineStatus =>
    ((p.pipeline_status as PipelineStatus) || DEFAULT_STAGE);

  const count = (status: PipelineStatus) =>
    visible.filter((p) => stageOf(p) === status).length;

  const potencial = visible
    .filter((p) => stageOf(p) === 'Negociação Comercial')
    .reduce((sum, p) => sum + (Number(p.monthly_volume_closed) || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Carregando fluxo operacional...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fluxo Operacional das Etapas</h1>
          <p className="text-sm text-muted-foreground">
            Arraste os projetos entre as etapas ou troque o status direto no card
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente ou código..."
              className="pl-9 w-full sm:w-64"
            />
          </div>
          <Link href="/projetos/novo">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus className="h-4 w-4 mr-1" />
              Novo
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Projetos</p>
          <p className="text-2xl font-bold">{visible.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Em Campo</p>
          <p className="text-2xl font-bold" style={{ color: '#ec4899' }}>{count('Em Campo')}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Faturados</p>
          <p className="text-2xl font-bold" style={{ color: '#059669' }}>{count('Faturado')}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Potencial em Negociação</p>
          <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>
            {potencial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Fluxo — 10 etapas (5 + 5), cor própria por etapa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {PIPELINE_STAGES.map((stage, idx) => {
          const stageProjects = visible.filter((p) => stageOf(p) === stage.status);
          return (
            <div
              key={stage.status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedId) {
                  const proj = projects.find((p) => p.id === draggedId);
                  if (proj) moveTo(proj.id, stage.status, proj.pipeline_status);
                }
              }}
              className="rounded-xl border bg-card flex flex-col min-h-[240px] overflow-hidden"
              style={{ borderTop: `6px solid ${stage.color}` }}
            >
              {/* Cabeçalho colorido da etapa */}
              <div className="p-3 border-b" style={{ backgroundColor: `${stage.color}22` }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <h3
                      className="font-semibold text-xs leading-tight truncate"
                      style={{ color: stage.color }}
                    >
                      {idx + 1}. {stage.label}
                    </h3>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                    style={{ backgroundColor: stage.color }}
                  >
                    {stageProjects.length}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">
                  {stage.description}
                </p>
              </div>

              {/* Projetos da etapa */}
              <div className="p-2 space-y-2 flex-1">
                {stageProjects.length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center pt-6">
                    Nenhum projeto aqui
                  </p>
                )}
                {stageProjects.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => setDraggedId(p.id)}
                    onDragEnd={() => setDraggedId(null)}
                    className="rounded-lg border bg-background p-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-1">
                      <GripVertical className="h-3 w-3 mt-1 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{p.client_name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.code}</p>
                      </div>
                    </div>
                    {/* Troca manual sem arrastar (ideal para celular) */}
                    <Select
                      value={stageOf(p)}
                      onValueChange={(v) => moveTo(p.id, v as PipelineStatus, p.pipeline_status)}
                    >
                      <SelectTrigger className="h-7 mt-2 text-[11px]">
                        <SelectValue placeholder="Trocar etapa..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PIPELINE_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Link
                      href={`/projetos/${p.id}`}
                      className="text-[10px] text-primary hover:underline block mt-1"
                    >
                      Abrir projeto →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}