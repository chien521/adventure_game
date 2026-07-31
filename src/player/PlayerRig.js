import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'

export class PlayerRig {
  constructor() {
    this.root = new THREE.Group()
    this.avatar = null
    this.avatarRoot = new THREE.Group()
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
    this.root.add(this.fallback, this.avatarRoot)
    this.root.traverse((mesh) => { if (mesh.isMesh) mesh.castShadow = true })
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

    const scale = 1.65 / size.y
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
    this.fallback.visible = false
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
    if (this.avatar) {
      this.avatarRoot.rotation.y = facing > 0 ? -Math.PI / 2 : Math.PI / 2
      this.avatarRoot.position.y = idle
      this.avatar.update(1 / 60)
    }
  }
}
