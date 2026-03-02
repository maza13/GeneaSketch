import type { AiProvider, AiUsageRecord, AiSettings } from "@/types/ai";

const USAGE_STORAGE_KEY = "geneasketch_ai_usage_history";

/**
 * Service to manage AI usage history, cost calculation, and persistence.
 */
export const aiUsageService = {
    /**
     * Calculates the cost of a request based on token counts and model pricing.
     */
    calculateCost(settings: AiSettings, provider: AiProvider, modelId: string, inputTokens: number, outputTokens: number): number {
        const catalog = settings.modelCatalog[provider] || [];
        const model = catalog.find(m => m.id === modelId);

        if (!model) return 0;

        // Prices are usually in string format "$0.15" per 1M tokens in our catalog
        const parsePrice = (priceStr?: string) => {
            if (!priceStr) return 0;
            return parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
        };

        const priceIn = parsePrice(model.price);
        const priceOut = parsePrice(model.priceOut || model.price);

        const costIn = (inputTokens / 1_000_000) * priceIn;
        const costOut = (outputTokens / 1_000_000) * priceOut;

        return costIn + costOut;
    },

    /**
     * Saves a new usage record to local storage.
     */
    saveRecord(record: Omit<AiUsageRecord, 'id' | 'timestamp' | 'cost'>, settings: AiSettings): AiUsageRecord {
        const cost = this.calculateCost(settings, record.provider, record.model, record.inputTokens, record.outputTokens);

        const newRecord: AiUsageRecord = {
            ...record,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            cost
        };

        const history = this.getHistory();
        history.push(newRecord);

        // Keep last 1000 records to avoid localStorage bloat
        const trimmed = history.slice(-1000);
        localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(trimmed));

        return newRecord;
    },

    /**
     * Retrieves the full usage history.
     */
    getHistory(): AiUsageRecord[] {
        const raw = localStorage.getItem(USAGE_STORAGE_KEY);
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch {
            return [];
        }
    },

    /**
     * Clears all usage history.
     */
    clearHistory(): void {
        localStorage.removeItem(USAGE_STORAGE_KEY);
    },

    /**
     * Gets aggregated stats for the dashboard.
     */
    getStats() {
        const history = this.getHistory();
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const stats = {
            today: { cost: 0, tokens: 0, count: 0 },
            total: { cost: 0, tokens: 0, count: 0 },
            byModel: {} as Record<string, { cost: number, tokens: number, count: number }>,
            historyByDay: {} as Record<string, number>, // date -> cost
            historyByWeek: {} as Record<string, number>, // week (YYYY-WW) -> cost
            historyByMonth: {} as Record<string, number> // month (YYYY-MM) -> cost
        };

        const getWeekNumber = (date: Date) => {
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        };

        history.forEach(rec => {
            const date = new Date(rec.timestamp);
            const dateStr = rec.timestamp.split('T')[0];
            const monthStr = rec.timestamp.substring(0, 7); // YYYY-MM
            const weekNo = getWeekNumber(date);
            const weekStr = `${date.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
            const tokens = rec.inputTokens + rec.outputTokens;

            // Total
            stats.total.cost += rec.cost;
            stats.total.tokens += tokens;
            stats.total.count += 1;

            // Today
            if (dateStr === todayStr) {
                stats.today.cost += rec.cost;
                stats.today.tokens += tokens;
                stats.today.count += 1;
            }

            // By Model
            if (!stats.byModel[rec.model]) {
                stats.byModel[rec.model] = { cost: 0, tokens: 0, count: 0 };
            }
            stats.byModel[rec.model].cost += rec.cost;
            stats.byModel[rec.model].tokens += tokens;
            stats.byModel[rec.model].count += 1;

            // History
            stats.historyByDay[dateStr] = (stats.historyByDay[dateStr] || 0) + rec.cost;
            stats.historyByWeek[weekStr] = (stats.historyByWeek[weekStr] || 0) + rec.cost;
            stats.historyByMonth[monthStr] = (stats.historyByMonth[monthStr] || 0) + rec.cost;
        });

        return stats;
    }
};
