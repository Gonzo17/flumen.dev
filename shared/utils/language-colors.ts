export const LANGUAGE_COLORS: Record<string, string> = {
  'TypeScript': '#3178c6',
  'JavaScript': '#f1e05a',
  'Python': '#3572A5',
  'Java': '#b07219',
  'Go': '#00ADD8',
  'Rust': '#dea584',
  'Ruby': '#701516',
  'PHP': '#4F5D95',
  'C#': '#178600',
  'C': '#555555',
  'C++': '#f34b7d',
  'Swift': '#F05138',
  'Kotlin': '#A97BFF',
  'Dart': '#00B4AB',
  'Shell': '#89e051',
  'HTML': '#e34c26',
  'CSS': '#563d7c',
  'SCSS': '#c6538c',
  'Vue': '#41b883',
  'Svelte': '#ff3e00',
  'Lua': '#000080',
  'Elixir': '#6e4a7e',
  'Haskell': '#5e5086',
  'Scala': '#c22d40',
  'Zig': '#ec915c',
  'Nix': '#7e7eff',
  'Dockerfile': '#384d54',
  'Makefile': '#427819',
  'MDX': '#fcb32c',
}

export function getLanguageColor(language: string | null): string {
  if (!language) return '#8b8b8b'
  return LANGUAGE_COLORS[language] ?? '#8b8b8b'
}
