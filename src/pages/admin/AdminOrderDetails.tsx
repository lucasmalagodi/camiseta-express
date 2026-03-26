import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Package, Building2, MapPin, Info, XCircle } from "lucide-react";
import { orderService, productService, agencyService, productVariantService } from "@/services/api";
import { toast } from "sonner";
import { formatPoints, formatModelName } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrderItem {
  id: number;
  productId: number;
  productName?: string;
  productVariantId?: number | null;
  quantity: number;
  pointsPerUnit: number;
  model?: string | null;
  size?: string | null;
}

interface OrderCancellation {
  id: number;
  orderId: number;
  reason: string;
  emailSent: boolean;
  emailBody: string | null;
  createdAt: string;
}

interface Order {
  id: number;
  agencyId: number;
  totalPoints: number;
  status: "PENDING" | "CONFIRMED" | "CANCELED";
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  cancellation?: OrderCancellation;
}

const AdminOrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Record<number, any>>({});
  const [agency, setAgency] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSendEmail, setCancelSendEmail] = useState(true);
  const [cancelEmailMessage, setCancelEmailMessage] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const [isEditVariantOpen, setIsEditVariantOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [editModel, setEditModel] = useState<string>("");
  const [editSize, setEditSize] = useState<string>("");
  const [isSavingVariant, setIsSavingVariant] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadOrderDetails = async () => {
      try {
        setIsLoading(true);
        const orderData = await orderService.getById(Number(id));
        setOrder(orderData);

        // Buscar dados da agência
        try {
          const agencyData = await agencyService.getById(orderData.agencyId);
          setAgency(agencyData);
        } catch (error) {
          console.error("Erro ao buscar agência:", error);
        }

        // Buscar detalhes dos produtos
        const productIds = orderData.items.map((item: OrderItem) => item.productId);
        const uniqueProductIds = [...new Set(productIds)];
        const productPromises = uniqueProductIds.map((productId: number) =>
          Promise.all([
            productService.getById(productId).catch(() => null),
            productVariantService.getAll(productId).catch(() => []),
          ]).then(([product, variants]) => ({ productId, product, variants }))
        );
        const productResults = await Promise.all(productPromises);
        
        const productsMap: Record<number, any> = {};
        productResults.forEach(({ productId, product, variants }: any) => {
          if (product) {
            productsMap[product.id] = { ...product, variants: Array.isArray(variants) ? variants : [] };
          } else {
            // Mesmo se falhar produto, manter variants para liberar ação quando possível
            productsMap[productId] = { id: productId, variants: Array.isArray(variants) ? variants : [] };
          }
        });
        setProducts(productsMap);
      } catch (error) {
        toast.error("Erro ao carregar detalhes do pedido");
        console.error(error);
        navigate("/admin/pedidos");
      } finally {
        setIsLoading(false);
      }
    };

    loadOrderDetails();
  }, [id, navigate]);

  const openEditVariant = (item: OrderItem) => {
    const product = products[item.productId];
    const variants: any[] = Array.isArray(product?.variants) ? product.variants : [];
    if (variants.length === 0) {
      toast.error("Este produto não possui variações cadastradas.");
      return;
    }
    const currentModel = item.model || "";
    const currentSize = item.size || "";
    setEditingItem(item);
    setEditModel(currentModel);
    setEditSize(currentSize);
    setIsEditVariantOpen(true);
  };

  const getVariantOptionsForEditing = () => {
    if (!editingItem) return { variants: [] as any[], models: [] as string[], sizes: [] as string[] };
    const product = products[editingItem.productId];
    const variants: any[] = (Array.isArray(product?.variants) ? product.variants : []).filter(
      (v: any) => v && v.active !== false
    );
    const models = [...new Set(variants.map((v: any) => String(v.model)).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
    const sizes = [
      ...new Set(
        variants
          .filter((v: any) => String(v.model) === String(editModel))
          .map((v: any) => String(v.size))
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return { variants, models, sizes };
  };

  const saveVariantChange = async () => {
    if (!order || !editingItem) return;
    const { variants } = getVariantOptionsForEditing();
    const chosen = variants.find((v: any) => String(v.model) === String(editModel) && String(v.size) === String(editSize));
    if (!chosen?.id) {
      toast.error("Selecione um modelo e tamanho válidos.");
      return;
    }
    if (editingItem.productVariantId && Number(editingItem.productVariantId) === Number(chosen.id)) {
      toast.error("A variação selecionada é igual à atual.");
      return;
    }
    try {
      setIsSavingVariant(true);
      await orderService.updateOrderItemVariant(order.id, editingItem.id, Number(chosen.id));
      toast.success("Tipo/tamanho atualizado e estoque ajustado.");
      const updated = await orderService.getById(order.id);
      setOrder(updated);
      setIsEditVariantOpen(false);
      setEditingItem(null);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao alterar tipo/tamanho");
    } finally {
      setIsSavingVariant(false);
    }
  };

  // Template padrão do e-mail de cancelamento (aceita a mensagem e a pessoa pode alterar)
  const buildCancelEmailTemplate = (reason: string) => {
    if (!order) return "";
    return `Informamos que o pedido #${order.id} foi cancelado.\n\nMotivo do cancelamento:\n${reason || "(informe o motivo)"}`;
  };

  const openCancelModal = () => {
    setCancelReason("");
    setCancelSendEmail(true);
    setCancelEmailMessage(order ? buildCancelEmailTemplate("") : "");
    setIsCancelModalOpen(true);
  };

  const handleCancelReasonChange = (value: string) => {
    setCancelReason(value);
    setCancelEmailMessage(order ? buildCancelEmailTemplate(value) : value);
  };

  const handleConfirmCancel = async () => {
    if (!order || !cancelReason.trim()) {
      toast.error("Informe o motivo do cancelamento.");
      return;
    }
    try {
      setIsCancelling(true);
      await orderService.cancelWithReason(order.id, {
        reason: cancelReason.trim(),
        sendEmail: cancelSendEmail,
        emailMessage: cancelSendEmail ? cancelEmailMessage.trim() || cancelReason.trim() : undefined,
      });
      toast.success("Pedido cancelado. Os pontos foram devolvidos à agência.");
      setIsCancelModalOpen(false);
      const updated = await orderService.getById(order.id);
      setOrder(updated);
      if (agency) {
        const agencyData = await agencyService.getById(updated.agencyId);
        setAgency(agencyData);
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao cancelar pedido");
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge className="bg-green-500">Confirmado</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case "CANCELED":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCep = (cep: string) => {
    // Formatar CEP: XXXXX-XXX
    const clean = cep.replace(/\D/g, "");
    if (clean.length === 8) {
      return `${clean.substring(0, 5)}-${clean.substring(5)}`;
    }
    return cep;
  };

  const formatCnpj = (cnpj: string) => {
    const clean = cnpj.replace(/\D/g, "");
    if (clean.length !== 14) return cnpj;
    return `${clean.substring(0, 2)}.${clean.substring(2, 5)}.${clean.substring(5, 8)}/${clean.substring(8, 12)}-${clean.substring(12)}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <p className="text-muted-foreground">Pedido não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/pedidos")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Pedido #{order.id}</h1>
            <p className="text-muted-foreground mt-1">
              Detalhes completos do pedido
            </p>
          </div>
        </div>
        {order.status === "CONFIRMED" && (
          <Button
            variant="destructive"
            onClick={openCancelModal}
            className="flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Cancelar pedido
          </Button>
        )}
      </div>

      {/* Order Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Informações do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID:</span>
              <span className="font-medium">#{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              {getStatusBadge(order.status)}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-bold text-primary text-lg">
                {formatPoints(order.totalPoints)} pts
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Criado em:</span>
              <span className="text-sm">{formatDate(order.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Atualizado em:</span>
              <span className="text-sm">{formatDate(order.updatedAt)}</span>
            </div>
          </CardContent>
        </Card>

        {order.status === "CANCELED" && order.cancellation && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" />
                Cancelamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-muted-foreground text-sm">Motivo:</span>
                <p className="mt-1 whitespace-pre-wrap">{order.cancellation.reason}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  Data: {formatDate(order.cancellation.createdAt)}
                </span>
                {order.cancellation.emailSent && (
                  <Badge variant="secondary">E-mail enviado à agência</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Informações da Agência
              </div>
              {agency && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAgencyModalOpen(true)}
                >
                  <Info className="w-4 h-4 mr-2" />
                  Ver Todos os Dados
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID da Agência:</span>
              <span className="font-medium">{order.agencyId}</span>
            </div>
            {agency && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nome:</span>
                  <span className="font-medium">{agency.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="text-sm">{agency.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CNPJ:</span>
                  <span className="text-sm">{agency.cnpj}</span>
                </div>
                {agency.branch && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Filial:</span>
                    <span className="font-medium">{agency.branch}</span>
                  </div>
                )}
                {(agency.executive || agency.executive_name) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Executivo:</span>
                    <div className="text-right">
                      {agency.executive ? (
                        <>
                          <div className="font-medium">
                            {agency.executive.name || agency.executive.code}
                          </div>
                          {agency.executive.email && (
                            <div className="text-xs text-muted-foreground">
                              {agency.executive.email}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="font-medium">{agency.executive_name}</div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={agency.active ? "default" : "secondary"}>
                    {agency.active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Address Card */}
      {agency?.address && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Endereço de Entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[100px]">CEP:</span>
                <span className="font-medium">{formatCep(agency.address.cep)}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[100px]">Rua:</span>
                <span className="font-medium">{agency.address.street}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[100px]">Número:</span>
                <span className="font-medium">{agency.address.number}</span>
              </div>
              {agency.address.complement && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground min-w-[100px]">Complemento:</span>
                  <span className="font-medium">{agency.address.complement}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[100px]">Bairro:</span>
                <span className="font-medium">{agency.address.neighborhood}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[100px]">Cidade:</span>
                <span className="font-medium">{agency.address.city}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[100px]">Estado:</span>
                <span className="font-medium">{agency.address.state}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm font-medium text-foreground">Endereço Completo:</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {agency.address.street}, {agency.address.number}
                  {agency.address.complement ? `, ${agency.address.complement}` : ""}
                  <br />
                  {agency.address.neighborhood} - {agency.address.city}/{agency.address.state}
                  <br />
                  CEP: {formatCep(agency.address.cep)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Itens do Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Pontos por Unidade</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right w-[160px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => {
                  const product = products[item.productId];
                  const subtotal = item.quantity * item.pointsPerUnit;
                  const hasVariants = Array.isArray(product?.variants) && product.variants.length > 0;
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">
                          {product?.name || `Produto #${item.productId}`}
                        </div>
                        {product && (
                          <div className="text-sm text-muted-foreground">
                            ID: {item.productId}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.model ? formatModelName(item.model) : "-"}
                      </TableCell>
                      <TableCell>
                        {item.size || "-"}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatPoints(item.pointsPerUnit)} pts</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatPoints(subtotal)} pts
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!hasVariants || order.status !== "CONFIRMED"}
                          onClick={() => openEditVariant(item)}
                        >
                          Alterar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-bold">
                  <TableCell colSpan={6} className="text-right">
                    Total:
                  </TableCell>
                  <TableCell className="text-right text-primary text-lg">
                    {formatPoints(order.totalPoints)} pts
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal alterar tipo/tamanho */}
      <Dialog
        open={isEditVariantOpen}
        onOpenChange={(open) => {
          setIsEditVariantOpen(open);
          if (!open) {
            setEditingItem(null);
            setEditModel("");
            setEditSize("");
            setIsSavingVariant(false);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Alterar tipo/tamanho</DialogTitle>
            <DialogDescription>
              A troca só será aplicada se houver estoque disponível na nova variação. Ao trocar, o estoque da variação
              antiga é devolvido.
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 bg-muted/50 text-sm">
                <p className="font-medium">Item #{editingItem.id}</p>
                <p>Produto: {products[editingItem.productId]?.name || `#${editingItem.productId}`}</p>
                <p className="text-muted-foreground">
                  Atual: {editingItem.model ? formatModelName(editingItem.model) : "—"} {editingItem.size || ""}
                  {" · "}Qtd {editingItem.quantity}
                </p>
              </div>

              {(() => {
                const { models, sizes } = getVariantOptionsForEditing();
                const hasModel = Boolean(editModel);
                return (
                  <>
                    <div className="space-y-2">
                      <Label>Tipo (modelo)</Label>
                      <Select
                        value={editModel || ""}
                        onValueChange={(v) => {
                          setEditModel(v);
                          setEditSize("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((m) => (
                            <SelectItem key={m} value={m}>
                              {formatModelName(m)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tamanho</Label>
                      <Select value={editSize || ""} onValueChange={setEditSize} disabled={!hasModel}>
                        <SelectTrigger>
                          <SelectValue placeholder={hasModel ? "Selecione" : "Selecione o tipo primeiro"} />
                        </SelectTrigger>
                        <SelectContent>
                          {sizes.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                );
              })()}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditVariantOpen(false)}
                  disabled={isSavingVariant}
                >
                  Cancelar
                </Button>
                <Button onClick={saveVariantChange} disabled={!editModel || !editSize || isSavingVariant}>
                  {isSavingVariant ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de cancelamento */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Cancelar pedido #{order?.id}
            </DialogTitle>
            <DialogDescription>
              O pedido será cancelado, os pontos serão devolvidos à agência e o estoque dos itens será revertido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border p-3 bg-muted/50 text-sm">
              <p className="font-medium">Resumo do pedido</p>
              <p>Agência: {agency?.name || `#${order?.agencyId}`}</p>
              <p>Total: {order && formatPoints(order.totalPoints)} pts</p>
              <p className="text-muted-foreground mt-1">
                {order?.items?.length} item(ns)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Motivo do cancelamento *</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Informe o motivo do cancelamento..."
                value={cancelReason}
                onChange={(e) => handleCancelReasonChange(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cancel-send-email"
                checked={cancelSendEmail}
                onCheckedChange={(checked) => setCancelSendEmail(checked === true)}
              />
              <Label htmlFor="cancel-send-email" className="cursor-pointer">
                Enviar e-mail para a agência com o motivo
              </Label>
            </div>
            {cancelSendEmail && (
              <div className="space-y-2">
                <Label htmlFor="cancel-email-message">Mensagem do e-mail (pode alterar)</Label>
                <Textarea
                  id="cancel-email-message"
                  value={cancelEmailMessage}
                  onChange={(e) => setCancelEmailMessage(e.target.value)}
                  rows={5}
                  className="resize-none font-mono text-sm"
                  placeholder="Template com o motivo será preenchido automaticamente."
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsCancelModalOpen(false)}
              disabled={isCancelling}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={!cancelReason.trim() || isCancelling}
            >
              {isCancelling ? "Cancelando..." : "Confirmar cancelamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal com todos os dados da agência */}
      <Dialog open={isAgencyModalOpen} onOpenChange={setIsAgencyModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Dados Completos da Agência
            </DialogTitle>
            <DialogDescription>
              Informações detalhadas da agência relacionada a este pedido
            </DialogDescription>
          </DialogHeader>
          
          {agency && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Informações Básicas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">ID:</span>
                    <p className="font-medium">{agency.id || order.agencyId}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Nome:</span>
                    <p className="font-medium">{agency.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">CNPJ:</span>
                    <p className="font-medium font-mono">{formatCnpj(agency.cnpj)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <p className="font-medium">{agency.email}</p>
                  </div>
                  {agency.phone && (
                    <div>
                      <span className="text-sm text-muted-foreground">Telefone:</span>
                      <p className="font-medium">{agency.phone}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <div className="mt-1">
                      <Badge variant={agency.active ? "default" : "secondary"}>
                        {agency.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                  </div>
                  {agency.balance !== undefined && (
                    <div>
                      <span className="text-sm text-muted-foreground">Saldo de Pontos:</span>
                      <p className="font-medium text-primary">
                        {formatPoints(agency.balance)} pts
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Filial e Executivo */}
              {(agency.branch || agency.executive || agency.executive_name) && (
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-semibold text-lg">Filial e Executivo</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {agency.branch && (
                      <div>
                        <span className="text-sm text-muted-foreground">Filial:</span>
                        <p className="font-medium">{agency.branch}</p>
                      </div>
                    )}
                    {(agency.executive || agency.executive_name) && (
                      <div>
                        <span className="text-sm text-muted-foreground">Executivo:</span>
                        <div>
                          {agency.executive ? (
                            <>
                              <p className="font-medium">
                                {agency.executive.name || agency.executive.code}
                              </p>
                              {agency.executive.email && (
                                <p className="text-sm text-muted-foreground">
                                  {agency.executive.email}
                                </p>
                              )}
                              {agency.executive.code && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Código: {agency.executive.code}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="font-medium">{agency.executive_name}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Endereço */}
              {agency.address && (
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Endereço
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">CEP:</span>
                      <p className="font-medium">{formatCep(agency.address.cep)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Rua:</span>
                      <p className="font-medium">{agency.address.street}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Número:</span>
                      <p className="font-medium">{agency.address.number}</p>
                    </div>
                    {agency.address.complement && (
                      <div>
                        <span className="text-sm text-muted-foreground">Complemento:</span>
                        <p className="font-medium">{agency.address.complement}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm text-muted-foreground">Bairro:</span>
                      <p className="font-medium">{agency.address.neighborhood}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Cidade:</span>
                      <p className="font-medium">{agency.address.city}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Estado:</span>
                      <p className="font-medium">{agency.address.state}</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Endereço Completo:</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {agency.address.street}, {agency.address.number}
                      {agency.address.complement ? `, ${agency.address.complement}` : ""}
                      <br />
                      {agency.address.neighborhood} - {agency.address.city}/{agency.address.state}
                      <br />
                      CEP: {formatCep(agency.address.cep)}
                    </p>
                  </div>
                </div>
              )}

              {/* Datas */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-lg">Datas</h3>
                <div className="grid grid-cols-2 gap-4">
                  {agency.createdAt && (
                    <div>
                      <span className="text-sm text-muted-foreground">Criado em:</span>
                      <p className="font-medium text-sm">
                        {formatDate(agency.createdAt)}
                      </p>
                    </div>
                  )}
                  {agency.updatedAt && (
                    <div>
                      <span className="text-sm text-muted-foreground">Atualizado em:</span>
                      <p className="font-medium text-sm">
                        {formatDate(agency.updatedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrderDetails;
