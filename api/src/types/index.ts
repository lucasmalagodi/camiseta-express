export interface Product {
    id: number;
    categoryId: number;
    name: string;
    description: string;
    quantity: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Category {
    id: number;
    name: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductImage {
    id: number;
    productId: number;
    path: string;
    name: string;
    active: boolean;
    displayOrder: number;
    favorite: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductPrice {
    id: number;
    productId: number;
    value: number;
    batch: number;
    quantidadeCompra: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductVariant {
    id: number;
    productId: number;
    model: 'MASCULINO' | 'FEMININO' | 'UNISEX';
    size: string;
    stock: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateProductDto {
    categoryId: number;
    name: string;
    description: string;
    quantity?: number;
    variants?: CreateProductVariantDto[];
}

export interface UpdateProductDto {
    categoryId?: number;
    name?: string;
    description?: string;
    quantity?: number;
    active?: boolean | number; // Aceita boolean (convertido para 1/0) ou number direto
    variants?: CreateProductVariantDto[];
}

export interface CreateCategoryDto {
    name: string;
}

export interface UpdateCategoryDto {
    name?: string;
}

export interface CreateProductImageDto {
    path: string;
    name: string;
    displayOrder?: number;
    favorite?: boolean;
}

export interface UpdateProductImageDto {
    path?: string;
    name?: string;
    active?: boolean;
    displayOrder?: number;
    favorite?: boolean;
}

export interface CreateProductPriceDto {
    value: number;
    batch: number;
    quantidadeCompra?: number;
}

export interface UpdateProductPriceDto {
    value?: number;
    batch?: number;
    quantidadeCompra?: number;
    active?: boolean;
}

export interface CreateProductVariantDto {
    model: 'MASCULINO' | 'FEMININO' | 'UNISEX';
    size: string;
    stock: number;
}

export interface UpdateProductVariantDto {
    model?: 'MASCULINO' | 'FEMININO' | 'UNISEX';
    size?: string;
    stock?: number;
    active?: boolean;
}

export interface SizeChart {
    id: number;
    name: string;
    description?: string;
    imagePath?: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface SizeChartMeasurement {
    id: number;
    sizeChartId: number;
    size: string;
    chest?: number;
    waist?: number;
    length?: number;
    shoulder?: number;
    sleeve?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateSizeChartDto {
    name: string;
    description?: string;
    imagePath?: string;
    measurements?: CreateSizeChartMeasurementDto[];
}

export interface CreateSizeChartMeasurementDto {
    size: string;
    chest?: number;
    waist?: number;
    length?: number;
    shoulder?: number;
    sleeve?: number;
}

export interface UpdateSizeChartDto {
    name?: string;
    description?: string;
    imagePath?: string;
    active?: boolean;
    measurements?: Array<{
        id?: number;
        size: string;
        chest?: number;
        waist?: number;
        length?: number;
        shoulder?: number;
        sleeve?: number;
    }>;
}

export interface ProductFilters {
    categoryId?: number;
    active?: boolean;
    name?: string;
}

// Agency and Points Ledger System
export interface Agency {
    id: number;
    cnpj: string;
    name: string;
    email: string;
    phone?: string;
    branch?: string | null;
    branchId?: number | null;
    executive_name?: string | null;
    executiveId?: number | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Address {
    id: number;
    agencyId: number;
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    createdAt: Date;
    updatedAt: Date;
}

export type ImportStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface AgencyPointsImport {
    id: number;
    referencePeriod: string;
    uploadedBy: number;
    uploadedAt: Date;
    checksum: string;
    status?: ImportStatus;
    totalRows?: number;
    processedRows?: number;
    startedAt?: Date | null;
    finishedAt?: Date | null;
    errorMessage?: string | null;
}

export interface AgencyPointsImportItem {
    id: number;
    importId: number;
    saleId?: string | null;
    saleDate?: Date | null;
    cnpj: string;
    agencyName?: string | null;
    branch?: string | null;
    store?: string | null;
    executiveName: string;
    supplier?: string | null;
    productName?: string | null;
    company?: string | null;
    points: number; // DECIMAL(10,2) - mantido como number no TypeScript
}

export interface AgencyPointsLedger {
    id: number;
    agencyId: number;
    sourceType: 'IMPORT' | 'REDEEM';
    sourceId: number;
    points: number; // DECIMAL(10,2) - mantido como number no TypeScript
    description?: string;
    createdAt: Date;
}

export interface Order {
    id: number;
    agencyId: number;
    totalPoints: number; // DECIMAL(10,2) - mantido como number no TypeScript
    status: 'PENDING' | 'CONFIRMED' | 'CANCELED';
    createdAt: Date;
    updatedAt: Date;
}

export interface OrderItem {
    id: number;
    orderId: number;
    productId: number;
    productPriceId: number | null;
    productVariantId: number | null;
    quantity: number;
    pointsPerUnit: number; // DECIMAL(10,2) - mantido como number no TypeScript
}

// DTOs
export interface CreateAgencyDto {
    cnpj: string;
    name: string;
    email: string;
    phone?: string;
    password?: string;
    address: CreateAddressDto;
    acceptedLegalDocuments?: number[];
}

export interface CreateAddressDto {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
}

export interface UpdateAgencyDto {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    active?: boolean;
}

export interface CreateAgencyPointsImportDto {
    referencePeriod: string;
    checksum: string;
    items: CreateAgencyPointsImportItemDto[];
}

export interface CreateAgencyPointsImportItemDto {
    saleId?: string | null;
    saleDate?: string | null; // ISO date string
    cnpj: string;
    agencyName?: string | null;
    branch?: string | null;
    store?: string | null;
    executiveName: string;
    supplier?: string | null;
    productName?: string | null;
    company?: string | null;
    points: number; // DECIMAL(10,2) - aceita valores decimais
}

export interface CreateOrderDto {
    items: CreateOrderItemDto[];
}

export interface CreateOrderItemDto {
    productId: number;
    quantity: number;
    variantId?: number; // ID da variação (modelo + tamanho)
}

// Reports System
export type ReportSourceTable = 
    | 'agency_points_import_items'
    | 'agencies'
    | 'agency_points_ledger'
    | 'orders'
    | 'order_items';

export type VisualizationType = 'table' | 'bar' | 'line' | 'pie' | 'area';

export type MetricOperation = 'SUM' | 'COUNT';

export interface ReportDimension {
    field: string;
    alias?: string;
}

export interface ReportMetric {
    field: string;
    operation: MetricOperation;
    alias?: string;
}

export interface ReportFilter {
    field: string;
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL';
    value: any;
}

export interface ReportSort {
    field: string;
    direction: 'ASC' | 'DESC';
}

export interface ReportConfig {
    dimensions?: ReportDimension[];
    metrics?: ReportMetric[];
    filters?: ReportFilter[];
    sort?: ReportSort[];
    limit?: number;
}

export interface Report {
    id: number;
    name: string;
    sourceTable: ReportSourceTable;
    visualizationType: VisualizationType;
    configJson: ReportConfig;
    createdBy: number;
    isPublic?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateReportDto {
    name: string;
    sourceTable: ReportSourceTable;
    visualizationType: VisualizationType;
    config: ReportConfig;
    isPublic?: boolean;
}

export interface UpdateReportDto {
    name?: string;
    sourceTable?: ReportSourceTable;
    visualizationType?: VisualizationType;
    config?: ReportConfig;
    isPublic?: boolean;
}

export interface DashboardWidget {
    id: number;
    userId: number;
    reportId: number;
    position: number;
    expanded?: number; // 0 = 1 col, 1 = 2 cols, 2 = 3 cols
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    report?: Report;
}

export interface CreateDashboardWidgetDto {
    reportId: number;
    position?: number;
    expanded?: number;
}

export interface UpdateDashboardWidgetDto {
    position?: number;
    expanded?: number;
    active?: boolean;
}

// Branch System
export interface Branch {
    id: number;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateBranchDto {
    name: string;
}

export interface UpdateBranchDto {
    name?: string;
}

// Executive Notification Email System
export interface ExecutiveNotificationEmail {
    id: number;
    executiveId: number;
    email: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateExecutiveNotificationEmailDto {
    executiveId: number;
    email: string;
}

export interface UpdateExecutiveNotificationEmailDto {
    email?: string;
    active?: boolean;
}
