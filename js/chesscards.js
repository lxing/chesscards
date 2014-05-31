// TODO: Shift these inside anonymous scope when done debuggin
var game;
var sparePieces;
var actionPoints;
var board;
var foo;

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
/* CONSTS */
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
      sparePieces[turn][captured.type] += 1;
      actionPoints[turn] += PIECE_VALUES[captured.type];
    }
  },
  onDropSpare: function(source, target, piece, newPos, oldPos) {
    if (game.get(target) !== null) return false;
    game.put(pieceStrToObj(piece), target);
    game.swap_turn();
  }
}

PIECE_VALUES = {
  p: 1, n: 3, b: 3, r: 5, q: 9
}

var BOARD_BORDER_SIZE = 2;
var SQUARE_SIZE = 0;


/******************/
/* Event Handlers */
/******************/
function onDragStart(source, piece, position) {
  if (game.game_over() === true) return false;
  if (source === 'spare') {
    return events.onDragStartSpare(source, piece, position);
  } else {
    return events.onDragStart(source, piece, position);
  }
}

function onDrop(source, target, piece, newPos, oldPos) {
  if (target === 'offboard') return 'snapback'; // Maybe make this overridable
  if (source !== 'spare') {
    if (events.onDrop(source, target, piece, newPos, oldPos) === false)
      return 'snapback';
  } else {
    if (events.onDropSpare(source, target, piece, newPos, oldPos) === false)
      return 'snapback';
  }
}

function renderStatus() {
  $('.anymove').html("");
  $('#' + turn + 'move').html("GO")

  $('#wpoints').html(actionPoints['w'] + ' AP');
  $('#bpoints').html(actionPoints['b'] + ' AP');

  for (var type in sparePieces['w']) {
    $('#wspare-' + type).html(sparePieces['w'][type]);
    $('#bspare-' + type).html(sparePieces['b'][type]);
  }
}

function endTurn() {
  drawCard(turn);
  actionPoints[turn] += 1;
  turn = game.turn();

  board.position(game.fen());
  activeCard = null;
  events = deepCopy(DEFAULT_EVENTS);

  renderStatus();
}

function drawCard(turn) {

}

function applyCard(card) {
  if (activeCard !== null || points[turn] < card.cost) return false;
  points[turn] -= card.cost;
  activeCard = card;

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
  onSnapEnd: endTurn,
  sparePieces: true
}

game = new Chess();
turn = game.turn();
board = new ChessBoard('board', cfg);
sparePieces = {
  w: {p: 0, n: 0, b: 0, r: 0, q: 0},
  b: {p: 0, n: 0, b: 0, r: 0, q: 0}
}
var actionPoints = {w: 0, b: 0};
var cards = {w: [], b: []};
var activeCard = null;
var deck = [];
var events = deepCopy(DEFAULT_EVENTS);

function initStats() {
  var boardWidth = parseInt($('#board').css('width'), 10) - 1;
  SQUARE_SIZE = (boardWidth - (boardWidth % 8))/ 8;

  var bstats = $('#bstats-container div');
  var wstats = $('#wstats-container div');
  for(var i=0; i<bstats.length; i++) {
    $(bstats[i]).css('width',SQUARE_SIZE)
      .css('height', SQUARE_SIZE).css('width', SQUARE_SIZE)
    $(wstats[i]).css('width',SQUARE_SIZE)
      .css('height', SQUARE_SIZE).css('width', SQUARE_SIZE)
  }

  $('#bmove').css('margin-top', SQUARE_SIZE/2);
  $('#wmove').css('margin-top', -SQUARE_SIZE/2);
}

function init() {
  initStats();
}

init();


/************/
/* Cards :) */
/************/
CHESSCARDS = [
  {
    name: 'Hasty Conscription',
    description: 'Place a pawn from your reserves anywhere on your first 3 ranks.',
    cost: 2,
    onDragStartSpare: function(source, piece, position) {
      if (sameColor(turn, piece) === false) return false;
      type = pieceStrToType(piece);
      if (POINTS[type] > 1 || sparePieces[turn][type] < 1) return false;
    },
    onDropSpare: function(source, target, piece, newPos, oldPos) {
      type = pieceStrToType(piece);
      rank = posToRank(target);
      if ((turn === 'w' && rank > 3) || (turn === 'b' && rank < 6)) return false;
      if (DEFAULT_EVENTS.onDropSpare(source, target, piece, newPos, oldPos) === false)
        return false;
      sparePieces[turn][type] -= 1;
    }
  },
  {
    name: 'New Recruits',
    description: 'Place a pawn or minor piece from your reserves anywhere on your first 3 ranks',
    cost: 5,
    onDragStartSpare: function(source, piece, position) {
      if (sameColor(turn, piece) === false) return false;
      type = pieceStrToType(piece);
      if (POINTS[type] > 3 || sparePieces[turn][type] < 1) return false;
    },
    onDropSpare: function(source, target, piece, newPos, oldPos) {
      type = pieceStrToType(piece);
      rank = posToRank(target);
      if ((turn === 'w' && rank > 3) || (turn === 'b' && rank < 6)) return false;
      if (DEFAULT_EVENTS.onDropSpare(source, target, piece, newPos, oldPos) === false)
        return false;
      sparePieces[turn][type] -= 1;
    }
  }
];




});