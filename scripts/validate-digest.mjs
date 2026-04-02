// Validates and normalizes a digest object before saving.
// Ensures all fields exist on every item with correct types.
// Run: node scripts/validate-digest.mjs <path-to-digest.json>

import { readFileSync, writeFileSync } from 'fs'

const path = process.argv[2]
if (!path) { console.error('Usage: node validate-digest.mjs <path>'); process.exit(1) }

const dig = JSON.parse(readFileSync(path, 'utf-8'))

const fieldDefaults = {
  score: 5,
  tag: 'LOW',
  category: 'Other',
  headline: 'Untitled',
  description: '',
  action: '',
  clientPitch: '',
  useCase: '',
  tools: [],
  timeline: '',
  confidence: '',
  sourceTier: 0,
  sourceUrl: '',
  sourceName: '',
  sources: []
}

let fixed = 0

if (!dig.items) dig.items = []

for (const item of dig.items) {
  for (const [key, def] of Object.entries(fieldDefaults)) {
    if (!(key in item) || item[key] === undefined || item[key] === null) {
      item[key] = Array.isArray(def) ? [] : def
      fixed++
    }
  }

  // Fix types
  if (typeof item.score !== 'number') { item.score = parseInt(item.score) || 5; fixed++ }
  if (!Array.isArray(item.tools)) { item.tools = []; fixed++ }
  if (!Array.isArray(item.sources)) { item.sources = []; fixed++ }
  if (typeof item.sourceTier !== 'number') { item.sourceTier = parseInt(item.sourceTier) || 0; fixed++ }

  // Fix tag to match score
  item.tag = item.score >= 8 ? 'CRITICAL' : item.score >= 6 ? 'WATCH' : 'LOW'

  // Fix compound categories
  if (item.category?.includes(',') || item.category?.includes('/')) {
    item.category = item.category.split(/[,\/]/)[0].trim()
  }
}

// Sort by score
dig.items.sort((a, b) => b.score - a.score)

// Fix counts
dig.totalScanned = dig.items.length
dig.relevant = dig.items.filter(i => i.score >= 6).length
dig.critical = dig.items.filter(i => i.score >= 8).length
dig.watch = dig.items.filter(i => i.score >= 6 && i.score < 8).length
dig.low = dig.items.filter(i => i.score < 6).length

// Ensure date fields
if (!dig.dateKey) {
  dig.dateKey = new Date().toISOString().split('T')[0]
}
if (!dig.date) {
  const [y, m, d] = dig.dateKey.split('-')
  dig.date = new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

writeFileSync(path, JSON.stringify(dig, null, 2))
console.log(`Validated: ${dig.items.length} items, ${fixed} fields fixed, ${dig.critical} critical, ${dig.watch} watch, ${dig.low} low`)
