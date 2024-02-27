import { createCache } from './index.js'
import test from 'node:test'
import assert from 'assert'

test('simple resolve', async () => {
  const cache = createCache({
    resolver: async (key) => `hello ${key}`,
    maxSize: 1
  })
  assert.equal(await cache.get('world'), 'hello world')
})
test('parallel resolve', async () => {
  let count = 0
  const cache = createCache({
    async resolver (key) {
      count += 1
      await new Promise((resolve) => setTimeout(resolve, 10))
      return `hello ${key}`
    },
    maxSize: 1
  })
  assert.deepEqual(await Promise.all([
    cache.get('world'),
    cache.get('world')
  ]), ['hello world', 'hello world'])
  assert.equal(count, 1)
})
test('error passthrough', async () => {
  const cache = createCache({
    async resolver (key) {
      throw new Error(`Error: ${key}`)
    },
    maxSize: 1
  })

  await assert.rejects(cache.get('world'), new Error('Error: world'))
})
test('maxSize of results', async () => {
  const calls = []
  const cache = createCache({
    async resolver (key) {
      calls.push(key)
      return `hello ${key}`
    },
    maxSize: 1
  })
  assert.equal(await cache.get('a'), 'hello a')
  assert.equal(await cache.get('a'), 'hello a')
  assert.equal(await cache.get('b'), 'hello b')
  assert.equal(await cache.get('b'), 'hello b')
  assert.equal(await cache.get('a'), 'hello a')
  assert.deepEqual(calls, ['a', 'b', 'a'])
})
test('expiration date', async () => {
  const counter = {}
  const cache = createCache({
    async resolver (key) {
      let count = counter[key]
      count = count === undefined ? 1 : count + 1
      counter[key] = count
      return `hello ${key} ${count}`
    },
    maxSize: 1,
    maxAgeMs: 10
  })
  assert.equal(await cache.get('a'), 'hello a 1')
  assert.equal(await cache.get('a'), 'hello a 1')
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.equal(await cache.get('a'), 'hello a 2')
})
test('clear', async () => {
  let count = 0
  const cache = createCache({
    async resolver (key) {
      count += 1
      return `hello ${key}`
    },
    maxSize: 1
  })
  assert.deepEqual(await cache.get('world'), 'hello world')
  cache.clear()
  assert.deepEqual(await cache.get('world'), 'hello world')
  assert.equal(count, 2)
})
