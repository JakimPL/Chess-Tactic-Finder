class Tactic {
    get_next_move() {
        if (this.move_index < this.moves.length - 1) {
            this.move_index++
            var move = this.moves[this.move_index]
            this.next_move = move
            return move
        } else {
            this.solved = true
        }

        return null
    }

    constructor(pgn) {
        this.pgn = pgn
        this.game_json = JSON.parse(parser.pgn2json(pgn))
        this.fen = this.game_json['str']['FEN']
        this.moves = this.game_json['moves']
        this.first_move = this.moves[0]

        this.move_index = 0
        this.next_move = this.get_next_move()

        this.solved = false
    }
}
