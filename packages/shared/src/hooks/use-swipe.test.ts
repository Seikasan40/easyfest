import { describe, it, expect } from "vitest";

/**
 * Tests purs sur la logique : on ne charge pas le hook React (besoin d'un DOM),
 * on teste la condition de déclenchement de manière isolée.
 */
function checkSwipeDown(args: {
  startY: number;
  endY: number;
  startX: number;
  endX: number;
  startTime: number;
  endTime: number;
  threshold: number;
  cancelHorizontal: number;
  minDurationMs: number;
}): boolean {
  const dy = args.endY - args.startY;
  const dx = Math.abs(args.endX - args.startX);
  const dt = args.endTime - args.startTime;
  const isVerticalDown = dy >= args.threshold && dx <= args.cancelHorizontal;
  const isLongEnough = dt >= args.minDurationMs;
  return isVerticalDown && isLongEnough;
}

describe("useSwipeDown — logique de déclenchement", () => {
  const base = { threshold: 80, cancelHorizontal: 30, minDurationMs: 50 };

  it("déclenche si swipe vertical 100px en 200ms", () => {
    expect(
      checkSwipeDown({
        startY: 100,
        endY: 200,
        startX: 50,
        endX: 50,
        startTime: 0,
        endTime: 200,
        ...base,
      }),
    ).toBe(true);
  });

  it("ne déclenche pas si swipe < threshold (50px < 80)", () => {
    expect(
      checkSwipeDown({
        startY: 100,
        endY: 150,
        startX: 50,
        endX: 50,
        startTime: 0,
        endTime: 200,
        ...base,
      }),
    ).toBe(false);
  });

  it("ne déclenche pas si swipe horizontal > cancelHorizontal", () => {
    expect(
      checkSwipeDown({
        startY: 100,
        endY: 200,
        startX: 50,
        endX: 100,
        startTime: 0,
        endTime: 200,
        ...base,
      }),
    ).toBe(false);
  });

  it("ne déclenche pas si swipe up (dy négatif)", () => {
    expect(
      checkSwipeDown({
        startY: 200,
        endY: 100,
        startX: 50,
        endX: 50,
        startTime: 0,
        endTime: 200,
        ...base,
      }),
    ).toBe(false);
  });

  it("ne déclenche pas si geste trop rapide (< 50ms)", () => {
    expect(
      checkSwipeDown({
        startY: 100,
        endY: 200,
        startX: 50,
        endX: 50,
        startTime: 0,
        endTime: 30,
        ...base,
      }),
    ).toBe(false);
  });

  it("threshold custom (100px) : 90px ne déclenche pas, 110px oui", () => {
    expect(
      checkSwipeDown({
        startY: 100,
        endY: 190,
        startX: 50,
        endX: 50,
        startTime: 0,
        endTime: 200,
        ...base,
        threshold: 100,
      }),
    ).toBe(false);
    expect(
      checkSwipeDown({
        startY: 100,
        endY: 210,
        startX: 50,
        endX: 50,
        startTime: 0,
        endTime: 200,
        ...base,
        threshold: 100,
      }),
    ).toBe(true);
  });
});
