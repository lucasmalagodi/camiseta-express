import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import { executiveService } from "@/services/api";
import { Loader2, User, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface Executive {
  id: number;
  code: string;
  email: string;
  name?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const Executives = () => {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCode, setEditingCode] = useState("");
  const [editingEmail, setEditingEmail] = useState("");
  const [editingName, setEditingName] = useState("");
  const [uniqueExecutiveNames, setUniqueExecutiveNames] = useState<string[]>([]);
  const [isLoadingNames, setIsLoadingNames] = useState(false);

  useEffect(() => {
    loadExecutives();
    loadUniqueExecutiveNames();
  }, []);

  const loadExecutives = async () => {
    setIsLoading(true);
    try {
      const data = await executiveService.getAll();
      setExecutives(data);
    } catch (error: any) {
      toast.error("Erro ao carregar executivos");
      console.error(error);
    } finally {
      setIsLoading(false);
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

  const handleSelectExecutiveName = (name: string) => {
    setNewCode(name);
  };

  const handleAdd = async (e: React.FormEvent) => {
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
      });
      toast.success("Executivo adicionado com sucesso!");
      setNewCode("");
      setNewEmail("");
      setNewName("");
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
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingCode("");
    setEditingEmail("");
    setEditingName("");
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
      });
      toast.success("Executivo atualizado com sucesso!");
      setEditingId(null);
      setEditingCode("");
      setEditingEmail("");
      setEditingName("");
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

  const activeCount = executives.filter((e) => e.active).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Executivos</h2>
        <p className="text-muted-foreground">
          Gerencie os executivos que receberão notificações quando suas agências fizerem pedidos
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          O código do executivo deve corresponder ao nome do executivo cadastrado na importação de pontos.
          Quando uma agência fizer um pedido, o sistema buscará o executivo relacionado através do código
          e enviará uma notificação por email.
        </AlertDescription>
      </Alert>

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
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  Selecione um executivo da lista acima para preencher automaticamente, ou digite manualmente. Deve corresponder ao executive_name da importação.
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
          {isLoading ? (
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executives.map((executive) => (
                    <TableRow key={executive.id}>
                      <TableCell>
                        {editingId === executive.id ? (
                          <Input
                            type="text"
                            value={editingCode}
                            onChange={(e) => setEditingCode(e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          <span className="font-medium">{executive.code}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === executive.id ? (
                          <Input
                            type="email"
                            value={editingEmail}
                            onChange={(e) => setEditingEmail(e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          <span>{executive.email}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === executive.id ? (
                          <Input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          <span>{executive.name || "-"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={executive.active ? "default" : "secondary"}>
                          {executive.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(executive.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
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
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={executive.active}
                                  onCheckedChange={() =>
                                    handleToggleActive(executive.id, executive.active)
                                  }
                                />
                              </div>
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

export default Executives;
