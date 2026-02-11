import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderPlus, Plus, Pencil, RotateCcw, Power } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { productService, categoryService } from "@/services/api";
import { toast } from "sonner";
import CategoryDialog from "@/components/admin/CategoryDialog";
import ProductDialog from "@/components/admin/ProductDialog";

interface Product {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  quantity: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: number;
  name: string;
  active: boolean;
}

type FilterStatus = "all" | "active" | "inactive";

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      // Carregar todos os produtos (sem filtro)
      const data = await productService.getAll();
      setAllProducts(data);
      applyFilter(data, filterStatus);
    } catch (error) {
      toast.error("Erro ao carregar produtos");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = (productsList: Product[], status: FilterStatus) => {
    switch (status) {
      case "active":
        setProducts(productsList.filter((p) => p.active));
        break;
      case "inactive":
        setProducts(productsList.filter((p) => !p.active));
        break;
      default:
        setProducts(productsList);
    }
  };

  const handleFilterChange = (status: FilterStatus) => {
    setFilterStatus(status);
    applyFilter(allProducts, status);
  };

  const loadCategories = async () => {
    try {
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const getCategoryName = (categoryId: number) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category?.name || "Sem categoria";
  };

  const handleEditProduct = (productId: number) => {
    setEditingProductId(productId);
    setIsProductDialogOpen(true);
  };

  const handleAddProduct = () => {
    setEditingProductId(null);
    setIsProductDialogOpen(true);
  };

  const handleProductDialogClose = (open: boolean) => {
    setIsProductDialogOpen(open);
    if (!open) {
      setEditingProductId(null);
    }
  };

  const handleToggleActive = async (productId: number, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      console.log('Toggling product status:', { productId, currentStatus, newStatus });
      await productService.update(productId, { active: newStatus });
      console.log('Product status updated successfully');
      toast.success(`Produto ${newStatus ? "ativado" : "inativado"} com sucesso!`);
      // Aguardar um pouco antes de recarregar para garantir que o banco foi atualizado
      setTimeout(() => {
        loadProducts();
      }, 500);
    } catch (error) {
      toast.error("Erro ao alterar status do produto");
      console.error('Error toggling product status:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com botões */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Produtos Cadastrados</h3>
          <p className="text-sm text-muted-foreground">
            {filterStatus === "all" 
              ? `Total: ${products.length} produtos`
              : filterStatus === "active"
              ? `${products.length} produto(s) ativo(s)`
              : `${products.length} produto(s) inativo(s)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsCategoryDialogOpen(true)}
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Categorias
          </Button>
          <Button onClick={handleAddProduct}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Produto
          </Button>
        </div>
      </div>

      {/* Filtro de Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="status-filter">Filtrar por Status:</Label>
            <Select value={filterStatus} onValueChange={handleFilterChange}>
              <SelectTrigger id="status-filter" className="w-[180px]">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Apenas Ativos</SelectItem>
                <SelectItem value="inactive">Apenas Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grid de produtos */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">Nenhum produto cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.id}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getCategoryName(product.categoryId)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {product.description || "-"}
                    </TableCell>
                    <TableCell>{product.quantity ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={product.active ? "default" : "secondary"}>
                        {product.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(product.id, product.active)}
                          title={product.active ? "Inativar produto" : "Ativar produto"}
                        >
                          {product.active ? (
                            <Power className="w-4 h-4 text-orange-600" />
                          ) : (
                            <RotateCcw className="w-4 h-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditProduct(product.id)}
                          title="Editar produto"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de categorias */}
      <CategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        onCategoryChange={loadCategories}
      />

      {/* Dialog de produtos */}
      <ProductDialog
        open={isProductDialogOpen}
        onOpenChange={handleProductDialogClose}
        onProductChange={loadProducts}
        productId={editingProductId}
      />
    </div>
  );
};

export default AdminProducts;
