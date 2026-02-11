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
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Eye, FileSpreadsheet, Trash2, FileText, Search, X } from "lucide-react";
import { agencyPointsImportService } from "@/services/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PointsImport {
  id: number;
  referencePeriod: string;
  uploadedBy: number;
  uploadedAt: string;
  checksum: string;
  status?: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  totalRows?: number;
  processedRows?: number;
  errorMessage?: string | null;
}

interface ImportStatus {
  status: string;
  totalRows: number;
  processedRows: number;
  progress: number;
}

const AdminPointsImports = () => {
  const navigate = useNavigate();
  const [imports, setImports] = useState<PointsImport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [referencePeriod, setReferencePeriod] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [currentImportId, setCurrentImportId] = useState<number | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedImportId, setSelectedImportId] = useState<number | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]); // Armazena todos os logs
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const loadImports = async () => {
    try {
      setIsLoading(true);
      const data = await agencyPointsImportService.getAll();
      setImports(data);
      
      // Verificar se há import em processamento
      const processingImport = data.find((imp: PointsImport) => imp.status === 'PROCESSING');
      if (processingImport && !currentImportId) {
        setCurrentImportId(processingImport.id);
      }
    } catch (error) {
      toast.error("Erro ao carregar imports");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadImports();
  }, []);

  // Verificar se há import em processamento e fazer polling
  useEffect(() => {
    const checkProcessingImports = async () => {
      const processingImport = imports.find(imp => imp.status === 'PROCESSING');
      if (processingImport) {
        setCurrentImportId(processingImport.id);
      } else {
        setCurrentImportId(null);
        setImportStatus(null);
      }
    };

    checkProcessingImports();
  }, [imports]);

  // Polling do status quando há import em processamento
  useEffect(() => {
    if (!currentImportId) return;

    const pollStatus = async () => {
      try {
        const status = await agencyPointsImportService.getStatus(currentImportId);
        setImportStatus(status);

        // Se ainda está processando, continuar polling
        if (status.status === 'PROCESSING') {
          // Recarregar lista para atualizar status
          await loadImports();
        } else {
          // Processamento concluído, recarregar lista final
          await loadImports();
          setCurrentImportId(null);
          setImportStatus(null);
          
          if (status.status === 'DONE') {
            toast.success('Importação concluída com sucesso!');
          } else if (status.status === 'FAILED') {
            toast.error('Importação falhou. Verifique os detalhes.');
          }
        }
      } catch (error) {
        console.error('Erro ao buscar status:', error);
      }
    };

    // Polling a cada 2.5 segundos
    const interval = setInterval(pollStatus, 2500);
    pollStatus(); // Primeira chamada imediata

    return () => clearInterval(interval);
  }, [currentImportId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileName = file.name.toLowerCase();
      const validExtensions = ['.xls', '.xlsx', '.xlsm'];
      const isValidFile = validExtensions.some(ext => fileName.endsWith(ext));
      
      if (!isValidFile) {
        toast.error(`Formato de arquivo inválido. Apenas .xls, .xlsx e .xlsm são aceitos. Arquivo recebido: ${file.name}`);
        e.target.value = ''; // Limpar o input
        setSelectedFile(null);
        return;
      }
      
      // Validação adicional para .xlsm
      if (fileName.endsWith('.xlsm')) {
        console.log('Arquivo .xlsm detectado:', file.name, 'Tipo MIME:', file.type);
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error("Selecione um arquivo");
      return;
    }

    if (!referencePeriod) {
      toast.error("Informe o período de referência (ex: 2026-W04)");
      return;
    }

    try {
      setIsUploading(true);
      const result = await agencyPointsImportService.upload(selectedFile, referencePeriod);
      
      // Upload iniciado, processamento em background
      setCurrentImportId(result.importId);
      toast.info('Upload iniciado. O processamento está sendo executado em background.');

      // Limpar formulário
      setSelectedFile(null);
      setReferencePeriod("");
      if (document.getElementById('file') as HTMLInputElement) {
        (document.getElementById('file') as HTMLInputElement).value = '';
      }

      // Recarregar lista para mostrar nova importação
      await loadImports();
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao fazer upload da planilha";
      toast.error(errorMessage);
      
      // Se o erro for de import em processamento, recarregar lista
      if (errorMessage.includes('processamento')) {
        await loadImports();
      }
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const handleDelete = async (importId: number) => {
    if (!confirm("Tem certeza que deseja excluir esta importação e todos os seus registros? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      setDeletingId(importId);
      await agencyPointsImportService.delete(importId);
      toast.success("Importação excluída com sucesso");
      await loadImports();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Erro ao excluir importação");
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenLogs = async (importId: number) => {
    setSelectedImportId(importId);
    setSearchKeyword('');
    setLogsDialogOpen(true);
    setIsLoadingLogs(true);
    setLogs([]);
    setAllLogs([]);

    try {
      const result = await agencyPointsImportService.getLogs(importId);
      const logsData = result.logs || [];
      setAllLogs(logsData);
      setLogs(logsData);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Erro ao carregar logs");
      setLogs([]);
      setAllLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Filtrar logs por palavra-chave
  const handleSearchChange = (keyword: string) => {
    setSearchKeyword(keyword);
    
    if (!keyword.trim()) {
      setLogs(allLogs);
      return;
    }

    const lowerKeyword = keyword.toLowerCase();
    const filtered = allLogs.filter(log => {
      // Buscar na mensagem
      if (log.message?.toLowerCase().includes(lowerKeyword)) {
        return true;
      }
      
      // Buscar na categoria
      if (log.category?.toLowerCase().includes(lowerKeyword)) {
        return true;
      }
      
      // Buscar no nível
      if (log.level?.toLowerCase().includes(lowerKeyword)) {
        return true;
      }
      
      // Buscar no contexto
      if (log.context) {
        const contextStr = JSON.stringify(log.context).toLowerCase();
        if (contextStr.includes(lowerKeyword)) {
          return true;
        }
      }
      
      // Buscar no erro
      if (log.error) {
        if (log.error.message?.toLowerCase().includes(lowerKeyword) ||
            log.error.name?.toLowerCase().includes(lowerKeyword)) {
          return true;
        }
      }
      
      return false;
    });
    
    setLogs(filtered);
  };

  const formatLogLevel = (level: string) => {
    const colors = {
      ERROR: 'text-red-600',
      WARN: 'text-yellow-600',
      INFO: 'text-blue-600'
    };
    return colors[level as keyof typeof colors] || 'text-gray-600';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium'
    });
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload de Planilha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="referencePeriod">Período de Referência</Label>
              <Input
                id="referencePeriod"
                placeholder="Ex: 2026-W04 ou 2026-01"
                value={referencePeriod}
                onChange={(e) => setReferencePeriod(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">Arquivo da Planilha</Label>
              <Input
                id="file"
                type="file"
                accept=".xls,.xlsx,.xlsm"
                onChange={handleFileChange}
                required
              />
            </div>
            {importStatus && importStatus.status === 'PROCESSING' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processando: {importStatus.processedRows} / {importStatus.totalRows} linhas</span>
                  <span>{importStatus.progress}%</span>
                </div>
                <Progress value={importStatus.progress} />
              </div>
            )}
            <Button 
              type="submit" 
              disabled={isUploading || !selectedFile || (currentImportId !== null && imports.find(imp => imp.id === currentImportId)?.status === 'PROCESSING')}
            >
              {isUploading ? "Enviando..." : 
               (currentImportId !== null && imports.find(imp => imp.id === currentImportId)?.status === 'PROCESSING') 
                 ? "Processamento em andamento..." 
                 : "Enviar Planilha"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Imports List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Imports Realizados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : imports.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum import encontrado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Uploadado em</TableHead>
                  <TableHead>Uploadado por</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((importItem) => {
                  const isProcessing = importItem.id === currentImportId && importStatus;
                  const statusLabel = {
                    'PENDING': 'Pendente',
                    'PROCESSING': 'Processando',
                    'DONE': 'Concluído',
                    'FAILED': 'Falhou'
                  }[importItem.status || 'PENDING'] || 'Desconhecido';
                  
                  const statusColor = {
                    'PENDING': 'text-yellow-600',
                    'PROCESSING': 'text-blue-600',
                    'DONE': 'text-green-600',
                    'FAILED': 'text-red-600'
                  }[importItem.status || 'PENDING'] || 'text-gray-600';

                  return (
                  <TableRow key={importItem.id}>
                    <TableCell className="font-medium">
                      {importItem.referencePeriod}
                    </TableCell>
                    <TableCell>
                      <span className={statusColor}>{statusLabel}</span>
                      {importItem.errorMessage && (
                        <div className="text-xs text-red-500 mt-1">
                          {importItem.errorMessage.substring(0, 50)}...
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isProcessing ? (
                        <div className="space-y-1">
                          <div className="text-xs">
                            {importStatus.processedRows} / {importStatus.totalRows} ({importStatus.progress}%)
                          </div>
                          <Progress value={importStatus.progress} className="h-2" />
                        </div>
                      ) : importItem.totalRows ? (
                        `${importItem.processedRows || 0} / ${importItem.totalRows}`
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{formatDate(importItem.uploadedAt)}</TableCell>
                    <TableCell>User ID: {importItem.uploadedBy}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/admin/imports/${importItem.id}`)
                          }
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenLogs(importItem.id)}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Logs
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(importItem.id)}
                          disabled={deletingId === importItem.id || importItem.status === 'PROCESSING'}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {deletingId === importItem.id ? "Excluindo..." : "Excluir"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Logs da Importação #{selectedImportId}</DialogTitle>
            <DialogDescription>
              Logs detalhados do processamento da importação
            </DialogDescription>
          </DialogHeader>
          
          {/* Filtro por palavra-chave */}
          <div className="mt-4 mb-4">
            <Label htmlFor="search-logs">Buscar nos logs:</Label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-logs"
                placeholder="Buscar por palavra-chave (ex: duplicata, pontuação, linha 5...)"
                value={searchKeyword}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-8"
              />
              {searchKeyword && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => handleSearchChange('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {searchKeyword && (
              <p className="text-xs text-muted-foreground mt-1">
                {logs.length} de {allLogs.length} logs encontrados
              </p>
            )}
          </div>

          <div className="mt-4">
            {isLoadingLogs ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum log encontrado para esta importação
              </p>
            ) : (
              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-4">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 bg-card"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${formatLogLevel(log.level)}`}>
                            {log.level}
                          </span>
                          {log.category && (
                            <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                              {log.category}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm mb-2">{log.message}</p>
                      {log.error && (
                        <div className="mt-2 p-2 bg-destructive/10 rounded text-xs font-mono">
                          <div className="text-destructive font-semibold mb-1">
                            {log.error.name}: {log.error.message}
                          </div>
                          {log.error.stack && (
                            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                              {log.error.stack}
                            </pre>
                          )}
                        </div>
                      )}
                      {log.context && Object.keys(log.context).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Ver contexto
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.context, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPointsImports;
