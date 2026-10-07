export type YesNoUnknown = 'Sim' | 'Não' | 'Não Sabe';
export type Evaluation = 'Bom' | 'Parcial' | 'Ruim' | 'Não Se Aplica' | '';
export type FinalResult = 'Aprovado' | 'Reprovado' | 'Inválido' | 'Parcial' | '';

export type ProjectStatus =
  | 'Em Andamento'
  | 'Concluído'
  | 'Pausado'
  | 'Aprovado'
  | 'Reprovado'
  | 'Em Negociação'
  | 'Encerrado';

export type ApprovalStatus = 'Sim' | 'Não' | 'Pendente';
export type SalesChance = 'Alto' | 'Médio' | 'Baixo';
export type TicketSize = '< de R$3.000' | '> de R$3.000' | '> de R$5.000' | '> de R$10.000' | '> de R$20.000' | '> de R$50.000';
export type KnowledgeLevel = 'Nenhum' | 'Básico' | 'Intermediário' | 'Avançado';
export type ChecklistStatus = 'Ok / Pronto para o Teste' | 'Em Andamento' | 'Atrasado / Pendente' | 'Não se faz necessário';
export type ProductCategory = 'FLV' | 'Fruta' | 'Legume' | 'Suco' | 'Mix' | 'Açougue' | 'Outro';

export const SEGMENTS = ['Supermercados', 'Empório', 'Hortifruti', 'Conveniência', 'Rotisseria', 'Restaurantes/Delivery', 'Hospitais', 'Açougue', 'Congelados', 'Marmitas', 'Panificação', 'Indústria Alimentar', 'Outros'] as const;

export const INTEREST_OPTIONS = ['FLV', 'Açougue', 'Pudim', 'Rotisseria', 'Restaurant/Delivery', 'Orientais', 'Sobremesa', 'Panificadora', 'Empório', 'Conveniência', 'Hospital'] as const;

export const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SE', 'TO',
] as const;

export const RESPONSIBLE_ROLES = [
  'Gerente Geral', 'Cozinheira', 'Gerente de Operação', 'Repositor', 'Financeiro/Compra', 'Encarregado', 'Proprietário', 'Outros',
] as const;

export const CHEFS = ['Chef Manu', 'Chef Jonathan', 'Julia', 'Ewerton', 'Luana', 'Juliana'] as const;
export const LOGISTICS_RESPONSIBLES = ['Julia', 'Ewerton', 'Chefs', 'Representante', 'Luana', 'Juliana'] as const;

export const LOGISTICS_ACTIONS = [
  'Separar e Pegar no CD', 'Checar e Separar no CD', 'Comprar em Fornecedor', 'Comprar em Hortifruti',
  'Enviar para Equipe', 'WhatsApp', 'Reserva de Hotel',
] as const;

export const DEFAULT_LOGISTICS_ITEMS = [
  'Embalagens', 'Selos', 'Seladora', 'Gabaritos', 'Cilindro de Gás',
  'Materiais (Facas, Tábuas, etc.)', 'Carnes/Proteínas', 'Frutas/FLV',
  'Material Didático', 'Criação de Grupo WhatsApp', 'Reserva de Hotel',
] as const;

export const PRODUCT_SUGGESTIONS = [
  'Abóbora Picada', 'Abobrinha Ondulada', 'Beterraba Ralada', 'Cenoura Ondulada', 'Coco Seco',
  'Mamão Formosa', 'Manga', 'Melancia', 'Melão Picado', 'Mix de Alfaces', 'Morango',
  'Pimentão Fatiado', 'Repolho Roxo/Verde', 'Salada de Frutas', 'Seleta de Legumes',
  'Uva Verde/Vitoria', 'Açaí', 'Cheiro Verde', 'Kiwi', 'Mirtilo', 'Sucos diversos',
] as const;

// ===== Fluxo Operacional das Etapas (5 etapas) =====
export type PipelineStatus =
  | 'Solicitados'
  | 'Análise e Operacional'
  | 'Comercial'
  | 'Fidelizados'
  | 'Perdidos';

export interface PipelineStageMeta {
  status: PipelineStatus;
  label: string;
  description: string;
  color: string;
}

export const PIPELINE_STAGES: PipelineStageMeta[] = [
  { status: 'Solicitados', label: 'Solicitados', description: 'Representante faz a requisição no sistema.', color: '#38bdf8' },
  { status: 'Análise e Operacional', label: 'Análise e Operacional', description: 'Viabilidade, planejamento, preparação, agendamento e execução em campo.', color: '#8b5cf6' },
  { status: 'Comercial', label: 'Comercial', description: 'Negociação, comodato e faturamentos após o teste.', color: '#f59e0b' },
  { status: 'Fidelizados', label: 'Fidelizados', description: 'Clientes ativos com operação contínua.', color: '#22c55e' },
  { status: 'Perdidos', label: 'Perdidos', description: 'Oportunidades não convertidas.', color: '#ef4444' },
];

export const PIPELINE_STATUSES: PipelineStatus[] = PIPELINE_STAGES.map((s) => s.status);

// Tipos de projeto (select "Projeto") — presentes em todas as etapas
export const PROJECT_TYPES = ['ATC', 'ATM', 'Reteste', 'Treinamento', 'Implementação'] as const;

// Opções do select "Status" por etapa
export const STATUS_BY_STAGE: Record<PipelineStatus, string[]> = {
  Solicitados: [],
  'Análise e Operacional': ['Reunião', 'Preparação Op.', 'Agendado', 'Adiado', 'Em Campo', 'Teste Aprovado', 'Teste Reprovado'],
  Comercial: ['Negociação', 'Comodato', 'Faturamento 1', 'Faturamento 2', 'Faturamento 3', 'Recusado', 'Stand-by'],
  Fidelizados: ['Negociação', 'Comodato', 'Faturamento 1', 'Faturamento 2', 'Faturamento 3', 'Recusado', 'Stand-by'],
  Perdidos: ['Negociação', 'Comodato', 'Faturamento 1', 'Faturamento 2', 'Faturamento 3', 'Recusado', 'Stand-by'],
};

export interface Project {
  id: string;
  code: string | null;
  cnpj: string | null;
  client_name: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  segment: string | null;
  interests: string[] | null;
  initial_project: string | null;
  guardian_name: string | null;
  guardian_role: string | null;
  guardian_phone: string | null;
  requester_name: string | null;
  requester_role: string | null;
  project_type: string | null;
  flow_status: string | null;
  has_sealer: string | null;
  has_cold_room: string | null;
  has_refrigeration: string | null;
  has_220v_biphasic: string | null;
  has_220v_three_phase: string | null;
  has_counter: string | null;
  has_sanitary: string | null;
  sales_chance: string | null;
  ticket_size: string | null;
  monthly_potential: number | null;
  is_existing_client: boolean | null;
  is_same_location: boolean | null;
  pain_summary: string | null;
  knowledge_level: string | null;
  what_to_present: string | null;
  what_client_has: string | null;
  justification: string | null;
  recommended_mix: string | null;
  chef_id: string | null;
  chef_name: string | null;
  approval_status: string | null;
  alignment_meeting_at: string | null;
  alignment_meeting_link: string | null;
  project_presented: boolean | null;
  project_doc_name: string | null;
  methodology_presented: boolean | null;
  client_aware_obligations: boolean | null;
  start_date: string | null;
  status: string | null;
  rep_at_final: boolean | null;
  rep_responsible: string | null;
  results_meeting_at: string | null;
  final_status: string | null;
  monthly_volume_closed: number | null;
  monthly_qty_closed: number | null;
  result_observations: string | null;
  operational_cost: number | null;
  drive_link: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  pipeline_status: string | null;
  technical_report: string | null;
  visual_evidence_urls: string[] | null;
  sensory_checklist: Record<string, boolean> | null;
  shelf_life_days: number | null;
  profitability_pct: number | null;
  // Permite qualquer campo vindo do banco sem quebrar o build
  [key: string]: any;
}

export interface ProjectResponsible {
  id: string;
  project_id: string;
  name: string | null;
  role: string | null;
  phone: string | null;
  created_at: string;
  [key: string]: any;
}

export interface TestStaff {
  id: string;
  project_id: string;
  name: string | null;
  role: string | null;
  phone: string | null;
  test_category: string | null;
  technical_responsible: string | null;
  drive_link: string | null;
  created_at: string;
  [key: string]: any;
}

export interface TestProduct {
  id: string;
  project_id: string;
  did_test: boolean;
  product_name: string | null;
  category: string | null;
  seal: string | null;
  units: number | null;
  d3: string | null;
  d5: string | null;
  d7: string | null;
  d10: string | null;
  final_result: string | null;
  final_status: string | null;
  observation: string | null;
  photo_url: string | null;
  created_at: string;
  [key: string]: any;
}

export interface LogisticsItem {
  id: string;
  project_id: string;
  item_name: string | null;
  action: string | null;
  responsible: string | null;
  due_date: string | null;
  status: string | null;
  evidence_url: string | null;
  observation: string | null;
  created_at: string;
  [key: string]: any;
}

export interface ProjectChecklistItem {
  id: string;
  project_id: string;
  item_name: string;
  action: string | null;
  completed: boolean;
  created_at: string;
  [key: string]: any;
}

export const DEFAULT_CHECKLIST_ITEMS: { item_name: string; action: string }[] = [
  { item_name: 'Embalagens', action: 'Separar e Pegar no CD' },
  { item_name: 'Selos', action: 'Separar e Pegar no CD' },
  { item_name: 'Seladora', action: 'Checar e Separar no CD' },
  { item_name: 'Gabaritos', action: 'Checar e Separar no CD' },
  { item_name: 'Cilindro de Gás', action: 'Checar e Separar no CD' },
  { item_name: 'Materiais (Facas, Tábuas, etc)', action: 'Separar e Pegar no CD' },
  { item_name: 'Carnes / Proteínas (Insumos do Teste)', action: 'Comprar em Fornecedor' },
  { item_name: 'Frutas / FLV (Insumos do Teste)', action: 'Comprar em Hortifruti' },
  { item_name: 'Material Didático - Apresentação Q5 e Q7', action: 'Enviar para Equipe' },
  { item_name: 'Material Didático - Fluxo FLV', action: 'Enviar para Equipe' },
  { item_name: 'Criação do Grupo p/ Acompanhamento', action: 'WhatsApp' },
  { item_name: 'Reserva de Hotel', action: 'Reserva de Hotel' },
];

export interface ProjectWithRelations extends Project {
  responsibles?: ProjectResponsible[];
  test_staff?: TestStaff[];
  test_products?: TestProduct[];
  logistics_items?: LogisticsItem[];
  checklist_items?: ProjectChecklistItem[];
}