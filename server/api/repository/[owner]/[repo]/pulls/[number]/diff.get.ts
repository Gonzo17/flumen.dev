import { getRepoParams, getSessionToken } from '~~/server/utils/github'

export interface PrDiffFile {
  oldContent: string | null
  newContent: string | null
}

export interface PrDiffResult {
  headSha: string
  diff: string
  files: Record<string, PrDiffFile>
}

async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  headers: Record<string, string>,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`,
      { headers: { ...headers, Accept: 'application/vnd.github.v3+json' } },
    )
    if (!res.ok) return null
    const data = await res.json() as { content?: string, encoding?: string }
    if (data.encoding === 'base64' && data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8')
    }
    return null
  }
  catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  const { owner, repo } = getRepoParams(event)
  const number = Number(getRouterParam(event, 'number'))

  if (!Number.isFinite(number) || number <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid pull request number' })
  }

  const { token } = await getSessionToken(event)
  const ghHeaders = {
    'Authorization': `token ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }

  // Fetch diff, PR metadata, and file list in parallel
  const [diffResponse, metaResponse, prFilesResponse] = await Promise.all([
    fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
      { headers: { ...ghHeaders, Accept: 'application/vnd.github.v3.diff' } },
    ),
    fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
      { headers: { ...ghHeaders, Accept: 'application/vnd.github.v3+json' } },
    ),
    fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/files?per_page=100`,
      { headers: { ...ghHeaders, Accept: 'application/vnd.github.v3+json' } },
    ),
  ])

  if (!diffResponse.ok) {
    throw createError({ statusCode: diffResponse.status, message: `GitHub API ${diffResponse.status}: ${diffResponse.statusText}` })
  }

  const diff = await diffResponse.text()
  const prData = await metaResponse.json() as {
    head: { sha: string, ref: string }
    base: { sha: string, ref: string }
  }

  const headSha = prData.head.sha
  const baseRef = prData.base.ref
  const headRef = prData.head.ref

  const files: Record<string, PrDiffFile> = {}

  if (prFilesResponse.ok) {
    const prFiles = await prFilesResponse.json() as Array<{
      filename: string
      status: string
      previous_filename?: string
    }>

    await Promise.all(prFiles.map(async (file) => {
      const oldPath = file.previous_filename || file.filename
      const [oldContent, newContent] = await Promise.all([
        file.status === 'added' ? Promise.resolve(null) : fetchFileContent(owner, repo, oldPath, baseRef, ghHeaders),
        file.status === 'removed' ? Promise.resolve(null) : fetchFileContent(owner, repo, file.filename, headRef, ghHeaders),
      ])
      files[file.filename] = { oldContent, newContent }
    }))
  }

  return { headSha, diff, files } satisfies PrDiffResult
})
