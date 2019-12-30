var FastTilesWorker = (function() {
  /* eslint no-restricted-globals: "off" */

  console.log('from compiled worker')

  self.addEventListener('fetch', (e) => {
    console.log('🐝', e.request.url)
  })

  var index = {}

  return index
})()
//# sourceMappingURL=fast-tiles-worker.js.map
