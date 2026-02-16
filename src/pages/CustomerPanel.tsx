import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { agencyService, legalDocumentService } from "@/services/api";
import {
  ShoppingBag,
  User,
  Lock,
  FileText,
  Loader2,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import MyOrders from "./MyOrders";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AgencyData {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

interface CampaignRules {
  id: number;
  type: string;
  version: number;
  content: string;
  active: boolean;
}

const CustomerPanel = () => {
  const navigate = useNavigate();
  const { agency } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");

  // Dados da agência
  const [agencyData, setAgencyData] = useState<AgencyData | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: {
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    },
  });

  // Senha
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Regras da campanha
  const [campaignRules, setCampaignRules] = useState<CampaignRules | null>(null);
  const [isViewingRules, setIsViewingRules] = useState(false);

  useEffect(() => {
    if (!agency) {
      toast.error("Você precisa estar logado para acessar o painel");
      navigate("/login");
      return;
    }

    loadData();
  }, [agency]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Carregar dados da agência
      const data = await agencyService.getMe();
      setAgencyData(data);
      setFormData({
        name: data.name || "",
        phone: data.phone || "",
        address: data.address || {
          cep: "",
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "",
        },
      });

      // Carregar regras da campanha ativas
      try {
        const rules = await legalDocumentService.getActiveByType("CAMPAIGN_RULES");
        setCampaignRules(rules);
      } catch (error) {
        // Pode não haver regras ativas
        setCampaignRules(null);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar dados");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveData = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await agencyService.updateMe({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
      });

      toast.success("Dados atualizados com sucesso!");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar dados");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    setIsChangingPassword(true);

    try {
      await agencyService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      toast.success("Senha alterada com sucesso!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Painel do Cliente</h1>
        <p className="text-muted-foreground">
          Gerencie seus pedidos, dados pessoais e segurança
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Meus Pedidos
          </TabsTrigger>
          <TabsTrigger value="data">
            <User className="w-4 h-4 mr-2" />
            Meus Dados
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="w-4 h-4 mr-2" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="rules">
            <FileText className="w-4 h-4 mr-2" />
            Regras da Campanha
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          <MyOrders />
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Meus Dados</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais e endereço
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveData} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Agência</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cep">CEP</Label>
                      <Input
                        id="cep"
                        value={formData.address.cep}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, cep: e.target.value },
                          })
                        }
                        placeholder="00000-000"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="street">Rua</Label>
                      <Input
                        id="street"
                        value={formData.address.street}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, street: e.target.value },
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="number">Número</Label>
                      <Input
                        id="number"
                        value={formData.address.number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, number: e.target.value },
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        value={formData.address.complement}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, complement: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        value={formData.address.neighborhood}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, neighborhood: e.target.value },
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={formData.address.city}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, city: e.target.value },
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado (UF)</Label>
                      <Input
                        id="state"
                        value={formData.address.state}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, state: e.target.value.toUpperCase() },
                          })
                        }
                        maxLength={2}
                        required
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Mantenha sua conta segura com uma senha forte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" disabled={isChangingPassword}>
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Alterar Senha
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Regras da Campanha</CardTitle>
              <CardDescription>
                Visualize as regras ativas da campanha
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaignRules ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        Versão {campaignRules.version}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Atualizada em{" "}
                        {campaignRules.created_at ? new Date(campaignRules.created_at).toLocaleDateString("pt-BR") : ""}
                      </p>
                    </div>
                    <Badge variant="default" className="bg-green-500">
                      Ativo
                    </Badge>
                  </div>
                  <Button onClick={() => setIsViewingRules(true)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar Regras
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Nenhuma regra de campanha ativa no momento.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para visualizar regras */}
      <Dialog open={isViewingRules} onOpenChange={setIsViewingRules}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Regras da Campanha - Versão {campaignRules?.version}
            </DialogTitle>
            <DialogDescription>
              {campaignRules &&
                `Atualizada em ${campaignRules.created_at ? new Date(campaignRules.created_at).toLocaleDateString("pt-BR") : ""}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {campaignRules && (
              <div
                className="prose max-w-none p-4 border rounded-lg bg-muted/50"
                dangerouslySetInnerHTML={{ __html: campaignRules.content }}
              />
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewingRules(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerPanel;
