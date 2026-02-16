import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { branchService } from "@/services/api";
import { Loader2, Building2, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface Branch {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const Branches = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    setIsLoading(true);
    try {
      const data = await branchService.getAll();
      setBranches(data);
    } catch (error: any) {
      toast.error("Erro ao carregar filiais");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setIsSubmitting(true);
    try {
      await branchService.create({ name: newName });
      toast.success("Filial adicionada com sucesso!");
      setNewName("");
      await loadBranches();
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar filial");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (branch: Branch) => {
    setEditingId(branch.id);
    setEditingName(branch.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleSaveEdit = async (id: number) => {
    if (!editingName.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setIsSubmitting(true);
    try {
      await branchService.update(id, { name: editingName });
      toast.success("Filial atualizada com sucesso!");
      setEditingId(null);
      setEditingName("");
      await loadBranches();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar filial");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Filiais</h2>
        <p className="text-muted-foreground">
          Gerencie as filiais do sistema. As filiais são usadas para agrupar executivos e agências.
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          As filiais são usadas para organizar executivos e agências. Quando uma agência não tem um executivo específico atribuído,
          o sistema enviará notificações para todos os executivos ativos da filial da agência.
        </AlertDescription>
      </Alert>

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
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome da Filial *</Label>
              <Input
                id="new-name"
                type="text"
                placeholder="Ex: Filial Sul, Filial Norte"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
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
          {isLoading ? (
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
                        {editingId === branch.id ? (
                          <Input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
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
                          {editingId === branch.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSaveEdit(branch.id)}
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
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartEdit(branch)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(branch.id)}
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

export default Branches;
