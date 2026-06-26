#!/usr/bin/env node
const { execSync } = require('child_process')

try {
  const output = execSync('git ls-files "app/public/dist/prod/**"', { encoding: 'utf8' }).trim()
  if (output) {
    console.error('[check:dist] tracked build artifacts detected:')
    console.error(output)
    process.exit(1)
  }
  console.log('[check:dist] no tracked app/public/dist/prod artifacts')
} catch (error) {
  if (error.status === 1 && error.stdout === '') {
    console.log('[check:dist] no tracked app/public/dist/prod artifacts')
    process.exit(0)
  }
  throw error
}
