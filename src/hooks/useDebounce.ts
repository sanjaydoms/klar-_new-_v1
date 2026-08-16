import { useState, useEffect } from 'react';

/**
 * useDebounce - Delays the execution of a value change until after the specified delay
 * Useful for search inputs to avoid too many API calls
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useThrottle - Returns a throttled version of the provided callback
 * Ensures function is only called at most once in the specified time period
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500,
): T {
  const [ready, setReady] = useState(true);

  const throttledFn = ((...args: any[]) => {
    if (!ready) return;

    setReady(false);
    callback(...args);

    setTimeout(() => {
      setReady(true);
    }, delay);
  }) as T;

  return throttledFn;
}
