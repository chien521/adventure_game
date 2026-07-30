export class Input {
  constructor(canvas, touchControls) {
    this.keys = new Set()
    this.touch = new Set()
    this.previousJump = false
    this.jumpPressed = false
    this.previousAction = false
    this.actionPressed = false
    this.previousPortal = false
    this.portalPressed = false
    this.wDown = false
    const map = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'jump', KeyW: 'jump', ArrowUp: 'jump', KeyC: 'action', KeyQ: 'portal' }
    window.addEventListener('keydown', (event) => { if (map[event.code]) { this.keys.add(map[event.code]); if (event.code === 'KeyW') this.wDown = true; event.preventDefault(); canvas.focus() } })
    window.addEventListener('keyup', (event) => { if (map[event.code]) { this.keys.delete(map[event.code]); if (event.code === 'KeyW') this.wDown = false } })
    window.addEventListener('blur', () => { this.keys.clear(); this.wDown = false })
    touchControls.querySelectorAll('button[data-input]').forEach((button) => {
      const action = button.dataset.input
      const set = (active) => active ? this.touch.add(action) : this.touch.delete(action)
      button.addEventListener('pointerdown', (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); set(true) })
      button.addEventListener('pointerup', () => set(false))
      button.addEventListener('pointercancel', () => set(false))
      button.addEventListener('lostpointercapture', () => set(false))
    })
  }

  update() {
    const jumping = this.down('jump')
    const acting = this.down('action')
    const enteringPortal = this.down('portal')
    this.jumpPressed = jumping && !this.previousJump
    this.actionPressed = acting && !this.previousAction
    this.portalPressed = enteringPortal && !this.previousPortal
    this.previousJump = jumping
    this.previousAction = acting
    this.previousPortal = enteringPortal
  }
  clear() {
    this.keys.clear()
    this.touch.clear()
    this.previousJump = false
    this.jumpPressed = false
    this.previousAction = false
    this.actionPressed = false
    this.previousPortal = false
    this.portalPressed = false
    this.wDown = false
  }
  down(action) { return this.keys.has(action) || this.touch.has(action) }
  axis() { return (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0) }
}
