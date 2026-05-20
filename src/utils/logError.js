export async function logError(message, stack = '') {
  console.error('[vocab-app]', message, stack)
  try {
    await fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: String(message), stack: String(stack), timestamp: new Date().toISOString() })
    })
  } catch {}
}
