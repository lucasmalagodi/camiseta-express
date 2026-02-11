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
import { ArrowLeft, History, Building2 } from "lucide-react";
import { agencyService, agencyPointsLedgerService } from "@/services/api";
import { toast } from "sonner";
import { formatPoints } from "@/lib/utils";

interface Agency {
  id: number;
  cnpj: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  active: boolean;
  balance: number;
}

interface LedgerEntry {
  id: number;
  agencyId: number;
  sourceType: "IMPORT" | "REDEEM";
  sourceId: number;
  points: number;
  description?: string;
  createdAt: string;
}

interface LedgerResponse {
  data: LedgerEntry[];
  total: number;
  balance: number;
}

const AdminAgencyHistory = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const [agencyData, ledgerData] = await Promise.all([
          agencyService.getById(Number(id)),
          agencyPointsLedgerService.getByAgencyId(Number(id)),
        ]);

        setAgency(agencyData);
        setLedgerEntries(ledgerData.data || []);
        setBalance(ledgerData.balance || 0);
      } catch (error) {
        toast.error("Erro ao carregar dados da agência");
        console.error(error);
        navigate("/admin/agencies");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR");
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

  if (!agency) {
    return (
      <div>
        <p className="text-muted-foreground">Agência não encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/agencies")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Agency Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Informações da Agência
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-medium">{agency.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CNPJ</p>
              <p className="font-medium font-mono">{formatCnpj(agency.cnpj)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{agency.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={agency.active ? "default" : "secondary"}>
                {agency.active ? "Ativa" : "Inativa"}
              </Badge>
            </div>
          </div>
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">Saldo Atual</p>
            <p className="text-2xl font-bold text-primary">
              {balance.toLocaleString("pt-BR")} pts
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ledger History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Pontos ({ledgerEntries.length} registros)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Origem ID</TableHead>
                <TableHead className="text-right">Pontos</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgerEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                ledgerEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.createdAt)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={entry.sourceType === "IMPORT" ? "default" : "secondary"}
                      >
                        {entry.sourceType === "IMPORT" ? "Importação" : "Resgate"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {entry.sourceId}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        entry.points >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {entry.points >= 0 ? "+" : ""}
                      {formatPoints(entry.points).toLocaleString("pt-BR")} pts
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.description || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAgencyHistory;
