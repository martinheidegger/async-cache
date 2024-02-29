export interface CacheOptions <Key extends string, Value> {
  resolver: (key: Key) => Promise<Value>
  maxSize?: number,
  maxAgeMs?: number
}
export type Cache <Key extends string, Value> = Readonly<{
  get (key: string): Promise<T>
  remove (key: string): void
  clear (): void
}>

export function createCache <Key extends string, Value> (opts: CacheOptions<Key, Value>): Cache<Key, Value>
