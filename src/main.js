import { createGame } from './game.js';

const canvas=document.getElementById('game');
if(!(canvas instanceof HTMLCanvasElement)){
  throw new Error('Game canvas was not found.');
}

const game=createGame(canvas);
game.start();

const bootStatus=document.getElementById('boot-status');
if(bootStatus)bootStatus.hidden=true;
document.documentElement.dataset.gameReady='true';

// Exposed for debugging from the browser console.
window.pixelWorldGame=game;
