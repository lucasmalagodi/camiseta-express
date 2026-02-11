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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Package, Image, DollarSign, Pencil, RotateCcw, ArrowUp, ArrowDown, Star } from "lucide-react";
import { productService, categoryService, productImageService, productPriceService } from "@/services/api";
import { toast } from "sonner";
import { formatPoints } from "@/lib/utils";

interface Category {
  id: number;
  name: string;
  active: boolean | number;
}

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductChange?: () => void;
  productId?: number | null;
}

const ProductDialog = ({
  open,
  onOpenChange,
  onProductChange,
  productId: initialProductId,
}: ProductDialogProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [productId, setProductId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("product");
  const [images, setImages] = useState<any[]>([]);
  const [prices, setPrices] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    quantity: "",
  });

  const [imageForm, setImageForm] = useState({
    path: "",
    name: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Array<{ file: File; name: string; id: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingImageId, setEditingImageId] = useState<number | null>(null);

  const [priceForm, setPriceForm] = useState({
    value: "",
    batch: "",
    quantidadeCompra: "0",
  });
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const data = await categoryService.getAll();
      // Verificar se data é um array
      if (!Array.isArray(data)) {
        console.error("Resposta da API não é um array:", data);
        toast.error("Erro ao carregar categorias: formato inválido");
        setCategories([]);
        return;
      }
      // Filtrar apenas categorias ativas (tratar tanto boolean quanto número)
      const activeCategories = data.filter((cat: any) => {
        // A API pode retornar active como 1/0 ou true/false
        const isActive = cat.active === true || cat.active === 1;
        return isActive;
      });
      console.log("Categorias recebidas da API:", data);
      console.log("Categorias ativas filtradas:", activeCategories);
      console.log("Total de categorias ativas:", activeCategories.length);
      
      // Garantir que temos categorias antes de definir
      if (activeCategories.length > 0) {
        setCategories(activeCategories);
      } else {
        console.warn("Nenhuma categoria ativa encontrada após filtro");
        setCategories([]);
      }
      if (activeCategories.length === 0 && data.length > 0) {
        toast.warning("Nenhuma categoria ativa encontrada. Ative uma categoria primeiro.");
      }
    } catch (error: any) {
      console.error("Erro ao carregar categorias:", error);
      const errorMessage = error?.message || "Erro ao carregar categorias";
      toast.error(errorMessage);
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const loadProductData = async (id: number) => {
    try {
      setIsLoadingProduct(true);
      const product = await productService.getById(id);
      setFormData({
        name: product.name || "",
        description: product.description || "",
        categoryId: product.categoryId?.toString() || "",
        quantity: product.quantity?.toString() || "0",
      });
      setProductId(id);
      // As imagens e preços serão carregados pelo useEffect quando productId mudar
    } catch (error) {
      console.error("Erro ao carregar produto:", error);
      toast.error("Erro ao carregar dados do produto");
      onOpenChange(false); // Fechar modal em caso de erro
    } finally {
      setIsLoadingProduct(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadCategories();
      if (initialProductId) {
        // Modo de edição - carregar dados do produto
        loadProductData(initialProductId);
        setActiveTab("product");
      } else {
        // Modo de criação - resetar formulário
        setFormData({
          name: "",
          description: "",
          categoryId: "",
          quantity: "0",
        });
        setProductId(null);
        setActiveTab("product");
        setImages([]);
        setPrices([]);
        setImageForm({ path: "", name: "" });
        setPriceForm({ value: "", batch: "", quantidadeCompra: "0" });
        setSelectedFile(null);
        setSelectedFiles([]);
        setIsLoading(false);
      }
    } else {
      // Resetar quando fechar
      setProductId(null);
      setFormData({
        name: "",
        description: "",
        categoryId: "",
        quantity: "0",
      });
      setImages([]);
      setPrices([]);
      setActiveTab("product");
      setEditingImageId(null);
      setEditingPriceId(null);
      setImageForm({ path: "", name: "" });
      setPriceForm({ value: "", batch: "", quantidadeCompra: "0" });
      setSelectedFile(null);
      setSelectedFiles([]);
    }
  }, [open, initialProductId]);

  useEffect(() => {
    if (productId && open) {
      loadImages();
      loadPrices();
    }
  }, [productId, activeTab, open]);

  const loadImages = async () => {
    if (!productId) return;
    try {
      const data = await productImageService.getAll(productId);
      setImages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar imagens:", error);
      setImages([]);
    }
  };

  const loadPrices = async () => {
    if (!productId) return;
    try {
      const data = await productPriceService.getAll(productId);
      // Garantir que os valores sejam números
      const normalizedPrices = data.map((price: any) => ({
        ...price,
        value: typeof price.value === 'string' ? parseFloat(price.value) : price.value,
        batch: typeof price.batch === 'string' ? parseInt(price.batch) : price.batch,
        quantidadeCompra: typeof price.quantidadeCompra === 'string' ? parseInt(price.quantidadeCompra) : (price.quantidadeCompra || 0),
      }));
      setPrices(normalizedPrices);
    } catch (error) {
      console.error("Erro ao carregar preços:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }

    if (!formData.categoryId) {
      toast.error("Selecione uma categoria");
      return;
    }

    try {
      setIsLoading(true);
      
      if (productId) {
        // Modo de edição - atualizar produto existente
        await productService.update(productId, {
          name: formData.name,
          description: formData.description,
          categoryId: parseInt(formData.categoryId),
          quantity: parseInt(formData.quantity) || 0,
        });
        toast.success("Produto atualizado com sucesso!");
        onProductChange?.();
      } else {
        // Modo de criação - criar novo produto
        const result = await productService.create({
          name: formData.name,
          description: formData.description,
          categoryId: parseInt(formData.categoryId),
          quantity: parseInt(formData.quantity) || 0,
        });
        toast.success("Produto criado com sucesso!");
        setProductId(result.id);
        setActiveTab("images");
      }
    } catch (error: any) {
      const errorMessage = error.message || (productId ? "Erro ao atualizar produto" : "Erro ao criar produto");
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).map((file) => ({
        file,
        name: file.name.replace(/\.[^/.]+$/, ""),
        id: `${Date.now()}-${Math.random()}`,
      }));
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpdateFileName = (id: string, name: string) => {
    setSelectedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name } : f))
    );
  };

  const handleEditImage = (image: any) => {
    setEditingImageId(image.id);
    setImageForm({
      path: image.path,
      name: image.name,
    });
    setSelectedFile(null);
  };

  const handleCancelEditImage = () => {
    setEditingImageId(null);
    setImageForm({ path: "", name: "" });
    setSelectedFile(null);
    setSelectedFiles([]);
    const fileInput = document.getElementById('image-file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toast.error("Crie o produto primeiro");
      return;
    }

    if (editingImageId) {
      // Modo de edição - apenas atualizar nome
      if (!imageForm.name.trim()) {
        toast.error("Nome da imagem é obrigatório");
        return;
      }

      try {
        setIsUploading(true);
        await productImageService.update(productId, editingImageId, {
          name: imageForm.name,
        });
        toast.success("Imagem atualizada com sucesso!");
        handleCancelEditImage();
        loadImages();
      } catch (error: any) {
        toast.error(error.message || "Erro ao atualizar imagem");
        console.error(error);
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // Modo de criação - fazer upload de múltiplas imagens
    if (selectedFiles.length === 0) {
      toast.error("Selecione pelo menos uma imagem para upload");
      return;
    }

    // Validar que todos os arquivos têm nome
    const filesWithoutName = selectedFiles.filter((f) => !f.name.trim());
    if (filesWithoutName.length > 0) {
      toast.error("Todos os arquivos devem ter um nome");
      return;
    }

    try {
      setIsUploading(true);
      
      const token = localStorage.getItem("adminToken");
      const getApiUrl = (): string => {
        if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
        if (typeof window !== 'undefined' && window.location) {
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return "http://localhost:5001/api";
          }
          return "/api";
        }
        return "/api";
      };
      const API_URL = getApiUrl();

      // Fazer upload de todas as imagens
      const uploadPromises = selectedFiles.map(async (fileData) => {
        // Fazer upload da imagem
        const formData = new FormData();
        formData.append('image', fileData.file);

        const uploadResponse = await fetch(`${API_URL}/products/${productId}/images/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Erro ao fazer upload da imagem ${fileData.name}`);
        }

        const uploadData = await uploadResponse.json();

        // Criar registro da imagem no banco
        await productImageService.create(productId, {
          path: uploadData.path,
          name: fileData.name.trim(),
        });
      });

      // Aguardar todos os uploads
      await Promise.all(uploadPromises);

      toast.success(`${selectedFiles.length} imagem(ns) adicionada(s) com sucesso!`);
      setSelectedFiles([]);
      // Resetar input de arquivo
      const fileInput = document.getElementById('image-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      loadImages();
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar imagens");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditPrice = (price: any) => {
    setEditingPriceId(price.id);
    setPriceForm({
      value: Number(price.value).toString(),
      batch: price.batch.toString(),
      quantidadeCompra: (price.quantidadeCompra || 0).toString(),
    });
  };

  const handleCancelEditPrice = () => {
    setEditingPriceId(null);
    setPriceForm({ value: "", batch: "", quantidadeCompra: "0" });
  };

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toast.error("Crie o produto primeiro");
      return;
    }

    if (!priceForm.value || !priceForm.batch) {
      toast.error("Preencha todos os campos obrigatórios do preço");
      return;
    }

    try {
      if (editingPriceId) {
        // Modo de edição
        await productPriceService.update(productId, editingPriceId, {
          value: parseFloat(priceForm.value),
          batch: parseInt(priceForm.batch),
          quantidadeCompra: parseInt(priceForm.quantidadeCompra) || 0,
        });
        toast.success("Preço atualizado com sucesso!");
        handleCancelEditPrice();
      } else {
        // Modo de criação
        await productPriceService.create(productId, {
          value: parseFloat(priceForm.value),
          batch: parseInt(priceForm.batch),
          quantidadeCompra: parseInt(priceForm.quantidadeCompra) || 0,
        });
        toast.success("Preço adicionado com sucesso!");
        setPriceForm({ value: "", batch: "", quantidadeCompra: "0" });
      }
      loadPrices();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar preço");
      console.error(error);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!productId) return;
    if (!confirm("Tem certeza que deseja deletar esta imagem? Esta ação não pode ser desfeita e o arquivo será removido permanentemente.")) return;

    try {
      await productImageService.delete(productId, imageId);
      toast.success("Imagem deletada com sucesso!");
      loadImages();
    } catch (error: any) {
      toast.error("Erro ao deletar imagem");
      console.error(error);
    }
  };

  const handleActivateImage = async (imageId: number) => {
    if (!productId) return;
    try {
      await productImageService.update(productId, imageId, { active: true });
      toast.success("Imagem ativada com sucesso!");
      loadImages();
    } catch (error: any) {
      toast.error("Erro ao ativar imagem");
      console.error(error);
    }
  };

  const handleToggleFavorite = async (imageId: number, currentFavorite: boolean) => {
    if (!productId) return;
    try {
      await productImageService.update(productId, imageId, { favorite: !currentFavorite });
      toast.success(`Imagem ${!currentFavorite ? "marcada como favorita" : "desmarcada"}!`);
      loadImages();
    } catch (error: any) {
      toast.error("Erro ao atualizar favorita");
      console.error(error);
    }
  };

  const handleMoveImageUp = async (index: number) => {
    if (!productId || index === 0) return;

    const newOrder = [...images];
    const temp = newOrder[index].displayOrder;
    newOrder[index].displayOrder = newOrder[index - 1].displayOrder;
    newOrder[index - 1].displayOrder = temp;

    const updates = [
      { id: newOrder[index].id, displayOrder: newOrder[index].displayOrder },
      { id: newOrder[index - 1].id, displayOrder: newOrder[index - 1].displayOrder },
    ];

    try {
      await productImageService.updateOrder(productId, updates);
      toast.success("Ordem atualizada!");
      loadImages();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar ordem");
    }
  };

  const handleMoveImageDown = async (index: number) => {
    if (!productId || index === images.length - 1) return;

    const newOrder = [...images];
    const temp = newOrder[index].displayOrder;
    newOrder[index].displayOrder = newOrder[index + 1].displayOrder;
    newOrder[index + 1].displayOrder = temp;

    const updates = [
      { id: newOrder[index].id, displayOrder: newOrder[index].displayOrder },
      { id: newOrder[index + 1].id, displayOrder: newOrder[index + 1].displayOrder },
    ];

    try {
      await productImageService.updateOrder(productId, updates);
      toast.success("Ordem atualizada!");
      loadImages();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar ordem");
    }
  };

  const handleDeletePrice = async (priceId: number) => {
    if (!productId) return;
    if (!confirm("Tem certeza que deseja desativar este preço?")) return;

    try {
      await productPriceService.delete(productId, priceId);
      toast.success("Preço desativado com sucesso!");
      loadPrices();
    } catch (error: any) {
      toast.error("Erro ao desativar preço");
      console.error(error);
    }
  };

  const handleActivatePrice = async (priceId: number) => {
    if (!productId) return;
    try {
      await productPriceService.update(productId, priceId, { active: true });
      toast.success("Preço ativado com sucesso!");
      loadPrices();
    } catch (error: any) {
      toast.error("Erro ao ativar preço");
      console.error(error);
    }
  };

  const handleClose = () => {
    if (productId) {
      onProductChange?.();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background z-[100]" onInteractOutside={(e) => {
        // Permitir que o SelectContent funcione corretamente
        const target = e.target as HTMLElement;
        if (target.closest('[role="listbox"]')) {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <DialogTitle>
            {productId ? "Editar Produto" : "Cadastrar Novo Produto"}
          </DialogTitle>
          <DialogDescription>
            {productId
              ? "Edite as informações do produto, adicione imagens e preços"
              : "Preencha os dados para cadastrar um novo produto"}
          </DialogDescription>
        </DialogHeader>

        {isLoadingProduct ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Carregando dados do produto...</p>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="product" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Produto
            </TabsTrigger>
            <TabsTrigger value="images" disabled={!productId} className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Imagens
            </TabsTrigger>
            <TabsTrigger value="prices" disabled={!productId} className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Preços
            </TabsTrigger>
          </TabsList>

          {/* Tab: Produto */}
          <TabsContent value="product" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product-name">Nome do Produto *</Label>
                <Input
                  id="product-name"
                  placeholder="Ex: Camiseta Azul"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-category">Categoria *</Label>
                {isLoadingCategories ? (
                  <div className="space-y-2">
                    <Input
                      disabled
                      placeholder="Carregando categorias..."
                      className="bg-muted"
                    />
                    <p className="text-sm text-muted-foreground">
                      Aguarde enquanto carregamos as categorias...
                    </p>
                  </div>
                ) : categories.length === 0 ? (
                  <div className="space-y-2">
                    <Input
                      disabled
                      placeholder="Nenhuma categoria disponível"
                      className="bg-muted"
                    />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma categoria ativa disponível. Crie uma categoria primeiro.
                    </p>
                  </div>
                ) : (
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => {
                      console.log("Categoria selecionada:", value);
                      setFormData({ ...formData, categoryId: value });
                    }}
                    disabled={isLoading || isLoadingCategories}
                    required
                  >
                    <SelectTrigger 
                      onClick={() => console.log("SelectTrigger clicado, categorias disponíveis:", categories)}
                    >
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]" position="popper">
                      {categories.length > 0 ? (
                        categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          Nenhuma categoria disponível
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-description">Descrição</Label>
                <Textarea
                  id="product-description"
                  placeholder="Descrição do produto..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  disabled={isLoading}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-quantity">Quantidade</Label>
                <Input
                  id="product-quantity"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  disabled={isLoading}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading || categories.length === 0}>
                  {isLoading 
                    ? (productId ? "Atualizando..." : "Salvando...") 
                    : (productId ? "Atualizar Produto" : "Cadastrar Produto")}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Tab: Imagens */}
          <TabsContent value="images" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {editingImageId ? "Editar Imagem" : "Adicionar Imagens"}
                </h3>
                <form onSubmit={handleAddImage} className="space-y-4">
                  {!editingImageId && (
                    <div className="space-y-2">
                      <Label htmlFor="image-file">Selecionar Imagens (múltiplas) *</Label>
                      <Input
                        id="image-file"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        disabled={isUploading}
                        required={selectedFiles.length === 0}
                      />
                      <p className="text-sm text-muted-foreground">
                        Você pode selecionar múltiplas imagens de uma vez
                      </p>
                    </div>
                  )}

                  {editingImageId && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Para alterar a imagem, cancele a edição e adicione uma nova.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="image-name">Nome da Imagem *</Label>
                        <Input
                          id="image-name"
                          placeholder="Ex: Foto Frente"
                          value={imageForm.name}
                          onChange={(e) =>
                            setImageForm({ ...imageForm, name: e.target.value })
                          }
                          required
                          disabled={isUploading}
                        />
                      </div>
                    </>
                  )}

                  {selectedFiles.length > 0 && (
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4 space-y-4">
                        <h4 className="font-medium">
                          {selectedFiles.length} imagem(ns) selecionada(s)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedFiles.map((fileData) => (
                            <div
                              key={fileData.id}
                              className="border rounded-lg p-3 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {fileData.file.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {(fileData.file.size / 1024).toFixed(2)} KB
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveFile(fileData.id)}
                                  disabled={isUploading}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                              <div className="relative w-full h-32 border rounded overflow-hidden bg-muted">
                                <img
                                  src={URL.createObjectURL(fileData.file)}
                                  alt="Preview"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`image-name-${fileData.id}`} className="text-xs">
                                  Nome da Imagem *
                                </Label>
                                <Input
                                  id={`image-name-${fileData.id}`}
                                  placeholder="Ex: Foto Frente"
                                  value={fileData.name}
                                  onChange={(e) =>
                                    handleUpdateFileName(fileData.id, e.target.value)
                                  }
                                  required
                                  disabled={isUploading}
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        isUploading ||
                        (editingImageId
                          ? false
                          : selectedFiles.length === 0 ||
                            selectedFiles.some((f) => !f.name.trim()))
                      }
                    >
                      {editingImageId ? (
                        <>
                          <Pencil className="w-4 h-4 mr-2" />
                          {isUploading ? "Atualizando..." : "Atualizar Imagem"}
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          {isUploading
                            ? `Enviando ${selectedFiles.length} imagem(ns)...`
                            : `Adicionar ${selectedFiles.length || ""} Imagem(ns)`}
                        </>
                      )}
                    </Button>
                    {editingImageId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEditImage}
                        disabled={isUploading}
                      >
                        Cancelar
                      </Button>
                    )}
                    {!editingImageId && selectedFiles.length > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedFiles([]);
                          const fileInput = document.getElementById(
                            "image-file"
                          ) as HTMLInputElement;
                          if (fileInput) fileInput.value = "";
                        }}
                        disabled={isUploading}
                      >
                        Limpar Seleção
                      </Button>
                    )}
                  </div>
                </form>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Imagens Cadastradas</h3>
                {images.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma imagem cadastrada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Ordem</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Caminho</TableHead>
                        <TableHead>Favorita</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {images.map((image, index) => (
                        <TableRow 
                          key={image.id}
                          className={editingImageId === image.id ? "bg-muted" : "cursor-pointer hover:bg-muted/50"}
                          onClick={() => image.active && handleEditImage(image)}
                        >
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveImageUp(index);
                                }}
                                disabled={index === 0}
                                className="h-6 w-6 p-0"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveImageDown(index);
                                }}
                                disabled={index === images.length - 1}
                                className="h-6 w-6 p-0"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{image.id}</TableCell>
                          <TableCell>{image.name}</TableCell>
                          <TableCell className="max-w-xs truncate">{image.path}</TableCell>
                          <TableCell>
                            {image.active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFavorite(image.id, image.favorite || false);
                                }}
                                className="h-8 w-8 p-0"
                                title={image.favorite ? "Desmarcar favorita" : "Marcar como favorita"}
                              >
                                <Star 
                                  className={`w-4 h-4 ${image.favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} 
                                />
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={image.active ? "default" : "secondary"}>
                              {image.active ? "Ativa" : "Inativa"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {image.active ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditImage(image);
                                    }}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteImage(image.id);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleActivateImage(image.id);
                                  }}
                                  title="Ativar imagem"
                                >
                                  <RotateCcw className="w-4 h-4 text-green-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab: Preços */}
          <TabsContent value="prices" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {editingPriceId ? "Editar Preço" : "Adicionar Preço"}
                </h3>
                <form onSubmit={handleAddPrice} className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price-value">Valor *</Label>
                        <Input
                          id="price-value"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={priceForm.value}
                          onChange={(e) =>
                            setPriceForm({ ...priceForm, value: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price-batch">Lote (Quantidade) *</Label>
                        <Input
                          id="price-batch"
                          type="number"
                          min="1"
                          placeholder="10"
                          value={priceForm.batch}
                          onChange={(e) =>
                            setPriceForm({ ...priceForm, batch: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price-quantidade-compra">
                        Quantidade de Compra
                        <span className="text-xs text-muted-foreground ml-1">
                          (0 = 1 compra, &gt;0 = múltiplas)
                        </span>
                      </Label>
                      <Input
                        id="price-quantidade-compra"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={priceForm.quantidadeCompra}
                        onChange={(e) =>
                          setPriceForm({ ...priceForm, quantidadeCompra: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">
                      {editingPriceId ? (
                        <>
                          <Pencil className="w-4 h-4 mr-2" />
                          Atualizar Preço
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Preço
                        </>
                      )}
                    </Button>
                    {editingPriceId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEditPrice}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Preços Cadastrados</h3>
                {prices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum preço cadastrado</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Qtd. Compra</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prices.map((price) => (
                        <TableRow 
                          key={price.id}
                          className={editingPriceId === price.id ? "bg-muted" : "cursor-pointer hover:bg-muted/50"}
                          onClick={() => price.active && handleEditPrice(price)}
                        >
                          <TableCell className="font-medium">{price.id}</TableCell>
                          <TableCell>{formatPoints(Number(price.value))} pts</TableCell>
                          <TableCell>{price.batch}</TableCell>
                          <TableCell>{price.quantidadeCompra || 0}</TableCell>
                          <TableCell>
                            <Badge variant={price.active ? "default" : "secondary"}>
                              {price.active ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {price.active ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditPrice(price);
                                    }}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePrice(price.id);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleActivatePrice(price.id);
                                  }}
                                  title="Ativar preço"
                                >
                                  <RotateCcw className="w-4 h-4 text-green-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        )}
{/* 
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {productId ? "Fechar" : "Cancelar"}
          </Button>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
};

export default ProductDialog;
