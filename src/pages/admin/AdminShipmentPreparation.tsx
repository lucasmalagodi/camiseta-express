import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, MapPin, Package, Truck } from "lucide-react";
import { shipmentService } from "@/services/api";
import { toast } from "sonner";
import { cn, formatPoints, formatModelName } from "@/lib/utils";

type OrderItemRow = {
  productName: string;
  model: string | null;
  size: string | null;
  quantity: number;
  pointsPerUnit: number;
};

type CollectedOrder = {
  shipmentId: number;
  orderId: number;
  orderTotalPoints: number;
  orderCreatedAt: string;
  items: OrderItemRow[];
  agencyName: string;
  agencyCnpj: string;
  branchName: string | null;
  executiveName: string | null;
  deliveryAddressLine: string;
};

type QueueEntry = {
  shipmentId: number;
  processed: boolean;
  order: {
    id: number;
    totalPoints: number;
    createdAt: string;
    items: any[];
  };
  agency: {
    id: number;
    name: string;
    cnpj: string;
    email?: string;
    phone?: string | null;
    branchId?: number | null;
    branchName?: string | null;
    executiveId?: number | null;
    executiveName?: string | null;
  };
  deliveryAddress: {
    street: string;
    number: string;
    complement?: string | null;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
  } | null;
};

function addressLine(deliveryAddress: QueueEntry["deliveryAddress"]): string {
  if (!deliveryAddress) return "";
  const parts = [
    `${deliveryAddress.street}, ${deliveryAddress.number}`,
    deliveryAddress.complement,
    `${deliveryAddress.neighborhood} — ${deliveryAddress.city}/${deliveryAddress.state}`,
    `CEP ${deliveryAddress.cep}`,
  ].filter(Boolean);
  return parts.join(" | ");
}

function normalizeQueue(raw: unknown): QueueEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((e: any) => ({
    shipmentId: Number(e.shipmentId),
    processed: Boolean(e.processed),
    order: {
      id: Number(e.order?.id),
      totalPoints: Number(e.order?.totalPoints) || 0,
      createdAt:
        typeof e.order?.createdAt === "string"
          ? e.order.createdAt
          : e.order?.createdAt != null
            ? String(e.order.createdAt)
            : "",
      items: Array.isArray(e.order?.items) ? e.order.items : [],
    },
    agency: e.agency,
    deliveryAddress: e.deliveryAddress ?? null,
  }));
}

type ShipmentGroup = {
  shipmentId: number;
  entries: QueueEntry[];
};

function groupQueueByShipment(queue: QueueEntry[]): ShipmentGroup[] {
  const map = new Map<number, QueueEntry[]>();
  const order: number[] = [];
  for (const e of queue) {
    if (!map.has(e.shipmentId)) {
      map.set(e.shipmentId, []);
      order.push(e.shipmentId);
    }
    map.get(e.shipmentId)!.push(e);
  }
  return order.map((shipmentId) => ({ shipmentId, entries: map.get(shipmentId)! }));
}

type AggregatedPrepItem = {
  rowKey: string;
  productName: string;
  model: string | null;
  size: string | null;
  quantity: number;
  pointsPerUnit: number;
};

function aggregateItemsFromGroup(entries: QueueEntry[]): AggregatedPrepItem[] {
  const aggMap = new Map<string, AggregatedPrepItem>();
  for (const e of entries) {
    for (const it of e.order.items || []) {
      const pid = it.productId ?? "x";
      const vid = it.productVariantId ?? "x";
      const key = `${pid}|${vid}|${it.pointsPerUnit}`;
      const prev = aggMap.get(key);
      if (prev) {
        prev.quantity += Number(it.quantity) || 0;
      } else {
        aggMap.set(key, {
          rowKey: key,
          productName: it.productName ?? "",
          model: it.model ?? null,
          size: it.size ?? null,
          quantity: Number(it.quantity) || 0,
          pointsPerUnit: Number(it.pointsPerUnit) || 0,
        });
      }
    }
  }
  return [...aggMap.values()];
}

function snapshotFromEntry(entry: QueueEntry): CollectedOrder {
  const items: OrderItemRow[] = (entry.order.items || []).map((it: any) => ({
    productName: it.productName ?? "",
    model: it.model ?? null,
    size: it.size ?? null,
    quantity: it.quantity,
    pointsPerUnit: it.pointsPerUnit,
  }));
  return {
    shipmentId: entry.shipmentId,
    orderId: entry.order.id,
    orderTotalPoints: entry.order.totalPoints,
    orderCreatedAt: entry.order.createdAt,
    items,
    agencyName: entry.agency.name,
    agencyCnpj: entry.agency.cnpj,
    branchName: entry.agency.branchName ?? null,
    executiveName: entry.agency.executiveName ?? null,
    deliveryAddressLine: addressLine(entry.deliveryAddress),
  };
}

const AdminShipmentPreparation = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [collected, setCollected] = useState<CollectedOrder[]>([]);
  const [sending, setSending] = useState(false);
  /** Linhas de itens agregados marcadas (verde) para ajudar na separação física */
  const [pickedAggKeys, setPickedAggKeys] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await shipmentService.getPreparationQueue();
      setQueue(normalizeQueue(data));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar fila";
      toast.error(msg);
      navigate("/admin/envios?tab=remessas");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setCurrentGroupIndex(0);
    setCollected([]);
  }, []);

  const groups = useMemo(() => groupQueueByShipment(queue), [queue]);
  const totalGroups = groups.length;
  const totalOrders = queue.length;
  const currentGroup = groups[currentGroupIndex];
  const firstEntry = currentGroup?.entries[0];

  useEffect(() => {
    if (totalGroups === 0) return;
    setCurrentGroupIndex((i) => Math.min(Math.max(0, i), totalGroups - 1));
  }, [totalGroups]);

  const progressPct =
    totalGroups === 0 ? 0 : Math.round(((currentGroupIndex + 1) / totalGroups) * 100);

  const aggregatedItems = useMemo(
    () => (currentGroup ? aggregateItemsFromGroup(currentGroup.entries) : []),
    [currentGroup]
  );

  useEffect(() => {
    setPickedAggKeys({});
  }, [currentGroup?.shipmentId]);

  const hasNextGroup = currentGroupIndex < totalGroups - 1;
  const hasUnprocessedInCurrent =
    currentGroup?.entries.some((e) => !e.processed) ?? false;
  const canClickProximo =
    Boolean(currentGroup) && !sending && (hasUnprocessedInCurrent || hasNextGroup);

  const handleNext = async () => {
    if (!currentGroup || sending) return;
    const toMark = currentGroup.entries.filter((e) => !e.processed);
    const advance = currentGroupIndex < totalGroups - 1;

    if (toMark.length === 0) {
      if (advance) {
        setCurrentGroupIndex((i) => i + 1);
      }
      return;
    }

    setSending(true);
    try {
      for (const entry of toMark) {
        await shipmentService.markOrderProcessed(entry.order.id);
      }
      const newSnaps = toMark.map(snapshotFromEntry);
      setCollected((prev) => [...prev, ...newSnaps]);
      const markIds = new Set(toMark.map((e) => e.order.id));
      setQueue((prev) =>
        prev.map((e) => (markIds.has(e.order.id) ? { ...e, processed: true } : e))
      );
      const sid = currentGroup.shipmentId;
      toast.success(
        toMark.length === 1
          ? `Pedido #${toMark[0].order.id} da remessa #${sid} marcado como processado.`
          : `${toMark.length} pedidos da remessa #${sid} marcados como processados.`
      );
      if (advance) {
        setCurrentGroupIndex((i) => i + 1);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleFinalizeLote = async () => {
    if (!currentGroup || sending || totalOrders === 0) return;
    setSending(true);
    try {
      let snaps: CollectedOrder[] = [...collected];

      if (snaps.length === 0) {
        if (totalGroups !== 1) {
          toast.error(
            "Use Próximo em cada remessa que deve entrar neste lote. Com várias remessas na fila, só entram os pedidos já conferidos com Próximo."
          );
          return;
        }
        const g = groups[0];
        const toMark = g.entries.filter((e) => !e.processed);
        for (const entry of toMark) {
          await shipmentService.markOrderProcessed(entry.order.id);
          snaps.push(snapshotFromEntry(entry));
        }
        if (toMark.length > 0) {
          const markIds = new Set(toMark.map((e) => e.order.id));
          setQueue((prev) =>
            prev.map((e) => (markIds.has(e.order.id) ? { ...e, processed: true } : e))
          );
        }
      }

      const orderIds = [...new Set(snaps.map((c) => c.orderId))];
      const { batchId } = await shipmentService.finalizePreparationBatch(orderIds);

      toast.success(
        `Lote #${batchId} concluído: ${snaps.length} pedido(s) marcado(s) como enviado(s). Gere o CSV na aba Processados, se precisar.`
      );
      setCollected([]);
      setCurrentGroupIndex(0);
      await load();
      navigate("/admin/envios?tab=processados");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao finalizar lote";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto w-full">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (totalGroups === 0 || !currentGroup || !firstEntry) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto w-full">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/envios?tab=remessas">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos envios
          </Link>
        </Button>
        <p className="text-muted-foreground">
          Não há pedidos na fila: todos já foram enviados em algum lote ou não há remessas pendentes.{" "}
          <Link to="/admin/envios?tab=processados" className="underline font-medium text-foreground">
            Ver lotes em Processados
          </Link>
        </p>
        <Button variant="outline" onClick={() => void load()}>
          Atualizar
        </Button>
      </div>
    );
  }

  const agency = firstEntry.agency;
  const shipmentId = currentGroup.shipmentId;

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/envios?tab=remessas">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos envios
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          Remessa <strong>{currentGroupIndex + 1}</strong> de <strong>{totalGroups}</strong> na fila ·{" "}
          <span className="text-muted-foreground/80">{totalOrders} pedido(s) no total</span>
        </p>
      </div>

      <div className="space-y-2">
        <Progress value={progressPct} className="h-2" />
      </div>

      <p className="text-sm text-muted-foreground border-l-2 border-primary/40 pl-3">
        <strong>Próximo</strong> confere a <strong>remessa inteira</strong> (todos os pedidos desta remessa).{" "}
        <strong>Finalizar lote</strong> fecha o lote e marca os pedidos conferidos como <strong>enviados</strong>. O
        CSV pode ser gerado na aba <strong>Processados</strong>. Você pode fechar um lote com parte da fila e voltar
        depois.
      </p>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Fila de preparação ({totalGroups} remessa{totalGroups !== 1 ? "s" : ""}, {totalOrders} pedido
            {totalOrders !== 1 ? "s" : ""})
          </CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            <strong>Em conferência</strong> = remessa atual; <strong>Processado</strong> = conferido;{" "}
            <strong>Enviado</strong> só após finalizar o lote.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-md border overflow-x-auto max-h-[280px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Remessa</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Pontos</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((entry) => {
                  const o = entry.order;
                  const inCurrentShipment = entry.shipmentId === shipmentId;
                  let label = "Pendente";
                  let variant: "default" | "secondary" | "outline" = "outline";
                  if (inCurrentShipment) {
                    label = "Em conferência";
                    variant = "default";
                  } else if (entry.processed) {
                    label = "Processado";
                    variant = "secondary";
                  }
                  return (
                    <TableRow key={`${entry.shipmentId}-${o.id}`}>
                      <TableCell className="text-muted-foreground">#{entry.shipmentId}</TableCell>
                      <TableCell className="font-medium">#{o.id}</TableCell>
                      <TableCell>{formatPoints(o.totalPoints)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(o.createdAt).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={variant}>{label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="text-xl font-bold flex flex-wrap items-center gap-2">
          <Truck className="w-6 h-6 shrink-0" />
          Remessa #{shipmentId}
        </h2>
        <p className="text-sm text-muted-foreground">
          {currentGroup.entries.length} pedido{currentGroup.entries.length !== 1 ? "s" : ""} nesta remessa — mesma
          visão da tela de detalhe da remessa.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5" />
              Agência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{agency.name}</p>
            <p className="text-muted-foreground">CNPJ: {agency.cnpj}</p>
            <p className="text-muted-foreground">
              Filial: {agency.branchName ?? "—"} · Executivo: {agency.executiveName ?? "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5" />
              Endereço de entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {firstEntry.deliveryAddress ? (
              <p className="text-muted-foreground">
                {firstEntry.deliveryAddress.street}, {firstEntry.deliveryAddress.number}
                {firstEntry.deliveryAddress.complement
                  ? ` — ${firstEntry.deliveryAddress.complement}`
                  : ""}
                <br />
                {firstEntry.deliveryAddress.neighborhood} — {firstEntry.deliveryAddress.city}/
                {firstEntry.deliveryAddress.state}
                <br />
                CEP {firstEntry.deliveryAddress.cep}
              </p>
            ) : (
              <p className="text-muted-foreground">Endereço não cadastrado para esta agência.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pedidos vinculados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Pontos</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Conferência</TableHead>
                  <TableHead className="text-right w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentGroup.entries.map((e) => (
                  <TableRow key={e.order.id}>
                    <TableCell className="font-medium">#{e.order.id}</TableCell>
                    <TableCell>{formatPoints(e.order.totalPoints)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(e.order.createdAt).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      {e.processed ? (
                        <Badge variant="secondary">Processado</Badge>
                      ) : (
                        <Badge variant="outline">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="link" className="p-0 h-auto" asChild>
                        <Link to={`/admin/pedidos/${e.order.id}`}>Ver pedido</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5" />
            Itens agregados
          </CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Soma de todos os itens dos pedidos desta remessa. <strong>Clique na linha</strong> para marcar em verde
            (separado) e clique de novo para desmarcar — só ajuda na conferência física.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Variação</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Pts/un.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground text-sm">
                      Nenhum item nesta remessa.
                    </TableCell>
                  </TableRow>
                ) : (
                  aggregatedItems.map((it) => {
                    const picked = Boolean(pickedAggKeys[it.rowKey]);
                    return (
                      <TableRow
                        key={it.rowKey}
                        tabIndex={0}
                        role="button"
                        aria-pressed={picked}
                        title="Clique para marcar / desmarcar (separação)"
                        className={cn(
                          "cursor-pointer transition-colors select-none border-l-4",
                          picked
                            ? "border-emerald-500 bg-emerald-950/25 hover:bg-emerald-950/32 dark:border-emerald-400 dark:bg-emerald-950/65 dark:hover:bg-emerald-950/75"
                            : "border-transparent hover:bg-muted/60"
                        )}
                        onClick={() =>
                          setPickedAggKeys((prev) => ({ ...prev, [it.rowKey]: !prev[it.rowKey] }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setPickedAggKeys((prev) => ({ ...prev, [it.rowKey]: !prev[it.rowKey] }));
                          }
                        }}
                      >
                        <TableCell>{it.productName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {it.model ? `${formatModelName(it.model)} ${it.size || ""}`.trim() : "—"}
                        </TableCell>
                        <TableCell>{it.quantity}</TableCell>
                        <TableCell>{formatPoints(it.pointsPerUnit)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Neste lote: <strong>{collected.length}</strong> pedido(s) já conferido(s) com <strong>Próximo</strong>.{" "}
            <strong>Finalizar lote</strong> envia só esses pedidos (status <strong>enviado</strong>). Com apenas uma
            remessa na fila, você pode finalizar direto; com várias, use Próximo em cada remessa que entra no lote.
          </p>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="min-w-[120px]"
              disabled={!canClickProximo}
              onClick={() => void handleNext()}
            >
              {sending ? "Salvando…" : "Próximo"}
            </Button>
            <Button
              type="button"
              size="lg"
              className="min-w-[120px]"
              disabled={sending}
              onClick={() => void handleFinalizeLote()}
            >
              {sending ? "Salvando…" : "Finalizar lote"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminShipmentPreparation;
