"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS, paginationRange } from "@/lib/pagination/constants";
import { cn } from "@/lib/utils";

type DataTablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  disabled?: boolean;
  className?: string;
};

export function DataTablePagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  disabled,
  className,
}: DataTablePaginationProps) {
  if (total === 0) return null;

  const safeTotalPages = Math.max(totalPages, 1);
  const { from, to } = paginationRange(page, pageSize, total);
  const atFirst = page <= 1;
  const atLast = page >= safeTotalPages;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-cp-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <p className="text-xs text-cp-muted">
          Showing{" "}
          <span className="font-medium text-foreground">
            {from.toLocaleString()}–{to.toLocaleString()}
          </span>{" "}
          of <span className="font-medium text-foreground">{total.toLocaleString()}</span>
        </p>
        {onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-cp-muted">Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-[4.5rem] border-cp-border bg-cp-elevated/50 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <p className="text-xs text-cp-muted sm:hidden">
          Page {page} of {safeTotalPages}
        </p>
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden border-cp-border sm:inline-flex"
            disabled={disabled || atFirst}
            onClick={() => onPageChange(1)}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-cp-border"
            disabled={disabled || atFirst}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <span className="hidden items-center px-2 text-xs text-cp-muted sm:flex">
            Page {page} of {safeTotalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-cp-border"
            disabled={disabled || atLast}
            onClick={() => onPageChange(page + 1)}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden border-cp-border sm:inline-flex"
            disabled={disabled || atLast}
            onClick={() => onPageChange(safeTotalPages)}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
