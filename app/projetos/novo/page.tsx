'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  Settings2,
  Handshake,
  Plus,
  Trash2,
  Save,
  Loader2,
  UserCog,
  UserPlus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import {
  INTEREST_OPTIONS,
  RESPONSIBLE_ROLES,
  type YesNoUnknown,
} from '@/lib/types';
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

interface Responsible {
  id: string;
  name: string;
  role: string;
  phone: string;
}

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

export default function NewProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('A');
  // Section A — Client data
  const [isExistingClient, setIsExistingClient] = useState<string>(''); // 'Sim' or 'Não'
  const [cnpj, setCnpj] = useState('');
  const [clientName, setClientName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [segment, setSegment] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [needsSupplier, setNeedsSupplier] = useState<string>(''); // 'Sim' or 'Não'
  const [needsProduct, setNeedsProduct] = useState<string>(''); // 'Sim' or 'Não'
  const [isSameLocation, setIsSameLocation] = useState(true);
  const [testLocationAddress, setTestLocationAddress] = useState('');
  // Section B — Responsibles
  const [responsibles, setResponsibles] = useState<Responsible[]>([
    { id: crypto.randomUUID(), name: '', role: '', phone: '' },
  ]);
  const [guardianName, setGuardianName] = useState('');
  const [guardianRole, setGuardianRole] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  // Solicitante Responsável
  const [requesterName, setRequesterName] = useState('');
  const [requesterRole, setRequesterRole] = useState('');
  // Section C — Infrastructure
  const [hasCounter, setHasCounter] = useState<YesNoUnknown | ''>('');
  const [hasColdRoom, setHasColdRoom] = useState<YesNoUnknown | ''>('');
  const [hasClimateArea, setHasClimateArea] = useState<YesNoUnknown | ''>('');
  const [hasSealer, setHasSealer] = useState<YesNoUnknown | ''>('');
  const [hasRobotCoupe, setHasRobotCoupe] = useState<YesNoUnknown | ''>('');
  const [hasCombiOven, setHasCombiOven] = useState<YesNoUnknown | ''>('');
  const [hasBlastFreezer, setHasBlastFreezer] = useState<YesNoUnknown | ''>('');
  const [has220vBiphasic, setHas220vBiphasic] = useState<YesNoUnknown | ''>('');
  const [has220vThreePhase, setHas220vThreePhase] = useState<YesNoUnknown | ''>('');
  const [infrastructureNotes, setInfrastructureNotes] = useState('');
  // Section D — Commercial terms & Strategy
  const [monthlyConsumption, setMonthlyConsumption] = useState('');
  const [suggestedDate, setSuggestedDate] = useState('');
  const [projectExpectations, setProjectExpectations] = useState('');

  const toggleInterest = (value: string) => {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]
    );
  };
  const addResponsible = () => {
    setResponsibles([...responsibles, { id: crypto.randomUUID(), name: '', role: '', phone: '' }]);
  };
  const removeResponsible = (id: string) => {
    setResponsibles(responsibles.filter((r) => r.id !== id));
  };
  const updateResponsible = (id: string, field: keyof Responsible, value: string) => {
    setResponsibles(responsibles.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    if (!isExistingClient) {
      toast({ title: 'Campo obrigatório', description: 'Informe se já é cliente.', variant: 'destructive' });
      setActiveSection('A');
      return;
    }
    if (!clientName.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe o nome do cliente.', variant: 'destructive' });
      setActiveSection('A');
      return;
    }
    if (isExistingClient === 'Não' && cnpj && !validateCNPJ(cnpj)) {
      toast({ title: 'CNPJ inválido', description: 'Verifique o CNPJ informado.', variant: 'destructive' });
      setActiveSection('A');
      return;
    }
    if (
      !hasCounter ||
      !hasColdRoom ||
      !hasClimateArea ||
      !hasSealer ||
      !hasRobotCoupe ||
      !hasCombiOven ||
      !hasBlastFreezer ||
      !has220vBiphasic ||
      !has220vThreePhase
    ) {
      toast({
        title: 'Infraestrutura incompleta',
        description: 'Por favor, responda a todas as perguntas da aba Infraestrutura antes de salvar.',
        variant: 'destructive',
      });
      setActiveSection('C');
      return;
    }
    setSaving(true);
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          user_id: profile?.user_id || user?.id,
          cnpj: isExistingClient === 'Não' ? cnpj || null : null,
          client_name: clientName,
          city,
          state,
          is_same_location: isSameLocation,
          test_location_address: isSameLocation ? null : testLocationAddress,
          segment,
          interests: interests.length > 0 ? interests : null,
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
          status: 'Em Andamento',
          pipeline_status: 'Solicitação Recebida',
        })
        .select()
        .single();
      if (error) throw error;

      const validResponsibles = responsibles.filter((r) => r.name.trim());
      if (validResponsibles.length > 0 && project) {
        const { error: responsiblesError } = await supabase.from('project_responsibles').insert(
          validResponsibles.map((r) => ({
            project_id: project.id,
            name: r.name,
            role: r.role,
            phone: r.phone,
          }))
        );
        if (responsiblesError) throw new Error(responsiblesError.message);
      }

      toast({ title: 'Projeto criado!', description: `Código: ${project.code}` });
      router.push(`/projetos/${project.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Não foi possível salvar o projeto.';
      toast({
        title: 'Erro ao salvar',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'A', label: 'Dados do Cliente', icon: Building2 },
    { id: 'B', label: 'Responsáveis', icon: Users },
    { id: 'C', label: 'Infraestrutura', icon: Settings2 },
    { id: 'D', label: 'Termos Comerciais', icon: Handshake },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Projeto</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastro inicial de cliente e projeto de validação
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Projeto
          </Button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => {
          const Icon = s.icon;
          const active = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.id}</span>
            </button>
          );
        })}
      </div>

      {/* Section A — Client Data */}
      {activeSection === 'A' && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Dados do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Já é cliente? *</Label>
              <Select value={isExistingClient} onValueChange={setIsExistingClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isExistingClient && (
              <div className="space-y-4 animate-fade-in pt-2">
                {isExistingClient === 'Não' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        value={cnpj}
                        onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientName">Razão Social / Nome do Cliente *</Label>
                      <Input
                        id="clientName"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Nome do cliente"
                      />
                    </div>
                  </div>
                )}
                {isExistingClient === 'Sim' && (
                  <div className="space-y-2">
                    <Label htmlFor="clientNameSim">Nome do Cliente *</Label>
                    <Input
                      id="clientNameSim"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Nome do cliente"
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Endereço</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Endereço"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado </Label>
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger id="state">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SUL_STATES.map((uf) => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="segment">Segmento de Atuação</Label>
                    <Select value={segment} onValueChange={setSegment}>
                      <SelectTrigger id="segment">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SEGMENTS_CUSTOM.map((seg) => (
                          <SelectItem key={seg} value={seg}>{seg}</SelectItem>
                        ))}
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
                <div className="space-y-2 border-t pt-4 mt-2">
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
                          <Checkbox
                            id={`interest-${opt}`}
                            checked={checked}
                            onCheckedChange={() => toggleInterest(opt)}
                          />
                          <span className="truncate">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2 border-t pt-4 mt-2">
                  <Label>O local do teste é o mesmo endereço do cliente?</Label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sameLocation"
                        checked={isSameLocation}
                        onChange={() => setIsSameLocation(true)}
                        className="text-primary"
                      />
                      <span className="text-sm">Sim</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sameLocation"
                        checked={!isSameLocation}
                        onChange={() => setIsSameLocation(false)}
                        className="text-primary"
                      />
                      <span className="text-sm">Não</span>
                    </label>
                  </div>
                </div>
                {!isSameLocation && (
                  <div className="space-y-2 animate-fade-in">
                    <Label htmlFor="testLocationAddress">Endereço Completo do Local do Teste</Label>
                    <Input
                      id="testLocationAddress"
                      value={testLocationAddress}
                      onChange={(e) => setTestLocationAddress(e.target.value)}
                      placeholder="Rua, número, bairro, cidade (Onde o chef deve ir)"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section B — Responsáveis */}
      {activeSection === 'B' && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Responsáveis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 1. Solicitante Responsável */}
            <div className="pt-4 border-b pb-4">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Solicitante Responsável</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requesterName">Nome</Label>
                  <Input
                    id="requesterName"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="Nome do solicitante"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo/Função</Label>
                  <Select value={requesterRole} onValueChange={setRequesterRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {REQUESTER_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 2. Clientes */}
            <div className="border-b pb-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Clientes</h3>
              </div>
              <div className="space-y-2">
                {responsibles.map((r, idx) => (
                  <div key={r.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                    <div className="space-y-2">
                      <Label htmlFor={`resp-name-${idx}`} className={idx === 0 ? '' : 'md:invisible'}>Nome</Label>
                      <Input
                        id={`resp-name-${idx}`}
                        value={r.name}
                        onChange={(e) => updateResponsible(r.id, 'name', e.target.value)}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`resp-role-${idx}`} className={idx === 0 ? '' : 'md:invisible'}>Cargo/Função</Label>
                      <Select value={r.role} onValueChange={(v) => updateResponsible(r.id, 'role', v)}>
                        <SelectTrigger id={`resp-role-${idx}`}>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {RESPONSIBLE_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`resp-phone-${idx}`} className={idx === 0 ? '' : 'md:invisible'}>WhatsApp/Telefone</Label>
                      <Input
                        id={`resp-phone-${idx}`}
                        value={r.phone}
                        onChange={(e) => updateResponsible(r.id, 'phone', maskPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeResponsible(r.id)}
                      disabled={responsibles.length === 1}
                      className="mb-0.5"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addResponsible}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Responsável
                </Button>
              </div>
            </div>

            {/* 3. Guardião no Cliente */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <UserCog className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Guardião no Cliente (Responsável por acompanhar as validações)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guardianName">Nome Completo do Guardião</Label>
                  <Input
                    id="guardianName"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="Nome do guardião"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardianRole">Cargo/Função</Label>
                  <Select value={guardianRole} onValueChange={setGuardianRole}>
                    <SelectTrigger id="guardianRole">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {RESPONSIBLE_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardianPhone">WhatsApp do Guardião</Label>
                  <Input
                    id="guardianPhone"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(maskPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section C — Infrastructure */}
      {activeSection === 'C' && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Infraestrutura do Cliente (Checklist Obrigatório)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <InfraRow label="Possui bancada/espaço para preparação?" value={hasCounter} onChange={setHasCounter} />
              <InfraRow label="Possui câmara fria?" value={hasColdRoom} onChange={setHasColdRoom} />
              <InfraRow label="Possui área de produção climatizada?" value={hasClimateArea} onChange={setHasClimateArea} />
              <InfraRow label="Possui seladora?" value={hasSealer} onChange={setHasSealer} />
              <InfraRow label="Possui processador/Robot Coupe? (Se necessário)" value={hasRobotCoupe} onChange={setHasRobotCoupe} />
              <InfraRow label="Possui forno combinado? (Se necessário)" value={hasCombiOven} onChange={setHasCombiOven} />
              <InfraRow label="Possui ultracongelador? (Se necessário)" value={hasBlastFreezer} onChange={setHasBlastFreezer} />
              <InfraRow label="Possui tomada 220 V?" value={has220vBiphasic} onChange={setHas220vBiphasic} />
              <InfraRow label="Possui tomada trifásica 220 V? (ATM)" value={has220vThreePhase} onChange={setHas220vThreePhase} />
            </div>
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
      )}

      {/* Section D — Commercial Terms / Expectations */}
      {activeSection === 'D' && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Handshake className="h-5 w-5 text-primary" />
              Termos Comerciais e Expectativas
            </CardTitle>
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
                <Label htmlFor="suggestedDate">Data Sugerida Para Realização do Projeto?</Label>
                <Input
                  id="suggestedDate"
                  value={suggestedDate}
                  onChange={(e) => setSuggestedDate(e.target.value)}
                  placeholder="Ex: Outubro/2026 ou 15/10/2026"
                />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <Label htmlFor="projectExpectations" className="text-sm font-semibold">
                Resuma as expectativas dos projetos e quais técnicas/embalagens querem implementar:
              </Label>
              <Textarea
                id="projectExpectations"
                value={projectExpectations}
                onChange={(e) => setProjectExpectations(e.target.value)}
                placeholder="Descreva detalhadamente as expectativas do cliente e quais técnicas ou embalagens pretendem implementar..."
                rows={5}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            const idx = sections.findIndex((s) => s.id === activeSection);
            if (idx > 0) setActiveSection(sections[idx - 1].id);
          }}
          disabled={activeSection === 'A'}
        >
          Anterior
        </Button>
        {activeSection === 'D' ? (
          <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Projeto
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => {
              const idx = sections.findIndex((s) => s.id === activeSection);
              if (idx < sections.length - 1) setActiveSection(sections[idx + 1].id);
            }}
          >
            Próximo
          </Button>
        )}
      </div>
    </div>
  );
}

function InfraRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: YesNoUnknown | '';
  onChange: (v: YesNoUnknown) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1.5">
        {yesNoUnknownOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              value === opt
                ? opt === 'Sim'
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : opt === 'Não'
                    ? 'bg-red-100 text-red-700 border border-red-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80 border border-transparent'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}