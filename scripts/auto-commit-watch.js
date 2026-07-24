// Watches the repo for any file change (Copilot, manual edits, anything) and
// auto-commits + pushes to origin/main after a short quiet period.
import { watch } from 'node:fs'
import { execSync } from 'node:child_process'

const ROOT = process.cwd()
const DEBOUNCE_MS = 5000
const IGNORE_PREFIXES = ['.git', 'node_modules', 'dist', '.claude']

let timer = null

function shouldIgnore(relPath) {
  if (!relPath) return true
  const normalized = relPath.replace(/\\/g, '/')
  return IGNORE_PREFIXES.some((p) => normalized === p || normalized.startsWith(p + '/'))
}

function run(cmd) {
  return execSync(cmd, { cwd: ROOT, stdio: 'pipe' }).toString()
}

function commitAndPush() {
  try {
    const status = run('git status --porcelain')
    if (!status.trim()) return

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
    run('git add -A')
    run(`git commit -m "Auto-commit (watch): ${timestamp}"`)
    console.log(`[auto-commit] committed changes at ${timestamp}`)

    try {
      run('git push origin main')
      console.log('[auto-commit] pushed to origin/main')
    } catch (pushErr) {
      console.warn('[auto-commit] push failed, will retry on next change:', pushErr.message.split('\n')[0])
    }
  } catch (err) {
    console.warn('[auto-commit] skipped:', err.message.split('\n')[0])
  }
}

function scheduleCommit() {
  clearTimeout(timer)
  timer = setTimeout(commitAndPush, DEBOUNCE_MS)
}

console.log(`[auto-commit] watching ${ROOT} for changes (Ctrl+C to stop)...`)

watch(ROOT, { recursive: true }, (_eventType, filename) => {
  if (shouldIgnore(filename)) return
  scheduleCommit()
})
