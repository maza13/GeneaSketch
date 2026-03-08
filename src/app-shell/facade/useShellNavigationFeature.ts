import type { AppShellFacade } from "./types";
import type { SearchFilterState, SearchSortField } from "@/ui/search/searchEngine";

type Params = {
  searchViewModel: AppShellFacade["navigation"]["search"]["viewModel"];
  setShowSearchPanel: (open: boolean) => void;
  inspectPerson: (personId: string | null) => void;
  setWorkspacePersonId: (personId: string | null) => void;
  setQuery: (query: string) => void;
  setSortField: (field: SearchSortField) => void;
  toggleSortDirection: () => void;
  patchFilters: (patch: Partial<SearchFilterState>) => void;
  resetSearch: () => void;
  nodeMenuState: AppShellFacade["navigation"]["nodeMenu"]["state"];
  setNodeMenu: (state: null) => void;
};

export function useShellNavigationFeature(params: Params): AppShellFacade["navigation"] {
  return {
    search: {
      viewModel: params.searchViewModel,
      commands: {
        onClose: () => params.setShowSearchPanel(false),
        onSelectPerson: (personId) => {
          params.inspectPerson(personId);
          params.setWorkspacePersonId(personId);
        },
        onQueryChange: params.setQuery,
        onSortFieldChange: params.setSortField,
        onSortDirectionToggle: params.toggleSortDirection,
        onFiltersChange: params.patchFilters,
        onReset: params.resetSearch,
      },
    },
    nodeMenu: {
      state: params.nodeMenuState,
      onClose: () => params.setNodeMenu(null),
    },
  };
}
