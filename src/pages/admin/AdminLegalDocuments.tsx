import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "@/styles/quill-custom.css";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { legalDocumentService } from "@/services/api";
import {
  Plus,
  Loader2,
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  Edit,
  Save,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LegalDocument {
  id: number;
  type: "TERMS" | "PRIVACY" | "CAMPAIGN_RULES";
  version: number;
  content: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  TERMS: "Termos de Serviço",
  PRIVACY: "Política de Privacidade",
  CAMPAIGN_RULES: "Regras da Campanha",
};

// Configuração do editor de texto rico
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    [{ size: [] }],
    ["bold", "italic", "underline", "strike", "blockquote"],
    [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    ["link", "image"],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "font",
  "size",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "list",
  "bullet",
  "indent",
  "color",
  "background",
  "align",
  "link",
  "image",
];

const AdminLegalDocuments = () => {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<LegalDocument | null>(null);
  const [viewingDocument, setViewingDocument] = useState<LegalDocument | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    type: "" as "TERMS" | "PRIVACY" | "CAMPAIGN_RULES" | "",
    content: "",
    active: false,
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await legalDocumentService.getAll();
      setDocuments(data);
    } catch (error: any) {
      toast.error("Erro ao carregar documentos legais");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      type: "",
      content: "",
      active: false,
    });
    setEditingDocument(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (doc: LegalDocument) => {
    setFormData({
      type: doc.type,
      content: doc.content,
      active: doc.active,
    });
    setEditingDocument(doc);
    setIsDialogOpen(true);
  };

  const handleView = (doc: LegalDocument) => {
    setViewingDocument(doc);
    setIsViewDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.type) {
      toast.error("Selecione o tipo de documento");
      return;
    }

    if (!formData.content.trim()) {
      toast.error("O conteúdo do documento é obrigatório");
      return;
    }

    setIsCreating(true);
    try {
      if (editingDocument) {
        // Atualizar documento existente
        await legalDocumentService.update(editingDocument.id, {
          content: formData.content,
          active: formData.active,
        });
        toast.success("Documento atualizado com sucesso");
      } else {
        // Criar nova versão
        await legalDocumentService.create({
          type: formData.type,
          content: formData.content,
          active: formData.active,
        });
        toast.success("Nova versão do documento criada com sucesso");
      }
      setIsDialogOpen(false);
      loadDocuments();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar documento");
    } finally {
      setIsCreating(false);
    }
  };

  const handleActivate = async (doc: LegalDocument) => {
    try {
      await legalDocumentService.activate(doc.id);
      toast.success("Documento ativado com sucesso");
      loadDocuments();
    } catch (error: any) {
      toast.error(error.message || "Erro ao ativar documento");
    }
  };

  const getDocumentsByType = (type: string) => {
    return documents.filter((doc) => doc.type === type);
  };

  const getActiveDocument = (type: string) => {
    return documents.find((doc) => doc.type === type && doc.active);
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
          <h2 className="text-3xl font-bold mb-2">Documentos Legais</h2>
          <p className="text-muted-foreground">
            Gerencie termos de serviço, política de privacidade e regras da campanha
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Versão
        </Button>
      </div>

      <div className="grid gap-6">
        {["TERMS", "PRIVACY", "CAMPAIGN_RULES"].map((type) => {
          const typeDocs = getDocumentsByType(type);
          const activeDoc = getActiveDocument(type);

          return (
            <Card key={type}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{DOCUMENT_TYPE_LABELS[type]}</CardTitle>
                    <CardDescription>
                      {activeDoc
                        ? `Versão ${activeDoc.version} ativa`
                        : "Nenhuma versão ativa"}
                    </CardDescription>
                  </div>
                  {activeDoc && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Ativo
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {typeDocs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Nenhuma versão criada ainda
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Versão</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {typeDocs.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">
                            Versão {doc.version}
                          </TableCell>
                          <TableCell>
                            {doc.active ? (
                              <Badge variant="default" className="bg-green-500">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inativo</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(doc)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(doc)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {!doc.active && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleActivate(doc)}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog de criação/edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDocument
                ? `Editar Versão ${editingDocument.version}`
                : "Criar Nova Versão"}
            </DialogTitle>
            <DialogDescription>
              {editingDocument
                ? "Edite o conteúdo do documento. Ao ativar, esta versão substituirá a versão ativa atual."
                : "Crie uma nova versão do documento. Você pode ativá-la depois."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Documento</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as any })
                }
                disabled={!!editingDocument}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TERMS">Termos de Serviço</SelectItem>
                  <SelectItem value="PRIVACY">Política de Privacidade</SelectItem>
                  <SelectItem value="CAMPAIGN_RULES">Regras da Campanha</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo</Label>
              <div className="border rounded-lg overflow-hidden">
                <ReactQuill
                  theme="snow"
                  value={formData.content}
                  onChange={(value) =>
                    setFormData({ ...formData, content: value })
                  }
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="Digite o conteúdo do documento..."
                  style={{ minHeight: "400px" }}
                  className="bg-background"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use a barra de ferramentas para formatar o texto, adicionar links, cores e muito mais
              </p>
            </div>

            {!editingDocument && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked })
                  }
                />
                <Label htmlFor="active">Ativar automaticamente</Label>
                <p className="text-xs text-muted-foreground">
                  (Isso desativará a versão ativa atual)
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de visualização */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewingDocument &&
                `${DOCUMENT_TYPE_LABELS[viewingDocument.type]} - Versão ${viewingDocument.version}`}
            </DialogTitle>
            <DialogDescription>
              {viewingDocument &&
                `Criado em ${new Date(viewingDocument.created_at).toLocaleDateString("pt-BR")}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {viewingDocument && (
              <div
                className="prose max-w-none p-4 border rounded-lg bg-muted/50"
                dangerouslySetInnerHTML={{ __html: viewingDocument.content }}
              />
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLegalDocuments;
