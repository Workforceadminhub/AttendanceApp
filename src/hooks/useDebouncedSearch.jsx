import { debounce } from "lodash";
import { useEffect, useMemo, useState } from "react";

export const useDebouncedSearch = () => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useMemo(
    () => debounce((query) => setSearch(query), 500),
    []
  );

  useEffect(
    () => () => {
      debouncedSearch.cancel();
    },
    [debouncedSearch]
  );

  return { debouncedSearch, search };
};
