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
    for (const collider of chapter.colliders) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(collider.w, collider.h, 1), groundMaterial)
      mesh.position.set(collider.x, collider.y, 0)
      mesh.castShadow = true
      mesh.receiveShadow = true
      this.group.add(mesh)
    }
    if (chapter.kind === 'works') return this.loadWorks(chapter, player, input, audio, camera, collectedKeys)
    if (chapter.kind === 'floodline') return this.loadFloodline(chapter, player, input, audio, camera, collectedKeys)
    if (chapter.kind === 'core') return this.loadCore(chapter, player, input, audio, collectedKeys)
    return this.loadOutskirts(chapter, player, input, audio, camera, collectedKeys)
  }

  createKey(chapter, collectedKeys) {
    const key = chapter.key
    if (!key || collectedKeys.has(key.id)) return { update() {}, collect() { return null } }
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
    return {
      update(dt) {
        elapsed += dt
        bulb.position.y = key.y + Math.sin(elapsed * 2.4) * .07
        base.position.y = key.y - .21 + Math.sin(elapsed * 2.4) * .02
        light.position.y = bulb.position.y
        light.intensity = 1.9 + Math.sin(elapsed * 2.4) * .4
      },
      collect(player) {
        if (collected || Math.hypot(player.body.x - key.x, player.body.y - key.y) > .75) return null
        collected = true
        bulb.visible = false
        base.visible = false
        light.visible = false
        return key.id
      },
    }
  }

  loadOutskirts(chapter, player, input, audio, camera, collectedKeys) {
    const ambient = buildOutskirtsAmbient(this.group, chapter)
    const key = this.createKey(chapter, collectedKeys)
    const door = new Door(this.group, chapter.door)
    const lever = new Lever(this.group, chapter.lever, (open) => door.setOpen(open), audio)
    const box = new Box(this.group, chapter.box, { min: chapter.sideDoor ? -27 : -22, max: 23 })
    const plate = chapter.plate ? new PressurePlate(this.group, chapter.plate, (pressed) => { if (pressed) door.setOpen(true) }) : null
    const sideDoor = chapter.sideDoor ? new Door(this.group, chapter.sideDoor) : null
    const sidePlate = chapter.sidePlate ? new PressurePlate(this.group, chapter.sidePlate, (pressed) => { if (pressed) sideDoor.setOpen(true) }) : null
    const killVolume = chapter.hazard ? new KillVolume(this.group, chapter.hazard) : null
    const searchlight = new Searchlight(this.group, chapter.searchlight)
    const shadeBox = chapter.shadeBox ? new Box(this.group, chapter.shadeBox, { min: chapter.shadeBox.x - .5, max: chapter.shadePlate.x + .2 }) : null
    const shadeLight = chapter.shadeLight ? new Searchlight(this.group, chapter.shadeLight) : null
    const shadeDoor = chapter.shadeDoor ? new Door(this.group, chapter.shadeDoor) : null
    const shadePlate = chapter.shadePlate ? new PressurePlate(this.group, chapter.shadePlate, (pressed) => { if (pressed) shadeDoor.setOpen(true) }) : null
    const elevator = new THREE.Mesh(new THREE.BoxGeometry(chapter.elevator.w, chapter.elevator.h, 1), new THREE.MeshStandardMaterial({ color: chapter.palette.structure, roughness: .8 }))
    elevator.position.set(chapter.elevator.x, chapter.elevator.y, 0)
    this.group.add(elevator)
    const beacon = new THREE.PointLight(chapter.palette.accent, 5, 6, 2)
    beacon.position.set(chapter.elevator.x, 2.8, 1)
    this.group.add(beacon)
    return {
      colliders: chapter.colliders,
      update(dt) {
        const engaged = box.playerEngaged(player, input) || shadeBox?.playerEngaged(player, input) || false
        lever.update(player, input, engaged)
        const pushed = box.update(dt, player, input, [...chapter.colliders, lever.collider(), door.collider()].filter(Boolean))
        const shadePushed = shadeBox?.update(dt, player, input, [...chapter.colliders, shadeDoor?.collider()].filter(Boolean)) || false
        player.setPushing(pushed || shadePushed)
        pushed || shadePushed ? audio.startScrape() : audio.stopScrape()
        plate?.update(box)
        sidePlate?.update(box)
        shadePlate?.update(shadeBox)
        const blockers = [box.collider(), shadeBox?.collider()].filter(Boolean)
        searchlight.update(dt, player, blockers)
        shadeLight?.update(dt, player, blockers)
        key.update(dt)
        ambient.update(dt, camera.camera.position.x)
      },
      dynamicColliders() { return [box.collider(), shadeBox?.collider(), lever.collider(), door.collider(), sideDoor?.collider(), shadeDoor?.collider()].filter(Boolean) },
      save() { return { box: box.save(), shadeBox: shadeBox?.save(), lever: lever.save(), door: door.save(), sideDoor: sideDoor?.save(), shadeDoor: shadeDoor?.save() } },
      restore(snapshot) { box.restore(snapshot.box); shadeBox?.restore(snapshot.shadeBox); lever.restore(snapshot.lever); door.restore(snapshot.door); if (snapshot.sideDoor !== undefined) sideDoor?.restore(snapshot.sideDoor); if (snapshot.shadeDoor !== undefined) shadeDoor?.restore(snapshot.shadeDoor) },
      hits(target) { return (killVolume?.hits(target) || false) || searchlight.hits() || shadeLight?.hits() || false },
      collectKey(target) { return key.collect(target) },
      reachedExit(target) { return target.body.x > chapter.exitX },
    }
  }

  loadWorks(chapter, player, input, audio, camera, collectedKeys) {
    const ambient = buildWorksAmbient(this.group, chapter)
    const key = this.createKey(chapter, collectedKeys)

    // Puzzle (a): weigh the plate with a box, hold doorA open, sprint through.
    const doorA = new Door(this.group, chapter.doorA)
    const boxA = new Box(this.group, chapter.boxA, { min: -23, max: chapter.plateA.x + .4 })
    const plateA = new PressurePlate(this.group, chapter.plateA, (pressed) => { if (pressed) doorA.setOpen(true) })

    // Puzzle (b): time the conveyor crossing between the two crushers.
    const crushers = chapter.crushers.map((crusher) => new Crusher(this.group, crusher, '#8a5a2e'))
    const conveyors = chapter.conveyors.map((conveyor) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(conveyor.w, .05, .95), new THREE.MeshStandardMaterial({ color: '#8a5a2e', roughness: .65 }))
      mesh.position.set(conveyor.x, -.02, .05)
      this.group.add(mesh)
      return { ...conveyor, mesh }
    })

    // Puzzle (c): energize the feeder, then rush a box onto it before the relatch timer expires.
    const doorC = new Door(this.group, chapter.doorC)
    let doorCUnlocked = false
    let relatch = 0
    let feederPowered = false
    const feeder = chapter.feederConveyor
    const feederMaterial = new THREE.MeshStandardMaterial({ color: '#382d26', emissive: '#000000', roughness: .7 })
    const feederMesh = new THREE.Mesh(new THREE.BoxGeometry(feeder.w, .05, .95), feederMaterial)
    feederMesh.position.set(feeder.x, -.02, .05)
    this.group.add(feederMesh)
    const feederLight = new THREE.PointLight(chapter.palette.accent, 0, 3, 2)
    feederLight.position.set(feeder.x, 1, 1)
    this.group.add(feederLight)
    const setFeederPower = (on) => {
      feederPowered = on
      feederMaterial.color.set(on ? '#72503a' : '#382d26')
      feederMaterial.emissive.set(on ? chapter.palette.accent : '#000000')
      feederMaterial.emissiveIntensity = on ? .35 : 0
      feederLight.intensity = on ? 2.2 : 0
    }
    const powerLever = new Lever(this.group, chapter.powerLever, setFeederPower, audio)
    const leverC = new Lever(this.group, chapter.leverC, (on) => { if (on && feederPowered && !doorCUnlocked) relatch = chapter.relatchTime }, audio)
    const boxC = new Box(this.group, chapter.boxC, { min: chapter.leverC.x + .5, max: chapter.exitX - .5 })
    const plateD = new PressurePlate(this.group, chapter.plateD, (pressed) => { if (pressed && relatch > 0 && !doorCUnlocked) { doorCUnlocked = true; doorC.setOpen(true) } })

    const beacon = new THREE.PointLight(chapter.palette.accent, 4, 6, 2)
    beacon.position.set(chapter.exitX - .7, 2.8, 1)
    this.group.add(beacon)

    return {
      colliders: chapter.colliders,
      update(dt) {
        plateA.update(boxA)
        const pushedA = boxA.update(dt, player, input, [...chapter.colliders, doorA.collider()].filter(Boolean))

        crushers.forEach((crusher) => crusher.update(dt))
        conveyors.forEach((conveyor) => {
          if (player.body.grounded && Math.abs(player.body.x - conveyor.x) < conveyor.w / 2 && player.body.y < 1.2) player.body.vx += conveyor.direction * dt * 7
        })

        const engaged = boxA.playerEngaged(player, input) || boxC.playerEngaged(player, input)
        powerLever.update(player, input, engaged)
        leverC.update(player, input, engaged)
        if (relatch > 0 && !doorCUnlocked) relatch = Math.max(0, relatch - dt)
        const pushedC = boxC.update(dt, player, input, [...chapter.colliders, leverC.collider(), doorC.collider()].filter(Boolean))
        if (feederPowered && Math.abs(boxC.body.x - feeder.x) < feeder.w / 2 && boxC.body.y < 1.2) { boxC.body.x += feeder.direction * dt * 2.4; boxC.sync() }
        plateD.update(boxC)

        pushedA || pushedC ? audio.startScrape() : audio.stopScrape()
        player.setPushing(pushedA || pushedC)
        key.update(dt)
        ambient.update(dt, camera.camera.position.x)
      },
      dynamicColliders() { return [boxA.collider(), boxC.collider(), powerLever.collider(), leverC.collider(), doorA.collider(), doorC.collider(), ...crushers.map((crusher) => crusher.collider(player))].filter(Boolean) },
      save() { return { boxA: boxA.save(), boxC: boxC.save(), powerLever: powerLever.save(), leverC: leverC.save(), doorA: doorA.save(), doorC: doorC.save(), doorCUnlocked, relatch } },
      restore(snapshot) {
        boxA.restore(snapshot.boxA)
        boxC.restore(snapshot.boxC)
        powerLever.restore(snapshot.powerLever)
        leverC.restore(snapshot.leverC)
        doorA.restore(snapshot.doorA)
        doorC.restore(snapshot.doorC)
        doorCUnlocked = snapshot.doorCUnlocked
        relatch = snapshot.relatch
      },
      hits() { return false },
      collectKey(target) { return key.collect(target) },
      reachedExit(target) { return target.body.x > chapter.exitX },
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
    const keyBox = new Box(this.group, chapter.keyBox, { min: -22, max: -9 })
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
    const relayBox = new Box(this.group, chapter.relayBox, { min: -4, max: chapter.canyonStage.x })
    const farBox = new Box(this.group, chapter.farBox, { min: chapter.farBankLeftX - .55, max: chapter.farCliffX + .55 })
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
        if (!relayBox.falling && relayBox.body.x > chapter.exitLever.x + relayBox.body.w / 2) relayBox.startFalling()
        const farBoxPastLeftCliff = farBox.body.x < chapter.farBankLeftX - farBox.body.w / 2
        const farBoxPastRightCliff = farBox.body.x > chapter.farCliffX + farBox.body.w / 2
        if (!farBox.falling && (farBoxPastLeftCliff || farBoxPastRightCliff)) farBox.startFalling()
        relayBox.fall(dt)
        farBox.fall(dt)
        const busy = keyBox.playerEngaged(player, input) || relayBox.playerEngaged(player, input) || farBox.playerEngaged(player, input)
        if (skyStageVisible && leverVisible) exitLever.update(player, input, busy)
        player.setPushing(pushed || relayPushed || farPushed)
        pushed || relayPushed || farPushed ? audio.startScrape() : audio.stopScrape()
        keyPlate.update(keyBox)
        routePlate.update(keyBox)
        relayPlate.update(relayBox)
        const relayTop = relayBox.body.y + relayBox.body.h / 2
        const farTop = farBox.body.y + farBox.body.h / 2
        const standingOnRelayBox = !relayBox.falling && Math.abs(player.body.x - relayBox.body.x) < relayBox.body.w / 2 - .05 && Math.abs((player.body.y - player.body.hh) - relayTop) < .08
        const standingOnFarBox = !farBox.falling && Math.abs(player.body.x - farBox.body.x) < farBox.body.w / 2 - .05 && Math.abs((player.body.y - player.body.hh) - farTop) < .08
        if (standingOnRelayBox || standingOnFarBox) player.armBonusJump()
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
      },
      hits() { return false },
      collectKey(target) { return key.collect(target) },
      reachedExit(target) { return farBox.falling && target.body.x > chapter.exitX },
    }
  }

  loadCore(chapter, player, input, audio, collectedKeys) {
    const ambient = buildWinterAmbient(this.group, chapter)
    const key = this.createKey(chapter, collectedKeys)
    const core = new THREE.Group()
    core.position.set(0, 4.5, -2)
    for (const radius of [1.4, 2.15, 2.9]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, .12, 6, 24), new THREE.MeshStandardMaterial({ color: '#e8f0ee', emissive: '#657578', emissiveIntensity: .3, roughness: .5 }))
      ring.rotation.x = Math.PI / 2
      core.add(ring)
    }
    this.group.add(core)
    const beacon = new THREE.PointLight(chapter.palette.accent, 4, 6, 2)
    beacon.position.set(chapter.exitX - .7, 2.8, 1)
    this.group.add(beacon)
    let switched = false
    const lever = new Lever(this.group, chapter.lever, (on) => { switched = on }, audio)
    return {
      colliders: chapter.colliders,
      update(dt) {
        core.rotation.z += dt * .25
        lever.update(player, input)
        key.update(dt)
        ambient.update(dt, player.body.x)
      },
      dynamicColliders() { return [lever.collider()].filter(Boolean) },
      save() { return { switched } },
      restore(snapshot) { switched = snapshot.switched },
      hits() { return false },
      collectKey(target) { return key.collect(target) },
      reachedExit(target) { return switched && target.body.x > chapter.exitX },
    }
  }
}
