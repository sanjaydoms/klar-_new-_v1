import React from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, ArrowUpCircle } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-8 flex items-center justify-center gap-4 py-4 bg-white rounded-lg shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Items per page:</span>
        <select
          value={itemsPerPage}
          onChange={onItemsPerPageChange}
          className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      </div>

      <div className="text-sm text-gray-600">
        Page <span className="font-bold">{currentPage}</span> of{' '}
        <span className="font-bold">{totalPages}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="First Page"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="sr-only">First Page</span>
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Previous Page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => {
                  console.log('Clicked page:', pageNum);
                  onPageChange(pageNum);
                }}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Next Page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Last Page"
        >
          <ArrowUpCircle className="w-4 h-4 rotate-90" />
          <span className="sr-only">Last Page</span>
        </button>
      </div>
    </div>
  );
}
