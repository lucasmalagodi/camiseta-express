import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { executiveNotificationEmailService, executiveService } from "@/services/api";
import { Loader2, Mail, Plus, Trash2, Edit2, Check, X, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ExecutiveNotificationEmail {
  id: number;
  executiveId: number;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Executive {
  id: number;
  code: string;
  email: string;
  name?: string;
  active: boolean;
}

const ExecutiveNotificationEmails = () => {
  const [emails, setEmails] = useState<ExecutiveNotificationEmail[]>([]);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState<number | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingEmail, setEditingEmail] = useState("");

  useEffect(() => {
    loadExecutives();
  }, []);

  useEffect(() => {
    if (selectedExecutiveId) {
      loadEmails(selectedExecutiveId);
    } else {
      setEmails([]);
    }
  }, [selectedExecutiveId]);

  const loadExecutives = async () => {
    try {
      const data = await executiveService.getAll();
      setExecutives(data);
      if (data.length > 0 && !selectedExecutiveId) {
        setSelectedExecutiveId(data[0].id);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar executivos");
      console.error(error);
    }
  };

  const loadEmails = async (executiveId: number) => {
    setIsLoading(true);
    try {
      const data = await executiveNotificationEmailService.getByExecutiveId(executiveId);
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
    if (!selectedExecutiveId) {
      toast.error("Selecione um executivo");
      return;
    }
    if (!newEmail.trim()) {
      toast.error("Email é obrigatório");
      return;
    }

    setIsSubmitting(true);
    try {
      await executiveNotificationEmailService.create({
        executiveId: selectedExecutiveId,
        email: newEmail,
      });
      toast.success("Email adicionado com sucesso!");
      setNewEmail("");
      await loadEmails(selectedExecutiveId);
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar email");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      await executiveNotificationEmailService.update(id, { active: !currentActive });
      toast.success(`Email ${!currentActive ? "ativado" : "desativado"} com sucesso!`);
      if (selectedExecutiveId) {
        await loadEmails(selectedExecutiveId);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar email");
    }
  };

  const handleStartEdit = (email: ExecutiveNotificationEmail) => {
    setEditingId(email.id);
    setEditingEmail(email.email);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingEmail("");
  };

  const handleSaveEdit = async (id: number) => {
    if (!editingEmail.trim()) {
      toast.error("Email é obrigatório");
      return;
    }

    setIsSubmitting(true);
    try {
      await executiveNotificationEmailService.update(id, { email: editingEmail });
      toast.success("Email atualizado com sucesso!");
      setEditingId(null);
      setEditingEmail("");
      if (selectedExecutiveId) {
        await loadEmails(selectedExecutiveId);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar email");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja remover este email de notificação?")) {
      return;
    }

    try {
      await executiveNotificationEmailService.delete(id);
      toast.success("Email removido com sucesso!");
      if (selectedExecutiveId) {
        await loadEmails(selectedExecutiveId);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover email");
    }
  };

  const selectedExecutive = executives.find((e) => e.id === selectedExecutiveId);
  const activeCount = emails.filter((e) => e.active).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Emails Adicionais de Notificação</h2>
        <p className="text-muted-foreground">
          Gerencie emails adicionais que receberão notificações junto com o email principal do executivo
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Você pode adicionar múltiplos emails adicionais para cada executivo. Todos os emails ativos receberão
          notificações quando uma agência relacionada ao executivo fizer um pedido.
        </AlertDescription>
      </Alert>

      {/* Seletor de executivo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Selecionar Executivo
          </CardTitle>
          <CardDescription>
            Selecione o executivo para gerenciar seus emails adicionais de notificação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="executive-select">Executivo</Label>
            <Select
              value={selectedExecutiveId?.toString() || ""}
              onValueChange={(value) => setSelectedExecutiveId(parseInt(value))}
            >
              <SelectTrigger id="executive-select">
                <SelectValue placeholder="Selecione um executivo" />
              </SelectTrigger>
              <SelectContent>
                {executives.map((executive) => (
                  <SelectItem key={executive.id} value={executive.id.toString()}>
                    {executive.name || executive.code} ({executive.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedExecutiveId && (
        <>
          {/* Formulário para adicionar novo email */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <CardTitle>Adicionar Email</CardTitle>
              </div>
              <CardDescription>
                Adicione um email adicional para o executivo: {selectedExecutive?.name || selectedExecutive?.code}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email *</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end">
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
                    Emails de Notificação
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
                  <p>Nenhum email adicional cadastrado</p>
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
                              <span>{email.email}</span>
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
        </>
      )}
    </div>
  );
};

export default ExecutiveNotificationEmails;
