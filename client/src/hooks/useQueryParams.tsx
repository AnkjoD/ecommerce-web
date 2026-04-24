import React from 'react';
import { useSearchParams } from 'react-router';

/**
 * Custom hook to manage URL search parameters with memoization.
 * Using React. prefix to prevent ReferenceErrors in some environments.
 */
export default function useQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  /**
   * Updates multiple search parameters at once.
   * If a value is null, undefined, or empty string, the parameter is removed.
   */
  const updateParams = React.useCallback((newParams: object) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          nextParams.delete(key);
        } else {
          nextParams.set(key, value);
        }
      });
      return nextParams;
    });
  }, [setSearchParams]);

  /**
   * Memoized object representing the current search parameters.
   */
  const queryParams = React.useMemo(() => {
    return Object.fromEntries(searchParams);
  }, [searchParams]);

  return { queryParams, updateParams };
}