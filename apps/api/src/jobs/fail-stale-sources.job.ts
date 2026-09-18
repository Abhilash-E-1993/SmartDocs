import { logger } from '../config/logger'
import { sourceService } from '../modules/sources/service'
import { inngest } from './client'

/**
 * Watchdog that recovers sources whose processing run died (Inngest restart,
 * queue outage, deploy mid-run). Without it, a source interrupted at (say) 10%
 * would sit in PROCESSING forever with no way to recover. Runs on a cron and
 * marks long-inactive in-flight sources as FAILED so the user can retry them.
 */
export const failStaleSourcesJob = inngest.createFunction(
  {
    id: 'fail-stale-sources',
    // Only one watchdog sweep at a time.
    concurrency: { limit: 1 },
    triggers: [{ cron: '*/5 * * * *' }],
  },
  async () => {
    const count = await sourceService.failStaleSources()
    if (count > 0) {
      logger.warn({ count }, 'Marked stale in-flight sources as failed (watchdog)')
    }
    return { failed: count }
  },
)
