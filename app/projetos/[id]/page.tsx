'use client';

import CwPackLogo from '@/assets/CwPack.png';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  ArrowLeft,
  Trash2,
  Loader2,
  Building2,
  FlaskConical,
  Truck,
  BarChart3,
  FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type {
  Project,
  ProjectResponsible,
  TestStaff,
  TestProduct,
  LogisticsItem,
  ProjectChecklistItem,
} from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/status-badges';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate, addDays } from '@/lib/format';
import { ProjectCadastroTab } from '@/components/project-cadastro-tab';
import { ProjectTestTab } from '@/components/project-test-tab';
import { ProjectChecklistTab } from '@/components/project-checklist-tab';
import { ProjectStatusTab } from '@/components/project-status-tab';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [responsibles, setResponsibles] = useState<ProjectResponsible[]>([]);
  const [testStaff, setTestStaff] = useState<TestStaff[]>([]);
  const [testProducts, setTestProducts] = useState<TestProduct[]>([]);
  const [logisticsItems, setLogisticsItems] = useState<LogisticsItem[]>([]);
  const [checklistItems, setChecklistItems] = useState<ProjectChecklistItem[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState('cadastro');
  const projectId = params.id as string;

  const loadData = useCallback(async () => {
    const [projRes, respRes, staffRes, testRes, logRes, checkRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
      supabase.from('project_responsibles').select('*').eq('project_id', projectId).order('created_at'),
      supabase.from('test_staff').select('*').eq('project_id', projectId).order('created_at'),
      supabase.from('test_products').select('*').eq('project_id', projectId).order('created_at'),
      supabase.from('logistics_items').select('*').eq('project_id', projectId).order('created_at'),
      supabase.from('project_checklists').select('*').eq('project_id', projectId).order('created_at'),
    ]);
    setProject(projRes.data as Project | null);
    setResponsibles(respRes.data || []);
    setTestStaff(staffRes.data || []);
    setTestProducts(testRes.data || []);
    setLogisticsItems(logRes.data || []);
    setChecklistItems(checkRes.data || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.')) return;
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Projeto excluído' });
      router.push('/projetos');
    }
  };

  const handleGeneratePDF = async () => {
    if (!project) return;
    setGeneratingPdf(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { ProjectReportPdf } = await import('@/components/project-report-pdf');
      const logoUrl = CwPackLogo.src;

      const blob = await pdf(
        <ProjectReportPdf project={project} responsibles={responsibles} logoUrl={logoUrl} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Resumo_Projeto_${project.code || 'Cliente'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({ title: 'Erro', description: 'Não foi possível gerar o PDF.', variant: 'destructive' });
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground mb-4">Projeto não encontrado.</p>
        <Link href="/projetos" className={buttonVariants({ variant: 'outline' })}>
          Voltar para Projetos
        </Link>
      </div>
    );
  }

  const deadline = project.start_date ? addDays(new Date(project.start_date), 10) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/projetos" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">
                {project.client_name || 'Cliente não identificado'}
              </h1>
              {project.code && (
                <span className="text-sm text-muted-foreground font-mono bg-secondary px-2 py-0.5 rounded">
                  {project.code}
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {project.segment || '—'} • {project.city || '—'}/{project.state || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={project.status || 'Em Andamento'} />
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard label="Guardião" value={project.guardian_name || '—'} />
        <InfoCard label="Início" value={formatDate(project.start_date)} />
        <InfoCard label="Prazo Final (D+10)" value={deadline ? formatDate(deadline.toISOString()) : '—'} />
        <InfoCard label="Potencial Mensal" value={formatCurrency(project.monthly_potential)} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-3">
          <TabsList className="w-full sm:w-auto justify-start flex-wrap h-auto">
            <TabsTrigger value="cadastro" className="gap-1.5">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Cadastro</span>
            </TabsTrigger>
            <TabsTrigger value="testes" className="gap-1.5">
              <FlaskConical className="h-4 w-4" />
              <span className="hidden sm:inline">Testes</span>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="gap-1.5">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Checklist</span>
            </TabsTrigger>
            <TabsTrigger value="status" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Status</span>
            </TabsTrigger>
          </TabsList>
          {activeTab === 'cadastro' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePDF}
              disabled={generatingPdf}
              className="border-primary text-primary hover:bg-primary/10 gap-2"
            >
              {generatingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Gerar PDF do Projeto
            </Button>
          )}
        </div>

        <TabsContent value="cadastro">
          <ProjectCadastroTab project={project} responsibles={responsibles} onUpdate={loadData} />
        </TabsContent>
        <TabsContent value="testes">
          <ProjectTestTab
            projectId={projectId}
            project={project}
            testStaff={testStaff}
            testProducts={testProducts}
            onUpdate={loadData}
          />
        </TabsContent>
        <TabsContent value="checklist">
          <ProjectChecklistTab
            projectId={projectId}
            checklistItems={checklistItems}
            logisticsItems={logisticsItems}
            onUpdate={loadData}
          />
        </TabsContent>
        <TabsContent value="status">
          <ProjectStatusTab
            projectId={projectId}
            project={project}
            testProducts={testProducts}
            onUpdate={loadData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold mt-0.5 truncate">{value}</p>
      </CardContent>
    </Card>
  );
}