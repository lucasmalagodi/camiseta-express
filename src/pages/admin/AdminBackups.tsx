import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { backupService } from "@/services/api";
import { Loader2, Download, Trash2, RefreshCw, Database, HardDrive, Clock, AlertCircle, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface Backup {
  id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  type: 'MANUAL' | 'AUTO';
  status: 'PROCESSING' | 'DONE' | 'FAILED';
  created_at: string;
  finished_at: string | null;
  error_message: string | null;
}

const AdminBackups = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<Backup | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [validatingId, setValidatingId] = useState<number | null>(null);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    checks: any;
    errors: string[];
    warnings: string[];
  } | null>(null);

  useEffect(() => {
    loadBackups();
    // Atualizar lista a cada 5 segundos para verificar status de backups em processamento
    const interval = setInterval(() => {
      loadBackups();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadBackups = async () => {
    try {
      const data = await backupService.getAll();
      setBackups(data);
    } catch (error: any) {
      console.error("Erro ao carregar backups:", error);
      toast.error(error.message || "Erro ao carregar backups");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      await backupService.create();
      toast.success("Backup manual iniciado! O processo será executado em background.");
      // Recarregar lista após um pequeno delay
      setTimeout(() => {
        loadBackups();
      }, 1000);
    } catch (error: any) {
      console.error("Erro ao criar backup:", error);
      toast.error(error.message || "Erro ao criar backup");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownload = async (backup: Backup) => {
    if (backup.status !== 'DONE') {
      toast.error("Backup ainda não foi concluído");
      return;
    }

    setDownloadingId(backup.id);
    try {
      const response = await backupService.download(backup.id);
      
      // Criar blob e fazer download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Download iniciado!");
    } catch (error: any) {
      console.error("Erro ao fazer download:", error);
      toast.error(error.message || "Erro ao fazer download do backup");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteClick = (backup: Backup) => {
    setBackupToDelete(backup);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!backupToDelete) return;

    try {
      await backupService.delete(backupToDelete.id);
      toast.success("Backup deletado com sucesso!");
      loadBackups();
    } catch (error: any) {
      console.error("Erro ao deletar backup:", error);
      toast.error(error.message || "Erro ao deletar backup");
    } finally {
      setDeleteDialogOpen(false);
      setBackupToDelete(null);
    }
  };

  const handleValidate = async (backup: Backup) => {
    if (backup.status !== 'DONE') {
      toast.error("Apenas backups concluídos podem ser validados");
      return;
    }

    setValidatingId(backup.id);
    setValidationResult(null);

    try {
      const result = await backupService.validate(backup.id);
      setValidationResult({ ...result, backupId: backup.id } as any);
      
      if (result.valid) {
        toast.success("Backup válido! Todas as verificações passaram.");
      } else {
        toast.warning(`Backup com problemas: ${result.errors.length} erro(s) encontrado(s)`);
      }
    } catch (error: any) {
      console.error("Erro ao validar backup:", error);
      toast.error(error.message || "Erro ao validar backup");
    } finally {
      setValidatingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Concluído</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Processando</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Falhou</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === 'MANUAL' 
      ? <Badge variant="outline">Manual</Badge>
      : <Badge variant="outline">Automático</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Backups</h2>
          <p className="text-muted-foreground">
            Gerencie backups do sistema. Backups automáticos são gerados diariamente às 03:00.
          </p>
        </div>
        <Button
          onClick={handleCreateBackup}
          disabled={isCreating}
          className="flex items-center gap-2"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Criando...
            </>
          ) : (
            <>
              <Database className="w-4 h-4" />
              Criar Backup Manual
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Backups</CardTitle>
          <CardDescription>
            Backups incluem: banco de dados MySQL, pasta de uploads e assets estáticos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HardDrive className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum backup encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{backup.file_name}</h3>
                        {getStatusBadge(backup.status)}
                        {getTypeBadge(backup.type)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4" />
                          <span>{formatFileSize(backup.file_size)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Criado: {formatDate(backup.created_at)}</span>
                        </div>
                        {backup.finished_at && (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Finalizado: {formatDate(backup.finished_at)}</span>
                          </div>
                        )}
                      </div>

                      {backup.error_message && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded text-sm text-red-600 dark:text-red-400">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            <span className="font-semibold">Erro:</span>
                          </div>
                          <p className="mt-1">{backup.error_message}</p>
                        </div>
                      )}

                      {validationResult && validatingId === null && backup.id === (validationResult as any).backupId && (
                        <div className={`mt-2 p-3 rounded text-sm ${
                          validationResult.valid 
                            ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300' 
                            : 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            {validationResult.valid ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <AlertCircle className="w-4 h-4" />
                            )}
                            <span className="font-semibold">
                              {validationResult.valid ? 'Validação: Válido' : 'Validação: Inválido'}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div>✓ Arquivo existe: {validationResult.checks.fileExists ? 'Sim' : 'Não'}</div>
                            <div>✓ Tamanho válido: {validationResult.checks.fileSizeValid ? 'Sim' : 'Não'}</div>
                            <div>✓ Arquivo tar.gz válido: {validationResult.checks.archiveValid ? 'Sim' : 'Não'}</div>
                            <div>✓ Dump SQL válido: {validationResult.checks.sqlDumpValid ? 'Sim' : 'Não'}</div>
                            <div>✓ Uploads presentes: {validationResult.checks.uploadsPresent ? 'Sim' : 'Não'}</div>
                            {validationResult.errors.length > 0 && (
                              <div className="mt-2">
                                <strong>Erros:</strong>
                                <ul className="list-disc list-inside">
                                  {validationResult.errors.map((error, idx) => (
                                    <li key={idx}>{error}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {validationResult.warnings.length > 0 && (
                              <div className="mt-2">
                                <strong>Avisos:</strong>
                                <ul className="list-disc list-inside">
                                  {validationResult.warnings.map((warning, idx) => (
                                    <li key={idx}>{warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleValidate(backup)}
                        disabled={backup.status !== 'DONE' || validatingId === backup.id}
                        className="flex items-center gap-2"
                      >
                        {validatingId === backup.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Validando...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            Validar
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(backup)}
                        disabled={backup.status !== 'DONE' || downloadingId === backup.id}
                        className="flex items-center gap-2"
                      >
                        {downloadingId === backup.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Baixando...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Download
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(backup)}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Deletar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o backup "{backupToDelete?.file_name}"?
              Esta ação não pode ser desfeita e o arquivo será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBackups;
