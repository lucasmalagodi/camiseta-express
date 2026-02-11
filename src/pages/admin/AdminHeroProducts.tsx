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
import { Plus, Pencil, Trash2, Power, RotateCcw, ArrowUp, ArrowDown, GripVertical, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { heroProductService, productService } from "@/services/api";
import { toast } from "sonner";
import ImageCropDialog from "@/components/admin/ImageCropDialog";

interface HeroProduct {
  id: number;
  productId: number | null;
  bannerType: 'PRODUCT' | 'EXTERNAL';
  imageDesktop: string | null;
  imageMobile: string | null;
  externalUrl: string | null;
  displayOrder: number;
  displayDuration: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Product {
  id: number;
  name: string;
  active: boolean;
}

const AdminHeroProducts = () => {
  const [heroProducts, setHeroProducts] = useState<HeroProduct[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [bannerType, setBannerType] = useState<'PRODUCT' | 'EXTERNAL'>('PRODUCT');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [externalUrl, setExternalUrl] = useState<string>('');
  const [imageDesktop, setImageDesktop] = useState<string>('');
  const [imageMobile, setImageMobile] = useState<string>('');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [displayDuration, setDisplayDuration] = useState<number>(5);
  const [isUploadingDesktop, setIsUploadingDesktop] = useState(false);
  const [isUploadingMobile, setIsUploadingMobile] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [cropImageType, setCropImageType] = useState<'desktop' | 'mobile'>('desktop');

  const loadHeroProducts = async () => {
    try {
      setIsLoading(true);
      const data = await heroProductService.getAll();
      setHeroProducts(data);
    } catch (error) {
      toast.error("Erro ao carregar produtos em destaque");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      // productService.getAll já retorna data.data || [], então é um array
      const data = await productService.getAll();
      
      if (!Array.isArray(data)) {
        console.error("Erro: productService.getAll não retornou um array", data);
        setAllProducts([]);
        return;
      }
      
      // Filtrar apenas produtos ativos e que não estão em destaque (apenas PRODUCT banners)
      // Se estiver editando, permitir o produto atual
      const currentProductId = editingId 
        ? heroProducts.find(hp => hp.id === editingId && hp.bannerType === 'PRODUCT')?.productId 
        : null;
      const heroProductIds = heroProducts
        .filter(hp => hp.id !== editingId && hp.bannerType === 'PRODUCT' && hp.productId)
        .map(hp => hp.productId!)
        .filter((id): id is number => id !== null);
      
      const availableProducts = data.filter(
        (p: any) => {
          // Verificar se o produto está ativo (pode ser boolean ou number)
          const isActive = p.active === true || p.active === 1 || p.active === '1';
          // Verificar se não está em outro banner (exceto o atual se estiver editando)
          const isNotInHero = !heroProductIds.includes(p.id);
          const isCurrentProduct = p.id === currentProductId;
          return isActive && (isNotInHero || isCurrentProduct);
        }
      );
      
      setAllProducts(availableProducts);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      toast.error("Erro ao carregar produtos");
      setAllProducts([]);
    }
  };

  useEffect(() => {
    loadHeroProducts();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [isDialogOpen, heroProducts, editingId]);

  const getProductName = (productId: number) => {
    // Buscar nome do produto fazendo uma requisição ou usando cache
    // Por enquanto, vamos mostrar o ID
    return `Produto #${productId}`;
  };

  const handleAdd = () => {
    setEditingId(null);
    setBannerType('PRODUCT');
    setSelectedProductId(null);
    setExternalUrl('');
    setImageDesktop('');
    setImageMobile('');
    setDisplayOrder(heroProducts.length > 0 ? Math.max(...heroProducts.map(hp => hp.displayOrder)) + 1 : 0);
    setDisplayDuration(5);
    setIsDialogOpen(true);
  };

  const handleEdit = (heroProduct: HeroProduct) => {
    setEditingId(heroProduct.id);
    setBannerType(heroProduct.bannerType);
    setSelectedProductId(heroProduct.productId);
    setExternalUrl(heroProduct.externalUrl || '');
    setImageDesktop(heroProduct.imageDesktop || '');
    setImageMobile(heroProduct.imageMobile || '');
    setDisplayOrder(heroProduct.displayOrder);
    setDisplayDuration(heroProduct.displayDuration || 5);
    setIsDialogOpen(true);
  };

  const handleFileSelect = (type: 'desktop' | 'mobile', file: File) => {
    // Criar URL temporária para preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageSrc = e.target?.result as string;
      setCropImageSrc(imageSrc);
      setCropImageType(type);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    try {
      const type = cropImageType;
      
      if (type === 'desktop') {
        setIsUploadingDesktop(true);
      } else {
        setIsUploadingMobile(true);
      }

      // Converter Blob para File
      const file = new File([croppedImageBlob], `banner-${type}-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });

      const result = await heroProductService.uploadBannerImage(type, file);
      
      if (type === 'desktop') {
        setImageDesktop(result.path);
      } else {
        setImageMobile(result.path);
      }

      toast.success(`Imagem ${type === 'desktop' ? 'desktop' : 'mobile'} enviada com sucesso!`);
    } catch (error: any) {
      toast.error(error.message || `Erro ao fazer upload da imagem ${cropImageType}`);
    } finally {
      if (cropImageType === 'desktop') {
        setIsUploadingDesktop(false);
      } else {
        setIsUploadingMobile(false);
      }
      setCropDialogOpen(false);
      setCropImageSrc('');
    }
  };

  const handleSave = async () => {
    try {
      // Validações baseadas no tipo de banner
      if (bannerType === 'PRODUCT') {
        if (!selectedProductId) {
          toast.error("Selecione um produto");
          return;
        }
        // Para PRODUCT, imageDesktop é opcional (pode usar imagem do produto)
      } else {
        if (!externalUrl) {
          toast.error("Informe a URL externa");
          return;
        }
        // Para EXTERNAL, imageDesktop é obrigatório
        if (!imageDesktop) {
          toast.error("É necessário fazer upload da imagem desktop para banners externos");
          return;
        }
      }

      const data: any = {
        bannerType,
        imageDesktop: imageDesktop || undefined,
        imageMobile: imageMobile || undefined,
        displayOrder,
        displayDuration,
      };

      if (bannerType === 'PRODUCT') {
        data.productId = selectedProductId;
      } else {
        data.externalUrl = externalUrl;
      }

      if (editingId) {
        await heroProductService.update(editingId, data);
        toast.success("Banner atualizado com sucesso!");
      } else {
        await heroProductService.create(data);
        toast.success("Banner adicionado com sucesso!");
      }

      setIsDialogOpen(false);
      loadHeroProducts();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar banner");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja remover este produto dos destaques?")) {
      return;
    }

    try {
      await heroProductService.delete(id);
      toast.success("Produto removido dos destaques!");
      loadHeroProducts();
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover produto");
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      await heroProductService.update(id, { active: !currentStatus });
      toast.success(`Produto ${!currentStatus ? "ativado" : "inativado"} com sucesso!`);
      loadHeroProducts();
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar status");
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newOrder = [...heroProducts];
    const temp = newOrder[index].displayOrder;
    newOrder[index].displayOrder = newOrder[index - 1].displayOrder;
    newOrder[index - 1].displayOrder = temp;

    const updates = [
      { id: newOrder[index].id, displayOrder: newOrder[index].displayOrder },
      { id: newOrder[index - 1].id, displayOrder: newOrder[index - 1].displayOrder },
    ];

    try {
      await heroProductService.updateOrder(updates);
      toast.success("Ordem atualizada!");
      loadHeroProducts();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar ordem");
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === heroProducts.length - 1) return;

    const newOrder = [...heroProducts];
    const temp = newOrder[index].displayOrder;
    newOrder[index].displayOrder = newOrder[index + 1].displayOrder;
    newOrder[index + 1].displayOrder = temp;

    const updates = [
      { id: newOrder[index].id, displayOrder: newOrder[index].displayOrder },
      { id: newOrder[index + 1].id, displayOrder: newOrder[index + 1].displayOrder },
    ];

    try {
      await heroProductService.updateOrder(updates);
      toast.success("Ordem atualizada!");
      loadHeroProducts();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar ordem");
    }
  };

  // Carregar nomes dos produtos
  const [productNames, setProductNames] = useState<Record<number, string>>({});
  useEffect(() => {
    const loadProductNames = async () => {
      const names: Record<number, string> = {};
      for (const hp of heroProducts) {
        if (hp.bannerType === 'PRODUCT' && hp.productId) {
          try {
            const product = await productService.getById(hp.productId);
            names[hp.productId] = product.name;
          } catch (error) {
            names[hp.productId] = `Produto #${hp.productId}`;
          }
        }
      }
      setProductNames(names);
    };
    if (heroProducts.length > 0) {
      loadProductNames();
    }
  }, [heroProducts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Banners em Destaque</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os banners exibidos na seção hero (produtos ou URLs externas)
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Banner
        </Button>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : heroProducts.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">Nenhum produto em destaque cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Ordem</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Produto/URL</TableHead>
                  <TableHead>Ordem de Exibição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {heroProducts.map((heroProduct, index) => (
                  <TableRow key={heroProduct.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === heroProducts.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={heroProduct.bannerType === 'PRODUCT' ? 'default' : 'secondary'}>
                        {heroProduct.bannerType === 'PRODUCT' ? 'Produto' : 'Externo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {heroProduct.bannerType === 'PRODUCT' 
                        ? (productNames[heroProduct.productId || 0] || `Produto #${heroProduct.productId}`)
                        : (heroProduct.externalUrl || '-')}
                    </TableCell>
                    <TableCell>{heroProduct.displayOrder}</TableCell>
                    <TableCell>
                      <Badge variant={heroProduct.active ? "default" : "secondary"}>
                        {heroProduct.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(heroProduct.id, heroProduct.active)}
                          title={heroProduct.active ? "Inativar" : "Ativar"}
                        >
                          {heroProduct.active ? (
                            <Power className="w-4 h-4 text-orange-600" />
                          ) : (
                            <RotateCcw className="w-4 h-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(heroProduct)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(heroProduct.id)}
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
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

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Banner" : "Adicionar Banner"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Atualize as informações do banner"
                : "Crie um novo banner (produto ou externo)"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bannerType">Tipo de Banner</Label>
              <Select
                value={bannerType}
                onValueChange={(value) => {
                  setBannerType(value as 'PRODUCT' | 'EXTERNAL');
                  setSelectedProductId(null);
                  setExternalUrl('');
                }}
              >
                <SelectTrigger id="bannerType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUCT">Produto</SelectItem>
                  <SelectItem value="EXTERNAL">URL Externa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bannerType === 'PRODUCT' ? (
              <div>
                <Label htmlFor="product">Produto *</Label>
                <Select
                  value={selectedProductId?.toString() || ""}
                  onValueChange={(value) => setSelectedProductId(parseInt(value))}
                >
                  <SelectTrigger id="product">
                    <SelectValue placeholder={allProducts.length === 0 ? "Nenhum produto disponível" : "Selecione um produto"} />
                  </SelectTrigger>
                  <SelectContent>
                    {allProducts.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Nenhum produto disponível
                      </div>
                    ) : (
                      allProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name || `Produto #${product.id}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {allProducts.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Todos os produtos ativos já estão em destaque ou não há produtos ativos cadastrados
                  </p>
                )}
              </div>
            ) : (
              <div>
                <Label htmlFor="externalUrl">URL Externa</Label>
                <Input
                  id="externalUrl"
                  type="url"
                  placeholder="https://exemplo.com"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label>
                Imagem Desktop {bannerType === 'EXTERNAL' ? '*' : '(opcional)'}
              </Label>
              {bannerType === 'PRODUCT' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Se não fizer upload, será usada a imagem do produto selecionado
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect('desktop', file);
                    }
                  }}
                  disabled={isUploadingDesktop}
                />
                {imageDesktop && (
                  <div className="flex items-center gap-2">
                    <img src={imageDesktop.startsWith('http') ? imageDesktop : `${window.location.origin}${imageDesktop}`} alt="Desktop" className="w-16 h-16 object-cover rounded" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setImageDesktop('')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              {isUploadingDesktop && <p className="text-sm text-muted-foreground mt-1">Enviando...</p>}
            </div>

            <div>
              <Label>Imagem Mobile (opcional)</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect('mobile', file);
                    }
                  }}
                  disabled={isUploadingMobile}
                />
                {imageMobile && (
                  <div className="flex items-center gap-2">
                    <img src={imageMobile.startsWith('http') ? imageMobile : `${window.location.origin}${imageMobile}`} alt="Mobile" className="w-16 h-16 object-cover rounded" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setImageMobile('')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              {isUploadingMobile && <p className="text-sm text-muted-foreground mt-1">Enviando...</p>}
              <p className="text-xs text-muted-foreground mt-1">
                Se não for informada, será usada a imagem desktop
              </p>
            </div>

            <div>
              <Label htmlFor="order">Ordem de Exibição</Label>
              <Input
                id="order"
                type="number"
                min="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label htmlFor="displayDuration">Tempo de Exibição (segundos)</Label>
              <Input
                id="displayDuration"
                type="number"
                min="1"
                max="60"
                value={displayDuration}
                onChange={(e) => setDisplayDuration(parseInt(e.target.value) || 5)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tempo que o banner ficará exibido antes de trocar para o próximo (1-60 segundos)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Crop de Imagem */}
      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageSrc={cropImageSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={cropImageType === 'desktop' ? 16 / 9 : 9 / 16}
        title={`Cortar Imagem ${cropImageType === 'desktop' ? 'Desktop' : 'Mobile'}`}
      />
    </div>
  );
};

export default AdminHeroProducts;
