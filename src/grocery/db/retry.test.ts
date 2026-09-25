import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  groceryDbErrorMessage,
  isRetryableGroceryDbError,
  isTransientGatewayError,
  sanitizeGatewayErrorMessage,
} from './retry'

const CF_520_HTML = `<!DOCTYPE html>
<title>supabase.co | 520: Web server is returning an unknown error</title>
<h1>Error code 520</h1>
<span>kuwqzodesppknbjtrsgs.supabase.co</span>`

describe('groceryDbErrorMessage', () => {
  it('læser message fra PostgREST-objekt (ikke [object Object])', () => {
    assert.equal(
      groceryDbErrorMessage({ message: 'column products.foo does not exist', code: '42703' }),
      'column products.foo does not exist',
    )
  })

  it('JSON-stringifier objekter uden message', () => {
    assert.equal(groceryDbErrorMessage({ code: 'PGRST002', details: 'down' }), '{"code":"PGRST002","details":"down"}')
  })

  it('kortlægger Cloudflare 520 HTML', () => {
    assert.equal(
      groceryDbErrorMessage(new Error(CF_520_HTML)),
      'Cloudflare 520 from kuwqzodesppknbjtrsgs.supabase.co',
    )
  })
})

describe('sanitizeGatewayErrorMessage', () => {
  it('lader almindelige DB-fejl være', () => {
    assert.equal(sanitizeGatewayErrorMessage('statement timeout'), 'statement timeout')
  })
})

describe('isRetryableGroceryDbError', () => {
  it('retrier Cloudflare 520', () => {
    assert.equal(isTransientGatewayError(new Error(CF_520_HTML)), true)
    assert.equal(isRetryableGroceryDbError(new Error(CF_520_HTML)), true)
  })

  it('retrier ikke almindelige schema-fejl', () => {
    assert.equal(
      isRetryableGroceryDbError({ message: 'column products.foo does not exist' }),
      false,
    )
  })
})
