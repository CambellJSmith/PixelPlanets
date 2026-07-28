import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

for(const filename of ['index.html','dev.html']){
  const html=fs.readFileSync(path.join(root,filename),'utf8');
  for(const id of ['game','boot-status','accessibility-status']){
    if(!new RegExp(`id=["']${id}["']`).test(html))throw new Error(`${filename} is missing #${id}.`);
  }
  if(/class=["'][^"']*(hud|inventory-panel|controls|help)/.test(html)){
    throw new Error(`${filename} still contains an external HUD, inventory panel, controls, or help panel.`);
  }
  if(/<button\b|<aside\b/.test(html))throw new Error(`${filename} must expose only the full-window game surface.`);
}

const styles=fs.readFileSync(path.join(root,'styles.css'),'utf8');
if(!/#game\s*\{[\s\S]*width:\s*100vw[\s\S]*height:\s*100vh/.test(styles)){
  throw new Error('The game canvas is not configured as a full-viewport surface.');
}
if(!/image-rendering:\s*pixelated/.test(styles))throw new Error('Fullscreen scaling must remain nearest-neighbor pixelated.');

const hud=fs.readFileSync(path.join(root,'src/ui/hud.js'),'utf8');
if(/requireElement\(|inventoryList\.innerHTML/.test(hud))throw new Error('The HUD still depends on external DOM panels.');

console.log('fullscreen DOM contract test passed');
