import * as THREE from 'three'
import './style.css'
import { Game } from './core/Game.js'
import { Input } from './core/Input.js'
import { Player } from './player/Player.js'
import { Camera } from './core/Camera.js'
import { Audio } from './core/Audio.js'
import { Checkpoint } from './core/Checkpoint.js'
import { ChapterLoader } from './world/ChapterLoader.js'
import { spring } from './chapters/spring.js'
import { summer } from './chapters/summer.js'
import { autumn } from './chapters/autumn.js'
import { winter } from './chapters/winter.js'

const app = document.querySelector('#app')
app.innerHTML = '<div id="start"><div id="start-content"><button id="start-button" type="button">enter</button><button id="guide-button" type="button">how to play</button><div id="chapter-select" aria-label="Select chapter"><button data-chapter="spring" type="button">spring</button><button data-chapter="summer" type="button">summer</button><button data-chapter="autumn" type="button">autumn</button><button data-chapter="winter" type="button">winter</button></div></div><section id="guide" aria-labelledby="guide-title" aria-hidden="true"><div id="guide-content"><p class="guide-kicker">UNDERTOW FIELD NOTES</p><h1 id="guide-title">Find a way through.</h1><div id="guide-grid"><article><kbd>A</kbd><kbd>D</kbd><h2>Move</h2><p>Run, jump, and use the terrain to find a route.</p></article><article><kbd>W</kbd><h2>Jump</h2><p>Standing on a carried block readies one extra jump.</p></article><article><kbd>E</kbd><h2>Act</h2><p>Carry blocks, pull levers, and place blocks on red triggers.</p></article><article><kbd>Q</kbd><h2>Return</h2><p>Use a lavender portal when you are close enough to it.</p></article><article><span class="guide-mark">KEY</span><h2>Collect</h2><p>Optional keys persist once you leave a chapter through its exit.</p></article><article><span class="guide-mark">CHECKPOINT</span><h2>Recover</h2><p>Passing a checkpoint changes where a fall sends you back.</p></article></div><button id="guide-back" type="button">back</button></div></section></div><div id="key-hud" aria-live="polite">keys <span id="key-hud-count">0</span></div><div id="death" aria-hidden="true"></div><div id="pause"><button data-pause="resume" type="button">resume</button><button data-pause="restart" type="button">restart chapter</button></div><div id="ending" aria-live="polite"><h1>UNDERTOW</h1><p id="ending-message">thank you for playing.</p><p id="key-count">0/4 keys</p></div><div id="touch-controls" aria-hidden="true"><div class="touch-half"><button data-input="left" aria-label="Move left">&#x2039;</button><button data-input="right" aria-label="Move right">&#x203a;</button></div><div class="touch-half"><button data-input="jump" aria-label="Jump">A</button><button data-input="action" aria-label="Action">B</button></div></div>'
const guide = document.querySelector('#guide')
guide.remove()
app.append(guide)
guide.innerHTML = '<div id="guide-content"><p class="guide-kicker">UNDERTOW FIELD NOTES</p><h1 id="guide-title">Find a way through.</h1><section class="guide-section" aria-labelledby="commands-title"><h2 id="commands-title">Key Commands</h2><div class="guide-grid guide-commands"><article><kbd>A</kbd><kbd>D</kbd><span class="key-or">or</span><kbd>&larr;</kbd><kbd>&rarr;</kbd><h3>Move</h3></article><article><kbd>W</kbd><span class="key-or">or</span><kbd>space</kbd><h3>Jump</h3></article><article><kbd>E</kbd><h3>Action</h3><p>Carry blocks and pull levers.</p></article><article><kbd>Q</kbd><h3>Portal</h3></article><article><kbd>escape</kbd><h3>Pause</h3></article></div></section><section class="guide-section" aria-labelledby="objects-title"><h2 id="objects-title">World Objects</h2><div class="guide-grid guide-objects"><article><span class="guide-mark">BLOCK</span><h3>Carry</h3><p>Carry blocks, stand on one to double jump, or place them on red triggers.</p></article><article><span class="guide-mark">LEVER</span><h3>Change</h3><p>Pull levers to move doors, platforms, and routes.</p></article><article><span class="guide-mark">PORTAL</span><h3>Return</h3><p>Use lavender portals when you are close enough to them.</p></article><article><span class="guide-mark">KEY</span><h3>Collect</h3><p>Optional keys persist once you leave through a chapter exit.</p></article><article><span class="guide-mark">CHECKPOINT</span><h3>Recover</h3><p>Passing one changes where a fall sends you back.</p></article></div></section><button id="guide-back" type="button">back</button></div>'
const pauseGuideButton = document.createElement('button')
pauseGuideButton.type = 'button'
pauseGuideButton.textContent = 'how to play'
pauseGuideButton.dataset.pause = 'guide'
document.querySelector('#pause').append(pauseGuideButton)

const scene = new THREE.Scene()
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.domElement.setAttribute('tabindex', '0')
renderer.domElement.style.outline = 'none'
app.prepend(renderer.domElement)
setTimeout(() => renderer.domElement.focus(), 100)
renderer.domElement.addEventListener('mousedown', () => renderer.domElement.focus())

const input = new Input(renderer.domElement, document.querySelector('#touch-controls'))
const audio = new Audio()
const player = new Player(scene, input, audio, spring.spawn)
const camera = new Camera(player)
const loader = new ChapterLoader(scene)
const collectedKeys = new Set()
const bankedKeys = new Set()
const chapterStates = new Map()
let chapterData = spring
let chapter = loader.load(chapterData, player, input, audio, camera, collectedKeys)
camera.setZones(chapterData.zones || [])
let checkpoint = new Checkpoint(chapterData.checkpoints[0], chapter)
let checkpointIndex = 0
let finished = false
let paused = false
let portalPanActive = false
let ending = false
let endingElapsed = 0
const fallDeathY = -8
const autumnFallDeathY = -16
const endingDuration = 20
const endingWalkSpeed = 3.2
const endingFadeStart = endingDuration - 4
checkpoint.activate()

const keyLight = new THREE.DirectionalLight('#a9cbd5', 2.1)
keyLight.position.set(-12, 13, 8)
keyLight.castShadow = true
keyLight.shadow.mapSize.set(1024, 1024)
const hemiLight = new THREE.HemisphereLight('#66818d', '#071015', 1.05)
scene.add(keyLight, hemiLight)
const lamp = new THREE.PointLight(spring.palette.accent, 9, 14, 2)
lamp.position.set(9, 5, 1)
scene.add(lamp)

function loadChapter(nextChapter, entryPosition = nextChapter.spawn, restoreState = false) {
  chapterData = nextChapter
  chapter = loader.load(chapterData, player, input, audio, camera, collectedKeys)
  camera.setZones(chapterData.zones || [])
  if (restoreState && chapterStates.has(nextChapter)) chapter.restore(chapterStates.get(nextChapter))
  player.reset(entryPosition)
  checkpoint = new Checkpoint(chapterData.checkpoints[0], chapter)
  checkpointIndex = 0
  checkpoint.activate()
  lamp.color.set(chapterData.palette.accent)
  keyLight.intensity = 2.1
  hemiLight.intensity = 1.05
  lamp.intensity = 9
  audio.startAmbience(chapterData.kind || 'outskirts')
}

function beginEnding() {
  ending = true
  endingElapsed = 0
  audio.stopAmbience()
  audio.startHeartbeat()
  keyLight.intensity = .04
  hemiLight.intensity = .05
  lamp.intensity = 0
  scene.background = new THREE.Color('#000000')
  scene.fog.color.set('#000000')
  scene.fog.near = 3
  scene.fog.far = 9
}

let respawnGrace = 0
function updateKeyHud() { document.querySelector('#key-hud-count').textContent = collectedKeys.size }
function bankCurrentKey() {
  const keyId = chapterData.key?.id
  if (keyId && collectedKeys.has(keyId)) bankedKeys.add(keyId)
}
function dieAtCheckpoint() {
  audio.death()
  camera.shake()
  document.querySelector('#death').classList.add('visible')
  const carriedBox = player.carriedBox
  const fallRespawn = chapter.recoverFall?.(player) || chapter.recoverCanyonFall?.(player)
  checkpoint.respawn(player, fallRespawn || checkpoint.position)
  carriedBox?.placeNextTo(player)
  respawnGrace = .8
  setTimeout(() => document.querySelector('#death').classList.remove('visible'), 650)
}

function restartChapter() {
  ending = false
  audio.death()
  camera.shake()
  document.querySelector('#death').classList.add('visible')
  loadChapter(chapterData)
  setTimeout(() => document.querySelector('#death').classList.remove('visible'), 650)
}

function finish() {
  finished = true
  audio.stopHeartbeat()
  const keyCount = collectedKeys.size
  const endingMessage = keyCount === 0 ? 'the house waits with its windows dark.' : keyCount === 1 ? 'one small light answers.' : keyCount === 2 ? 'two lights carry you through the dark.' : 'every gathered light finds its way home.'
  document.querySelector('#ending-message').textContent = endingMessage
  document.querySelector('#key-count').textContent = `${keyCount}/4 keys`
  document.querySelector('#ending').classList.add('visible')
}

function setPaused(value) { paused = value; document.querySelector('#pause').classList.toggle('visible', paused); if (!paused) renderer.domElement.focus() }
addEventListener('keydown', (event) => {
  if (event.code !== 'Escape' || finished || ending) return
  event.preventDefault()
  if (guide.classList.contains('visible')) setGuideVisible(false)
  else setPaused(!paused)
})
document.querySelector('[data-pause="resume"]').addEventListener('click', () => setPaused(false))
document.querySelector('[data-pause="restart"]').addEventListener('click', () => { restartChapter(); setPaused(false) })
const returnToMenuButton = document.createElement('button')
returnToMenuButton.type = 'button'
returnToMenuButton.textContent = 'return to menu'
returnToMenuButton.dataset.pause = 'menu'
document.querySelector('#pause').append(returnToMenuButton)
returnToMenuButton.addEventListener('click', () => {
  document.querySelector('#pause').classList.remove('visible')
  document.querySelector('#start').classList.remove('hidden')
})

const resize = () => { renderer.setSize(innerWidth, innerHeight); camera.resize(innerWidth, innerHeight) }
addEventListener('resize', resize)
resize()
const game = new Game({
  renderer,
  scene,
  camera,
  update: (dt) => {
    if (finished || paused) return
    input.update()
    if (ending) {
      endingElapsed += dt
      // Walk toward the house and stop at its doorstep; stand there while the dawn fade completes.
      // Offset must clear the close house's half-width (1.2) plus the player's half-width (.28)
      // plus a visible gap, or the player model clips into the house mesh in the final shot.
      const arrivalX = (chapterData.destinationX ?? Infinity) - 1.8
      player.body.x = Math.min(player.body.x + endingWalkSpeed * dt, arrivalX)
      const walkSpeed = player.body.x < arrivalX ? endingWalkSpeed : 0
      player.facing = 1
      player.time += dt
      player.rig.update(player.body.x, player.body.y, walkSpeed, 1, player.time, true)
      if (endingElapsed > endingFadeStart) {
        const t = Math.min(1, (endingElapsed - endingFadeStart) / (endingDuration - endingFadeStart))
        scene.background.lerpColors(new THREE.Color('#000000'), new THREE.Color('#cfd8d6'), t)
        scene.fog.color.copy(scene.background)
        scene.fog.far = 9 + t * 30
      }
      camera.update(dt)
      if (endingElapsed >= endingDuration) finish()
      return
    }
    if (portalPanActive) {
      input.clear()
      if (camera.update(dt)) portalPanActive = false
      return
    }
    chapter.update(dt)
    const portalReveal = chapter.consumePortalReveal?.()
    if (portalReveal) {
      portalPanActive = true
      input.clear()
      if (portalReveal === 'floatingRoute') camera.showRoutePortal(chapterData.exitX + .25, chapterData.exitY)
      else if (portalReveal === 'floatingRouteReverse') camera.showRouteTrigger(chapterData.returnTrigger.x, chapterData.returnTrigger.y)
      else if (portalReveal === 'springLever') camera.showPortal(chapterData.exitLever.x, chapterData.exitLever.y)
      else if (portalReveal === 'summerSideDoor') camera.showHorizontal(chapterData.sideDoor.x)
      else camera.showPortal(chapterData.exitX + .25, chapterData.exitY)
      camera.update(dt)
      return
    }
    player.update(dt, [...chapter.colliders, ...chapter.dynamicColliders()])
    const keyId = chapter.collectKey(player)
    if (keyId) {
      collectedKeys.add(keyId)
      updateKeyHud()
    }
    respawnGrace = Math.max(0, respawnGrace - dt)
    const activeFallDeathY = chapterData === autumn ? autumnFallDeathY : fallDeathY
    if (respawnGrace <= 0 && player.body.y < activeFallDeathY) {
      dieAtCheckpoint()
      camera.update(dt)
      return
    }
    if (checkpointIndex < chapterData.checkpoints.length - 1 && player.body.x > chapterData.checkpoints[checkpointIndex + 1].x) {
      checkpointIndex += 1
      checkpoint.position = { ...chapterData.checkpoints[checkpointIndex] }
      checkpoint.activate()
    }
    if (respawnGrace <= 0 && chapter.hits(player)) dieAtCheckpoint()
    const previousChapter = chapterData === summer ? spring : chapterData === autumn ? summer : chapterData === winter ? autumn : null
    if (input.portalPressed && previousChapter && Math.abs(player.body.x - chapterData.returnPortalX) < 1.5) {
      chapterStates.set(chapterData, chapter.save())
      loadChapter(previousChapter, previousChapter.returnEntry || { x: previousChapter.exitX - 1.2, y: 2 }, true)
      camera.update(dt)
      return
    }
    if (input.portalPressed && chapter.reachedExit(player)) {
      bankCurrentKey()
      chapterStates.set(chapterData, chapter.save())
      if (chapterData === spring) loadChapter(summer)
      else if (chapterData === summer) loadChapter(autumn)
      else if (chapterData === autumn) loadChapter(winter)
      else beginEnding()
    }
    camera.update(dt)
  },
})
async function startGame(nextChapter = spring) {
  if (nextChapter !== chapterData) loadChapter(nextChapter)
  await audio.unlock()
  audio.startAmbience(chapterData.kind || 'outskirts')
  document.querySelector('#start').classList.add('hidden')
  setPaused(false)
  renderer.domElement.focus()
  game.start()
}

const chapterSelect = document.querySelector('#chapter-select')
chapterSelect.innerHTML = '<button class="chapter-card chapter-spring" data-chapter="spring" type="button"><span class="chapter-number">01</span><span class="chapter-season">spring</span><span class="chapter-route">the floodline</span></button><button class="chapter-card chapter-summer" data-chapter="summer" type="button"><span class="chapter-number">02</span><span class="chapter-season">summer</span><span class="chapter-route">the outskirts</span></button><button class="chapter-card chapter-autumn" data-chapter="autumn" type="button"><span class="chapter-number">03</span><span class="chapter-season">autumn</span><span class="chapter-route">the works</span></button><button class="chapter-card chapter-winter" data-chapter="winter" type="button"><span class="chapter-number">04</span><span class="chapter-season">winter</span><span class="chapter-route">the core</span></button>'
const chapterSelectionTitle = document.createElement('p')
chapterSelectionTitle.id = 'chapter-selection-title'
chapterSelectionTitle.textContent = 'choose a chapter'
const chapterBackButton = document.createElement('button')
chapterBackButton.id = 'chapter-back'
chapterBackButton.type = 'button'
chapterBackButton.textContent = 'back'
chapterSelect.before(chapterSelectionTitle)
chapterSelect.after(chapterBackButton)
document.querySelector('#start-button').addEventListener('click', () => document.querySelector('#start').classList.add('chapter-selection'))
chapterBackButton.addEventListener('click', () => document.querySelector('#start').classList.remove('chapter-selection'))
const setGuideVisible = (visible) => {
  guide.classList.toggle('visible', visible)
  guide.setAttribute('aria-hidden', String(!visible))
  if (visible) document.querySelector('#guide-back').focus()
  else if (paused) pauseGuideButton.focus()
  else document.querySelector('#guide-button').focus()
}
document.querySelector('#guide-button').addEventListener('click', () => setGuideVisible(true))
document.querySelector('#guide-back').addEventListener('click', () => setGuideVisible(false))
pauseGuideButton.addEventListener('click', () => setGuideVisible(true))
const chapters = { spring, summer, autumn, winter }
document.querySelectorAll('[data-chapter]').forEach((button) => {
  button.addEventListener('click', () => startGame(chapters[button.dataset.chapter]))
})
console.info(`UNDERTOW build ${import.meta.env.VITE_BUILD_TAG || 'dev'}`)
if (import.meta.env.DEV) {
  window.__game = {
    player,
    scene,
    input,
    get paused() { return paused },
    get portalPanActive() { return portalPanActive },
    get chapter() { return chapter },
    get chapterData() { return chapterData },
    get collectedKeys() { return collectedKeys },
    get checkpointIndex() { return checkpointIndex },
    get ending() { return ending },
    get finished() { return finished },
  }
}
