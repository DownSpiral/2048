function Bot(game) {
  this.game = game;
  this.h_weights = {
    score: .5,
    position: .5
  };
  this.position_tile_weights = [
    [.13, .12, .11, .1],
    [.14, .13, .12, .11],
    [.15, .14, .13, .12],
    [.25, .5, .75, 1]
  ];
  this.chances = [
    { val: 2, chance: .9},
    { val: 4, chance: .1}
  ];
  this.move_names = ["up", "right", "down", "left"];
  this.move_hiearchy = {0: 2, 1: 1, 2: 3, 3: 0};
  this.best_game_state = null;

  return this;
}
Bot.prototype.run = function() {
  if (this.stop) { return; }
  var before_state = this.game.storageManager.getGameState();
  this.next();
  var state = this.game.storageManager.getGameState();
  if (state == null) {
    if (this.best_game_state == null || this.best_game_state.score < before_state.score) {
      this.best_game_state = before_state;
    }
    _.defer(function() {
      this.game.restart();
      _.defer(this.run.bind(this));
    }.bind(this));
  } else if (state.won && !state.keepPlaying) {
    _.defer(function() {
      this.game.inputManager.emit("keepPlaying");
      _.defer(this.run.bind(this));
    }.bind(this));
  } else {
    _.defer(this.run.bind(this));
  }
}
Bot.prototype.next = function() {
  var best_move = this.get_best_move(2);
  //console.log(this.tree);
  if (best_move) {
    this.game.move(best_move.move);
  }
}
Bot.prototype.get_best_move = function(ply) {
  this.tree = {};
  return this.best_move_recursive(this.game.serialize(), ply, "");
}
Bot.prototype.best_move_recursive = function(state, rem_ply, path) {
  var states = this.game_permutations(state);
  var best_state = null;
  var best_score = 0;
  for (var i = 0; i < states.length; i++) {
    var state = states[i];
    var total_score = 0;
    if (rem_ply <= 0) {
      total_score = this.state_eval(state);
    } else {
      var possible_states = this.gen_states(state);
      for (var j = 0; j < possible_states.length; j++) {
        var possible_state = possible_states[j];
        var res = this.best_move_recursive(possible_state, rem_ply - 1, path + this.move_names[i] + String(rem_ply) + ",");
        if (res) {
          total_score += this.state_eval(res) * possible_state.chance;
        }
      }
    }
    if (best_state == null ||
        total_score > best_score ||
       (total_score == best_score && this.move_hiearchy[best_state.move] < this.move_hiearchy[state.move])) {
      state.state.score = total_score;
      best_state = state;
      best_score = total_score;
    }
  }
  if (best_state && rem_ply == 0) {
    this.tree[path + this.move_names[best_state.move] + "0"] = best_state.state.score;
  }
  return best_state;
}
Bot.prototype.state_eval = function(state) {
  var score = state.state.score;
  var pw = this.position_tile_weights;
  var position = 0;
  _.each(state.state.grid.cells, function(row) {
    _.each(row, function(tile) {
      if (tile) {
        position += pw[tile.position.y][tile.position.x] * tile.value;
      }
    });
  });
  return score * this.h_weights.score + position * this.h_weights.position;
}
Bot.prototype.game_permutations = function(game_state) {
  var permutations = [];
  for (var i = 0; i < 4; i++) {
    var perm = new GameManager(game_state.grid.size, null, null, FakeStorage(game_state));
    if (perm.won) {
      perm.keepPlaying = true;
    }
    if(perm.move(i)) {
      permutations.push({
        move: i,
        state: perm.serialize()
      });
    }
  }
  return permutations;
}
Bot.prototype.gen_states = function(state) {
  var open_cells = new Grid(state.state.grid.size, state.state.grid.cells).availableCells();
  var possible_states = [];
  for (var i = 0; i < open_cells.length; i++) {
    var cell = open_cells[i];
    for (var j = 0; j < this.chances.length; j++) {
      var chance = this.chances[j];
      var grid = new Grid(state.state.grid.size, state.state.grid.cells);
      grid.insertTile(new Tile(cell, chance.val));
      possible_states.push({
        grid       : grid.serialize(),
        score      : state.state.score,
        over       : state.state.over,
        won        : state.state.won,
        keepPlaying: state.state.keepPlaying,
        chance     : chance.chance / open_cells.length
      });
    }
  }
  return possible_states;
}

function FakeStorage(game_state) {
  return function() {
    this.state = game_state;
    this.getGameState = function() {
      return this.state;
    }
  };
}
