/**
 * Modelos prontos para o construtor de relatórios (AdminReportBuilder).
 * Devem ser compatíveis com ReportConfig no backend (reportService).
 */

export const TOP_PRODUCTS_SOLD_PRESET = {
  name: "Produtos mais vendidos",
  sourceTable: "order_items",
  visualizationType: "bar",
  config: {
    dimensions: [{ field: "product.name", alias: "Produto" }],
    metrics: [
      { field: "quantity", operation: "SUM" as const, alias: "total_vendido" },
    ],
    filters: [{ field: "order.status", operator: "!=" as const, value: "CANCELED" }],
    sort: [{ field: "quantity", direction: "DESC" as const }],
    limit: 50,
  },
} as const;
