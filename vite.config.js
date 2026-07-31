import { defineConfig } from 'vite'

const allowedAvatarHosts = new Set([
  'me-stage.viverse.com',
  'ac3-playerme-stage.s3.us-west-2.amazonaws.com',
])

function viverseAvatarDevProxy() {
  return {
    name: 'viverse-avatar-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/viverse-avatar', async (request, response) => {
        const requestedUrl = new URL(request.url, 'http://localhost').searchParams.get('url')
        if (!requestedUrl) {
          response.statusCode = 400
          response.end('Missing avatar URL.')
          return
        }

        let avatarUrl
        try { avatarUrl = new URL(requestedUrl) }
        catch {
          response.statusCode = 400
          response.end('Invalid avatar URL.')
          return
        }
        if (avatarUrl.protocol !== 'https:' || !allowedAvatarHosts.has(avatarUrl.hostname)) {
          response.statusCode = 403
          response.end('Avatar host is not allowed.')
          return
        }

        try {
          const avatarResponse = await fetch(avatarUrl)
          if (!avatarResponse.ok) {
            response.statusCode = avatarResponse.status
            response.end('Avatar download failed.')
            return
          }
          response.setHeader('Content-Type', avatarResponse.headers.get('content-type') || 'model/gltf-binary')
          response.setHeader('Cache-Control', 'private, no-store')
          response.end(Buffer.from(await avatarResponse.arrayBuffer()))
        } catch {
          response.statusCode = 502
          response.end('Avatar download failed.')
        }
      })
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [viverseAvatarDevProxy()],
})
