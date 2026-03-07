import type { SearchPanelViewModel } from "@/app-shell/facade/types";
import type { SearchFilterState, SearchSortField } from "@/ui/search/searchEngine";

type Props = {
  viewModel: SearchPanelViewModel;
  commands: {
    onClose: () => void;
    onSelectPerson: (personId: string) => void;
    onQueryChange: (query: string) => void;
    onSortFieldChange: (field: SearchSortField) => void;
    onSortDirectionToggle: () => void;
    onFiltersChange: (patch: Partial<SearchFilterState>) => void;
    onReset: () => void;
  };
};

export function ShellSearchCenterPanel({ viewModel, commands }: Props) {
  if (!viewModel.open) return null;

  const isQueryEmpty = viewModel.query.trim().length === 0;

  return (
    <div className="search-center-overlay" onClick={commands.onClose}>
      <section className="search-center-panel" onClick={(event) => event.stopPropagation()}>
        <header className="search-center-header">
          <div className="search-center-title">
            <h3>Buscar personas y relaciones</h3>
            {viewModel.results.length > 0 ? <span className="search-results-badge">{viewModel.results.length}</span> : null}
          </div>
          <button onClick={commands.onClose} aria-label="Cerrar buscador" className="search-close-x">
            x
          </button>
        </header>
        <input
          id="search-center-input"
          value={viewModel.query}
          onChange={(event) => commands.onQueryChange(event.target.value)}
          placeholder='Ej: "hijos de Juan", "padres de Ana", "pareja de Luis", "vivos"'
          autoFocus
        />
        <div className="search-controls">
          <div className="search-sort-bar">
            <label className="search-sort-field">
              Ordenar por
              <select value={viewModel.sortField} onChange={(event) => commands.onSortFieldChange(event.target.value as SearchSortField)}>
                <option value="id">ID</option>
                <option value="name">Nombre</option>
                <option value="surname">Apellido</option>
              </select>
            </label>
            <button className="search-sort-direction" onClick={commands.onSortDirectionToggle}>
              {viewModel.sortDirection === "asc" ? "Ascendente" : "Descendente"}
            </button>
          </div>
          <div className="search-filter-chips">
            <select
              aria-label="Filtrar por sexo"
              value={viewModel.filters.sex}
              onChange={(event) => commands.onFiltersChange({ sex: event.target.value as SearchFilterState["sex"] })}
            >
              <option value="any">Sexo: todos</option>
              <option value="M">Sexo: masculino</option>
              <option value="F">Sexo: femenino</option>
              <option value="U">Sexo: no definido</option>
            </select>
            <select
              aria-label="Filtrar por estado vital"
              value={viewModel.filters.lifeStatus}
              onChange={(event) => commands.onFiltersChange({ lifeStatus: event.target.value as SearchFilterState["lifeStatus"] })}
            >
              <option value="any">Estado: todos</option>
              <option value="alive">Estado: vivos</option>
              <option value="deceased">Estado: fallecidos</option>
            </select>
            <select
              aria-label="Filtrar por apellido"
              value={viewModel.filters.surname}
              onChange={(event) => commands.onFiltersChange({ surname: event.target.value as SearchFilterState["surname"] })}
            >
              <option value="any">Apellido: cualquiera</option>
              <option value="with">Con apellido</option>
              <option value="without">Sin apellido</option>
            </select>
            <button className="search-reset-chips" onClick={commands.onReset} title="Restablecer filtros">
              Limpiar
            </button>
          </div>
        </div>
        <div className="search-center-results">
          {viewModel.results.length === 0 ? (
            <div className="search-center-empty">
              {isQueryEmpty ? (
                <>
                  <span className="search-center-empty-icon">..</span>
                  <p>{viewModel.hasSearchData ? "No hay personas en el arbol actual." : "Carga un arbol para empezar a buscar."}</p>
                </>
              ) : "Sin resultados para la consulta actual."}
            </div>
          ) : null}
          {viewModel.results.map((result) => (
            <button
              key={result.personId}
              className="search-center-item"
              onClick={() => {
                commands.onSelectPerson(result.personId);
                commands.onClose();
              }}
            >
              <div className="search-item-info">
                <strong>{result.title}</strong>
                <span>{result.subtitle}</span>
              </div>
              <div className="search-item-id">
                <code>{result.personId}</code>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
