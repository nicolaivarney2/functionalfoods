import assert from 'node:assert/strict'
import test from 'node:test'
import { comparePublishingRecipes, publishedSortKey } from './admin-publishing-sort'

test('ny udgivelse med publishedAt ligger over ældre opskrift', () => {
  const older = { publishedAt: '2024-01-01T08:00:00.000Z', updatedAt: '2026-10-22T10:00:00.000Z' }
  const newer = { publishedAt: '2026-10-22T09:00:00.000Z', updatedAt: '2026-10-22T09:00:00.000Z' }
  assert.ok(comparePublishingRecipes('publishedAt', newer, older) < 0)
})

test('sidevisning der rykker updatedAt flytter ikke senest udgivet', () => {
  const viewed = { publishedAt: '2026-10-20T09:00:00.000Z', updatedAt: '2026-10-22T12:00:00.000Z' }
  const justPublished = { publishedAt: '2026-10-22T09:00:00.000Z', updatedAt: '2026-10-22T09:00:00.000Z' }
  assert.ok(comparePublishingRecipes('publishedAt', justPublished, viewed) < 0)
  assert.ok(comparePublishingRecipes('updatedAt', viewed, justPublished) < 0)
})

test('AI-opskrift uden publishedAt bruger planlagt dato', () => {
  const stamped = publishedSortKey({
    publishedAt: null,
    scheduledDate: '2026-10-22',
    scheduledTime: '09:00',
  })
  const older = publishedSortKey({ publishedAt: '2024-06-01T12:00:00.000Z' })
  assert.ok(stamped > older)
})
