/* eslint no-restricted-globals: "off" */

console.log('from compiled worker')

self.addEventListener('fetch', (e) => {
  console.log('🐝', e.request.url)
})

export default {}
