import * as THREE from 'three'
import { overlaps } from '../core/Physics2D.js'
import { createModelSlot } from '../core/AssetLoader.js'

// Natural bounding size (world units) of the replacement glTF model, measured once from its
// accessor bounds — used below to scale the model to match this game's previous primitive dimensions.
export const NATURAL = { spikeBlock: { w: .9, h: .9 }, movingBlock: { w: 1, h: .3 } }

// Left as a plain translucent volume on purpose: this is a trigger-zone indicator (an invisible/
// semi-transparent hazard boundary), not a physical prop, so no model in the fetched packs is a
// better fit than a simple tinted box.
export class KillVolume {
  constructor(scene, bounds, { visible = true } = {}) {
    this.bounds = { ...bounds }
    if (visible) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(bounds.w, bounds.h, .25), new THREE.MeshBasicMaterial({ color: '#b14545', transparent: true, opacity: .35 }))
      mesh.position.set(bounds.x, bounds.y, -.1)
      scene.add(mesh)
    }
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
  // model lets a call site swap the visual for cases where a Crusher is reused as a plain moving
  // platform rather than an actual crushing hazard (see autumn's loadWorks) — the spiky default
  // reads as dangerous, which is wrong for something the player is meant to stand on safely.
  constructor(scene, { x, y, w, minY = 1.05, phase = Math.PI / 2 }, color = '#8a5a2e', model = { path: '/models/platformer/spike-block.glb', natural: NATURAL.spikeBlock }) {
    this.x = x
    this.y = y
    this.w = w
    this.minY = minY
    this.phase = phase
    this.time = 0
    this.height = this.positionAt(0)
    this.body = { x, y: this.height, w, h: 1.1 }
    const fallback = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, .9), new THREE.MeshStandardMaterial({ color, roughness: .85 }))
    this.mesh = createModelSlot(fallback, model.path, {
      tintColor: color,
      scale: { x: w / model.natural.w, y: 1.1 / model.natural.h, z: w / model.natural.w },
    })
    scene.add(this.mesh)
    this.sync()
  }

  update(dt, player) {
    const previousHeight = this.height
    const previousTop = previousHeight + this.body.h / 2
    const carriesPlayer = player && Math.abs(player.body.x - this.x) < this.w / 2 + player.body.hw - .01 && Math.abs(player.body.y - player.body.hh - previousTop) < .12
    this.time += dt
    this.height = this.positionAt(this.time)
    this.body.y = this.height
    if (carriesPlayer) {
      player.body.y += this.height - previousHeight
      player.body.vy = 0
      player.body.grounded = true
    }
    this.sync()
  }
  positionAt(time) { return this.minY + (Math.sin(time * 3.2 + this.phase) * .5 + .5) * (this.y - this.minY) }
  hits(player) { return Math.abs(player.body.x - this.x) < this.w / 2 + player.body.hw && player.body.y + player.body.hh > this.height - .6 && this.height < this.minY + .5 }
  collider() { return this.body }
  sync() { this.mesh.position.set(this.x, this.height, 0) }
}

