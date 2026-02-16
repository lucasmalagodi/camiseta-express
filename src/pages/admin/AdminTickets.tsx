import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye, MessageSquare } from "lucide-react";
import { ticketService, agencyService } from "@/services/api";
import { toast } from "sonner";
import { useTableSort } from "@/hooks/useTableSort";

interface Ticket {
  id: number;
  agency_id: number;
  agency_name?: string;
  agency_email?: string;
  subject: string;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  created_at: string;
  updated_at: string;
  message_count?: number;
}

interface Agency {
  id: number;
  name: string;
}

const AdminTickets = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agencyFilter, setAgencyFilter] = useState<string>("all");
  
  const { sortedData, handleSort, getSortIcon } = useTableSort(filteredTickets);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const filters: any = {};
      if (statusFilter !== "all") filters.status = statusFilter;
      if (agencyFilter !== "all") filters.agency_id = parseInt(agencyFilter);

      const data = await ticketService.getAll(filters);
      setTickets(data);
      setFilteredTickets(data);
    } catch (error: any) {
      console.error("Erro ao carregar tickets:", error);
      toast.error(error.message || "Erro ao carregar tickets");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAgencies = async () => {
    try {
      const data = await agencyService.getAll();
      setAgencies(data);
    } catch (error) {
      console.error("Erro ao carregar agências:", error);
    }
  };

  useEffect(() => {
    loadTickets();
    loadAgencies();
  }, [statusFilter, agencyFilter]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTickets(tickets);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = tickets.filter(
      (ticket) =>
        ticket.id.toString().includes(term) ||
        ticket.subject.toLowerCase().includes(term) ||
        ticket.agency_name?.toLowerCase().includes(term) ||
        ticket.agency_email?.toLowerCase().includes(term)
    );
    setFilteredTickets(filtered);
  }, [searchTerm, tickets]);

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
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="w-8 h-8" />
            Tickets de Suporte
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os tickets de suporte das agências
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por ID, assunto, agência..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="OPEN">Aberto</SelectItem>
                <SelectItem value="ANSWERED">Respondido</SelectItem>
                <SelectItem value="CLOSED">Fechado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={agencyFilter} onValueChange={setAgencyFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Agência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Agências</SelectItem>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id.toString()}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum ticket encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" || agencyFilter !== "all"
                  ? "Tente ajustar os filtros"
                  : "Ainda não há tickets de suporte"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("id")}
                  >
                    ID{getSortIcon("id")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("subject")}
                  >
                    Assunto{getSortIcon("subject")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("agency_name")}
                  >
                    Agência{getSortIcon("agency_name")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("status")}
                  >
                    Status{getSortIcon("status")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("message_count")}
                  >
                    Mensagens{getSortIcon("message_count")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("created_at")}
                  >
                    Criado em{getSortIcon("created_at")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("updated_at")}
                  >
                    Atualizado em{getSortIcon("updated_at")}
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">#{ticket.id}</TableCell>
                    <TableCell>{ticket.subject}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{ticket.agency_name || "N/A"}</div>
                        {ticket.agency_email && (
                          <div className="text-sm text-muted-foreground">
                            {ticket.agency_email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>{ticket.message_count || 0}</TableCell>
                    <TableCell>{formatDate(ticket.created_at)}</TableCell>
                    <TableCell>{formatDate(ticket.updated_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTickets;
