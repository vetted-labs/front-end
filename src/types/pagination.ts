export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Pagination metadata returned alongside paginated API results. */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
