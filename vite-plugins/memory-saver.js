import fs from 'fs/promises'
import path from 'path'

function readBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => resolve(body))
  })
}

export function memorySaverPlugin() {
  return {
    name: 'memory-saver',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/save-memory', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }
        const body = await readBody(req)
        try {
          JSON.parse(body)
          const filePath = path.resolve(server.config.root, 'src/data/memory.json')
          await fs.writeFile(filePath, body, 'utf-8')
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, bytes: body.length }))
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: e.message }))
        }
      })

      server.middlewares.use('/api/log-error', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }
        const body = await readBody(req)
        try {
          const { message, stack, timestamp } = JSON.parse(body)
          const logPath = path.resolve(server.config.root, 'src/error.log')
          const line = `[${timestamp}] ${message}\n${stack ? stack + '\n' : ''}---\n`
          await fs.appendFile(logPath, line, 'utf-8')
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    }
  }
}
