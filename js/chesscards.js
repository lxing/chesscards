// TODO: Shift these inside anonymous scope when done debugging
var game;
var board;
var cards;
var turnData;
var sparePieces;
var actionPoints;
var events;

var DEBUG = true;

$(document).ready(function() {

/***********/
/* Utility */
/***********/
function randInt(n) {
  return Math.floor(Math.random()*n);
}

// Convert chessboard.js representation -> chess.js representation
function cbPieceTocPiece(piece) {
  return {
    color: piece[0],
    type: piece[1].toLowerCase()
  };
}

// chessboard.js rep -> type
function cbPieceToType(piece) {
  return piece[1].toLowerCase();
}

// e4 -> 4
function posToRank(pos) {
  return parseInt(pos[1]);
}

// a5 -> a
function posToFile(pos) {
  return pos.charCodeAt(0) - 96;
}

function posToMyRank(pos) {
  return (turn === 'w') ? posToRank(pos) : 9 - posToRank(pos);
}

function myRankToRank(rank) {
  return (turn === 'w') ? rank : 9 - rank;
}

// 6 -> f
function fileToStr(file) {
  return String.fromCharCode(file + 96);
}

// 6, 5 -> f5
function fileMyRankToPos(file, rank) {
  return fileToStr(file) + myRankToRank(rank);
}

// e4, [0, 1] -> e5
function adjPos(pos, dir) {
  var rank = posToRank(pos) + dir[1];
  var file = posToFile(pos) + dir[0];
  if (rank < 1 || file < 1 || rank > 8 || file > 8) return null;
  return fileToStr(file) + rank;
}

// For chessboard.js objs
function cSameColor(piece, color) {
  return piece !== null && color === piece[0];
}

function cSameType(piece, type) {
  return piece !== null && type === piece[1].toLowerCase();
}

// For chess.js objs
function cSameColorType(piece, color, type) {
  return piece !== null && piece['color'] === color && piece['type'] === type;
}

function nextTurn(turn) {
  return (turn === 'w') ? 'b' : 'w';
}

function deepCopy(obj) {
  return $.extend(true, {}, obj);
}


/**********/
/* CONSTS */
/**********/
var DEFAULT_EVENTS = {
  onDragStart: function(source, piece, position) {
    return cSameColor(piece, turn);
  },
  onDragStartSpare: function() { return false; },
  onDrop: function(source, target, piece, newPos, oldPos) {
    if (target === 'offboard') return false;
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
    if (target === 'offboard') return false;
    if (game.get(target) !== null) return false;
    game.put(cbPieceTocPiece(piece), target);
    if (game.in_check()) {
      game.remove(target);
      return false;
    }
    game.make_fake_move();
  }
}

var SQ_DIRS = [
  [0, 1],  // +rank
  [1, 0],  // +file
  [0, -1],
  [-1, 0],
]

var DIAG_DIRS = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1]
]

var PIECE_VALUES = {p: 1, n: 3, b: 3, r: 5, q: 9};
var DRAW_COST = DEBUG ? 0 : 3;
var INIT_HAND_SIZE = 4;
var ACTION_POINT_INCR = 1;
var BOARD_BORDER_SIZE = 2;
var SQUARE_SIZE = 0;


/******************/
/* Event Handlers */
/******************/
function onDragStart(source, piece, position) {
  if (source === 'spare') {
    return events.onDragStartSpare(source, piece, position);
  } else {
    return events.onDragStart(source, piece, position);
  }
}

function onDrop(source, target, piece, newPos, oldPos) {
  if (source !== 'spare') {
    if (events.onDrop(source, target, piece, newPos, oldPos) === false)
      return 'snapback';
  } else {
    if (events.onDropSpare(source, target, piece, newPos, oldPos) === false)
      return 'snapback';
  }
}

function endTurn() {
  board.position(game.fen());
  if (turnData['disableEnd']) return;

  actionPoints[turn] += ACTION_POINT_INCR;
  turn = game.turn();
  turnData = {};
  events = deepCopy(DEFAULT_EVENTS);

  if (cards['active'].length > 0) {
    cards['deck'].push(cards['active'][0])
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
  card = cards['deck'].splice(randInt(cards['deck'].length), 1)[0]
  cards[player].push(card);

  renderStatus();
  renderCards();
}

function applyCard(card) {
  if (cards['active'].length > 0 || actionPoints[turn] < card.cost) return false;
  actionPoints[turn] -= card.cost;
  cards['active'].push(card);
  if (card.hasOwnProperty('onApply')) card.onApply();

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
  $('#' + turn + 'move').html("GO!")

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
            .html(card['cost'] + ' | ' + card['name'] + '<br>' + card['description'])
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
    if (player !== turn) return;
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
    cost: 4,
    freq: 4,
    onDragStartSpare: function(source, piece, position) {
      if (!cSameColor(piece, turn)) return false;
      type = cbPieceToType(piece);
      if (type !== 'p' || sparePieces[turn][type] < 1) return false;
    },
    onDropSpare: function(source, target, piece, newPos, oldPos) {
      type = cbPieceToType(piece);
      rank = posToMyRank(target);
      if (rank > 3 || DEFAULT_EVENTS.onDropSpare(source, target, piece, newPos, oldPos) === false)
        return false;
      sparePieces[turn][type] -= 1;
    }
  },
  {
    name: 'New Recruits',
    description: 'Place a pawn or minor from your reserves anywhere on your first 3 ranks.',
    cost: 6,
    freq: 5,
    onDragStartSpare: function(source, piece, position) {
      if (!cSameColor(piece, turn)) return false;
      type = cbPieceToType(piece);
      if (PIECE_VALUES[type] > 3 || sparePieces[turn][type] < 1) return false;
    },
    onDropSpare: function(source, target, piece, newPos, oldPos) {
      type = cbPieceToType(piece);
      rank = posToMyRank(target);
      if (rank > 3 || DEFAULT_EVENTS.onDropSpare(source, target, piece, newPos, oldPos) === false)
        return false;
      sparePieces[turn][type] -= 1;
    }
  },
  {
    name: 'Reserve Force',
    description: 'Place any piece from your reserves anywhere on your first 3 ranks.',
    cost: 8,
    freq: 3,
    onDragStartSpare: function(source, piece, position) {
      if (!cSameColor(piece, turn)) return false;
      type = cbPieceToType(piece);
      if (sparePieces[turn][type] < 1) return false;
    },
    onDropSpare: function(source, target, piece, newPos, oldPos) {
      type = cbPieceToType(piece);
      rank = posToMyRank(target);
      if (rank > 3 || DEFAULT_EVENTS.onDropSpare(source, target, piece, newPos, oldPos) === false)
        return false;
      sparePieces[turn][type] -= 1;
    }
  },
  {
    name: 'Skirmishers',
    description: 'Pawns on your second rank can advance up to 3 spaces this turn.',
    cost: 2,
    freq: 2,
    onDrop: function(source, target, piece, newPos, oldPos) {
      file = posToFile(target);
      targetRank = posToMyRank(target);
      if (cbPieceToType(piece) === 'p' && posToMyRank(source) === 2 && targetRank === 5) {
        if (game.get(target) !== null) return false;
        var move = game.move({
          from: source,
          to: fileMyRankToPos(file, targetRank - 1)
        });
        if (move === null) return false;
        game.put(game.remove(fileMyRankToPos(file, targetRank - 1)), target);
      } else {
        return DEFAULT_EVENTS.onDrop(source, target, piece, newPos, oldPos);
      }
    }
  },
  {
    name: 'Strategic Recall',
    description: 'Sacrifice a piece, then add it to your reserves.',
    cost: 4,
    freq: 3,
    onDrop: function(source, target, piece, newPos, oldPos) {
      if (target === 'offboard') {
        var piece = game.remove(source);
        if (game.in_check()) {
          game.put(piece, source);
          return false;
        }
        game.make_fake_move();
        sparePieces[turn][cbPieceToType(piece)] += 1;
        endTurn();
      } else {
        return DEFAULT_EVENTS.onDrop(source, target, piece, newPos, oldPos);
      }
    }
  },
  {
    name: 'Hail of Arrows',
    description: 'Capture one of your opponent\'s pawns at random.',
    cost: 5,
    freq: 3,
    onApply: function() {
      var pawnLocs = [];

      for (var r=1; r<9; r++) {
        for (var f=1; f<9; f++) {
          var pos = fileMyRankToPos(r, f);
          if (cSameColorType(game.get(pos), nextTurn(turn), 'p')) pawnLocs.push(pos);
        }
      }

      if (pawnLocs.length > 0) {
        game.remove(pawnLocs[randInt(pawnLocs.length)]);
        sparePieces[turn]['p'] += 1;
        game.make_fake_move();
        endTurn();
      }
    }
  },
  {
    name: 'Cavalry Requisition',
    description: 'Replace one of your pawns with a knight from your reserves.',
    cost: 4,
    freq: 2,
    onDragStartSpare: function(source, piece, position) {
      if (!cSameColor(piece, turn)) return false;
      type = cbPieceToType(piece);
      if (type !==  'n' || sparePieces[turn][type] < 1) return false;
    },
    onDropSpare: function(source, target, piece, newPos, oldPos) {
      targetPiece = game.get(target);
      if (!cSameColorType(targetPiece, turn, 'p')) return false;
      game.remove(target);
      sparePieces[turn]['p'] += 1;
      sparePieces[turn]['n'] -= 1;
      DEFAULT_EVENTS.onDropSpare(source, target, piece, newPos, oldPos);
    }
  },
  {
    name: 'Long-Range Support',
    description: 'Place any piece from your reserves on any bishop-supported square.',
    cost: 9,
    freq: 2,
    onApply: function() {
      turnData['supportedSquares'] = {};
      for (var r=1; r<9; r++) {
        for (var f=1; f<9; f++) {
          var pos = fileMyRankToPos(r, f);
          var piece = game.get(pos);
          if (!cSameColorType(piece, turn, 'b')) continue;

          for (var d=1; d<DIAG_DIRS.length; d++) {
            var curPos = pos;
            while (true) {
              curPos = adjPos(curPos, DIAG_DIRS[d]);
              if (curPos === null || game.get(curPos) !== null) break;
              turnData['supportedSquares'][curPos] = true;
            }
          }
        }
      }
    },
    onDragStartSpare: function(source, piece, position) {
      return cSameColor(piece, turn) || sparePieces[turn][cbPieceToType(piece)] > 0;
    },
    onDropSpare: function(source, target, piece, newPos, oldPos) {
      type = cbPieceToType(piece);
      if (!(target in turnData['supportedSquares']) ||
        DEFAULT_EVENTS.onDropSpare(source, target, piece, newPos, oldPos) === false)
        return false;
      sparePieces[turn][type] -= 1;
    }
  },
  {
    name: 'Grapeshot Volley',
    description: 'Capture all pawns from a file of your choice (yours included).',
    cost: 7,
    freq: 1,
    onApply: function() {
      for (var cont=true; cont;) {
        var f = 'i';
        while (!('a' <= f && f <= 'h'))
          f = prompt('File?');

        pawns = {};
        var numPawns = 0;
        for (var r=1; r<9; r++) {
          var pos = f + r;
          var piece = game.get(pos);
          if (piece !== null && piece['type'] === 'p') {
            pawns[pos] = game.remove(pos);
            numPawns++;
          }
        }

        if (game.in_check()) {
          for (var pos in pawns) {
            game.put(pawns[pos], pos)
          }
        } else {
          sparePieces[turn]['p'] += numPawns;
          game.make_fake_move();
          endTurn();
          cont = false;
        }
      }
    }
  },
  {
    name: 'Trojan Priest',
    description: 'Gain control of an opponent\'s bishop.',
    cost: 9,
    freq: 1,
    onDragStart: function(source, piece, position) {
      if (cSameColor(piece, turn)) return true;
      if (cSameColor(piece, nextTurn(turn)) && cSameType(piece, 'b')) {
        piece = game.remove(source);
        piece['color'] = turn;
        game.put(piece, source);
        game.make_fake_move();
        endTurn();
      }
      return false;
    }
  },
  {
    name: 'Phalanx Formation',
    description: 'Place a pawn from your reserves on any pawn-supported square.',
    cost: 3,
    freq: 3,
    onDragStartSpare: function(source, piece, position) {
      if (!cSameColor(piece, turn)) return false;
      type = cbPieceToType(piece);
      if (PIECE_VALUES[type] > 3 || sparePieces[turn][type] < 1) return false;
    },
    onDropSpare: function(source, target, piece, newPos, oldPos) {
      type = cbPieceToType(piece);
      supportDirs = (turn === 'w') ? [[1, -1], [-1, -1]] : [[1, 1], [-1, 1]];
      if (!(cSameColorType(game.get(adjPos(target, supportDirs[0])), turn, 'p') ||
        cSameColorType(game.get(adjPos(target, supportDirs[1])), turn, 'p')) ||
        DEFAULT_EVENTS.onDropSpare(source, target, piece, newPos, oldPos) === false)
        return false;
      sparePieces[turn][type] -= 1;
    }
  },
  {
    name: 'Pincer Maneuver',
    description: 'You may move two different pieces this turn if neither move captures.',
    cost: 6,
    freq: 3,
    onApply: function() {
      turnData['moveCount'] = 0;
      turnData['disableEnd'] = true;
    },
    onDragStart: function(source, piece, position) {
      if ((turnData['moveCount'] > 0 && source === turnData['prevMove']) ||
        DEFAULT_EVENTS.onDragStart(source, piece, position) === false)
        return false;
    },
    onDrop: function(source, target, piece, newPos, oldPos) {
      var capture = (game.get(target) !== null);

      // If the first move wansn't a capture but there are no
      // non-capture second moves left, this will break.
      if ((turnData['moveCount'] > 0 && capture) ||
        DEFAULT_EVENTS.onDrop(source, target, piece, newPos, oldPos) === false)
        return false;

      if (turnData['moveCount'] > 0 || capture) {
        turnData['disableEnd'] = false;
      } else {
        turnData['moveCount']++;
        turnData['prevMove'] = target;
        game.make_fake_move();
      }
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
turnData = {};
board = new ChessBoard('board', cfg);
sparePieces = {
  w: {p: 0, n: 0, b: 0, r: 0, q: 0},
  b: {p: 0, n: 0, b: 0, r: 0, q: 0}
}
actionPoints = {w: 0, b: 0};
cards = {w: [], b: [], active: [], deck: []};
events = deepCopy(DEFAULT_EVENTS);

function initStats() {
  var boardWidth = parseInt($('#board').css('width'), 10) - 1;
  SQUARE_SIZE = (boardWidth - (boardWidth % 8))/ 8;

  var bstats = $('#bstats-container div');
  var wstats = $('#wstats-container div');
  for(var i=0; i<bstats.length; i++) {
    $(bstats[i]).css('width',SQUARE_SIZE).css('height', SQUARE_SIZE).css('width', SQUARE_SIZE)
    $(wstats[i]).css('width',SQUARE_SIZE).css('height', SQUARE_SIZE).css('width', SQUARE_SIZE)
  }

  $('#bmove').css('margin-top', SQUARE_SIZE/2);
  $('#wmove').css('margin-top', -SQUARE_SIZE/2);
  $('#bpoints').css('margin-top', SQUARE_SIZE/2)
    .css('cursor', 'pointer')
    .click(function() {drawCard('b')})
    .attr('title', 'Draw a card for ' + DRAW_COST + ' AP');
  $('#wpoints').css('margin-top', -SQUARE_SIZE/2)
    .css('cursor', 'pointer')
    .click(function() {drawCard('w')})
    .attr('title', 'Draw a card for ' + DRAW_COST + ' AP');
}

function initDeck() {
  for(var i=0; i<CHESSCARDS.length; i++) {
    card = CHESSCARDS[i];
    for(var j=0; j<card['freq']; j++) {
      if (DEBUG) card['cost'] = 0;
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