'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, GripVertical, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Project, PipelineStatus } from '@/lib/types';
import { PIPELINE_STAGES, PROJECT_TYPES, STATUS_BY_STAGE } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_STAGE: PipelineStatus = 'Solicitados';

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

  // Atualização otimista + gravação no banco (fonte única de verdade)
  const patchProject = async (id: string, patch: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const { error } = await supabase
      .from('projects')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      loadData();
    }
  };

  // Mudança de ETAPA (arrastar entre colunas).
  // O Status só é mantido se for válido na etapa nova; em Solicitados é limpo.
  const moveTo = (id: string, newStage: PipelineStatus) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj) { setDraggedId(null); return; }
    if (proj.pipeline_status === newStage) { setDraggedId(null); return; }
    const validStatuses = STATUS_BY_STAGE[newStage];
    const nextFlowStatus =
      proj.flow_status && validStatuses.includes(proj.flow_status) ? proj.flow_status : null;
    setDraggedId(null);
    patchProject(id, { pipeline_status: newStage, flow_status: nextFlowStatus });
    toast({ title: 'Projeto movido', description: `${proj.client_name || 'Projeto'} → ${newStage}` });
  };

  const changeType = (id: string, value: string) => patchProject(id, { project_type: value });
  const changeFlowStatus = (id: string, value: string) => patchProject(id, { flow_status: value });

  const visible = projects.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.client_name || '').toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.cnpj || '').includes(search.trim())
    );
  });

  // Projeto sem etapa definida entra em "Solicitados"
  const stageOf = (p: Project): PipelineStatus =>
    ((p.pipeline_status as PipelineStatus) || DEFAULT_STAGE);

  const count = (status: PipelineStatus) =>
    visible.filter((p) => stageOf(p) === status).length;

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
            Arraste os projetos entre as etapas • Use os selects de Projeto e Status
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
          <p className="text-xs text-muted-foreground">Análise e Op.</p>
          <p className="text-2xl font-bold" style={{ color: '#8b5cf6' }}>{count('Análise e Operacional')}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Comercial</p>
          <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{count('Comercial')}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Fidelizados</p>
          <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{count('Fidelizados')}</p>
        </div>
      </div>

      {/* Fluxo — 5 etapas com cor própria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageProjects = visible.filter((p) => stageOf(p) === stage.status);
          return (
            <div
              key={stage.status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedId) moveTo(draggedId, stage.status);
              }}
              className="rounded-xl border bg-card flex flex-col min-h-[260px] overflow-hidden"
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
                      {stage.label}
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
                    className="rounded-lg border bg-background p-2.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                  >
                    {/* Nome clicável — abre o projeto completo */}
                    <Link href={`/projetos/${p.id}`} className="block">
                      <p className="text-xs font-semibold truncate hover:underline">
                        {p.client_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{p.code}</p>
                    </Link>

                    {/* Selects: Projeto (sempre) + Status (conforme a etapa) */}
                    <div className={`grid gap-1.5 mt-2 ${stage.status === 'Solicitados' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-[9px] font-medium text-muted-foreground">Projeto:</p>
                        <Select
                          value={p.project_type || undefined}
                          onValueChange={(v) => changeType(p.id, v)}
                        >
                          <SelectTrigger className="h-7 text-[10px] px-2">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROJECT_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {stage.status !== 'Solicitados' && (
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-[9px] font-medium text-muted-foreground">Status:</p>
                          <Select
                            value={p.flow_status || undefined}
                            onValueChange={(v) => changeFlowStatus(p.id, v)}
                          >
                            <SelectTrigger className="h-7 text-[10px] px-2">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_BY_STAGE[stage.status].map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
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