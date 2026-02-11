import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft, CheckCircle2 } from "lucide-react";

const CheckoutInstructions = () => {
  const navigate = useNavigate();

  return (
    <div className="pt-24 pb-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Instruções do Pedido
            </h1>
          </div>
          <p className="text-muted-foreground">
            Siga as instruções abaixo para receber seu pedido
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Próximos Passos</h2>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">1</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Aguarde a Confirmação</h3>
                <p className="text-muted-foreground">
                  Seu pedido foi registrado e está sendo processado. Você receberá uma confirmação por email em breve.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">2</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Verificação do Estoque</h3>
                <p className="text-muted-foreground">
                  Nossa equipe verificará a disponibilidade dos produtos e preparará seu pedido para envio.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">3</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Envio e Entrega</h3>
                <p className="text-muted-foreground">
                  Após a confirmação, seu pedido será enviado para o endereço cadastrado. Você receberá informações de rastreamento quando disponíveis.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Acompanhamento</h3>
                <p className="text-muted-foreground">
                  Você pode acompanhar o status do seu pedido através do seu painel de agência ou entrando em contato conosco.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Important Information */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
            Informações Importantes
          </h3>
          <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
            <li>• O prazo de entrega pode variar conforme a disponibilidade dos produtos</li>
            <li>• Você receberá notificações por email sobre o status do seu pedido</li>
            <li>• Em caso de dúvidas, entre em contato com nossa equipe de suporte</li>
            <li>• Os pontos foram debitados da sua conta no momento da confirmação do pedido</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate("/")} size="lg" className="w-full">
            Voltar para Home
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/cart")}
            className="w-full"
          >
            Ver Carrinho
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutInstructions;
