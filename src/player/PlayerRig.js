import * as THREE from 'three'

export class PlayerRig {
  constructor() {
    this.root = new THREE.Group()
    const material = new THREE.MeshStandardMaterial({ color: '#b8d0d0', roughness: .92 })
    const dark = new THREE.MeshStandardMaterial({ color: '#50636b', roughness: 1 })
    this.body = new THREE.Mesh(new THREE.CapsuleGeometry(.28, .7, 4, 8), material)
    this.body.position.y = .58
    this.head = new THREE.Mesh(new THREE.SphereGeometry(.24, 8, 8), material)
    this.head.position.y = 1.15
    this.legs = [-1, 1].map((side) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(.13, .55, .15), dark)
      leg.position.set(side * .12, .15, 0)
      this.root.add(leg)
      return leg
    })
    this.root.add(this.body, this.head)
    this.root.traverse((mesh) => { if (mesh.isMesh) mesh.castShadow = true })
  }

  update(x, y, speed, facing, time, grounded = false, verticalSpeed = 0, landingSquash = 0, pushing = false) {
    this.root.position.set(x, y - .9, 0)
    this.root.scale.x = facing
    this.root.scale.y = 1 - landingSquash * .1
    const moving = Math.min(Math.abs(speed) / 5, 1)
    const idle = grounded && moving < .08 ? Math.sin(time * 2.2) * .025 : 0
    const swing = Math.sin(time * 13) * moving * .45
    this.legs[0].rotation.z = swing
    this.legs[1].rotation.z = -swing
    this.head.position.y = 1.15 + idle
    this.body.rotation.z = -speed * .045 - (pushing ? .1 : 0)
    this.head.rotation.z = !grounded && Math.abs(verticalSpeed) < 1.4 ? -facing * .14 : 0
  }
}
