import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";

type PanZoomTransform = {
  scale: number;
  tx: number;
  ty: number;
};

type PointerPanState = {
  pointerId: number;
  startX: number;
  startY: number;
  startTx: number;
  startTy: number;
  didDrag: boolean;
};

const MIN_SCALE = 0.1;
const MAX_SCALE = 12;
const WHEEL_ZOOM_SENSITIVITY = 0.0018;
const DRAG_THRESHOLD_PX = 4;

function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

export function usePanZoom(fitNonce: number) {
  const [transform, setTransform] = useState<PanZoomTransform>({ scale: 1, tx: 0, ty: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingIntent, setIsDraggingIntent] = useState(false);
  const panStateRef = useRef<PointerPanState | null>(null);
  const suppressClickRef = useRef(false);
  const suppressClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTransform({ scale: 1, tx: 0, ty: 0 });
    setIsPanning(false);
    setIsDraggingIntent(false);
    panStateRef.current = null;
    suppressClickRef.current = false;
    if (suppressClearTimerRef.current) {
      clearTimeout(suppressClearTimerRef.current);
      suppressClearTimerRef.current = null;
    }
  }, [fitNonce]);

  useEffect(
    () => () => {
      if (suppressClearTimerRef.current) {
        clearTimeout(suppressClearTimerRef.current);
        suppressClearTimerRef.current = null;
      }
    },
    []
  );

  const consumeClickSuppression = useCallback(() => {
    const shouldSuppress = suppressClickRef.current;
    suppressClickRef.current = false;
    return shouldSuppress;
  }, []);

  const markClickSuppression = useCallback((shouldSuppress: boolean) => {
    suppressClickRef.current = shouldSuppress;
    if (suppressClearTimerRef.current) {
      clearTimeout(suppressClearTimerRef.current);
      suppressClearTimerRef.current = null;
    }
    if (shouldSuppress) {
      suppressClearTimerRef.current = setTimeout(() => {
        suppressClickRef.current = false;
        suppressClearTimerRef.current = null;
      }, 240);
    }
  }, []);

  const handlers = useMemo(
    () => ({
      onWheel: (e: WheelEvent<Element>) => {
        e.preventDefault();
        const host = e.currentTarget.getBoundingClientRect();
        const pointerX = e.clientX - host.left;
        const pointerY = e.clientY - host.top;
        const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENSITIVITY);

        setTransform((prev) => {
          const nextScale = clampScale(prev.scale * factor);
          const worldX = (pointerX - prev.tx) / prev.scale;
          const worldY = (pointerY - prev.ty) / prev.scale;
          const tx = pointerX - worldX * nextScale;
          const ty = pointerY - worldY * nextScale;
          return { scale: nextScale, tx, ty };
        });
      },

      onPointerDown: (e: PointerEvent<Element>) => {
        if (e.button !== 0) return;
        panStateRef.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          startTx: transform.tx,
          startTy: transform.ty,
          didDrag: false
        };
        setIsDraggingIntent(false);
      },

      onPointerMove: (e: PointerEvent<Element>) => {
        const panState = panStateRef.current;
        if (!panState || panState.pointerId !== e.pointerId) return;
        const dx = e.clientX - panState.startX;
        const dy = e.clientY - panState.startY;
        const distance = Math.hypot(dx, dy);
        if (!panState.didDrag && distance < DRAG_THRESHOLD_PX) return;
        if (!panState.didDrag) {
          panState.didDrag = true;
          setIsDraggingIntent(true);
          setIsPanning(true);
          e.currentTarget.setPointerCapture(e.pointerId);
        }
        e.preventDefault();
        setTransform((prev) => ({ ...prev, tx: panState.startTx + dx, ty: panState.startTy + dy }));
      },

      onPointerUp: (e: PointerEvent<Element>) => {
        const panState = panStateRef.current;
        if (!panState || panState.pointerId !== e.pointerId) return;
        if (panState.didDrag && e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        markClickSuppression(panState.didDrag);
        panStateRef.current = null;
        setIsPanning(false);
        setIsDraggingIntent(false);
      },

      onPointerCancel: (e: PointerEvent<Element>) => {
        const panState = panStateRef.current;
        if (!panState || panState.pointerId !== e.pointerId) return;
        if (panState.didDrag && e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        markClickSuppression(panState.didDrag);
        panStateRef.current = null;
        setIsPanning(false);
        setIsDraggingIntent(false);
      },

      onDoubleClick: () => {
        setTransform({ scale: 1, tx: 0, ty: 0 });
        markClickSuppression(false);
      }
    }),
    [markClickSuppression, transform.tx, transform.ty]
  );

  return { transform, isPanning, isDraggingIntent, consumeClickSuppression, handlers };
}
