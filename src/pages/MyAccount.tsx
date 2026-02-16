import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingBag,
  MessageSquare,
  Send,
  Plus,
  Eye,
  Package,
  FileText,
  Loader2,
  User,
  Save,
  CheckCircle2,
} from "lucide-react";
import { orderService, ticketService, legalDocumentService, agencyService, agencyLegalDocumentService } from "@/services/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatPoints } from "@/lib/utils";

interface Order {
  id: number;
  agencyId: number;
  totalPoints: number;
  status: "PENDING" | "CONFIRMED" | "CANCELED";
  createdAt: string;
  updatedAt: string;
  itemsCount: number;
}

interface Ticket {
  id: number;
  subject: string;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  created_at: string;
  updated_at: string;
  message_count?: number;
}

const MyAccount = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { agency } = useAuth();
  const [activeTab, setActiveTab] = useState("orders");
  
  // My Data state
  const [agencyData, setAgencyData] = useState<any | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSavingData, setIsSavingData] = useState(false);
  const [dataFormData, setDataFormData] = useState({
    name: "",
    phone: "",
    address: {
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    },
  });

  // Accepted documents state
  const [acceptedDocuments, setAcceptedDocuments] = useState<any[]>([]);
  const [isLoadingAcceptedDocs, setIsLoadingAcceptedDocs] = useState(false);

  // Detectar rota e abrir aba correspondente
  useEffect(() => {
    if (location.pathname === "/contato") {
      setActiveTab("contact");
    } else if (location.pathname === "/tickets") {
      setActiveTab("tickets");
    } else if (location.pathname === "/pedidos") {
      setActiveTab("orders");
    }
  }, [location.pathname]);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  // Contact state
  const [contactFormData, setContactFormData] = useState({
    subject: "",
    message: "",
  });
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Campaign Rules state
  const [campaignRules, setCampaignRules] = useState<any | null>(null);
  const [isViewingRules, setIsViewingRules] = useState(false);

  // Document viewing state
  const [isViewingDocuments, setIsViewingDocuments] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<any | null>(null);

  useEffect(() => {
    if (!agency) {
      toast.error("Você precisa estar logado para acessar esta página");
      navigate("/login");
      return;
    }

    loadOrders();
    loadTickets();
    loadCampaignRules();
    loadAgencyData();
    loadAcceptedDocuments();
  }, [agency]);

  // Detectar rota e abrir aba correspondente
  useEffect(() => {
    if (location.pathname === "/contato") {
      setActiveTab("contact");
    } else if (location.pathname === "/tickets") {
      setActiveTab("tickets");
    } else if (location.pathname === "/pedidos") {
      setActiveTab("orders");
    }
  }, [location.pathname]);

  const loadOrders = async () => {
    try {
      setIsLoadingOrders(true);
      const data = await orderService.getMyOrders();
      setOrders(data);
    } catch (error: any) {
      console.error("Erro ao carregar pedidos:", error);
      toast.error(error.message || "Erro ao carregar pedidos");
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const loadTickets = async () => {
    try {
      setIsLoadingTickets(true);
      const data = await ticketService.getAgencyTickets();
      setTickets(data);
    } catch (error: any) {
      console.error("Erro ao carregar tickets:", error);
      toast.error(error.message || "Erro ao carregar tickets");
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const loadCampaignRules = async () => {
    try {
      const rules = await legalDocumentService.getActiveByType("CAMPAIGN_RULES").catch(() => null);
      setCampaignRules(rules);
    } catch (error) {
      // Pode não haver regras ativas
      setCampaignRules(null);
    }
  };

  const loadAgencyData = async () => {
    if (!agency) return;
    
    setIsLoadingData(true);
    try {
      const data = await agencyService.getMe();
      setAgencyData(data);
      setDataFormData({
        name: data.name || "",
        phone: data.phone || "",
        address: data.address || {
          cep: "",
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "",
        },
      });
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados da conta");
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadAcceptedDocuments = async () => {
    if (!agency) return;
    
    setIsLoadingAcceptedDocs(true);
    try {
      const data = await agencyLegalDocumentService.getAccepted();
      setAcceptedDocuments(data);
    } catch (error: any) {
      console.error("Erro ao carregar documentos aceitos:", error);
      // Não mostrar erro, pode não ter documentos aceitos ainda
    } finally {
      setIsLoadingAcceptedDocs(false);
    }
  };

  const handleSaveData = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingData(true);

    try {
      await agencyService.updateMe({
        name: dataFormData.name,
        phone: dataFormData.phone,
        address: dataFormData.address,
      });

      toast.success("Dados atualizados com sucesso!");
      loadAgencyData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar dados");
    } finally {
      setIsSavingData(false);
    }
  };

  const handleViewDocumentFromHistory = async (docType: string, docId: number) => {
    try {
      const doc = await legalDocumentService.getById(docId);
      setViewingDocument(doc);
      setIsViewingDocuments(true);
    } catch (error: any) {
      toast.error("Erro ao carregar documento");
    }
  };

  const getCurrentDocument = () => {
    return viewingDocument;
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contactFormData.subject.trim() || !contactFormData.message.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsSubmittingTicket(true);

    try {
      const result = await ticketService.create({
        subject: contactFormData.subject,
        message: contactFormData.message,
      });

      toast.success("Ticket criado com sucesso! Você receberá um email de confirmação.");
      setContactFormData({ subject: "", message: "" });
      loadTickets();
      setActiveTab("tickets");
      navigate(`/tickets/${result.id}`);
    } catch (error: any) {
      console.error("Erro ao criar ticket:", error);
      toast.error(error.message || "Erro ao criar ticket. Tente novamente.");
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge className="bg-green-500 hover:bg-green-600">Confirmado</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>;
      case "CANCELED":
        return <Badge variant="destructive">Cancelado</Badge>;
      case "OPEN":
        return <Badge variant="default">Aberto</Badge>;
      case "ANSWERED":
        return <Badge variant="secondary">Respondido</Badge>;
      case "CLOSED":
        return <Badge variant="outline">Fechado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Minha Conta</h1>
        <p className="text-muted-foreground">
          Gerencie seus pedidos, tickets de suporte e entre em contato
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Meus Pedidos
          </TabsTrigger>
          <TabsTrigger value="tickets">
            <MessageSquare className="w-4 h-4 mr-2" />
            Meus Tickets
          </TabsTrigger>
          <TabsTrigger value="contact">
            <Send className="w-4 h-4 mr-2" />
            Contato
          </TabsTrigger>
          <TabsTrigger value="data">
            <User className="w-4 h-4 mr-2" />
            Meus Dados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          {isLoadingOrders ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhum pedido encontrado</h3>
                <p className="text-muted-foreground mb-6">
                  Você ainda não realizou nenhum pedido.
                </p>
                <Button onClick={() => navigate("/collection")}>
                  Ver Coleção
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Itens</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">#{order.id}</TableCell>
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>{order.itemsCount}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatPoints(order.totalPoints).toLocaleString("pt-BR")} pts
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/pedidos/${order.id}`)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tickets" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setActiveTab("contact")}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Ticket
            </Button>
          </div>

          {isLoadingTickets ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhum ticket encontrado</h3>
                <p className="text-muted-foreground mb-6">
                  Você ainda não criou nenhum ticket de suporte.
                </p>
                <Button onClick={() => setActiveTab("contact")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Ticket
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <Card key={ticket.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{ticket.subject}</h3>
                          {getStatusBadge(ticket.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Criado em {formatDate(ticket.created_at)}
                          {ticket.message_count && ` • ${ticket.message_count} mensagem(ns)`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tickets/${ticket.id}`);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contact" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-primary" />
                <CardTitle className="text-2xl">Entre em Contato</CardTitle>
              </div>
              <p className="text-muted-foreground mt-2">
                Preencha o formulário abaixo para criar um ticket de suporte. Nossa equipe entrará em contato em breve.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitTicket} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto *</Label>
                  <Input
                    id="subject"
                    placeholder="Ex: Problema com pedido, Dúvida sobre pontos, etc."
                    value={contactFormData.subject}
                    onChange={(e) =>
                      setContactFormData({ ...contactFormData, subject: e.target.value })
                    }
                    required
                    disabled={isSubmittingTicket}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem *</Label>
                  <Textarea
                    id="message"
                    placeholder="Descreva sua dúvida ou problema em detalhes..."
                    value={contactFormData.message}
                    onChange={(e) =>
                      setContactFormData({ ...contactFormData, message: e.target.value })
                    }
                    required
                    disabled={isSubmittingTicket}
                    rows={8}
                    className="resize-none"
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isSubmittingTicket}
                    className="flex-1"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmittingTicket ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar Ticket"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("tickets")}
                    disabled={isSubmittingTicket}
                  >
                    Ver Meus Tickets
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          <div className="space-y-6">
            {/* Formulário de Dados */}
            <Card>
              <CardHeader>
                <CardTitle>Meus Dados</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais e endereço
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <form onSubmit={handleSaveData} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome da Agência</Label>
                        <Input
                          id="name"
                          value={dataFormData.name}
                          onChange={(e) =>
                            setDataFormData({ ...dataFormData, name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={dataFormData.phone}
                          onChange={(e) =>
                            setDataFormData({ ...dataFormData, phone: e.target.value })
                          }
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Endereço</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cep">CEP</Label>
                          <Input
                            id="cep"
                            value={dataFormData.address.cep}
                            onChange={(e) =>
                              setDataFormData({
                                ...dataFormData,
                                address: { ...dataFormData.address, cep: e.target.value },
                              })
                            }
                            placeholder="00000-000"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="street">Rua</Label>
                          <Input
                            id="street"
                            value={dataFormData.address.street}
                            onChange={(e) =>
                              setDataFormData({
                                ...dataFormData,
                                address: { ...dataFormData.address, street: e.target.value },
                              })
                            }
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="number">Número</Label>
                          <Input
                            id="number"
                            value={dataFormData.address.number}
                            onChange={(e) =>
                              setDataFormData({
                                ...dataFormData,
                                address: { ...dataFormData.address, number: e.target.value },
                              })
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="complement">Complemento</Label>
                          <Input
                            id="complement"
                            value={dataFormData.address.complement}
                            onChange={(e) =>
                              setDataFormData({
                                ...dataFormData,
                                address: { ...dataFormData.address, complement: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="neighborhood">Bairro</Label>
                          <Input
                            id="neighborhood"
                            value={dataFormData.address.neighborhood}
                            onChange={(e) =>
                              setDataFormData({
                                ...dataFormData,
                                address: { ...dataFormData.address, neighborhood: e.target.value },
                              })
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">Cidade</Label>
                          <Input
                            id="city"
                            value={dataFormData.address.city}
                            onChange={(e) =>
                              setDataFormData({
                                ...dataFormData,
                                address: { ...dataFormData.address, city: e.target.value },
                              })
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">Estado (UF)</Label>
                          <Input
                            id="state"
                            value={dataFormData.address.state}
                            onChange={(e) =>
                              setDataFormData({
                                ...dataFormData,
                                address: { ...dataFormData.address, state: e.target.value.toUpperCase() },
                              })
                            }
                            maxLength={2}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <Button type="submit" disabled={isSavingData}>
                      {isSavingData ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Histórico de Termos Aceitos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Termos e Políticas Aceitos</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoadingAcceptedDocs ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : acceptedDocuments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhum documento aceito ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {acceptedDocuments.map((item: any) => {
                      const doc = item.document;
                      const acceptance = item.acceptance;
                      const docTypeLabel = 
                        doc.type === 'TERMS' ? 'Termos' :
                        doc.type === 'PRIVACY' ? 'Privacidade' :
                        'Regras';
                      
                      return (
                        <div
                          key={acceptance.id}
                          className="flex items-center justify-between p-2 rounded-md border border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                            <span className="text-xs font-medium truncate">{docTypeLabel}</span>
                            <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">v{doc.version}</Badge>
                            <span className="text-xs text-muted-foreground truncate">
                              {new Date(acceptance.accepted_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleViewDocumentFromHistory(doc.type, doc.id)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Link discreto para regras da campanha */}
      {campaignRules && (
        <div className="mt-8 pt-6 border-t border-border text-center">
          <button
            onClick={() => setIsViewingRules(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mx-auto"
          >
            <FileText className="w-3 h-3" />
            Regras da Campanha
          </button>
        </div>
      )}

      {/* Dialog para visualizar regras da campanha */}
      <Dialog open={isViewingRules} onOpenChange={setIsViewingRules}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Regras da Campanha</DialogTitle>
            <DialogDescription>
              {campaignRules &&
                `Versão ${campaignRules.version} - Atualizada em ${campaignRules.created_at ? new Date(campaignRules.created_at).toLocaleDateString("pt-BR") : ""}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {campaignRules ? (
              <div
                className="prose max-w-none p-4 border rounded-lg bg-muted/50 max-h-[60vh] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: campaignRules.content }}
              />
            ) : (
              <p className="text-muted-foreground">Nenhuma regra de campanha disponível.</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewingRules(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para visualizar documentos do histórico */}
      <Dialog open={isViewingDocuments} onOpenChange={setIsViewingDocuments}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewingDocument?.type === 'TERMS' ? 'Termos de Serviço' :
               viewingDocument?.type === 'PRIVACY' ? 'Política de Privacidade' :
               'Regras da Campanha'}
            </DialogTitle>
            <DialogDescription>
              {viewingDocument &&
                `Versão ${viewingDocument.version} - Criado em ${viewingDocument.created_at ? new Date(viewingDocument.created_at).toLocaleDateString("pt-BR") : ""}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {viewingDocument ? (
              <div
                className="prose max-w-none p-4 border rounded-lg bg-muted/50 max-h-[60vh] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: viewingDocument.content }}
              />
            ) : (
              <p className="text-muted-foreground">Documento não encontrado.</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setIsViewingDocuments(false);
              setViewingDocument(null);
            }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyAccount;
