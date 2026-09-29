'use client';

import { useState } from 'react';
import { Plus, Trash2, AlertTriangle, Link2, Truck, CheckSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LogisticsItem, ChecklistStatus, ProjectChecklistItem } from '@/lib/types';
import { DEFAULT_LOGISTICS_ITEMS, LOGISTICS_ACTIONS, LOGISTICS_RESPONSIBLES } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChecklistStatusBadge } from '@/components/status-badges';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const statusOptions: ChecklistStatus[] = [
  'Ok / Pronto para o Teste',
  'Em Andamento',
  'Atrasado / Pendente',
  'Não se faz necessário',
];

const statusCycle: Record<string, ChecklistStatus> = {
  'Atrasado / Pendente': 'Em Andamento',
  'Em Andamento': 'Ok / Pronto para o Teste',
  'Ok / Pronto para o Teste': 'Não se faz necessário',
  'Não se faz necessário': 'Atrasado / Pendente',
};

export function ProjectChecklistTab({
  projectId,
  checklistItems,
  logisticsItems,
  onUpdate,
}: {
  projectId: string;
  checklistItems: ProjectChecklistItem[];
  logisticsItems: LogisticsItem[];
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterResponsible, setFilterResponsible] = useState('all');

  const toggleChecklistItem = async (item: ProjectChecklistItem) => {
    const { error } = await supabase
      .from('project_checklists')
      .update({ completed: !item.completed })
      .eq('id', item.id);
    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } else {
      onUpdate();
    }
  };

  const addChecklistItem = async () => {
    const { error } = await supabase.from('project_checklists').insert({
      project_id: projectId,
      item_name: 'Novo Item',
      action: '',
      completed: false,
    });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      onUpdate();
    }
  };

  const updateChecklistItem = async (id: string, field: 'item_name' | 'action', value: string) => {
    const { error } = await supabase.from('project_checklists').update({ [field]: value }).eq('id', id);
    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } else {
      onUpdate();
    }
  };

  const removeChecklistItem = async (id: string) => {
    const { error } = await supabase.from('project_checklists').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    } else {
      onUpdate();
    }
  };

  // ===== Logistics items (existing functionality) =====
  const addItem = async () => {
    const { error } = await supabase.from('logistics_items').insert({
      project_id: projectId,
      item_name: '',
      action: null,
      responsible: null,
      due_date: null,
      status: 'Atrasado / Pendente',
    });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      onUpdate();
    }
  };

  const addDefaultItems = async () => {
    const items = DEFAULT_LOGISTICS_ITEMS.map((name) => ({
      project_id: projectId,
      item_name: name,
      action: null,
      responsible: null,
      due_date: null,
      status: 'Atrasado / Pendente' as ChecklistStatus,
    }));
    const { error } = await supabase.from('logistics_items').insert(items);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Itens padrão adicionados!' });
      onUpdate();
    }
  };

  const updateItem = async (id: string, field: keyof LogisticsItem, value: string | null) => {
    const { error } = await supabase.from('logistics_items').update({ [field]: value }).eq('id', id);
    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return;
    }
    onUpdate();
  };

  const cycleStatus = async (id: string, currentStatus: string) => {
    const next = statusCycle[currentStatus] || 'Em Andamento';
    await updateItem(id, 'status', next);
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from('logistics_items').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
      return;
    }
    onUpdate();
  };

  // ===== Progress calculations =====
  const checklistCompleted = checklistItems.filter((i) => i.completed).length;
  const checklistPct = checklistItems.length > 0 ? Math.round((checklistCompleted / checklistItems.length) * 100) : 0;

  const logCompleted = logisticsItems.filter((i) => i.status === 'Ok / Pronto para o Teste' || i.status === 'Não se faz necessário').length;
  const logPct = logisticsItems.length > 0 ? Math.round((logCompleted / logisticsItems.length) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredItems = logisticsItems.filter((i) => {
    const matchesStatus = filterStatus === 'all' || i.status === filterStatus;
    const matchesResp = filterResponsible === 'all' || i.responsible === filterResponsible;
    return matchesStatus && matchesResp;
  });

  return (
    <div className="space-y-4">
      {/* ===== Checklist Padrão (project_checklists) ===== */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Checklist do Projeto
            </CardTitle>
            <Button size="sm" variant="outline" onClick={addChecklistItem}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 w-full overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${checklistPct}%` }} /></div>
            <span className="text-sm font-medium">{checklistPct}% concluído</span>
          </div>

          {/* Checklist items */}
          {checklistItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum item no checklist.
            </div>
          ) : (
            <div className="space-y-1">
              {checklistItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-all group',
                    item.completed ? 'border-emerald-200 bg-emerald-50/50' : 'border-border hover:border-primary/30'
                  )}
                >
                  <Checkbox
                    id={`check-${item.id}`}
                    checked={item.completed}
                    onCheckedChange={() => toggleChecklistItem(item)}
                  />
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <input
                      value={item.item_name}
                      onChange={(e) => updateChecklistItem(item.id, 'item_name', e.target.value)}
                      className={cn(
                        'flex-1 bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary outline-none text-sm font-medium py-1',
                        item.completed && 'line-through text-muted-foreground'
                      )}
                      placeholder="Item..."
                    />
                    <input
                      value={item.action || ''}
                      onChange={(e) => updateChecklistItem(item.id, 'action', e.target.value)}
                      className={cn(
                        'sm:w-64 bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary outline-none text-sm text-muted-foreground py-1',
                        item.completed && 'line-through'
                      )}
                      placeholder="Ação..."
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeChecklistItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Checklist Logístico (logistics_items — existing) ===== */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Checklist Logístico
            </CardTitle>
            <div className="flex gap-2">
              {logisticsItems.length === 0 && (
                <Button size="sm" variant="outline" onClick={addDefaultItems}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Itens Padrão
                </Button>
              )}
              <Button size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Item
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 w-full overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${logPct}%` }} /></div>
            <span className="text-sm font-medium">{logPct}% concluído</span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">Todos Status</option>
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterResponsible} onChange={(e) => setFilterResponsible(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">Todos Responsáveis</option>
              {LOGISTICS_RESPONSIBLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Items */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {logisticsItems.length === 0 ? 'Nenhum item no checklist logístico.' : 'Nenhum item encontrado com os filtros.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const isOverdue =
                  item.due_date &&
                  item.status !== 'Ok / Pronto para o Teste' &&
                  item.status !== 'Não se faz necessário' &&
                  new Date(item.due_date) < today;
                const isNear =
                  item.due_date &&
                  item.status !== 'Ok / Pronto para o Teste' &&
                  item.status !== 'Não se faz necessário' &&
                  !isOverdue &&
                  new Date(item.due_date).getTime() - today.getTime() <= 3 * 24 * 60 * 60 * 1000;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex flex-col md:flex-row md:items-center gap-2 p-3 rounded-lg border transition-all',
                      isOverdue ? 'border-red-300 bg-red-50/50' : isNear ? 'border-amber-300 bg-amber-50/50' : 'border-border'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <input
                        value={item.item_name || ''}
                        onChange={(e) => updateItem(item.id, 'item_name', e.target.value)}
                        className="w-full bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary outline-none text-sm font-medium py-1"
                        placeholder="Item / Material / Ação..."
                      />
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {isOverdue && (
                          <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                            <AlertTriangle className="h-3 w-3" /> Vencido
                          </span>
                        )}
                        {isNear && !isOverdue && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                            <AlertTriangle className="h-3 w-3" /> Vence em breve
                          </span>
                        )}
                        {item.evidence_url && (
                          <a href={item.evidence_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                            <Link2 className="h-3 w-3" /> Evidência
                          </a>
                        )}
                      </div>
                    </div>

                    <select
                      value={item.action || ''}
                      onChange={(e) => updateItem(item.id, 'action', e.target.value || null)}
                      className="h-9 rounded-md border border-input bg-background px-2 text-xs md:w-40"
                    >
                      <option value="">Ação...</option>
                      {LOGISTICS_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>

                    <select
                      value={item.responsible || ''}
                      onChange={(e) => updateItem(item.id, 'responsible', e.target.value || null)}
                      className="h-9 rounded-md border border-input bg-background px-2 text-xs md:w-32"
                    >
                      <option value="">Resp...</option>
                      {LOGISTICS_RESPONSIBLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>

                    <input
                      type="date"
                      value={item.due_date || ''}
                      onChange={(e) => updateItem(item.id, 'due_date', e.target.value || null)}
                      className={cn(
                        'h-9 rounded-md border border-input bg-background px-2 text-xs md:w-36',
                        isOverdue && 'border-red-400'
                      )}
                    />

                    <button
                      onClick={() => cycleStatus(item.id, item.status || 'Atrasado / Pendente')}
                      className="shrink-0"
                    >
                      <ChecklistStatusBadge value={item.status ?? null} />
                    </button>

                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
