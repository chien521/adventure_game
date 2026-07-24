import * as THREE from 'three'
import { overlaps } from '../core/Physics2D.js'

const createMesh = (size, color) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.w, size.h, .8), new THREE.MeshStandardMaterial({ color, roughness: .9 }))
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export class Box {
  constructor(scene, position, bounds = { min: -12.8, max: 12.8 }) {
    this.start = { ...position }
    this.body = { x: position.x, y: position.y, w: position.w || 1, h: position.h || 1 }
    this.bounds = bounds
    this.falling = false
    this.fallVelocity = 0
    this.mesh = createMesh(this.body, '#536b71')
    scene.add(this.mesh)
    this.sync()
  }

  // True while the player is at box contact, holding grab and pressing horizontally.
  // Also used to suppress nearby lever toggles so one grab press can't push and throw a switch at once.
  playerEngaged(player, input) {
    if (this.falling) return false
    if (!input.down('grab')) return false
    const direction = input.axis()
    if (!direction) return false
    const horizontalDistance = player.body.x - this.body.x
    const verticallyAligned = Math.abs(player.body.y - this.body.y) < player.body.hh + this.body.h / 2
    const atContact = Math.abs(Math.abs(horizontalDistance) - (player.body.hw + this.body.w / 2)) < .18
    return verticallyAligned && atContact
  }

  update(dt, player, input, blockers) {
    if (this.falling) return false
    const direction = input.axis()
    let pushed = false
    if (this.playerEngaged(player, input)) {
      const nextX = Math.max(this.bounds.min, Math.min(this.bounds.max, this.body.x + direction * Math.min(2.4 * dt, .04)))
      const candidate = { ...this.body, x: nextX }
      const blocked = blockers.some((blocker) => Math.abs(candidate.x - blocker.x) < candidate.w / 2 + blocker.w / 2 && Math.abs(candidate.y - blocker.y) < candidate.h / 2 + blocker.h / 2)
      if (!blocked) {
        this.body.x = nextX
        const horizontalDistance = player.body.x - this.body.x
        const pulling = (horizontalDistance < 0 && direction < 0) || (horizontalDistance > 0 && direction > 0)
        if (pulling) player.body.x = this.body.x + Math.sign(horizontalDistance) * (this.body.w / 2 + player.body.hw)
        player.body.vx *= .72
        pushed = true
      }
    }
    this.sync()
    return pushed
  }

  startFalling() { this.falling = true; this.fallVelocity = 0 }
  fall(dt) {
    if (!this.falling) return
    this.fallVelocity -= 25 * dt
    this.body.y += this.fallVelocity * dt
    this.sync()
  }
  collider() { return this.falling ? null : this.body }
  save() { return { x: this.body.x, y: this.body.y, falling: this.falling, fallVelocity: this.fallVelocity } }
  restore(snapshot) {
    this.body.x = snapshot.x
    this.body.y = snapshot.y
    this.falling = Boolean(snapshot.falling)
    this.fallVelocity = snapshot.fallVelocity || 0
    this.sync()
  }
  sync() { this.mesh.position.set(this.body.x, this.body.y, 0) }
}

export class Lever {
  constructor(scene, position, onToggle, audio = null) {
    this.position = position
    this.body = position.solid ? { x: position.x, y: position.y, w: .32, h: 1 } : null
    this.on = false
    this.onToggle = onToggle
    this.audio = audio
    this.mesh = createMesh({ w: .22, h: 1 }, '#86b8bd')
    this.mesh.position.set(position.x, position.y, .1)
    scene.add(this.mesh)
  }

  update(player, input, busy = false) {
    if (busy) return
    if (input.grabPressed && Math.hypot(player.body.x - this.position.x, player.body.y - this.position.y) < 1.7) {
      this.on = !this.on
      this.mesh.rotation.z = this.on ? -.8 : .8
      this.onToggle(this.on)
      this.audio?.leverClunk()
    }
  }
  save() { return this.on }
  collider() { return this.body }
  restore(value) { this.on = value; this.mesh.rotation.z = value ? -.8 : .8; this.onToggle(value) }
}

export class Door {
  constructor(scene, position) {
    this.body = { x: position.x, y: position.y, w: .7, h: position.h || 2.5 }
    this.mesh = createMesh(this.body, '#30424a')
    scene.add(this.mesh)
    this.open = false
    this.sync()
  }

  setOpen(open) { this.open = open; this.sync() }
  collider() { return this.open ? null : this.body }
  save() { return this.open }
  restore(value) { this.open = value; this.sync() }
  sync() { this.mesh.position.set(this.body.x, this.open ? this.body.y + 3.5 : this.body.y, 0) }
}

export class PressurePlate {
  constructor(scene, position, onChange) {
    this.body = { x: position.x, y: position.y, w: 1.35, h: .2 }
    this.onChange = onChange
    this.pressed = false
    this.mesh = createMesh(this.body, '#6c7d62')
    scene.add(this.mesh)
    this.mesh.position.set(position.x, position.y, 0)
  }

  update(box) {
    const pressed = Math.abs(box.body.x - this.body.x) < .85 && Math.abs(box.body.y - (this.body.y + .6)) < .8
    if (pressed !== this.pressed) { this.pressed = pressed; this.mesh.material.color.set(pressed ? '#a2bd6a' : '#6c7d62'); this.onChange(pressed) }
  }
}
