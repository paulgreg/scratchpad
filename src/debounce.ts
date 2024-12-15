export const debounce = (fn: () => void, ms: number) => {
  let timer: ReturnType<typeof setTimeout>

  const debouncedFunc = () => {
    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      fn()
    }, ms)
  }

  const teardown = () => clearTimeout(timer)

  return [debouncedFunc, teardown]
}
