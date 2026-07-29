import * as THREE from 'three'
import { Box, Door, Lever, PressurePlate } from './Interactables.js'
import { KillVolume, Searchlight, Crusher } from './Hazards.js'
import { buildOutskirtsAmbient, buildWorksAmbient } from './Ambient.js'

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
    if (!key || collectedKeys.has(key.id)) return { update() {}, collect() { return null }, reset() {}, setVisible() {} }
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
      setVisible(value) { if (!collected) { visible = value; setVisible(value) } },
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
    let portalPlate = null
    let portalPlateVisible = false
    let sideDoorRevealPending = false
    const sidePlate = chapter.sidePlate ? new PressurePlate(this.group, chapter.sidePlate, (pressed) => {
      if (!pressed) return
      sideDoor.setOpen(true)
      portalPlateVisible = true
      portalPlate?.setVisible(true)
      sideDoorRevealPending = true
    }) : null
    const openDoor = chapter.openDoor ? new Door(this.group, chapter.openDoor) : null
    openDoor?.setOpen(true)
    let canyonLever = null
    const syncCanyonLeverToDoor = () => {
      if (!canyonLever || !openDoor) return
      canyonLever.setPosition(openDoor.body.x, openDoor.body.y + (openDoor.open ? 3.5 : 0) - openDoor.body.h / 2 - .25)
    }
    let portalEnabled = !chapter.portalPlate
    let portalRevealPending = false
    const exitPortal = this.exitPortal
    portalPlate = chapter.portalPlate ? new PressurePlate(this.group, chapter.portalPlate, (pressed) => {
      if (!pressed) return
      portalEnabled = true
      exitPortal.visible = true
      portalRevealPending = true
    }) : null
    portalPlate?.setVisible(false)
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
      get colliders() { return chapter.colliders },
      update(dt) {
        const engaged = box.playerEngaged(player, input) || shadeBox?.playerEngaged(player, input) || false
        lever.update(player, input, engaged)
        hillLever?.update(player, input, engaged)
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
        if (portalPlateVisible) portalPlate?.update(box)
        shadePlate?.update(shadeBox)
        const blockers = [box.collider(), shadeBox?.collider()].filter(Boolean)
        searchlight?.update(dt, player, blockers)
        shadeLight?.update(dt, player, blockers)
        key.update(dt)
        ambient.update(dt, camera.camera.position.x)
      },
      dynamicColliders() { return [box.collider(), postKeyBox?.collider(), farBankBox?.collider(), shadeBox?.collider(), lever.collider(), door.collider(), sideDoor?.collider(), openDoor?.collider(), shadeDoor?.collider(), hillLever?.collider(), canyonLever?.collider(), farBankLever?.collider(), leftLever?.collider(), canyonBridgeVisible ? chapter.canyonBridge : null, leftStageVisible ? chapter.leftStage : null, leftStageVisible ? middleLever?.collider() : null, middleStageVisible ? chapter.middleStage : null, middleStageVisible ? highLever?.collider() : null, skyBlockVisible ? chapter.skyBlock : null].filter(Boolean) },
      save() { return { box: box.save(), postKeyBox: postKeyBox?.save(), postKeyBoxSpawned, farBankBox: farBankBox?.save(), farBankBoxSpawned, shadeBox: shadeBox?.save(), lever: lever.save(), door: door.save(), sideDoor: sideDoor?.save(), sidePlateRemaining: sidePlate?.remaining, openDoor: openDoor?.save(), shadeDoor: shadeDoor?.save(), hillLever: hillLever?.save(), portalPlateVisible, portalPlateRemaining: portalPlate?.remaining, portalEnabled, canyonLever: canyonLever?.save(), canyonBridgeVisible, leftStageVisible, middleStageVisible, skyBlockVisible, leftLever: leftLever?.save(), middleLever: middleLever?.save(), highLever: highLever?.save() } },
      restore(snapshot) {
        box.restore(snapshot.box); if (snapshot.postKeyBoxSpawned) { spawnPostKeyBox(); postKeyBox.restore(snapshot.postKeyBox) }; if (snapshot.farBankBoxSpawned) { spawnFarBankBox(); farBankBox.restore(snapshot.farBankBox) }; shadeBox?.restore(snapshot.shadeBox); lever.restore(snapshot.lever); door.restore(snapshot.door); if (snapshot.sideDoor !== undefined) sideDoor?.restore(snapshot.sideDoor); sidePlate?.setRemaining(snapshot.sidePlateRemaining ?? (snapshot.sideDoor ? 0 : 1)); openDoor?.restore(snapshot.openDoor ?? true); if (snapshot.shadeDoor !== undefined) shadeDoor?.restore(snapshot.shadeDoor); hillLever?.restore(snapshot.hillLever ?? false); syncCanyonLeverToDoor(); portalPlateVisible = snapshot.portalPlateVisible ?? !sidePlate?.remaining; portalPlate?.setVisible(portalPlateVisible); portalPlate?.setRemaining(snapshot.portalPlateRemaining ?? (snapshot.portalEnabled ? 0 : 1)); portalEnabled = snapshot.portalEnabled ?? portalEnabled; exitPortal.visible = portalEnabled; canyonBridgeVisible = snapshot.canyonBridgeVisible || false; if (canyonBridge) canyonBridge.visible = canyonBridgeVisible; canyonLever?.restore(snapshot.canyonLever ?? false); farBankLever?.restore(snapshot.farBankBoxSpawned ?? false)
        if (!hasSkyRoute) return
        leftStageVisible = snapshot.leftStageVisible || false
        middleStageVisible = snapshot.middleStageVisible || false
        skyBlockVisible = snapshot.skyBlockVisible || false
        leftStage.visible = leftStageVisible; middleStage.visible = middleStageVisible; skyBlock.visible = skyBlockVisible
        middleLever.mesh.visible = leftStageVisible; highLever.mesh.visible = middleStageVisible
        leftLever.restore(snapshot.leftLever || false); middleLever.restore(snapshot.middleLever || false); highLever.restore(snapshot.highLever || false)
      },
      hits(target) { return (killVolume?.hits(target) || false) || (canyonHazard?.hits(target) || false) || (searchlight?.hits() || false) || shadeLight?.hits() || false },
      consumePortalReveal() {
        if (sideDoorRevealPending) {
          sideDoorRevealPending = false
          return 'summerSideDoor'
        }
        const revealed = portalRevealPending
        portalRevealPending = false
        return revealed
      },
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
    let floatingRouteOrigin = null
    let routeBeforeFloatingBlocks = 'left'
    const exitPortal = this.exitPortal
    const topBox = new Box(this.group, chapter.topBox, { min: -23, max: 23 })
    let returnTriggerVisible = false
    let returnTriggerActivated = false
    let returnTriggerRouteReached = false
    let portalRevealPending = false
    let triggerRevealPending = false
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
    returnTrigger.setVisible(false)
    const keyTrigger = new PressurePlate(this.group, chapter.keyTrigger, (pressed) => { if (pressed) spawnElevator() })
    keyTrigger.setVisible(false)
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
    const activatePortal = () => {
      if (!portalEnabled) portalRevealPending = true
      returnTriggerActivated = true
      portalEnabled = true
      exitPortal.visible = true
    }
    const topLever = new Lever(this.group, chapter.topLever, (on) => {
      if (on && !returnTriggerVisible) triggerRevealPending = true
      returnTriggerVisible = on
      returnTrigger.setVisible(on)
    }, audio)
    let restoring = false
    const keyLever = new Lever(this.group, chapter.keyLever, (on) => {
      setKeyStagesVisible(on)
      if (!restoring) keyLeverPulls += 1
      if (keyLeverPulls >= 5) { keyTriggerVisible = true; keyTrigger.setVisible(true) }
    }, audio)

    return {
      colliders: chapter.colliders,
      update(dt) {
        crushers.forEach((crusher) => crusher.update(dt, player))
        const standingOnFloatingBlock = player.body.grounded && crushers.find((crusher) => {
          const blockTop = crusher.body.y + crusher.body.h / 2
          return Math.abs(player.body.x - crusher.body.x) < crusher.body.w / 2 - .05 && Math.abs((player.body.y - player.body.hh) - blockTop) < .12
        })
        if (standingOnFloatingBlock && !floatingRouteOrigin) floatingRouteOrigin = routeBeforeFloatingBlocks
        else if (!standingOnFloatingBlock && player.body.grounded) {
          if (player.body.y >= 13) routeBeforeFloatingBlocks = 'top'
          else if (player.body.y <= 3) routeBeforeFloatingBlocks = 'left'
          floatingRouteOrigin = null
        }
        if (returnTriggerActivated && player.body.grounded && !standingOnFloatingBlock && (player.body.y >= 13 || player.body.y <= -12.5)) returnTriggerRouteReached = true
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
      save() { return { topBox: topBox.save(), topLever: topLever.save(), returnTriggerVisible, returnTriggerActivated, returnTriggerRouteReached, keyLever: keyLever.save(), keyLeverPulls, keyTriggerVisible, elevatorSpawned, elevator: elevator.save(), portalEnabled } },
      restore(snapshot) {
        topBox.restore(snapshot.topBox)
        returnTriggerVisible = snapshot.returnTriggerVisible || false
        returnTriggerActivated = snapshot.returnTriggerActivated ?? snapshot.portalEnabled ?? false
        returnTriggerRouteReached = snapshot.returnTriggerRouteReached || false
        returnTrigger.setVisible(returnTriggerVisible)
        topLever.restore(snapshot.topLever || false)
        restoring = true
        keyLeverPulls = snapshot.keyLeverPulls || 0
        keyTriggerVisible = snapshot.keyTriggerVisible || false
        keyTrigger.setVisible(keyTriggerVisible)
        keyLever.restore(snapshot.keyLever || false)
        restoring = false
        elevatorSpawned = snapshot.elevatorSpawned || false
        elevator.mesh.visible = elevatorSpawned
        elevator.restore(snapshot.elevator || elevator.save())
        portalEnabled = snapshot.portalEnabled || false
        exitPortal.visible = portalEnabled
      },
      hits() { return false },
      consumePortalReveal() {
        if (triggerRevealPending) {
          triggerRevealPending = false
          return 'floatingRouteReverse'
        }
        const revealed = portalRevealPending
        portalRevealPending = false
        return revealed ? 'floatingRoute' : null
      },
      recoverFall(target) {
        if (returnTriggerActivated && !returnTriggerRouteReached) return { ...chapter.floatingRouteRespawns.left }
        if (floatingRouteOrigin) return { ...chapter.floatingRouteRespawns[floatingRouteOrigin] }
        if (routeBeforeFloatingBlocks === 'top') return { ...chapter.floatingRouteRespawns.top }
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
    const routeLever = new Lever(this.group, chapter.routeLever, (open) => routeDoor.setOpen(open), audio)
    let routePlateActivations = 0
    let skyStageVisible = false
    let leverVisible = false
    let exitLever = null
    const syncExitLever = () => { if (exitLever) exitLever.mesh.visible = skyStageVisible && leverVisible }
    let portalEnabled = false
    let portalRevealPending = false
    let leverRevealPending = false
    const exitPortal = this.exitPortal
    let routePlateRearmed = false
    const routePlate = new PressurePlate(this.group, chapter.routePlate, (pressed) => {
      if (!pressed) return
      routePlateActivations += 1
      if (routePlateActivations === 1) {
        portalEnabled = true
        portalRevealPending = true
        exitPortal.visible = true
      } else {
        leverVisible = true
        syncExitLever()
        leverRevealPending = true
      }
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
    const updateRoutePlateAvailability = () => {
      if (routePlateActivations !== 1 || routePlateRearmed || keyPlate.remaining || relayPlate.remaining) return
      routePlateRearmed = true
      routePlate.setRemaining(1)
    }
    const farBox = new Box(this.group, chapter.farBox, { min: chapter.farBankLeftX - .55, max: chapter.farCliffX + .55 }, chapter.boxInteractions)
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
    let lastCanyonGroundBank = 'left'

    return {
      colliders: chapter.colliders,
      update(dt) {
        if (player.body.grounded && Math.abs(player.body.y - player.body.hh) < .08) {
          if (player.body.x <= chapter.skyStage.x + chapter.skyStage.w / 2) lastCanyonGroundBank = 'left'
          else if (player.body.x >= chapter.farBankLeftX) lastCanyonGroundBank = 'right'
        }
        const pushed = keyBox.update(dt, player, input, [...chapter.colliders, keyDoor.collider(), routeDoor.collider()].filter(Boolean))
        const farPushed = farBox.update(dt, player, input, chapter.colliders)
        const busy = keyBox.playerEngaged(player, input) || farBox.playerEngaged(player, input)
        routeLever.update(player, input, busy)
        if (skyStageVisible && leverVisible) exitLever.update(player, input, busy)
        player.setPushing(pushed || farPushed)
        pushed || farPushed ? audio.startScrape() : audio.stopScrape()
        keyPlate.update(keyBox)
        routePlate.update(keyBox)
        relayPlate.update(keyBox)
        updateRoutePlateAvailability()
        key.update(dt)
        ambient.update(dt, camera.camera.position.x)
      },
      dynamicColliders() { return [keyBox.collider(), farBox.collider(), keyDoor.collider(), routeDoor.collider(), routeLever.collider(), skyStageVisible ? chapter.skyStage : null, skyStageVisible && leverVisible ? exitLever.collider() : null, canyonStageVisible ? chapter.canyonStage : null].filter(Boolean) },
      save() { return { keyBox: keyBox.save(), farBox: farBox.save(), keyDoor: keyDoor.save(), routeDoor: routeDoor.save(), routeLever: routeLever.save(), keyPlateRemaining: keyPlate.remaining, routePlateActivations, routePlateRemaining: routePlate.remaining, routePlateRearmed, relayPlateRemaining: relayPlate.remaining, skyStageVisible, leverVisible, canyonStageVisible, exitLever: exitLever.save(), portalEnabled, lastCanyonGroundBank } },
      restore(snapshot) {
        keyBox.restore(snapshot.keyBox)
        farBox.restore(snapshot.farBox || farBox.save())
        keyDoor.restore(snapshot.keyDoor)
        routeDoor.restore(snapshot.routeDoor)
        routeLever.restore(snapshot.routeLever ?? snapshot.routeDoor ?? false)
        routePlateActivations = snapshot.routePlateActivations ?? (snapshot.portalEnabled ? 1 : 0)
        keyPlate.setRemaining(snapshot.keyPlateRemaining ?? (snapshot.keyDoor ? 0 : 1))
        routePlate.setRemaining(snapshot.routePlateRemaining ?? (snapshot.portalEnabled ? 0 : 1))
        routePlateRearmed = snapshot.routePlateRearmed ?? routePlateActivations >= 2
        relayPlate.setRemaining(snapshot.relayPlateRemaining ?? (snapshot.skyStageVisible ? 0 : 1))
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
        portalEnabled = snapshot.portalEnabled ?? routePlateActivations >= 2
        exitPortal.visible = portalEnabled
        updateRoutePlateAvailability()
        lastCanyonGroundBank = snapshot.lastCanyonGroundBank ?? snapshot.canyonRespawnSide ?? 'left'
      },
      hits() { return false },
      recoverFall(target) {
        return lastCanyonGroundBank === 'left' ? { x: 4, y: 2 } : { x: 13.2, y: 2 }
      },
      resetKey() { key.reset() },
      collectKey(target) { return key.collect(target) },
      reachedExit(target) { return portalEnabled && target.body.x > chapter.exitX },
      consumePortalReveal() {
        if (leverRevealPending) {
          leverRevealPending = false
          return 'springLever'
        }
        const revealed = portalRevealPending
        portalRevealPending = false
        return revealed
      },
    }
  }

  loadCore(chapter, player, input, audio, collectedKeys) {
    const key = this.createKey(chapter, collectedKeys)
    const elevatorMaterial = new THREE.MeshStandardMaterial({ color: '#314b56', emissive: '#63dce4', emissiveIntensity: .45, roughness: .7 })
    const elevator = {
      body: { x: chapter.elevator.x, y: chapter.elevator.lowerY, w: chapter.elevator.w, h: chapter.elevator.h },
      mesh: new THREE.Mesh(new THREE.BoxGeometry(chapter.elevator.w, chapter.elevator.h, .9), elevatorMaterial),
      targetY: chapter.elevator.lowerY,
      armed: false,
      moving: false,
      request(targetY, startImmediately = false) {
        this.targetY = targetY
        this.armed = true
        this.moving = startImmediately
      },
      update(dt, rider, block) {
        const previousTop = this.body.y + this.body.h / 2
        const carriesRider = Math.abs(rider.body.x - this.body.x) < this.body.w / 2 + rider.body.hw - .01 && Math.abs(rider.body.y - rider.body.hh - previousTop) < .12
        const carriesBlock = !block.carried && !block.falling && Math.abs(block.body.x - this.body.x) < this.body.w / 2 + block.body.w / 2 - .01 && Math.abs(block.body.y - block.body.h / 2 - previousTop) < .12
        if (!this.armed) return
        const distance = this.targetY - this.body.y
        if (!this.moving && !carriesRider) return
        if (Math.abs(distance) < .01) {
          this.body.y = this.targetY
          this.moving = false
          this.armed = false
        }
        else {
          const movement = Math.sign(distance) * Math.min(Math.abs(distance), chapter.elevator.speed * dt)
          this.body.y += movement
          if (carriesRider) {
            rider.body.y += movement
            rider.body.vy = 0
            rider.body.grounded = true
          }
          if (carriesBlock) {
            block.body.y += movement
            block.lastPlaced = { x: block.body.x, y: block.body.y }
            block.sync()
          }
          this.moving = true
        }
        this.mesh.position.y = this.body.y
      },
      save() { return { y: this.body.y, targetY: this.targetY, armed: this.armed, moving: this.moving } },
      restore(snapshot) { this.body.y = snapshot.y; this.targetY = snapshot.targetY; this.armed = snapshot.armed || false; this.moving = snapshot.moving || false; this.mesh.position.y = this.body.y },
    }
    elevator.mesh.position.set(elevator.body.x, elevator.body.y, 0)
    elevator.mesh.castShadow = true
    this.group.add(elevator.mesh)
    const elevatorLight = new THREE.PointLight('#63dce4', 1.8, 4, 2)
    elevatorLight.position.set(0, .45, .8)
    elevator.mesh.add(elevatorLight)
    const elevatorLever = new Lever(this.group, { x: elevator.body.x + chapter.elevatorLever.offsetX, y: elevator.body.y + chapter.elevatorLever.offsetY }, () => {
      const targetY = Math.abs(elevator.body.y - chapter.elevator.upperY) < Math.abs(elevator.body.y - chapter.elevator.lowerY)
        ? chapter.elevator.lowerY
        : chapter.elevator.upperY
      elevator.request(targetY, true)
    }, audio)
    ;[elevatorLever].forEach((lever) => {
      lever.mesh.material.color.set('#dffcff')
      lever.mesh.material.emissive.set('#63dce4')
      lever.mesh.material.emissiveIntensity = .8
    })
    const groundBox = new Box(this.group, chapter.groundBox, { min: -16.5, max: 12.7 })
    const groundDoor = new Door(this.group, chapter.groundDoor)
    groundDoor.mesh.material.color.set('#314b56')
    groundDoor.mesh.material.emissive.set('#63dce4')
    groundDoor.mesh.material.emissiveIntensity = .45
    const groundDoorLight = new THREE.PointLight('#63dce4', 1.35, 3, 2)
    groundDoorLight.position.set(0, 0, .8)
    groundDoor.mesh.add(groundDoorLight)
    const groundPlate = new PressurePlate(this.group, chapter.groundPlate, (pressed) => {
      if (pressed) groundDoor.setY(chapter.groundDoor.upperY)
    }, Infinity, { color: '#65d978' })
    const groundPlateLight = new THREE.PointLight('#65d978', 1.2, 3, 2)
    groundPlateLight.position.set(0, 0, .8)
    groundPlate.mesh.add(groundPlateLight)
    const topPlate = new PressurePlate(this.group, chapter.topPlate, (pressed) => {
      if (pressed) groundDoor.setY(chapter.groundDoor.y)
    }, Infinity, { color: '#65d978' })
    const topPlateLight = new THREE.PointLight('#65d978', 1.2, 3, 2)
    topPlateLight.position.set(0, 0, .8)
    topPlate.mesh.add(topPlateLight)
    const secondDoor = new Door(this.group, chapter.secondDoor)
    secondDoor.mesh.material.color.set('#314b56')
    secondDoor.mesh.material.emissive.set('#63dce4')
    secondDoor.mesh.material.emissiveIntensity = .45
    const secondDoorLight = new THREE.PointLight('#63dce4', 1.35, 3, 2)
    secondDoorLight.position.set(0, 0, .8)
    secondDoor.mesh.add(secondDoorLight)
    const secondGroundPlate = new PressurePlate(this.group, chapter.secondGroundPlate, (pressed) => {
      if (pressed) secondDoor.setY(chapter.secondDoor.y)
    }, Infinity, { color: '#65d978' })
    const secondGroundPlateLight = new THREE.PointLight('#65d978', 1.2, 3, 2)
    secondGroundPlateLight.position.set(0, 0, .8)
    secondGroundPlate.mesh.add(secondGroundPlateLight)
    const secondTopPlate = new PressurePlate(this.group, chapter.secondTopPlate, (pressed) => {
      if (pressed) secondDoor.setY(chapter.secondDoor.lowerY)
    }, Infinity, { color: '#65d978' })
    const secondTopPlateLight = new THREE.PointLight('#65d978', 1.2, 3, 2)
    secondTopPlateLight.position.set(0, 0, .8)
    secondTopPlate.mesh.add(secondTopPlateLight)
    const beacon = new THREE.PointLight('#dffcff', 0, 7, 2)
    beacon.position.set(chapter.exitX - .7, 2.8, 1)
    this.group.add(beacon)
    let portalEnabled = false
    let portalRevealPending = false
    let keyLeverRevealPending = false
    let restoring = false
    const keyLever = new Lever(this.group, chapter.keyLever, (on) => key.setVisible(on), audio, { oneShot: true })
    keyLever.setVisible(false)
    let keyLeverVisible = false
    const portalLever = new Lever(this.group, chapter.portalLever, (on) => {
      portalEnabled = on
      this.exitPortal.visible = on
      beacon.intensity = on ? 5 : 0
      if (on && !restoring) portalRevealPending = true
    }, audio, { oneShot: true })
    const rightWallLever = new Lever(this.group, chapter.rightWallLever, (on) => {
      keyLeverVisible = on
      keyLever.setVisible(on)
      if (on && !restoring) keyLeverRevealPending = true
    }, audio, { oneShot: true })
    let routeRespawn = { ...chapter.spawn }
    let blockRespawn = null
    let rightCanyonRoute = 'ground'
    let rightCanyonBlockNearby = false
    const playerSpaceIsClear = (position) => [
      ...chapter.colliders,
      elevator.body,
      groundDoor.collider(),
      secondDoor.collider(),
    ].filter(Boolean).every((collider) => (
      Math.abs(position.x - collider.x) >= player.body.hw + collider.w / 2 - .001 ||
      Math.abs(position.y - collider.y) >= player.body.hh + collider.h / 2 - .001
    ))
    return {
      colliders: chapter.colliders,
      update(dt) {
        elevatorLever.setPosition(elevator.body.x + chapter.elevatorLever.offsetX, elevator.body.y + chapter.elevatorLever.offsetY)
        const boxPushed = groundBox.update(dt, player, input, [...chapter.colliders, elevator.body, groundDoor.collider(), secondDoor.collider()].filter(Boolean))
        elevatorLever.update(player, input)
        keyLever.update(player, input)
        portalLever.update(player, input)
        rightWallLever.update(player, input)
        elevator.update(dt, player, groundBox)
        groundPlate.update(groundBox)
        topPlate.update(groundBox)
        secondGroundPlate.update(groundBox)
        secondTopPlate.update(groundBox)
        const standingOnBlock = !groundBox.carried && !groundBox.falling && Math.abs(player.body.x - groundBox.body.x) < groundBox.body.w / 2 + player.body.hw - .05 && Math.abs((player.body.y - player.body.hh) - (groundBox.body.y + groundBox.body.h / 2)) < .08
        if (standingOnBlock || player.jumpLaunchBlock === groundBox) {
          blockRespawn = { x: groundBox.body.x, y: groundBox.body.y + groundBox.body.h / 2 + player.body.hh }
        } else if (player.body.grounded && playerSpaceIsClear(player.body)) routeRespawn = { x: player.body.x, y: player.body.y }
        if (standingOnBlock || player.jumpLaunchBlock === groundBox || (player.body.grounded && player.body.y > .5)) {
          rightCanyonRoute = player.body.y >= 5 ? 'upper' : 'ground'
          rightCanyonBlockNearby = groundBox.carried || standingOnBlock || Math.hypot(player.body.x - groundBox.body.x, player.body.y - groundBox.body.y) < 2.5
        }
        player.setPushing(boxPushed)
        key.update(dt)
      },
      dynamicColliders() { return [elevator.body, groundBox.collider(), groundDoor.collider(), secondDoor.collider()].filter(Boolean) },
      save() {
        return {
          elevator: elevator.save(), elevatorLever: elevatorLever.save(), groundBox: groundBox.save(), groundDoorY: groundDoor.body.y,
          groundPlateRemaining: groundPlate.remaining, topPlateRemaining: topPlate.remaining, secondDoorY: secondDoor.body.y,
          secondGroundPlateRemaining: secondGroundPlate.remaining, secondTopPlateRemaining: secondTopPlate.remaining,
          keyLever: keyLever.save(), keyLeverVisible, portalLever: portalLever.save(), portalEnabled, rightWallLever: rightWallLever.save(), routeRespawn, blockRespawn, rightCanyonRoute, rightCanyonBlockNearby,
        }
      },
      restore(snapshot) {
        elevator.restore(snapshot.elevator || elevator.save())
        elevatorLever.restore(snapshot.elevatorLever ?? false)
        groundBox.restore(snapshot.groundBox || groundBox.save())
        groundDoor.setY(snapshot.groundDoorY ?? chapter.groundDoor.y)
        groundPlate.setRemaining(snapshot.groundPlateRemaining ?? Infinity)
        topPlate.setRemaining(snapshot.topPlateRemaining ?? Infinity)
        secondDoor.setY(snapshot.secondDoorY ?? chapter.secondDoor.y)
        secondGroundPlate.setRemaining(snapshot.secondGroundPlateRemaining ?? Infinity)
        secondTopPlate.setRemaining(snapshot.secondTopPlateRemaining ?? Infinity)
        restoring = true
        portalLever.restore(snapshot.portalLever ?? snapshot.portalEnabled ?? false)
        rightWallLever.restore(snapshot.rightWallLever ?? snapshot.keyLeverVisible ?? false)
        keyLever.restore(snapshot.keyLever ?? false)
        restoring = false
        keyLeverVisible = snapshot.keyLeverVisible ?? Boolean(snapshot.rightWallLever)
        keyLever.setVisible(keyLeverVisible)
        routeRespawn = snapshot.routeRespawn || snapshot.fallRespawn || { ...chapter.spawn }
        blockRespawn = snapshot.blockRespawn || null
        rightCanyonRoute = snapshot.rightCanyonRoute || 'ground'
        rightCanyonBlockNearby = snapshot.rightCanyonBlockNearby || false
      },
      hits() { return false },
      recoverFall(target) {
        if (target.body.x > chapter.leftCanyon.minX && target.body.x < chapter.leftCanyon.maxX) return { resetChapter: true }
        if (target.body.x > chapter.rightCanyon.minX) {
          const recovery = rightCanyonRoute === 'upper' ? chapter.rightCanyon.upperRespawn : chapter.rightCanyon.groundRespawn
          return {
            position: { x: recovery.x, y: recovery.y },
            blockPosition: rightCanyonBlockNearby ? recovery.block : null,
          }
        }
        const playerTopOfBlock = { x: groundBox.body.x, y: groundBox.body.y + groundBox.body.h / 2 + player.body.hh }
        const supportsBlock = [
          ...chapter.colliders,
          elevator.body,
          groundDoor.collider(),
          secondDoor.collider(),
        ].filter(Boolean).some((collider) => (
          Math.abs(groundBox.body.x - collider.x) < groundBox.body.w / 2 + collider.w / 2 - .05 &&
          Math.abs((groundBox.body.y - groundBox.body.h / 2) - (collider.y + collider.h / 2)) < .08
        ))
        if (blockRespawn && !groundBox.carried && !groundBox.falling && supportsBlock && playerSpaceIsClear(playerTopOfBlock)) return playerTopOfBlock
        return playerSpaceIsClear(routeRespawn) ? { ...routeRespawn } : { ...chapter.spawn }
      },
      applyFallRecovery(recovery) {
        if (!recovery?.blockPosition) return
        groundBox.restore({ ...recovery.blockPosition, falling: false, fallVelocity: 0 })
      },
      consumePortalReveal() {
        if (keyLeverRevealPending) {
          keyLeverRevealPending = false
          return 'winterKeyLever'
        }
        const revealed = portalRevealPending
        portalRevealPending = false
        return revealed
      },
      resetKey() { key.reset() },
      collectKey(target) { return key.collect(target) },
      reachedExit(target) { return portalEnabled && target.body.x > chapter.exitX },
    }
  }
}
