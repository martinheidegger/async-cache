const noop = () => {}

//
// Note: This is based on hashlru
//       https://github.com/dominictarr/hashlru/blob/master/index.js
export function createCache ({ resolver, maxSize, maxAgeMs }) {
  maxSize = Number(maxSize)
  if (!(maxSize >= 0)) throw new Error('maxSize needs to be a number greater or equal 0')
  if (maxAgeMs === null || maxAgeMs === undefined) {
    maxAgeMs = undefined
  } else if (!(maxAgeMs > 0)) {
    throw new Error('maxAgeMs needs to be a number greater 0')
  }

  let size = 0
  const active = Object.create(null)
  let cache = Object.create(null)
  let _cache = Object.create(null)

  const update = maxSize === 0
    ? noop
    : (key, value) => {
        cache[key] = value
        size++
        if (size >= maxSize) {
          size = 0
          _cache = cache
          cache = Object.create(null)
        }
      }

  function get (key) {
    let v = cache[key]
    if (v !== undefined) return v
    if ((v = _cache[key]) !== undefined) {
      update(key, v)
      return v
    }
    if ((v = active[key]) !== undefined) {
      return v
    }
    v = resolver(key).then(
      value => ({
        value,
        error: undefined,
        expires: maxAgeMs !== undefined ? Date.now() + maxAgeMs : undefined
      }),
      error => ({
        value: undefined,
        error,
        expires: maxAgeMs !== undefined ? Date.now() + maxAgeMs : undefined
      })
    ).finally(() => {
      active[key] = undefined
    })
    active[key] = v
    update(key, v)
    return v
  }
  function remove (key) {
    if (cache[key] !== undefined) { cache[key] = undefined }
    if (_cache[key] !== undefined) { _cache[key] = undefined }
    if (active[key] !== undefined) { active[key] = undefined }
  }
  return Object.freeze({
    remove,
    async get (key) {
      let res = await get(key)
      const { expires } = res
      if (expires !== undefined && expires < Date.now()) {
        remove(key)
        res = await get(key)
      }
      const { error, value } = res
      if (error !== undefined) {
        throw error
      }
      return value
    },
    clear () {
      cache = Object.create(null)
      _cache = Object.create(null)
    }
  })
}
