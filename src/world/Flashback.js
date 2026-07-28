import * as THREE from 'three'

const DURATION = 7.5
const silhouetteMaterial = new THREE.MeshBasicMaterial({ color: '#11191a' })
const accentMaterial = new THREE.MeshBasicMaterial({ color: '#d9e6d8' })

const addBox = (group, width, height, x, y, material = silhouetteMaterial) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, .3), material)
  mesh.position.set(x, y, 0)
  group.add(mesh)
  return mesh
}

const addFigure = (group, x, y, scale = 1) => {
  const figure = new THREE.Group()
  const torso = addBox(figure, .42 * scale, .92 * scale, 0, .72 * scale)
  const head = new THREE.Mesh(new THREE.CircleGeometry(.22 * scale, 16), silhouetteMaterial)
  head.position.set(0, 1.34 * scale, .02)
  const leftLeg = addBox(figure, .14 * scale, .65 * scale, -.13 * scale, .1 * scale)
  const rightLeg = addBox(figure, .14 * scale, .65 * scale, .13 * scale, .1 * scale)
  const leftArm = addBox(figure, .12 * scale, .65 * scale, -.31 * scale, .76 * scale)
  const rightArm = addBox(figure, .12 * scale, .65 * scale, .31 * scale, .76 * scale)
  figure.add(head)
  figure.position.set(x, y, .1)
  group.add(figure)
  return { figure, torso, head, leftLeg, rightLeg, leftArm, rightArm }
}

const smooth = (value) => value * value * (3 - 2 * value)
const between = (elapsed, start, end) => smooth(Math.min(1, Math.max(0, (elapsed - start) / (end - start))))

export class Flashback {
  constructor(scene, season) {
    this.scene = scene
    this.season = season
    this.elapsed = 0
    this.group = new THREE.Group()
    this.group.position.z = 5
    this.hiddenObjects = scene.children.map((object) => ({ object, visible: object.visible }))
    this.hiddenObjects.forEach(({ object }) => { object.visible = false })
    this.scene.add(this.group)

    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(32, 18), new THREE.MeshBasicMaterial({ color: '#d7dfd7' }))
    backdrop.position.set(0, 4, -1)
    this.group.add(backdrop)
    const ground = addBox(this.group, 32, .38, 0, -.15, new THREE.MeshBasicMaterial({ color: '#627275' }))
    ground.position.z = -.1
    this.light = new THREE.PointLight('#fff0b7', 3.4, 9, 2)
    this.light.position.set(-1, 3.2, 1)
    this.group.add(this.light)

    if (season === 'spring') this.buildSpring()
    else if (season === 'summer') this.buildSummer()
    else if (season === 'autumn') this.buildAutumn()
    else this.buildWinter()
  }

  buildSpring() {
    addBox(this.group, 2.1, 4.4, -2.8, 2.1, new THREE.MeshBasicMaterial({ color: '#32434a' }))
    addBox(this.group, 1.25, 3.55, -2.8, 1.65, accentMaterial)
    this.adult = addFigure(this.group, -1.35, .05, 1.2)
    this.child = addFigure(this.group, -2.35, .05, .68)
    this.adult.rightArm.rotation.z = -.65
    this.child.leftArm.rotation.z = .55
  }

  buildSummer() {
    for (let index = -12; index <= 12; index += 1) {
      const blade = addBox(this.group, .06, .75 + (Math.abs(index) % 3) * .14, index * .55, .25, new THREE.MeshBasicMaterial({ color: '#6e8065' }))
      blade.rotation.z = Math.sin(index) * .24
    }
    this.first = addFigure(this.group, -3.3, .05, 1.05)
    this.second = addFigure(this.group, 3.3, .05, 1.05)
  }

  buildAutumn() {
    addBox(this.group, 4.9, 1.05, 0, 1.25, new THREE.MeshBasicMaterial({ color: '#56656a' }))
    addBox(this.group, .18, 3.8, 0, 2.8, accentMaterial)
    addBox(this.group, 4.7, .16, 0, 4.62, accentMaterial)
    this.first = addFigure(this.group, -2.1, .05, 1.1)
    this.second = addFigure(this.group, 2.1, .05, 1.1)
    this.object = addBox(this.group, .22, .22, .35, 2.04, new THREE.MeshBasicMaterial({ color: '#d7a96b' }))
  }

  buildWinter() {
    this.traveler = addFigure(this.group, 0, .05, 1.15)
    this.snow = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: '#ffffff', size: .055, transparent: true, opacity: .9 }))
    const flakes = new Float32Array(90 * 3)
    for (let index = 0; index < 90; index += 1) {
      flakes[index * 3] = -8 + Math.random() * 16
      flakes[index * 3 + 1] = Math.random() * 9
      flakes[index * 3 + 2] = .4
    }
    this.snow.geometry.setAttribute('position', new THREE.BufferAttribute(flakes, 3))
    this.group.add(this.snow)
    this.snowDust = addBox(this.traveler.figure, .8, .14, 0, 1.1, new THREE.MeshBasicMaterial({ color: '#dfe9e8', transparent: true, opacity: 0 }))
  }

  update(dt, camera) {
    this.elapsed += dt
    camera.camera.position.set(0, 3.3, 15)
    camera.camera.lookAt(0, 2.35, 0)

    if (this.season === 'spring') this.updateSpring()
    else if (this.season === 'summer') this.updateSummer()
    else if (this.season === 'autumn') this.updateAutumn()
    else this.updateWinter(dt)

    return this.elapsed >= DURATION
  }

  updateSpring() {
    const kneel = between(this.elapsed, .8, 1.8)
    this.adult.figure.position.y = .05 - kneel * .4
    this.adult.figure.rotation.z = kneel * .22
    const point = between(this.elapsed, 2.1, 3.1)
    this.adult.rightArm.rotation.z = -.65 - point * .95
    const leave = between(this.elapsed, 3.3, 5.6)
    this.child.figure.position.x = -2.35 + leave * 6.7
    this.child.figure.rotation.z = Math.sin(leave * Math.PI * 5) * .08
    this.adult.leftArm.rotation.z = leave * .85
  }

  updateSummer() {
    const approach = between(this.elapsed, .6, 3.2)
    this.first.figure.position.x = -3.3 + approach * 2.7
    this.second.figure.position.x = 3.3 - approach * 2.7
    const sink = between(this.elapsed, 3.3, 4.9)
    this.first.figure.position.y = .05 - sink * .85
    this.second.figure.position.y = .05 - sink * .85
    const turn = between(this.elapsed, 5.1, 5.7) - between(this.elapsed, 6.05, 6.65)
    this.second.figure.rotation.y = turn * Math.PI / 2
  }

  updateAutumn() {
    const argue = Math.sin(Math.min(this.elapsed, 3.3) * 4) * .19
    this.first.leftArm.rotation.z = argue
    this.second.rightArm.rotation.z = -argue
    const drop = between(this.elapsed, 2.8, 3.7)
    this.object.position.y = 2.04 - drop * 1.95
    this.object.rotation.z = drop * 4
    const exit = between(this.elapsed, 3.8, 5.5)
    this.second.figure.position.x = 2.1 + exit * 4.4
    this.first.figure.rotation.z = exit * -.12
  }

  updateWinter(dt) {
    const sit = between(this.elapsed, 1.1, 3.3)
    this.traveler.figure.position.y = .05 - sit * .72
    this.traveler.figure.rotation.z = sit * -.25
    this.snowDust.material.opacity = between(this.elapsed, 3.6, 6.4) * .9
    const points = this.snow.geometry.attributes.position
    for (let index = 0; index < points.count; index += 1) {
      points.array[index * 3 + 1] -= dt * .9
      if (points.array[index * 3 + 1] < -.3) points.array[index * 3 + 1] = 8
    }
    points.needsUpdate = true
    if (this.elapsed > 6.35) this.group.visible = false
  }

  dispose() {
    this.group.traverse((object) => {
      if (object.geometry) object.geometry.dispose()
      if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => material.dispose())
    })
    this.scene.remove(this.group)
    this.hiddenObjects.forEach(({ object, visible }) => { object.visible = visible })
  }
}