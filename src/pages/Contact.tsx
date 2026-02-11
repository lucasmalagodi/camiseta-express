import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send } from "lucide-react";
import { ticketService } from "@/services/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Contact = () => {
  const navigate = useNavigate();
  const { agency } = useAuth();
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agency) {
      toast.error("Você precisa estar logado para criar um ticket");
      navigate("/login");
      return;
    }

    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsLoading(true);

    try {
      const result = await ticketService.create({
        subject: formData.subject,
        message: formData.message,
      });

      toast.success("Ticket criado com sucesso! Você receberá um email de confirmação.");
      navigate(`/tickets/${result.id}`);
    } catch (error: any) {
      console.error("Erro ao criar ticket:", error);
      toast.error(error.message || "Erro ao criar ticket. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            <CardTitle className="text-2xl">Entre em Contato</CardTitle>
          </div>
          <p className="text-muted-foreground mt-2">
            Preencha o formulário abaixo para criar um ticket de suporte. Nossa equipe entrará em contato em breve.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto *</Label>
              <Input
                id="subject"
                placeholder="Ex: Problema com pedido, Dúvida sobre pontos, etc."
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem *</Label>
              <Textarea
                id="message"
                placeholder="Descreva sua dúvida ou problema em detalhes..."
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                required
                disabled={isLoading}
                rows={8}
                className="resize-none"
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                <Send className="w-4 h-4 mr-2" />
                {isLoading ? "Enviando..." : "Enviar Ticket"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/tickets")}
                disabled={isLoading}
              >
                Ver Meus Tickets
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Contact;
