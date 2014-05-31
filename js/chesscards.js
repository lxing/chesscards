// TODO: Shift these inside anonymous scope when done debugging
var game;
var board;
var cards;

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
var DEFAULT_EVENTS = {
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

var PIECE_VALUES = {p: 1, n: 3, b: 3, r: 5, q: 9};
var DRAW_COST = 3;
var INIT_HAND_SIZE = 4;
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

function endTurn() {
  actionPoints[turn] += 1;
  turn = game.turn();

  board.position(game.fen());
  events = deepCopy(DEFAULT_EVENTS);

  if (cards['active'].length > 0) {
    cards['deck'].push(cards['active'])
    cards['active'] = [];
    renderCards();
  }

  renderStatus();
}

function drawCard(player, force) {
  if (force !== true && (player != turn || actionPoints[turn] < DRAW_COST)
    || cards['deck'].length === 0) return;
  if (force !== true) actionPoints[turn] -= DRAW_COST;

  // True random, not FIFO
  card = cards['deck'].splice(Math.floor(Math.random()*cards['deck'].length), 1)[0]
  cards[player].push(card);

  renderStatus();
  renderCards();
}

function applyCard(card) {
  if (cards['active'].length > 0 || actionPoints[turn] < card.cost) return false;
  actionPoints[turn] -= card.cost;
  cards['active'].push(card);

  // Override game logic here
  for (var eventType in DEFAULT_EVENTS) {
    if (card.hasOwnProperty(eventType)) {
      events[eventType] = card[eventType];
    }
  }

  renderStatus();
  renderCards();
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

function renderCards() {
  for (var zone in cards) {
    if (zone === 'deck') continue;
    var container = $('#' + zone + 'cards');
    container.html('');

    for (var i=0; i<cards[zone].length; i++) {
      var card = cards[zone][i];
      var div = document.createElement('div');
      $(div).addClass('card').addClass(zone + 'card')
            .html(card['cost'] + 'AP | ' + card['name'] + ' | ' + card['description'])
            .appendTo(container);

      if (zone === 'active') {
        $(div).addClass(turn + 'card');
      } else {
        $(div).click(makeOnCardClicked(i, zone));
      }
    }
  }
}

function makeOnCardClicked(i, player) {
  return function() {
    applyCard(cards[player].splice(i, 1)[0]);
  }
}


/************/
/* Cards :) */
/************/
var CHESSCARDS = [
  {
    name: 'Hasty Conscription',
    description: 'Place a pawn from your reserves anywhere on your first 3 ranks.',
    cost: 0,
    freq: 10,
    onDragStartSpare: function(source, piece, position) {
      if (sameColor(turn, piece) === false) return false;
      type = pieceStrToType(piece);
      if (PIECE_VALUES[type] > 1 || sparePieces[turn][type] < 1) return false;
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
    description: 'Place a pawn or minor piece from your reserves anywhere on your first 3 ranks.',
    cost: 0,
    freq: 10,
    onDragStartSpare: function(source, piece, position) {
      if (sameColor(turn, piece) === false) return false;
      type = pieceStrToType(piece);
      if (PIECE_VALUES[type] > 3 || sparePieces[turn][type] < 1) return false;
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
var sparePieces = {
  w: {p: 0, n: 0, b: 0, r: 0, q: 0},
  b: {p: 0, n: 0, b: 0, r: 0, q: 0}
}
var actionPoints = {w: 0, b: 0};
cards = {w: [], b: [], active: [], deck: []};
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

function initDeck() {
  for(var i=0; i<CHESSCARDS.length; i++) {
    card = CHESSCARDS[i];
    for(var j=0; j<card['freq']; j++) {
      cards['deck'].push(deepCopy(card));
    }
  }
}

function initHands() {
  for (var i=0; i<INIT_HAND_SIZE; i++) {
    drawCard('w', true);
    drawCard('b', true);
  }
}

function init() {
  initStats();
  initDeck();
  initHands();
}

init();


});