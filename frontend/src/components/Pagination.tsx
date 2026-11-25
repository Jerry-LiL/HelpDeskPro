interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPage: (page: number) => void;
}

export function Pagination({ page, limit, total, totalPages, onPage }: PaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const pages = total === 0 ? 0 : totalPages;

  return (
    <div className="pager">
      <span>
        Showing {start}–{end} of {total}
      </span>
      <div className="pager-buttons">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <span>
          Page {pages === 0 ? 0 : page} of {pages}
        </span>
        <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
