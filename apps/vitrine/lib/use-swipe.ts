"use client";

import { useRef } from "react";

/**
 * Hook : detect swipe-down geste pour fermer une bottom-sheet/modal mobile.
 *
 * Usage :
 * ```tsx
 * const swipeHandlers = useSwipeDown(() => onClose(), { threshold: 80 });
 * <div {...swipeHandlers}>...</div>
 * ```
 *
 * - `threshold` = pixels de delta-Y nécessaires pour déclencher le callback (default 80).
 * - Ne déclenche pas si l'utilisateur a aussi bougé horizontalement (>30px) — on évite les
 *   conflits avec un swipe-left/right intentionnel.
 * - Ne déclenche pas si le doigt est resté < 50ms (geste trop court = tap accidentel).
 */
export function useSwipeDown(
  callback: () => void,
  options: { threshold?: number; cancelHorizontal?: number; minDurationMs?: number } = {},
) {
  const threshold = options.threshold ?? 80;
  const cancelHorizontal = options.cancelHorizontal ?? 30;
  const minDurationMs = options.minDurationMs ?? 50;

  const startY = useRef<number | null>(null);
  const startX = useRef<number | null>(null);
  const startTime = useRef<number>(0);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    if (!t) return;
    startY.current = t.clientY;
    startX.current = t.clientX;
    startTime.current = Date.now();
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (startY.current === null || startX.current === null) return;
    const t = e.changedTouches[0];
    if (!t) {
      startY.current = null;
      startX.current = null;
      return;
    }
    const dy = t.clientY - startY.current;
    const dx = Math.abs(t.clientX - startX.current);
    const dt = Date.now() - startTime.current;
    const isVerticalDown = dy >= threshold && dx <= cancelHorizontal;
    const isLongEnough = dt >= minDurationMs;
    if (isVerticalDown && isLongEnough) {
      callback();
    }
    startY.current = null;
    startX.current = null;
  }

  function onTouchCancel() {
    startY.current = null;
    startX.current = null;
  }

  return { onTouchStart, onTouchEnd, onTouchCancel };
}
