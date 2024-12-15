let lastTimeout: number | undefined

export const debounce = (fn: () => void, delay: number) => () => {
  clearTimeout(lastTimeout)
  lastTimeout = setTimeout(fn, delay)
}
