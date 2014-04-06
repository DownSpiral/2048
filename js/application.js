// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  bot = new Bot(new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager));

  document.addEventListener("keydown", function(evt) {
    if (bot.game.inputManager.targetIsInput(evt)) return;
    if(evt.which == 77 || evt.which == 78 || evt.which == 67 || evt.which == 66) {
      if (evt.which == 77) {
        bot.stop = false;
        bot.run();
      }
      if (evt.which == 78) {
        bot.next();
      }
      if (evt.which == 67) {
        bot.stop = true;
      }
      if (evt.which == 66) {
        var previousState = bot.game.storageManager.getBestGameState();

        if (previousState) {
          bot.game.grid        = new Grid(previousState.grid.size,
                                    previousState.grid.cells); // Reload grid
          bot.game.score       = previousState.score;
          bot.game.over        = previousState.over;
          bot.game.won         = previousState.won;
          bot.game.keepPlaying = previousState.keepPlaying;
        }
          // Update the actuator
        bot.game.actuate();
      }
      evt.preventDefault();
    }
  });

});
