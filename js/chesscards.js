var game;
var spare;
var points;
var board;


$(document).ready(function() {
  /***********/
  /* Utility */
  /***********/
  function pieceStrToObj(piece) {
    return {
      color: piece[0],
      type: piece[1].toLowerCase()
    }
  }

  function pieceStrToType(piece) {
    return piece[1].toLowerCase();
  }

  function posToRank(pos) {
    return parseInt(pos[1]);
  }

  function posToCol(pos) {
    return pos.charCodeAt(0) - 97;
  }

  function sameColor(color, piece) {
    return color === piece[0];
  }

  function deepCopy(obj) {
    return $.extend(true, {}, obj);
  }


  /**********/
  /* Consts */
  /**********/
  DEFAULT_EVENTS = {
    onDragStart: function(source, piece, position) {
      return sameColor(turn, piece);
    },
    onDragStartSpare: function() { return false; },
    onDrop: function(source, target, piece, newPos, oldPos) {
      var captured = game.get(target);
      var turn = game.turn();
      var move = game.move({
        from: source,
        to: target,
        promotion: 'q'
      });
      if (move === null) return false;
      if (captured !== null) {
        spare[turn][captured.type] += 1;
        points[turn] += POINTS[captured.type];
      }
    },
    onDropSpare: function(source, target, piece, newPos, oldPos) {
      if (game.get(target) !== null) return false;
      game.put(pieceStrToObj(piece), target);
      game.swap_turn();
    }
  }

  POINTS = {
    p: 1, n: 3, b: 3, r: 5, q: 9
  }


  /******************/
  /* Event Handlers */
  /******************/
  var onDragStart = function(source, piece, position) {
    if (game.game_over() === true) return false;
    if (source === 'spare') {
      return events.onDragStartSpare(source, piece, position);
    } else {
      return events.onDragStart(source, piece, position);
    }
  }

  var onDrop = function(source, target, piece, newPos, oldPos) {
    if (target === 'offboard') return 'snapback'; // Maybe make this overridable
    if (source !== 'spare') {
      if (events.onDrop(source, target, piece, newPos, oldPos) === false)
        return 'snapback';
    } else {
      if (events.onDropSpare(source, target, piece, newPos, oldPos) === false)
        return 'snapback';
    }
    render();
  }

  var onSnapEnd = function() {
    turn = game.turn();
    board.position(game.fen());
    activeCard = null;
    events = deepCopy(DEFAULT_EVENTS);
  }

  var render = function() {
    // TODO
  }

  var applyCard = function(card) {
    if (points[turn] < card.cost) return false;
    points[turn] -= card.cost;

    // Override game logic here
    for (var eventType in DEFAULT_EVENTS) {
      if (card.hasOwnProperty(eventType)) {
        events[eventType] = card[eventType];
      }
    }
  }

  /********/
  /* Init */
  /********/
  var cfg = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    sparePieces: true
  }

  game = new Chess();
  turn = game.turn();
  board = new ChessBoard('board', cfg);
  spare = {
    w: {p: 0, n: 0, b: 0, r: 0, q: 0},
    b: {p: 0, n: 0, b: 0, r: 0, q: 0}
  }
  var points = {w: 0, b: 0};
  var cards = {w: [], b: []};
  var activeCard = null;
  var deck = [];
  var events = deepCopy(DEFAULT_EVENTS);

  /************/
  /* Cards :) */
  /************/
  CHESSCARDS = [
    {
      name: 'Conscript',
      cost: 1,
      onDragStartSpare: function(source, piece, position) {
        if (sameColor(turn, piece) === false) return false;
        type = pieceStrToType(piece);
        if (POINTS[type] > 1 || spare[turn][type] < 1) return false;
      },
      onDropSpare: function(source, target, piece, newPos, oldPos) {
        type = pieceStrToType(piece);
        rank = posToRank(target);
        if ((turn == 'w' && rank > 3) || (turn == 'b' && rank < 6)) return false;
        if (DEFAULT_EVENTS.onDropSpare(source, target, piece, newPos, oldPos) === false)
          return false;
        spare[turn][type] -= 1;
      }
    },
    {
      name: 'Recruit',
      cost: 1,
      onDragStartSpare: function(source, piece, position) {
        if (sameColor(turn, piece) === false) return false;
        type = pieceStrToType(piece);
        if (POINTS[type] > 3 || spare[turn][type] < 1) return false;
      },
      onDropSpare: function(source, target, piece, newPos, oldPos) {
        type = pieceStrToType(piece);
        rank = posToRank(target);
        if ((turn == 'w' && rank > 3) || (turn == 'b' && rank < 6)) return false;
        if (DEFAULT_EVENTS.onDropSpare(source, target, piece, newPos, oldPos) === false)
          return false;
        spare[turn][type] -= 1;
      }
    }
  ];

  // points['w'] = 1;
  // spare['w']['p'] = 1;
  // applyCard(CHESSCARDS[0]);
});