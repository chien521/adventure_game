import * as THREE from 'three'
import { createModelSlot } from '../core/AssetLoader.js'

// Natural bounding sizes (world units) of the replacement glTF models, measured once from their
// accessor bounds — used below to scale each model to match this game's previous primitive dimensions.
const NATURAL = {
  house: { w: 1.3, h: .834, d: 1.028 },
  tree: { h: 1.708 },
  bush: { h: .244 },
}

// Depth layers behind the play plane (z=0), each drifting at a fraction of camera speed for parallax.
const LAYERS = [
  { z: -4, factor: .55 },
  { z: -7.5, factor: .28 },
  { z: -11, factor: .1 },
]

function buildParallaxLayers(scene, chapter, buildStructure) {
  const groups = LAYERS.map((layer) => {
    const group = new THREE.Group()
    group.position.z = layer.z
    scene.add(group)
    return { group, factor: layer.factor }
  })
  chapter.backgrounds.forEach((structure, index) => {
    const { group } = groups[index % groups.length]
    buildStructure(group, structure)
  })
  return {
    groups,
    update(dt, cameraX) {
      groups.forEach(({ group, factor }) => { group.position.x = cameraX * (1 - factor) })
    },
  }
}

function addHouseMotif(parallax, chapter, close = false, scene = null) {
  const x = close ? chapter.destinationX : chapter.exitX - 1.5
  const targetHeight = close ? 3.2 : 1.5
  // Fallback keeps the old box-and-roof silhouette (minus the separate roof/window pieces, folded
  // into one box) so a missing/broken model still reads as "a house" at roughly the right size.
  const fallback = new THREE.Mesh(new THREE.BoxGeometry(close ? 2.4 : 1.1, targetHeight, close ? .8 : .3), new THREE.MeshStandardMaterial({ color: close ? '#536063' : '#26342c', roughness: 1 }))
  fallback.position.y = targetHeight / 2
  const house = createModelSlot(fallback, '/models/suburban/house.glb', {
    tintColor: chapter.palette.structure,
    scale: targetHeight / NATURAL.house.h,
    anchor: 'ground',
  })
  house.position.set(x, 0, 0)
  // The close house is the journey's destination: world-anchored in the chapter group so the
  // ending walk actually arrives at it (a parallax layer would keep sliding it ahead of the camera).
  if (close) scene.add(house)
  else parallax.groups[2].group.add(house)
}

export function buildOutskirtsAmbient(scene, chapter) {
  // Every third background slot uses a bush instead of a tree, for a bit of silhouette variety.
  let structureIndex = 0
  const parallax = buildParallaxLayers(scene, chapter, (group, structure) => {
    const useBush = structureIndex % 3 === 2
    structureIndex += 1
    const modelPath = useBush ? '/models/nature/bush.glb' : (chapter.season === 'summer' ? '/models/nature/tree.glb' : '/models/nature/tree-fall.glb')
    const naturalHeight = useBush ? NATURAL.bush.h : NATURAL.tree.h
    const fallback = new THREE.Mesh(new THREE.BoxGeometry(2.1, structure.h, .6), new THREE.MeshStandardMaterial({ color: chapter.palette.structure, roughness: 1 }))
    fallback.position.y = structure.h / 2
    const prop = createModelSlot(fallback, modelPath, { tintColor: chapter.palette.accent, scale: structure.h / naturalHeight, anchor: 'ground' })
    prop.position.set(structure.x, -.5, 0)
    group.add(prop)
  })
  addHouseMotif(parallax, chapter)

  const isSummer = chapter.season === 'summer'
  const rain = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: isSummer ? '#ffe3a0' : '#a9d5a1', size: isSummer ? .055 : .04, transparent: true, opacity: .38 }))
  const drops = new Float32Array(170 * 3)
  for (let index = 0; index < 170; index += 1) {
    drops[index * 3] = -26 + Math.random() * 54
    drops[index * 3 + 1] = Math.random() * 13
    drops[index * 3 + 2] = -1 - Math.random() * 5
  }
  rain.geometry.setAttribute('position', new THREE.BufferAttribute(drops, 3))
  scene.add(rain)
  return {
    update(dt, cameraX) {
      const points = rain.geometry.attributes.position
      for (let index = 0; index < points.count; index += 1) {
        points.array[index * 3 + 1] += isSummer ? dt * (.35 + (index % 3) * .08) : -dt * 1.8
        points.array[index * 3] += isSummer ? Math.sin(index * 1.7 + points.array[index * 3 + 1]) * dt * .2 : 0
        if (isSummer && points.array[index * 3 + 1] > 13) points.array[index * 3 + 1] = -.5
        if (!isSummer && points.array[index * 3 + 1] < -.5) points.array[index * 3 + 1] = 13
      }
      points.needsUpdate = true
      parallax.update(dt, cameraX)
    },
  }
}

export function buildWorksAmbient(scene, chapter) {
  // Left as primitives on purpose: these represent distant factory stacks/pipes for the industrial
  // "works" chapter, and the nature-kit trees/bushes used elsewhere for background silhouettes would
  // read as visually wrong here rather than just stylistically different. No suitable industrial
  // silhouette exists in the fetched packs, so this stays a primitive rather than forcing a poor match.
  const material = new THREE.MeshStandardMaterial({ color: chapter.palette.structure, roughness: .95 })
  const pipeMaterial = new THREE.MeshStandardMaterial({ color: '#7a492c', roughness: .8 })
  const parallax = buildParallaxLayers(scene, chapter, (group, structure) => {
    const stack = new THREE.Mesh(new THREE.BoxGeometry(2.8, structure.h, .7), material)
    stack.position.set(structure.x, structure.h / 2 - .5, 0)
    group.add(stack)
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, 5, 8), pipeMaterial)
    pipe.rotation.z = Math.PI / 2
    pipe.position.set(structure.x, 5.3, .7)
    group.add(pipe)
  })
  addHouseMotif(parallax, chapter)
  const glow = new THREE.PointLight(chapter.palette.accent, 3, 9, 2)
  glow.position.set(2, 4.5, 1)
  scene.add(glow)
  return { update(dt, cameraX) { parallax.update(dt, cameraX) } }
}

export function buildWinterAmbient(scene, chapter) {
  const parallax = buildParallaxLayers(scene, chapter, () => {})
  addHouseMotif(parallax, chapter)
  addHouseMotif(parallax, chapter, true, scene)
  const snow = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: '#ffffff', size: .045, transparent: true, opacity: .6 }))
  const flakes = new Float32Array(85 * 3)
  for (let index = 0; index < 85; index += 1) {
    flakes[index * 3] = -20 + Math.random() * 110
    flakes[index * 3 + 1] = Math.random() * 12
    flakes[index * 3 + 2] = -1 - Math.random() * 5
  }
  snow.geometry.setAttribute('position', new THREE.BufferAttribute(flakes, 3))
  scene.add(snow)
  return {
    update(dt, cameraX) {
      const points = snow.geometry.attributes.position
      for (let index = 0; index < points.count; index += 1) {
        points.array[index * 3 + 1] -= dt * .8
        points.array[index * 3] += Math.sin(index + points.array[index * 3 + 1]) * dt * .12
        if (points.array[index * 3 + 1] < -.5) points.array[index * 3 + 1] = 12
      }
      points.needsUpdate = true
      parallax.update(dt, cameraX)
    },
  }
}
