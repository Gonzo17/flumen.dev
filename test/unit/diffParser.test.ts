import { describe, expect, it } from 'vitest'
import { parseDiffHunk } from '~/utils/diffParser'

describe('parseDiffHunk', () => {
  it('parses a simple hunk with add and remove', () => {
    const hunk = `@@ -10,3 +10,3 @@
 context line
-old line
+new line`

    const lines = parseDiffHunk(hunk)

    expect(lines).toHaveLength(4)
    expect(lines[0]).toEqual({ type: 'header', content: '@@ -10,3 +10,3 @@' })
    expect(lines[1]).toEqual({ type: 'context', content: 'context line', oldLineNumber: 10, newLineNumber: 10 })
    expect(lines[2]).toEqual({ type: 'remove', content: 'old line', oldLineNumber: 11 })
    expect(lines[3]).toEqual({ type: 'add', content: 'new line', newLineNumber: 11 })
  })

  it('tracks line numbers correctly across multiple changes', () => {
    const hunk = `@@ -5,4 +5,5 @@
 a
-b
+c
+d
 e`

    const lines = parseDiffHunk(hunk)

    expect(lines[1]).toEqual({ type: 'context', content: 'a', oldLineNumber: 5, newLineNumber: 5 })
    expect(lines[2]).toEqual({ type: 'remove', content: 'b', oldLineNumber: 6 })
    expect(lines[3]).toEqual({ type: 'add', content: 'c', newLineNumber: 6 })
    expect(lines[4]).toEqual({ type: 'add', content: 'd', newLineNumber: 7 })
    expect(lines[5]).toEqual({ type: 'context', content: 'e', oldLineNumber: 7, newLineNumber: 8 })
  })

  it('handles hunk header with different old and new start lines', () => {
    const hunk = `@@ -20,2 +30,2 @@
 same
-removed`

    const lines = parseDiffHunk(hunk)

    expect(lines[1]!.oldLineNumber).toBe(20)
    expect(lines[1]!.newLineNumber).toBe(30)
    expect(lines[2]!.oldLineNumber).toBe(21)
  })

  it('handles empty hunk', () => {
    expect(parseDiffHunk('')).toEqual([])
  })

  it('handles meta lines without advancing line numbers', () => {
    const hunk = `@@ -1,2 +1,2 @@
-old
+new
\\ No newline at end of file`

    const lines = parseDiffHunk(hunk)

    expect(lines).toHaveLength(4)
    expect(lines[3]).toEqual({ type: 'meta', content: '\\ No newline at end of file' })
  })

  it('does not advance line numbers for meta lines', () => {
    const hunk = `@@ -1,2 +1,3 @@
 keep
-old
\\ No newline at end of file
+new
+added`

    const lines = parseDiffHunk(hunk)
    const contextLine = lines.find(l => l.type === 'context')!
    const addedLines = lines.filter(l => l.type === 'add')

    expect(contextLine.oldLineNumber).toBe(1)
    expect(contextLine.newLineNumber).toBe(1)
    expect(addedLines[0]!.newLineNumber).toBe(2)
    expect(addedLines[1]!.newLineNumber).toBe(3)
  })

  it('handles hunk with only additions', () => {
    const hunk = `@@ -1,0 +1,2 @@
+first
+second`

    const lines = parseDiffHunk(hunk)

    expect(lines).toHaveLength(3)
    expect(lines[1]).toEqual({ type: 'add', content: 'first', newLineNumber: 1 })
    expect(lines[2]).toEqual({ type: 'add', content: 'second', newLineNumber: 2 })
  })

  it('handles hunk with function context in header', () => {
    const hunk = `@@ -100,3 +100,3 @@ function doStuff() {
 const x = 1
-const y = 2
+const y = 3`

    const lines = parseDiffHunk(hunk)

    expect(lines[0]!.type).toBe('header')
    expect(lines[0]!.content).toContain('function doStuff')
    expect(lines[1]!.oldLineNumber).toBe(100)
  })
})
