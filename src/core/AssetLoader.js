import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const gltfLoader = new GLTFLoader()
const parseCache = new Map()

// Parses (and caches) the glTF at `path` once; resolves to the parsed scene, or null if the file is
// missing/broken so callers can fall back to their primitive geometry instead of crashing.
function parseModel(path) {
  if (!parseCache.has(path)) {
    parseCache.set(path, new Promise((resolve) => {
      gltfLoader.load(
        path,
        (gltf) => resolve(gltf.scene),
        undefined,
        (error) => {
          console.warn(`[AssetLoader] failed to load model "${path}" — falling back to primitive geometry.`, error)
          resolve(null)
        },
      )
    }))
  }
  return parseCache.get(path)
}

// Returns a fresh clone of the model at `path` (safe to transform independently per instance),
// or null if it failed/is still failing to load.
export function loadModel(path) {
  return parseModel(path).then((scene) => (scene ? scene.clone(true) : null))
}

// Tints every mesh material in `object` toward `hexColor` by `strength` (0 = untouched, 1 = replaced
// outright). Kenney's stock materials are fairly light/neutral so a straight color lerp reads well;
// if a particular pack's models are too dark/saturated for this to look right, that model should be
// left as a primitive rather than forced through this path (see call sites for notes on exceptions).
// Clones materials per mesh so tinting one instance never affects another sharing the same cached model.
export function tintObject(object, hexColor, strength = .5) {
  const target = new THREE.Color(hexColor)
  const materials = []
  object.traverse((child) => {
    if (!child.isMesh) return
    child.castShadow = true
    child.receiveShadow = true
    child.material = child.material.clone()
    child.material.color.lerp(target, strength)
    materials.push(child.material)
  })
  return materials
}

function collectMaterials(object) {
  const materials = []
  object.traverse((child) => {
    if (!child.isMesh) return
    child.castShadow = true
    child.receiveShadow = true
    materials.push(child.material)
  })
  return materials
}

// Wraps `fallback` (an already-positioned/sized primitive Mesh) in a Group that stands in for it.
// The fallback renders immediately; once the model at `path` resolves it is recentered, scaled and
// (optionally) tinted, then swapped in in place of the fallback. Scale can be uniform (a number) or
// per-axis ({ x, y, z }) for objects like doors/plates whose target footprint isn't a uniform stretch
// of the source model. `anchor` controls how the model is recentered within the group: 'center' (the
// default, matching this game's centered-BoxGeometry interactables) puts the group origin at the
// model's bounding-box center; 'ground' puts it at the horizontal center but vertical *bottom*,
// matching Ambient.js's convention of positioning decorative props by their base (y=0 = standing on
// the ground).
//
// The returned group also exposes a `.material` shim mirroring the single-Mesh API used elsewhere in
// this codebase (`color.set`, `emissive.set`, `emissiveIntensity`, `opacity`, `transparent`) so
// existing call sites that reach into `thing.mesh.material` keep working unmodified whether the
// fallback or the (possibly multi-material) loaded model is currently showing.
export function createModelSlot(fallback, path, { tintColor, scale = 1, anchor = 'center', onLoad } = {}) {
  const group = new THREE.Group()
  fallback.traverse((child) => {
    if (!child.isMesh) return
    child.castShadow = true
    child.receiveShadow = true
  })
  group.add(fallback)
  let materials = collectMaterials(fallback)
  // Tracks values set through the shim after construction (state changes like a pressure plate's
  // opacity, or Winter's one-off color/emissive overrides) so they can be replayed onto whichever
  // model swap happens to occur after them, since the swap replaces `materials` wholesale.
  const state = {}

  const materialShim = {
    get color() { return { set: (value) => { state.color = value; materials.forEach((m) => m.color.set(value)) } } },
    get emissive() { return { set: (value) => { state.emissive = value; materials.forEach((m) => { if (m.emissive) m.emissive.set(value) }) } } },
    get emissiveIntensity() { return materials[0]?.emissiveIntensity ?? 0 },
    set emissiveIntensity(value) { state.emissiveIntensity = value; materials.forEach((m) => { if ('emissiveIntensity' in m) m.emissiveIntensity = value }) },
    get opacity() { return materials[0]?.opacity ?? 1 },
    set opacity(value) { state.opacity = value; materials.forEach((m) => { m.opacity = value }) },
    get transparent() { return materials[0]?.transparent ?? false },
    set transparent(value) { state.transparent = value; materials.forEach((m) => { m.transparent = value }) },
    // ChapterLoader.dispose() traverses every object and, if it has a `.material`, calls
    // `.dispose()` on it — this shim needs to forward that to the real material(s) it wraps.
    dispose() { materials.forEach((m) => m.dispose()) },
  }
  Object.defineProperty(group, 'material', { get: () => materialShim })

  if (path) {
    loadModel(path).then((model) => {
      if (!model) return
      const scaleVector = typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : new THREE.Vector3(scale.x, scale.y, scale.z)
      model.scale.copy(scaleVector)
      model.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      if (anchor === 'ground') model.position.set(-center.x, -box.min.y, -center.z)
      else model.position.sub(center)
      materials = tintColor ? tintObject(model, tintColor) : collectMaterials(model)
      if (state.color !== undefined) materials.forEach((m) => m.color.set(state.color))
      if (state.emissive !== undefined) materials.forEach((m) => { if (m.emissive) m.emissive.set(state.emissive) })
      if (state.emissiveIntensity !== undefined) materials.forEach((m) => { if ('emissiveIntensity' in m) m.emissiveIntensity = state.emissiveIntensity })
      if (state.opacity !== undefined) materials.forEach((m) => { m.opacity = state.opacity })
      if (state.transparent !== undefined) materials.forEach((m) => { m.transparent = state.transparent })
      group.remove(fallback)
      fallback.traverse((child) => {
        if (!child.isMesh) return
        child.geometry.dispose()
        child.material.dispose()
      })
      group.add(model)
      onLoad?.(model)
    })
  }
  return group
}
