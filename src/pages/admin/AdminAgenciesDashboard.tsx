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
import { Search, Eye, Building2 } from "lucide-react";
import { agencyService } from "@/services/api";
import { toast } from "sonner";

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
    const filtered = agencies.filter(
      (agency) =>
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
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead className="text-right">Pontos Atuais</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgencies.map((agency) => (
                  <TableRow key={agency.id}>
                    <TableCell className="font-medium">{agency.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatCnpj(agency.cnpj)}
                    </TableCell>
                    <TableCell>{agency.email}</TableCell>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate(`/admin/agencies/${agency.id}/history`)
                        }
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Histórico
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

export default AdminAgenciesDashboard;
