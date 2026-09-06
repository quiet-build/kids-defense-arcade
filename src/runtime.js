import Phaser from 'phaser';

// Phaser 3.90 start() installs process-wide visibility handlers without cleanup.
// Intercept only its synchronous start call and immediately restore the host.
export class SessionGame extends Phaser.Game {
  start() {
    const blur = window.onblur, focus = window.onfocus;
    const add = document.addEventListener;
    const owned = [];
    document.addEventListener = function(type, listener, options) {
      add.call(document, type, listener, options);
      if (type === 'visibilitychange') owned.push(() => document.removeEventListener(type, listener, options));
    };
    try { super.start(); } finally {
      document.addEventListener = add;
      window.onblur = blur; window.onfocus = focus;
      for (const remove of owned) remove();
    }
  }
}

export function ownRuntime(game) {
  let disposed = false;
  return (failedBoot = false) => {
    if (disposed) return;
    disposed = true;
    if (failedBoot && !game.scene.isBooted) {
      // Renderer setup can throw before BOOT/READY. SceneManager.destroy()
      // requires its not-yet-created system scene, so release only owned parts.
      game.events.emit(Phaser.Core.Events.DESTROY);
      game.events.removeAllListeners();
      game.renderer?.destroy();
      if (game.canvas) {
        Phaser.Display.Canvas.CanvasPool.remove(game.canvas);
        game.canvas.remove();
      }
      game.loop.destroy();
      return;
    }
    game.input?.keyboard?.stopListeners();
    game.sound?.stopAll();
    for (const scene of game.scene.getScenes(false)) {
      if (scene.sys.isActive() || scene.sys.isPaused()) game.scene.stop(scene);
    }
    game.destroy(true);
    // Complete the public pending-destroy step after the current callback,
    // even when a hidden document no longer receives animation frames.
    const finish = () => queueMicrotask(() => game.step(performance.now(), 0));
    if (game.isRunning) finish();
    else game.events.once(Phaser.Core.Events.READY, finish);
  };
}
