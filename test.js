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
test('invalid params', async () => {
  assert.throws(() => createCache({}), new Error('maxSize needs to be a number greater or equal 0'))
  assert.throws(() => createCache({ maxSize: -1 }), new Error('maxSize needs to be a number greater or equal 0'))
  assert.throws(() => createCache({ maxSize: 1, maxAgeMs: 0 }), new Error('maxAgeMs needs to be a number greater 0'))
  assert.throws(() => createCache({ maxSize: 1, maxAgeMs: 'hi' }), new Error('maxAgeMs needs to be a number greater 0'))
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
  let count = 0
  const cache = createCache({
    async resolver (key) {
      count += 1
      return `${key}:${count}`
    },
    maxSize: 2,
    maxAgeMs: 10
  })
  assert.equal(await cache.get('a'), 'a:1')
  assert.equal(await cache.get('a'), 'a:1')
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.equal(await cache.get('a'), 'a:2')
})
test('expiration date of errors', async () => {
  let count = 0
  const cache = createCache({
    async resolver (key) {
      count += 1
      throw new Error(`${key}:${count}`)
    },
    maxSize: 2,
    maxAgeMs: 10
  })
  assert.rejects(cache.get('a'), new Error('a:1'))
  assert.rejects(cache.get('a'), new Error('a:1'))
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.rejects(cache.get('a'), new Error('a:2'))
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
test('even with max-size 0 it will return the previous request', async () => {
  let count = 0
  const cache = createCache({
    async resolver (key) {
      count += 1
      const res = `${key}:${count}`
      await new Promise(resolve => setTimeout(resolve, 10))
      return res
    },
    maxSize: 0
  })
  cache.get('a')
  assert.deepEqual(await Promise.all([
    cache.get('b'),
    cache.get('a')
  ]), ['b:2', 'a:1'])
})
test('even with max-size 1 it will return the previous request', async () => {
  let count = 0
  const cache = createCache({
    async resolver (key) {
      count += 1
      const res = `${key}:${count}`
      await new Promise(resolve => setTimeout(resolve, 10))
      return res
    },
    maxSize: 1
  })
  cache.get('a')
  assert.deepEqual(await Promise.all([
    cache.get('b'),
    cache.get('a')
  ]), ['b:2', 'a:1'])
})
test('removed before expire', async () => {
  let count = 0
  const cache = createCache({
    async resolver (key) {
      count += 1
      return `${key}:${count}`
    },
    maxSize: 2,
    maxAgeMs: 10
  })
  assert.equal(await cache.get('a'), 'a:1')
  cache.remove('a')
  assert.equal(await cache.get('a'), 'a:2')
})
test('removed extra before expire', async () => {
  let count = 0
  const cache = createCache({
    async resolver (key) {
      count += 1
      return `${key}:${count}`
    },
    maxSize: 1
  })
  assert.equal(await cache.get('a'), 'a:1')
  assert.equal(await cache.get('b'), 'b:2')
  cache.remove('b') // line coverage!
  assert.equal(await cache.get('b'), 'b:3')
})
test('active requests get cleared as well', async () => {
  let count = 0
  const cache = createCache({
    async resolver (key) {
      count += 1
      const res = `${key}:${count}`
      await setTimeout(resolve => setTimeout(resolve, 10))
      return res
    },
    maxSize: 0
  })
  cache.get('a')
  cache.remove('a')
  assert.equal(await cache.get('a'), 'a:2')
})
