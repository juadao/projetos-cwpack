'use client';

import { useState } from 'react';
import { Save, Loader2, ExternalLink, BarChart3, TrendingUp, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Project, TestProduct } from '@/lib/types';
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

  // Metrics
  const total = testProducts.length;
  const completed = testProducts.filter((t) => t.final_result).length;
  const pending = testProducts.filter((t) => !t.final_result).length;
  const lost = testProducts.filter((t) => t.final_result === 'Reprovado' || t.final_result === 'Inválido').length;
  const approved = testProducts.filter((t) => t.final_result === 'Aprovado').length;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const deadline = project.start_date ? addDays(new Date(project.start_date), 10) : null;

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

      {/* Automatic Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Métricas Automáticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <MetricBox icon={TrendingUp} label="Testes em Andamento" value={total} color="text-blue-600 bg-blue-50" />
            <MetricBox icon={CheckCircle2} label="Itens Concluídos" value={completed} color="text-emerald-600 bg-emerald-50" />
            <MetricBox icon={Clock} label="Itens Pendentes" value={pending} color="text-amber-600 bg-amber-50" />
            <MetricBox icon={XCircle} label="Itens Perdidos" value={lost} color="text-red-600 bg-red-50" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">% de Conclusão</span>
              <span className="text-sm font-semibold">{completionPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${completionPct}%` }} /></div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">Status Geral</span>
            <StatusBadge status={project.status || 'Em Andamento'} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-muted-foreground">Potencial Consumo Mensal</span>
            <span className="text-sm font-semibold">{formatCurrency(project.monthly_potential)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Results & Closing */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Resultados & Fechamento</CardTitle>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
          </div>
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

          <div className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              id="repAtFinal"
              checked={repAtFinal}
              onChange={(e) => setRepAtFinal(e.target.checked)}
              className="h-4 w-4 rounded border-primary"
            />
            <Label htmlFor="repAtFinal" className="text-sm font-normal cursor-pointer">
              Representante presente na validação final?
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="repResponsible">Representante Responsável</Label>
            <Input
              id="repResponsible"
              value={repResponsible}
              onChange={(e) => setRepResponsible(e.target.value)}
              placeholder="Nome do representante responsável"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resultsMeetingAt">Data da Reunião de Resultados</Label>
              <Input
                id="resultsMeetingAt"
                type="datetime-local"
                value={resultsMeetingAt}
                onChange={(e) => setResultsMeetingAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driveLink">Link do Drive do Projeto</Label>
              <Input
                id="driveLink"
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyVolumeClosed">Volume Mensal Fechado (R$/Mês)</Label>
              <Input
                id="monthlyVolumeClosed"
                type="number"
                value={monthlyVolumeClosed}
                onChange={(e) => setMonthlyVolumeClosed(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyQtyClosed">Quantidade de Embalagens/Mês</Label>
              <Input
                id="monthlyQtyClosed"
                type="number"
                value={monthlyQtyClosed}
                onChange={(e) => setMonthlyQtyClosed(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resultObservations">Observações / Motivo do Resultado</Label>
            <Textarea
              id="resultObservations"
              value={resultObservations}
              onChange={(e) => setResultObservations(e.target.value)}
              placeholder="Descreva o motivo do resultado..."
              rows={4}
            />
          </div>

          {driveLink && (
            <a href={driveLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
              <ExternalLink className="h-4 w-4" /> Abrir Drive do Projeto
            </a>
          )}
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

function MetricBox({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}