export class Checkpoint {
  constructor(position, state) {
    this.position = { ...position }
    this.state = state
    this.snapshot = null
  }

  activate() { this.snapshot = this.state.save() }

  respawn(player) {
    player.reset(this.position)
    this.state.restore(this.snapshot)
  }
}
