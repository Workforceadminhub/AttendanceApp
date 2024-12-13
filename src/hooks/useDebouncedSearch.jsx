import { debounce } from 'lodash'
import { useCallback, useState } from 'react'

export const useDebouncedSearch = () => {
  const [search, setSearch] = useState('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((query) => setSearch(query), 500),
    []
  )

  return { debouncedSearch, search }
}
