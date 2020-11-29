const CACHE = 'network-or-cache'
const TIMEOUT = 1000

self.addEventListener('fetch', (evt) => {
  evt.respondWith(
    fromNetwork(evt.request, TIMEOUT).catch(() => {
      return fromCache(evt.request)
    })
  )
})

function fromNetwork(request, timeout) {
  return new Promise((fulfill, reject) => {
    const timeoutId = setTimeout(reject, timeout)
    fetch(request).then((response) => {
      clearTimeout(timeoutId)

      if (!response || response.status !== 200 || request.method !== 'GET') {
        return fulfill(response)
      }

      // IMPORTANT: Clone the response. A response is a stream
      // and because we want the browser to consume the response
      // as well as the cache consuming the response, we need
      // to clone it so we have two streams.
      const responseToCache = response.clone()

      caches.open(CACHE).then((cache) => {
        cache.put(request, responseToCache)
      })

      return fulfill(response)
    }, reject)
  })
}

function fromCache(request) {
  return caches.open(CACHE).then((cache) => {
    return cache.match(request).then((matching) => {
      return matching || Promise.reject('no-match')
    })
  })
}
