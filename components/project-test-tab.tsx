'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Trash2, Sparkles, Users, FlaskConical } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Project, TestStaff, TestProduct } from '@/lib/types';
import { RESPONSIBLE_ROLES, CHEFS } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { maskPhone } from '@/lib/format';

const CATEGORY_OPTIONS = [
  'Frutas',
  'Legumes',
  'Verduras',
  'Empório',
  'Pudim',
  'Suco',
  'Oriental',
  'Mix',
  'Refeição',
  'Sobremesa',
];

const SEAL_OPTIONS = ['ATC', 'ATM', 'Comum', 'Tampa'];
const UNIT_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const METRIC_OPTIONS = ['Bom', 'Parcial', 'Ruim', 'Não Se Aplica'];
const FINAL_OPTIONS = ['Aprovado', 'Reprovado', 'Inválido', 'Parcial'];

interface TestTemplate {
  id: string;
  sector_name: string;
  product_name: string;
  category: string;
}

export function ProjectTestTab({
  projectId,
  project,
  testStaff,
  testProducts,
  onUpdate,
}: {
  projectId: string;
  project: Project | null;
  testStaff: TestStaff[];
  testProducts: TestProduct[];
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [loadingSector, setLoadingSector] = useState<string | null>(null);

  // Staff form state
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffCategory, setStaffCategory] = useState('');
  const [staffChef, setStaffChef] = useState('');
  const [addingStaff, setAddingStaff] = useState(false);

  // Product manual add state
  const [newProdName, setNewProdName] = useState('');
  const [addingProd, setAddingProd] = useState(false);

  // Carregar templates do banco
  const loadTemplates = useCallback(async () => {
    const { data } = await supabase.from('test_templates').select('*');
    if (data) setTemplates(data);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Dashboard calculations
  const totalProducts = testProducts.length;
  const approvedCount = testProducts.filter((p) => p.final_status === 'Aprovado').length;
  const reprovedCount = testProducts.filter((p) => p.final_status === 'Reprovado').length;
  const invalidCount = testProducts.filter((p) => p.final_status === 'Inválido').length;
  const partialCount = testProducts.filter((p) => p.final_status === 'Parcial').length;
  const concludedCount = approvedCount + reprovedCount + invalidCount + partialCount;
  const completionPercentage = totalProducts > 0 ? Math.round((concludedCount / totalProducts) * 100) : 0;

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim()) return;
    setAddingStaff(true);

    const { error } = await supabase.from('test_staff').insert({
      project_id: projectId,
      name: staffName,
      role: staffRole || null,
      phone: staffPhone || null,
      category: staffCategory || null,
      chef_name: staffChef || null,
    });

    if (error) {
      toast({ title: 'Erro ao adicionar membro', description: error.message, variant: 'destructive' });
    } else {
      setStaffName('');
      setStaffRole('');
      setStaffPhone('');
      setStaffCategory('');
      setStaffChef('');
      onUpdate();
    }
    setAddingStaff(false);
  };

  const handleDeleteStaff = async (id: string) => {
    const { error } = await supabase.from('test_staff').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    } else {
      onUpdate();
    }
  };

  const loadSectorItems = async (sectorName: string) => {
    setLoadingSector(sectorName);
    const sectorTemplates = templates.filter((t) => t.sector_name === sectorName);

    if (sectorTemplates.length === 0) {
      toast({ title: 'Nenhum item encontrado', description: `Cadastre itens para o setor "${sectorName}" nas Configurações de Testes.`, variant: 'destructive' });
      setLoadingSector(null);
      return;
    }
    
    const rowsToInsert = sectorTemplates.map((item) => ({
      project_id: projectId,
      product_name: item.product_name,
      category: item.category,
      seal: 'ATC',
      unit: '1',
    }));

    const { error } = await supabase.from('test_products').insert(rowsToInsert);

    if (error) {
      toast({ title: 'Erro ao carregar insumos', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Insumos do setor carregados com sucesso!' });
      onUpdate();
    }
    setLoadingSector(null);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;
    setAddingProd(true);

    const { error } = await supabase.from('test_products').insert({
      project_id: projectId,
      product_name: newProdName,
      category: 'Frutas',
      seal: 'ATC',
      unit: '1',
    });

    if (error) {
      toast({ title: 'Erro ao adicionar', description: error.message, variant: 'destructive' });
    } else {
      setNewProdName('');
      onUpdate();
    }
    setAddingProd(false);
  };

  const handleUpdateProduct = async (id: string, field: string, value: string) => {
    const { error } = await supabase
      .from('test_products')
      .update({ [field]: value })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } else {
      onUpdate();
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase.from('test_products').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    } else {
      onUpdate();
    }
  };

  const emporioCount = templates.filter((t) => t.sector_name === 'Empório').length;
  const vegetaisCount = templates.filter((t) => t.sector_name === 'Vegetais').length;
  const frutasCount = templates.filter((t) => t.sector_name === 'Frutas').length;

  return (
    <div className="space-y-6">
      {/* Equipe & Guardião */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-orange-500" />
            Equipe & Guardião no Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/40 p-3 rounded-lg border text-sm grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <span className="text-muted-foreground text-xs block">Guardião</span>
              <span className="font-medium">{project?.guardian_name || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">Cargo</span>
              <span className="font-medium">{project?.guardian_role || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">WhatsApp</span>
              <span className="font-medium">{project?.guardian_phone || '—'}</span>
            </div>
          </div>

          <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-2 items-end pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="Nome" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cargo</Label>
              <Select value={staffRole} onValueChange={setStaffRole}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {RESPONSIBLE_ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">WhatsApp</Label>
              <Input value={staffPhone} onChange={(e) => setStaffPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select value={staffCategory} onValueChange={setStaffCategory}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Resp. Técnico</Label>
              <Select value={staffChef} onValueChange={setStaffChef}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {CHEFS.map((chef) => <SelectItem key={chef} value={chef}>{chef}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={addingStaff} className="bg-orange-500 hover:bg-orange-600 text-white">
              {addingStaff ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
            </Button>
          </form>

          {testStaff.length > 0 && (
            <div className="border rounded-md divide-y mt-2">
              {testStaff.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2.5 text-sm">
                  <div className="grid grid-cols-5 gap-4 flex-1">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground">{s.role || '—'}</span>
                    <span className="text-muted-foreground">{s.phone || '—'}</span>
                    <span className="text-muted-foreground">{s.category || '—'}</span>
                    <span className="text-muted-foreground">{s.chef_name || '—'}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteStaff(s.id)} className="h-8 w-8 text-muted-foreground hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Carga rápida por setor */}
      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-500" />
            Carregamento Rápido de Insumos Padrão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Clique nos botões abaixo para preencher automaticamente os produtos cadastrados nas Configurações de Testes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => loadSectorItems('Empório')}
              disabled={loadingSector !== null}
              className="border-orange-300 hover:bg-orange-100"
            >
              {loadingSector === 'Empório' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              📦 Carregar Setor Empório ({emporioCount} itens)
            </Button>
            <Button
              variant="outline"
              onClick={() => loadSectorItems('Vegetais')}
              disabled={loadingSector !== null}
              className="border-orange-300 hover:bg-orange-100"
            >
              {loadingSector === 'Vegetais' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              🥦 Carregar Setor Vegetais ({vegetaisCount} itens)
            </Button>
            <Button
              variant="outline"
              onClick={() => loadSectorItems('Frutas')}
              disabled={loadingSector !== null}
              className="border-orange-300 hover:bg-orange-100"
            >
              {loadingSector === 'Frutas' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              🍎 Carregar Setor Frutas ({frutasCount} itens)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Produtos & Dashboard */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-orange-500" />
            Produtos em Teste
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-card border rounded-lg p-3 shadow-sm">
              <span className="text-xs text-muted-foreground">Aprovados</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{approvedCount}</p>
            </div>
            <div className="bg-card border rounded-lg p-3 shadow-sm">
              <span className="text-xs text-muted-foreground">Reprovados</span>
              <p className="text-2xl font-bold text-red-600 mt-1">{reprovedCount}</p>
            </div>
            <div className="bg-card border rounded-lg p-3 shadow-sm">
              <span className="text-xs text-muted-foreground">Inválidos</span>
              <p className="text-2xl font-bold text-slate-600 mt-1">{invalidCount}</p>
            </div>
            <div className="bg-card border rounded-lg p-3 shadow-sm">
              <span className="text-xs text-muted-foreground">Parciais</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">{partialCount}</p>
            </div>
            <div className="bg-card border rounded-lg p-3 shadow-sm col-span-2 sm:col-span-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">% Conclusão</span>
                <span className="text-xs font-semibold">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${completionPercentage}%` }} />
              </div>
            </div>
          </div>

          <form onSubmit={handleAddProduct} className="flex gap-2 items-end pt-2">
            <div className="flex-1 space-y-1">
              <Input
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                placeholder="Adicionar novo produto manualmente..."
              />
            </div>
            <Button type="submit" disabled={addingProd} className="bg-orange-500 hover:bg-orange-600 text-white">
              {addingProd ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar Produto
            </Button>
          </form>

          <div className="border rounded-md overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs">
                <tr>
                  <th className="p-3 min-w-[200px]">Produto</th>
                  <th className="p-3 w-36">Cat.</th>
                  <th className="p-3 w-32">Selo</th>
                  <th className="p-3 w-24">Un</th>
                  <th className="p-3 w-32">D+3</th>
                  <th className="p-3 w-32">D+5</th>
                  <th className="p-3 w-32">D+7</th>
                  <th className="p-3 w-32">D+10</th>
                  <th className="p-3 w-32">Final</th>
                  <th className="p-3 min-w-[150px]">Observação</th>
                  <th className="p-3 w-16 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {testProducts.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-muted-foreground">
                      Nenhum produto cadastrado. Utilize os botões de carregamento rápido acima.
                    </td>
                  </tr>
                ) : (
                  testProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="p-2 font-medium">
                        <input
                          type="text"
                          value={p.product_name || ''}
                          onChange={(e) => handleUpdateProduct(p.id, 'product_name', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-primary rounded px-1"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={p.category || 'Frutas'}
                          onChange={(e) => handleUpdateProduct(p.id, 'category', e.target.value)}
                          className="text-xs p-1 border rounded bg-background w-full"
                        >
                          {CATEGORY_OPTIONS.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          value={p.seal || 'ATC'}
                          onChange={(e) => handleUpdateProduct(p.id, 'seal', e.target.value)}
                          className="text-xs p-1 border rounded bg-background w-full"
                        >
                          {SEAL_OPTIONS.map((seal) => (
                            <option key={seal} value={seal}>{seal}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          value={p.unit || '1'}
                          onChange={(e) => handleUpdateProduct(p.id, 'unit', e.target.value)}
                          className="text-xs p-1 border rounded bg-background w-full"
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                      {(['d3', 'd5', 'd7', 'd10'] as const).map((field) => (
                        <td key={field} className="p-2">
                          <select
                            value={p[field] || ''}
                            onChange={(e) => handleUpdateProduct(p.id, field, e.target.value)}
                            className="text-xs p-1 border rounded bg-background w-full"
                          >
                            <option value="">—</option>
                            {METRIC_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                      ))}
                      <td className="p-2">
                        <select
                          value={p.final_status || ''}
                          onChange={(e) => handleUpdateProduct(p.id, 'final_status', e.target.value)}
                          className="text-xs p-1 border rounded bg-background w-full font-medium"
                        >
                          <option value="">—</option>
                          {FINAL_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={p.observation || ''}
                          onChange={(e) => handleUpdateProduct(p.id, 'observation', e.target.value)}
                          placeholder="Obs..."
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-primary rounded px-1 text-xs"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteProduct(p.id)}
                          className="text-muted-foreground hover:text-red-600 h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}