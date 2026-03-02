import { useState, useMemo } from "react";
import { aiUsageService } from "@/services/aiUsageService";
import { AiSettings } from "@/types/ai";
import { SectionCard } from "@/ui/common/StandardModal";

interface AiUsageDashboardProps {
  settings: AiSettings;
}

type TimeRange = "day" | "week" | "month";

export function AiUsageDashboard({ settings: _settings }: AiUsageDashboardProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [timeRange, setTimeRange] = useState<TimeRange>("day");

  const stats = useMemo(() => aiUsageService.getStats(), [refreshKey]);

  const handleClear = () => {
    if (confirm("¿Estás seguro de que quieres borrar todo el historial de uso?")) {
      aiUsageService.clearHistory();
      setRefreshKey(prev => prev + 1);
    }
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: cost < 0.01 ? 4 : 2
    }).format(cost);
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
    return tokens.toString();
  };

  const historyData = useMemo(() => {
    let source: Record<string, number>;
    let limit = 14;

    switch (timeRange) {
      case "month":
        source = stats.historyByMonth;
        limit = 12;
        break;
      case "week":
        source = stats.historyByWeek;
        limit = 12;
        break;
      default:
        source = stats.historyByDay;
        limit = 14;
    }

    return Object.entries(source)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-limit);
  }, [stats, timeRange]);

  const maxCost = Math.max(...historyData.map(e => e[1]), 0.001);

  return (
    <div className="ai-usage-dashboard gs-sections-container">
      <div className="usage-summary-grid">
        <div className="gs-stat-card highlight">
          <span className="gs-stat-label">Costo Hoy</span>
          <span className="gs-stat-value">{formatCost(stats.today.cost)}</span>
          <span className="gs-stat-sub">{stats.today.count} peticiones</span>
        </div>
        <div className="gs-stat-card">
          <span className="gs-stat-label">Tokens Hoy</span>
          <span className="gs-stat-value">{formatTokens(stats.today.tokens)}</span>
          <span className="gs-stat-sub">Entrada + Salida</span>
        </div>
        <div className="gs-stat-card">
          <span className="gs-stat-label">Costo Total</span>
          <span className="gs-stat-value">{formatCost(stats.total.cost)}</span>
          <span className="gs-stat-sub">{stats.total.count} peticiones totales</span>
        </div>
      </div>

      <SectionCard
        title="Historial de Inversión"
        subtitle="Seguimiento de costos por periodo"
        headerAction={
          <div className="gs-capsule-tabs small">
            <button
              className={timeRange === "day" ? "active" : ""}
              onClick={() => setTimeRange("day")}
            >Días</button>
            <button
              className={timeRange === "week" ? "active" : ""}
              onClick={() => setTimeRange("week")}
            >Semanas</button>
            <button
              className={timeRange === "month" ? "active" : ""}
              onClick={() => setTimeRange("month")}
            >Meses</button>
          </div>
        }
      >
        <div className="gs-chart-container">
          {historyData.length > 0 ? (
            <div className="gs-bar-chart">
              {historyData.map(([label, cost]) => (
                <div key={label} className="gs-bar-wrapper" title={`${label}: ${formatCost(cost)}`}>
                  <div
                    className="gs-bar"
                    style={{ height: `${Math.max(4, (cost / maxCost) * 100)}%` }}
                  >
                    {cost > maxCost * 0.15 && (
                      <span className="gs-bar-value">{formatCost(cost)}</span>
                    )}
                  </div>
                  <span className="gs-bar-label">
                    {timeRange === "day" ? label.split('-').slice(1).join('/') :
                      timeRange === "week" ? label.split('-W')[1] :
                        label.split('-')[1]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="gs-empty-state">No hay datos suficientes para este periodo.</div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Uso por Modelo" subtitle="Consumo acumulado y rendimiento">
        <table className="gs-table">
          <thead>
            <tr>
              <th>Modelo / Motor</th>
              <th className="text-right">Peticiones</th>
              <th className="text-right">Tokens</th>
              <th className="text-right">Inversión</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(stats.byModel).map(([model, data]) => (
              <tr key={model}>
                <td><code className="gs-code-tag">{model}</code></td>
                <td className="text-right">{data.count}</td>
                <td className="text-right">{formatTokens(data.tokens)}</td>
                <td className="text-right gs-text-accent font-mono">{formatCost(data.cost)}</td>
              </tr>
            ))}
            {Object.keys(stats.byModel).length === 0 && (
              <tr>
                <td colSpan={4} className="gs-empty-row">Sin actividad registrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </SectionCard>

      <div className="gs-panel-actions">
        <button className="gs-btn-danger ghost small" onClick={handleClear}>
          Limpiar Historial de Uso
        </button>
      </div>

      <style>{`
                .ai-usage-dashboard {
                    padding: 4px;
                }

                .usage-summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .gs-stat-card {
                    background: var(--gs-bg-glass);
                    backdrop-filter: blur(10px);
                    border: 1px solid var(--gs-border-dim);
                    border-radius: 12px;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .gs-stat-card.highlight {
                    border-color: var(--gs-accent-gold-transparent);
                    background: linear-gradient(135deg, rgba(212, 175, 55, 0.1), transparent);
                }

                .gs-stat-label {
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--gs-ink-muted);
                }

                .gs-stat-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--gs-ink-primary);
                    font-family: 'Inter', sans-serif;
                }

                .gs-stat-card.highlight .gs-stat-value {
                    color: var(--gs-accent-gold);
                }

                .gs-stat-sub {
                    font-size: 0.75rem;
                    color: var(--gs-ink-secondary);
                }

                .gs-chart-container {
                    height: 220px;
                    display: flex;
                    align-items: flex-end;
                    padding: 20px 0 10px 0;
                }

                .gs-bar-chart {
                    display: flex;
                    align-items: flex-end;
                    gap: 12px;
                    width: 100%;
                    height: 100%;
                }

                .gs-bar-wrapper {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    height: 100%;
                    justify-content: flex-end;
                }

                .gs-bar {
                    width: 100%;
                    background: var(--gs-accent-gold);
                    border-radius: 4px 4px 2px 2px;
                    position: relative;
                    transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                    opacity: 0.7;
                    min-height: 4px;
                }

                .gs-bar:hover {
                    opacity: 1;
                    filter: brightness(1.1);
                    box-shadow: 0 0 15px var(--gs-accent-gold-transparent);
                }

                .gs-bar-value {
                    position: absolute;
                    top: -24px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 0.7rem;
                    white-space: nowrap;
                    color: var(--gs-accent-gold);
                }

                .gs-bar-label {
                    font-size: 0.65rem;
                    color: var(--gs-ink-muted);
                    font-weight: 500;
                }

                .gs-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .gs-table th {
                    text-align: left;
                    padding: 12px;
                    font-size: 0.8rem;
                    color: var(--gs-ink-muted);
                    border-bottom: 1px solid var(--gs-border-dim);
                }

                .gs-table td {
                    padding: 12px;
                    border-bottom: 1px solid var(--gs-border-dim);
                    font-size: 0.9rem;
                }

                .text-right { text-align: right !important; }

                .gs-code-tag {
                    background: var(--gs-bg-dim);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    border: 1px solid var(--gs-border-dim);
                }

                .gs-text-accent {
                    color: var(--gs-accent-gold);
                }

                .font-mono {
                    font-family: 'JetBrains Mono', monospace;
                }

                .gs-panel-actions {
                    margin-top: 24px;
                    display: flex;
                    justify-content: flex-end;
                }

                .gs-empty-state, .gs-empty-row {
                    width: 100%;
                    text-align: center;
                    padding: 40px 0;
                    color: var(--gs-ink-muted);
                    font-style: italic;
                }
            `}</style>
    </div>
  );
}
