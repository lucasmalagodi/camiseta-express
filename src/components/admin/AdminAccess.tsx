import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { adminUserService } from "@/services/api";
import { Loader2, UserPlus, Shield, Edit2, Check, X, Search, Filter, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useTableSort } from "@/hooks/useTableSort";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const AdminAccess = () => {
  const { admin } = useAdminAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Filtros
  const [filterName, setFilterName] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [filterActive, setFilterActive] = useState<string>("");
  
  // Formulário de criação
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<string>("admin");
  
  // Formulário de edição
  const [editingName, setEditingName] = useState("");
  const [editingRole, setEditingRole] = useState<string>("");
  
  const { sortedData, handleSort, getSortIcon } = useTableSort(users);

  useEffect(() => {
    loadUsers();
  }, [filterName, filterEmail, filterRole, filterActive]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const filters: any = {};
      if (filterName) filters.name = filterName;
      if (filterEmail) filters.email = filterEmail;
      if (filterRole) filters.role = filterRole;
      if (filterActive !== "") filters.active = filterActive === "true";
      
      const data = await adminUserService.getAll(filters);
      setUsers(data);
    } catch (error: any) {
      toast.error("Erro ao carregar usuários");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast.error("Nome, email e senha são obrigatórios");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setIsSubmitting(true);
    try {
      await adminUserService.create({
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });
      toast.success("Usuário criado com sucesso!");
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("admin");
      setIsDialogOpen(false);
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (user: AdminUser) => {
    setEditingId(user.id);
    setEditingName(user.name);
    setEditingRole(user.role);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingRole("");
  };

  const handleSaveEdit = async (id: number) => {
    if (!editingName.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setIsSubmitting(true);
    try {
      await adminUserService.update(id, {
        name: editingName,
        role: editingRole,
      });
      toast.success("Usuário atualizado com sucesso!");
      setEditingId(null);
      setEditingName("");
      setEditingRole("");
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar usuário");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    // Não permitir bloquear a si mesmo
    if (admin && admin.id === id) {
      toast.error("Você não pode bloquear a si mesmo");
      return;
    }

    try {
      await adminUserService.updateStatus(id, !currentActive);
      toast.success(`Usuário ${!currentActive ? "desbloqueado" : "bloqueado"} com sucesso!`);
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar status do usuário");
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "agency":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "agency":
        return "Agência";
      default:
        return "Usuário";
    }
  };

  const activeCount = users.filter((u) => u.active).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Acesso Administrativo</h2>
        <p className="text-muted-foreground">
          Gerencie os usuários administrativos do sistema
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Apenas usuários com permissão de administrador podem gerenciar outros usuários.
          O email não pode ser alterado após a criação. Usuários bloqueados não conseguem fazer login.
        </AlertDescription>
      </Alert>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              <CardTitle>Filtros</CardTitle>
            </div>
            {(filterName || filterEmail || filterRole || filterActive) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterName("");
                  setFilterEmail("");
                  setFilterRole("");
                  setFilterActive("");
                }}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="filter-name">Nome</Label>
              <Input
                id="filter-name"
                type="text"
                placeholder="Buscar por nome..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="filter-email">Email</Label>
              <Input
                id="filter-email"
                type="email"
                placeholder="Buscar por email..."
                value={filterEmail}
                onChange={(e) => setFilterEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="filter-role">Perfil</Label>
              <Select value={filterRole || undefined} onValueChange={(value) => setFilterRole(value || "")}>
                <SelectTrigger id="filter-role">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="agency">Agência</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-active">Status</Label>
              <Select value={filterActive || undefined} onValueChange={(value) => setFilterActive(value || "")}>
                <SelectTrigger id="filter-active">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Ativo</SelectItem>
                  <SelectItem value="false">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão para criar novo usuário */}
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um novo usuário administrativo
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">Nome *</Label>
                <Input
                  id="new-name"
                  type="text"
                  placeholder="Nome completo"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">Email *</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  O email não poderá ser alterado após a criação
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Senha *</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-role">Perfil *</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger id="new-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="agency">Agência</SelectItem>
                    <SelectItem value="user">Usuário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Criar
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de usuários */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Usuários Administrativos
              </CardTitle>
              <CardDescription className="mt-1">
                {users.length} usuário(s) cadastrado(s) • {activeCount} ativo(s)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum usuário encontrado</p>
              <p className="text-sm">Ajuste os filtros ou crie um novo usuário</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("name")}
                    >
                      Nome{getSortIcon("name")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("email")}
                    >
                      Email{getSortIcon("email")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("role")}
                    >
                      Perfil{getSortIcon("role")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("active")}
                    >
                      Status{getSortIcon("active")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("createdAt")}
                    >
                      Cadastrado em{getSortIcon("createdAt")}
                    </TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        {editingId === user.id ? (
                          <Input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          <span className="font-medium">{user.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{user.email}</span>
                      </TableCell>
                      <TableCell>
                        {editingId === user.id ? (
                          <Select value={editingRole} onValueChange={setEditingRole}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="agency">Agência</SelectItem>
                              <SelectItem value="user">Usuário</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {getRoleLabel(user.role)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? "default" : "secondary"}>
                          {user.active ? "Ativo" : "Bloqueado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingId === user.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSaveEdit(user.id)}
                                disabled={isSubmitting}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCancelEdit}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={user.active}
                                  onCheckedChange={() =>
                                    handleToggleActive(user.id, user.active)
                                  }
                                  disabled={admin?.id === user.id}
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartEdit(user)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAccess;
