import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { smtpConfigService } from "@/services/api";
import { Loader2, Mail, Save, CheckCircle2, AlertCircle, Send, XCircle, Bell, User, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import OrderNotificationEmails from "@/components/admin/OrderNotificationEmails";
import Executives from "@/components/admin/Executives";
import AdminAccess from "@/components/admin/AdminAccess";

interface SmtpConfig {
  id?: number;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  from_email: string;
  from_name: string;
  active?: boolean;
}

const AdminSmtpConfig = () => {
  const [config, setConfig] = useState<SmtpConfig>({
    host: "",
    port: 587,
    secure: false,
    user: "",
    from_email: "",
    from_name: "",
  });
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [hasConfig, setHasConfig] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    error?: string;
    code?: string;
  } | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const { admin } = useAdminAuth();

  useEffect(() => {
    loadConfig();
    // Preencher email de teste com email do admin
    if (admin?.email) {
      setTestEmail(admin.email);
    }
  }, [admin]);

  const loadConfig = async () => {
    setIsFetching(true);
    try {
      const response = await smtpConfigService.getConfig();
      if (response.config) {
        // Garantir que secure seja boolean
        setConfig({
          ...response.config,
          secure: Boolean(response.config.secure),
        });
        setHasConfig(true);
        // Não preencher senha por segurança
        setPassword("");
      } else {
        setHasConfig(false);
      }
    } catch (error: any) {
      console.error("Erro ao carregar configuração:", error);
      toast.error("Erro ao carregar configuração SMTP");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Senha só é obrigatória se não houver configuração salva
      if (!password && !hasConfig) {
        toast.error("Senha é obrigatória para criar nova configuração");
        setIsLoading(false);
        return;
      }

      // Se tem config salva e senha vazia, enviar null para manter senha existente
      await smtpConfigService.setConfig({
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user,
        password: password || (hasConfig ? null : undefined),
        from_email: config.from_email,
        from_name: config.from_name,
      });

      toast.success("Configuração SMTP salva com sucesso!");
      setPassword("");
      await loadConfig();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configuração SMTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!hasConfig) {
      toast.error("Salve a configuração SMTP antes de testar");
      return;
    }

    if (!testEmail.trim()) {
      toast.error("Digite um email para teste");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await smtpConfigService.testConfig(testEmail);
      setTestResult({
        success: true,
        message: result.message || "Email de teste enviado com sucesso!",
      });
      toast.success("Email de teste enviado com sucesso!");
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || "Erro ao enviar email de teste",
        error: error.error || error.message,
        code: error.code,
      });
      toast.error(error.message || "Erro ao enviar email de teste");
    } finally {
      setIsTesting(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Configurações</h2>
        <p className="text-muted-foreground">
          Configure o servidor SMTP e gerencie emails de notificação
        </p>
      </div>

      <Tabs defaultValue="smtp" className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="smtp" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            SMTP
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="executives" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Executivos
          </TabsTrigger>
          <TabsTrigger value="admin-access" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Acesso Admin
          </TabsTrigger>
        </TabsList>

        <TabsContent value="smtp" className="space-y-6">

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          A senha será criptografada antes de ser armazenada. Se você já tem uma configuração
          salva e não deseja alterar a senha, deixe o campo de senha vazio.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            <CardTitle>Configuração do Servidor SMTP</CardTitle>
          </div>
          <CardDescription>
            Configure os dados do servidor de email para envio de emails de recuperação de senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Host */}
              <div className="space-y-2">
                <Label htmlFor="host">Host SMTP *</Label>
                <Input
                  id="host"
                  type="text"
                  placeholder="smtp.gmail.com"
                  value={config.host}
                  onChange={(e) => setConfig({ ...config, host: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Ex: smtp.gmail.com, smtp.outlook.com
                </p>
              </div>

              {/* Port */}
              <div className="space-y-2">
                <Label htmlFor="port">Porta *</Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="587"
                  value={config.port}
                  onChange={(e) =>
                    setConfig({ ...config, port: parseInt(e.target.value) || 587 })
                  }
                  required
                  min={1}
                  max={65535}
                />
                <p className="text-xs text-muted-foreground">
                  Porta padrão: 587 (TLS) ou 465 (SSL)
                </p>
              </div>

              {/* Secure */}
              <div className="space-y-2">
                <Label htmlFor="secure">Conexão Segura (TLS/SSL)</Label>
                <div className="flex items-center gap-3">
                  <Switch
                    id="secure"
                    checked={Boolean(config.secure)}
                    onCheckedChange={(checked) => {
                      setConfig((prev) => ({ ...prev, secure: Boolean(checked) }));
                    }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {config.secure ? "SSL/TLS habilitado" : "TLS (STARTTLS)"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Habilitar para porta 465 (SSL), desabilitar para porta 587 (TLS)
                </p>
              </div>

              {/* User */}
              <div className="space-y-2">
                <Label htmlFor="user">Email de Autenticação *</Label>
                <Input
                  id="user"
                  type="email"
                  placeholder="seu@email.com"
                  value={config.user}
                  onChange={(e) => setConfig({ ...config, user: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Email usado para autenticar no servidor SMTP
                </p>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  Senha {hasConfig ? "(deixe vazio para manter)" : "*"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!hasConfig}
                />
                <p className="text-xs text-muted-foreground">
                  {hasConfig
                    ? "Digite apenas se desejar alterar a senha atual"
                    : "Senha do email de autenticação"}
                </p>
              </div>

              {/* From Email */}
              <div className="space-y-2">
                <Label htmlFor="from_email">Email Remetente *</Label>
                <Input
                  id="from_email"
                  type="email"
                  placeholder="noreply@exemplo.com"
                  value={config.from_email}
                  onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Email que aparecerá como remetente
                </p>
              </div>

              {/* From Name */}
              <div className="space-y-2">
                <Label htmlFor="from_name">Nome Remetente *</Label>
                <Input
                  id="from_name"
                  type="text"
                  placeholder="Sistema de Campanha"
                  value={config.from_name}
                  onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Nome que aparecerá como remetente
                </p>
              </div>
            </div>

            {hasConfig && (
              <Alert className="border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Você já possui uma configuração SMTP ativa. Preencha a senha apenas se desejar
                  alterá-la.
                </AlertDescription>
              </Alert>
            )}

            {/* Teste de Email */}
            {hasConfig && (
              <Card className="border-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-blue-600" />
                    Testar Configuração SMTP
                  </CardTitle>
                  <CardDescription>
                    Envie um email de teste para validar se a configuração está funcionando
                    corretamente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="test-email">Email para teste</Label>
                    <Input
                      id="test-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Email onde o teste será enviado (padrão: seu email de login)
                    </p>
                  </div>

                  {testResult && (
                    <Alert
                      variant={testResult.success ? "default" : "destructive"}
                      className={
                        testResult.success
                          ? "bg-green-600 border-green-700 text-white"
                          : "bg-red-600 border-red-700 text-white"
                      }
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      ) : (
                        <XCircle className="h-4 w-4 text-white" />
                      )}
                      <AlertTitle className={testResult.success ? "text-white font-bold" : "text-white font-bold"}>
                        {testResult.success ? "Sucesso!" : "Erro no teste"}
                      </AlertTitle>
                      <AlertDescription className={testResult.success ? "text-white" : "text-white"}>
                        <p className="font-medium">{testResult.message}</p>
                        {testResult.error && (
                          <div className="mt-2 p-3 bg-white/20 rounded text-sm backdrop-blur-sm">
                            <p className="font-semibold mb-1">Detalhes do erro:</p>
                            <p className="whitespace-pre-wrap">{testResult.error}</p>
                            {testResult.code && (
                              <p className="mt-2 text-xs opacity-90 font-mono">Código: {testResult.code}</p>
                            )}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestEmail}
                    disabled={isTesting || !testEmail.trim()}
                    className="w-full"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando teste...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Email de Teste
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configuração
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Informações de ajuda */}
      <Card>
        <CardHeader>
          <CardTitle>Informações de Configuração</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Gmail</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Host: smtp.gmail.com</li>
                <li>Porta: 587 (TLS) ou 465 (SSL)</li>
                <li>Secure: false para 587, true para 465</li>
                <li>Use uma senha de app do Google (não a senha da conta)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Outlook/Hotmail</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Host: smtp-mail.outlook.com</li>
                <li>Porta: 587</li>
                <li>Secure: false</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Outros provedores</h4>
              <p className="text-muted-foreground">
                Consulte a documentação do seu provedor de email para obter as configurações SMTP
                corretas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <OrderNotificationEmails />
        </TabsContent>

        <TabsContent value="executives" className="space-y-6">
          <Executives />
        </TabsContent>

        <TabsContent value="admin-access" className="space-y-6">
          <AdminAccess />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSmtpConfig;
