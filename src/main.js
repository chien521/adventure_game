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
const locket = () => '<div class="locket" role="img" aria-label="0 of 4 memories recovered"><span data-key="spring"></span><span data-key="summer"></span><span data-key="autumn"></span><span data-key="winter"></span></div>'
app.innerHTML = `<section id="prelude" aria-labelledby="prelude-title" role="button" tabindex="0"><div id="prelude-content">${locket()}<p>I remember nothing. Only that something is owed.</p><h1 id="prelude-title">What the Snow Remembers</h1><span id="prelude-continue">click to continue</span></div></section><div id="start"><div id="start-content"><button id="start-button" type="button">enter</button><button id="guide-button" type="button">how to play</button><div id="chapter-select" aria-label="Select chapter"><button data-chapter="spring" type="button">spring</button><button data-chapter="summer" type="button">summer</button><button data-chapter="autumn" type="button">autumn</button><button data-chapter="winter" type="button">winter</button></div></div><section id="guide" aria-labelledby="guide-title" aria-hidden="true"></section></div><div id="key-hud" aria-live="polite">${locket()}</div><div id="death" aria-hidden="true"></div><div id="pause"><button data-pause="resume" type="button">resume</button><button data-pause="restart" type="button">restart chapter</button></div><div id="ending" aria-live="polite">${locket()}<h1>What the Snow Remembers</h1><p id="ending-message"></p><p id="ending-message-detail"></p><p id="key-count">0/4 keys</p><button id="ending-return" type="button">return to chapter selection</button></div><div id="touch-controls" aria-hidden="true"><div class="touch-half"><button data-input="left" aria-label="Move left">&#x2039;</button><button data-input="right" aria-label="Move right">&#x203A;</button></div><div class="touch-half"><button data-input="jump" aria-label="Jump">&#x25B3;</button><button data-input="action" aria-label="Action">E</button><button data-input="portal" aria-label="Use portal">Q</button></div></div>`
document.querySelector('#prelude')?.remove()
const guide = document.querySelector('#guide')
guide.remove()
app.append(guide)
guide.innerHTML = '<div id="guide-content"><p class="guide-kicker">WHAT THE SNOW REMEMBERS FIELD NOTES</p><h1 id="guide-title">Find a way through.</h1><p class="guide-objective">Reach each chapter&apos;s exit portal. Collecting a memory key is optional, but changes what is remembered at the end.</p><section class="guide-section" aria-labelledby="commands-title"><h2 id="commands-title">Key Commands</h2><div class="guide-grid guide-commands"><article><kbd>A</kbd><kbd>D</kbd><span class="key-or">or</span><kbd>&larr;</kbd><kbd>&rarr;</kbd><h3>Move</h3></article><article><kbd>W</kbd><span class="key-or">or</span><kbd>space</kbd><h3>Jump</h3></article><article><kbd>E</kbd><h3>Action</h3><p>Carry blocks and pull levers.</p></article><article><kbd>Q</kbd><h3>Portal</h3></article><article><kbd>escape</kbd><h3>Pause</h3></article></div></section><section class="guide-section" aria-labelledby="mechanics-title"><h2 id="mechanics-title">Puzzle Rules</h2><div class="guide-grid guide-mechanics"><article><span class="guide-mark">BLOCK</span><h3>Lift And Launch</h3><p>Blocks activate floor triggers. Stand on one before jumping to gain one extra jump.</p></article><article><span class="guide-mark">TRIGGER</span><h3>Two Kinds</h3><p>Some triggers fire once; others show a counter. An infinity counter means you can move the block off and back on repeatedly.</p></article><article><span class="guide-mark">DOOR</span><h3>Route Control</h3><p>A trigger may open a door, create a platform, or move a blocker between upper and ground routes.</p></article><article><span class="guide-mark">LEVER</span><h3>Reveal Or Move</h3><p>Levers can reveal an item, portal, or another control. Some latch after one use; others can be toggled.</p></article></div></section><section class="guide-section" aria-labelledby="objects-title"><h2 id="objects-title">World Objects</h2><div class="guide-grid guide-objects"><article><span class="guide-mark">LIFT</span><h3>Platform</h3><p>Moving platforms carry both the player and a block resting on them.</p></article><article><span class="guide-mark">PORTAL</span><h3>Exit Or Return</h3><p>Use a visible lavender portal when close enough. Some must be revealed first.</p></article><article><span class="guide-mark">KEY</span><h3>Collect</h3><p>Keys persist once you leave through a chapter exit.</p></article><article><span class="guide-mark">CHECKPOINT</span><h3>Recover</h3><p>Falls return you to a safe recent route or chapter-specific recovery point.</p></article><article><span class="guide-mark">ROUTES</span><h3>Read The Space</h3><p>When one route is blocked, use the other to change the puzzle state.</p></article></div></section><button id="guide-back" type="button">back</button></div>'
guide.removeAttribute('aria-labelledby')
const actionCommand = guide.querySelector('.guide-commands article:nth-child(3)')
actionCommand.innerHTML = '<kbd>C</kbd><h3>Action</h3><p>Carry blocks and pull levers.</p>'
document.querySelector('#touch-controls [data-input="action"]').textContent = 'C'
guide.setAttribute('aria-label', 'How to play')
guide.querySelector('#guide-title')?.remove()
const viverseAvatarSlot = document.createElement('div')
viverseAvatarSlot.id = 'viverse-avatar-slot'
const viverseAvatarStatus = document.createElement('p')
viverseAvatarStatus.id = 'viverse-avatar-status'
viverseAvatarStatus.setAttribute('aria-live', 'polite')
const viverseDisconnectButton = document.createElement('button')
viverseDisconnectButton.type = 'button'
viverseDisconnectButton.className = 'viverse-avatar-button'
viverseDisconnectButton.textContent = 'use default traveler'
viverseDisconnectButton.hidden = true
viverseAvatarSlot.append(viverseAvatarStatus, viverseDisconnectButton)
document.querySelector('#guide-button').before(viverseAvatarSlot)
const triggerCard = guide.querySelector('.guide-mechanics article:nth-child(2)')
triggerCard.querySelector('h3').textContent = 'One-Shot And Infinity'
triggerCard.querySelector('p').textContent = 'A numbered plate fires its remaining uses, then locks. An infinity plate can be reset by moving the block off and back on.'
const actionExamples = document.createElement('section')
actionExamples.className = 'guide-section guide-examples'
actionExamples.setAttribute('aria-labelledby', 'examples-title')
actionExamples.innerHTML = `<h2 id="examples-title">See It Work</h2><div class="guide-example-grid"><figure><img src="${import.meta.env.BASE_URL}guide-trigger.png" alt="A carried block resting on a green infinity trigger in Winter"><figcaption><span class="guide-mark">∞ TRIGGER</span><strong>Reusable plate</strong><p>Move the block away, then return it to trigger the route again.</p></figcaption></figure><figure><img src="${import.meta.env.BASE_URL}guide-lever.png" alt="A player next to the activated right wall lever in Winter"><figcaption><span class="guide-mark">LEVER</span><strong>Reveal a control</strong><p>Some levers expose another interaction instead of moving a door.</p></figcaption></figure></div></section>`
guide.querySelector('[aria-labelledby="mechanics-title"]').before(actionExamples)
const guidePages = document.createElement('div')
guidePages.className = 'guide-pages'
const guidePageOne = document.createElement('div')
guidePageOne.className = 'guide-page visible'
const guidePageTwo = document.createElement('div')
guidePageTwo.className = 'guide-page'
guidePageOne.append(
  guide.querySelector('.guide-kicker'),
  guide.querySelector('.guide-objective'),
  guide.querySelector('[aria-labelledby="commands-title"]'),
  actionExamples,
)
guidePageTwo.append(
  guide.querySelector('[aria-labelledby="mechanics-title"]'),
  guide.querySelector('[aria-labelledby="objects-title"]'),
)
guidePages.append(guidePageOne, guidePageTwo)
const guidePageButton = guide.querySelector('#guide-back')
guidePageButton.id = 'guide-page-button'
guidePageButton.textContent = 'next'
guide.querySelector('#guide-content').prepend(guidePages)
const setGuidePage = (page) => {
  const secondPage = page === 2
  guidePageOne.classList.toggle('visible', !secondPage)
  guidePageTwo.classList.toggle('visible', secondPage)
  guidePageButton.textContent = secondPage ? 'back' : 'next'
  guidePageButton.setAttribute('aria-label', secondPage ? 'Back to guide page one' : 'Next guide page')
}
guidePageButton.addEventListener('click', () => setGuidePage(guidePageTwo.classList.contains('visible') ? 1 : 2))
  const guideChapterSelectButton = document.createElement('button')
  guideChapterSelectButton.id = 'guide-chapter-select'
  guideChapterSelectButton.type = 'button'
  guideChapterSelectButton.textContent = 'return to chapter selection'
  guidePageButton.after(guideChapterSelectButton)
const pauseGuideButton = document.createElement('button')
pauseGuideButton.type = 'button'
pauseGuideButton.textContent = 'how to play'
pauseGuideButton.dataset.pause = 'guide'
document.querySelector('#pause').append(pauseGuideButton)

const springIntroPassage = `I don't remember how I came to be standing here.

There is only this: cold air, a road running out ahead of me, and the vague, persistent sense that I have somewhere to be. I couldn't tell you where. I couldn't tell you why the wanting is so insistent — only that it is, the way hunger is insistent, or thirst, except what I'm hungry for isn't food. It's something further back than that.

Four seasons stretch out ahead of me, though I couldn't say how I know there are four, or why the number matters so much. Spring first. Then whatever comes after spring, and after that, and after that — until, I assume, I arrive somewhere. Home, maybe. I keep circling that word without being sure it's the right one.

There's a small locket at my chest. Empty, as far as I can tell — four spaces, four small absences, waiting for something I don't have to give them. I don't remember choosing to carry it. I don't remember much of anything, if I'm honest, except the walking, and the cold, and this quiet certainty that somewhere behind me — behind all of it — there are things I once knew, and might, if I'm willing to look, find again.

I don't have to look. That's the strange part. I could walk through all four seasons and arrive wherever I'm going with the locket just as empty as it is now. Nothing is stopping me from choosing not to remember.

But something in me wants to. Something in me has wanted to for longer than I can account for.

So I'll walk. And where the road offers me back a piece of what I've lost, I think I'll stop, and carry it the rest of the way.

Whatever's waiting for me at the end of this — I'd like to meet it knowing who I am.`
const springIntroFlag = 'what-the-snow-remembers.hasSeenSpringIntro'
const springIntro = document.querySelector('#ending')
const springIntroStart = document.createElement('button')
springIntroStart.id = 'spring-intro-start'
springIntroStart.type = 'button'
springIntroStart.textContent = 'Start the Journey'
let springIntroActive = false
let resolveSpringIntro = null

const hasSeenSpringIntro = () => {
  try { return localStorage.getItem(springIntroFlag) === 'true' }
  catch { return false }
}
const markSpringIntroSeen = () => {
  try { localStorage.setItem(springIntroFlag, 'true') }
  catch { }
}
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
async function showSpringIntro() {
  springIntroActive = true
  springIntro.append(springIntroStart)
  springIntro.append(endingRestartButton)
  springIntro.classList.remove('cinematic', 'story-visible', 'intro-ready')
  springIntro.classList.add('visible', 'intro')
  document.querySelector('#ending-message').textContent = springIntroPassage
  document.querySelector('#ending-message-detail').textContent = ''
  document.querySelector('#key-count').textContent = ''
  await wait(2000)
  springIntro.classList.add('story-visible')
  await wait(2000)
  springIntro.classList.add('intro-ready')
  return new Promise((resolve) => {
    resolveSpringIntro = resolve
    springIntroStart.addEventListener('click', () => resolve(true), { once: true })
  })
}
function hideSpringIntro() {
  springIntro.classList.remove('visible', 'intro', 'story-visible', 'intro-ready')
  springIntroStart.remove()
  springIntroActive = false
  resolveSpringIntro = null
}

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
let avatarPickerOpen = false
const setViverseAvatarStatus = (message = '') => { viverseAvatarStatus.textContent = message }
const setViverseAvatarConnected = (connected) => { viverseDisconnectButton.hidden = !connected }
viverseDisconnectButton.addEventListener('click', () => {
  player.rig.useDefaultTraveler()
  setViverseAvatarConnected(false)
  setViverseAvatarStatus('Using the default traveler.')
  renderer.domElement.focus()
})
addEventListener('viverse-me:open', () => {
  avatarPickerOpen = true
  input.clear()
})
addEventListener('viverse-me:close', () => {
  avatarPickerOpen = false
  input.clear()
  renderer.domElement.focus()
})
addEventListener('viverse-me:authorization-denied', () => {
  setViverseAvatarStatus('VIVERSE Avatar needs this website origin added to your SDK settings.')
})
const resolveViverseAvatarUrl = (url) => {
  const avatarUrl = new URL(url)
  if (avatarUrl.hostname === 'me-stage.viverse.com' && avatarUrl.pathname.endsWith('/default-avatar')) {
    avatarUrl.searchParams.set('origin', location.origin)
  }
  return avatarUrl.href
}
const avatarLoadUrl = (url) => {
  const resolvedUrl = resolveViverseAvatarUrl(url)
  return import.meta.env.DEV ? `/viverse-avatar?url=${encodeURIComponent(resolvedUrl)}` : resolvedUrl
}
addEventListener('viverse-me:avatar-selected', async (event) => {
  const avatar = event.detail?.avatar
  if (!avatar?.vrmUrl) {
    setViverseAvatarStatus('The selected avatar could not be loaded. The default traveler remains active.')
    return
  }
  avatarPickerOpen = false
  setViverseAvatarStatus('Loading your VIVERSE avatar...')
  try {
    await player.rig.setAvatar(avatarLoadUrl(avatar.vrmUrl))
    setViverseAvatarConnected(true)
    setViverseAvatarStatus('VIVERSE avatar selected.')
  } catch (error) {
    console.warn('Failed to load selected VIVERSE avatar.', error)
    setViverseAvatarStatus('VIVERSE blocked the selected avatar download. The default traveler remains active.')
  }
})
const viverseAvatarScript = document.createElement('script')
viverseAvatarScript.src = 'https://me-stage.viverse.com/sdk.js'
viverseAvatarScript.async = true
viverseAvatarScript.dataset.ac3Mode = 'sdk-happy-path'
viverseAvatarScript.dataset.ac3Target = '#viverse-avatar-slot'
viverseAvatarScript.dataset.ac3PartnerId = 'partner_44906eba1fd10dcd'
viverseAvatarScript.dataset.ac3Label = 'connect VIVERSE avatar'
viverseAvatarScript.dataset.ac3ButtonClass = 'viverse-avatar-button'
viverseAvatarScript.dataset.ac3HpShowLibraryButton = 'true'
viverseAvatarScript.addEventListener('error', () => setViverseAvatarStatus('VIVERSE Avatar is unavailable right now.'))
document.head.append(viverseAvatarScript)
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
const endingDuration = 3
const endingPassages = [
  `I don't know this place.

The snow doesn't care whether I know it or not. It falls the same over ground I couldn't name if my life depended on it — and maybe it does. Maybe it always did. I keep moving because stopping seems worse than not knowing why I'm moving.

There was green, once. And then yellow, and orange, and now this — white, and quiet, and enormous. None of it felt like anything except more walking. I don't remember arriving anywhere. I don't remember leaving anywhere either. There's just this: one foot, then the other, snow filling in the shape of my steps almost as soon as I lift them.

There should be a face I know. A door I'd recognize on sight, a name that would land in my chest like something coming home to roost. There isn't. There's only the shape of an absence where all of that should sit — and the shape doesn't tell me what's missing, only that something is.

I keep asking myself the same three things, over and over, the way a man in a dark room keeps finding the same wall: Where am I. Am I going anywhere. What am I doing here.

No answer comes. Maybe none was ever going to. Maybe the asking is the whole of it, and I'll go on asking, here, in the snow, for as long as there's a here to ask it in.

I reached the end and remembered nothing.

Somewhere, it began to snow again.`,
  `I've lost my way. I know that much, at least — which is more than nothing, standing here where I'm fairly sure four roads used to meet, though I couldn't tell you now which one brought me in.

Somewhere back there, I found a thing. Small. It fit easily in my hand, whatever it was, wherever I found it — I remember the finding of it more clearly than the thing itself. A weight. A little brightness where before there'd been none. Some part of me insisted it mattered, and that part hasn't steered me wrong about anything else today, so I trusted it, and I kept it, and I still don't know what it's for.

But I know — the way you know weather is coming before the sky has said a word about it — that I'm meant for somewhere. Not this snow. Not this stopping-place with no name. Somewhere with a roof, and warmth, and maybe someone who stopped expecting me a long time ago and started, instead, merely hoping.

One thing isn't enough to build a life back out of. It's not enough to tell you who I was, or who was waiting, or what I was walking toward before I forgot I was walking toward anything at all. But it's enough to know a life existed once — fully furnished, somewhere behind me — and that I only carried one small piece of it out through the door.

I've lost my way.

But I'm sure I'm meant for somewhere.`,
  null,
  `Three now. Three small weights, three small brightnesses, carried this far without my quite meaning to keep them — and when I lay them out in the snow, side by side, they very nearly make a shape I recognize.

Spring: leaving somewhere small, being sent out into somewhere large, a hand letting go of mine at a doorway I can still see exactly, if I close my eyes. Summer: warmth, and being looked at, and a version of myself I liked better than most of the ones I've been since. Autumn: a stillness. A door. Someone on the other side of it who didn't come back through, and some part of me that understood, even then, not to follow.

Three seasons. Almost a whole year, laid end to end. Almost a whole life, if I squint and let the gaps blur soft at the edges.

But there's a fourth space here, unmistakably empty, sitting exactly where a fourth season ought to be — and no matter how long I stand over it, nothing rises up to fill it. Not a face. Not a color. Not even the shape of a grief I could name properly, the way I've apparently grieved the others. Just blank. Just missing, in a way none of the other three are.

It's a strange thing, being this close to whole. Closer than I've been all day — closer, maybe, than I had any right to expect — and still short. Still one season away from being able to say, honestly, I remember my life.

Almost enough to be a life.

One season, still missing.`,
  `Spring first — a hand letting go of mine, a doorway, the particular courage and cowardice of being sent out alone for the first time. I was small enough, then, that the whole world came up to my shoulders.

Then summer. Warmth, and grass gone gold with light, and someone turning to look at me the way you look at something you've just decided, right then, to keep. I remember that look better than I remember my own face at that age.

Then autumn — quieter. A door. A small weight set down gently, the way you set down something you already know you won't be picking back up. I didn't follow through that door. I understand now, finally, why I couldn't. Some part of you always knows a goodbye the moment it arrives, even while the rest of you keeps insisting on calling it something smaller.

And winter. Winter is this — the snow, the walking, the long half-light between having had a life and being finished having had one. Winter is now.

Four seasons. My whole life, laid end to end, and for the first time today none of it is missing. I can see all of it at once — the leaving, the loving, the losing, and this, the long walk after — not as four separate griefs I'd been carrying nameless, but as one thing. One life. Mine.

There, ahead — the house. I know it now. I think I knew it the whole time, underneath the not-knowing; I only needed all four seasons back in my hands before I could let myself see it clearly.

Spring, summer, autumn, winter — mine, all of it.

I close my eyes.

This time, on purpose.`,
]
const twoKeyEnding = (missingSeason) => `I remember someone.

Not a name — names are the first thing this cold takes, and it never gives them back. But a shape. A warmth beside me that had weight, and breath, and a particular way of turning toward me before I'd even finished lifting my head to look. I remember being looked at like that. I remember it mattering more than almost anything since.

It was — ${missingSeason}. It was ${missingSeason}, I think.

No. That's not right. That's not where they were standing.

I reach for the season the way you reach for a word sitting right at the edge of your tongue — certain of its shape, unable to make it land. Each time I try, I come back holding the wrong one. Not that season. Some other one. The one I can't quite—

It doesn't matter, maybe. What matters is the shape stayed, even after the season didn't. What matters is that once, someone stood close enough beside me that I still remember, even now, stripped of nearly everything else, the exact angle of being loved.

Two fragments. Not enough to rebuild a face, or a voice, or the sound of my own name in their mouth. But enough to know, with more certainty than I know almost anything standing here in the snow, that I was not always alone. That once there was an us, before there was only ever I.

I remember someone. In the season of—

no. That wasn't it. I can't recall which.

Two fragments, and between them, the shape of someone I had loved.`
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
  chapter.separateRespawnFromPlayer?.(player)
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
  document.querySelector('#ending-message').textContent = ''
  document.querySelector('#ending-message-detail').textContent = ''
  document.querySelector('#key-count').textContent = ''
  document.querySelector('#ending').classList.remove('story-visible')
  document.querySelector('#ending').classList.add('visible', 'cinematic')
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
function updateKeyHud() {
  document.querySelectorAll('.locket').forEach((element) => {
    element.setAttribute('aria-label', `${collectedKeys.size} of 4 memories recovered`)
    element.querySelectorAll('[data-key]').forEach((slot) => slot.classList.toggle('filled', collectedKeys.has(slot.dataset.key)))
  })
}
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
  if (fallRespawn?.resetChapter) loadChapter(chapterData)
  else {
    checkpoint.respawn(player, fallRespawn?.position || fallRespawn || checkpoint.position)
    chapter.applyFallRecovery?.(fallRespawn)
    chapter.separateRespawnFromPlayer?.(player)
    if (!fallRespawn?.blockPosition) carriedBox?.placeNextTo(player)
  }
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
  const endingElement = document.querySelector('#ending')
  endingElement.classList.remove('cinematic')
  audio.stopHeartbeat()
  const keyCount = collectedKeys.size
  const missingSeason = ['spring', 'summer', 'autumn', 'winter'].find((season) => !collectedKeys.has(season))
  document.querySelector('#ending-message').textContent = keyCount === 2 ? twoKeyEnding(missingSeason) : endingPassages[keyCount]
  document.querySelector('#ending-message-detail').textContent = ''
  document.querySelector('#key-count').textContent = `${keyCount}/4 keys`
  updateKeyHud()
  endingElement.classList.add('visible')
  requestAnimationFrame(() => endingElement.classList.add('story-visible'))
}

function returnToChapterSelection() {
  ending = false
  document.querySelector('#ending').classList.remove('visible', 'cinematic', 'story-visible')
  document.querySelector('#start').classList.remove('hidden')
  document.querySelector('#start').classList.add('chapter-selection')
  chapterSelect.querySelector('button')?.focus()
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
    if (finished || paused || avatarPickerOpen) return
    input.update()
    if (ending) {
      endingElapsed += dt
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
      else if (portalReveal === 'winterKeyLever') camera.showPortal(chapterData.keyLever.x, chapterData.keyLever.y)
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
  finished = false
  ending = false
  if (nextChapter === spring && !hasSeenSpringIntro() && !springIntroActive) {
    const shouldStart = await showSpringIntro()
    if (!shouldStart) return
  }
  if (nextChapter !== chapterData) loadChapter(nextChapter)
  if (springIntroActive) {
    markSpringIntroSeen()
    hideSpringIntro()
  }
  await audio.unlock()
  audio.startAmbience(chapterData.kind || 'outskirts')
  document.querySelector('#start').classList.add('hidden')
  setPaused(false)
  renderer.domElement.focus()
  game.start()
}

const chapterSelect = document.querySelector('#chapter-select')
chapterSelect.innerHTML = '<button class="chapter-card chapter-spring" data-chapter="spring" type="button"><span class="chapter-number">01</span><span class="chapter-season">spring</span><span class="chapter-route">the floodline</span></button><button class="chapter-card chapter-summer" data-chapter="summer" type="button"><span class="chapter-number">02</span><span class="chapter-season">summer</span><span class="chapter-route">the outskirts</span></button><button class="chapter-card chapter-autumn" data-chapter="autumn" type="button"><span class="chapter-number">03</span><span class="chapter-season">autumn</span><span class="chapter-route">the works</span></button><button class="chapter-card chapter-winter" data-chapter="winter" type="button"><span class="chapter-number">04</span><span class="chapter-season">winter</span><span class="chapter-route">the core</span></button>'
chapterSelect.querySelectorAll('.chapter-card').forEach((card) => {
  const thumbnail = document.createElement('img')
  thumbnail.className = 'chapter-thumbnail'
  thumbnail.src = `${import.meta.env.BASE_URL}chapter-${card.dataset.chapter}.png`
  thumbnail.alt = ''
  thumbnail.setAttribute('aria-hidden', 'true')
  card.prepend(thumbnail)
})
const chapterSelectionTitle = document.createElement('p')
chapterSelectionTitle.id = 'chapter-selection-title'
chapterSelectionTitle.textContent = 'choose a chapter'
const chapterBackButton = document.createElement('button')
chapterBackButton.id = 'chapter-back'
chapterBackButton.type = 'button'
chapterBackButton.textContent = 'back'
const chapterRestartButton = document.createElement('button')
chapterRestartButton.id = 'chapter-restart'
chapterRestartButton.type = 'button'
chapterRestartButton.textContent = 'restart the journey'
chapterSelect.before(chapterSelectionTitle)
chapterSelect.after(chapterBackButton)
chapterBackButton.after(chapterRestartButton)
const endingRestartButton = document.createElement('button')
endingRestartButton.id = 'ending-restart'
endingRestartButton.type = 'button'
endingRestartButton.textContent = 'restart the journey'
document.querySelector('#ending-return').after(endingRestartButton)
const restartDialog = document.createElement('section')
restartDialog.id = 'restart-dialog'
restartDialog.setAttribute('role', 'dialog')
restartDialog.setAttribute('aria-modal', 'true')
restartDialog.setAttribute('aria-labelledby', 'restart-dialog-message')
restartDialog.innerHTML = '<div id="restart-dialog-panel"><button id="restart-dialog-close" type="button" aria-label="Close restart confirmation">&times;</button><p id="restart-dialog-message">Are you sure you want to restart everything? You will lose all the keys.</p><div id="restart-dialog-actions"><button id="restart-dialog-yes" type="button">yes</button><button id="restart-dialog-no" type="button">no</button></div></div>'
app.append(restartDialog)

let restartDialogTrigger = null
const closeRestartDialog = () => {
  restartDialog.classList.remove('visible')
  restartDialogTrigger?.focus()
}
const openRestartDialog = (trigger) => {
  restartDialogTrigger = trigger
  restartDialog.classList.add('visible')
  document.querySelector('#restart-dialog-no').focus()
}
const restartJourney = () => {
  resolveSpringIntro?.(false)
  hideSpringIntro()
  collectedKeys.clear()
  bankedKeys.clear()
  chapterStates.clear()
  try { localStorage.removeItem(springIntroFlag) }
  catch { }
  finished = false
  ending = false
  loadChapter(spring)
  updateKeyHud()
  document.querySelector('#ending').classList.remove('visible', 'cinematic', 'story-visible')
  document.querySelector('#start').classList.remove('hidden')
  document.querySelector('#start').classList.add('chapter-selection')
  closeRestartDialog()
  chapterSelect.querySelector('button')?.focus()
}
document.querySelector('#start-button').addEventListener('click', () => document.querySelector('#start').classList.add('chapter-selection'))
document.querySelector('#ending-return').addEventListener('click', returnToChapterSelection)
chapterBackButton.addEventListener('click', () => document.querySelector('#start').classList.remove('chapter-selection'))
chapterRestartButton.addEventListener('click', () => openRestartDialog(chapterRestartButton))
endingRestartButton.addEventListener('click', () => openRestartDialog(endingRestartButton))
document.querySelector('#restart-dialog-close').addEventListener('click', closeRestartDialog)
document.querySelector('#restart-dialog-no').addEventListener('click', closeRestartDialog)
document.querySelector('#restart-dialog-yes').addEventListener('click', restartJourney)
restartDialog.addEventListener('click', (event) => { if (event.target === restartDialog) closeRestartDialog() })
addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && restartDialog.classList.contains('visible')) {
    event.preventDefault()
    closeRestartDialog()
  }
})
const setGuideVisible = (visible) => {
  guide.classList.toggle('visible', visible)
  guide.setAttribute('aria-hidden', String(!visible))
  if (visible) {
    setGuidePage(1)
    guidePageButton.focus()
  }
  else if (paused) pauseGuideButton.focus()
  else document.querySelector('#guide-button').focus()
}
document.querySelector('#guide-button').addEventListener('click', () => setGuideVisible(true))
pauseGuideButton.addEventListener('click', () => setGuideVisible(true))
guideChapterSelectButton.addEventListener('click', () => {
  setGuideVisible(false)
  document.querySelector('#pause').classList.remove('visible')
  document.querySelector('#start').classList.remove('hidden')
  document.querySelector('#start').classList.add('chapter-selection')
  chapterSelect.querySelector('button')?.focus()
})
const chapters = { spring, summer, autumn, winter }
document.querySelectorAll('[data-chapter]').forEach((button) => {
  button.addEventListener('click', () => startGame(chapters[button.dataset.chapter]))
})
updateKeyHud()
console.info(`What the Snow Remembers build ${import.meta.env.VITE_BUILD_TAG || 'dev'}`)
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
