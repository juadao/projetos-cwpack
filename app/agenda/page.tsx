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
  statusLabel?: string | null;
  description?: string | null;
  project?: Project;
}

interface ManualEventRow {
  id: string;
  event_date: string;
  title: string;
  description: string | null;
  project_id: string | null;
  status: string | null;
  participants: string | null;
  solicitante: string | null;
}

// Cores das barras
const TYPE_STYLE: Record<EventType, { bg: string }> = {
  Campo: { bg: '#2563eb' },
  ATC: { bg: '#22c55e' },
  ATM: { bg: '#f59e0b' },
  Agendamento: { bg: '#8b5cf6' },
};

// Rótulo do agendamento: "P ou A - Iniciais | Solicitante (Título)"
const buildLabel = (r: ManualEventRow) => {
  const statusLetter =
    r.status === 'Programado' ? 'P' :
    r.status === 'Agendado' ? 'A' : null;
  const initials = (r.participants || '').toUpperCase();
  const prefix = [statusLetter, initials].filter(Boolean).join(' - ');
  const who = (r.solicitante || '').trim();
  const main = who ? `${who} (${r.title})` : r.title;
  return prefix ? `${prefix} | ${main}` : main;
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

  // Formulário de novo agendamento (modelo do rascunho)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formStatus, setFormStatus] = useState<'Programado' | 'Agendado'>('Programado');
  const [formProjectId, setFormProjectId] = useState('none');
  const [formTitle, setFormTitle] = useState('');
  const [withManu, setWithManu] = useState(false);
  const [withJonathan, setWithJonathan] = useState(false);
  const [withOther, setWithOther] = useState(false);
  const [otherName, setOtherName] = useState('');
  const [formSolicitante, setFormSolicitante] = useState('');
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

      push(base, {
        id: `${p.id}-campo`,
        type: 'Campo',
        label: `Campo · ${p.client_name || 'Projeto'}`,
        project: p,
      });

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

    // Agendamentos manuais — rótulo "P/A - Iniciais | Solicitante (Título)"
    manualRows.forEach((r) => {
      const date = String(r.event_date).slice(0, 10);
      if (date.length < 10) return;
      push(date, {
        id: r.id,
        type: 'Agendamento',
        label: buildLabel(r),
        statusLabel: r.status || null,
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
    setFormStatus('Programado');
    setFormProjectId('none');
    setFormTitle('');
    setWithManu(false);
    setWithJonathan(false);
    setWithOther(false);
    setOtherName('');
    setFormSolicitante('');
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

    // Monta as iniciais dos participantes: M (Manu), J (Jonathan), 1ª letra do "Outro"
    let letters = '';
    if (withManu) letters += 'M';
    if (withJonathan) letters += 'J';
    if (withOther && otherName.trim()) letters += otherName.trim().charAt(0).toUpperCase();

    setSaving(true);
    const { error } = await supabase.from('agenda_events').insert({
      event_date: formDate,
      title,
      description: formDesc.trim() || null,
      project_id: formProjectId === 'none' ? null : formProjectId,
      status: formStatus,
      participants: letters || null,
      solicitante: formSolicitante.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Agendamento salvo!' });
    setDialogOpen(false);
    setSelected(formDate);
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
            Clique em um dia para agendar • P = Programado • A = Agendado • ATC D+3/7/10 • ATM D+5/10/14
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
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#2563eb' }} />
          Dia de campo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#22c55e' }} />
          ATC D+3 / D+7 / D+10
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
          ATM D+5 / D+10 / D+14
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#8b5cf6' }} />
          Agendamentos (P/A)
        </span>
      </div>

      {/* Calendário mensal — fonte maior (como no print de referência) */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="p-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                className={`relative text-left p-1.5 sm:p-2 min-h-[80px] sm:min-h-[110px] border-b border-r [&:nth-child(7n)]:border-r-0 transition-colors ${
                  !inMonth
                    ? 'bg-muted/20 text-muted-foreground/50'
                    : 'hover:bg-muted/30'
                } ${isSel ? 'bg-muted/50' : ''}`}
              >
                {/* Dia atual em destaque laranja */}
                <span
                  className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold ${
                    isToday ? 'bg-orange-500 text-white' : ''
                  }`}
                >
                  {dayNum}
                </span>

                {/* Barras de eventos — fonte maior */}
                <div className="mt-1.5 space-y-1">
                  {evs.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded px-1.5 py-1 text-[10px] sm:text-[11px] leading-tight font-medium text-white truncate"
                      style={{ backgroundColor: TYPE_STYLE[ev.type].bg }}
                    >
                      {ev.label}
                    </div>
                  ))}
                  {evs.length > 3 && (
                    <p className="text-[10px] text-muted-foreground pl-0.5">
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
          <h2 className="text-base font-semibold">Dia {brDate(selected)}</h2>
          <Button size="sm" onClick={() => openDialog(selected)}>
            <Plus className="h-4 w-4 mr-1" />
            Agendar neste dia
          </Button>
        </div>
        {selectedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum compromisso neste dia.</p>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between gap-3 border rounded-lg p-3"
              >
                <div className="min-w-0">
                  <span
                    className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold text-white mb-1"
                    style={{ backgroundColor: TYPE_STYLE[ev.type].bg }}
                  >
                    {ev.type === 'Campo'
                      ? 'DIA DE CAMPO'
                      : ev.type === 'Agendamento'
                        ? (ev.statusLabel || 'AGENDAMENTO').toUpperCase()
                        : ev.label.split(' · ')[0]}
                  </span>
                  <p className="text-sm font-semibold truncate">
                    {ev.type === 'Agendamento' ? ev.label : ev.project?.client_name || ev.label}
                  </p>
                  {ev.type === 'Agendamento' && ev.project && (
                    <p className="text-xs text-muted-foreground truncate">
                      Projeto vinculado: {ev.project.client_name}
                      {ev.project.code ? ` (${ev.project.code})` : ''}
                    </p>
                  )}
                  {ev.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {ev.description}
                    </p>
                  )}
                  {ev.type !== 'Agendamento' && ev.project && (
                    <p className="text-xs text-muted-foreground truncate">
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
        <h2 className="text-base font-semibold mb-3">
          Aguardando agendamento ({waiting.length})
        </h2>
        {waiting.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todos os projetos já têm data de campo.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {waiting.map((p) => (
              <Link
                key={p.id}
                href={`/projetos/${p.id}`}
                className="flex items-center justify-between gap-2 border rounded-lg p-2.5 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{p.client_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.code} • {p.pipeline_status || 'Solicitados'}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">Abrir →</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Modal de novo agendamento — igual ao rascunho da terceira foto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold uppercase tracking-wide">
              Novo Agendamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Data */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Data</p>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="h-10"
              />
            </div>

            {/* Status: Programado / Agendado */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormStatus('Programado')}
                  className={`flex-1 h-10 rounded-md border text-sm font-semibold transition-colors ${
                    formStatus === 'Programado'
                      ? 'bg-violet-500 text-white border-violet-500'
                      : 'bg-background hover:bg-muted/40'
                  }`}
                >
                  Programado (P)
                </button>
                <button
                  type="button"
                  onClick={() => setFormStatus('Agendado')}
                  className={`flex-1 h-10 rounded-md border text-sm font-semibold transition-colors ${
                    formStatus === 'Agendado'
                      ? 'bg-violet-500 text-white border-violet-500'
                      : 'bg-background hover:bg-muted/40'
                  }`}
                >
                  Agendado (A)
                </button>
              </div>
            </div>

            {/* Projeto */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Projeto</p>
              <Select value={formProjectId} onValueChange={handleProjectSelect}>
                <SelectTrigger className="h-10 w-full">
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

            {/* Título do Evento */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Título do Evento</p>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex.: Reunião equipe"
                className="h-10"
              />
            </div>

            {/* Participantes: Manu, Jonathan, Outro */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Participantes</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWithManu(!withManu)}
                  className={`h-9 px-4 rounded-md border text-sm font-semibold transition-colors ${
                    withManu
                      ? 'bg-violet-500 text-white border-violet-500'
                      : 'bg-background hover:bg-muted/40'
                  }`}
                >
                  Manu (M)
                </button>
                <button
                  type="button"
                  onClick={() => setWithJonathan(!withJonathan)}
                  className={`h-9 px-4 rounded-md border text-sm font-semibold transition-colors ${
                    withJonathan
                      ? 'bg-violet-500 text-white border-violet-500'
                      : 'bg-background hover:bg-muted/40'
                  }`}
                >
                  Jonathan (J)
                </button>
                <button
                  type="button"
                  onClick={() => setWithOther(!withOther)}
                  className={`h-9 px-4 rounded-md border text-sm font-semibold transition-colors ${
                    withOther
                      ? 'bg-violet-500 text-white border-violet-500'
                      : 'bg-background hover:bg-muted/40'
                  }`}
                >
                  Outro
                </button>
              </div>
              {withOther && (
                <Input
                  value={otherName}
                  onChange={(e) => setOtherName(e.target.value)}
                  placeholder="Nome do participante — vira a 1ª letra no evento"
                  className="h-10"
                />
              )}
            </div>

            {/* Solicitante */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Solicitante</p>
              <Input
                value={formSolicitante}
                onChange={(e) => setFormSolicitante(e.target.value)}
                placeholder="Nome de quem solicitou"
                className="h-10"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Descrição</p>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Adicione uma descrição..."
                rows={4}
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