import * as THREE from 'three'
import { overlaps } from '../core/Physics2D.js'
import { createModelSlot } from '../core/AssetLoader.js'

// Natural bounding sizes (world units) of the replacement glTF models, measured once from their
// accessor bounds — used below to scale each model to match this game's existing primitive dimensions.
const NATURAL = {
  crate: { w: .5, h: .5 },
  lever: { w: .6, h: .542 },
  door: { w: .724, h: 1 },
  plate: { w: .6, h: .2 },
}

const createFallbackMesh = (size, color) => new THREE.Mesh(new THREE.BoxGeometry(size.w, size.h, .8), new THREE.MeshStandardMaterial({ color, roughness: .9 }))
const createLeverFallback = () => {
  const base = createFallbackMesh({ w: .34, h: .18 }, '#50636b')
  base.position.y = -.41
  const handle = new THREE.Group()
  handle.position.y = -.34
  const stem = createFallbackMesh({ w: .1, h: .68 }, '#86b8bd')
  stem.position.y = .34
  handle.add(stem)
  const fallback = new THREE.Group()
  fallback.add(base, handle)
  fallback.userData.handle = handle
  return fallback
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
    this.mesh = createModelSlot(createFallbackMesh(this.body, '#4DFFFF'), '/models/platformer/crate.glb', {
      tintColor: '#4DFFFF',
      scale: this.body.h / NATURAL.crate.h,
    })
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
        this.body.y = player.body.y + player.body.hh + this.body.h / 2 + .1 + (player.rig.getCarryHeightBonus?.() || 0)
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
    const sideSupport = supportBelow(sideX)
    const edgeDropForward = this.interactions.edgeDropForward && player.facing > 0 && !sideSupport && supportBelow(player.body.x)
    const support = edgeDropForward ? null : (sideSupport || supportBelow(player.body.x))
    this.body.x = edgeDropForward || sideSupport ? sideX : player.body.x
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
  separateFromPlayer(player) {
    const horizontalOverlap = Math.abs(this.body.x - player.body.x) < this.body.w / 2 + player.body.hw
    const verticalOverlap = Math.abs(this.body.y - player.body.y) < this.body.h / 2 + player.body.hh + .08
    if (!horizontalOverlap || !verticalOverlap || this.carried) return
    const distance = this.body.w / 2 + player.body.hw + .08
    const preferredDirection = player.facing || 1
    const preferredX = player.body.x + preferredDirection * distance
    const alternateX = player.body.x - preferredDirection * distance
    const canUse = (x) => x - this.body.w / 2 >= this.bounds.min && x + this.body.w / 2 <= this.bounds.max
    this.body.x = canUse(preferredX) ? preferredX : alternateX
    this.lastPlaced = { x: this.body.x, y: this.body.y }
    this.sync()
  }
  sync() { this.mesh.position.set(this.body.x, this.body.y, 0) }
}

export class Lever {
  constructor(scene, position, onToggle, audio = null, { requiresJumpAction = false, pullRange = { x: 1.2, y: 1.2 }, oneShot = false, rotation = 0 } = {}) {
    this.position = position
    this.body = null
    this.on = false
    this.visible = true
    this.onToggle = onToggle
    this.audio = audio
    this.requiresJumpAction = requiresJumpAction
    this.pullRange = pullRange
    this.oneShot = oneShot
    const fallback = createLeverFallback()
    this.handle = fallback.userData.handle
    this.mesh = createModelSlot(fallback, '/models/platformer/lever.glb', {
      tintColor: '#86b8bd',
      scale: 1 / NATURAL.lever.h,
      onLoad: (model) => {
        this.handle = model.getObjectByName('handle')
        this.syncVisualState()
      },
    })
    this.mesh.position.set(position.x, position.y, .1)
    this.mesh.rotation.z = rotation
    scene.add(this.mesh)
    this.syncVisualState()
  }

  syncVisualState() {
    if (!this.handle) return
    this.handle.rotation.z = this.on ? -.8 : .8
  }

  update(player, input, busy = false) {
    if (!this.visible || busy || (this.oneShot && this.on)) return
    const canPull = !this.requiresJumpAction || !player.body.grounded
    const withinPullRange = Math.abs(player.body.x - this.position.x) < this.pullRange.x && Math.abs(player.body.y - this.position.y) < this.pullRange.y
    if (input.actionPressed && canPull && withinPullRange) {
      this.on = this.oneShot || !this.on
      this.syncVisualState()
      this.onToggle(this.on)
      this.audio?.leverClunk()
      input.actionPressed = false
    }
  }
  setPosition(x, y) {
    this.position = { x, y }
    this.mesh.position.set(x, y, .1)
  }
  setVisible(visible) { this.visible = visible; this.mesh.visible = visible }
  save() { return this.on }
  collider() { return this.body }
  restore(value) { this.on = value; this.syncVisualState(); this.onToggle(value) }
}

export class Door {
  constructor(scene, position) {
    this.body = { x: position.x, y: position.y, w: .7, h: position.h || 3.4 }
    const widthScale = this.body.w / NATURAL.door.w
    this.mesh = createModelSlot(createFallbackMesh(this.body, '#30424a'), '/models/platformer/door.glb', {
      tintColor: '#30424a',
      scale: { x: widthScale, y: this.body.h / NATURAL.door.h, z: widthScale },
    })
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
    const widthScale = this.body.w / NATURAL.plate.w
    this.mesh = createModelSlot(createFallbackMesh(this.body, color), '/models/platformer/plate.glb', {
      tintColor: color,
      scale: { x: widthScale, y: this.body.h / NATURAL.plate.h, z: widthScale },
    })
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

  update(boxes) {
    if (!this.visible || !this.enabled) return
    const pressed = boxes
      .filter((box) => box && !box.carried && !box.falling)
      .some((box) => Math.abs(box.body.x - this.body.x) < .85 && Math.abs(box.body.y - (this.body.y + .56)) < .3)
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
