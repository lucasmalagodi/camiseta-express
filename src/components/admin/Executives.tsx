import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { executiveService, branchService, executiveNotificationEmailService } from "@/services/api";
import { Loader2, User, Plus, Trash2, Edit2, Check, X, Building2, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface Executive {
  id: number;
  code: string;
  email: string;
  name?: string;
  branchId?: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Branch {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface ExecutiveNotificationEmail {
  id: number;
  executiveId: number;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const Executives = () => {
  // Estados para Executivos
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [isLoadingExecutives, setIsLoadingExecutives] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCode, setEditingCode] = useState("");
  const [editingEmail, setEditingEmail] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingBranchId, setEditingBranchId] = useState<number | null>(null);
  const [newBranchId, setNewBranchId] = useState<number | null>(null);
  const [uniqueExecutiveNames, setUniqueExecutiveNames] = useState<string[]>([]);
  const [isLoadingNames, setIsLoadingNames] = useState(false);
  const [uniqueBranchNames, setUniqueBranchNames] = useState<string[]>([]);
  const [isLoadingBranchNames, setIsLoadingBranchNames] = useState(false);

  // Estados para Filiais
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [newBranchName, setNewBranchName] = useState("");
  const [editingBranchIdForBranch, setEditingBranchIdForBranch] = useState<number | null>(null);
  const [editingBranchName, setEditingBranchName] = useState("");

  // Estados para Emails Adicionais
  const [executiveEmails, setExecutiveEmails] = useState<Record<number, ExecutiveNotificationEmail[]>>({});
  const [expandedExecutiveId, setExpandedExecutiveId] = useState<number | null>(null);
  const [newEmailForExecutive, setNewEmailForExecutive] = useState<Record<number, string>>({});
  const [editingEmailId, setEditingEmailId] = useState<number | null>(null);
  const [editingEmailValue, setEditingEmailValue] = useState("");

  useEffect(() => {
    loadExecutives();
    loadUniqueExecutiveNames();
    loadUniqueBranchNames();
    loadBranches();
  }, []);

  const loadBranches = async () => {
    setIsLoadingBranches(true);
    try {
      const data = await branchService.getAll();
      setBranches(data);
    } catch (error: any) {
      toast.error("Erro ao carregar filiais");
      console.error(error);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  const loadExecutives = async () => {
    setIsLoadingExecutives(true);
    try {
      const data = await executiveService.getAll();
      setExecutives(data);
      // Carregar emails de cada executivo
      for (const executive of data) {
        await loadExecutiveEmails(executive.id);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar executivos");
      console.error(error);
    } finally {
      setIsLoadingExecutives(false);
    }
  };

  const loadExecutiveEmails = async (executiveId: number) => {
    try {
      const data = await executiveNotificationEmailService.getByExecutiveId(executiveId);
      setExecutiveEmails((prev) => ({ ...prev, [executiveId]: data }));
    } catch (error: any) {
      console.error(`Erro ao carregar emails do executivo ${executiveId}:`, error);
    }
  };

  const loadUniqueExecutiveNames = async () => {
    setIsLoadingNames(true);
    try {
      const names = await executiveService.getUniqueExecutiveNames();
      setUniqueExecutiveNames(names);
    } catch (error: any) {
      console.error("Erro ao carregar nomes de executivos:", error);
    } finally {
      setIsLoadingNames(false);
    }
  };

  const loadUniqueBranchNames = async () => {
    setIsLoadingBranchNames(true);
    try {
      const names = await branchService.getUniqueBranchNames();
      setUniqueBranchNames(names);
    } catch (error: any) {
      console.error("Erro ao carregar nomes de filiais:", error);
    } finally {
      setIsLoadingBranchNames(false);
    }
  };

  // ========== FUNÇÕES DE FILIAIS ==========
  const handleCreateBranchFromImport = async (branchName: string) => {
    if (!branchName.trim()) {
      return;
    }

    // Verificar se já existe
    const existing = branches.find((b) => b.name === branchName);
    if (existing) {
      setNewBranchId(existing.id);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await branchService.create({ name: branchName });
      toast.success("Filial criada automaticamente!");
      await loadBranches();
      // Aguardar um pouco para garantir que a branch foi carregada
      setTimeout(async () => {
        await loadBranches();
        const updatedBranches = await branchService.getAll();
        const newBranch = updatedBranches.find((b: Branch) => b.name === branchName);
        if (newBranch) {
          setNewBranchId(newBranch.id);
        } else if (result.id) {
          setNewBranchId(result.id);
        }
      }, 200);
    } catch (error: any) {
      // Se já existe, buscar e usar
      if (error.message?.includes("já cadastrada")) {
        await loadBranches();
        const updatedBranches = await branchService.getAll();
        const existingBranch = updatedBranches.find((b: Branch) => b.name === branchName);
        if (existingBranch) {
          setNewBranchId(existingBranch.id);
        }
      } else {
        toast.error(error.message || "Erro ao criar filial");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setIsSubmitting(true);
    try {
      await branchService.create({ name: newBranchName });
      toast.success("Filial adicionada com sucesso!");
      setNewBranchName("");
      await loadBranches();
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar filial");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditBranch = (branch: Branch) => {
    setEditingBranchIdForBranch(branch.id);
    setEditingBranchName(branch.name);
  };

  const handleCancelEditBranch = () => {
    setEditingBranchIdForBranch(null);
    setEditingBranchName("");
  };

  const handleSaveEditBranch = async (id: number) => {
    if (!editingBranchName.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setIsSubmitting(true);
    try {
      await branchService.update(id, { name: editingBranchName });
      toast.success("Filial atualizada com sucesso!");
      setEditingBranchIdForBranch(null);
      setEditingBranchName("");
      await loadBranches();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar filial");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBranch = async (id: number) => {
    if (!confirm("Tem certeza que deseja remover esta filial?")) {
      return;
    }

    try {
      await branchService.delete(id);
      toast.success("Filial removida com sucesso!");
      await loadBranches();
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover filial");
    }
  };

  // ========== FUNÇÕES DE EXECUTIVOS ==========
  const handleSelectExecutiveName = (name: string) => {
    setNewCode(name);
  };

  const handleAddExecutive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newEmail.trim()) {
      toast.error("Código e email são obrigatórios");
      return;
    }

    setIsSubmitting(true);
    try {
      await executiveService.create({
        code: newCode,
        email: newEmail,
        name: newName || undefined,
        branchId: newBranchId || null,
      });
      toast.success("Executivo adicionado com sucesso!");
      setNewCode("");
      setNewEmail("");
      setNewName("");
      setNewBranchId(null);
      await loadExecutives();
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar executivo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      await executiveService.update(id, { active: !currentActive });
      toast.success(`Executivo ${!currentActive ? "ativado" : "desativado"} com sucesso!`);
      await loadExecutives();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar executivo");
    }
  };

  const handleStartEdit = (executive: Executive) => {
    setEditingId(executive.id);
    setEditingCode(executive.code);
    setEditingEmail(executive.email);
    setEditingName(executive.name || "");
    setEditingBranchId(executive.branchId || null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingCode("");
    setEditingEmail("");
    setEditingName("");
    setEditingBranchId(null);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editingCode.trim() || !editingEmail.trim()) {
      toast.error("Código e email são obrigatórios");
      return;
    }

    setIsSubmitting(true);
    try {
      await executiveService.update(id, {
        code: editingCode,
        email: editingEmail,
        name: editingName || undefined,
        branchId: editingBranchId || null,
      });
      toast.success("Executivo atualizado com sucesso!");
      setEditingId(null);
      setEditingCode("");
      setEditingEmail("");
      setEditingName("");
      setEditingBranchId(null);
      await loadExecutives();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar executivo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja remover este executivo?")) {
      return;
    }

    try {
      await executiveService.delete(id);
      toast.success("Executivo removido com sucesso!");
      await loadExecutives();
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover executivo");
    }
  };

  // ========== FUNÇÕES DE EMAILS ADICIONAIS ==========
  const handleAddEmail = async (executiveId: number) => {
    const email = newEmailForExecutive[executiveId]?.trim();
    if (!email) {
      toast.error("Email é obrigatório");
      return;
    }

    setIsSubmitting(true);
    try {
      await executiveNotificationEmailService.create({
        executiveId,
        email,
      });
      toast.success("Email adicionado com sucesso!");
      setNewEmailForExecutive((prev) => ({ ...prev, [executiveId]: "" }));
      await loadExecutiveEmails(executiveId);
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar email");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEmailActive = async (emailId: number, executiveId: number, currentActive: boolean) => {
    try {
      await executiveNotificationEmailService.update(emailId, { active: !currentActive });
      toast.success(`Email ${!currentActive ? "ativado" : "desativado"} com sucesso!`);
      await loadExecutiveEmails(executiveId);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar email");
    }
  };

  const handleStartEditEmail = (email: ExecutiveNotificationEmail) => {
    setEditingEmailId(email.id);
    setEditingEmailValue(email.email);
  };

  const handleCancelEditEmail = () => {
    setEditingEmailId(null);
    setEditingEmailValue("");
  };

  const handleSaveEditEmail = async (emailId: number, executiveId: number) => {
    if (!editingEmailValue.trim()) {
      toast.error("Email é obrigatório");
      return;
    }

    setIsSubmitting(true);
    try {
      await executiveNotificationEmailService.update(emailId, { email: editingEmailValue });
      toast.success("Email atualizado com sucesso!");
      setEditingEmailId(null);
      setEditingEmailValue("");
      await loadExecutiveEmails(executiveId);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar email");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmail = async (emailId: number, executiveId: number) => {
    if (!confirm("Tem certeza que deseja remover este email?")) {
      return;
    }

    try {
      await executiveNotificationEmailService.delete(emailId);
      toast.success("Email removido com sucesso!");
      await loadExecutiveEmails(executiveId);
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover email");
    }
  };

  const activeCount = executives.filter((e) => e.active).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Executivos e Filiais</h2>
        <p className="text-muted-foreground">
          Gerencie filiais, executivos e seus emails adicionais de notificação
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          O sistema de notificações funciona da seguinte forma: quando uma agência faz um pedido,
          se ela tiver um executivo atribuído, o email será enviado para o executivo e seus emails adicionais.
          Se não tiver executivo, o sistema buscará todos os executivos da filial da agência e enviará para todos.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="executives" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-2">
          <TabsTrigger value="executives" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Executivos
          </TabsTrigger>
          <TabsTrigger value="branches" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Filiais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executives" className="space-y-6">
          {/* Formulário para adicionar novo executivo */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <CardTitle>Adicionar Executivo</CardTitle>
              </div>
              <CardDescription>
                Adicione um novo executivo para receber notificações de pedidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddExecutive} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-code">Código *</Label>
                    <div className="space-y-2">
                      <Select
                        onValueChange={handleSelectExecutiveName}
                        disabled={isLoadingNames || uniqueExecutiveNames.length === 0}
                      >
                        <SelectTrigger id="new-code-select">
                          <SelectValue placeholder={isLoadingNames ? "Carregando..." : uniqueExecutiveNames.length === 0 ? "Nenhum executivo encontrado" : "Selecione um executivo da lista"} />
                        </SelectTrigger>
                        {uniqueExecutiveNames.length > 0 && (
                          <SelectContent>
                            {uniqueExecutiveNames.map((name) => (
                              <SelectItem key={name} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        )}
                      </Select>
                      <Input
                        id="new-code"
                        type="text"
                        placeholder="Digite o nome do executivo"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value)}
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Deve corresponder ao executive_name da importação.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="new-email">Email *</Label>
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="executivo@exemplo.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-name">Nome (opcional)</Label>
                    <Input
                      id="new-name"
                      type="text"
                      placeholder="Nome completo"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-branch">Filial (opcional)</Label>
                    <div className="space-y-2">
                      <Select
                        onValueChange={(name) => {
                          handleCreateBranchFromImport(name);
                        }}
                        disabled={isLoadingBranchNames || uniqueBranchNames.length === 0}
                      >
                        <SelectTrigger id="new-branch-select">
                          <SelectValue placeholder={isLoadingBranchNames ? "Carregando..." : uniqueBranchNames.length === 0 ? "Nenhuma filial encontrada" : "Selecione uma filial da lista"} />
                        </SelectTrigger>
                        {uniqueBranchNames.length > 0 && (
                          <SelectContent>
                            {uniqueBranchNames.map((name) => (
                              <SelectItem key={name} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        )}
                      </Select>
                      <Select
                        value={newBranchId?.toString() || "none"}
                        onValueChange={(value) => setNewBranchId(value === "none" ? null : parseInt(value))}
                      >
                        <SelectTrigger id="new-branch">
                          <SelectValue placeholder="Ou selecione uma filial cadastrada" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma filial</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id.toString()}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selecione uma filial da lista acima para criar automaticamente, ou escolha uma filial já cadastrada.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adicionando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Lista de executivos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Executivos Cadastrados
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {executives.length} executivo(s) cadastrado(s) • {activeCount} ativo(s)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingExecutives ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : executives.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum executivo cadastrado</p>
                  <p className="text-sm">Adicione um executivo acima para começar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {executives.map((executive) => {
                    const emails = executiveEmails[executive.id] || [];
                    const isExpanded = expandedExecutiveId === executive.id;
                    return (
                      <div key={executive.id} className="border rounded-lg p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                          <div>
                            <Label className="text-xs text-muted-foreground">Código</Label>
                            {editingId === executive.id ? (
                              <Input
                                type="text"
                                value={editingCode}
                                onChange={(e) => setEditingCode(e.target.value)}
                                className="w-full mt-1"
                              />
                            ) : (
                              <span className="font-medium block mt-1">{executive.code}</span>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Email</Label>
                            {editingId === executive.id ? (
                              <Input
                                type="email"
                                value={editingEmail}
                                onChange={(e) => setEditingEmail(e.target.value)}
                                className="w-full mt-1"
                              />
                            ) : (
                              <span className="block mt-1">{executive.email}</span>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Nome</Label>
                            {editingId === executive.id ? (
                              <Input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="w-full mt-1"
                              />
                            ) : (
                              <span className="block mt-1">{executive.name || "-"}</span>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Filial</Label>
                            {editingId === executive.id ? (
                              <Select
                                value={editingBranchId?.toString() || "none"}
                                onValueChange={(value) => setEditingBranchId(value === "none" ? null : parseInt(value))}
                              >
                                <SelectTrigger className="w-full mt-1">
                                  <SelectValue placeholder="Selecione uma filial" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nenhuma filial</SelectItem>
                                  {branches.map((branch) => (
                                    <SelectItem key={branch.id} value={branch.id.toString()}>
                                      {branch.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="block mt-1">
                                {executive.branchId
                                  ? branches.find((b) => b.id === executive.branchId)?.name || "-"
                                  : "-"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-end justify-between gap-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">Status</Label>
                              <Badge variant={executive.active ? "default" : "secondary"} className="mt-1">
                                {executive.active ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              {editingId === executive.id ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleSaveEdit(executive.id)}
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
                                  <Switch
                                    checked={executive.active}
                                    onCheckedChange={() =>
                                      handleToggleActive(executive.id, executive.active)
                                    }
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleStartEdit(executive)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(executive.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Emails Adicionais */}
                        <Collapsible open={isExpanded} onOpenChange={(open) => setExpandedExecutiveId(open ? executive.id : null)}>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between">
                              <span className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Emails Adicionais ({emails.length})
                              </span>
                              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-4 pt-4 border-t">
                            {/* Formulário para adicionar email */}
                            <div className="flex gap-2">
                              <Input
                                type="email"
                                placeholder="email@exemplo.com"
                                value={newEmailForExecutive[executive.id] || ""}
                                onChange={(e) =>
                                  setNewEmailForExecutive((prev) => ({
                                    ...prev,
                                    [executive.id]: e.target.value,
                                  }))
                                }
                              />
                              <Button
                                type="button"
                                onClick={() => handleAddEmail(executive.id)}
                                disabled={isSubmitting}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar
                              </Button>
                            </div>

                            {/* Lista de emails */}
                            {emails.length > 0 && (
                              <div className="space-y-2">
                                {emails.map((email) => (
                                  <div key={email.id} className="flex items-center gap-2 p-2 border rounded">
                                    {editingEmailId === email.id ? (
                                      <>
                                        <Input
                                          type="email"
                                          value={editingEmailValue}
                                          onChange={(e) => setEditingEmailValue(e.target.value)}
                                          className="flex-1"
                                        />
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleSaveEditEmail(email.id, executive.id)}
                                          disabled={isSubmitting}
                                        >
                                          <Check className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={handleCancelEditEmail}
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="flex-1">{email.email}</span>
                                        <Badge variant={email.active ? "default" : "secondary"}>
                                          {email.active ? "Ativo" : "Inativo"}
                                        </Badge>
                                        <Switch
                                          checked={email.active}
                                          onCheckedChange={() =>
                                            handleToggleEmailActive(email.id, executive.id, email.active)
                                          }
                                        />
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleStartEditEmail(email)}
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDeleteEmail(email.id, executive.id)}
                                        >
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="space-y-6">
          {/* Formulário para adicionar nova filial */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <CardTitle>Adicionar Filial</CardTitle>
              </div>
              <CardDescription>
                Adicione uma nova filial ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddBranch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-branch-name">Nome da Filial *</Label>
                  <Input
                    id="new-branch-name"
                    type="text"
                    placeholder="Ex: Filial Sul, Filial Norte"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adicionando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Lista de filiais */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Filiais Cadastradas
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {branches.length} filial(is) cadastrada(s)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingBranches ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : branches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma filial cadastrada</p>
                  <p className="text-sm">Adicione uma filial acima para começar</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Cadastrado em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branches.map((branch) => (
                        <TableRow key={branch.id}>
                          <TableCell>
                            {editingBranchIdForBranch === branch.id ? (
                              <Input
                                type="text"
                                value={editingBranchName}
                                onChange={(e) => setEditingBranchName(e.target.value)}
                                className="w-full"
                              />
                            ) : (
                              <span className="font-medium">{branch.name}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(branch.createdAt).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {editingBranchIdForBranch === branch.id ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleSaveEditBranch(branch.id)}
                                    disabled={isSubmitting}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleCancelEditBranch}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleStartEditBranch(branch)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteBranch(branch.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Executives;
