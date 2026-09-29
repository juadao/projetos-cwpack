'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users as UsersIcon, Trash2, Shield, User, UserPlus, Loader2, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Profile, UserRole } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', username: '', password: '', role: 'Representante' as UserRole });
  const [creating, setCreating] = useState(false);

  const isDono = profile?.role === 'Dono';
  const canManageUsers = isDono;

  useEffect(() => {
    if (!authLoading && !canManageUsers) {
      router.push('/');
    }
  }, [authLoading, canManageUsers, router]);

  const loadUsers = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Erro ao carregar usuários', description: error.message, variant: 'destructive' });
    } else {
      setUsers(data as Profile[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (canManageUsers) loadUsers();
  }, [canManageUsers, loadUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!isDono) {
      toast({ title: 'Sem permissão', description: 'Apenas o Dono pode alterar níveis de acesso.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('user_id', userId);
    if (error) {
      toast({ title: 'Erro ao alterar acesso', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Acesso atualizado', description: `Usuário agora é ${newRole}` });
      loadUsers();
    }
  };

  const handleDelete = async (user: Profile) => {
    if (!isDono) {
      toast({ title: 'Sem permissão', description: 'Apenas o Dono pode excluir usuários.', variant: 'destructive' });
      return;
    }
    if (user.user_id === profile?.user_id) {
      toast({ title: 'Não permitido', description: 'Você não pode excluir seu próprio usuário.', variant: 'destructive' });
      return;
    }
    if (!confirm(`Tem certeza que deseja excluir o usuário "${user.name || user.username}"? Esta ação não pode ser desfeita.`)) return;

    const { error: profileError } = await supabase.from('profiles').delete().eq('user_id', user.user_id);
    if (profileError) {
      toast({ title: 'Erro ao excluir', description: profileError.message, variant: 'destructive' });
      return;
    }

    const { error: authError } = await supabase.auth.admin.deleteUser(user.user_id);
    if (authError) {
      toast({ title: 'Aviso', description: 'Perfil removido, mas houve erro ao remover da autenticação.', variant: 'destructive' });
    } else {
      toast({ title: 'Usuário excluído' });
    }
    loadUsers();
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.username || !createForm.password) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos.', variant: 'destructive' });
      return;
    }
    if (createForm.password.length < 6) {
      toast({ title: 'Senha muito curta', description: 'A senha deve ter no mínimo 6 caracteres.', variant: 'destructive' });
      return;
    }

    setCreating(true);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session?.access_token || ''}`,
        Apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        username: createForm.username,
        password: createForm.password,
        name: createForm.name,
        role: createForm.role,
      }),
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      toast({ title: 'Erro ao criar usuário', description: result.error || `Erro ${response.status}`, variant: 'destructive' });
      setCreating(false);
      return;
    }

    toast({ title: 'Usuário criado', description: `${createForm.name} foi cadastrado como ${createForm.role}.` });

    setCreating(false);
    setCreateOpen(false);
    setCreateForm({ name: '', username: '', password: '', role: 'Representante' });
    loadUsers();
  };

  if (authLoading || (!canManageUsers && !authLoading)) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-pulse text-muted-foreground">Carregando...</div></div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-pulse text-muted-foreground">Carregando usuários...</div></div>;
  }

  const donoCount = users.filter(u => u.role === 'Dono').length;
  const adminCount = users.filter(u => u.role === 'Admin').length;
  const repCount = users.filter(u => u.role === 'Representante').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Usuários</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie usuários e suas permissões no sistema
          </p>
        </div>
        {isDono && (
          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total de Usuários</p>
                <p className="text-2xl font-bold mt-1">{users.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
                <UsersIcon className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Dono</p>
                <p className="text-2xl font-bold mt-1">{donoCount}</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50">
                <Crown className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Administradores</p>
                <p className="text-2xl font-bold mt-1">{adminCount}</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50">
                <Shield className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Representantes</p>
                <p className="text-2xl font-bold mt-1">{repCount}</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50">
                <User className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum usuário cadastrado.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((user) => (
                <div
                  key={user.user_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0',
                      user.role === 'Dono' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'Admin' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    )}>
                      {(user.name || user.username || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{user.name || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                    </div>
                    {user.user_id === profile?.user_id && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">
                        Você
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isDono ? (
                      <Select
                        value={user.role}
                        onValueChange={(v) => handleRoleChange(user.user_id, v)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Dono">Dono</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Representante">Representante</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-muted-foreground px-3">{user.role}</span>
                    )}
                    {isDono && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(user)}
                        disabled={user.user_id === profile?.user_id}
                        className="text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome Completo</Label>
              <Input
                id="new-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Nome do usuário"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-username">Usuário (login)</Label>
              <Input
                id="new-username"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                placeholder="usuario"
                autoCapitalize="none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label>Nível de Acesso</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) => setCreateForm({ ...createForm, role: v as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dono">Dono (acesso total + gerencia usuários)</SelectItem>
                  <SelectItem value="Admin">Admin (acesso total + pode excluir)</SelectItem>
                  <SelectItem value="Representante">Representante (somente seus projetos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
