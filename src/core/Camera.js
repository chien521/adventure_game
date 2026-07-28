import * as THREE from 'three'

const DEFAULT_FOV = 39

export class Camera {
  constructor(player) {
    this.player = player
    this.camera = new THREE.PerspectiveCamera(DEFAULT_FOV, 1, 0.1, 100)
    this.camera.position.set(0, 4, 15)
    this.zones = []
    this.shakeTime = 0
    this.shakeMagnitude = 0
    this.portalPan = null
  }

  setZones(zones = []) { this.zones = zones }

  shake(duration = .2, magnitude = .13) { this.shakeTime = duration; this.shakeMagnitude = magnitude }

  showPortal(x, y = 1.15) { this.portalPan = { x, y: Math.max(2.6, y + 1.4), phase: 'toPortal', elapsed: 0 } }

  resize(width, height) { this.camera.aspect = width / height; this.camera.updateProjectionMatrix() }

  update(dt) {
    const zone = this.zones.find((z) => this.player.body.x >= z.xMin && this.player.body.x <= z.xMax)
    const targetX = this.player.body.x + this.player.facing * 2.2
    const targetY = zone?.camY ?? (this.player.body.y < 0 ? this.player.body.y + 1.4 : Math.max(2.6, this.player.body.y + 1.4))
    const targetZ = zone?.camZ ?? 15
    const targetFov = zone?.fov ?? DEFAULT_FOV
    const factor = 1 - Math.exp(-dt * 4)
    const portalPanFactor = 1 - Math.exp(-dt * 1.3)
    let panFinished = false
    if (this.portalPan) {
      this.portalPan.elapsed += dt
      if (this.portalPan.phase === 'toPortal') {
        this.camera.position.x += (this.portalPan.x - this.camera.position.x) * portalPanFactor
        this.camera.position.y += (this.portalPan.y - this.camera.position.y) * portalPanFactor
        if (this.portalPan.elapsed >= 2.4) { this.portalPan.phase = 'hold'; this.portalPan.elapsed = 0 }
      } else if (this.portalPan.phase === 'hold') {
        if (this.portalPan.elapsed >= 1.4) { this.portalPan.phase = 'toPlayer'; this.portalPan.elapsed = 0 }
      } else {
        this.camera.position.x += (targetX - this.camera.position.x) * portalPanFactor
        this.camera.position.y += (targetY - this.camera.position.y) * portalPanFactor
        if (this.portalPan.elapsed >= 2.4) { this.portalPan = null; panFinished = true }
      }
    } else {
      this.camera.position.x += (targetX - this.camera.position.x) * factor
      this.camera.position.y += (targetY - this.camera.position.y) * factor
    }
    this.camera.position.z += (targetZ - this.camera.position.z) * factor
    if (Math.abs(this.camera.fov - targetFov) > .01) {
      this.camera.fov += (targetFov - this.camera.fov) * factor
      this.camera.updateProjectionMatrix()
    }
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt)
      const strength = this.shakeMagnitude * (this.shakeTime / .2)
      this.camera.position.x += (Math.random() - .5) * strength
      this.camera.position.y += (Math.random() - .5) * strength
    }
    this.camera.lookAt(this.camera.position.x, this.camera.position.y - .5, 0)
    return panFinished
  }
}
