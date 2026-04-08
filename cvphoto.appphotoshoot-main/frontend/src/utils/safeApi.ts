export const safeApi = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout>;
  let resolved = false;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        if (!resolved) {
          reject(new Error("timeout"));
        }
      }, 15000);
    });
    const result = await Promise.race([
      fn().then((res) => {
        resolved = true;
        return res;
      }),
      timeout
    ]);
    if (resolved) {
      clearTimeout(timeoutId!);
    }
    return result;
  } catch (e) {
    console.error("safeApi error", e);
    return fallback;
  }
};
