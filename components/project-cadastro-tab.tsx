'use client';

import { useState } from 'react';
import { Loader2, Plus, Trash2, Save, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Project, ProjectResponsible, YesNoUnknown } from '@/lib/types';
import { INTEREST_OPTIONS, RESPONSIBLE_ROLES } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { maskCNPJ, maskPhone, validateCNPJ } from '@/lib/format';
import { cn } from '@/lib/utils';

const yesNoUnknownOptions: YesNoUnknown[] = ['Sim', 'Não', 'Não Sabe'];
const SUL_STATES = ['PR', 'SC', 'RS'];
const SEGMENTS_CUSTOM = [
  'Supermercados',
  'Empório',
  'Hortifruti',
  'Conveniência',
  'Rotisseria',
  'Restaurantes/Delivery',
  'Hospitais',
  'Açougue',
  'Congelados',
  'Marmitas',
  'Panificação',
  'Indústria Alimentar',
  'Outros',
];
const EXTENDED_INTERESTS = [
  ...INTEREST_OPTIONS,
  'Robot Coupe',
  'Forno Combinado',
  'Massas',
  'Congelados',
];
const REQUESTER_ROLES = ['Representante', 'Chefs', 'Gerente', 'Proprietário'];

export function ProjectCadastroTab({
  project,
  responsibles,
  onUpdate,
}: {
  project: Project;
  responsibles: ProjectResponsible[];
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  // Dados do Cliente
  const [isExistingClient, setIsExistingClient] = useState<string>(
    project.is_existing_client ? 'Sim' : 'Não'
  );
  const [cnpj, setCnpj] = useState(project.cnpj || '');
  const [clientName, setClientName] = useState(project.client_name || '');
  const [city, setCity] = useState(project.city || '');
  const [state, setState] = useState(project.state || '');
  const [segment, setSegment] = useState(project.segment || '');
  const [interests, setInterests] = useState<string[]>(project.interests || []);
  const [needsSupplier, setNeedsSupplier] = useState<string>('');
  const [needsProduct, setNeedsProduct] = useState<string>('');
  const [isSameLocation, setIsSameLocation] = useState<boolean>(project.is_same_location ?? true);
  const [testLocationAddress, setTestLocationAddress] = useState(project.test_location_address || '');
  // Responsáveis
  const [guardianName, setGuardianName] = useState(project.guardian_name || '');
  const [guardianRole, setGuardianRole] = useState(project.guardian_role || '');
  const [guardianPhone, setGuardianPhone] = useState(project.guardian_phone || '');
  // Solicitante Responsável
  const [requesterName, setRequesterName] = useState(project.requester_name || '');
  const [requesterRole, setRequesterRole] = useState(project.requester_role || '');
  const [respRows, setRespRows] = useState(
    responsibles.length > 0
      ? responsibles.map((r) => ({ id: r.id, name: r.name || '', role: r.role || '', phone: r.phone || '' }))
      : [{ id: crypto.randomUUID(), name: '', role: '', phone: '' }]
  );
  // Infraestrutura
  const [hasCounter, setHasCounter] = useState<YesNoUnknown>((project.has_counter as YesNoUnknown) || 'Não Sabe');
  const [hasColdRoom, setHasColdRoom] = useState<YesNoUnknown>((project.has_cold_room as YesNoUnknown) || 'Não Sabe');
  const [hasClimateArea, setHasClimateArea] = useState<YesNoUnknown>((project.has_climate_area as YesNoUnknown) || 'Não Sabe');
  const [hasSealer, setHasSealer] = useState<YesNoUnknown>((project.has_sealer as YesNoUnknown) || 'Não Sabe');
  const [hasRobotCoupe, setHasRobotCoupe] = useState<YesNoUnknown>((project.has_robot_coupe as YesNoUnknown) || 'Não Sabe');
  const [hasCombiOven, setHasCombiOven] = useState<YesNoUnknown>((project.has_combi_oven as YesNoUnknown) || 'Não Sabe');
  const [hasBlastFreezer, setHasBlastFreezer] = useState<YesNoUnknown>((project.has_blast_freezer as YesNoUnknown) || 'Não Sabe');
  const [has220vBiphasic, setHas220vBiphasic] = useState<YesNoUnknown>((project.has_220v_biphasic as YesNoUnknown) || 'Não Sabe');
  const [has220vThreePhase, setHas220vThreePhase] = useState<YesNoUnknown>((project.has_220v_three_phase as YesNoUnknown) || 'Não Sabe');
  const [infrastructureNotes, setInfrastructureNotes] = useState(
    (project.approval_observations || '').replace(/^Obs Infraestrutura:\s*/, '')
  );
  // Termos Comerciais e Expectativas
  const [monthlyConsumption, setMonthlyConsumption] = useState(project.monthly_consumption || '');
  const [suggestedDate, setSuggestedDate] = useState(project.suggested_date || '');
  const [projectExpectations, setProjectExpectations] = useState(project.justification || '');

  const toggleInterest = (value: string) => {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]
    );
  };
  const addRespRow = () => {
    setRespRows([...respRows, { id: crypto.randomUUID(), name: '', role: '', phone: '' }]);
  };
  const removeRespRow = (id: string) => {
    setRespRows(respRows.filter((r) => r.id !== id));
  };
  const updateRespRow = (id: string, field: 'name' | 'role' | 'phone', value: string) => {
    setRespRows(respRows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    if (!isExistingClient) {
      toast({ title: 'Campo obrigatório', description: 'Informe se já é cliente.', variant: 'destructive' });
      return;
    }
    if (!clientName.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe a razão social do cliente.', variant: 'destructive' });
      return;
    }
    if (isExistingClient === 'Não' && cnpj && !validateCNPJ(cnpj)) {
      toast({ title: 'CNPJ inválido', description: 'Verifique o CNPJ informado.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('projects').update({
      cnpj: isExistingClient === 'Não' ? cnpj || null : null,
      client_name: clientName,
      city,
      state,
      segment,
      interests: interests.length > 0 ? interests : null,
      is_same_location: isSameLocation,
      test_location_address: isSameLocation ? null : testLocationAddress,
      guardian_name: guardianName || null,
      guardian_role: guardianRole || null,
      guardian_phone: guardianPhone || null,
      requester_name: requesterName || null,
      requester_role: requesterRole || null,
      has_counter: hasCounter,
      has_cold_room: hasColdRoom,
      has_climate_area: hasClimateArea,
      has_sealer: hasSealer,
      has_robot_coupe: hasRobotCoupe,
      has_combi_oven: hasCombiOven,
      has_blast_freezer: hasBlastFreezer,
      has_220v_biphasic: has220vBiphasic,
      has_220v_three_phase: has220vThreePhase,
      monthly_consumption: monthlyConsumption || null,
      suggested_date: suggestedDate || null,
      approval_observations: infrastructureNotes ? `Obs Infraestrutura: ${infrastructureNotes}` : null,
      justification: projectExpectations || null,
      is_existing_client: isExistingClient === 'Sim',
      updated_at: new Date().toISOString(),
    }).eq('id', project.id);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      setSaving(false);
      return;
    }
    const existingIds = responsibles.map((r) => r.id);
    const keptIds = respRows.filter((r) => existingIds.includes(r.id)).map((r) => r.id);
    const deletedIds = existingIds.filter((id) => !keptIds.includes(id));
    if (deletedIds.length > 0) {
      await supabase.from('project_responsibles').delete().in('id', deletedIds);
    }
    for (const row of respRows) {
      if (!row.name.trim()) continue;
      if (existingIds.includes(row.id)) {
        await supabase.from('project_responsibles').update({
          name: row.name,
          role: row.role,
          phone: row.phone,
        }).eq('id', row.id);
      } else {
        await supabase.from('project_responsibles').insert({
          project_id: project.id,
          name: row.name,
          role: row.role,
          phone: row.phone,
        });
      }
    }
    toast({ title: 'Cadastro atualizado com sucesso!' });
    setSaving(false);
    onUpdate();
  };

  const infraFields: { label: string; value: YesNoUnknown; setter: (v: YesNoUnknown) => void }[] = [
    { label: 'Possui bancada/espaço para preparação?', value: hasCounter, setter: setHasCounter },
    { label: 'Possui câmara fria?', value: hasColdRoom, setter: setHasColdRoom },
    { label: 'Possui área de produção climatizada?', value: hasClimateArea, setter: setHasClimateArea },
    { label: 'Possui seladora?', value: hasSealer, setter: setHasSealer },
    { label: 'Possui processador/Robot Coupe? (Se necessário)', value: hasRobotCoupe, setter: setHasRobotCoupe },
    { label: 'Possui forno combinado? (Se necessário)', value: hasCombiOven, setter: setHasCombiOven },
    { label: 'Possui ultracongelador? (Se necessário)', value: hasBlastFreezer, setter: setHasBlastFreezer },
    { label: 'Possui tomada 220 V?', value: has220vBiphasic, setter: setHas220vBiphasic },
    { label: 'Possui tomada trifásica 220 V? (ATM)', value: has220vThreePhase, setter: setHas220vThreePhase },
  ];

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm sticky top-16 z-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Editar Projeto</h2>
          <p className="text-sm text-muted-foreground">Atualize as informações do cliente e do projeto</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white shadow-md">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Projeto
        </Button>
      </div>

      {/* Dados do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">📂 Dados do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Já é cliente? *</Label>
            <Select value={isExistingClient} onValueChange={setIsExistingClient}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Sim">Sim</SelectItem>
                <SelectItem value="Não">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isExistingClient === 'Não' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" value={cnpj} onChange={(e) => setCnpj(maskCNPJ(e.target.value))} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientName">Razão Social / Nome do Cliente *</Label>
                <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome do cliente" />
              </div>
            </div>
          )}
          {isExistingClient === 'Sim' && (
            <div className="space-y-2">
              <Label htmlFor="clientNameSim">Nome do Cliente *</Label>
              <Input id="clientNameSim" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome do cliente" />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Endereço</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Endereço" />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {SUL_STATES.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Segmento de Atuação</Label>
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {SEGMENTS_CUSTOM.map((seg) => <SelectItem key={seg} value={seg}>{seg}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label>Precisa cadastrar fornecedor?</Label>
              <Select value={needsSupplier} onValueChange={setNeedsSupplier}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Precisa cadastrar produto?</Label>
              <Select value={needsProduct} onValueChange={setNeedsProduct}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t">
            <Label>Projetos de Interesse</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
              {EXTENDED_INTERESTS.map((opt) => {
                const checked = interests.includes(opt);
                return (
                  <label
                    key={opt}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-all',
                      checked
                        ? 'border-primary bg-primary/10 font-medium'
                        : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-secondary/60'
                    )}
                  >
                    <Checkbox id={`interest-${opt}`} checked={checked} onCheckedChange={() => toggleInterest(opt)} />
                    <span className="truncate">{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t">
            <Label>O local do teste é o mesmo endereço do cliente?</Label>
            <div className="flex gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="isSameLoc" checked={isSameLocation} onChange={() => setIsSameLocation(true)} className="text-orange-500" />
                <span className="text-sm">Sim</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="isSameLoc" checked={!isSameLocation} onChange={() => setIsSameLocation(false)} className="text-orange-500" />
                <span className="text-sm">Não</span>
              </label>
            </div>
          </div>
          {!isSameLocation && (
            <div className="space-y-2">
              <Label htmlFor="testLocationAddress">Endereço Completo do Local do Teste</Label>
              <Input
                id="testLocationAddress"
                value={testLocationAddress}
                onChange={(e) => setTestLocationAddress(e.target.value)}
                placeholder="Rua, número, bairro, cidade (Onde o chef deve ir)"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Responsáveis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">👥 Responsáveis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1. Solicitante Responsável */}
          <div className="pb-4 border-b">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Solicitante Responsável</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} placeholder="Nome do solicitante" />
              </div>
              <div className="space-y-2">
                <Label>Cargo/Função</Label>
                <Select value={requesterRole} onValueChange={setRequesterRole}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {REQUESTER_ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 2. Clientes (contatos no cliente) */}
          <div className="pb-4 border-b">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Clientes</h3>
            </div>
            <div className="space-y-3">
              {respRows.map((r, idx) => (
                <div key={r.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                  <div className="space-y-2">
                    <Label className={idx === 0 ? '' : 'md:invisible'}>Nome</Label>
                    <Input value={r.name} onChange={(e) => updateRespRow(r.id, 'name', e.target.value)} placeholder="Nome completo" />
                  </div>
                  <div className="space-y-2">
                    <Label className={idx === 0 ? '' : 'md:invisible'}>Cargo/Função</Label>
                    <Select value={r.role} onValueChange={(v) => updateRespRow(r.id, 'role', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {RESPONSIBLE_ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className={idx === 0 ? '' : 'md:invisible'}>WhatsApp/Telefone</Label>
                    <Input value={r.phone} onChange={(e) => updateRespRow(r.id, 'phone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeRespRow(r.id)} disabled={respRows.length === 1} className="mb-0.5">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addRespRow}>
                <Plus className="h-4 w-4 mr-2" />Adicionar Responsável
              </Button>
            </div>
          </div>

          {/* 3. Guardião no Cliente */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Guardião no Cliente (Responsável por acompanhar as validações)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nome Completo do Guardião</Label>
                <Input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} placeholder="Nome do guardião" />
              </div>
              <div className="space-y-2">
                <Label>Cargo/Função</Label>
                <Select value={guardianRole} onValueChange={setGuardianRole}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {RESPONSIBLE_ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>WhatsApp do Guardião</Label>
                <Input value={guardianPhone} onChange={(e) => setGuardianPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Infraestrutura */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">⚙️ Infraestrutura do Cliente (Checklist Obrigatório)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {infraFields.map((f) => (
            <div key={f.label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <span className="text-sm font-medium">{f.label}</span>
              <div className="flex gap-1.5">
                {yesNoUnknownOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => f.setter(opt)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-md text-xs font-medium transition-all border',
                      f.value === opt
                        ? opt === 'Sim'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                          : opt === 'Não'
                            ? 'bg-red-100 text-red-700 border-red-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80 border-transparent'
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="infrastructureNotes">Observações sobre a infraestrutura</Label>
            <Textarea
              id="infrastructureNotes"
              value={infrastructureNotes}
              onChange={(e) => setInfrastructureNotes(e.target.value)}
              placeholder="Insira detalhes ou observações relevantes sobre a infraestrutura do cliente..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Termos Comerciais e Expectativas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">🤝 Termos Comerciais e Expectativas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Média de Consumo Mensal (Potencial)</Label>
              <Select value={monthlyConsumption} onValueChange={setMonthlyConsumption}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="R$ 0 – R$ 3.000">R$ 0 – R$ 3.000</SelectItem>
                  <SelectItem value="R$ 3.001 – R$ 5.000">R$ 3.001 – R$ 5.000</SelectItem>
                  <SelectItem value="R$ 5.001 – R$ 10.000">R$ 5.001 – R$ 10.000</SelectItem>
                  <SelectItem value="R$ 10.001 – R$ 20.000">R$ 10.001 – R$ 20.000</SelectItem>
                  <SelectItem value="R$ 20.001 – R$ 50.000">R$ 20.001 – R$ 50.000</SelectItem>
                  <SelectItem value="Acima de R$ 50.000">Acima de R$ 50.000</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Sugerida Para Realização do Projeto?</Label>
              <Input value={suggestedDate} onChange={(e) => setSuggestedDate(e.target.value)} placeholder="Ex: Outubro/2026 ou 15/10/2026" />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <Label className="text-sm font-semibold">
              Resuma as expectativas dos projetos e quais técnicas/embalagens querem implementar:
            </Label>
            <Textarea
              value={projectExpectations}
              onChange={(e) => setProjectExpectations(e.target.value)}
              placeholder="Descreva detalhadamente as expectativas do cliente e quais técnicas ou embalagens pretendem implementar..."
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bottom save button */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSave} disabled={saving} size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Projeto
        </Button>
      </div>
    </div>
  );
}