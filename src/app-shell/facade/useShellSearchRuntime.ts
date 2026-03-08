import { useState } from "react";
import type { SearchFilterState, SearchSortDirection, SearchSortField } from "@/ui/search/searchEngine";

export function useShellSearchRuntime() {
  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<SearchSortField>("id");
  const [sortDirection, setSortDirection] = useState<SearchSortDirection>("asc");
  const [filters, setFilters] = useState<SearchFilterState>({
    sex: "any",
    lifeStatus: "any",
    surname: "any",
  });

  return {
    query,
    setQuery,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    filters,
    setFilters,
  };
}
