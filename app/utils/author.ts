export function isBotAuthor(author: string): boolean {
  return /\[bot\]$/i.test(author)
}
