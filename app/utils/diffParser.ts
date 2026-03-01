export interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header' | 'meta'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export function parseDiffHunk(hunk: string): DiffLine[] {
  const rawLines = hunk.split('\n')
  const lines: DiffLine[] = []

  let oldLine = 0
  let newLine = 0

  for (const raw of rawLines) {
    if (raw.startsWith('@@')) {
      const match = raw.match(/@@ -(\d+)(?:,\d+)?\s+\+(\d+)/)
      if (match) {
        oldLine = Number.parseInt(match[1]!, 10)
        newLine = Number.parseInt(match[2]!, 10)
      }
      lines.push({ type: 'header', content: raw })
      continue
    }

    if (raw.startsWith('+')) {
      lines.push({ type: 'add', content: raw.slice(1), newLineNumber: newLine })
      newLine++
    }
    else if (raw.startsWith('-')) {
      lines.push({ type: 'remove', content: raw.slice(1), oldLineNumber: oldLine })
      oldLine++
    }
    else if (raw.startsWith('\\') || raw === '') {
      if (raw) {
        lines.push({ type: 'meta', content: raw })
      }
    }
    else {
      lines.push({ type: 'context', content: raw.startsWith(' ') ? raw.slice(1) : raw, oldLineNumber: oldLine, newLineNumber: newLine })
      oldLine++
      newLine++
    }
  }

  return lines
}
