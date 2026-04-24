import { useMemo, useRef, useEffect } from 'react'
import { debounce } from 'lodash-es'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function useDebounceFn<T extends (...args: any[]) => any>(fn: T, ms = 500) {
  const fnRef = useRef(fn)

  // Cập nhật ref mỗi khi hàm fn thay đổi
  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  const debounced = useMemo(() => {
    return debounce((...args: Parameters<T>) => {
      return fnRef.current(...args)
    }, ms)
  }, [ms])

  return debounced
}
