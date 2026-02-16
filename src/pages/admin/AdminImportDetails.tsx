import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileSpreadsheet, Search, X } from "lucide-react";
import { agencyPointsImportService } from "@/services/api";
import { toast } from "sonner";
import { formatPoints } from "@/lib/utils";
import { useTableSort } from "@/hooks/useTableSort";

interface ImportItem {
  id: number;
  importId: number;
  saleId?: string | null;
  saleDate?: string | null;
  cnpj: string;
  agencyName?: string | null;
  branch?: string | null;
  store?: string | null;
  executiveName: string;
  supplier?: string | null;
  productName?: string | null;
  company?: string | null;
  points: number;
}

interface ImportDetails {
  id: number;
  referencePeriod: string;
  uploadedBy: number;
  uploadedAt: string;
  checksum: string;
  items: ImportItem[];
}

const AdminImportDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [importData, setImportData] = useState<ImportDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!id) return;

    const loadImportDetails = async () => {
      try {
        setIsLoading(true);
        const data = await agencyPointsImportService.getById(Number(id));
        setImportData(data);
      } catch (error) {
        toast.error("Erro ao carregar detalhes do import");
        console.error(error);
        navigate("/admin/imports");
      } finally {
        setIsLoading(false);
      }
    };

    loadImportDetails();
  }, [id, navigate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  // Filtrar itens baseado no termo de busca
  const filteredItems = useMemo(() => {
    if (!importData?.items || !searchTerm.trim()) {
      return importData?.items || [];
    }

    const term = searchTerm.toLowerCase().trim();
    return importData.items.filter((item) => {
      // Buscar em múltiplos campos
      const searchableFields = [
        item.saleId || "",
        item.saleDate || "",
        item.cnpj || "",
        item.agencyName || "",
        item.branch || "",
        item.store || "",
        item.executiveName || "",
        item.supplier || "",
        item.productName || "",
        item.company || "",
        item.points?.toString() || "",
      ];

      return searchableFields.some((field) =>
        field.toLowerCase().includes(term)
      );
    });
  }, [importData?.items, searchTerm]);

  const { sortedData, handleSort, getSortIcon } = useTableSort(filteredItems);

  const totalPoints = importData?.items.reduce((sum, item) => sum + Number(item.points), 0) || 0;
  const filteredTotalPoints = filteredItems.reduce((sum, item) => sum + Number(item.points), 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!importData) {
    return (
      <div>
        <p className="text-muted-foreground">Import não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/imports")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Import Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Detalhes do Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Período de Referência</p>
              <p className="font-medium">{importData.referencePeriod}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Uploadado em</p>
              <p className="font-medium">{formatDate(importData.uploadedAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Uploadado por</p>
              <p className="font-medium">User ID: {importData.uploadedBy}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Pontos</p>
              <p className="font-medium">
                {formatPoints(totalPoints).toLocaleString("pt-BR")} pts
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Checksum</p>
            <p className="font-mono text-xs break-all">{importData.checksum}</p>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Itens do Import ({filteredItems.length}
              {searchTerm && ` de ${importData.items.length}`})
            </CardTitle>
            <div className="flex items-center gap-2 w-full max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar por CNPJ, Agência, Promotor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {searchTerm && filteredItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum item encontrado para "{searchTerm}"
            </div>
          )}
          {!searchTerm && importData.items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum item encontrado
            </div>
          )}
          {filteredItems.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("saleDate")}
                    >
                      Data Venda{getSortIcon("saleDate")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("saleId")}
                    >
                      ID Venda{getSortIcon("saleId")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("cnpj")}
                    >
                      CNPJ{getSortIcon("cnpj")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("agencyName")}
                    >
                      Agência{getSortIcon("agencyName")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("branch")}
                    >
                      Filial{getSortIcon("branch")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("store")}
                    >
                      Posto{getSortIcon("store")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("executiveName")}
                    >
                      Promotor{getSortIcon("executiveName")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("supplier")}
                    >
                      Fornecedor{getSortIcon("supplier")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("productName")}
                    >
                      Produto{getSortIcon("productName")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("company")}
                    >
                      Empresa{getSortIcon("company")}
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("points")}
                    >
                      Pontos{getSortIcon("points")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">
                        {item.saleDate ? formatDate(item.saleDate) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.saleId || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.cnpj}</TableCell>
                      <TableCell>{item.agencyName || "-"}</TableCell>
                      <TableCell>{item.branch || "-"}</TableCell>
                      <TableCell>{item.store || "-"}</TableCell>
                      <TableCell>{item.executiveName}</TableCell>
                      <TableCell>{item.supplier || "-"}</TableCell>
                      <TableCell>{item.productName || "-"}</TableCell>
                      <TableCell>{item.company || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPoints(Number(item.points)).toLocaleString("pt-BR")} pts
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {searchTerm && filteredItems.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Total de pontos nos itens filtrados:{" "}
              <span className="font-medium">
                {formatPoints(filteredTotalPoints).toLocaleString("pt-BR")} pts
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminImportDetails;
