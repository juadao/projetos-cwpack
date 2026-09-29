'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Package, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Project, TestProduct } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/status-badges';
import { formatDate } from '@/lib/format';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [testCounts, setTestCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = useCallback(async () => {
    const [projRes, testRes] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('test_products').select('project_id'),
    ]);
    setProjects(projRes.data || []);
    const counts: Record<string, number> = {};
    (testRes.data || []).forEach((t: { project_id: string }) => {
      counts[t.project_id] = (counts[t.project_id] || 0) + 1;
    });
    setTestCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = projects.filter((p) => {
    const matchesSearch =
      !search ||
      p.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase()) ||
      p.cnpj?.includes(search);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Carregando projetos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {projects.length} projeto(s) cadastrado(s)
          </p>
        </div>
        <Button asChild>
          <Link href="/projetos/novo">
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, código, CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Todos os Status</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Em Negociação">Em Negociação</option>
              <option value="Concluído">Concluído</option>
              <option value="Pausado">Pausado</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Reprovado">Reprovado</option>
              <option value="Encerrado">Encerrado</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">
                {projects.length === 0 ? 'Nenhum projeto cadastrado.' : 'Nenhum projeto encontrado.'}
              </p>
              <Button asChild variant="outline">
                <Link href="/projetos/novo">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Projeto
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((project) => (
                <Link
                  key={project.id}
                  href={`/projetos/${project.id}`}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">
                        {project.client_name || 'Cliente não identificado'}
                      </span>
                      {project.code && (
                        <span className="text-xs text-muted-foreground font-mono">{project.code}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{project.segment || '—'}</span>
                      <span>•</span>
                      <span>{project.city || '—'}/{project.state || '—'}</span>
                      <span>•</span>
                      <span>{testCounts[project.id] || 0} testes</span>
                    </div>
                  </div>
                  <div className="hidden sm:block shrink-0">
                    <StatusBadge status={project.status || 'Em Andamento'} />
                  </div>
                  <span className="hidden md:block text-xs text-muted-foreground shrink-0">
                    {formatDate(project.start_date)}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
