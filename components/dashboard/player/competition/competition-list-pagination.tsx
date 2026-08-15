"use client";

import { DataTablePagination } from "@/components/ui/data-table-pagination";

type CompetitionListPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  disabled?: boolean;
  pageSize?: number;
  pageSizeOptions?: readonly number[];
};

export function CompetitionListPagination({
  page,
  totalPages,
  total,
  onPageChange,
  onPageSizeChange,
  disabled,
  pageSize = 20,
  pageSizeOptions,
}: CompetitionListPaginationProps) {
  return (
    <DataTablePagination
      page={page}
      pageSize={pageSize}
      total={total}
      totalPages={totalPages}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={pageSizeOptions}
      disabled={disabled}
    />
  );
}
