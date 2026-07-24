export class Input {
  constructor(canvas, touchControls) {
    this.keys = new Set()
    this.touch = new Set()
    this.previousJump = false
    this.jumpPressed = false
    this.previousGrab = false
    this.grabPressed = false
    this.wDown = false
    const map = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'jump', KeyW: 'jump', ArrowUp: 'jump', ShiftLeft: 'grab', ShiftRight: 'grab', KeyE: 'grab' }
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
    const jumping = this.down('jump') && !(this.down('grab') && this.wDown)
    const grabbing = this.down('grab')
    this.jumpPressed = jumping && !this.previousJump
    this.grabPressed = grabbing && !this.previousGrab
    this.previousJump = jumping
    this.previousGrab = grabbing
  }
  down(action) { return this.keys.has(action) || this.touch.has(action) }
  axis() { return (this.down('right') ? 1 : 0) - (this.down('left') || (this.down('grab') && this.wDown) ? 1 : 0) }
}
