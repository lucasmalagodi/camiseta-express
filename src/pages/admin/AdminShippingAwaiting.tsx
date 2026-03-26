import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Building2,
  ClipboardList,
  FileDown,
  Layers,
  ListTree,
  Package,
  RefreshCw,
  Truck,
  Eye,
} from "lucide-react";
import {
  agencyService,
  branchService,
  executiveService,
  shipmentService,
  type ShipmentStatus,
} from "@/services/api";
import { toast } from "sonner";
import { formatModelName, formatPoints } from "@/lib/utils";

interface PendingRow {
  id: number;
  agencyId: number;
  agencyName: string;
  branchId: number | null;
  branchName: string | null;
  executiveId: number | null;
  executiveName: string | null;
  totalPoints: number;
  createdAt: string;
  productsSummary: string;
}

interface ShipmentRow {
  id: number;
  agencyId: number;
  agencyName: string;
  orderCount: number;
  status: ShipmentStatus;
  shippingMethod: string;
  trackingCode: string | null;
  createdAt: string;
}

interface PreparationBatchRow {
  id: number;
  createdAt: string;
  displayName: string;
  orders: Array<{ orderId: number; shipmentId: number; agencyName: string }>;
}

type PreparationBatchDetailView = {
  id: number;
  createdAt: string;
  displayName?: string;
  agencies: Array<{
    id: number;
    name: string;
    cnpj: string;
    branchName?: string | null;
    executiveName?: string | null;
    orders: Array<{
      orderId: number;
      shipmentId: number;
      totalPoints: number;
      createdAt: string;
      items: Array<{
        productName: string;
        model?: string | null;
        size?: string | null;
        quantity: number;
        pointsPerUnit: number;
      }>;
    }>;
  }>;
};

const statusLabel: Record<ShipmentStatus, string> = {
  PENDING: "Pendente",
  READY_TO_POST: "Pronto para postar",
  POSTED: "Postado",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado",
};

const statusVariant = (s: ShipmentStatus) => {
  switch (s) {
    case "DELIVERED":
      return "default" as const;
    case "POSTED":
      return "secondary" as const;
    case "CANCELED":
      return "destructive" as const;
    case "READY_TO_POST":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};

const AdminShippingAwaiting = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: "pedidos" | "remessas" | "processados" =
    tabParam === "remessas" ? "remessas" : tabParam === "processados" ? "processados" : "pedidos";
  const setTab = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "remessas") next.set("tab", "remessas");
    else if (value === "processados") next.set("tab", "processados");
    else next.delete("tab");
    setSearchParams(next, { replace: true });
  };

  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [agencies, setAgencies] = useState<Array<{ id: number; name: string }>>([]);
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([]);
  const [executives, setExecutives] = useState<Array<{ id: number; name: string }>>([]);

  const [filterAgency, setFilterAgency] = useState<string>("");
  const [filterBranch, setFilterBranch] = useState<string>("");
  const [filterExecutive, setFilterExecutive] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [shipRows, setShipRows] = useState<ShipmentRow[]>([]);
  const [shipLoading, setShipLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [batchRows, setBatchRows] = useState<PreparationBatchRow[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchDetailOpen, setBatchDetailOpen] = useState(false);
  const [batchDetailId, setBatchDetailId] = useState<number | null>(null);
  const [batchDetailData, setBatchDetailData] = useState<PreparationBatchDetailView | null>(null);
  const [batchDetailLoading, setBatchDetailLoading] = useState(false);
  const [csvDownloadingId, setCsvDownloadingId] = useState<number | null>(null);

  const groupedByAgency = useMemo(() => {
    const m = new Map<number, PendingRow[]>();
    for (const r of rows) {
      if (!m.has(r.agencyId)) m.set(r.agencyId, []);
      m.get(r.agencyId)!.push(r);
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.id - b.id);
    }
    return [...m.entries()].sort((a, b) =>
      (a[1][0]?.agencyName || "").localeCompare(b[1][0]?.agencyName || "", "pt-BR")
    );
  }, [rows]);

  const loadMeta = useCallback(async () => {
    try {
      const [a, b, e] = await Promise.all([
        agencyService.getAll(),
        branchService.getAll(),
        executiveService.getAll(),
      ]);
      setAgencies((a || []).map((x: { id: number; name: string }) => ({ id: x.id, name: x.name })));
      setBranches((b || []).map((x: { id: number; name: string }) => ({ id: x.id, name: x.name })));
      setExecutives(
        (e || []).map((x: { id: number; name?: string; code?: string }) => ({
          id: x.id,
          name: x.name || x.code || `#${x.id}`,
        }))
      );
    } catch {
      toast.error("Erro ao carregar filtros");
    }
  }, []);

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      const data = await shipmentService.listPendingOrders({
        agencyId: filterAgency ? Number(filterAgency) : undefined,
        branchId: filterBranch ? Number(filterBranch) : undefined,
        executiveId: filterExecutive ? Number(filterExecutive) : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setRows(data);
      setSelected(new Set());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar pedidos";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [filterAgency, filterBranch, filterExecutive, dateFrom, dateTo]);

  const loadShipments = useCallback(async () => {
    try {
      setShipLoading(true);
      const data = await shipmentService.list({
        status: statusFilter === "all" ? undefined : (statusFilter as ShipmentStatus),
      });
      setShipRows(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar remessas";
      toast.error(msg);
    } finally {
      setShipLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const loadBatches = useCallback(async () => {
    try {
      setBatchLoading(true);
      const data = await shipmentService.getPreparationBatches();
      const normalized: PreparationBatchRow[] = (data || []).map((b: any) => {
        const id = Number(b.id);
        return {
          id,
          createdAt: typeof b.createdAt === "string" ? b.createdAt : String(b.createdAt ?? ""),
          displayName:
            typeof b.displayName === "string" && b.displayName.trim()
              ? b.displayName.trim()
              : `Lote #${id}`,
          orders: Array.isArray(b.orders) ? b.orders : [],
        };
      });
      setBatchRows(normalized);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar lotes";
      toast.error(msg);
    } finally {
      setBatchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "remessas") {
      loadShipments();
    }
    if (tab === "processados") {
      loadBatches();
    }
  }, [tab, loadShipments, loadBatches]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleGroup = (orderIds: number[]) => {
    const allSelected = orderIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const n = new Set(prev);
      if (allSelected) {
        for (const id of orderIds) n.delete(id);
      } else {
        for (const id of orderIds) n.add(id);
      }
      return n;
    });
  };

  const selectedAgencyCount = useMemo(() => {
    const ids = new Set<number>();
    for (const r of rows) {
      if (selected.has(r.id)) ids.add(r.agencyId);
    }
    return ids.size;
  }, [rows, selected]);

  const canCreate = selected.size > 0;

  const createShipment = async (orderIds: number[]) => {
    if (orderIds.length === 0) {
      toast.error("Nenhum pedido selecionado.");
      return;
    }
    try {
      setCreating(true);
      const res = await shipmentService.createBatch({
        orderIds,
        shippingMethod: "CORREIOS",
      });
      const n = res.count;
      const idsLabel = res.shipments.map((s) => `#${s.id}`).join(", ");
      toast.success(
        n === 1 ? `Remessa ${idsLabel} criada.` : `Foram criadas ${n} remessas: ${idsLabel}.`
      );
      await loadRows();
      await loadShipments();
      setTab("remessas");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao criar remessa(s)";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateShipment = () => createShipment([...selected]);

  const selectAllVisibleOrders = () => {
    setSelected(new Set(rows.map((r) => r.id)));
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const allVisibleSelected =
    rows.length > 0 && rows.every((r) => selected.has(r.id));

  const openPreparation = () => {
    setTab("remessas");
    navigate("/admin/envios/preparacao");
  };

  const openBatchDetail = useCallback(async (id: number) => {
    setBatchDetailId(id);
    setBatchDetailOpen(true);
    setBatchDetailLoading(true);
    setBatchDetailData(null);
    try {
      const raw = await shipmentService.getPreparationBatchDetail(id);
      setBatchDetailData(raw as PreparationBatchDetailView);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar lote";
      toast.error(msg);
      setBatchDetailOpen(false);
      setBatchDetailId(null);
    } finally {
      setBatchDetailLoading(false);
    }
  }, []);

  const downloadBatchCsv = useCallback(async (id: number) => {
    setCsvDownloadingId(id);
    try {
      await shipmentService.downloadPreparationBatchCsv(id);
      toast.success("CSV baixado.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao baixar CSV";
      toast.error(msg);
    } finally {
      setCsvDownloadingId(null);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Envios</h1>
          <p className="text-muted-foreground mt-1">
            Agrupe pedidos por agência, crie remessas e acompanhe o status sem sair desta tela.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (tab === "pedidos") loadRows();
              else if (tab === "remessas") loadShipments();
              else loadBatches();
            }}
            disabled={tab === "pedidos" ? loading : tab === "remessas" ? shipLoading : batchLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={openPreparation}
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            Preparação
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="pedidos" className="gap-2">
            <Truck className="w-4 h-4" />
            Pedidos aguardando
          </TabsTrigger>
          <TabsTrigger value="remessas" className="gap-2">
            <Package className="w-4 h-4" />
            Remessas
          </TabsTrigger>
          <TabsTrigger value="processados" className="gap-2">
            <Layers className="w-4 h-4" />
            Processados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Agência</Label>
                <Select
                  value={filterAgency || "all"}
                  onValueChange={(v) => setFilterAgency(v === "all" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {agencies.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Filial</Label>
                <Select
                  value={filterBranch || "all"}
                  onValueChange={(v) => setFilterBranch(v === "all" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Executivo</Label>
                <Select
                  value={filterExecutive || "all"}
                  onValueChange={(v) => setFilterExecutive(v === "all" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {executives.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data inicial</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data final</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {groupedByAgency.length} agência(s) · {rows.length} pedido(s)
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {rows.length > 0 && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={allVisibleSelected ? clearSelection : selectAllVisibleOrders}
                  >
                    {allVisibleSelected ? "Limpar seleção" : "Selecionar todos os pedidos"}
                  </Button>
                  {selected.size > 0 && !allVisibleSelected && (
                    <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                      Limpar seleção
                    </Button>
                  )}
                </>
              )}
              <Button onClick={handleCreateShipment} disabled={!canCreate || creating}>
                {creating
                  ? "Criando…"
                  : selectedAgencyCount > 1
                    ? `Criar ${selectedAgencyCount} remessas (${selected.size} pedidos)`
                    : `Criar remessa (${selected.size} pedido${selected.size !== 1 ? "s" : ""})`}
              </Button>
            </div>
          </div>

          {selected.size > 0 && selectedAgencyCount > 1 && (
            <p className="text-sm text-muted-foreground">
              Será criada <strong>uma remessa por agência</strong> ({selectedAgencyCount} agências,{" "}
              {selected.size} pedidos no total).
            </p>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum pedido aguardando envio.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {groupedByAgency.map(([agencyId, groupOrders]) => {
                const first = groupOrders[0];
                const ids = groupOrders.map((o) => o.id);
                const allInGroup = ids.every((id) => selected.has(id));
                const someInGroup = ids.some((id) => selected.has(id));

                return (
                  <Card key={agencyId}>
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between space-y-0 pb-4">
                      <div className="flex gap-3">
                        <div className="rounded-lg bg-muted p-2 h-fit">
                          <Building2 className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{first.agencyName}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Agência ID {agencyId}
                            {first.branchName ? ` · ${first.branchName}` : ""}
                            {first.executiveName ? ` · ${first.executiveName}` : ""}
                          </p>
                          <Badge variant="secondary" className="mt-2">
                            {groupOrders.length} pedido(s)
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => toggleGroup(ids)}>
                          {allInGroup ? "Limpar seleção" : "Selecionar todos"}
                        </Button>
                        <Button
                          size="sm"
                          disabled={creating}
                          onClick={() => createShipment(ids)}
                        >
                          Remessa com todos ({groupOrders.length})
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">
                                <Checkbox
                                  checked={
                                    allInGroup
                                      ? true
                                      : someInGroup
                                        ? "indeterminate"
                                        : false
                                  }
                                  onCheckedChange={() => toggleGroup(ids)}
                                  aria-label={`Selecionar pedidos da agência ${first.agencyName}`}
                                />
                              </TableHead>
                              <TableHead>Pedido</TableHead>
                              <TableHead>Produtos</TableHead>
                              <TableHead>Pontos</TableHead>
                              <TableHead>Data</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupOrders.map((r) => (
                              <TableRow key={r.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selected.has(r.id)}
                                    onCheckedChange={() => toggle(r.id)}
                                    aria-label={`Pedido ${r.id}`}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">#{r.id}</TableCell>
                                <TableCell
                                  className="max-w-md truncate text-sm"
                                  title={r.productsSummary}
                                >
                                  {r.productsSummary || "—"}
                                </TableCell>
                                <TableCell>{formatPoints(r.totalPoints)}</TableCell>
                                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                  {new Date(r.createdAt).toLocaleString("pt-BR")}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="remessas" className="space-y-6 mt-0">
          <Card>
            <CardContent className="pt-6 flex flex-wrap gap-4 items-end">
              <div className="space-y-2 min-w-[200px]">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {(Object.keys(statusLabel) as ShipmentStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Remessas ({shipRows.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shipLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : shipRows.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhuma remessa encontrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Agência</TableHead>
                        <TableHead>Pedidos</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Rastreio</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead className="text-right w-[120px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shipRows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">#{r.id}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{r.agencyName}</span>
                              <span className="text-xs text-muted-foreground">Ag. {r.agencyId}</span>
                            </div>
                          </TableCell>
                          <TableCell>{r.orderCount}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(r.status)}>{statusLabel[r.status]}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[140px] truncate text-sm">
                            {r.trackingCode || "—"}
                          </TableCell>
                          <TableCell className="text-sm">{r.shippingMethod}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/admin/envios/remessas/${r.id}`}>
                                <Eye className="w-4 h-4 mr-1" />
                                Detalhes
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processados" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="w-5 h-5" />
                Lotes processados
              </CardTitle>
              <p className="text-sm text-muted-foreground font-normal">
                Cada <strong>Finalizar lote</strong> na preparação registra o envio aqui. Use{" "}
                <strong>Detalhes</strong> para ver agências e pedidos ou <strong>Gerar CSV</strong> quando precisar do
                arquivo.
              </p>
            </CardHeader>
            <CardContent>
              {batchLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : batchRows.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum lote fechado ainda. Use Preparação e <strong>Finalizar lote</strong> para registrar o envio.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lote</TableHead>
                        <TableHead>Data do processamento</TableHead>
                        <TableHead>Pedidos</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead className="text-right w-[220px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchRows.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.displayName}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                            {new Date(b.createdAt).toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell>{b.orders.length}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">Enviado</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void openBatchDetail(b.id)}
                              >
                                <ListTree className="w-4 h-4 mr-1" />
                                Detalhes
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={csvDownloadingId === b.id}
                                onClick={() => void downloadBatchCsv(b.id)}
                              >
                                <FileDown className="w-4 h-4 mr-1" />
                                {csvDownloadingId === b.id ? "Gerando…" : "Gerar CSV"}
                              </Button>
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
        </TabsContent>
      </Tabs>

      <Dialog
        open={batchDetailOpen}
        onOpenChange={(open) => {
          setBatchDetailOpen(open);
          if (!open) {
            setBatchDetailData(null);
            setBatchDetailId(null);
            setBatchDetailLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden sm:max-w-3xl">
          <div className="p-6 pb-0 shrink-0">
            <DialogHeader>
              <DialogTitle>
                {batchDetailData?.displayName ||
                  (batchDetailId != null ? `Lote #${batchDetailId}` : "Detalhes do lote")}
              </DialogTitle>
              <DialogDescription>
                {batchDetailData?.createdAt
                  ? `Processado em ${new Date(batchDetailData.createdAt).toLocaleString("pt-BR")}`
                  : "Agências e pedidos deste lote."}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 pt-4 overflow-y-auto flex-1 min-h-0 space-y-6">
            {batchDetailLoading ? (
              <div className="space-y-3 py-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : batchDetailData && batchDetailData.agencies?.length ? (
              batchDetailData.agencies.map((ag) => (
                <div key={ag.id} className="rounded-lg border bg-card">
                  <div className="border-b px-4 py-3 bg-muted/30">
                    <p className="font-semibold flex items-center gap-2">
                      <Building2 className="w-4 h-4 shrink-0" />
                      {ag.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      CNPJ {ag.cnpj}
                      {ag.branchName ? ` · ${ag.branchName}` : ""}
                      {ag.executiveName ? ` · ${ag.executiveName}` : ""}
                    </p>
                  </div>
                  <div className="p-4 space-y-4">
                    {ag.orders.map((ord) => (
                      <div key={`${ag.id}-${ord.orderId}`} className="rounded-md border overflow-hidden">
                        <div className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 bg-muted/20 text-sm">
                          <span className="font-medium">
                            Pedido #{ord.orderId} · Remessa #{ord.shipmentId}
                          </span>
                          <span className="text-muted-foreground">
                            {formatPoints(ord.totalPoints)} pts ·{" "}
                            {new Date(ord.createdAt).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produto</TableHead>
                              <TableHead>Variação</TableHead>
                              <TableHead className="w-16">Qtd</TableHead>
                              <TableHead className="w-24">Pts/un.</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(ord.items || []).length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-muted-foreground text-sm">
                                  Sem itens no pedido.
                                </TableCell>
                              </TableRow>
                            ) : (
                              ord.items.map((it, idx) => (
                                <TableRow key={`${ord.orderId}-${idx}`}>
                                  <TableCell>{it.productName}</TableCell>
                                  <TableCell className="text-muted-foreground text-sm">
                                    {it.model ? `${formatModelName(it.model)} ${it.size || ""}`.trim() : "—"}
                                  </TableCell>
                                  <TableCell>{it.quantity}</TableCell>
                                  <TableCell>{formatPoints(it.pointsPerUnit)}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4">Nenhum dado para exibir.</p>
            )}
          </div>
          {batchDetailId != null && (
            <div className="border-t p-4 flex justify-end shrink-0 bg-muted/20">
              <Button
                type="button"
                variant="secondary"
                disabled={csvDownloadingId === batchDetailId || batchDetailLoading}
                onClick={() => void downloadBatchCsv(batchDetailId)}
              >
                <FileDown className="w-4 h-4 mr-2" />
                {csvDownloadingId === batchDetailId ? "Gerando…" : "Gerar CSV deste lote"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminShippingAwaiting;
