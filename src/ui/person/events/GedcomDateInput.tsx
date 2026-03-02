import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  buildGedcomDateFromAssistState,
  parseGedcomDateToAssistState,
  type DateAssistMode,
  type DateApproxPrefix,
  type DateAssistState
} from "@/ui/person/personDetailUtils";

type Props = {
  value: string;
  onChange: (next: string) => void;
  label: string;
  helpText?: string;
  showBirthAssistant?: boolean;
  birthAssistantSlot?: ReactNode;
};

const MONTH_OPTIONS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTH_LABELS: Record<string, string> = {
  JAN: "Ene",
  FEB: "Feb",
  MAR: "Mar",
  APR: "Abr",
  MAY: "May",
  JUN: "Jun",
  JUL: "Jul",
  AUG: "Ago",
  SEP: "Sep",
  OCT: "Oct",
  NOV: "Nov",
  DEC: "Dic"
};
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1499 }, (_, i) => String(CURRENT_YEAR + 3 - i));
const WHEEL_STEP_DURATION_MS = 120;
const WHEEL_CLICK_STEP_DURATION_MS = 165;
type WheelKind = "day" | "month" | "year";

function normalizedOption(value: string): string {
  return value.trim().toUpperCase();
}

function ensureExactDefaults(state: DateAssistState): DateAssistState {
  const now = new Date();
  const month = MONTH_OPTIONS[now.getMonth()] || "JAN";
  const year = String(now.getFullYear());
  return {
    ...state,
    mode: "exact",
    exactMonth: state.exactMonth || month,
    exactYear: state.exactYear || year,
    exactDay: state.exactDay || ""
  };
}

function ScrollWheelSelect({
  label,
  options,
  value,
  onSelect,
  kind,
  formatOption
}: {
  label: string;
  options: string[];
  value: string;
  onSelect: (next: string) => void;
  kind: WheelKind;
  formatOption?: (option: string) => string;
}) {
  const baseOptions = useMemo(() => ["", ...options], [options]);
  const baseLength = baseOptions.length;
  const queuedStepRef = useRef<1 | -1 | 0>(0);
  const queuedStepsCountRef = useRef(0);
  const queuedDurationRef = useRef(WHEEL_STEP_DURATION_MS);
  const animationTimerRef = useRef<number | null>(null);
  const [animDirection, setAnimDirection] = useState<1 | -1 | 0>(0);
  const [logicalIndex, setLogicalIndex] = useState(0);
  const logicalIndexRef = useRef(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const isAnimatingRef = useRef(false);

  function logicalIndexFromValue(raw: string): number {
    const target = normalizedOption(raw);
    const idx = baseOptions.findIndex((opt) => normalizedOption(opt) === target);
    return idx >= 0 ? idx : 0;
  }

  function modIndex(index: number): number {
    return ((index % baseLength) + baseLength) % baseLength;
  }

  useEffect(() => {
    const nextLogical = logicalIndexFromValue(value);
    logicalIndexRef.current = nextLogical;
    setLogicalIndex(nextLogical);
  }, [value, baseLength]);

  useEffect(
    () => () => {
      if (animationTimerRef.current !== null) {
        window.clearTimeout(animationTimerRef.current);
      }
    },
    []
  );

  function commitStep(step: 1 | -1, durationMs = WHEEL_STEP_DURATION_MS) {
    if (isAnimatingRef.current) {
      queuedStepRef.current = step;
      queuedStepsCountRef.current = Math.max(queuedStepsCountRef.current, 1);
      queuedDurationRef.current = durationMs;
      return;
    }
    const nextLogical = modIndex(logicalIndexRef.current + step);
    logicalIndexRef.current = nextLogical;
    setLogicalIndex(nextLogical);
    isAnimatingRef.current = true;
    setIsAnimating(true);
    setAnimDirection(step);
    onSelect(baseOptions[nextLogical]);
    if (animationTimerRef.current !== null) window.clearTimeout(animationTimerRef.current);
    animationTimerRef.current = window.setTimeout(() => {
      isAnimatingRef.current = false;
      setIsAnimating(false);
      setAnimDirection(0);
      if (queuedStepRef.current !== 0 && queuedStepsCountRef.current > 0) {
        const queued = queuedStepRef.current;
        queuedStepsCountRef.current -= 1;
        if (queuedStepsCountRef.current === 0) {
          queuedStepRef.current = 0;
        }
        commitStep(queued, queuedDurationRef.current);
      }
    }, durationMs);
  }

  function applyOffset(offset: number) {
    if (offset === 0) return;
    const step: 1 | -1 = offset > 0 ? 1 : -1;
    const loops = Math.min(Math.abs(offset), 4);
    queuedStepRef.current = step;
    queuedStepsCountRef.current = Math.max(0, loops - 1);
    queuedDurationRef.current = WHEEL_CLICK_STEP_DURATION_MS;
    commitStep(step, WHEEL_CLICK_STEP_DURATION_MS);
  }

  const visibleOffsets = [-2, -1, 0, 1, 2];
  const animationClass =
    animDirection === 1
      ? "gedcom-wheel__window is-animating-down"
      : animDirection === -1
        ? "gedcom-wheel__window is-animating-up"
        : "gedcom-wheel__window";

  function optionByOffset(offset: number): string {
    const idx = modIndex(logicalIndex + offset);
    return baseOptions[idx];
  }

  return (
    <div className="gedcom-wheel" role="group" aria-label={`${label}-${kind}`}>
      <span className="gedcom-wheel__label">{label}</span>
      <div className="gedcom-wheel__viewport">
        <div className="gedcom-wheel__focus-band" aria-hidden="true" />
        <div
          className={animationClass}
          tabIndex={0}
          onWheel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            commitStep(e.deltaY > 0 ? 1 : -1, WHEEL_STEP_DURATION_MS);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              commitStep(1, WHEEL_STEP_DURATION_MS);
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              commitStep(-1, WHEEL_STEP_DURATION_MS);
            }
          }}
        >
          {visibleOffsets.map((offset) => {
            const option = optionByOffset(offset);
            const active = offset === 0;
            return (
              <button
                type="button"
                key={`${label}-offset-${offset}-${option || "empty"}`}
                className={
                  active
                    ? `gedcom-wheel__item is-active${isAnimating ? " is-animating" : ""}`
                    : "gedcom-wheel__item"
                }
                onClick={() => {
                  applyOffset(offset);
                }}
              >
                {option ? (formatOption ? formatOption(option) : option) : "-"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DatePartsFields({
  day,
  month,
  year,
  onDay,
  onMonth,
  onYear
}: {
  day: string;
  month: string;
  year: string;
  onDay: (v: string) => void;
  onMonth: (v: string) => void;
  onYear: (v: string) => void;
}) {
  return (
    <div className="gedcom-date-assist-grid">
      <ScrollWheelSelect label="Dia" kind="day" options={DAY_OPTIONS} value={day} onSelect={onDay} />
      <ScrollWheelSelect
        label="Mes"
        kind="month"
        options={MONTH_OPTIONS}
        value={month}
        onSelect={onMonth}
        formatOption={(opt) => `${MONTH_LABELS[opt] || opt} (${opt})`}
      />
      <ScrollWheelSelect label="Año" kind="year" options={YEAR_OPTIONS} value={year} onSelect={onYear} />
    </div>
  );
}

export function GedcomDateInput({ value, onChange, label, helpText, showBirthAssistant = false, birthAssistantSlot }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [assistOpen, setAssistOpen] = useState(false);
  const [assist, setAssist] = useState(() => parseGedcomDateToAssistState(value));

  useEffect(() => {
    setAssist((prev) => {
      const next = parseGedcomDateToAssistState(value);
      if (prev.freeText === next.freeText && prev.mode === next.mode) return prev;
      return next;
    });
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const root = rootRef.current;
      if (!root) return;
      const target = event.target as Node | null;
      if (target && root.contains(target)) return;
      setAssistOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const preview = useMemo(() => buildGedcomDateFromAssistState(assist), [assist]);

  function setMode(mode: DateAssistMode) {
    setAssist((prev) => {
      const next = mode === "exact" ? ensureExactDefaults({ ...prev, mode }) : { ...prev, mode };
      if (mode === "free") {
        onChange(next.freeText || value);
      } else {
        const built = buildGedcomDateFromAssistState(next);
        onChange(built);
      }
      return next;
    });
  }

  function updateApproxPrefix(prefix: DateApproxPrefix) {
    setAssist((prev) => {
      const next = { ...prev, approxPrefix: prefix };
      const built = buildGedcomDateFromAssistState(next);
      onChange(built);
      return { ...next, freeText: built };
    });
  }

  function applyAssistChange(updater: (prev: DateAssistState) => DateAssistState) {
    setAssist((prev) => {
      const next = updater(prev);
      const built = buildGedcomDateFromAssistState(next);
      onChange(built);
      return { ...next, freeText: built };
    });
  }

  return (
    <div className="gedcom-date-input" ref={rootRef}>
      <label>
        {label}
        <input
          value={value || ""}
          onChange={(e) => {
            const nextValue = e.target.value;
            onChange(nextValue);
            setAssistOpen(true);
            setAssist((prev) => {
              const parsed = parseGedcomDateToAssistState(nextValue);
              return {
                ...parsed,
                freeText: nextValue,
                mode: prev.mode === "free" ? "free" : parsed.mode
              };
            });
          }}
          onFocus={() => {
            setAssistOpen(true);
            if (!value.trim()) {
              setAssist((prev) => ensureExactDefaults(prev));
            }
          }}
          placeholder="Ej: 15 JAN 1901, ABT 1900, BEF 1910, BET 1890 AND 1900"
        />
      </label>

      {assistOpen ? (
        <div className="gedcom-date-assist">
          <div className="gedcom-date-mode-tabs" role="tablist" aria-label="Modo de fecha">
            <button type="button" className={assist.mode === "exact" ? "is-active" : ""} onClick={() => setMode("exact")}>Exacta</button>
            <button type="button" className={assist.mode === "approx" ? "is-active" : ""} onClick={() => setMode("approx")}>Aprox</button>
            <button type="button" className={assist.mode === "before" ? "is-active" : ""} onClick={() => setMode("before")}>Antes</button>
            <button type="button" className={assist.mode === "after" ? "is-active" : ""} onClick={() => setMode("after")}>Después</button>
            <button type="button" className={assist.mode === "range" ? "is-active" : ""} onClick={() => setMode("range")}>Rango</button>
            <button type="button" className={assist.mode === "free" ? "is-active" : ""} onClick={() => setMode("free")}>Libre</button>
          </div>

          {assist.mode === "approx" ? (
            <label>
              Prefijo
              <select value={assist.approxPrefix} onChange={(e) => updateApproxPrefix(e.target.value as DateApproxPrefix)}>
                <option value="ABT">ABT</option>
                <option value="EST">EST</option>
                <option value="CAL">CAL</option>
              </select>
            </label>
          ) : null}

          {assist.mode === "range" ? (
            <>
              <div className="person-meta">Inicio</div>
              <DatePartsFields
                day={assist.rangeStartDay}
                month={assist.rangeStartMonth}
                year={assist.rangeStartYear}
                onDay={(v) => applyAssistChange((prev) => ({ ...prev, rangeStartDay: v }))}
                onMonth={(v) => applyAssistChange((prev) => ({ ...prev, rangeStartMonth: v }))}
                onYear={(v) => applyAssistChange((prev) => ({ ...prev, rangeStartYear: v }))}
              />
              <div className="person-meta">Fin</div>
              <DatePartsFields
                day={assist.rangeEndDay}
                month={assist.rangeEndMonth}
                year={assist.rangeEndYear}
                onDay={(v) => applyAssistChange((prev) => ({ ...prev, rangeEndDay: v }))}
                onMonth={(v) => applyAssistChange((prev) => ({ ...prev, rangeEndMonth: v }))}
                onYear={(v) => applyAssistChange((prev) => ({ ...prev, rangeEndYear: v }))}
              />
            </>
          ) : null}

          {assist.mode !== "range" && assist.mode !== "free" ? (
            <DatePartsFields
              day={assist.exactDay}
              month={assist.exactMonth}
              year={assist.exactYear}
              onDay={(v) => applyAssistChange((prev) => ({ ...prev, exactDay: v }))}
              onMonth={(v) => applyAssistChange((prev) => ({ ...prev, exactMonth: v }))}
              onYear={(v) => applyAssistChange((prev) => ({ ...prev, exactYear: v }))}
            />
          ) : null}

          <div className="person-meta">Preview GEDCOM: {preview || "(incompleto)"}</div>
          {helpText ? <div className="person-meta">{helpText}</div> : null}
        </div>
      ) : null}

      {showBirthAssistant ? <div className="gedcom-date-birth-slot">{birthAssistantSlot}</div> : null}
    </div>
  );
}
