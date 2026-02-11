import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus } from "lucide-react";
import { categoryService } from "@/services/api";
import { toast } from "sonner";

interface Category {
  id: number;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryChange?: () => void;
}

const CategoryDialog = ({
  open,
  onOpenChange,
  onCategoryChange,
}: CategoryDialogProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "" });

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (error) {
      toast.error("Erro ao carregar categorias");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    try {
      if (editingId) {
        await categoryService.update(editingId, formData.name);
        toast.success("Categoria atualizada com sucesso!");
      } else {
        await categoryService.create(formData.name);
        toast.success("Categoria criada com sucesso!");
      }
      setFormData({ name: "" });
      setEditingId(null);
      setIsEditing(false);
      loadCategories();
      onCategoryChange?.();
    } catch (error) {
      toast.error(
        editingId
          ? "Erro ao atualizar categoria"
          : "Erro ao criar categoria"
      );
      console.error(error);
    }
  };

  const handleEdit = (category: Category) => {
    setFormData({ name: category.name });
    setEditingId(category.id);
    setIsEditing(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja desativar esta categoria?")) {
      return;
    }

    try {
      await categoryService.delete(id);
      toast.success("Categoria desativada com sucesso!");
      loadCategories();
      onCategoryChange?.();
    } catch (error) {
      toast.error("Erro ao desativar categoria");
      console.error(error);
    }
  };

  const handleCancel = () => {
    setFormData({ name: "" });
    setEditingId(null);
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
          <DialogDescription>
            Crie, edite ou desative categorias de produtos
          </DialogDescription>
        </DialogHeader>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">
              {isEditing ? "Editar Categoria" : "Nova Categoria"}
            </Label>
            <div className="flex gap-2">
              <Input
                id="category-name"
                placeholder="Nome da categoria"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
              <Button type="submit">
                {isEditing ? (
                  <>
                    <Pencil className="w-4 h-4 mr-2" />
                    Atualizar
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </>
                )}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* Lista de categorias */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhuma categoria cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.id}</TableCell>
                    <TableCell>{category.name}</TableCell>
                    <TableCell>
                      <Badge variant={category.active ? "default" : "secondary"}>
                        {category.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(category)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(category.id)}
                          disabled={!category.active}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryDialog;
