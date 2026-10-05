import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  classifyScrapeLog,
  formatLaunchHealthReport,
  lastDailyScrapeSlot,
  launchHealthEmailSubject,
  type LaunchHealthReport,
} from './dagligvarer-launch-health'

describe('lastDailyScrapeSlot', () => {
  it('bruger dagens 02:00 UTC når klokken er passeret', () => {
    const slot = lastDailyScrapeSlot(new Date('2026-10-05T15:40:00.000Z'))
    assert.equal(slot.toISOString(), '2026-10-05T02:00:00.000Z')
  })

  it('bruger gårsdagens slot før 02:00 UTC', () => {
    const slot = lastDailyScrapeSlot(new Date('2026-10-05T01:30:00.000Z'))
    assert.equal(slot.toISOString(), '2026-10-04T02:00:00.000Z')
  })
})

describe('classifyScrapeLog', () => {
  it('fejler når scrapen ikke kørte', () => {
    assert.deepEqual(classifyScrapeLog(null), {
      level: 'fail',
      scrapeStatus: 'missing',
      reason: 'Scrape kørte ikke',
    })
  })

  it('fejler på failed, også når ældre tilbud stadig findes', () => {
    const result = classifyScrapeLog({
      status: 'failed',
      error_message: 'SPAR 503 https://ugensavis.spar.dk/',
    })
    assert.equal(result.level, 'fail')
    assert.equal(result.scrapeStatus, 'failed')
    assert.match(result.reason, /SPAR 503/)
  })

  it('advarer på partial', () => {
    const result = classifyScrapeLog({
      status: 'partial',
      error_message: 'vare 5055314: Nemlig 500',
    })
    assert.equal(result.level, 'warn')
    assert.match(result.reason, /Delvis: vare 5055314/)
  })

  it('er ok når scrapen kørte', () => {
    assert.equal(classifyScrapeLog({ status: 'success' }).level, 'ok')
    assert.equal(
      classifyScrapeLog({ status: 'success', metadata: { skippedUnchanged: true } }).reason,
      'Kørte — avisen var uændret',
    )
  })
})

describe('launchHealthEmailSubject', () => {
  const base = {
    generatedAt: '2026-10-05T15:40:00.000Z',
    windowStart: '2026-10-05T02:00:00.000Z',
    chains: [],
  }

  it('siger hvor mange scrapes der fejlede', () => {
    const report: LaunchHealthReport = { ...base, ok: false, failCount: 2, warnCount: 1 }
    assert.equal(launchHealthEmailSubject(report), '[FF dagligvarer] 2 scrapes fejlede')
    assert.match(formatLaunchHealthReport(report), /FAIL — 2 scrapes fejlede/)
  })

  it('siger ok når alle kørte', () => {
    const report: LaunchHealthReport = { ...base, ok: true, failCount: 0, warnCount: 0 }
    assert.equal(launchHealthEmailSubject(report), '[FF dagligvarer] Alle scrapes kørte')
  })
})
