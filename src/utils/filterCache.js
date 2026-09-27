// Worker filter options used to be built by downloading the whole worker
// directory at login and caching it here. That is gone; this only clears
// entries left in localStorage by older builds.

const FILTER_CACHE_KEY = 'workers_filter_cache';
const CACHE_TIMESTAMP_KEY = 'filter_cache_timestamp';

/**
 * Clear filter cache
 */
export const clearFilterCache = () => {
  try {
    localStorage.removeItem(FILTER_CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  } catch (error) {
    // Silent error handling
  }
};
