import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatSpanRange,
  groupSpanByCalendarWeek,
  mondayBasedWeekdayIndex,
  mondayIsoOf,
  parseAnchoredShopDate,
  parsePlanDate,
} from './week-dates'

describe('groupSpanByCalendarWeek', () => {
  it('puts Saturday + 7 days on Sat–Sun and the next Mon–Fri', () => {
    const saturday = new Date(2026, 9, 3, 12)
    const groups = groupSpanByCalendarWeek(saturday, 7)
    assert.equal(groups.length, 2)
    assert.equal(groups[0].weekStartDate, '2026-09-28')
    assert.deepEqual(
      groups[0].days.map((day) => day.weekday),
      ['saturday', 'sunday']
    )
    assert.equal(groups[1].weekStartDate, '2026-10-05')
    assert.deepEqual(
      groups[1].days.map((day) => day.weekday),
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    )
    assert.deepEqual(
      groups[1].days.map((day) => day.offset),
      [2, 3, 4, 5, 6]
    )
  })

  it('puts a Sunday shop of 5 days on Sunday and next Monday–Thursday', () => {
    const sunday = new Date(2026, 9, 4, 12)
    const groups = groupSpanByCalendarWeek(sunday, 5)
    assert.equal(groups.length, 2)
    assert.deepEqual(
      groups[0].days.map((day) => day.date),
      ['2026-10-04']
    )
    assert.equal(groups[0].days[0].weekday, 'sunday')
    assert.equal(groups[1].weekStartDate, '2026-10-05')
    assert.deepEqual(
      groups[1].days.map((day) => day.weekday),
      ['monday', 'tuesday', 'wednesday', 'thursday']
    )
  })
})

describe('dates stay on the local calendar', () => {
  it('parses yyyy-mm-dd as local noon, not the previous day', () => {
    const date = parsePlanDate('2026-10-03')
    assert.equal(date.getFullYear(), 2026)
    assert.equal(date.getMonth(), 9)
    assert.equal(date.getDate(), 3)
    assert.equal(mondayBasedWeekdayIndex(date), 5)
    assert.equal(mondayIsoOf('2026-10-03'), '2026-09-28')
  })

  it('rejects a shop date more than 21 days out', () => {
    const now = new Date(2026, 9, 3, 12)
    assert.equal(parseAnchoredShopDate('2026-10-03', now)?.getDate(), 3)
    assert.equal(parseAnchoredShopDate('2026-10-02', now)?.getDate(), 2)
    assert.equal(parseAnchoredShopDate('2026-10-25', now), null)
  })
})

describe('formatSpanRange', () => {
  it('names the first and last eating day', () => {
    const saturday = new Date(2026, 9, 3, 12)
    assert.equal(formatSpanRange(saturday, 7), 'lør 3. – fre 9. okt')
  })
})
