'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

// ===== Acompanhamentos automáticos =====
const ATC_OFFSETS = [3, 7, 10];  // ATC: D+3, D+7, D+10
const ATM_OFFSETS = [5, 10, 14]; // ATM: D+5, D+10, D+14

type EventType = 'Campo' | 'ATC' | 'ATM' | 'Agendamento';

interface AgendaEvent {
  id: string;
  type: EventType;
  label: string;
  description?: string | null;
  project?: Project; // Projeto vinculado (quando houver)
}

interface ManualEventRow {
  id: string;
  event_date: string;
  title: string;
  description: string | null;
  project_id: string | null;
}

// Cores das barras e rótulos do painel
const TYPE_STYLE: Record<EventType, { bg: string; badge: string }> = {
  Campo: { bg: '#2563eb', badge: 'DIA DE CAMPO' },
  ATC: { bg: '#22c55e', badge: 'ATC' },
  ATM: { bg: '#f59e0b', badge: 'ATM' },
  Agendamento: { bg: '#8b5cf6', badge: 'AGENDAMENTO' },
};

const WEEK_DAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Utilitários de data (fuso local, formato yyyy-mm-dd)
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (iso: string, days: number) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return fmt(dt);
};

const brDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export default function AgendaPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [manualRows, setManualRows] = useState<ManualEventRow[]>([]);
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => fmt(new Date()));

  // Formulário de novo agendamento
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formProjectId, setFormProjectId] = useState('none');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [projRes, evRes] = await Promise.all([
      supabase.from('projects').select('*').order('start_date', { ascending: true }),
      supabase.from('agenda_events').select('*').order('event_date', { ascending: true }),
    ]);
    setProjects((projRes.data || []) as Project[]);
    setManualRows((evRes.data || []) as ManualEventRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===== Monta os eventos: campo + D+ automáticos + agendamentos manuais =====
  const eventsByDate = useMemo(() => {
    const map: Record<string, AgendaEvent[]> = {};
    const push = (date: string, ev: AgendaEvent) => {
      if (!map[date]) map[date] = [];
      map[date].push(ev);
    };

    projects.forEach((p) => {
      if (!p.start_date) return;
      const base = String(p.start_date).slice(0, 10);
      if (base.length < 10) return;

      // Dia de campo
      push(base, {
        id: `${p.id}-campo`,
        type: 'Campo',
        label: `Campo · ${p.client_name || 'Projeto'}`,
        project: p,
      });

      // Acompanhamentos automáticos por tipo de projeto
      const offsets =
        p.project_type === 'ATC' ? ATC_OFFSETS :
        p.project_type === 'ATM' ? ATM_OFFSETS : [];

      offsets.forEach((n) => {
        push(addDays(base, n), {
          id: `${p.id}-${p.project_type}-${n}`,
          type: p.project_type as 'ATC' | 'ATM',
          label: `${p.project_type} D+${n} · ${p.client_name || 'Projeto'}`,
          project: p,
        });
      });
    });

    // Agendamentos manuais criados ao clicar no dia
    manualRows.forEach((r) => {
      const date = String(r.event_date).slice(0, 10);
      if (date.length < 10) return;
      push(date, {
        id: r.id,
        type: 'Agendamento',
        label: r.title,
        description: r.description,
        project: r.project_id ? projects.find((p) => p.id === r.project_id) : undefined,
      });
    });

    return map;
  }, [projects, manualRows]);

  // Projetos sem data de campo (tirando os Perdidos)
  const waiting = useMemo(
    () =>
      projects.filter(
        (p) => !p.start_date && (p.pipeline_status || '') !== 'Perdidos'
      ),
    [projects]
  );

  // Projetos em ordem alfabética para o select do formulário
  const projectsAlpha = useMemo(
    () =>
      [...projects].sort((a, b) =>
        (a.client_name || '').localeCompare(b.client_name || '')
      ),
    [projects]
  );

  // ===== Grade do mês: 6 semanas, dom → sáb =====
  const gridDates = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const start = new Date(y, m, 1 - first.getDay());
    const cells: string[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(fmt(d));
    }
    return cells;
  }, [cursor]);

  const today = fmt(new Date());
  const monthPrefix = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;

  const changeMonth = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  const goToday = () => {
    const now = new Date();
    setCursor(now);
    setSelected(fmt(now));
  };

  // ===== Agendamento manual =====
  const openDialog = (date: string) => {
    setFormDate(date);
    setFormProjectId('none');
    setFormTitle('');
    setFormDesc('');
    setDialogOpen(true);
  };

  // Selecionou um projeto → título vira o nome do cliente (pode editar depois)
  const handleProjectSelect = (value: string) => {
    setFormProjectId(value);
    if (value !== 'none') {
      const proj = projects.find((p) => p.id === value);
      if (proj) setFormTitle(proj.client_name || '');
    }
  };

  const handleSave = async () => {
    const title = formTitle.trim();
    if (!formDate || !title) {
      toast({ title: 'Preencha a data e o título do evento', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('agenda_events').insert({
      event_date: formDate,
      title,
      description: formDesc.trim() || null,
      project_id: formProjectId === 'none' ? null : formProjectId,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Agendamento salvo!' });
    setDialogOpen(false);
    setSelected(formDate);
    // Se a data for de outro mês, move o calendário até ela
    const [yy, mm] = formDate.slice(0, 10).split('-').map(Number);
    if (yy && mm) setCursor(new Date(yy, mm - 1, 1));
    loadData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('agenda_events').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Agendamento excluído' });
    loadData();
  };

  const selectedEvents = eventsByDate[selected] || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Carregando agenda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho + navegação de mês */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Clique em um dia para agendar • ATC D+3/7/10 • ATM D+5/10/14
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[140px] text-center">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </span>
          <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Hoje
          </Button>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#2563eb' }} />
          Dia de campo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#22c55e' }} />
          ATC D+3 / D+7 / D+10
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
          ATM D+5 / D+10 / D+14
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#8b5cf6' }} />
          Agendamentos
        </span>
      </div>

      {/* Calendário mensal */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="p-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {gridDates.map((date) => {
            const dayNum = Number(date.slice(8, 10));
            const inMonth = date.slice(0, 7) === monthPrefix;
            const evs = eventsByDate[date] || [];
            const isToday = date === today;
            const isSel = date === selected;

            return (
              <button
                key={date}
                onClick={() => {
                  setSelected(date);
                  openDialog(date);
                }}
                className={`relative text-left p-1 sm:p-1.5 min-h-[68px] sm:min-h-[96px] border-b border-r [&:nth-child(7n)]:border-r-0 transition-colors ${
                  !inMonth
                    ? 'bg-muted/20 text-muted-foreground/50'
                    : 'hover:bg-muted/30'
                } ${isSel ? 'bg-muted/50' : ''}`}
              >
                {/* Dia atual em destaque laranja */}
                <span
                  className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-semibold ${
                    isToday ? 'bg-orange-500 text-white' : ''
                  }`}
                >
                  {dayNum}
                </span>

                {/* Barras de eventos */}
                <div className="mt-1 space-y-0.5">
                  {evs.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded px-1 py-0.5 text-[8px] sm:text-[9px] leading-tight text-white truncate"
                      style={{ backgroundColor: TYPE_STYLE[ev.type].bg }}
                    >
                      {ev.label}
                    </div>
                  ))}
                  {evs.length > 3 && (
                    <p className="text-[9px] text-muted-foreground pl-0.5">
                      +{evs.length - 3}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Painel do dia selecionado */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold">Dia {brDate(selected)}</h2>
          <Button size="sm" onClick={() => openDialog(selected)}>
            <Plus className="h-4 w-4 mr-1" />
            Agendar neste dia
          </Button>
        </div>
        {selectedEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum compromisso neste dia.</p>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between gap-3 border rounded-lg p-3"
              >
                <div className="min-w-0">
                  <span
                    className="inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold text-white mb-1"
                    style={{ backgroundColor: TYPE_STYLE[ev.type].bg }}
                  >
                    {TYPE_STYLE[ev.type].badge}
                  </span>
                  <p className="text-xs font-semibold truncate">
                    {ev.type === 'Agendamento' ? ev.label : ev.project?.client_name || ev.label}
                  </p>
                  {ev.type === 'Agendamento' && ev.project && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      Projeto vinculado: {ev.project.client_name}
                      {ev.project.code ? ` (${ev.project.code})` : ''}
                    </p>
                  )}
                  {ev.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                      {ev.description}
                    </p>
                  )}
                  {ev.type !== 'Agendamento' && ev.project && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {ev.project.code}
                      {ev.project.chef_name ? ` • ${ev.project.chef_name}` : ''}
                      {ev.project.city ? ` • ${ev.project.city}${ev.project.state ? `/${ev.project.state}` : ''}` : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {ev.type === 'Agendamento' ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(ev.id)}
                      title="Excluir agendamento"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  ) : (
                    ev.project && (
                      <Link href={`/projetos/${ev.project.id}`}>
                        <Button variant="outline" size="sm">
                          Abrir
                        </Button>
                      </Link>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aguardando agendamento */}
      <div className="bg-card border rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">
          Aguardando agendamento ({waiting.length})
        </h2>
        {waiting.length === 0 ? (
          <p className="text-xs text-muted-foreground">Todos os projetos já têm data de campo.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {waiting.map((p) => (
              <Link
                key={p.id}
                href={`/projetos/${p.id}`}
                className="flex items-center justify-between gap-2 border rounded-lg p-2.5 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{p.client_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {p.code} • {p.pipeline_status || 'Solicitados'}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">Abrir →</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Modal de novo agendamento (abre ao clicar no dia) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Data</p>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Projeto (opcional)</p>
              <Select value={formProjectId} onValueChange={handleProjectSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum — agendamento livre</SelectItem>
                  {projectsAlpha.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.client_name || 'Projeto'}{p.code ? ` (${p.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Título do evento</p>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex.: Reunião equipe"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Descrição</p>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Adicione uma descrição..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}