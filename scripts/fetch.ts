// Fetch and verify a pintail dataset.
//   bun scripts/fetch.ts <workload> <dataset-hash-or-alias> <target-dir>
// Resolution order per file: local repo data/ -> manifest urls (first success).
// Every file is sha256-verified; any mismatch is fatal.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const [workload, ref, targetDir] = process.argv.slice(2)
if (!workload || !ref || !targetDir) {
  console.error('usage: bun scripts/fetch.ts <workload> <dataset-hash-or-alias> <target-dir>')
  process.exit(2)
}

const repoRoot = join(import.meta.dir, '..')
const workloadDir = join(repoRoot, 'datasets', workload)

function resolveHash(): string {
  const aliasFile = join(workloadDir, 'aliases.json')
  if (existsSync(aliasFile)) {
    const aliases = JSON.parse(readFileSync(aliasFile, 'utf8')) as Record<string, string>
    if (aliases[ref]) return aliases[ref]
  }
  return ref
}

interface ManifestFile {
  name: string
  bytes: number
  sha256: string
  rows: number
  urls?: string[]
}

interface Manifest {
  workload: string
  hash: string
  files: ManifestFile[]
}

async function sha256(path: string): Promise<string> {
  const hasher = createHash('sha256')
  hasher.update(new Uint8Array(await Bun.file(path).arrayBuffer()))
  return hasher.digest('hex')
}

const hash = resolveHash()
const datasetDir = join(workloadDir, hash)
const manifest = JSON.parse(readFileSync(join(datasetDir, 'manifest.json'), 'utf8')) as Manifest
mkdirSync(targetDir, { recursive: true })

let failures = 0
for (const file of manifest.files) {
  const target = join(targetDir, file.name)
  mkdirSync(dirname(target), { recursive: true })
  const local = join(datasetDir, 'data', file.name)
  if (existsSync(local)) {
    writeFileSync(target, readFileSync(local))
  } else if (existsSync(target) && (await sha256(target)) === file.sha256) {
    console.log(`cached   ${file.name}`)
    continue
  } else {
    let fetched = false
    for (const url of file.urls ?? []) {
      try {
        const response = await fetch(url)
        if (!response.ok) continue
        writeFileSync(target, new Uint8Array(await response.arrayBuffer()))
        fetched = true
        break
      } catch {}
    }
    if (!fetched) {
      console.error(`FAILED to fetch ${file.name} (no local copy, all mirrors failed)`)
      failures += 1
      continue
    }
  }
  const digest = await sha256(target)
  if (digest !== file.sha256) {
    console.error(`CHECKSUM MISMATCH ${file.name}: expected ${file.sha256}, got ${digest}`)
    failures += 1
  } else {
    console.log(`verified ${file.name} (${file.rows.toLocaleString()} rows)`)
  }
}

if (failures > 0) process.exit(1)
console.log(`dataset ${workload}/${hash} ready in ${targetDir}`)
