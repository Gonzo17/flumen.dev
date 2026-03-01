import { describe, expect, it } from 'vitest'
import { isBotAuthor } from '~/utils/author'

describe('isBotAuthor', () => {
  it('detects bot authors', () => {
    expect(isBotAuthor('dependabot[bot]')).toBe(true)
    expect(isBotAuthor('coderabbitai[bot]')).toBe(true)
    expect(isBotAuthor('github-actions[bot]')).toBe(true)
    expect(isBotAuthor('renovate[BOT]')).toBe(true)
  })

  it('rejects non-bot authors', () => {
    expect(isBotAuthor('Flo0806')).toBe(false)
    expect(isBotAuthor('some-user')).toBe(false)
    expect(isBotAuthor('bot')).toBe(false)
    expect(isBotAuthor('my[bot]name')).toBe(false)
  })
})
