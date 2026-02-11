import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Plus, Eye } from "lucide-react";
import { ticketService } from "@/services/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Ticket {
  id: number;
  subject: string;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  created_at: string;
  updated_at: string;
  message_count?: number;
}

const Tickets = () => {
  const navigate = useNavigate();
  const { agency } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!agency) {
      toast.error("Você precisa estar logado para ver seus tickets");
      navigate("/login");
      return;
    }

    loadTickets();
  }, [agency]);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const data = await ticketService.getAgencyTickets();
      setTickets(data);
    } catch (error: any) {
      console.error("Erro ao carregar tickets:", error);
      toast.error(error.message || "Erro ao carregar tickets");
    } finally {
      setIsLoading(false);
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="w-8 h-8" />
            Meus Tickets
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie seus tickets de suporte
          </p>
        </div>
        <Button onClick={() => navigate("/contato")}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Ticket
        </Button>
      </div>

      {isLoading ? (
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
            <Button onClick={() => navigate("/contato")}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Ticket
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/tickets/${ticket.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{ticket.subject}</h3>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Criado em: {formatDate(ticket.created_at)}</span>
                      {ticket.message_count !== undefined && (
                        <span>{ticket.message_count} mensagem(ns)</span>
                      )}
                    </div>
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
                    Ver Detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tickets;
