/**
 * Maps over items with a bounded number of in-flight promises, preserving the
 * input order in the results. Used to parallelize network-bound batches (LLM
 * calls, embedding batches, vector upserts) without hammering rate limits.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return []
  }

  const limit = Math.max(1, Math.min(concurrency, items.length))
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    for (;;) {
      const index = nextIndex
      nextIndex += 1
      if (index >= items.length) {
        return
      }
      results[index] = await mapper(items[index], index)
    }
  }

  const workers: Promise<void>[] = []
  for (let index = 0; index < limit; index += 1) {
    workers.push(worker())
  }
  await Promise.all(workers)

  return results
}
