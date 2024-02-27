Simple, fast, no-dependency cache for async calls.

```js
import { createCache } from '@leichtgewicht/async-cache'
const cache = createCache({
  resolver: async (key) => {
    // load data or do something else to get the value for the key
    return value
  },
  maxSize: 1000, // max amount of keys cached at the same time
  maxAgeMs: 1000 // (optional) maxAge for a result before refetching
})

const result = await cache.get('key') // load the key, if present in cache and not expired, will return previous value
result // result as provided by the async resolver
```

Note: Based on, but not depending on, [HashLRU](https://github.com/dominictarr/hashlru/)
