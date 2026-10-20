import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { donationIsDue, hasMobilePayBox, mobilePayBoxLabel } from './donation'

const DAY = 86_400_000
const NOW = Date.parse('2026-10-18T12:00:00Z')

describe('donationIsDue', () => {
  it('venter 14 dage fra oprettelsen', () => {
    const created = new Date(NOW - 13 * DAY).toISOString()
    assert.equal(donationIsDue(created, NOW), false)
  })

  it('viser popuppen på dag 14', () => {
    const created = new Date(NOW - 14 * DAY).toISOString()
    assert.equal(donationIsDue(created, NOW), true)
  })

  it('viser ikke popuppen uden en gyldig dato', () => {
    assert.equal(donationIsDue(null, NOW), false)
    assert.equal(donationIsDue('ikke-en-dato', NOW), false)
  })
})

describe('mobilePayBox', () => {
  it('viser ingen boks, før nummeret er sat', () => {
    assert.equal(mobilePayBoxLabel(), '')
    assert.equal(hasMobilePayBox(), false)
  })

  it('formaterer en sat boks', () => {
    assert.equal(mobilePayBoxLabel(' 2934gb '), '2934GB')
    assert.equal(hasMobilePayBox('2934gb'), true)
  })
})
