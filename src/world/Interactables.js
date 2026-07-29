import * as THREE from 'three'
import { overlaps } from '../core/Physics2D.js'

const createMesh = (size, color) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.w, size.h, .8), new THREE.MeshStandardMaterial({ color, roughness: .9 }))
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export class Box {
  constructor(scene, position, bounds = { min: -12.8, max: 12.8 }, interactions = { carry: true, push: false }) {
    this.start = { ...position }
    this.body = { x: position.x, y: position.y, w: position.w || 1, h: position.h || 1 }
    this.bounds = bounds
    this.interactions = interactions
    this.falling = false
    this.fallVelocity = 0
    this.carried = false
    this.lastPlaced = { x: this.body.x, y: this.body.y }
    this.mesh = createMesh(this.body, '#4DFFFF')
    scene.add(this.mesh)
    this.sync()
  }

  playerEngaged() { return false }

  update(dt, player, input, blockers) {
    if (this.falling) {
      this.fall(dt, blockers)
      return false
    }
    if (this.carried) {
      if (input.actionPressed) {
        this.placeNextTo(player, blockers)
        input.actionPressed = false
      } else {
        this.body.x = player.body.x
        this.body.y = player.body.y + player.body.hh + this.body.h / 2 + .1
      }
      this.sync()
      return false
    }
    if (this.interactions.carry && input.actionPressed && !player.carriedBox && Math.hypot(player.body.x - this.body.x, player.body.y - this.body.y) < 1.35) {
      this.carried = true
      player.carriedBox = this
      input.actionPressed = false
      return false
    }
    const top = this.body.y + this.body.h / 2
    const standingOnBox = Math.abs(player.body.x - this.body.x) < this.body.w / 2 + player.body.hw - .05 && Math.abs((player.body.y - player.body.hh) - top) < .08
    if (standingOnBox) player.armBonusJump(this)
    this.sync()
    return false
  }

  placeNextTo(player, blockers = []) {
    this.carried = false
    player.carriedBox = null
    const releaseBottom = player.body.y - player.body.hh
    const supportBelow = (x) => blockers
      .filter((blocker) => (
        Math.abs(x - blocker.x) < this.body.w / 2 + blocker.w / 2 - .05 &&
        blocker.y + blocker.h / 2 <= releaseBottom + .01
      ))
      .sort((first, second) => (second.y + second.h / 2) - (first.y + first.h / 2))[0]
    const sideX = player.body.x + player.facing * .9
    const support = supportBelow(sideX) || supportBelow(player.body.x)
    this.body.x = supportBelow(sideX) ? sideX : player.body.x
    this.body.y = player.body.y - player.body.hh + this.body.h / 2
    if (support && Math.abs((support.y + support.h / 2) - releaseBottom) < .08) {
      this.body.y = support.y + support.h / 2 + this.body.h / 2
      this.falling = false
      this.fallVelocity = 0
    } else this.startFalling()
    this.lastPlaced = { x: this.body.x, y: this.body.y }
    this.sync()
  }

  startFalling() { this.falling = true; this.fallVelocity = 0 }
  fall(dt, blockers = []) {
    if (!this.falling) return
    const previousBottom = this.body.y - this.body.h / 2
    this.fallVelocity -= 25 * dt
    this.body.y += this.fallVelocity * dt
    const nextBottom = this.body.y - this.body.h / 2
    const landing = blockers
      .filter((blocker) => Math.abs(this.body.x - blocker.x) < this.body.w / 2 + blocker.w / 2 - .05)
      .map((blocker) => ({ blocker, top: blocker.y + blocker.h / 2 }))
      .filter(({ top }) => previousBottom >= top - .001 && nextBottom <= top + .001)
      .sort((first, second) => second.top - first.top)[0]
    if (landing) {
      this.body.y = landing.top + this.body.h / 2
      this.falling = false
      this.fallVelocity = 0
      this.lastPlaced = { x: this.body.x, y: this.body.y }
    }
    this.sync()
  }
  collider() { return this.carried ? null : this.body }
  save() {
    const position = this.carried ? this.lastPlaced : this.body
    return { x: position.x, y: position.y, falling: this.falling, fallVelocity: this.fallVelocity }
  }
  restore(snapshot) {
    this.body.x = snapshot.x
    this.body.y = snapshot.y
    this.falling = Boolean(snapshot.falling)
    this.fallVelocity = snapshot.fallVelocity || 0
    this.carried = false
    this.lastPlaced = { x: this.body.x, y: this.body.y }
    this.sync()
  }
  sync() { this.mesh.position.set(this.body.x, this.body.y, 0) }
}

export class Lever {
  constructor(scene, position, onToggle, audio = null, { requiresJumpAction = false, pullRange = { x: 1.2, y: 1.2 }, oneShot = false } = {}) {
    this.position = position
    this.body = null
    this.on = false
    this.visible = true
    this.onToggle = onToggle
    this.audio = audio
    this.requiresJumpAction = requiresJumpAction
    this.pullRange = pullRange
    this.oneShot = oneShot
    this.mesh = createMesh({ w: .22, h: 1 }, '#86b8bd')
    this.mesh.position.set(position.x, position.y, .1)
    scene.add(this.mesh)
  }

  update(player, input, busy = false) {
    if (!this.visible || busy || (this.oneShot && this.on)) return
    const canPull = !this.requiresJumpAction || !player.body.grounded
    const withinPullRange = Math.abs(player.body.x - this.position.x) < this.pullRange.x && Math.abs(player.body.y - this.position.y) < this.pullRange.y
    if (input.actionPressed && canPull && withinPullRange) {
      this.on = this.oneShot || !this.on
      this.mesh.rotation.z = this.on ? -.8 : .8
      this.onToggle(this.on)
      this.audio?.leverClunk()
    }
  }
  setPosition(x, y) {
    this.position = { x, y }
    this.mesh.position.set(x, y, .1)
  }
  setVisible(visible) { this.visible = visible; this.mesh.visible = visible }
  save() { return this.on }
  collider() { return this.body }
  restore(value) { this.on = value; this.mesh.rotation.z = value ? -.8 : .8; this.onToggle(value) }
}

export class Door {
  constructor(scene, position) {
    this.body = { x: position.x, y: position.y, w: .7, h: position.h || 3.4 }
    this.mesh = createMesh(this.body, '#30424a')
    scene.add(this.mesh)
    this.open = false
    this.sync()
  }

  setOpen(open) { this.open = open; this.sync() }
  setY(y) { this.body.y = y; this.sync() }
  collider() { return this.open ? null : this.body }
  save() { return this.open }
  restore(value) { this.open = value; this.sync() }
  sync() { this.mesh.position.set(this.body.x, this.open ? this.body.y + 3.5 : this.body.y, 0) }
}

export class PressurePlate {
  constructor(scene, position, onChange, uses = 1, { color = '#FF5151' } = {}) {
    this.body = { x: position.x, y: position.y, w: 1.35, h: .12 }
    this.onChange = onChange
    this.remaining = uses
    this.color = color
    this.enabled = true
    this.visible = true
    this.pressed = false
    this.mesh = createMesh(this.body, color)
    this.mesh.material.transparent = true
    this.mesh.material.opacity = .55
    this.counterCanvas = document.createElement('canvas')
    this.counterCanvas.width = 96
    this.counterCanvas.height = 96
    this.counterTexture = new THREE.CanvasTexture(this.counterCanvas)
    this.counter = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.counterTexture, transparent: true, depthTest: false }))
    this.counter.position.set(position.x, position.y - .18, .7)
    this.counter.scale.set(.42, .42, 1)
    scene.add(this.mesh)
    scene.add(this.counter)
    this.mesh.position.set(position.x, position.y, 0)
    this.drawCounter()
  }

  drawCounter() {
    const context = this.counterCanvas.getContext('2d')
    context.clearRect(0, 0, this.counterCanvas.width, this.counterCanvas.height)
    context.fillStyle = '#101820'
    context.beginPath()
    context.arc(48, 48, 34, 0, Math.PI * 2)
    context.fill()
    context.strokeStyle = this.color
    context.lineWidth = 6
    context.stroke()
    context.fillStyle = '#FFFFFF'
    context.font = 'bold 52px monospace'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(this.remaining === Infinity ? '∞' : String(this.remaining), 48, 52)
    this.counterTexture.needsUpdate = true
  }

  setVisible(visible) {
    this.visible = visible
    this.mesh.visible = visible
    this.counter.visible = visible
  }

  setRemaining(remaining) {
    this.remaining = remaining
    this.enabled = remaining > 0
    this.pressed = false
    this.drawCounter()
  }

  update(box) {
    if (!this.visible || !this.enabled) return
    const pressed = Math.abs(box.body.x - this.body.x) < .85 && Math.abs(box.body.y - (this.body.y + .56)) < .3
    if (pressed === this.pressed) return
    this.pressed = pressed
    this.mesh.material.opacity = pressed ? .9 : .55
    if (!pressed) { this.onChange(false, this.remaining); return }
    this.remaining -= 1
    this.enabled = this.remaining > 0
    this.drawCounter()
    this.onChange(true, this.remaining)
  }
}
