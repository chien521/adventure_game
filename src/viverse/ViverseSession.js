const HANDSHAKE_DELAY_MS = 1200
const AUTH_DOMAIN = 'account.htcvive.com'
const AVATAR_BASE_URL = 'https://sdk-api.viverse.com/'
const DASHBOARD_BASE_URL = 'https://www.viveport.com/'
const DASHBOARD_COMMUNITY_BASE_URL = 'https://www.viverse.com/'
const PENDING_KEY = 'undertow.viversePending'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function resolveSdk() {
  return window.viverse || window.VIVERSE_SDK || window.vSdk || null
}

async function waitForSdk(maxAttempts = 100, interval = 100) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const sdk = resolveSdk()
    if (sdk && typeof sdk.client === 'function') return sdk
    await wait(interval)
  }
  return null
}

function hostnameAppId() {
  const match = location.hostname.match(/^([a-z0-9]+)(?:-preview)?\.world\.viverse\.app$/)
  return match ? match[1] : null
}

function resolveAppId() {
  return import.meta.env.VITE_VIVERSE_CLIENT_ID || hostnameAppId() || ''
}

function readPending() {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function writePending(payload) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(payload)) }
  catch { }
}
function clearPending() {
  try { localStorage.removeItem(PENDING_KEY) }
  catch { }
}

export class ViverseSession {
  constructor() {
    this.sdk = null
    this.client = null
    this.appId = resolveAppId()
    this.readyPromise = null
    this.auth = null
  }

  async ensureReady() {
    if (!this.readyPromise) {
      this.readyPromise = (async () => {
        const sdk = await waitForSdk()
        if (!sdk || !this.appId) return false
        this.sdk = sdk
        this.client = new sdk.client({ clientId: this.appId, domain: AUTH_DOMAIN })
        await wait(HANDSHAKE_DELAY_MS)
        return true
      })()
    }
    return this.readyPromise
  }

  async checkAuth() {
    const ready = await this.ensureReady()
    if (!ready) return null
    try {
      const result = await this.client.checkAuth()
      this.auth = result || null
      return this.auth
    } catch {
      return null
    }
  }

  /** Resolves once an authenticated session exists, redirecting to VIVERSE login if needed. */
  async ensureLogin(pendingPayload) {
    const auth = await this.checkAuth()
    if (auth?.access_token) return auth
    if (pendingPayload) writePending(pendingPayload)
    this.client?.loginWithWorlds({ state: pendingPayload?.reason || 'connect' })
    return null
  }

  async fetchProfile() {
    if (!this.auth?.access_token) return null
    const token = this.auth.access_token
    let profile = null
    const merge = (p) => { if (p && typeof p === 'object') profile = profile ? { ...profile, ...p } : { ...p } }
    const hasIdentity = (p) => !!(p && (p.name || p.displayName || p.display_name || p.nickName || p.nickname || p.userName || p.email))
    const hasAvatar = (p) => !!(p && (p.activeAvatar?.vrmUrl || p.activeAvatar?.avatarUrl || p.avatarUrl || p.avatar_url))
    const needsMore = () => !profile || !hasIdentity(profile) || !hasAvatar(profile)

    if (this.sdk?.avatar) {
      try {
        const avatarClient = new this.sdk.avatar({
          baseURL: AVATAR_BASE_URL,
          accessToken: token,
          token,
          authorization: token,
          appId: this.appId,
          clientId: this.appId,
        })
        merge(await avatarClient.getProfile())
      } catch { }
    }
    if (needsMore() && this.client?.getUserInfo) { try { merge(await this.client.getUserInfo()) } catch { } }
    if (needsMore() && this.client?.getUser) { try { merge(await this.client.getUser()) } catch { } }
    if (needsMore() && this.client?.getProfileByToken) { try { merge(await this.client.getProfileByToken(token)) } catch { } }
    return profile
  }

  getActiveAvatarUrl(profile) {
    return profile?.activeAvatar?.vrmUrl || profile?.activeAvatar?.avatarUrl || null
  }

  getDisplayName(profile) {
    const name = profile?.displayName || profile?.display_name || profile?.name || profile?.nickname || profile?.userName
    return name && typeof name === 'string' ? name : 'VIVERSE Player'
  }

  async getDashboardClient() {
    const ready = await this.ensureReady()
    if (!ready || !this.auth?.access_token) return null
    const DashboardClass = this.sdk?.gameDashboard || this.sdk?.GameDashboard
    if (!DashboardClass) return null
    return new DashboardClass({
      token: this.auth.access_token,
      clientId: this.appId,
      baseURL: DASHBOARD_BASE_URL,
      communityBaseURL: DASHBOARD_COMMUNITY_BASE_URL,
    })
  }

  async submitScore(leaderboardName, value) {
    if (!leaderboardName) return false
    const dashboard = await this.getDashboardClient()
    if (!dashboard) return false
    try {
      await dashboard.uploadLeaderboardScore(this.appId, [{ name: leaderboardName, value }])
      return true
    } catch {
      return false
    }
  }

  async fetchLeaderboard(leaderboardName, limit = 10) {
    if (!leaderboardName) return []
    const dashboard = await this.getDashboardClient()
    if (!dashboard) return []
    const configs = [
      { name: leaderboardName, range_start: 0, range_end: limit - 1, region: 'global', time_range: 'alltime', around_user: false },
      { name: leaderboardName, range_start: 0, range_end: limit - 1, region: 'global', time_range: 'alltime', around_user: true },
      { name: leaderboardName, range_start: 0, range_end: limit - 1, region: 'local', time_range: 'alltime', around_user: false },
    ]
    const extract = (res) => res?.rankings || res?.ranking || res?.leaderboard_rankings
      || res?.data?.rankings || res?.data?.ranking || res?.leaderboard?.rankings || res?.leaderboard?.ranking || []
    for (const config of configs) {
      try {
        const rows = extract(await dashboard.getLeaderboard(this.appId, config))
        if (rows.length > 0) {
          return rows.map((row, index) => ({
            ...row,
            rank: typeof row.rank === 'number' ? row.rank + 1 : index + 1,
          }))
        }
      } catch { }
    }
    return []
  }

  /** Call once on boot. Resumes an avatar-connect or leaderboard-submit that triggered a login redirect. */
  async resumePending() {
    const pending = readPending()
    if (!pending) return null
    clearPending()
    const auth = await this.checkAuth()
    if (!auth?.access_token) return null
    return pending
  }
}

export const viverseSession = new ViverseSession()
