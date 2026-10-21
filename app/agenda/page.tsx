'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';

// ===== Acompanhamentos automáticos =====
const ATC_OFFSETS = [3, 7, 10];  // ATC: D+3, D+7, D+10
const ATM_OFFSETS = [5, 10, 14]; // ATM: D+5, D+10, D+14

type EventType = 'Campo' | 'ATC' | 'ATM';

interface AgendaEvent {
  id: string;
  type: EventType;
  label: string;
  project: Project;
}

// Cores das barras (mesma linguagem visual das etapas do fluxo)
const TYPE_STYLE: Record<EventType, { bg: string }> = {
  Campo: { bg: '#2563eb' },
  ATC: { bg: '#22c55e' },
  ATM: { bg: '#f59e0b' },
};

const WEEK_DAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Utilitários de data (sempre no fuso local, formato yyyy-mm-dd)
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
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => fmt(new Date()));

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('start_date', { ascending: true });
    setProjects((data || []) as Project[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===== Monta os eventos: campo + D+ automáticos =====
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

    return map;
  }, [projects]);

  // Projetos sem data de campo (tirando os Perdidos)
  const waiting = useMemo(
    () =>
      projects.filter(
        (p) => !p.start_date && (p.pipeline_status || '') !== 'Perdidos'
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
            Dias de campo e acompanhamentos automáticos • ATC D+3/7/10 • ATM D+5/10/14
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
                onClick={() => setSelected(date)}
                className={`relative text-left p-1 sm:p-1.5 min-h-[68px] sm:min-h-[96px] border-b border-r [&:nth-child(7n)]:border-r-0 transition-colors ${
                  !inMonth
                    ? 'bg-muted/20 text-muted-foreground/50'
                    : 'hover:bg-muted/30'
                } ${isSel ? 'bg-muted/50' : ''}`}
              >
                {/* Dia atual em destaque laranja (como no print) */}
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
        <h2 className="text-sm font-semibold mb-3">
          Dia {brDate(selected)}
        </h2>
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
                    {ev.type === 'Campo' ? 'DIA DE CAMPO' : ev.label.split(' · ')[0]}
                  </span>
                  <p className="text-xs font-semibold truncate">{ev.project.client_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {ev.project.code}
                    {ev.project.chef_name ? ` • ${ev.project.chef_name}` : ''}
                    {ev.project.city ? ` • ${ev.project.city}${ev.project.state ? `/${ev.project.state}` : ''}` : ''}
                  </p>
                </div>
                <Link href={`/projetos/${ev.project.id}`} className="shrink-0">
                  <Button variant="outline" size="sm">
                    Abrir
                  </Button>
                </Link>
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
    </div>
  );
}