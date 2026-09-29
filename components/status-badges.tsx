import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const statusConfig: Record<string, { className: string; label: string }> = {
  'Em Andamento': { className: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Em Andamento' },
  'Concluído': { className: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Concluído' },
  'Pausado': { className: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Pausado' },
  'Aprovado': { className: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Aprovado' },
  'Reprovado': { className: 'bg-red-100 text-red-700 border-red-200', label: 'Reprovado' },
  'Em Negociação': { className: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Em Negociação' },
  'Encerrado': { className: 'bg-gray-200 text-gray-700 border-gray-300', label: 'Encerrado' },
  'Pendente': { className: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Pendente' },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = statusConfig[status] || { className: 'bg-gray-100 text-gray-700 border-gray-200', label: status };
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}

const evalConfig: Record<string, string> = {
  'Bom': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Parcial': 'bg-amber-100 text-amber-700 border-amber-200',
  'Ruim': 'bg-red-100 text-red-700 border-red-200',
  'Não Se Aplica': 'bg-gray-100 text-gray-500 border-gray-200',
};

export function EvalBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <Badge variant="outline" className={cn(evalConfig[value] || 'bg-gray-100 text-gray-700 border-gray-200')}>
      {value}
    </Badge>
  );
}

const finalResultConfig: Record<string, string> = {
  'Aprovado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Reprovado': 'bg-red-100 text-red-700 border-red-200',
  'Inválido': 'bg-gray-200 text-gray-700 border-gray-300',
  'Parcial': 'bg-amber-100 text-amber-700 border-amber-200',
};

export function FinalResultBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <Badge variant="outline" className={cn(finalResultConfig[value] || 'bg-gray-100 text-gray-700 border-gray-200')}>
      {value}
    </Badge>
  );
}

const checklistConfig: Record<string, { dot: string; className: string }> = {
  'Ok / Pronto para o Teste': { dot: 'bg-emerald-500', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'Em Andamento': { dot: 'bg-amber-500', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Atrasado / Pendente': { dot: 'bg-red-500', className: 'bg-red-50 text-red-700 border-red-200' },
  'Não se faz necessário': { dot: 'bg-gray-400', className: 'bg-gray-50 text-gray-600 border-gray-200' },
};

export function ChecklistStatusBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground text-sm">—</span>;
  const config = checklistConfig[value] || { dot: 'bg-gray-400', className: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <Badge variant="outline" className={cn(config.className, 'gap-1.5')}>
      <span className={cn('w-2 h-2 rounded-full', config.dot)} />
      {value}
    </Badge>
  );
}

export function SalesChanceBadge({ value }: { value: string | null }) {
  if (!value) return null;
  const config: Record<string, string> = {
    'Alto': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Médio': 'bg-amber-100 text-amber-700 border-amber-200',
    'Baixo': 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <Badge variant="outline" className={cn(config[value] || 'bg-gray-100 text-gray-700 border-gray-200')}>
      {value}
    </Badge>
  );
}
