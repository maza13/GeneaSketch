import { useMemo, useState } from "react";
import type { GraphDocument } from "@/types/domain";
import type { SearchFilterState, SearchSortDirection, SearchSortField } from "./searchEngine";
import { buildSearchResults } from "./searchEngine";

type Props = {
  open: boolean;
  document: GraphDocument | null;
  onClose: () => void;
  onSelectPerson: (personId: string) => void;
};

export function SearchCenterPanel({ open, document, onClose, onSelectPerson }: Props) {
  // NOTE: This is the advanced search mode. A future dedicated personal-experience panel
  // can reuse this engine and replace this UI entrypoint without changing search logic.
  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<SearchSortField>("id");
  const [sortDirection, setSortDirection] = useState<SearchSortDirection>("asc");
  const [filters, setFilters] = useState<SearchFilterState>({
    sex: "any",
    lifeStatus: "any",
    surname: "any"
  });
  const isQueryEmpty = query.trim().length === 0;
  const results = useMemo(
    () => (document ? buildSearchResults(document, query, sortField, sortDirection, filters) : []),
    [document, query, sortField, sortDirection, filters]
  );

  if (!open) return null;

  return (
    <div className="search-center-overlay" onClick={onClose}>
      <section className="search-center-panel" onClick={(event) => event.stopPropagation()}>
        <header className="search-center-header">
          <div className="search-center-title">
            <h3>Buscar personas y relaciones</h3>
            {results.length > 0 && <span className="search-results-badge">{results.length}</span>}
          </div>
          <button onClick={onClose} aria-label="Cerrar buscador" className="search-close-x">
            ?
          </button>
        </header>
        <input
          id="search-center-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Ej: "hijos de Juan", "padres de Ana", "pareja de Luis", "vivos"'
          autoFocus
        />
        <div className="search-controls">
          <div className="search-sort-bar">
            <label className="search-sort-field">
              Ordenar por
              <select value={sortField} onChange={(event) => setSortField(event.target.value as SearchSortField)}>
                <option value="id">ID</option>
                <option value="name">Nombre</option>
                <option value="surname">Apellido</option>
              </select>
            </label>
            <button
              className="search-sort-direction"
              onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
              title={`Cambiar a ${sortDirection === "asc" ? "descendente" : "ascendente"}`}
            >
              {sortDirection === "asc" ? "Ascendente" : "Descendente"}
            </button>
          </div>
          <div className="search-filter-chips">
            <select
              aria-label="Filtrar por sexo"
              value={filters.sex}
              onChange={(event) => setFilters((prev) => ({ ...prev, sex: event.target.value as SearchFilterState["sex"] }))}
            >
              <option value="any">Sexo: todos</option>
              <option value="M">Sexo: masculino</option>
              <option value="F">Sexo: femenino</option>
              <option value="U">Sexo: no definido</option>
            </select>
            <select
              aria-label="Filtrar por estado vital"
              value={filters.lifeStatus}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, lifeStatus: event.target.value as SearchFilterState["lifeStatus"] }))
              }
            >
              <option value="any">Estado: todos</option>
              <option value="alive">Estado: vivos</option>
              <option value="deceased">Estado: fallecidos</option>
            </select>
            <select
              aria-label="Filtrar por apellido"
              value={filters.surname}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, surname: event.target.value as SearchFilterState["surname"] }))
              }
            >
              <option value="any">Apellido: cualquiera</option>
              <option value="with">Con apellido</option>
              <option value="without">Sin apellido</option>
            </select>
            <button
              className="search-reset-chips"
              onClick={() => {
                setQuery("");
                setFilters({ sex: "any", lifeStatus: "any", surname: "any" });
                setSortField("id");
                setSortDirection("asc");
              }}
              title="Restablecer filtros"
            >
              Limpiar
            </button>
          </div>
        </div>
        <div className="search-center-results">
          {results.length === 0 ? (
            <div className="search-center-empty">
              {isQueryEmpty ? (
                <>
                  <span className="search-center-empty-icon">??</span>
                  <p>{document ? "No hay personas en el árbol actual." : "Carga un árbol para empezar a buscar."}</p>
                </>
              ) : "Sin resultados para la consulta actual."}
            </div>
          ) : null}
          {results.map((result) => (
            <button
              key={result.personId}
              className="search-center-item"
              onClick={() => {
                onSelectPerson(result.personId);
                onClose();
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


