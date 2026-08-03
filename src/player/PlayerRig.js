import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'

const WANDERER_MODEL_URL = `${import.meta.env.BASE_URL}models/player/wanderer.glb`

export class PlayerRig {
  constructor() {
    this.root = new THREE.Group()
    this.avatar = null
    this.avatarBones = null
    this.avatarRestRotations = new Map()
    this.avatarRoot = new THREE.Group()
    this.modelRoot = new THREE.Group()
    this.mixer = null
    this.actions = null
    this.currentAction = null
    this.lastUpdateTime = null
    this.fallback = new THREE.Group()
    const coat = new THREE.MeshStandardMaterial({ color: '#465b69', roughness: .95 })
    const trousers = new THREE.MeshStandardMaterial({ color: '#293744', roughness: 1 })
    const skin = new THREE.MeshStandardMaterial({ color: '#b77f62', roughness: .92 })
    const gray = new THREE.MeshStandardMaterial({ color: '#c7c4b8', roughness: 1 })
    const hat = new THREE.MeshStandardMaterial({ color: '#6c5849', roughness: .95 })
    const leather = new THREE.MeshStandardMaterial({ color: '#624437', roughness: 1 })
    this.body = new THREE.Mesh(new THREE.CapsuleGeometry(.29, .62, 5, 10), coat)
    this.body.position.y = .62
    this.head = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 10), skin)
    this.head.position.y = 1.2
    const beard = new THREE.Mesh(new THREE.ConeGeometry(.17, .29, 8), gray)
    beard.position.set(0, 1.06, -.18)
    beard.rotation.x = Math.PI
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .045, 12), hat)
    hatBrim.position.y = 1.37
    const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(.18, .22, .18, 12), hat)
    hatCrown.position.y = 1.47
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(.35, .48, .16), leather)
    backpack.position.set(0, .73, .24)
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(.025, .035, 1.3, 6), leather)
    staff.position.set(.39, .53, .03)
    staff.rotation.z = -.12
    this.legs = [-1, 1].map((side) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(.14, .57, .17), trousers)
      leg.position.set(side * .12, .15, 0)
      this.fallback.add(leg)
      return leg
    })
    this.fallback.add(this.body, this.head, beard, hatBrim, hatCrown, backpack, staff)
    this.root.add(this.fallback, this.modelRoot, this.avatarRoot)
    this.root.traverse((mesh) => { if (mesh.isMesh) mesh.castShadow = true })
    this.loadWandererModel()
  }

  // Loads the default low-poly wanderer model (KayKit Adventurers "Mage", CC0) as a replacement for
  // the primitive fallback. If it fails to load, the fallback stays visible and a warning is logged —
  // this must never throw, since it runs unattended at construction time.
  async loadWandererModel() {
    try {
      const loader = new GLTFLoader()
      const gltf = await loader.loadAsync(WANDERER_MODEL_URL)
      const model = gltf.scene
      const bounds = new THREE.Box3().setFromObject(model)
      const size = bounds.getSize(new THREE.Vector3())
      if (size.y <= 0) throw new Error('Wanderer model has no visible height.')
      const scale = 1.65 / size.y
      model.scale.setScalar(scale)
      model.updateMatrixWorld(true)
      const scaledBounds = new THREE.Box3().setFromObject(model)
      const center = scaledBounds.getCenter(new THREE.Vector3())
      model.position.set(-center.x, -scaledBounds.min.y, -center.z)
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })

      this.mixer = new THREE.AnimationMixer(model)
      const clip = (name) => THREE.AnimationClip.findByName(gltf.animations, name)
      this.actions = {
        idle: this.mixer.clipAction(clip('Idle')),
        walk: this.mixer.clipAction(clip('Running_A')),
        jump: this.mixer.clipAction(clip('Jump_Idle')),
      }
      Object.values(this.actions).forEach((action) => { action.play(); action.setEffectiveWeight(0) })
      this.currentAction = this.actions.idle
      this.currentAction.setEffectiveWeight(1)

      this.modelRoot.add(model)
      this.fallback.visible = false
    } catch (error) {
      console.warn('[PlayerRig] failed to load wanderer model — using primitive fallback.', error)
    }
  }

  setAction(next) {
    if (!this.actions || this.currentAction === next) return
    next.reset().setEffectiveWeight(1).fadeIn(.2)
    this.currentAction.fadeOut(.2)
    this.currentAction = next
  }

  async setAvatar(url) {
    const loader = new GLTFLoader()
    loader.setCrossOrigin('anonymous')
    loader.register((parser) => new VRMLoaderPlugin(parser))
    const gltf = await loader.loadAsync(url)
    const vrm = gltf.userData.vrm
    if (!vrm) throw new Error('The selected VIVERSE avatar is not a valid VRM model.')

    VRMUtils.removeUnnecessaryVertices(gltf.scene)
    VRMUtils.removeUnnecessaryJoints(gltf.scene)
    const bounds = new THREE.Box3().setFromObject(gltf.scene)
    const size = bounds.getSize(new THREE.Vector3())
    if (size.y <= 0) throw new Error('The selected VIVERSE avatar has no visible height.')

    // This changes only the mesh. Player.body remains the fixed collision hitbox.
    const scale = 4 / size.y
    gltf.scene.scale.setScalar(scale)
    gltf.scene.updateMatrixWorld(true)
    const scaledBounds = new THREE.Box3().setFromObject(gltf.scene)
    const center = scaledBounds.getCenter(new THREE.Vector3())
    gltf.scene.position.set(-center.x, -scaledBounds.min.y, -center.z)
    gltf.scene.traverse((child) => {
      child.visible = true
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        child.frustumCulled = false
      }
    })

    this.avatarRoot.clear()
    this.avatarRoot.add(gltf.scene)
    this.avatar = vrm
    this.avatarBones = this.getAvatarBones(vrm)
    this.avatarRestRotations = new Map(Object.values(this.avatarBones)
      .filter(Boolean)
      .map((bone) => [bone, bone.quaternion.clone()]))
    this.fallback.visible = false
    this.modelRoot.visible = false
  }

  getAvatarBones(vrm) {
    const bone = (name) => vrm.humanoid?.getNormalizedBoneNode(name) ?? null
    return {
      leftUpperArm: bone('leftUpperArm'),
      rightUpperArm: bone('rightUpperArm'),
      leftLowerArm: bone('leftLowerArm'),
      rightLowerArm: bone('rightLowerArm'),
      leftUpperLeg: bone('leftUpperLeg'),
      rightUpperLeg: bone('rightUpperLeg'),
      spine: bone('spine'),
    }
  }

  rotateAvatarBone(bone, rotations) {
    const rest = this.avatarRestRotations.get(bone)
    if (!bone || !rest) return
    bone.quaternion.copy(rest)
    rotations.forEach(({ axis, angle, space = 'local' }) => {
      const rotation = new THREE.Quaternion().setFromAxisAngle(axis, angle)
      if (space === 'parent') bone.quaternion.premultiply(rotation)
      else bone.quaternion.multiply(rotation)
    })
  }

  poseAvatar(moving, grounded, verticalSpeed, time) {
    const bones = this.avatarBones
    if (!bones) return
    const stride = Math.sin(time * 13) * moving
    const airborne = !grounded
    const armLift = airborne ? .2 : 0

    // VRM avatars commonly arrive in an A/T-pose; lower the arms first, then swing them with movement.
    this.rotateAvatarBone(bones.leftUpperArm, [
      { axis: new THREE.Vector3(0, 0, 1), angle: 1.05 - armLift },
      { axis: new THREE.Vector3(1, 0, 0), angle: -stride * .52, space: 'parent' },
    ])
    this.rotateAvatarBone(bones.rightUpperArm, [
      { axis: new THREE.Vector3(0, 0, 1), angle: -1.05 + armLift },
      { axis: new THREE.Vector3(1, 0, 0), angle: stride * .52, space: 'parent' },
    ])
    this.rotateAvatarBone(bones.leftLowerArm, [{ axis: new THREE.Vector3(1, 0, 0), angle: -.12 + Math.max(0, stride) * .22 }])
    this.rotateAvatarBone(bones.rightLowerArm, [{ axis: new THREE.Vector3(1, 0, 0), angle: -.12 + Math.max(0, -stride) * .22 }])
    this.rotateAvatarBone(bones.leftUpperLeg, [{ axis: new THREE.Vector3(1, 0, 0), angle: airborne ? -.3 : -stride * .45 }])
    this.rotateAvatarBone(bones.rightUpperLeg, [{ axis: new THREE.Vector3(1, 0, 0), angle: airborne ? -.3 : stride * .45 }])
    this.rotateAvatarBone(bones.spine, [{ axis: new THREE.Vector3(0, 0, 1), angle: airborne ? Math.sign(verticalSpeed) * -.08 : 0 }])
  }

  useDefaultTraveler() {
    this.avatarRoot.clear()
    this.avatarRoot.position.set(0, 0, 0)
    this.avatarRoot.rotation.set(0, 0, 0)
    this.avatar = null
    this.avatarBones = null
    this.avatarRestRotations.clear()
    this.modelRoot.visible = this.modelRoot.children.length > 0
    this.fallback.visible = !this.modelRoot.visible
  }

  update(x, y, speed, facing, time, grounded = false, verticalSpeed = 0, landingSquash = 0, pushing = false) {
    this.root.position.set(x, y - .9, 0)
    this.root.scale.x = 1
    this.root.scale.y = 1 - landingSquash * .1
    const moving = Math.min(Math.abs(speed) / 5, 1)
    const idle = grounded && moving < .08 ? Math.sin(time * 2.2) * .025 : 0
    const swing = Math.sin(time * 13) * moving * .45
    this.legs[0].rotation.z = swing
    this.legs[1].rotation.z = -swing
    this.head.position.y = 1.15 + idle
    this.body.rotation.z = -Math.abs(speed) * .045 - (pushing ? .1 : 0)
    this.head.rotation.z = !grounded && Math.abs(verticalSpeed) < 1.4 ? -.14 : 0
    const dt = this.lastUpdateTime === null ? 0 : Math.min(time - this.lastUpdateTime, .1)
    this.lastUpdateTime = time
    if (this.avatar) {
      this.avatarRoot.rotation.y = facing > 0 ? -Math.PI / 2 : Math.PI / 2
      this.avatarRoot.position.y = idle
      this.poseAvatar(moving, grounded, verticalSpeed, time)
      this.avatar.update(1 / 60)
    } else if (this.mixer) {
      this.modelRoot.rotation.y = facing > 0 ? Math.PI / 2 : -Math.PI / 2
      this.modelRoot.position.y = idle
      this.setAction(!grounded ? this.actions.jump : moving < .08 ? this.actions.idle : this.actions.walk)
      this.mixer.timeScale = !grounded ? 1 : .6 + moving * .9
      this.mixer.update(dt)
    }
  }
}
