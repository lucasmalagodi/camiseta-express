import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Building2, ClipboardList, MapPin, Package, RefreshCw, Truck } from "lucide-react";
import { shipmentService, type ShipmentStatus } from "@/services/api";
import { toast } from "sonner";
import { formatPoints, formatModelName } from "@/lib/utils";

const statusLabel: Record<ShipmentStatus, string> = {
  PENDING: "Pendente",
  READY_TO_POST: "Pronto para postar",
  POSTED: "Postado",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado",
};

const AdminShipmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const d = await shipmentService.getById(Number(id));
      setDetail(d);
      setTrackingInput(d.shipment?.trackingCode || "");
    } catch {
      toast.error("Remessa não encontrada");
      navigate("/admin/envios?tab=remessas");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const shipment = detail?.shipment;

  const patchStatus = async (status: ShipmentStatus) => {
    if (!id) return;
    try {
      setSaving(true);
      const body: {
        status: ShipmentStatus;
        trackingCode?: string;
      } = { status };
      if (status === "POSTED" && trackingInput.trim()) {
        body.trackingCode = trackingInput.trim();
      }
      const updated = await shipmentService.update(Number(id), body);
      setDetail((prev: any) => (prev ? { ...prev, shipment: updated } : prev));
      toast.success("Status atualizado");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar");
    } finally {
      setSaving(false);
    }
  };

  const saveTracking = async () => {
    if (!id) return;
    try {
      setSaving(true);
      const updated = await shipmentService.update(Number(id), {
        trackingCode: trackingInput.trim() || null,
      });
      setDetail((prev: any) => (prev ? { ...prev, shipment: updated } : prev));
      toast.success("Rastreio salvo");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !detail) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { agency, deliveryAddress, orders, aggregatedItems } = detail;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/envios?tab=remessas">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Remessa #{shipment.id}</h1>
          <Badge>{statusLabel[shipment.status as ShipmentStatus]}</Badge>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" type="button" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button size="sm" asChild>
            <Link to="/admin/envios/preparacao">
              <ClipboardList className="w-4 h-4 mr-2" />
              Preparação
            </Link>
          </Button>
        </div>
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
            <p className="text-muted-foreground">{agency.email}</p>
            {agency.phone && <p className="text-muted-foreground">{agency.phone}</p>}
            <p className="text-muted-foreground">
              Filial: {agency.branchName || "—"} · Executivo: {agency.executiveName || "—"}
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
            {deliveryAddress ? (
              <p>
                {deliveryAddress.street}, {deliveryAddress.number}
                {deliveryAddress.complement ? ` — ${deliveryAddress.complement}` : ""}
                <br />
                {deliveryAddress.neighborhood} — {deliveryAddress.city}/{deliveryAddress.state}
                <br />
                CEP {deliveryAddress.cep}
              </p>
            ) : (
              <p className="text-muted-foreground">Endereço não cadastrado para esta agência.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="w-5 h-5" />
            Logística
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Rastreio</Label>
              <div className="flex gap-2">
                <Input
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="Código de rastreamento"
                />
                <Button type="button" variant="secondary" onClick={saveTracking} disabled={saving}>
                  Salvar
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={shipment.status}
                onValueChange={(v) => patchStatus(v as ShipmentStatus)}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(statusLabel) as ShipmentStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabel[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => patchStatus("READY_TO_POST")}
              disabled={saving || shipment.status === "CANCELED"}
            >
              Marcar pronto para postar
            </Button>
            <Button
              onClick={() => patchStatus("POSTED")}
              disabled={saving || shipment.status === "CANCELED"}
            >
              Marcar como postado
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pedidos vinculados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Pontos</TableHead>
                <TableHead>Data</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">#{o.id}</TableCell>
                  <TableCell>{formatPoints(o.totalPoints)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(o.createdAt).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Button variant="link" className="p-0 h-auto" asChild>
                      <Link to={`/admin/pedidos/${o.id}`}>Ver pedido</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5" />
            Itens agregados
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              {aggregatedItems.map((it: any, idx: number) => (
                <TableRow key={`${it.productId}-${it.model}-${it.size}-${idx}`}>
                  <TableCell>{it.productName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {it.model ? `${formatModelName(it.model)} ${it.size || ""}` : "—"}
                  </TableCell>
                  <TableCell>{it.quantity}</TableCell>
                  <TableCell>{formatPoints(it.pointsPerUnit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminShipmentDetail;
