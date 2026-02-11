import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { orderService } from "@/services/api";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { formatPoints } from "@/lib/utils";

interface Order {
  id: number;
  agencyId: number;
  totalPoints: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const useOrderNotifications = () => {
  const { isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const lastOrderIdRef = useRef<number | null>(null);
  const hasRequestedPermissionRef = useRef(false);

  // Solicitar permissão de notificação
  useEffect(() => {
    if (!isAuthenticated) {
      console.log("🔔 useOrderNotifications: Não autenticado");
      return;
    }

    console.log("🔔 useOrderNotifications: Inicializando...");

    // Carregar último ID conhecido do localStorage
    const storedLastOrderId = localStorage.getItem("lastOrderId");
    if (storedLastOrderId) {
      lastOrderIdRef.current = parseInt(storedLastOrderId, 10);
      console.log("🔔 Último ID carregado do localStorage:", lastOrderIdRef.current);
    } else {
      console.log("🔔 Nenhum ID anterior encontrado no localStorage");
    }

    // Verificar se já temos permissão
    if ("Notification" in window) {
      const currentPermission = Notification.permission;
      console.log("🔔 Permissão atual:", currentPermission);
      setPermission(currentPermission);

      // Solicitar permissão se ainda não foi solicitada e não foi negada
      if (
        currentPermission === "default" &&
        !hasRequestedPermissionRef.current
      ) {
        console.log("🔔 Solicitando permissão de notificação...");
        hasRequestedPermissionRef.current = true;
        Notification.requestPermission().then((result) => {
          console.log("🔔 Resultado da solicitação de permissão:", result);
          setPermission(result);
          if (result === "granted") {
            // Mostrar notificação de teste
            try {
              new Notification("Notificações Ativadas", {
                body: "Você receberá notificações quando houver novos pedidos.",
                icon: "/favicon.ico",
              });
              console.log("🔔 Notificação de teste enviada!");
            } catch (error) {
              console.error("🔔 Erro ao enviar notificação de teste:", error);
            }
          }
        });
      } else {
        console.log("🔔 Permissão já foi solicitada ou negada");
      }
    } else {
      console.log("🔔 Navegador não suporta notificações");
    }
  }, [isAuthenticated]);

  // Polling para verificar novos pedidos
  useEffect(() => {
    if (!isAuthenticated) {
      console.log("🔔 Não autenticado, não verificando pedidos");
      return;
    }
    
    if (permission !== "granted") {
      console.log("🔔 Permissão de notificação não concedida:", permission);
      return;
    }
    
    console.log("🔔 Iniciando polling de notificações...");

    const checkNewOrders = async () => {
      try {
        console.log("🔔 Verificando novos pedidos...");
        const latestOrder = await orderService.getLatest();
        
        if (!latestOrder) {
          console.log("🔔 Nenhum pedido encontrado");
          return;
        }

        const currentOrderId = latestOrder.id;
        console.log("🔔 Último pedido encontrado:", currentOrderId);
        console.log("🔔 Último ID conhecido:", lastOrderIdRef.current);

        // Se não temos um último ID, apenas armazenar o atual
        if (lastOrderIdRef.current === null) {
          console.log("🔔 Primeira verificação, armazenando ID:", currentOrderId);
          lastOrderIdRef.current = currentOrderId;
          localStorage.setItem("lastOrderId", currentOrderId.toString());
          return;
        }

        // Se encontramos um novo pedido
        if (currentOrderId > lastOrderIdRef.current) {
          console.log("🔔 NOVO PEDIDO DETECTADO!", currentOrderId);
          
          // Atualizar último ID conhecido
          lastOrderIdRef.current = currentOrderId;
          localStorage.setItem("lastOrderId", currentOrderId.toString());

          // Verificar se temos permissão
          if (Notification.permission !== "granted") {
            console.log("🔔 Permissão de notificação não concedida:", Notification.permission);
            return;
          }

          // Exibir notificação
          try {
            const notification = new Notification("Novo Pedido Recebido!", {
              body: `Pedido #${currentOrderId} - ${formatPoints(latestOrder.totalPoints)} pontos`,
              icon: "/favicon.ico",
              tag: `order-${currentOrderId}`, // Evitar notificações duplicadas
              requireInteraction: false,
            });

            console.log("🔔 Notificação criada com sucesso!");

            // Ao clicar na notificação, navegar para o pedido
            notification.onclick = () => {
              window.focus();
              navigate(`/admin/pedidos/${currentOrderId}`);
              notification.close();
            };

            // Fechar notificação após 10 segundos
            setTimeout(() => {
              notification.close();
            }, 10000);
          } catch (notifError) {
            console.error("🔔 Erro ao criar notificação:", notifError);
          }
        } else {
          console.log("🔔 Nenhum novo pedido (ID atual:", currentOrderId, "<= ID conhecido:", lastOrderIdRef.current, ")");
        }
      } catch (error) {
        console.error("🔔 Erro ao verificar novos pedidos:", error);
        // Não exibir erro ao usuário para não poluir a interface
      }
    };

    // Verificar imediatamente ao montar
    checkNewOrders();

    // Configurar polling a cada 30 segundos
    const intervalId = setInterval(checkNewOrders, 30 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated, permission, navigate]);
};
