import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig<T> {
  key: keyof T | string;
  direction: SortDirection;
}

export function useTableSort<T>(
  data: T[],
  initialSort?: SortConfig<T>
): {
  sortedData: T[];
  sortConfig: SortConfig<T> | null;
  handleSort: (key: keyof T | string) => void;
  getSortIcon: (key: keyof T | string) => React.ReactNode;
} {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(
    initialSort || null
  );

  const sortedData = useMemo(() => {
    if (!sortConfig || !sortConfig.direction) {
      return data;
    }

    const sorted = [...data].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key);
      const bValue = getNestedValue(b, sortConfig.key);

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Compare values
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }

      // String comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (sortConfig.direction === "asc") {
        return aStr.localeCompare(bStr, "pt-BR");
      } else {
        return bStr.localeCompare(aStr, "pt-BR");
      }
    });

    return sorted;
  }, [data, sortConfig]);

  const handleSort = (key: keyof T | string) => {
    let direction: SortDirection = "asc";

    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    } else if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "desc"
    ) {
      direction = null;
    }

    setSortConfig(direction ? { key, direction } : null);
  };

  const getSortIcon = (key: keyof T | string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return null;
    }

    if (sortConfig.direction === "asc") {
      return <ArrowUp className="w-3 h-3 ml-1 inline-block" />;
    } else if (sortConfig.direction === "desc") {
      return <ArrowDown className="w-3 h-3 ml-1 inline-block" />;
    }

    return null;
  };

  return {
    sortedData,
    sortConfig,
    handleSort,
    getSortIcon,
  };
}

// Helper function to get nested values
function getNestedValue(obj: any, path: string | keyof any): any {
  if (typeof path === "string" && path.includes(".")) {
    return path.split(".").reduce((o, p) => o?.[p], obj);
  }
  return obj[path];
}
