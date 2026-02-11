import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Send, MessageSquare, User, Shield } from "lucide-react";
import { ticketService } from "@/services/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface TicketMessage {
  id: number;
  sender_type: "AGENCY" | "ADMIN";
  sender_id: number;
  sender_name?: string;
  message: string;
  created_at: string;
}

interface Ticket {
  id: number;
  subject: string;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  created_at: string;
  updated_at: string;
}

const TicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { agency } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!agency) {
      toast.error("Você precisa estar logado para ver tickets");
      navigate("/login");
      return;
    }

    if (id) {
      loadTicket();
      loadMessages();
    }
  }, [id, agency]);

  const loadTicket = async () => {
    if (!id) return;
    try {
      const data = await ticketService.getAgencyTicket(parseInt(id));
      setTicket(data);
    } catch (error: any) {
      console.error("Erro ao carregar ticket:", error);
      toast.error(error.message || "Erro ao carregar ticket");
      navigate("/tickets");
    }
  };

  const loadMessages = async () => {
    if (!id) return;
    try {
      const data = await ticketService.getAgencyTicketMessages(parseInt(id));
      setMessages(data);
    } catch (error: any) {
      console.error("Erro ao carregar mensagens:", error);
      toast.error(error.message || "Erro ao carregar mensagens");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id || !newMessage.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }

    if (ticket?.status === "CLOSED") {
      toast.error("Não é possível responder a um ticket fechado");
      return;
    }

    setIsSending(true);

    try {
      await ticketService.addAgencyMessage(parseInt(id), newMessage);
      setNewMessage("");
      toast.success("Mensagem enviada com sucesso!");
      // Recarregar mensagens e ticket
      await Promise.all([loadMessages(), loadTicket()]);
    } catch (error: any) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error(error.message || "Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-4 w-1/2 mb-6" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/tickets")}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Tickets
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl mb-2">{ticket.subject}</CardTitle>
              <div className="flex items-center gap-2">
                {getStatusBadge(ticket.status)}
                <span className="text-sm text-muted-foreground">
                  Criado em: {formatDate(ticket.created_at)}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Mensagens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma mensagem ainda
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg ${
                    message.sender_type === "AGENCY"
                      ? "bg-primary/10 ml-8"
                      : "bg-secondary/50 mr-8"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {message.sender_type === "AGENCY" ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Shield className="w-4 h-4" />
                    )}
                    <span className="font-semibold">
                      {message.sender_name || (message.sender_type === "AGENCY" ? "Você" : "Equipe de Suporte")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(message.created_at)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{message.message}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {ticket.status !== "CLOSED" && (
        <Card>
          <CardHeader>
            <CardTitle>Responder</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message">Sua mensagem</Label>
                <Textarea
                  id="message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua resposta..."
                  rows={4}
                  className="resize-none"
                  disabled={isSending}
                />
              </div>
              <Button type="submit" disabled={isSending || !newMessage.trim()}>
                <Send className="w-4 h-4 mr-2" />
                {isSending ? "Enviando..." : "Enviar Mensagem"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {ticket.status === "CLOSED" && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              Este ticket está fechado. Não é possível adicionar novas mensagens.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TicketDetail;
