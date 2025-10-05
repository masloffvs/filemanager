interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-2">
      <button
        aria-label="Previous page"
        aria-roledescription="button"
        role="button"
        className="px-2 py-1 cursor-pointer text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:text-gray-400 disabled:bg-gray-100 dark:bg-dark-300 dark:border-dark-600 dark:text-gray-300 dark:hover:bg-dark-200 dark:disabled:bg-dark-600 dark:disabled:text-gray-500"
        onClick={() => onPageChange(Math.max(0, currentPage - 1))}
        disabled={currentPage === 0}
      >
        Prev
      </button>
      <span className="text-xs text-gray-600 dark:text-gray-300">
        Page {currentPage + 1} / {totalPages}
      </span>
      <button
        aria-label="Next page"
        aria-roledescription="button"
        role="button"
        className="px-2 py-1 cursor-pointer text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:text-gray-400 disabled:bg-gray-100 dark:bg-dark-300 dark:border-dark-600 dark:text-gray-300 dark:hover:bg-dark-200 dark:disabled:bg-dark-600 dark:disabled:text-gray-500"
        onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
        disabled={currentPage >= totalPages - 1}
      >
        Next
      </button>
    </div>
  );
}
