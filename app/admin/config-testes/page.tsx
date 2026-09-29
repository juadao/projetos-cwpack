'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plus, Trash2, Settings, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface TestTemplate {
  id: string;
  sector_name: string;
  product_name: string;
  category: string;
}

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
  'Açougue',
];

export default function ConfigTestesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  
  // Form state
  const [sectorName, setSectorName] = useState('Empório');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('Empório');
  const [adding, setAdding] = useState(false);

  const loadTemplates = useCallback(async () => {
    const { data, error } = await supabase.from('test_templates').select('*').order('product_name');
    if (error) {
      toast({ title: 'Erro ao carregar templates', description: error.message, variant: 'destructive' });
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !sectorName.trim()) return;
    setAdding(true);

    const { error } = await supabase.from('test_templates').insert({
      sector_name: sectorName.trim(),
      product_name: productName.trim(),
      category: category,
    });

    if (error) {
      toast({ title: 'Erro ao cadastrar item', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Item adicionado ao template com sucesso!' });
      setProductName('');
      loadTemplates();
    }
    setAdding(false);
  };

  const handleDeleteTemplate = async (id: string) => {
    const { error } = await supabase.from('test_templates').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      loadTemplates();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Descobre todos os setores cadastrados dinamicamente + os padrões
  const dynamicSectors = Array.from(new Set([...templates.map((t) => t.sector_name), 'Empório', 'Vegetais', 'Frutas']));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/projetos"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-orange-500" />
            Configurações de Testes (Templates)
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie e crie novos setores e insumos padrão para o carregamento rápido dos testes.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar Novo Item ao Template</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTemplate} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr_auto] gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Setor / Botão (Ex: Açougue)</Label>
              <Input
                value={sectorName}
                onChange={(e) => setSectorName(e.target.value)}
                placeholder="Ex: Açougue"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nome do Produto</Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: Picanha Bovina"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria Padrão</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={adding} className="bg-orange-500 hover:bg-orange-600 text-white">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {dynamicSectors.map((sec) => {
          const items = templates.filter((t) => t.sector_name === sec);
          return (
            <Card key={sec} className="flex flex-col">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex justify-between items-center">
                  <span>📦 {sec}</span>
                  <span className="text-xs font-normal bg-secondary px-2 py-0.5 rounded-full">
                    {items.length} itens
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4">
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Nenhum item cadastrado neste setor.</p>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded border bg-card text-sm">
                        <div>
                          <p className="font-medium text-xs">{item.product_name}</p>
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {item.category}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTemplate(item.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}