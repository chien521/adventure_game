import * as THREE from 'three'
import { Box, Door, Lever, PressurePlate } from './Interactables.js'
import { KillVolume, Searchlight, Crusher } from './Hazards.js'
import { buildOutskirtsAmbient, buildWorksAmbient, buildWinterAmbient } from './Ambient.js'

export class ChapterLoader {
  constructor(scene) { this.scene = scene; this.group = null }

  dispose() {
    if (!this.group) return
    this.group.traverse((object) => {
      if (object.geometry) object.geometry.dispose()
      if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => material.dispose())
    })
    this.scene.remove(this.group)
    this.group = null
  }

  load(chapter, player, input, audio, camera, collectedKeys = new Set()) {
    this.dispose()
    this.group = new THREE.Group()
    this.scene.add(this.group)
    this.scene.background = new THREE.Color(chapter.palette.background)
    this.scene.fog = new THREE.Fog(chapter.palette.fog, 14, 39)
    const groundMaterial = new THREE.MeshStandardMaterial({ color: chapter.palette.ground, roughness: .92 })
    this.colliderMeshes = new Map()
    for (const collider of chapter.colliders) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(collider.w, collider.h, 1), groundMaterial)
      mesh.position.set(collider.x, collider.y, 0)
      mesh.castShadow = true
      mesh.receiveShadow = true
      this.group.add(mesh)
      this.colliderMeshes.set(collider, mesh)
    }
    const addPortal = (x, facing, y = 1.15) => {
      const portal = new THREE.Group()
      const portalColor = '#D3A4FF'
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.62, .08, 6, 16), new THREE.MeshStandardMaterial({ color: portalColor, emissive: portalColor, emissiveIntensity: .9, roughness: .4 }))
      portal.add(ring)
      portal.position.set(x + facing * .25, y, .15)
      this.group.add(portal)
      const light = new THREE.PointLight(portalColor, 1.8, 3.5, 2)
      light.position.set(0, .05, .85)
      portal.add(light)
      return portal
    }
    this.exitPortal = chapter.exitX !== undefined ? addPortal(chapter.exitX, 1, chapter.exitY) : null
    if (this.exitPortal) this.exitPortal.visible = false
    if (chapter.returnPortalX !== undefined) addPortal(chapter.returnPortalX, -1)
    if (chapter.kind === 'works') return this.loadWorks(chapter, player, input, audio, camera, collectedKeys)
    if (chapter.kind === 'floodline') return this.loadFloodline(chapter, player, input, audio, camera, collectedKeys)
    if (chapter.kind === 'core') return this.loadCore(chapter, player, input, audio, collectedKeys)
    return this.loadOutskirts(chapter, player, input, audio, camera, collectedKeys)
  }

  createKey(chapter, collectedKeys) {
    const key = chapter.key
    if (!key || collectedKeys.has(key.id)) return { update() {}, collect() { return null }, reset() {} }
    const alcove = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.35, .2), new THREE.MeshStandardMaterial({ color: chapter.palette.structure, roughness: .95 }))
    alcove.position.set(key.x, key.y, -.35)
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.19, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffe36a', emissive: '#f2b91f', emissiveIntensity: 2, roughness: .35 }))
    bulb.position.set(key.x, key.y, .1)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.1, .13, .13, 8), new THREE.MeshStandardMaterial({ color: '#806c36', roughness: .7 }))
    base.position.set(key.x, key.y - .21, .1)
    const light = new THREE.PointLight('#ffe36a', 2.3, 4, 2)
    light.position.copy(bulb.position)
    this.group.add(alcove, bulb, base, light)
    let elapsed = 0
    let collected = false
    let visible = !key.hidden
    const setVisible = (value) => { alcove.visible = value; bulb.visible = value; base.visible = value; light.visible = value }
    setVisible(visible)
    return {
      update(dt) {
        elapsed += dt
        bulb.position.y = key.y + Math.sin(elapsed * 2.4) * .07
        base.position.y = key.y - .21 + Math.sin(elapsed * 2.4) * .02
        light.position.y = bulb.position.y
        light.intensity = 1.9 + Math.sin(elapsed * 2.4) * .4
      },
      collect(player) {
        if (!visible || collected || Math.hypot(player.body.x - key.x, player.body.y - key.y) > .75) return null
        collected = true
        setVisible(false)
        return key.id
      },
      reveal() { if (!collected) { visible = true; setVisible(true) } },
      reset() { collected = false; visible = true; setVisible(true) },
    }
  }

  loadOutskirts(chapter, player, input, audio, camera, collectedKeys) {
    const ambient = buildOutskirtsAmbient(this.group, chapter)
    const key = this.createKey(chapter, collectedKeys)
    const door = new Door(this.group, chapter.door)
    const lever = new Lever(this.group, chapter.lever, (open) => door.setOpen(open), audio)
    const box = new Box(this.group, chapter.box, { min: chapter.sideDoor ? -27 : -22, max: 23 }, chapter.boxInteractions)
    const plate = chapter.plate ? new PressurePlate(this.group, chapter.plate, (pressed) => { if (pressed) door.setOpen(true) }) : null
    const sideDoor = chapter.sideDoor ? new Door(this.group, chapter.sideDoor) : null
    const sidePlate = chapter.sidePlate ? new PressurePlate(this.group, chapter.sidePlate, (pressed) => { if (pressed) sideDoor.setOpen(true) }) : null
    const openDoor = chapter.openDoor ? new Door(this.group, chapter.openDoor) : null
    openDoor?.setOpen(true)
    let canyonLever = null
    const syncCanyonLeverToDoor = () => {
      if (!canyonLever || !openDoor) return
      canyonLever.setPosition(openDoor.body.x, openDoor.body.y + (openDoor.open ? 3.5 : 0) - openDoor.body.h / 2 - .25)
    }
    const hiddenTerrain = chapter.hiddenTerrain ? chapter.colliders.find((collider) => collider.x === chapter.hiddenTerrain.x && collider.y === chapter.hiddenTerrain.y && collider.w === chapter.hiddenTerrain.w && collider.h === chapter.hiddenTerrain.h) : null
    const hiddenTerrainMesh = hiddenTerrain ? this.colliderMeshes.get(hiddenTerrain) : null
    let hiddenTerrainLandings = 0
    let hiddenTerrainGone = false
    let observedLandingCount = player.landingCount
    let portalEnabled = !chapter.portalLever
    const portalLever = chapter.portalLever ? new Lever(this.group, chapter.portalLever, (on) => { portalEnabled = on; this.exitPortal.visible = on }, audio) : null
    const exitPortal = this.exitPortal
    if (portalLever) portalLever.mesh.visible = false
    const canyonHazard = chapter.canyonHazard ? new KillVolume(this.group, chapter.canyonHazard, { visible: false }) : null
    const hillLever = chapter.hillLever ? new Lever(this.group, chapter.hillLever, (on) => { openDoor?.setOpen(!on); syncCanyonLeverToDoor() }, audio) : null
    const killVolume = chapter.hazard ? new KillVolume(this.group, chapter.hazard) : null
    const searchlight = chapter.searchlight ? new Searchlight(this.group, chapter.searchlight) : null
    const shadeBox = chapter.shadeBox ? new Box(this.group, chapter.shadeBox, { min: chapter.shadeBox.x - .5, max: chapter.shadePlate.x + .2 }) : null
    const shadeLight = chapter.shadeLight ? new Searchlight(this.group, chapter.shadeLight) : null
    const shadeDoor = chapter.shadeDoor ? new Door(this.group, chapter.shadeDoor) : null
    const shadePlate = chapter.shadePlate ? new PressurePlate(this.group, chapter.shadePlate, (pressed) => { if (pressed) shadeDoor.setOpen(true) }) : null
    if (chapter.elevator) {
      const elevator = new THREE.Mesh(new THREE.BoxGeometry(chapter.elevator.w, chapter.elevator.h, 1), new THREE.MeshStandardMaterial({ color: chapter.palette.structure, roughness: .8 }))
      elevator.position.set(chapter.elevator.x, chapter.elevator.y, 0)
      this.group.add(elevator)
      const beacon = new THREE.PointLight(chapter.palette.accent, 5, 6, 2)
      beacon.position.set(chapter.elevator.x, 2.8, 1)
      this.group.add(beacon)
    }
    const makeStage = (stage) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(stage.w, stage.h, .8), new THREE.MeshStandardMaterial({ color: chapter.palette.structure, emissive: chapter.palette.accent, emissiveIntensity: .35, roughness: .8 }))
      mesh.position.set(stage.x, stage.y, 0)
      mesh.castShadow = true
      mesh.visible = false
      this.group.add(mesh)
      return mesh
    }
    const hasSkyRoute = Boolean(chapter.leftLever)
    const leftStage = hasSkyRoute ? makeStage(chapter.leftStage) : null
    const middleStage = hasSkyRoute ? makeStage(chapter.middleStage) : null
    const skyBlock = hasSkyRoute ? makeStage(chapter.skyBlock) : null
    const canyonBridge = chapter.canyonBridge ? makeStage(chapter.canyonBridge) : null
    let canyonBridgeVisible = false
    canyonLever = chapter.canyonLever ? new Lever(this.group, chapter.canyonLever, (on) => { canyonBridgeVisible = on; canyonBridge.visible = on }, audio, { requiresJumpAction: true, pullRange: { x: 1.7, y: 2.4 } }) : null
    syncCanyonLeverToDoor()
    let farBankBox = null
    let farBankBoxSpawned = false
    const spawnFarBankBox = () => {
      if (farBankBoxSpawned) return
      farBankBoxSpawned = true
      farBankBox = new Box(this.group, chapter.farBankBox, { min: 7.4, max: 23 }, chapter.boxInteractions)
    }
    const farBankLever = chapter.farBankLever ? new Lever(this.group, chapter.farBankLever, (on) => { if (on) spawnFarBankBox() }, audio) : null
    let leftStageVisible = false
    let middleStageVisible = false
    let skyBlockVisible = false
    let middleLever = null
    let highLever = null
    let postKeyBox = null
    let postKeyBoxSpawned = false
    const spawnPostKeyBox = () => {
      if (postKeyBoxSpawned) return
      postKeyBoxSpawned = true
      postKeyBox = new Box(this.group, chapter.postKeyBox, { min: chapter.leftLever.x + .4, max: -25 }, chapter.boxInteractions)
    }
    const leftLever = hasSkyRoute ? new Lever(this.group, chapter.leftLever, (on) => { leftStageVisible = on; leftStage.visible = on; if (!on) { middleStageVisible = false; skyBlockVisible = false; middleStage.visible = false; skyBlock.visible = false } }, audio) : null
    if (hasSkyRoute) {
      middleLever = new Lever(this.group, chapter.middleLever, (on) => { middleStageVisible = on; middleStage.visible = on; if (!on) { skyBlockVisible = false; skyBlock.visible = false } }, audio)
      highLever = new Lever(this.group, chapter.highLever, (on) => { skyBlockVisible = on; skyBlock.visible = on }, audio)
      middleLever.mesh.visible = false
      highLever.mesh.visible = false
    }
    return {
      get colliders() { return hiddenTerrainGone ? chapter.colliders.filter((collider) => collider !== hiddenTerrain) : chapter.colliders },
      update(dt) {
        if (hiddenTerrain && !hiddenTerrainGone && player.landingCount !== observedLandingCount) {
          observedLandingCount = player.landingCount
          const terrainTop = hiddenTerrain.y + hiddenTerrain.h / 2
          const landedOnHiddenTerrain = Math.abs(player.body.x - hiddenTerrain.x) < hiddenTerrain.w / 2 - .05 && Math.abs((player.body.y - player.body.hh) - terrainTop) < .08
          if (landedOnHiddenTerrain) {
            hiddenTerrainLandings += 1
            if (hiddenTerrainLandings >= chapter.hiddenTerrain.landingsRequired) {
              hiddenTerrainGone = true
              hiddenTerrainMesh.visible = false
              portalLever.mesh.visible = true
            }
          }
        }
        const engaged = box.playerEngaged(player, input) || shadeBox?.playerEngaged(player, input) || false
        lever.update(player, input, engaged)
        hillLever?.update(player, input, engaged)
        portalLever?.update(player, input, engaged)
        canyonLever?.update(player, input, engaged)
        farBankLever?.update(player, input, engaged)
        if (hasSkyRoute) {
          const keyCollected = collectedKeys.has(chapter.key.id)
          const leftLeverWasOn = leftLever.on
          if (!keyCollected || player.body.grounded) leftLever.update(player, input, engaged)
          if (keyCollected && player.body.grounded && leftLeverWasOn && !leftLever.on) spawnPostKeyBox()
          middleLever.mesh.visible = leftStageVisible
          highLever.mesh.visible = middleStageVisible
          if (leftStageVisible) middleLever.update(player, input, engaged)
          if (middleStageVisible) highLever.update(player, input, engaged)
          const blockTop = chapter.skyBlock.y + chapter.skyBlock.h / 2
          const standingOnSkyBlock = skyBlockVisible && Math.abs(player.body.x - chapter.skyBlock.x) < chapter.skyBlock.w / 2 - .05 && Math.abs((player.body.y - player.body.hh) - blockTop) < .08
          if (standingOnSkyBlock) key.reveal()
        }
        const boxBlockers = [...this.colliders, door.collider(), canyonBridgeVisible ? chapter.canyonBridge : null].filter(Boolean)
        const pushed = box.update(dt, player, input, boxBlockers)
        const postKeyPushed = postKeyBox?.update(dt, player, input, [...boxBlockers, box.collider()].filter(Boolean)) || false
        const farBankPushed = farBankBox?.update(dt, player, input, [...boxBlockers, box.collider(), postKeyBox?.collider()].filter(Boolean)) || false
        const shadePushed = shadeBox?.update(dt, player, input, [...chapter.colliders, shadeDoor?.collider()].filter(Boolean)) || false
        player.setPushing(pushed || postKeyPushed || farBankPushed || shadePushed)
        pushed || postKeyPushed || farBankPushed || shadePushed ? audio.startScrape() : audio.stopScrape()
        plate?.update(box)
        sidePlate?.update(box)
        shadePlate?.update(shadeBox)
        const blockers = [box.collider(), shadeBox?.collider()].filter(Boolean)
        searchlight?.update(dt, player, blockers)
        shadeLight?.update(dt, player, blockers)
        key.update(dt)
        ambient.update(dt, camera.camera.position.x)
      },
      dynamicColliders() { return [box.collider(), postKeyBox?.collider(), farBankBox?.collider(), shadeBox?.collider(), lever.collider(), door.collider(), sideDoor?.collider(), openDoor?.collider(), shadeDoor?.collider(), hillLever?.collider(), portalLever?.collider(), canyonLever?.collider(), farBankLever?.collider(), leftLever?.collider(), canyonBridgeVisible ? chapter.canyonBridge : null, leftStageVisible ? chapter.leftStage : null, leftStageVisible ? middleLever?.collider() : null, middleStageVisible ? chapter.middleStage : null, middleStageVisible ? highLever?.collider() : null, skyBlockVisible ? chapter.skyBlock : null].filter(Boolean) },
      save() { return { box: box.save(), postKeyBox: postKeyBox?.save(), postKeyBoxSpawned, farBankBox: farBankBox?.save(), farBankBoxSpawned, shadeBox: shadeBox?.save(), lever: lever.save(), door: door.save(), sideDoor: sideDoor?.save(), openDoor: openDoor?.save(), shadeDoor: shadeDoor?.save(), hillLever: hillLever?.save(), portalLever: portalLever?.save(), portalEnabled, hiddenTerrainLandings, hiddenTerrainGone, canyonLever: canyonLever?.save(), canyonBridgeVisible, leftStageVisible, middleStageVisible, skyBlockVisible, leftLever: leftLever?.save(), middleLever: middleLever?.save(), highLever: highLever?.save() } },
      restore(snapshot) {
        box.restore(snapshot.box); if (snapshot.postKeyBoxSpawned) { spawnPostKeyBox(); postKeyBox.restore(snapshot.postKeyBox) }; if (snapshot.farBankBoxSpawned) { spawnFarBankBox(); farBankBox.restore(snapshot.farBankBox) }; shadeBox?.restore(snapshot.shadeBox); lever.restore(snapshot.lever); door.restore(snapshot.door); if (snapshot.sideDoor !== undefined) sideDoor?.restore(snapshot.sideDoor); openDoor?.restore(snapshot.openDoor ?? true); if (snapshot.shadeDoor !== undefined) shadeDoor?.restore(snapshot.shadeDoor); hillLever?.restore(snapshot.hillLever ?? false); syncCanyonLeverToDoor(); hiddenTerrainLandings = snapshot.hiddenTerrainLandings || 0; hiddenTerrainGone = snapshot.hiddenTerrainGone || false; observedLandingCount = player.landingCount; if (hiddenTerrainMesh) hiddenTerrainMesh.visible = !hiddenTerrainGone; if (portalLever) { portalLever.mesh.visible = hiddenTerrainGone; portalLever.restore(snapshot.portalLever ?? false) }; portalEnabled = snapshot.portalEnabled ?? portalEnabled; exitPortal.visible = portalEnabled; canyonBridgeVisible = snapshot.canyonBridgeVisible || false; if (canyonBridge) canyonBridge.visible = canyonBridgeVisible; canyonLever?.restore(snapshot.canyonLever ?? false); farBankLever?.restore(snapshot.farBankBoxSpawned ?? false)
        if (!hasSkyRoute) return
        leftStageVisible = snapshot.leftStageVisible || false
        middleStageVisible = snapshot.middleStageVisible || false
        skyBlockVisible = snapshot.skyBlockVisible || false
        leftStage.visible = leftStageVisible; middleStage.visible = middleStageVisible; skyBlock.visible = skyBlockVisible
        middleLever.mesh.visible = leftStageVisible; highLever.mesh.visible = middleStageVisible
        leftLever.restore(snapshot.leftLever || false); middleLever.restore(snapshot.middleLever || false); highLever.restore(snapshot.highLever || false)
      },
      hits(target) { return (killVolume?.hits(target) || false) || (canyonHazard?.hits(target) || false) || (searchlight?.hits() || false) || shadeLight?.hits() || false },
      recoverCanyonFall(target) {
        if (!chapter.canyonRightRespawn || Math.abs(target.body.x - chapter.canyonHazard.x) > chapter.canyonHazard.w / 2) return null
        const fromRightBank = target.body.x >= chapter.canyonHazard.x
        const boxRecovery = fromRightBank ? chapter.canyonRightBoxRecovery : chapter.canyonBoxRecovery
        for (const movableBox of [box, postKeyBox, farBankBox]) {
          if (!movableBox?.falling) continue
          const insideCanyon = Math.abs(movableBox.body.x - chapter.canyonHazard.x) < chapter.canyonHazard.w / 2 + movableBox.body.w / 2
          if (insideCanyon) movableBox.restore({ ...boxRecovery, falling: false, fallVelocity: 0 })
        }
        return fromRightBank ? chapter.canyonRightRespawn : null
      },
      resetKey() { key.reset() },
      collectKey(target) { return key.collect(target) },
      reachedExit(target) { return portalEnabled && target.body.x > chapter.exitX },
    }
  }

  loadWorks(chapter, player, input, audio, camera, collectedKeys) {
    const ambient = buildWorksAmbient(this.group, chapter)
    const key = this.createKey(chapter, collectedKeys)

    // Climb the flying blocks, then choose the upper exit route or drop to the lower key route.
    const crushers = chapter.crushers.map((crusher) => new Crusher(this.group, crusher, '#8a5a2e'))
    const exitPortal = this.exitPortal
    const topBox = new Box(this.group, chapter.topBox, { min: -23, max: 23 })
    let returnTriggerVisible = false
    let keyTriggerVisible = false
    let keyLeverPulls = 0
    let portalEnabled = false
    let elevatorSpawned = false
    const keyStageMaterial = new THREE.MeshStandardMaterial({ color: chapter.palette.structure, emissive: chapter.palette.accent, emissiveIntensity: .35, roughness: .8 })
    const keyStageMeshes = chapter.keyStages.map((stage) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(stage.w, stage.h, .8), keyStageMaterial)
      mesh.position.set(stage.x, stage.y, 0)
      mesh.castShadow = true
      mesh.visible = false
      this.group.add(mesh)
      return mesh
    })
    let keyStagesVisible = false
    const setKeyStagesVisible = (visible) => {
      keyStagesVisible = visible
      keyStageMeshes.forEach((mesh) => { mesh.visible = visible })
    }
    const returnTrigger = new PressurePlate(this.group, chapter.returnTrigger, (pressed) => { if (pressed) activatePortal() })
    returnTrigger.mesh.visible = false
    const keyTrigger = new PressurePlate(this.group, chapter.keyTrigger, (pressed) => { if (pressed) spawnElevator() })
    keyTrigger.mesh.visible = false
    const elevator = {
      body: { x: chapter.keyElevator.x, y: chapter.keyElevator.startY, w: chapter.keyElevator.w, h: chapter.keyElevator.h },
      active: false,
      mesh: new THREE.Mesh(new THREE.BoxGeometry(chapter.keyElevator.w, chapter.keyElevator.h, .9), new THREE.MeshStandardMaterial({ color: chapter.palette.structure, emissive: chapter.palette.accent, emissiveIntensity: .4, roughness: .75 })),
      update(dt, rider) {
        if (!this.active) {
          const top = this.body.y + this.body.h / 2
          this.active = Math.abs(rider.body.x - this.body.x) < this.body.w / 2 - .05 && Math.abs(rider.body.y - rider.body.hh - top) < .1
        }
        if (!this.active || this.body.y >= chapter.keyElevator.endY) return
        const previousTop = this.body.y + this.body.h / 2
        const carriesRider = Math.abs(rider.body.x - this.body.x) < this.body.w / 2 + rider.body.hw - .01 && Math.abs(rider.body.y - rider.body.hh - previousTop) < .12
        const distance = Math.min(dt * 3.2, chapter.keyElevator.endY - this.body.y)
        this.body.y += distance
        if (carriesRider) { rider.body.y += distance; rider.body.vy = 0; rider.body.grounded = true }
        this.mesh.position.y = this.body.y
      },
      save() { return { y: this.body.y, active: this.active } },
      restore(snapshot) { this.body.y = snapshot.y; this.active = snapshot.active; this.mesh.position.y = this.body.y },
    }
    elevator.mesh.castShadow = true
    elevator.mesh.position.set(elevator.body.x, elevator.body.y, 0)
    this.group.add(elevator.mesh)
    const spawnElevator = () => { elevatorSpawned = true; elevator.mesh.visible = true }
    elevator.mesh.visible = false
    const activatePortal = () => { portalEnabled = true; exitPortal.visible = true }
    const topLever = new Lever(this.group, chapter.topLever, (on) => { returnTriggerVisible = on; returnTrigger.mesh.visible = on }, audio)
    let restoring = false
    const keyLever = new Lever(this.group, chapter.keyLever, (on) => {
      setKeyStagesVisible(on)
      if (!restoring) keyLeverPulls += 1
      if (keyLeverPulls >= 5) { keyTriggerVisible = true; keyTrigger.mesh.visible = true }
    }, audio)

    return {
      colliders: chapter.colliders,
      update(dt) {
        crushers.forEach((crusher) => crusher.update(dt, player))
        const topBoxPushed = topBox.update(dt, player, input, [...chapter.colliders, elevatorSpawned ? elevator.body : null].filter(Boolean))
        topLever.update(player, input, topBox.playerEngaged(player, input))
        keyLever.update(player, input)
        if (returnTriggerVisible) {
          returnTrigger.update(topBox)
          const blockOnReturnTrigger = Math.abs(topBox.body.x - returnTrigger.body.x) < .85 && Math.abs(topBox.body.y - (returnTrigger.body.y + .6)) < .8
          if (blockOnReturnTrigger) activatePortal()
        }
        if (keyTriggerVisible) {
          keyTrigger.update(topBox)
          const blockOnKeyTrigger = Math.abs(topBox.body.x - keyTrigger.body.x) < .85 && Math.abs(topBox.body.y - (keyTrigger.body.y + .6)) < .8
          if (blockOnKeyTrigger) spawnElevator()
        }
        if (elevatorSpawned) elevator.update(dt, player)
        player.setPushing(topBoxPushed)
        key.update(dt)
        ambient.update(dt, camera.camera.position.x)
      },
      dynamicColliders() { return [topBox.collider(), topLever.collider(), keyLever.collider(), elevatorSpawned ? elevator.body : null, ...(keyStagesVisible ? chapter.keyStages : []), ...crushers.map((crusher) => crusher.collider())].filter(Boolean) },
      save() { return { topBox: topBox.save(), topLever: topLever.save(), returnTriggerVisible, keyLever: keyLever.save(), keyLeverPulls, keyTriggerVisible, elevatorSpawned, elevator: elevator.save(), portalEnabled } },
      restore(snapshot) {
        topBox.restore(snapshot.topBox)
        returnTriggerVisible = snapshot.returnTriggerVisible || false
        returnTrigger.mesh.visible = returnTriggerVisible
        topLever.restore(snapshot.topLever || false)
        restoring = true
        keyLeverPulls = snapshot.keyLeverPulls || 0
        keyTriggerVisible = snapshot.keyTriggerVisible || false
        keyTrigger.mesh.visible = keyTriggerVisible
        keyLever.restore(snapshot.keyLever || false)
        restoring = false
        elevatorSpawned = snapshot.elevatorSpawned || false
        elevator.mesh.visible = elevatorSpawned
        elevator.restore(snapshot.elevator || elevator.save())
        portalEnabled = snapshot.portalEnabled || false
        exitPortal.visible = portalEnabled
      },
      hits() { return false },
      recoverFall(target) {
        const upperGapLeft = 12.3
        const upperGapRight = 14.7
        if (target.body.x > upperGapLeft && target.body.x < upperGapRight) return { x: 8, y: 14.2 }
        return null
      },
      resetKey() { key.reset() },
      collectKey(target) { return key.collect(target) },
      reachedExit(target) { return portalEnabled && target.body.x > chapter.exitX },
    }
  }

  loadFloodline(chapter, player, input, audio, camera, collectedKeys) {
    const ambient = buildOutskirtsAmbient(this.group, chapter)
    const key = this.createKey(chapter, collectedKeys)
    const keyDoor = new Door(this.group, chapter.keyDoor)
    const keyPlate = new PressurePlate(this.group, chapter.keyPlate, (pressed) => { if (pressed) keyDoor.setOpen(true) })
    const routeDoor = new Door(this.group, chapter.routeDoor)
    let routePlateActivations = 0
    let skyStageVisible = false
    let leverVisible = false
    let exitLever = null
    const syncExitLever = () => { if (exitLever) exitLever.mesh.visible = skyStageVisible && leverVisible }
    const routePlate = new PressurePlate(this.group, chapter.routePlate, (pressed) => {
      if (!pressed) return
      routePlateActivations += 1
      if (routePlateActivations === 1) routeDoor.setOpen(true)
      else { leverVisible = true; syncExitLever() }
    })
    const keyBox = new Box(this.group, chapter.keyBox, { min: -22, max: -9 }, chapter.boxInteractions)
    const skyStageMaterial = new THREE.MeshStandardMaterial({ color: chapter.palette.structure, emissive: chapter.palette.accent, emissiveIntensity: .28, roughness: .8 })
    const skyStage = new THREE.Mesh(new THREE.BoxGeometry(chapter.skyStage.w, chapter.skyStage.h, .8), skyStageMaterial)
    skyStage.position.set(chapter.skyStage.x, chapter.skyStage.y, 0)
    skyStage.castShadow = true
    skyStage.visible = false
    this.group.add(skyStage)
    let canyonStageVisible = false
    const canyonStageMaterial = new THREE.MeshStandardMaterial({ color: chapter.palette.structure, emissive: chapter.palette.accent, emissiveIntensity: .42, roughness: .75 })
    const canyonStage = new THREE.Mesh(new THREE.BoxGeometry(chapter.canyonStage.w, chapter.canyonStage.h, .8), canyonStageMaterial)
    canyonStage.position.set(chapter.canyonStage.x, chapter.canyonStage.y, 0)
    canyonStage.castShadow = true
    canyonStage.visible = false
    this.group.add(canyonStage)
    const skyLight = new THREE.PointLight(chapter.palette.accent, 0, 5, 2)
    skyLight.position.set(chapter.skyStage.x, chapter.skyStage.y + .5, 1)
    this.group.add(skyLight)
    const canyonLight = new THREE.PointLight(chapter.palette.accent, 0, 4, 2)
    canyonLight.position.set(chapter.canyonStage.x, chapter.canyonStage.y + .5, 1)
    this.group.add(canyonLight)
    const relayLight = new THREE.PointLight(chapter.palette.accent, .3, 3, 2)
    relayLight.position.set(chapter.relayPlate.x, 1.2, 1)
    this.group.add(relayLight)
    const relayPlate = new PressurePlate(this.group, chapter.relayPlate, (pressed) => {
      if (pressed) {
        relayLight.intensity = 2.2
        skyStageVisible = true
        skyStage.visible = true
        skyLight.intensity = 2
        syncExitLever()
      }
    })
    const relayBox = new Box(this.group, chapter.relayBox, { min: -4, max: chapter.canyonStage.x }, chapter.boxInteractions)
    const farBox = new Box(this.group, chapter.farBox, { min: chapter.farBankLeftX - .55, max: chapter.farCliffX + .55 }, chapter.boxInteractions)
    const exitPortal = this.exitPortal
    const beacon = new THREE.PointLight(chapter.palette.accent, 4, 6, 2)
    beacon.position.set(chapter.exitX - .7, 2.8, 1)
    this.group.add(beacon)
    exitLever = new Lever(this.group, chapter.exitLever, (on) => {
      canyonStageVisible = on
      canyonStage.visible = on
      canyonLight.intensity = on ? 2.4 : 0
      beacon.intensity = on ? 7 : 4
    }, audio)
    syncExitLever()
    const routeLight = new THREE.PointLight(chapter.palette.accent, 1.8, 3, 2)
    routeLight.position.set(chapter.routeDoor.x, 2.7, 1)
    this.group.add(routeLight)

    return {
      colliders: chapter.colliders,
      update(dt) {
        const pushed = keyBox.update(dt, player, input, [...chapter.colliders, keyDoor.collider(), routeDoor.collider()].filter(Boolean))
        const relayPushed = relayBox.update(dt, player, input, chapter.colliders)
        const farPushed = farBox.update(dt, player, input, chapter.colliders)
        exitPortal.visible = farBox.falling
        const busy = keyBox.playerEngaged(player, input) || relayBox.playerEngaged(player, input) || farBox.playerEngaged(player, input)
        if (skyStageVisible && leverVisible) exitLever.update(player, input, busy)
        player.setPushing(pushed || relayPushed || farPushed)
        pushed || relayPushed || farPushed ? audio.startScrape() : audio.stopScrape()
        keyPlate.update(keyBox)
        routePlate.update(keyBox)
        relayPlate.update(relayBox)
        key.update(dt)
        ambient.update(dt, camera.camera.position.x)
      },
      dynamicColliders() { return [keyBox.collider(), relayBox.collider(), farBox.collider(), keyDoor.collider(), routeDoor.collider(), skyStageVisible ? chapter.skyStage : null, skyStageVisible && leverVisible ? exitLever.collider() : null, canyonStageVisible ? chapter.canyonStage : null].filter(Boolean) },
      save() { return { keyBox: keyBox.save(), relayBox: relayBox.save(), farBox: farBox.save(), keyDoor: keyDoor.save(), routeDoor: routeDoor.save(), routePlateActivations, skyStageVisible, leverVisible, canyonStageVisible, exitLever: exitLever.save() } },
      restore(snapshot) {
        keyBox.restore(snapshot.keyBox)
        relayBox.restore(snapshot.relayBox)
        farBox.restore(snapshot.farBox)
        keyDoor.restore(snapshot.keyDoor)
        routeDoor.restore(snapshot.routeDoor)
        routePlateActivations = snapshot.routePlateActivations ?? (snapshot.routeDoor ? 1 : 0)
        skyStageVisible = snapshot.skyStageVisible
        leverVisible = snapshot.leverVisible ?? skyStageVisible
        skyStage.visible = skyStageVisible
        skyLight.intensity = skyStageVisible ? 2 : 0
        exitLever.restore(snapshot.exitLever)
        syncExitLever()
        canyonStageVisible = snapshot.canyonStageVisible
        canyonStage.visible = canyonStageVisible
        canyonLight.intensity = canyonStageVisible ? 2.4 : 0
        relayLight.intensity = skyStageVisible ? 2.2 : .3
        exitPortal.visible = farBox.falling
      },
      hits() { return false },
      recoverFall(target) {
        if (target.body.x > chapter.farCliffX) return { x: 4, y: 2 }
        return null
      },
      resetKey() { key.reset() },
      collectKey(target) { return key.collect(target) },
      reachedExit(target) { return farBox.falling && target.body.x > chapter.exitX },
    }
  }

  loadCore(chapter, player, input, audio, collectedKeys) {
    const ambient = buildWinterAmbient(this.group, chapter)
    const key = this.createKey(chapter, collectedKeys)
    const core = new THREE.Group()
    core.position.set(6, 4.5, -2)
    for (const radius of [1.4, 2.15, 2.9]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, .12, 6, 24), new THREE.MeshStandardMaterial({ color: '#e8f0ee', emissive: '#657578', emissiveIntensity: .3, roughness: .5 }))
      ring.rotation.x = Math.PI / 2
      core.add(ring)
    }
    this.group.add(core)
    const beacon = new THREE.PointLight(chapter.palette.accent, 0, 6, 2)
    beacon.position.set(chapter.exitX - .7, 2.8, 1)
    this.group.add(beacon)
    const exitPortal = this.exitPortal
    const coreBox = new Box(this.group, chapter.coreBox, { min: -16.5, max: 9 }, chapter.boxInteractions)
    const gateDoor = new Door(this.group, chapter.gateDoor)
    const gatePlate = new PressurePlate(this.group, chapter.gatePlate, (pressed) => { if (pressed) gateDoor.setOpen(true) })
    const bridgeMaterial = new THREE.MeshStandardMaterial({ color: chapter.palette.structure, emissive: chapter.palette.accent, emissiveIntensity: .38, roughness: .75 })
    const finalBridge = new THREE.Mesh(new THREE.BoxGeometry(chapter.finalBridge.w, chapter.finalBridge.h, .9), bridgeMaterial)
    finalBridge.position.set(chapter.finalBridge.x, chapter.finalBridge.y, 0)
    finalBridge.castShadow = true
    finalBridge.visible = false
    this.group.add(finalBridge)
    let bridgeActive = false
    const bridgePlate = new PressurePlate(this.group, chapter.bridgePlate, (pressed) => {
      if (!pressed || bridgeActive) return
      bridgeActive = true
      finalBridge.visible = true
      exitPortal.visible = true
      beacon.intensity = 5
    })
    return {
      colliders: chapter.colliders,
      update(dt) {
        core.rotation.z += dt * .25
        const boxPushed = coreBox.update(dt, player, input, [...chapter.colliders, gateDoor.collider(), bridgeActive ? chapter.finalBridge : null].filter(Boolean))
        gatePlate.update(coreBox)
        bridgePlate.update(coreBox)
        player.setPushing(boxPushed)
        key.update(dt)
        ambient.update(dt, player.body.x)
      },
      dynamicColliders() { return [coreBox.collider(), gateDoor.collider(), bridgeActive ? chapter.finalBridge : null].filter(Boolean) },
      save() { return { coreBox: coreBox.save(), gateDoor: gateDoor.save(), bridgeActive } },
      restore(snapshot) {
        coreBox.restore(snapshot.coreBox)
        gateDoor.restore(snapshot.gateDoor)
        bridgeActive = snapshot.bridgeActive || false
        finalBridge.visible = bridgeActive
        exitPortal.visible = bridgeActive
        beacon.intensity = bridgeActive ? 5 : 0
      },
      hits() { return false },
      resetKey() { key.reset() },
      collectKey(target) { return key.collect(target) },
      reachedExit(target) { return bridgeActive && target.body.x > chapter.exitX },
    }
  }
}
