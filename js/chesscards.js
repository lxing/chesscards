var game;
var spare;
var points;
var board;

/***********/
/* Utility */
/***********/
POINTS = {
  p: 1, n: 3, b: 3, r: 5, q: 9
}

function pieceToObj(piece) {
  return {
    color: piece[0],
    type: piece[1].toLowerCase()
  }
}

$(document).ready(function() {
  game = new Chess();
  spare = {
    w: {p: 0, n: 0, b: 0, r: 0, q: 0},
    b: {p: 0, n: 0, b: 0, r: 0, q: 0}
  }
  points = {
    w: 0, b: 0
  }

  // do not pick up pieces if the game is over
  // only pick up pieces for the side to move
  var onDragStart = function(source, piece, position, orientation) {
    if (game.game_over() === true ||
        (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
      return false;
    }
  };

  var onDrop = function(source, target, piece, newPos, oldPos, orientation) {
    if (source !== 'spare') {
      var captured = game.get(target);
      var turn = game.turn();

      // check legality
      var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // TODO: promotion
      });
      if (move === null) return 'snapback';

      if (captured !== null) {
        spare[turn][captured.type] += 1;
        points[turn] += POINTS[captured.type];
      }
    } else {
      if (game.get(target) !== null) return 'snapback';
      game.put(pieceToObj(piece), target);
      game.swap_turn();
    }
    updateStatus();
  };

  // update the board position after the piece snap
  var onSnapEnd = function() {
    board.position(game.fen());
  };

  var updateStatus = function() {
    // TODO
  };

  var cfg = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    sparePieces: true
  }

  board = new ChessBoard('board', cfg);

  updateStatus();
});