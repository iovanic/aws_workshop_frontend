"use client";

import { useCallback, useState } from "react";

/**
 * Image carousel: prev/next, optional dot navigation.
 */
export function useImageCarousel(imageCount: number) {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    if (imageCount === 0) return;
    setIndex((i) => (i + 1) % imageCount);
  }, [imageCount]);

  const prev = useCallback(() => {
    if (imageCount === 0) return;
    setIndex((i) => (i - 1 + imageCount) % imageCount);
  }, [imageCount]);

  const goTo = useCallback(
    (i: number) => {
      if (imageCount === 0) return;
      setIndex(((i % imageCount) + imageCount) % imageCount);
    },
    [imageCount]
  );

  return { index, next, prev, goTo } as const;
}
