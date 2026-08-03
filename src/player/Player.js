import * as THREE from 'three'
import { moveAndCollide } from '../core/Physics2D.js'
import { PlayerRig } from './PlayerRig.js'

const WALK_SPEED = 3
const RUN_SPEED = 5.6
const TIME_TO_RUN = .4

export class Player {
  constructor(scene, input, audio, position) {
    this.input = input
    this.audio = audio
    this.body = { x: position.x, y: position.y, vx: 0, vy: 0, hw: .28, hh: .9, grounded: false }
    this.facing = 1
    this.coyote = 0
    this.jumpBuffer = 0
    this.jumpsRemaining = 1
    this.bonusJumpReady = false
    this.movableBlockJumpSource = false
    this.jumpLaunchBlock = null
    this.jumpLaunchClearance = 0
    this.carriedBox = null
    this.holdTime = 0
    this.footstepTimer = 0
    this.time = 0
    this.pushing = false
    this.landingSquash = 0
    this.landingCount = 0
    this.dustBursts = []
    this.effectGroup = new THREE.Group()
    this.rig = new PlayerRig()
    scene.add(this.effectGroup)
    scene.add(this.rig.root)
  }

  spawnDust() {
    const count = 10
    const positions = new Float32Array(count * 3)
    const velocity = []
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = this.body.x + (Math.random() - .5) * .45
      positions[index * 3 + 1] = this.body.y - this.body.hh + .06
      positions[index * 3 + 2] = .2
      velocity.push({ x: (Math.random() - .5) * 3.2, y: .7 + Math.random() * 1.6 })
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({ color: '#c6b69d', size: .12, transparent: true, opacity: .75, depthWrite: false })
    const points = new THREE.Points(geometry, material)
    this.effectGroup.add(points)
    this.dustBursts.push({ points, velocity, age: 0 })
  }

  updateDust(dt) {
    for (let index = this.dustBursts.length - 1; index >= 0; index -= 1) {
      const burst = this.dustBursts[index]
      burst.age += dt
      const positions = burst.points.geometry.attributes.position
      burst.velocity.forEach((velocity, particle) => {
        velocity.y -= 7 * dt
        positions.array[particle * 3] += velocity.x * dt
        positions.array[particle * 3 + 1] += velocity.y * dt
      })
      positions.needsUpdate = true
      burst.points.material.opacity = Math.max(0, .75 * (1 - burst.age / .3))
      if (burst.age >= .3) {
        this.effectGroup.remove(burst.points)
        burst.points.geometry.dispose()
        burst.points.material.dispose()
        this.dustBursts.splice(index, 1)
      }
    }
  }

  setPushing(value) { this.pushing = value }

  armBonusJump(block) { this.movableBlockJumpSource = block }

  update(dt, colliders) {
    this.time += dt
    this.jumpLaunchClearance = Math.max(0, this.jumpLaunchClearance - dt)
    if (this.jumpLaunchClearance === 0) this.jumpLaunchBlock = null
    const wasGrounded = this.body.grounded
    const previousVy = this.body.vy
    const axis = this.input.axis()
    if (axis) this.facing = axis

    this.holdTime = axis ? this.holdTime + dt : 0
    const runFactor = Math.min(this.holdTime / TIME_TO_RUN, 1)
    const targetSpeed = axis * (WALK_SPEED + (RUN_SPEED - WALK_SPEED) * runFactor)
    const acceleration = this.body.grounded ? 24 : 12
    this.body.vx += Math.max(-acceleration * dt, Math.min(acceleration * dt, targetSpeed - this.body.vx))
    if (!axis && this.body.grounded) this.body.vx *= Math.max(0, 1 - 14 * dt)

    if (this.body.grounded) {
      this.jumpsRemaining = 1
      this.bonusJumpReady = false
    }
    this.coyote = this.body.grounded ? .1 : Math.max(0, this.coyote - dt)
    this.jumpBuffer = this.input.jumpPressed ? .1 : Math.max(0, this.jumpBuffer - dt)
    const canGroundJump = (this.body.grounded || this.coyote > 0) && this.jumpsRemaining > 0
    if (this.jumpBuffer && (canGroundJump || this.bonusJumpReady)) {
      this.body.vy = 9.1
      if (canGroundJump) {
        this.jumpsRemaining -= 1
        this.bonusJumpReady = Boolean(this.movableBlockJumpSource)
        if (this.movableBlockJumpSource) {
          this.jumpLaunchBlock = this.movableBlockJumpSource
          this.jumpLaunchClearance = .16
        }
      }
      else this.bonusJumpReady = false
      this.coyote = 0
      this.jumpBuffer = 0
      this.audio.jump()
    }
    if (!this.input.down('jump') && this.body.vy > 2.6) this.body.vy -= 27 * dt
    this.body.vy -= 25 * dt

    const jumpColliders = this.jumpLaunchBlock ? colliders.filter((collider) => collider !== this.jumpLaunchBlock.collider()) : colliders
    moveAndCollide(this.body, dt, jumpColliders)
    this.movableBlockJumpSource = false

    if (this.body.grounded && !wasGrounded && previousVy < -4) {
      this.audio.land()
      this.spawnDust()
      this.landingSquash = 1
      this.landingCount += 1
    }
    if (this.body.grounded && Math.abs(this.body.vx) > .5) {
      this.footstepTimer -= dt
      if (this.footstepTimer <= 0) { this.audio.footstep(); this.footstepTimer = Math.max(.16, .32 - Math.abs(this.body.vx) * .02) }
    } else this.footstepTimer = 0

    this.landingSquash = Math.max(0, this.landingSquash - dt * 5)
    this.updateDust(dt)
    this.rig.update(this.body.x, this.body.y, this.body.vx, this.facing, this.time, this.body.grounded, this.body.vy, this.landingSquash, this.pushing, Boolean(this.carriedBox))
  }

  reset(position) {
    if (this.carriedBox) this.carriedBox.carried = false
    this.carriedBox = null
    this.body.x = position.x
    this.body.y = position.y
    this.body.vx = 0
    this.body.vy = 0
    this.coyote = 0
    this.jumpBuffer = 0
    this.jumpsRemaining = 1
    this.bonusJumpReady = false
    this.movableBlockJumpSource = false
    this.jumpLaunchBlock = null
    this.jumpLaunchClearance = 0
    this.holdTime = 0
    this.footstepTimer = 0
    this.pushing = false
    this.landingSquash = 0
  }
}
