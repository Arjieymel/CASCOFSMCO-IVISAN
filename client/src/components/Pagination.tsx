import type { FC } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  onPageChange: (page: number) => void;
}

const Pagination: FC<PaginationProps> = ({ currentPage, lastPage, onPageChange }) => {
  if (lastPage <= 1) return null;

  const getPages = () => {
    const pages = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(lastPage, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 sm:px-6 bg-white border border-slate-100 rounded-xl mt-4">
      {/* Mobile view */}
      <div className="flex justify-between flex-1 sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === lastPage}
          className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>

      {/* Desktop view */}
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Showing page <span className="font-semibold text-slate-800">{currentPage}</span> of{" "}
            <span className="font-semibold text-slate-800">{lastPage}</span>
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-lg -space-x-px" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-lg border border-slate-200 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <span className="sr-only">Previous</span>
              <FiChevronLeft className="h-5 h-5" />
            </button>
            
            {getPages().map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium cursor-pointer ${
                  page === currentPage
                    ? "z-10 bg-primary border-primary text-white font-bold"
                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === lastPage}
              className="relative inline-flex items-center px-2 py-2 rounded-r-lg border border-slate-200 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <span className="sr-only">Next</span>
              <FiChevronRight className="h-5 h-5" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
