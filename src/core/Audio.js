const AMBIENCE_PROFILES = {
  outskirts: { noiseType: 'highpass', noiseCutoff: 1100, noiseVolume: .05, lfoRate: .18, lfoDepth: 500, droneFreq: 58, droneType: 'sine', droneVolume: .03 },
  works: { noiseType: 'lowpass', noiseCutoff: 700, noiseVolume: .035, lfoRate: .08, lfoDepth: 90, droneFreq: 74, droneType: 'sawtooth', droneVolume: .045 },
  floodline: { noiseType: 'lowpass', noiseCutoff: 260, noiseVolume: .06, lfoRate: .1, lfoDepth: 40, droneFreq: 42, droneType: 'sine', droneVolume: .05 },
  core: { noiseType: 'lowpass', noiseCutoff: 180, noiseVolume: .012, lfoRate: 1.05, lfoDepth: 5, droneFreq: 30, droneType: 'sine', droneVolume: .035 },
}

export class Audio {
  constructor() {
    this.context = null
    this.master = null
    this.ambience = null
    this.scrape = null
    this.heartbeatTimer = null
    this.muted = false
  }

  async unlock() {
    return
    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = .5
      this.master.connect(this.context.destination)
    }
    await this.context.resume()
  }

  get ready() { return this.context && this.context.state === 'running' }

  noiseBuffer(duration) {
    const length = Math.max(1, Math.floor(this.context.sampleRate * duration))
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1
    return buffer
  }

  tone(frequency, duration, volume = .08, type = 'sine') {
    if (!this.ready) return
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(volume, this.context.currentTime)
    gain.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + duration)
    oscillator.connect(gain).connect(this.master)
    oscillator.start()
    oscillator.stop(this.context.currentTime + duration)
  }

  noiseBurst(duration, { volume = .1, cutoff = 1200, q = .7, type = 'bandpass' } = {}) {
    if (!this.ready) return
    const source = this.context.createBufferSource()
    source.buffer = this.noiseBuffer(duration)
    const filter = this.context.createBiquadFilter()
    filter.type = type
    filter.frequency.value = cutoff
    filter.Q.value = q
    const gain = this.context.createGain()
    gain.gain.setValueAtTime(volume, this.context.currentTime)
    gain.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + duration)
    source.connect(filter).connect(gain).connect(this.master)
    source.start()
    source.stop(this.context.currentTime + duration)
  }

  footstep() { this.noiseBurst(.08, { volume: .045, cutoff: 650 + Math.random() * 300, q: .6 }) }
  jump() { this.tone(260, .09, .07, 'triangle') }
  land() { this.noiseBurst(.12, { volume: .08, cutoff: 220, q: .9, type: 'lowpass' }); this.tone(85, .16, .05, 'triangle') }
  leverClunk() { this.noiseBurst(.08, { volume: .12, cutoff: 500, q: 2 }); this.tone(140, .12, .07, 'square') }

  startScrape() {
    if (!this.ready || this.scrape) return
    const source = this.context.createBufferSource()
    source.buffer = this.noiseBuffer(2)
    source.loop = true
    const filter = this.context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 340
    filter.Q.value = 1.4
    const gain = this.context.createGain()
    gain.gain.value = 0
    gain.gain.linearRampToValueAtTime(.05, this.context.currentTime + .12)
    source.connect(filter).connect(gain).connect(this.master)
    source.start()
    this.scrape = { source, gain }
  }

  stopScrape() {
    if (!this.scrape) return
    const { source, gain } = this.scrape
    gain.gain.linearRampToValueAtTime(0, this.context.currentTime + .12)
    source.stop(this.context.currentTime + .16)
    this.scrape = null
  }

  startHeartbeat() {
    if (!this.ready || this.heartbeatTimer) return
    const beat = () => { this.tone(52, .45, .11, 'sine'); this.heartbeatTimer = setTimeout(beat, 820) }
    beat()
  }

  stopHeartbeat() { clearTimeout(this.heartbeatTimer); this.heartbeatTimer = null }

  death() {
    if (!this.ready) return
    const now = this.context.currentTime
    const level = this.muted ? 0 : .5
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(level, now)
    this.master.gain.linearRampToValueAtTime(0, now + .05)
    this.master.gain.setValueAtTime(0, now + .5)
    this.master.gain.linearRampToValueAtTime(level, now + 1.8)
    this.tone(60, 1.6, .1, 'sine')
  }

  startAmbience(kind) {
    if (!this.ready) return
    const profile = AMBIENCE_PROFILES[kind] || AMBIENCE_PROFILES.outskirts
    const previous = this.ambience
    const now = this.context.currentTime
    if (previous) {
      previous.gain.gain.cancelScheduledValues(now)
      previous.gain.gain.setValueAtTime(previous.gain.gain.value, now)
      previous.gain.gain.linearRampToValueAtTime(0, now + 2)
      previous.nodes.forEach((node) => node.stop(now + 2.05))
    }

    const gain = this.context.createGain()
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(1, now + 2)
    gain.connect(this.master)

    const noiseSource = this.context.createBufferSource()
    noiseSource.buffer = this.noiseBuffer(4)
    noiseSource.loop = true
    const noiseFilter = this.context.createBiquadFilter()
    noiseFilter.type = profile.noiseType
    noiseFilter.frequency.value = profile.noiseCutoff
    const noiseGain = this.context.createGain()
    noiseGain.gain.value = profile.noiseVolume
    noiseSource.connect(noiseFilter).connect(noiseGain).connect(gain)
    noiseSource.start()

    const lfo = this.context.createOscillator()
    lfo.frequency.value = profile.lfoRate
    const lfoGain = this.context.createGain()
    lfoGain.gain.value = profile.lfoDepth
    lfo.connect(lfoGain).connect(noiseFilter.frequency)
    lfo.start()

    const drone = this.context.createOscillator()
    drone.type = profile.droneType
    drone.frequency.value = profile.droneFreq
    const droneGain = this.context.createGain()
    droneGain.gain.value = profile.droneVolume
    drone.connect(droneGain).connect(gain)
    drone.start()

    this.ambience = { gain, nodes: [noiseSource, lfo, drone] }
  }

  stopAmbience() {
    if (!this.ambience) return
    const now = this.context ? this.context.currentTime : 0
    this.ambience.gain.gain.cancelScheduledValues(now)
    this.ambience.gain.gain.setValueAtTime(this.ambience.gain.gain.value, now)
    this.ambience.gain.gain.linearRampToValueAtTime(0, now + 2)
    this.ambience.nodes.forEach((node) => node.stop(now + 2.05))
    this.ambience = null
  }

  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : .5; return this.muted }
}
