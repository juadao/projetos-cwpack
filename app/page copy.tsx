'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Truck, ArrowRight, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Project, ProjectChecklistItem } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';

export default function ChecklistsPage() {
  const [data, setData] = useState<{ project: Project; items: ProjectChecklistItem[] }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [projRes, itemsRes] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('project_checklists').select('*').order('created_at'),
    ]);
    const projects = (projRes.data || []) as Project[];
    const items = (itemsRes.data || []) as ProjectChecklistItem[];

    const combined = projects
      .map((p) => ({
        project: p,
        items: items.filter((i) => i.project_id === p.id),
      }))
      .filter(({ items }) => items.some((i) => !i.completed));

    setData(combined);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-pulse text-muted-foreground">Carregando...</div></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Checklists Logísticos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Central de alertas — apenas projetos com itens pendentes
        </p>
      </div>

      {data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Truck className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Nenhum projeto com pendências. Todos os checklists estão concluídos!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map(({ project, items }) => {
            const pending = items.filter((i) => !i.completed).length;
            const completed = items.length - pending;
            const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

            return (
              <Link
                key={project.id}
                href={`/projetos/${project.id}`}
                className="block p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{project.client_name || 'Cliente não identificado'}</p>
                      <p className="text-xs text-muted-foreground">
                        {pending} pendente(s) • {completed} concluído(s) de {items.length}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-24">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
                      <span className="text-xs text-muted-foreground mt-0.5 block">{pct}%</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
                  {items.filter((i) => !i.completed).slice(0, 5).map((item) => (
                    <span key={item.id} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-0.5">
                      {item.item_name}
                    </span>
                  ))}
                  {pending > 5 && <span className="text-xs text-muted-foreground">+{pending - 5} mais</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
