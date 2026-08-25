/** 마지막 호출만 delay 후 실행. flush()로 즉시 실행, cancel()로 취소. */
export function createDebounced<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delayMs: number,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latestArgs: TArgs | null = null;

  const run = (...args: TArgs) => {
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

  run.flush = () => {
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

  run.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    latestArgs = null;
  };

  return run;
}
