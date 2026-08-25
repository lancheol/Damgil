import { useEffect, useRef, useState } from 'react';

export type LiveDecorTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

/** 드래그 중에는 로컬 state만 갱신하고, 부모 commit은 release에서. */
export function useLiveDecorTransform(source: LiveDecorTransform) {
  const draggingRef = useRef(false);
  const liveRef = useRef<LiveDecorTransform>(source);
  const [live, setLive] = useState<LiveDecorTransform>(source);

  useEffect(() => {
    if (draggingRef.current) {
      return;
    }
    liveRef.current = source;
    setLive(source);
  }, [source.x, source.y, source.scale, source.rotation]);

  const beginDrag = () => {
    draggingRef.current = true;
  };

  const patchLive = (patch: Partial<LiveDecorTransform>) => {
    const next = { ...liveRef.current, ...patch };
    liveRef.current = next;
    setLive(next);
    return next;
  };

  const endDrag = () => {
    draggingRef.current = false;
    return liveRef.current;
  };

  return { live, liveRef, beginDrag, patchLive, endDrag, draggingRef };
}
