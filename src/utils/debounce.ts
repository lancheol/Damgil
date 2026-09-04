/** 마지막 호출만 delay 후 실행. flush로 즉시 실행, cancel로 취소. */
export type DebouncedController<TArgs extends unknown[]> = {
  schedule: (...args: TArgs) => void;
  flush: () => void;
  cancel: () => void;
};

export function createDebounced<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delayMs: number,
): DebouncedController<TArgs> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latestArgs: TArgs | null = null;

  const schedule = (...args: TArgs) => {
    latestArgs = args;
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      const pending = latestArgs;
      latestArgs = null;
      if (pending) {
        fn(...pending);
      }
    }, delayMs);
  };

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (latestArgs) {
      const pending = latestArgs;
      latestArgs = null;
      fn(...pending);
    }
  };

  const cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    latestArgs = null;
  };

  return { schedule, flush, cancel };
}
