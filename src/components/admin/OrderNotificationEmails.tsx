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
import { toast } from "sonner";
import { orderNotificationEmailService } from "@/services/api";
import { Loader2, Mail, Plus, Trash2, Edit2, Check, X, Bell } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface NotificationEmail {
  id: number;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const OrderNotificationEmails = () => {
  const [emails, setEmails] = useState<NotificationEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingEmail, setEditingEmail] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    loadEmails();
    // Verificar permissão de notificação
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const loadEmails = async () => {
    setIsLoading(true);
    try {
      const data = await orderNotificationEmailService.getAll();
      setEmails(data);
    } catch (error: any) {
      toast.error("Erro ao carregar emails de notificação");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      toast.error("Digite um email válido");
      return;
    }

    setIsSubmitting(true);
    try {
      await orderNotificationEmailService.create(newEmail);
      toast.success("Email adicionado com sucesso!");
      setNewEmail("");
      await loadEmails();
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar email");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      await orderNotificationEmailService.update(id, { active: !currentActive });
      toast.success(`Email ${!currentActive ? "ativado" : "desativado"} com sucesso!`);
      await loadEmails();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar email");
    }
  };

  const handleStartEdit = (email: NotificationEmail) => {
    setEditingId(email.id);
    setEditingEmail(email.email);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingEmail("");
  };

  const handleSaveEdit = async (id: number) => {
    if (!editingEmail.trim()) {
      toast.error("Digite um email válido");
      return;
    }

    setIsSubmitting(true);
    try {
      await orderNotificationEmailService.update(id, { email: editingEmail });
      toast.success("Email atualizado com sucesso!");
      setEditingId(null);
      setEditingEmail("");
      await loadEmails();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar email");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja remover este email?")) {
      return;
    }

    try {
      await orderNotificationEmailService.delete(id);
      toast.success("Email removido com sucesso!");
      await loadEmails();
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover email");
    }
  };

  const activeCount = emails.filter((e) => e.active).length;

  const handleTestBrowserNotification = async () => {
    if (!("Notification" in window)) {
      toast.error("Seu navegador não suporta notificações");
      return;
    }

    if (Notification.permission === "denied") {
      toast.error("Permissão de notificação foi negada. Por favor, permita notificações nas configurações do navegador.");
      return;
    }

    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission !== "granted") {
        toast.error("Permissão de notificação negada");
        return;
      }
    }

    // Exibir notificação de teste
    try {
      const notification = new Notification("Teste de Notificação", {
        body: "Esta é uma notificação de teste. Você receberá notificações quando houver novos pedidos!",
        icon: "/favicon.ico",
        tag: "test-notification",
        requireInteraction: false,
      });

      console.log("🔔 Notificação de teste criada:", notification);

      // Fechar notificação após 5 segundos
      setTimeout(() => {
        notification.close();
      }, 5000);

      toast.success("Notificação de teste enviada!");
    } catch (error) {
      console.error("🔔 Erro ao criar notificação de teste:", error);
      toast.error(`Erro ao criar notificação: ${error}`);
    }
  };

  const handleSimulateNewOrder = async () => {
    if (!("Notification" in window)) {
      toast.error("Seu navegador não suporta notificações");
      return;
    }

    if (Notification.permission !== "granted") {
      toast.error("Permissão de notificação não concedida. Use o botão 'Testar Notificação' primeiro.");
      return;
    }

    // Simular um novo pedido
    try {
      const simulatedOrderId = Math.floor(Math.random() * 10000) + 1000;
      const simulatedPoints = Math.floor(Math.random() * 5000) + 100;

      console.log("🔔 Simulando novo pedido:", simulatedOrderId);

      const notification = new Notification("Novo Pedido Recebido!", {
        body: `Pedido #${simulatedOrderId} - ${simulatedPoints} pontos`,
        icon: "/favicon.ico",
        tag: `order-${simulatedOrderId}`,
        requireInteraction: false,
      });

      console.log("🔔 Notificação simulada criada:", notification);

      // Ao clicar na notificação, navegar para pedidos
      notification.onclick = () => {
        window.focus();
        window.location.href = "/admin/pedidos";
        notification.close();
      };

      // Fechar notificação após 10 segundos
      setTimeout(() => {
        notification.close();
      }, 10000);

      toast.success("Notificação simulada enviada! Verifique se apareceu no navegador.");
    } catch (error) {
      console.error("🔔 Erro ao simular notificação:", error);
      toast.error(`Erro ao simular notificação: ${error}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Emails de Notificação de Pedidos</h2>
        <p className="text-muted-foreground">
          Gerencie os emails que receberão notificações quando houver novos pedidos
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Quando um novo pedido for criado, todos os emails ativos receberão uma notificação
          automática com os detalhes do pedido e um link para visualizá-lo.
        </AlertDescription>
      </Alert>

      {/* Card de Teste de Notificação do Navegador */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <CardTitle>Notificações do Navegador</CardTitle>
          </div>
          <CardDescription>
            Teste as notificações do navegador que aparecem quando há novos pedidos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Status da Permissão</p>
                <p className="text-sm text-muted-foreground">
                  {notificationPermission === "granted" && "✅ Permissão concedida"}
                  {notificationPermission === "denied" && "❌ Permissão negada"}
                  {notificationPermission === "default" && "⚠️ Permissão não solicitada"}
                </p>
              </div>
              <Button
                onClick={handleTestBrowserNotification}
                variant="outline"
                disabled={notificationPermission === "denied"}
              >
                <Bell className="w-4 h-4 mr-2" />
                Testar Notificação
              </Button>
            </div>

            {notificationPermission === "granted" && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="font-medium mb-2">Simular Novo Pedido</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Simula a notificação que você receberá quando houver um novo pedido real.
                  Use isso para testar se as notificações estão funcionando corretamente.
                </p>
                <Button
                  onClick={handleSimulateNewOrder}
                  variant="default"
                  className="w-full"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Simular Novo Pedido
                </Button>
              </div>
            )}
          </div>
          {notificationPermission === "denied" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                A permissão de notificação foi negada. Para receber notificações, você precisa
                permitir notificações nas configurações do navegador e recarregar a página.
              </AlertDescription>
            </Alert>
          )}
          {notificationPermission === "granted" && (
            <Alert className="border-green-200 bg-green-50">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Notificações ativadas! Você receberá notificações quando houver novos pedidos.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Formulário para adicionar novo email */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            <CardTitle>Adicionar Email</CardTitle>
          </div>
          <CardDescription>
            Adicione um novo email para receber notificações de pedidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="admin@exemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex items-end">
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

      {/* Lista de emails */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Emails Cadastrados
              </CardTitle>
              <CardDescription className="mt-1">
                {emails.length} email(s) cadastrado(s) • {activeCount} ativo(s)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum email cadastrado</p>
              <p className="text-sm">Adicione um email acima para começar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell>
                        {editingId === email.id ? (
                          <Input
                            type="email"
                            value={editingEmail}
                            onChange={(e) => setEditingEmail(e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          <span className="font-medium">{email.email}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={email.active ? "default" : "secondary"}>
                          {email.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(email.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingId === email.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSaveEdit(email.id)}
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
                                  checked={email.active}
                                  onCheckedChange={() =>
                                    handleToggleActive(email.id, email.active)
                                  }
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartEdit(email)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(email.id)}
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

export default OrderNotificationEmails;
