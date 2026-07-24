export class Game {
  constructor({ renderer, scene, camera, update }) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    this.update = update
    this.lastTime = 0
    this.running = false
    document.addEventListener('visibilitychange', () => { this.lastTime = 0 })
  }

  start() {
    if (this.running) return
    this.running = true
    requestAnimationFrame((time) => this.loop(time))
  }

  loop(time) {
    if (!this.running) return
    requestAnimationFrame((nextTime) => this.loop(nextTime))
    const dt = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.1) : 0
    this.lastTime = time
    if (!document.hidden) this.update(dt)
    this.renderer.render(this.scene, this.camera.camera)
  }
}
