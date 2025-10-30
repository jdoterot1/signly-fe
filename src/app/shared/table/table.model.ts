export interface TableConfig {
    pageSize: number;
    pageSizeOptions?: number[];
    currentPage?: number;
    enableFiltering?: boolean;
    enableSorting?: boolean;
    showPagination?: boolean;
    showRowSelection?: boolean;
    rowSelectionMode?: 'single' | 'multiple';
    hideColumnsToggle?: boolean;
    loading?: boolean;
    emptyMessage?: string;
    trackByField?: string;
    responsive?: boolean;
    selectAllEnabled?: boolean;
    showIndexColumn?: boolean;
    columnVisibilityControl?: boolean;
    exportOptions?: Array<'csv' | 'excel' | 'pdf'>;
}

export interface TableColumn {
    key: string;
    header: string;
    sortable?: boolean;
    filterable?: boolean;
    visible?: boolean;
    columnType?: 'text' | 'action';
    actions?: TableCellAction[];
    width?: string;
}

export interface TableCellAction {
    label: string;
    icon?: string;
    tooltip?: string;
    disabled?: boolean | ((row: any) => boolean);
    handler: (row: any) => void;
}

/**
 * Nuevo modelo unificado
 */
export interface TableModel<T = any> {
    /** opcional, para título */
    entityName?: string;
    /** configuración de la tabla */
    tableConfig: TableConfig;
    /** definición de columnas */
    columns: TableColumn[];
    /** datos a mostrar */
    data: T[];
}