function game_permutations(game_state) {
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

function FakeStorage(game_state) {
  return function() {
    this.state = game_state;
    this.getGameState = function() {
      return this.state;
    }
  };
}

var bot = function(game) {
  var moves = {
    up: 0,
    right: 1,
    down: 2,
    left: 3
  }
  this.run = function() {
    if (this.stop) { return; }
    var before_state = game.storageManager.getGameState();
    this.next();
    var state = game.storageManager.getGameState();
    if (state == null) {
      _.defer(function() {
        game.restart();
        _.defer(this.run);
      });
    } else if (state.won && before_state.keepPlaying != state.keepPlaying) {
      _.defer(function() {
        game.actuator.continueGame();
        _.defer(this.run);
      });
    } else {
      _.defer(this.run);
    }
  }
  this.next = function() {
    var best_move = this.get_best_move(2);
    //console.log(this.tree);
    if (best_move) {
      game.move(best_move.move);
    }
  }
  this.get_best_move = function(ply) {
    this.tree = {};
    return this.best_move_recursive(game.serialize(), ply, "");
  }
  this.best_move_recursive = function(state, rem_ply, path) {
    var states = game_permutations(state);
    var best_state = null;
    var best_score = 0;
    for (var i = 0; i < states.length; i++) {
      var state = states[i];
      var total_score = 0;
      if (rem_ply <= 0) {
        total_score = state.state.score;
      } else {
        var possible_states = this.gen_states(state);
        for (var j = 0; j < possible_states.length; j++) {
          var possible_state = possible_states[j];
          var res = this.best_move_recursive(possible_state, rem_ply - 1, path + this.move_names[i] + String(rem_ply) + ",");
          if (res) {
            total_score += res.state.score * possible_state.chance;
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
  this.chances = [
    { val: 2, chance: .9},
    { val: 4, chance: .1}
  ];
  this.move_names = ["up", "right", "down", "left"];
  this.move_hiearchy = {0: 2, 1: 1, 2: 3, 3: 0};
  this.gen_states = function(state) {
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
  document.addEventListener("keydown", function(evt) {
    if (game.inputManager.targetIsInput(evt)) return;
    if(evt.which == 77 || evt.which == 78 || evt.which == 67) {
      if (evt.which == 77) {
        bott.stop = false;
        bott.run();
      }
      if (evt.which == 78) {
        bott.next();
      }
      if (evt.which == 67) {
        bott.stop = true;
      }
      evt.preventDefault();
    }
  });
  return this;
}
