import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShoppingCart,
  TrendingUp,
  Info,
  Loader2,
  RefreshCw,
  DollarSign,
  Calendar,
  Store,
  BarChart3,
  GripVertical,
  Maximize2,
  Minimize2,
  Lock,
  Unlock,
  Package,
} from "lucide-react";
import { dashboardService, dashboardWidgetService, reportService } from "@/services/api";
import { toast } from "sonner";
import { formatPoints } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ReportWidget from "@/components/admin/ReportWidget";
import { Plus } from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";

interface OrdersSummary {
  totalOrders: number;
  totalPointsSpent: number;
  ordersThisMonth: number;
}

interface TopAgency {
  agencyId: number;
  agencyName: string;
  cnpj: string;
  totalPoints?: number;
  ordersCount?: number;
  branch: string;
  executive?: string;
}

interface AgencyOrder {
  id: number;
  totalPoints: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  itemsCount: number;
}

type CardId = 
  | 'orders-summary'
  | 'top-agency-orders'
  | 'products-inventory';

interface CardConfig {
  id: CardId;
  order: number;
  expanded: number; // 0 = 1 coluna, 1 = 2 colunas, 2 = 3 colunas
}

interface ProductInventoryRow {
  id: number;
  name: string;
  categoryName: string | null;
  availableQuantity: number;
  stockSource: "variants" | "product";
  variants?: Array<{
    model: "MASCULINO" | "FEMININO" | "UNISEX";
    size: string;
    stock: number;
  }>;
}

interface ProductsInventorySummary {
  items: ProductInventoryRow[];
  totalProducts: number;
  totalAvailableUnits: number;
}

const STORAGE_KEY = 'dashboard-cards-config';
const STORAGE_LOCK_KEY = 'dashboard-cards-locked';
const DEFAULT_CARDS: CardConfig[] = [
  { id: 'orders-summary', order: 0, expanded: 0 },
  { id: 'top-agency-orders', order: 1, expanded: 0 },
  { id: 'products-inventory', order: 2, expanded: 0 },
];

const AdminDashboard = () => {
  const [ordersSummary, setOrdersSummary] = useState<OrdersSummary | null>(null);
  const [topAgencyOrders, setTopAgencyOrders] = useState<TopAgency | null>(null);
  const [productsInventory, setProductsInventory] = useState<ProductsInventorySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Report widgets state
  const [reportWidgets, setReportWidgets] = useState<Array<{
    id: number;
    reportId: number;
    position: number;
    expanded?: number; // 0 = 1 col, 1 = 2 cols, 2 = 3 cols
    report: {
      id: number;
      name: string;
      visualizationType: string;
    };
  }>>([]);
  const [isAddWidgetDialogOpen, setIsAddWidgetDialogOpen] = useState(false);
  const [availableReports, setAvailableReports] = useState<Array<{
    id: number;
    name: string;
    visualizationType: string;
  }>>([]);
  
  // Card management state
  const [cardsConfig, setCardsConfig] = useState<CardConfig[]>(DEFAULT_CARDS);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [draggedItemType, setDraggedItemType] = useState<'card' | 'widget' | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dragOverItemType, setDragOverItemType] = useState<'card' | 'widget' | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  
  // Drill-down state
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(null);
  const [agencyOrders, setAgencyOrders] = useState<AgencyOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { sortedData: sortedAgencyOrders, handleSort, getSortIcon } = useTableSort(agencyOrders);

  const formatModelLabel = (model: "MASCULINO" | "FEMININO" | "UNISEX") => {
    if (model === "MASCULINO") return "Masculino";
    if (model === "FEMININO") return "Feminino";
    return "Unisex";
  };

  const renderVariantBreakdown = (variants: NonNullable<ProductInventoryRow["variants"]>) => {
    if (!variants || variants.length === 0) return null;
    const byModel = variants.reduce((acc, v) => {
      (acc[v.model] ||= []).push(v);
      return acc;
    }, {} as Record<"MASCULINO" | "FEMININO" | "UNISEX", typeof variants>);

    const models: Array<"MASCULINO" | "FEMININO" | "UNISEX"> = ["MASCULINO", "FEMININO", "UNISEX"];
    const lines = models
      .filter((m) => (byModel[m]?.length || 0) > 0)
      .map((m) => {
        const parts = byModel[m]
          .map((x) => `${x.size}: ${x.stock}`)
          .join(" • ");
        const total = byModel[m].reduce((s, x) => s + (x.stock || 0), 0);
        return `${formatModelLabel(m)} (${total}) — ${parts}`;
      });

    return (
      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        {lines.map((line) => (
          <div key={line} className="truncate" title={line}>
            {line}
          </div>
        ))}
      </div>
    );
  };

  // Load cards config from localStorage (mescla novos cards padrão, ex.: estoque de produtos)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let initial = DEFAULT_CARDS;
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CardConfig[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const defaultIds = DEFAULT_CARDS.map((c) => c.id);
          const savedMap = new Map(parsed.map((c) => [c.id, c]));
          const merged: CardConfig[] = [];
          let order = 0;
          for (const def of DEFAULT_CARDS) {
            const existing = savedMap.get(def.id);
            merged.push(
              existing ? { ...existing, order: order++ } : { ...def, order: order++ }
            );
          }
          for (const c of parsed) {
            if (!defaultIds.includes(c.id)) {
              merged.push({ ...c, order: order++ });
            }
          }
          initial = merged;
        }
      } catch (error) {
        console.error("Erro ao carregar configuração dos cards:", error);
      }
    }

    setCardsConfig(initial);

    const savedLock = localStorage.getItem(STORAGE_LOCK_KEY);
    if (savedLock !== null) {
      setIsLocked(savedLock === "true");
    }
  }, []);

  // Save cards config to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cardsConfig));
  }, [cardsConfig]);

  // Save lock state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_LOCK_KEY, String(isLocked));
  }, [isLocked]);


  useEffect(() => {
    loadDashboardData();
    loadReportWidgets();
  }, []);

  const loadReportWidgets = async () => {
    try {
      const widgets = await dashboardWidgetService.getAll();
      // Sort by position to ensure correct order
      const sortedWidgets = [...widgets].sort((a, b) => a.position - b.position);
      // Expanded state já vem do banco
      setReportWidgets(sortedWidgets);
    } catch (error) {
      console.error("Erro ao carregar widgets de relatórios:", error);
    }
  };

  const loadAvailableReports = async () => {
    try {
      const reports = await reportService.getAll();
      setAvailableReports(reports);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
      toast.error("Erro ao carregar relatórios disponíveis");
    }
  };

  const handleAddWidget = async (reportId: number) => {
    try {
      await dashboardWidgetService.create({ reportId });
      toast.success("Widget adicionado ao dashboard");
      setIsAddWidgetDialogOpen(false);
      loadReportWidgets();
    } catch (error: any) {
      console.error("Erro ao adicionar widget:", error);
      toast.error(error.message || "Erro ao adicionar widget");
    }
  };

  const handleRemoveWidget = async (widgetId: number) => {
    // Store original widgets in case we need to restore
    const originalWidgets = [...reportWidgets];
    
    try {
      console.log("Removendo widget:", widgetId);
      
      // Delete from backend first
      await dashboardWidgetService.delete(widgetId);
      console.log("Widget removido com sucesso do backend");
      
      // Remove from local state after successful deletion
      setReportWidgets(prev => prev.filter(w => w.id !== widgetId));
      
      toast.success("Widget removido do dashboard");
    } catch (error: any) {
      console.error("Erro ao remover widget:", error);
      toast.error(error.message || "Erro ao remover widget");
      
      // Restore original widgets if deletion failed
      setReportWidgets(originalWidgets);
    }
  };

  // Widget expand handler - salva no banco
  const toggleWidgetExpand = async (widgetId: number) => {
    if (isLocked) return;
    
    const widget = reportWidgets.find(w => w.id === widgetId);
    if (!widget) return;
    
    const newExpanded = ((widget.expanded ?? 0) + 1) % 3;
    
    // Atualizar localmente primeiro para feedback imediato
    setReportWidgets(prev => prev.map(w => 
      w.id === widgetId 
        ? { ...w, expanded: newExpanded }
        : w
    ));
    
    // Salvar no banco
    try {
      await dashboardWidgetService.update(widgetId, { expanded: newExpanded });
    } catch (error: any) {
      console.error("Erro ao salvar estado expandido do widget:", error);
      toast.error("Erro ao salvar configuração do widget");
      // Reverter mudança local em caso de erro
      setReportWidgets(prev => prev.map(w => 
        w.id === widgetId 
          ? { ...w, expanded: widget.expanded ?? 0 }
          : w
      ));
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [summary, agencyByOrders, inventory] = await Promise.all([
        dashboardService.getOrdersSummary(),
        dashboardService.getTopAgencyByOrders(),
        dashboardService.getProductsInventory().catch((err) => {
          console.error(err);
          toast.error("Não foi possível carregar o estoque dos produtos");
          return {
            items: [] as ProductInventoryRow[],
            totalProducts: 0,
            totalAvailableUnits: 0,
          };
        }),
      ]);

      setOrdersSummary(summary);
      setTopAgencyOrders(agencyByOrders);
      setProductsInventory(inventory);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgencyClick = async (agencyId: number) => {
    setSelectedAgencyId(agencyId);
    setIsDialogOpen(true);
    setIsLoadingOrders(true);

    try {
      const orders = await dashboardService.getAgencyOrders(agencyId);
      setAgencyOrders(orders);
    } catch (error) {
      console.error("Erro ao carregar pedidos da agência:", error);
      toast.error("Erro ao carregar pedidos da agência");
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      CONFIRMED: "default",
      PENDING: "secondary",
      CANCELED: "destructive",
    };
    const labels: Record<string, string> = {
      CONFIRMED: "Confirmado",
      PENDING: "Pendente",
      CANCELED: "Cancelado",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  // Toggle lock state
  const toggleLock = () => {
    setIsLocked(prev => !prev);
  };

  // Unified drag and drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string, type: 'card' | 'widget') => {
    if (isLocked) {
      e.preventDefault();
      return;
    }
    setDraggedItemId(itemId);
    setDraggedItemType(type);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', `${type}-${itemId}`);
  };

  const handleDragOver = (e: React.DragEvent, itemId: string, type: 'card' | 'widget') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedItemId && draggedItemId !== itemId) {
      setDragOverItemId(itemId);
      setDragOverItemType(type);
    }
  };

  const handleDragLeave = () => {
    setDragOverItemId(null);
    setDragOverItemType(null);
  };

  const handleDrop = async (e: React.DragEvent, targetItemId: string, targetType: 'card' | 'widget') => {
    e.preventDefault();
    if (!draggedItemId || !draggedItemType || draggedItemId === targetItemId) {
      setDraggedItemId(null);
      setDraggedItemType(null);
      setDragOverItemId(null);
      setDragOverItemType(null);
      return;
    }

    try {
      // Get all items in order (cards + widgets)
      const allItems: Array<{ type: 'card' | 'widget'; id: string; order: number }> = [];
      
      // Add cards
      cardsConfig.forEach(card => {
        allItems.push({ type: 'card', id: card.id, order: card.order });
      });
      
      // Add widgets
      reportWidgets.forEach(widget => {
        allItems.push({ type: 'widget', id: `widget-${widget.id}`, order: widget.position + cardsConfig.length });
      });
      
      // Sort by order
      allItems.sort((a, b) => a.order - b.order);
      
      // Find indices
      const draggedIndex = allItems.findIndex(item => 
        item.type === draggedItemType && item.id === (draggedItemType === 'card' ? draggedItemId : `widget-${draggedItemId}`)
      );
      const targetIndex = allItems.findIndex(item => 
        item.type === targetType && item.id === (targetType === 'card' ? targetItemId : `widget-${targetItemId}`)
      );

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [dragged] = allItems.splice(draggedIndex, 1);
        allItems.splice(targetIndex, 0, dragged);
        
        // Update orders
        allItems.forEach((item, index) => {
          item.order = index;
        });

        // Separate cards and widgets
        const newCardsConfig: CardConfig[] = [];
        const widgetUpdates: Array<{ id: number; position: number }> = [];
        let cardIndex = 0;
        
        allItems.forEach((item, index) => {
          if (item.type === 'card') {
            const cardConfig = cardsConfig.find(c => c.id === item.id as CardId);
            if (cardConfig) {
              newCardsConfig.push({ ...cardConfig, order: cardIndex });
              cardIndex++;
            }
          } else {
            const widgetId = parseInt(item.id.replace('widget-', ''));
            // Position is absolute in the full list
            widgetUpdates.push({ id: widgetId, position: index });
          }
        });

        // Update cards config
        setCardsConfig(newCardsConfig);

        // Update widgets positions in backend (mantendo expanded)
        if (widgetUpdates.length > 0) {
          await Promise.all(
            widgetUpdates.map(({ id, position }) => {
              const widget = reportWidgets.find(w => w.id === id);
              return dashboardWidgetService.update(id, { 
                position,
                expanded: widget?.expanded ?? 0
              });
            })
          );
          
          // Update local state
          setReportWidgets(prev => prev.map(w => {
            const update = widgetUpdates.find(u => u.id === w.id);
            return update ? { ...w, position: update.position } : w;
          }));
        }
      }
    } catch (error: any) {
      console.error("Erro ao reordenar itens:", error);
      toast.error(error.message || "Erro ao reordenar itens");
      loadReportWidgets();
    } finally {
      setDraggedItemId(null);
      setDraggedItemType(null);
      setDragOverItemId(null);
      setDragOverItemType(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDraggedItemType(null);
    setDragOverItemId(null);
    setDragOverItemType(null);
  };

  // Expand/collapse handlers - cycles through: 1 col -> 2 cols -> 3 cols -> 1 col
  const toggleExpand = (cardId: CardId) => {
    if (isLocked) return;
    setCardsConfig(prev => 
      prev.map(card => 
        card.id === cardId 
          ? { ...card, expanded: (card.expanded + 1) % 3 } 
          : card
      )
    );
  };

  // Get sorted cards
  const sortedCards = [...cardsConfig].sort((a, b) => a.order - b.order);
  
  // Combine cards and widgets into a single ordered list
  const getAllDashboardItems = () => {
    const items: Array<{ type: 'card' | 'widget'; id: string; order: number; data: any }> = [];
    
    // Add cards
    sortedCards.forEach(card => {
      items.push({ type: 'card', id: card.id, order: card.order, data: card });
    });
    
    // Add widgets (position is absolute in the full list)
    reportWidgets.forEach(widget => {
      items.push({ 
        type: 'widget', 
        id: `widget-${widget.id}`, 
        order: widget.position, 
        data: widget 
      });
    });
    
    // Sort by order
    return items.sort((a, b) => a.order - b.order);
  };

  // Get card config
  const getCardConfig = (cardId: CardId) => {
    return cardsConfig.find(c => c.id === cardId) || { id: cardId, order: 0, expanded: 0 };
  };

  // Render card wrapper with drag and drop
  const renderCardWrapper = (
    cardId: CardId,
    children: React.ReactNode,
    className: string = ""
  ) => {
    const config = getCardConfig(cardId);
    const expandedState = config.expanded; // 0 = 1 col, 1 = 2 cols, 2 = 3 cols
    const isDragging = draggedItemId === cardId && draggedItemType === 'card';
    const isDragOver = dragOverItemId === cardId && dragOverItemType === 'card';

    // Determine column span based on expanded state
    const getColSpan = () => {
      if (expandedState === 0) return ''; // 1 coluna (padrão)
      if (expandedState === 1) return 'md:col-span-2 lg:col-span-2'; // 2 colunas
      if (expandedState === 2) return 'md:col-span-2 lg:col-span-3'; // 3 colunas
      return '';
    };

    return (
      <div
        key={cardId}
        draggable={!isLocked}
        onDragStart={(e) => handleDragStart(e, cardId, 'card')}
        onDragOver={(e) => handleDragOver(e, cardId, 'card')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, cardId, 'card')}
        onDragEnd={handleDragEnd}
        className={`
          ${getColSpan()}
          ${isDragging ? 'opacity-50' : ''}
          ${isDragOver ? 'ring-2 ring-primary ring-offset-2' : ''}
          transition-all duration-200
          ${className}
        `}
        style={{ cursor: isLocked ? 'default' : 'move' }}
      >
        {children}
      </div>
    );
  };

  // Render card header with controls
  const renderCardHeader = (
    cardId: CardId,
    title: string,
    icon: React.ReactNode,
    borderColor: string
  ) => {
    const config = getCardConfig(cardId);
    const expandedState = config.expanded;
    
    const getExpandTitle = () => {
      if (isLocked) return "Movimentações travadas";
      if (expandedState === 0) return "Expandir para 2 colunas";
      if (expandedState === 1) return "Expandir para 3 colunas";
      return "Voltar para 1 coluna";
    };
    
    return (
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative group">
        <div className="flex items-center gap-2 flex-1">
          {!isLocked ? (
            <div
              className="cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
              draggable={false}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          ) : (
            <Lock className="h-4 w-4 text-muted-foreground" />
          )}
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {expandedState > 0 && (
            <Badge variant="outline" className="text-xs">
              {expandedState === 1 ? '2 cols' : '3 cols'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => toggleExpand(cardId)}
            disabled={isLocked}
            title={getExpandTitle()}
          >
            <Maximize2 className={`h-4 w-4 ${isLocked ? 'opacity-50' : ''}`} />
          </Button>
          {icon}
        </div>
      </CardHeader>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setIsAddWidgetDialogOpen(true);
              loadAvailableReports();
            }}
            variant="default"
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar Relatório
          </Button>
          <Button
            onClick={toggleLock}
            variant={isLocked ? "default" : "outline"}
            size="sm"
            className="gap-2"
            title={isLocked ? "Destravar movimentações" : "Travar movimentações"}
          >
            {isLocked ? (
              <>
                <Lock className="h-4 w-4" />
                Travado
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4" />
                Destravado
              </>
            )}
          </Button>
          <Button onClick={loadDashboardData} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {getAllDashboardItems().map((item) => {
          // Render card
          if (item.type === 'card') {
            const cardConfig = item.data as CardConfig;
            const cardId = cardConfig.id;
          
          // Orders Summary Card
          if (cardId === 'orders-summary') {
            return renderCardWrapper(
              cardId,
              <Card className="border-l-4 border-l-blue-500 h-full max-h-[600px] overflow-hidden flex flex-col">
                {renderCardHeader(
                  cardId,
                  'Resumo de Pedidos',
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>,
                  'border-l-blue-500'
                )}
                <CardContent className="flex-1 overflow-y-auto">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                        <p className="text-2xl font-bold">{ordersSummary?.totalOrders || 0}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Total de pedidos</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <p className="text-2xl font-bold">
                          {formatPoints(ordersSummary?.totalPointsSpent || 0)} pts
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Total de pontos gastos</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-500" />
                        <p className="text-2xl font-bold">{ordersSummary?.ordersThisMonth || 0}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Pedidos este mês</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }

          // Top Agency by Orders Card
          if (cardId === 'top-agency-orders') {
            return renderCardWrapper(
              cardId,
              <Card className="border-l-4 border-l-green-500 h-full max-h-[600px] overflow-hidden flex flex-col">
                {renderCardHeader(
                  cardId,
                  'Top Agência por Pedidos',
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>,
                  'border-l-green-500'
                )}
                <CardContent className="flex-1 overflow-y-auto">
                  {topAgencyOrders ? (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
    <div>
                          <p className="text-lg font-semibold">{topAgencyOrders.agencyName}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Store className="h-3 w-3 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{topAgencyOrders.branch}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleAgencyClick(topAgencyOrders.agencyId)}
                          title="Ver detalhes"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-green-500" />
                        <p className="text-2xl font-bold">
                          {topAgencyOrders.ordersCount || 0}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">Pedidos realizados</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma agência encontrada</p>
                  )}
                </CardContent>
              </Card>
            );
          }

          if (cardId === "products-inventory") {
            return renderCardWrapper(
              cardId,
              <Card className="border-l-4 border-l-amber-500 h-full max-h-[600px] overflow-hidden flex flex-col">
                {renderCardHeader(
                  cardId,
                  "Itens cadastrados e estoque",
                  <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                    <Package className="h-6 w-6 text-amber-700 dark:text-amber-400" />
                  </div>,
                  "border-l-amber-500"
                )}
                <CardContent className="flex-1 overflow-y-auto space-y-3">
                  {productsInventory && productsInventory.totalProducts > 0 ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {productsInventory.totalProducts}
                          </span>{" "}
                          {productsInventory.totalProducts === 1
                            ? "produto ativo"
                            : "produtos ativos"}
                        </span>
                        <span className="text-muted-foreground">
                          Total disponível:{" "}
                          <span className="font-semibold text-foreground">
                            {productsInventory.totalAvailableUnits}
                          </span>{" "}
                          un.
                        </span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                            <TableHead className="text-right w-[100px]">Disponível</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productsInventory.items.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-medium max-w-[280px]">
                                <div className="truncate" title={row.name}>
                                  {row.name}
                                </div>
                                {row.stockSource === "variants" && row.variants
                                  ? renderVariantBreakdown(row.variants)
                                  : null}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                                {row.categoryName ?? "—"}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.availableQuantity}
                                <span className="text-xs text-muted-foreground ml-1">
                                  {row.stockSource === "variants" ? "(var.)" : ""}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <Button variant="link" className="h-auto p-0" asChild>
                        <Link to="/admin/produtos">Gerenciar produtos</Link>
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum produto ativo cadastrado ou não foi possível carregar o estoque.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          }

          }
          
          // Render widget
          if (item.type === 'widget') {
            const widget = item.data;
            const widgetIdStr = `widget-${widget.id}`;
            const isDragging = draggedItemId === String(widget.id) && draggedItemType === 'widget';
            const isDragOver = dragOverItemId === String(widget.id) && dragOverItemType === 'widget';
            const expandedState = widget.expanded ?? 0;
            
            // Determine column span based on expanded state
            const getColSpan = () => {
              if (expandedState === 0) return 'md:col-span-1 lg:col-span-1'; // 1 coluna (padrão)
              if (expandedState === 1) return 'md:col-span-2 lg:col-span-2'; // 2 colunas
              if (expandedState === 2) return 'md:col-span-2 lg:col-span-3'; // 3 colunas
              return 'md:col-span-1 lg:col-span-1';
            };
            
            return (
              <div
                key={widgetIdStr}
                draggable={!isLocked}
                onDragStart={(e) => handleDragStart(e, String(widget.id), 'widget')}
                onDragOver={(e) => handleDragOver(e, String(widget.id), 'widget')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, String(widget.id), 'widget')}
                onDragEnd={handleDragEnd}
                className={`
                  ${getColSpan()}
                  ${isDragging ? 'opacity-50' : ''}
                  ${isDragOver ? 'ring-2 ring-primary ring-offset-2' : ''}
                  transition-all duration-200
                `}
                style={{ cursor: isLocked ? 'default' : 'move' }}
              >
                <ReportWidget
                  widgetId={widget.id}
                  reportId={widget.report.id}
                  reportName={widget.report.name}
                  visualizationType={widget.report.visualizationType}
                  onRefresh={loadReportWidgets}
                  onRemove={handleRemoveWidget}
                  isLocked={isLocked}
                  expanded={expandedState}
                  onToggleExpand={() => toggleWidgetExpand(widget.id)}
                />
              </div>
            );
          }
          
          return null;
        })}
      </div>

      {/* Dialog para adicionar widget */}
      <Dialog open={isAddWidgetDialogOpen} onOpenChange={setIsAddWidgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Relatório ao Dashboard</DialogTitle>
            <DialogDescription>
              Selecione um relatório para adicionar como widget no dashboard
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {availableReports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum relatório disponível. Crie um relatório primeiro.
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {availableReports
                  .filter(
                    (report) =>
                      !reportWidgets.some((w) => w.reportId === report.id)
                  )
                  .map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => handleAddWidget(report.id)}
                    >
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {report.visualizationType}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                {availableReports.filter(
                  (report) =>
                    !reportWidgets.some((w) => w.reportId === report.id)
                ).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Todos os relatórios já estão no dashboard
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Drill-down Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedidos da Agência</DialogTitle>
            <DialogDescription>
              Detalhes dos pedidos realizados pela agência
            </DialogDescription>
          </DialogHeader>
          {isLoadingOrders ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="mt-4">
              {agencyOrders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort("id")}
                      >
                        ID{getSortIcon("id")}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort("status")}
                      >
                        Status{getSortIcon("status")}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort("totalPoints")}
                      >
                        Total de Pontos{getSortIcon("totalPoints")}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort("itemsCount")}
                      >
                        Itens{getSortIcon("itemsCount")}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort("createdAt")}
                      >
                        Criado em{getSortIcon("createdAt")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAgencyOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          {formatPoints(order.totalPoints)} pts
                        </TableCell>
                        <TableCell>{order.itemsCount}</TableCell>
                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum pedido encontrado
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
