import type { RepoHealthStats } from '~~/shared/types/repository'

export interface HealthCategory {
  key: string
  score: number
  max: number
}

export interface HealthGrade {
  score: number
  grade: string
  gradeColor: string
  categories: HealthCategory[]
}

const GRADES: Array<[number, string, string]> = [
  [90, 'A+', 'text-emerald-400'],
  [80, 'A', 'text-emerald-400'],
  [70, 'B+', 'text-lime-400'],
  [60, 'B', 'text-lime-400'],
  [50, 'C+', 'text-amber-400'],
  [40, 'C', 'text-amber-400'],
  [25, 'D', 'text-orange-400'],
  [0, 'F', 'text-rose-400'],
]

function daysSince(date: string): number {
  return (Date.now() - new Date(date).getTime()) / 86400000
}

export function computeHealthScore(stats: RepoHealthStats): HealthGrade {
  const categories: HealthCategory[] = []

  // Commit recency (0-30)
  let commits = 0
  if (stats.lastCommitDate) {
    const days = daysSince(stats.lastCommitDate)
    if (days < 7) commits = 30
    else if (days < 30) commits = 20
    else if (days < 90) commits = 10
  }
  categories.push({ key: 'commits', score: commits, max: 30 })

  // Release frequency (0-20)
  let releases = 0
  if (stats.lastRelease) {
    const days = daysSince(stats.lastRelease.publishedAt)
    if (days < 30) releases = 20
    else if (days < 90) releases = 15
    else if (days < 180) releases = 10
    else releases = 5
  }
  categories.push({ key: 'releases', score: releases, max: 20 })

  // Community (0-20)
  let community = 5
  if (stats.contributorsCount >= 10) community = 20
  else if (stats.contributorsCount >= 5) community = 15
  else if (stats.contributorsCount >= 2) community = 10
  categories.push({ key: 'community', score: community, max: 20 })

  // Commit activity (0-15)
  let activity = 0
  const totalCommits = stats.weeklyCommitActivity.reduce((s, v) => s + v, 0)
  if (totalCommits > 50) activity = 15
  else if (totalCommits > 20) activity = 10
  else if (totalCommits > 5) activity = 5
  categories.push({ key: 'activity', score: activity, max: 15 })

  // License (0-5)
  categories.push({ key: 'license', score: stats.license ? 5 : 0, max: 5 })

  // Stars (0-10)
  let stars = 0
  if (stats.stars >= 1000) stars = 10
  else if (stats.stars >= 100) stars = 7
  else if (stats.stars >= 10) stars = 4
  categories.push({ key: 'stars', score: stars, max: 10 })

  const total = Math.min(categories.reduce((s, c) => s + c.score, 0), 100)
  const [, grade, gradeColor] = GRADES.find(([min]) => total >= min)!

  return { score: total, grade, gradeColor, categories }
}
