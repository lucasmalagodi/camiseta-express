import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Edit2, Eye, Search, X, Building2 } from "lucide-react";
import { agencyService } from "@/services/api";
import { toast } from "sonner";
import { useTableSort } from "@/hooks/useTableSort";

interface Agency {
  id: number;
  cnpj: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  active: boolean;
  balance: number;
  branch?: string | null;
  createdAt: string;
  updatedAt: string;
}

const AdminAgenciesDashboard = () => {
  const navigate = useNavigate();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [filteredAgencies, setFilteredAgencies] = useState<Agency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Edição inline: somente o e-mail (outros campos permanecem bloqueados)
  const [editingAgencyId, setEditingAgencyId] = useState<number | null>(null);
  const [editingEmail, setEditingEmail] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { sortedData, handleSort, getSortIcon } = useTableSort(filteredAgencies);

  const loadAgencies = async () => {
    try {
      setIsLoading(true);
      const data = await agencyService.getAll();
      setAgencies(data);
      setFilteredAgencies(data);
    } catch (error) {
      toast.error("Erro ao carregar agências");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAgencies();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredAgencies(agencies);
      return;
    }

    const term = searchTerm.toLowerCase();
    const termDigits = searchTerm.replace(/\D/g, "");
    const filtered = agencies.filter(
      (agency) =>
        // Busca robusta de CNPJ: ignora pontuação do usuário e do CNPJ armazenado
        (termDigits
          ? agency.cnpj.replace(/\D/g, "").includes(termDigits)
          : false) ||
        agency.cnpj.toLowerCase().includes(term) ||
        agency.name.toLowerCase().includes(term) ||
        (agency.branch && agency.branch.toLowerCase().includes(term))
    );
    setFilteredAgencies(filtered);
  }, [searchTerm, agencies]);

  const formatCnpj = (cnpj: string) => {
    // Formatar CNPJ: XX.XXX.XXX/XXXX-XX
    const clean = cnpj.replace(/\D/g, "");
    if (clean.length !== 14) return cnpj;
    return `${clean.substring(0, 2)}.${clean.substring(2, 5)}.${clean.substring(5, 8)}/${clean.substring(8, 12)}-${clean.substring(12)}`;
  };

  const startEditEmail = (agency: Agency) => {
    setEditingAgencyId(agency.id);
    setEditingEmail(agency.email || "");
  };

  const cancelEditEmail = () => {
    setEditingAgencyId(null);
    setEditingEmail("");
  };

  const saveEditEmail = async (agencyId: number) => {
    const nextEmail = editingEmail.trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail);
    if (!isValidEmail) {
      toast.error("Informe um e-mail válido.");
      return;
    }

    setIsSubmitting(true);
    try {
      await agencyService.updateEmail(agencyId, nextEmail);

      // Atualizar lista local (sem recarregar tudo)
      setAgencies((prev) =>
        prev.map((a) => (a.id === agencyId ? { ...a, email: nextEmail } : a))
      );

      toast.success("E-mail atualizado com sucesso.");
      cancelEditEmail();
    } catch (error) {
      toast.error("Erro ao atualizar e-mail.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por CNPJ, nome da agência ou filial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Agencies List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Agências ({filteredAgencies.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredAgencies.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {searchTerm ? "Nenhuma agência encontrada" : "Nenhuma agência cadastrada"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("name")}
                  >
                    Nome{getSortIcon("name")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("cnpj")}
                  >
                    CNPJ{getSortIcon("cnpj")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("email")}
                  >
                    Email{getSortIcon("email")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("branch")}
                  >
                    Filial{getSortIcon("branch")}
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("balance")}
                  >
                    Pontos Atuais{getSortIcon("balance")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("active")}
                  >
                    Status{getSortIcon("active")}
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((agency) => (
                  <TableRow key={agency.id}>
                    <TableCell className="font-medium">{agency.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatCnpj(agency.cnpj)}
                    </TableCell>
                    <TableCell>
                      {editingAgencyId === agency.id ? (
                        <Input
                          type="email"
                          value={editingEmail}
                          onChange={(e) => setEditingEmail(e.target.value)}
                          disabled={isSubmitting}
                          className="w-full"
                        />
                      ) : (
                        agency.email
                      )}
                    </TableCell>
                    <TableCell>{agency.branch || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {agency.balance.toLocaleString("pt-BR")} pts
                    </TableCell>
                    <TableCell>
                      <Badge variant={agency.active ? "default" : "secondary"}>
                        {agency.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {editingAgencyId === agency.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => saveEditEmail(agency.id)}
                            disabled={isSubmitting}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={cancelEditEmail}
                            disabled={isSubmitting}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditEmail(agency)}
                            disabled={editingAgencyId !== null}
                            aria-label={`Editar e-mail da agência ${agency.name}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/admin/agencies/${agency.id}/history`)
                            }
                            disabled={editingAgencyId !== null}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Histórico
                          </Button>
                        </div>
                      )}
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

export default AdminAgenciesDashboard;
