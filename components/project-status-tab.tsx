'use client';

import { useState } from 'react';
import { Save, Loader2, ExternalLink, BarChart3, TrendingUp, CheckCircle2, Clock, XCircle, GitBranch } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Project, TestProduct, PipelineStatus } from '@/lib/types';
import { PIPELINE_STAGES, PROJECT_TYPES, STATUS_BY_STAGE } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/status-badges';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate, addDays } from '@/lib/format';
import { cn } from '@/lib/utils';

export function ProjectStatusTab({
  projectId,
  project,
  testProducts,
  onUpdate,
}: {
  projectId: string;
  project: Project;
  testProducts: TestProduct[];
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(project.status || 'Em Andamento');
  const [repAtFinal, setRepAtFinal] = useState(project.rep_at_final || false);
  const [repResponsible, setRepResponsible] = useState(project.rep_responsible || '');
  const [resultsMeetingAt, setResultsMeetingAt] = useState(
    project.results_meeting_at ? project.results_meeting_at.slice(0, 16) : ''
  );
  const [finalStatus, setFinalStatus] = useState(project.final_status || 'Em Negociação');
  const [monthlyVolumeClosed, setMonthlyVolumeClosed] = useState(String(project.monthly_volume_closed || ''));
  const [monthlyQtyClosed, setMonthlyQtyClosed] = useState(String(project.monthly_qty_closed || ''));
  const [resultObservations, setResultObservations] = useState(project.result_observations || '');
  const [driveLink, setDriveLink] = useState(project.drive_link || '');
  // Fluxo do Projeto
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>(
    (project.pipeline_status as PipelineStatus) || 'Solicitados'
  );
  const [projectType, setProjectType] = useState(project.project_type || '');
  const [flowStatus, setFlowStatus] = useState(project.flow_status || '');

  // Metrics
  const total = testProducts.length;
  const completed = testProducts.filter((t) => t.final_result).length;
  const pending = testProducts.filter((t) => !t.final_result).length;
  const lost = testProducts.filter((t) => t.final_result === 'Reprovado' || t.final_result === 'Inválido').length;
  const approved = testProducts.filter((t) => t.final_result === 'Aprovado').length;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const deadline = project.start_date ? addDays(new Date(project.start_date), 10) : null;

  // ===== Fluxo do Projeto — grava na hora; o dashboard reflete sozinho (mesmos campos) =====
  const changeStage = async (newStage: PipelineStatus) => {
    if (newStage === pipelineStatus) return;
    const valid = STATUS_BY_STAGE[newStage];
    const nextFlow = flowStatus && valid.includes(flowStatus) ? flowStatus : '';
    setPipelineStatus(newStage);
    setFlowStatus(nextFlow);
    const { error } = await supabase
      .from('projects')
      .update({
        pipeline_status: newStage,
        flow_status: nextFlow || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);
    if (error) {
      toast({ title: 'Erro ao alterar etapa', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Etapa atualizada', description: `Fluxo: ${newStage}` });
      onUpdate();
    }
  };

  const changeFlowField = async (field: 'project_type' | 'flow_status', value: string) => {
    if (field === 'project_type') setProjectType(value);
    else setFlowStatus(value);
    const { error } = await supabase
      .from('projects')
      .update({ [field]: value || null, updated_at: new Date().toISOString() })
      .eq('id', projectId);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      onUpdate();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('projects').update({
      status,
      rep_at_final: repAtFinal,
      rep_responsible: repResponsible || null,
      results_meeting_at: resultsMeetingAt || null,
      final_status: finalStatus,
      monthly_volume_closed: monthlyVolumeClosed ? parseFloat(monthlyVolumeClosed) : 0,
      monthly_qty_closed: monthlyQtyClosed ? parseInt(monthlyQtyClosed) : 0,
      result_observations: resultObservations || null,
      drive_link: driveLink || null,
      pipeline_status: pipelineStatus,
      project_type: projectType || null,
      flow_status: flowStatus || null,
      updated_at: new Date().toISOString(),
    }).eq('id', projectId);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Status atualizado!' });
      onUpdate();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* Fluxo do Projeto */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            Fluxo do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Etapa do Fluxo</Label>
            <Select
              value={pipelineStatus}
              onValueChange={(v) => changeStage(v as PipelineStatus)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s.status} value={s.status}>{s.status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Projeto</Label>
            <Select
              value={projectType || undefined}
              onValueChange={(v) => changeFlowField('project_type', v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {pipelineStatus !== 'Solicitados' && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={flowStatus || undefined}
                onValueChange={(v) => changeFlowField('flow_status', v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {STATUS_BY_STAGE[pipelineStatus].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoField label="Código" value={project.code || '—'} />
            <InfoField label="Cliente" value={project.client_name || '—'} />
            <InfoField label="CNPJ" value={project.cnpj || '—'} />
            <InfoField label="Guardião" value={project.guardian_name || '—'} />
            <InfoField label="Data de Início" value={formatDate(project.start_date)} />
            <InfoField label="Prazo Final (D+10)" value={deadline ? formatDate(deadline.toISOString()) : '—'} />
          </div>
        </CardContent>
      </Card>

      {/* Métricas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Métricas Automáticas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricBox icon={Clock} label="Testes em Andamento" value={String(total - completed)} color="text-orange-600 bg-orange-50" />
            <MetricBox icon={CheckCircle2} label="Itens Concluídos" value={String(completed)} color="text-emerald-600 bg-emerald-50" />
            <MetricBox icon={BarChart3} label="Itens Pendentes" value={String(pending)} color="text-amber-600 bg-amber-50" />
            <MetricBox icon={XCircle} label="Itens Perdidos" value={String(lost)} color="text-red-600 bg-red-50" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">% de Conclusão</span>
              <span className="text-sm font-semibold">{completionPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: `${completionPct}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">Status Geral</span>
            <StatusBadge status={status} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-muted-foreground">Potencial Consumo Mensal</span>
            <span className="text-sm font-semibold">{formatCurrency(project.monthly_potential || 0)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Resultados & Fechamento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultados & Fechamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status do Projeto</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                  <SelectItem value="Pausado">Pausado</SelectItem>
                  <SelectItem value="Aprovado">Aprovado</SelectItem>
                  <SelectItem value="Reprovado">Reprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status Final do Negócio</Label>
              <Select value={finalStatus} onValueChange={setFinalStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Em Negociação">Em Negociação</SelectItem>
                  <SelectItem value="Aprovado">Aprovado</SelectItem>
                  <SelectItem value="Reprovado">Reprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Reunião de Resultados</Label>
              <Input
                type="datetime-local"
                value={resultsMeetingAt}
                onChange={(e) => setResultsMeetingAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável pelo Rep na Finalização</Label>
              <Input
                value={repResponsible}
                onChange={(e) => setRepResponsible(e.target.value)}
                placeholder="Nome do responsável"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="repAtFinal"
              checked={repAtFinal}
              onChange={(e) => setRepAtFinal(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="repAtFinal">Rep presente na finalização</Label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Volume Mensal Fechado (R$)</Label>
              <Input
                value={monthlyVolumeClosed}
                onChange={(e) => setMonthlyVolumeClosed(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Quantidade de Embalagens/Mês</Label>
              <Input
                value={monthlyQtyClosed}
                onChange={(e) => setMonthlyQtyClosed(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações do Resultado</Label>
            <Textarea
              value={resultObservations}
              onChange={(e) => setResultObservations(e.target.value)}
              placeholder="Observações finais do projeto..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Link do Drive do Projeto</Label>
            <div className="flex gap-2">
              <Input
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/..."
              />
              {driveLink && (
                <a href={driveLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function MetricBox({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className={cn('rounded-lg border p-3', color)}>
      <Icon className="h-4 w-4 mb-1" />
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}