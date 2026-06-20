"use client";

import { DataTablePagination } from "@/components/ui/data-table-pagination";

type CompetitionListPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  pageSize?: number;
};

export function CompetitionListPagination({
  page,
  totalPages,
  total,
  onPageChange,
  disabled,
  pageSize = 20,
}: CompetitionListPaginationProps) {
  return (
    <DataTablePagination
      page={page}
      pageSize={pageSize}
      total={total}
      totalPages={totalPages}
      onPageChange={onPageChange}
      disabled={disabled}
    />
  );
}
