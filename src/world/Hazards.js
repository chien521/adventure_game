import * as THREE from 'three'
import { overlaps } from '../core/Physics2D.js'

export class KillVolume {
  constructor(scene, bounds) {
    this.bounds = { ...bounds }
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(bounds.w, bounds.h, .25), new THREE.MeshBasicMaterial({ color: '#b14545', transparent: true, opacity: .35 }))
    mesh.position.set(bounds.x, bounds.y, -.1)
    scene.add(mesh)
  }

  hits(player) { return overlaps(player.body, this.bounds) }
}

export class Searchlight {
  constructor(scene, { x, y, range, color = '#b4e5eb', sweepRate = .72, sweepAmplitude = 3.4 }) {
    this.x = x
    this.y = y
    this.range = range
    this.sweepRate = sweepRate
    this.sweepAmplitude = sweepAmplitude
    this.exposure = 0
    this.angle = 0
    this.light = new THREE.SpotLight(color, 10, range + 2, .34, .55, 1)
    this.light.position.set(x, y, 2)
    this.target = new THREE.Object3D()
    this.target.position.set(x - range, 0, 0)
    scene.add(this.light, this.target)
    this.light.target = this.target
  }

  update(dt, player, blockers = []) {
    this.angle += dt * this.sweepRate
    const sweep = Math.sin(this.angle) * this.sweepAmplitude
    this.target.position.set(this.x - this.range * .54, .7 + sweep, 0)
    const dx = player.body.x - this.x
    const dy = player.body.y - this.y
    const towardPlayer = Math.atan2(dy, dx)
    const towardBeam = Math.atan2(this.target.position.y - this.y, this.target.position.x - this.x)
    const blocked = blockers.some((blocker) => {
      if (Math.abs(dx) < 1e-6) return false
      const minX = Math.min(this.x, player.body.x)
      const maxX = Math.max(this.x, player.body.x)
      if (blocker.x - blocker.w / 2 <= minX || blocker.x + blocker.w / 2 >= maxX) return false
      const beamY = this.y + (player.body.y - this.y) * ((blocker.x - this.x) / (player.body.x - this.x))
      return beamY > blocker.y - blocker.h / 2 - .1 && beamY < blocker.y + blocker.h / 2 + .1
    })
    const visible = !blocked && Math.hypot(dx, dy) < this.range && Math.abs(Math.atan2(Math.sin(towardPlayer - towardBeam), Math.cos(towardPlayer - towardBeam))) < .18
    this.exposure = visible ? this.exposure + dt : Math.max(0, this.exposure - dt * 2)
  }

  hits() { return this.exposure > .5 }
}

export class Crusher {
  // minY is the lowest point of the stroke (default tuned for ground level); raise it for
  // crushers hanging over elevated platforms so the head doesn't punch through the floor below.
  constructor(scene, { x, y, w, minY = 1.05 }, color = '#8a5a2e') {
    this.x = x
    this.y = y
    this.w = w
    this.minY = minY
    this.time = 0
    this.height = y
    this.body = { x, y, w, h: 1.1 }
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, .9), new THREE.MeshStandardMaterial({ color, roughness: .85 }))
    this.mesh.castShadow = true
    scene.add(this.mesh)
    this.sync()
  }

  update(dt) { this.time += dt; this.height = this.minY + (Math.sin(this.time * 3.2) * .5 + .5) * (this.y - this.minY); this.body.y = this.height; this.sync() }
  hits(player) { return Math.abs(player.body.x - this.x) < this.w / 2 + player.body.hw && player.body.y + player.body.hh > this.height - .6 && this.height < this.minY + .5 }
  // Only solidify once retracted enough to be safe. If the player is already standing where the
  // crusher now occupies (they walked through while it was low and it swung back up under them
  // mid-stride), stay non-solid a beat longer rather than materializing on top of them and
  // ejecting them out sideways — wait until they've cleared the footprint on their own.
  collider(player) {
    if (this.height < this.minY + .5) return null
    if (player && Math.abs(player.body.x - this.x) < this.w / 2 + player.body.hw && Math.abs(player.body.y - this.height) < player.body.hh + this.body.h / 2) return null
    return this.body
  }
  sync() { this.mesh.position.set(this.x, this.height, 0) }
}

