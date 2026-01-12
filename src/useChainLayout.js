import { useLayoutEffect, useRef, useState } from 'react';

const DOMINO_PIXEL_WIDTH = 96;

const getMaxPerRow = (width) => Math.max(2, Math.floor(width / DOMINO_PIXEL_WIDTH));

export const useChainLayout = () => {
  const containerRef = useRef(null);
  const [maxPerRow, setMaxPerRow] = useState(4);

  useLayoutEffect(() => {
    if (!containerRef.current) return undefined;

    const update = () => {
      const width = containerRef.current?.offsetWidth || 400;
      setMaxPerRow(getMaxPerRow(width));
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  return { containerRef, maxPerRow };
};
