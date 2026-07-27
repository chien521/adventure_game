export class Checkpoint {
  constructor(position, state) {
    this.position = { ...position }
    this.state = state
    this.snapshot = null
  }

  activate() { this.snapshot = this.state.save() }

  respawn(player, position = this.position) {
    this.snapshot = this.state.save()
    player.reset(position)
    this.state.restore(this.snapshot)
  }
}
