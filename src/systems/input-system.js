import { WORLD_WIDTH, WORLD_HEIGHT, PLAYER_CONFIG, MAGNIFIER_CONFIG } from '../config.js';
import { nearestPixel } from '../pixel-grid.js';
import { PORTAL_CODES } from '../data/dimensions.db.js';

export function createInputSystem(state,canvas,actions){
  const portalCodeTimeoutMs=3200;
  const jumpKeys=new Set(['w','arrowup',' ']);
  const preventedKeys=new Set([
    'a','d','w','q','e','r','p','i','o','k','f','tab','enter','escape','delete','f5','f9',
    'arrowleft','arrowright','arrowup','arrowdown',' ',
  ]);

  function updatePointer(event){
    const rect=canvas.getBoundingClientRect();
    const width=canvas.width||WORLD_WIDTH;
    const height=canvas.height||WORLD_HEIGHT;
    const localX=(event.clientX-rect.left)/Math.max(1,rect.width)*width;
    const localY=(event.clientY-rect.top)/Math.max(1,rect.height)*height;
    state.input.pointerX=Math.max(0,Math.min(width-1,nearestPixel(localX)));
    state.input.pointerY=Math.max(0,Math.min(height-1,nearestPixel(localY)));
    if(event.pointerType==='touch')state.input.touchMode=true;
  }

  function inventoryItems(){ return state.inventory.list(); }

  function activateInventoryIndex(index=state.ui.inventoryIndex){
    const items=inventoryItems();
    if(items.length===0)return false;
    const safeIndex=Math.max(0,Math.min(items.length-1,index));
    state.ui.inventoryIndex=safeIndex;
    const item=items[safeIndex];
    if(item.kind==='material'&&item.placeable)return actions.equipMaterial(item.materialId);
    if(item.kind==='furniture')return actions.equipFurniture(item.furnitureId);
    if(item.kind==='seed')return actions.equipSeed(item.cropId);
    if(item.kind==='produce')return actions.eatProduce(item.cropId);
    if(item.kind==='loot'&&item.edible)return actions.eatLoot(item.lootId);
    return false;
  }

  function moveInventorySelection(delta){
    const length=inventoryItems().length;
    if(length===0){ state.ui.inventoryIndex=0; return; }
    state.ui.inventoryIndex=(state.ui.inventoryIndex+delta+length)%length;
    actions.updateHud();
  }

  function resetPointerActions(){
    state.input.keys.clear();
    state.input.pointerDown=false;
    state.entities.hook.active=false;
  }

  function toggleInventory(force=null){
    state.ui.inventoryOpen=force===null?!state.ui.inventoryOpen:Boolean(force);
    if(state.ui.inventoryOpen){
      state.ui.worldMenuOpen=false;
      state.ui.craftingOpen=false;
      state.ui.confirmWorldAction='';
    }
    resetPointerActions();
    actions.updateHud();
  }

  function craftingEntries(){ return state.ui.hud?.crafting??[]; }

  function moveCraftingSelection(delta){
    const length=craftingEntries().length;
    if(length===0){ state.ui.craftingIndex=0; return; }
    state.ui.craftingIndex=(state.ui.craftingIndex+delta+length)%length;
    actions.updateHud();
  }

  function activateCraftingIndex(index=state.ui.craftingIndex){
    const entries=craftingEntries();
    if(entries.length===0)return false;
    const safeIndex=Math.max(0,Math.min(entries.length-1,index));
    state.ui.craftingIndex=safeIndex;
    return actions.craftFurniture(entries[safeIndex].id);
  }

  function toggleCrafting(force=null){
    state.ui.craftingOpen=force===null?!state.ui.craftingOpen:Boolean(force);
    if(state.ui.craftingOpen){
      state.ui.inventoryOpen=false;
      if(state.ui.worldMenuOpen)state.paused=Boolean(state.ui.worldMenuReturnPaused);
      state.ui.worldMenuOpen=false;
      state.ui.confirmWorldAction='';
    }
    resetPointerActions();
    actions.updateHud();
  }

  function toggleWorldMenu(force=null){
    const opening=force===null?!state.ui.worldMenuOpen:Boolean(force);
    if(opening&&!state.ui.worldMenuOpen){
      state.ui.worldMenuReturnPaused=state.paused;
      state.paused=true;
      state.ui.inventoryOpen=false;
      state.ui.craftingOpen=false;
      state.ui.worldSlotIndex=Math.max(0,(state.save.activeSlot||1)-1);
      actions.refreshSaveSlots();
    }else if(!opening&&state.ui.worldMenuOpen){
      state.paused=Boolean(state.ui.worldMenuReturnPaused);
    }
    state.ui.worldMenuOpen=opening;
    state.ui.confirmWorldAction='';
    state.ui.confirmWorldSlot=0;
    resetPointerActions();
    actions.updateHud();
  }

  function selectWorldSlot(delta){
    const count=Math.max(1,state.ui.saveSlots.length||3);
    state.ui.worldSlotIndex=(state.ui.worldSlotIndex+delta+count)%count;
    state.ui.confirmWorldAction='';
    actions.updateHud();
  }

  function slotNumber(index=state.ui.worldSlotIndex){ return Math.max(1,Math.min(3,index+1)); }

  function performWorldAction(action,slot){
    const safeSlot=Math.max(1,Math.min(3,Math.round(Number(slot)||1)));
    if(action==='load'){
      if(actions.loadWorld(safeSlot))toggleWorldMenu(false);
      return true;
    }
    if(action==='save'){
      actions.saveWorld(safeSlot);
      actions.refreshSaveSlots();
      actions.updateHud();
      return true;
    }
    if(action==='new'){
      if(state.ui.confirmWorldAction!=='new'||state.ui.confirmWorldSlot!==safeSlot){
        state.ui.confirmWorldAction='new';
        state.ui.confirmWorldSlot=safeSlot;
        actions.updateHud();
        return true;
      }
      actions.newWorldInSlot(safeSlot);
      state.ui.confirmWorldAction='';
      return true;
    }
    if(action==='delete'){
      if(state.ui.confirmWorldAction!=='delete'||state.ui.confirmWorldSlot!==safeSlot){
        state.ui.confirmWorldAction='delete';
        state.ui.confirmWorldSlot=safeSlot;
        actions.updateHud();
        return true;
      }
      actions.deleteWorld(safeSlot);
      state.ui.confirmWorldAction='';
      actions.refreshSaveSlots();
      actions.updateHud();
      return true;
    }
    return false;
  }

  function hitCanvasUi(){
    for(let index=state.ui.inventoryRects.length-1;index>=0;index--){
      const rect=state.ui.inventoryRects[index];
      if(state.input.pointerX<rect.x||state.input.pointerY<rect.y||state.input.pointerX>=rect.x+rect.w||state.input.pointerY>=rect.y+rect.h)continue;
      if(rect.kind==='inventory-toggle')toggleInventory();
      else if(rect.kind==='crafting-toggle')toggleCrafting();
      else if(rect.kind==='world-toggle')toggleWorldMenu();
      else if(rect.kind==='save-current')actions.saveWorld();
      else if(rect.kind==='pause-toggle')actions.togglePause();
      else if(rect.kind==='new-world')toggleWorldMenu(true);
      else if(rect.kind==='inventory-close')toggleInventory(false);
      else if(rect.kind==='crafting-close')toggleCrafting(false);
      else if(rect.kind==='world-close')toggleWorldMenu(false);
      else if(rect.kind==='inventory-item')activateInventoryIndex(rect.index);
      else if(rect.kind==='crafting-item')activateCraftingIndex(rect.index);
      else if(rect.kind==='world-slot'){
        state.ui.worldSlotIndex=rect.slot-1;
        state.ui.confirmWorldAction='';
        actions.updateHud();
      }else if(rect.kind.startsWith('world-'))performWorldAction(rect.kind.slice(6),rect.slot);
      return true;
    }
    return false;
  }

  function onPointerDown(event){
    state.input.pointerInside=true;
    state.input.pointerButton=event.button;
    updatePointer(event);
    if(hitCanvasUi())return;
    if(state.ui.inventoryOpen||state.ui.craftingOpen||state.ui.worldMenuOpen||state.paused)return;
    state.input.pointerDown=true;
    canvas.setPointerCapture?.(event.pointerId);
    actions.attack();
  }

  function onPointerUp(event){
    state.input.pointerDown=false;
    state.input.pointerButton=0;
    state.entities.hook.active=false;
    if(canvas.hasPointerCapture?.(event.pointerId))canvas.releasePointerCapture?.(event.pointerId);
  }

  function onWheel(event){
    event.preventDefault();
    state.input.pointerInside=true;
    updatePointer(event);
    if(state.ui.worldMenuOpen){
      selectWorldSlot(event.deltaY<0?-1:1);
      return;
    }
    if(state.ui.craftingOpen){
      moveCraftingSelection(event.deltaY<0?-1:1);
      return;
    }
    if(state.ui.inventoryOpen){
      moveInventorySelection(event.deltaY<0?-1:1);
      return;
    }
    const delta=event.deltaY<0?MAGNIFIER_CONFIG.zoomStep:-MAGNIFIER_CONFIG.zoomStep;
    state.magnifier.zoom=Math.max(
      MAGNIFIER_CONFIG.minZoom,
      Math.min(MAGNIFIER_CONFIG.maxZoom,state.magnifier.zoom+delta),
    );
    actions.updateHud();
  }


  function capturePortalCode(key,event){
    if(event.repeat||key.length!==1||key<'a'||key>'z')return false;
    const now=Date.now();
    if(now>(state.input.portalCodeUntil||0))state.input.portalCodeBuffer='';
    const current=String(state.input.portalCodeBuffer??'');
    const attempt=current+key;
    const prefixMatches=PORTAL_CODES.filter(item=>item.code.startsWith(attempt));
    if(prefixMatches.length>0){
      state.input.portalCodeBuffer=attempt;
      state.input.portalCodeUntil=now+portalCodeTimeoutMs;
      const exact=prefixMatches.find(item=>item.code===attempt);
      if(exact){
        state.input.portalCodeBuffer='';
        state.input.portalCodeUntil=0;
        if(actions.openDimensionPortal)actions.openDimensionPortal(exact.dimension);
        else if(exact.dimension==='moon')actions.openMoonPortal?.();
      }
      return true;
    }
    const restart=PORTAL_CODES.filter(item=>item.code.startsWith(key));
    if(restart.length>0){
      state.input.portalCodeBuffer=key;
      state.input.portalCodeUntil=now+portalCodeTimeoutMs;
      const exact=restart.find(item=>item.code===key);
      if(exact){
        state.input.portalCodeBuffer='';
        state.input.portalCodeUntil=0;
        if(actions.openDimensionPortal)actions.openDimensionPortal(exact.dimension);
        else if(exact.dimension==='moon')actions.openMoonPortal?.();
      }
      return true;
    }
    state.input.portalCodeBuffer='';
    state.input.portalCodeUntil=0;
    return false;
  }

  function onKeyDown(event){
    const key=event.key.toLowerCase();
    if(capturePortalCode(key,event)){ event.preventDefault(); return; }
    if(preventedKeys.has(key))event.preventDefault();

    if(key==='f5'&&!event.repeat){ actions.saveWorld(); return; }
    if(key==='f9'&&!event.repeat){ actions.loadWorld(); return; }
    if(key==='o'&&!event.repeat){ toggleWorldMenu(); return; }
    if(key==='k'&&!event.repeat){ toggleCrafting(); return; }

    if(state.ui.worldMenuOpen){
      if((key==='arrowup'||key==='w')&&!event.repeat)selectWorldSlot(-1);
      else if((key==='arrowdown'||key==='s')&&!event.repeat)selectWorldSlot(1);
      else if(key==='enter'&&!event.repeat){
        const slot=slotNumber();
        const metadata=state.ui.saveSlots[slot-1];
        performWorldAction(metadata?.empty?'new':'load',slot);
      }else if(key==='n'&&!event.repeat)performWorldAction('new',slotNumber());
      else if(key==='delete'&&!event.repeat)performWorldAction('delete',slotNumber());
      else if(key==='escape'&&!event.repeat)toggleWorldMenu(false);
      return;
    }

    if(state.ui.craftingOpen){
      if((key==='arrowup'||key==='w')&&!event.repeat)moveCraftingSelection(-1);
      else if((key==='arrowdown'||key==='s')&&!event.repeat)moveCraftingSelection(1);
      else if(key==='enter'&&!event.repeat)activateCraftingIndex();
      else if(key==='escape'&&!event.repeat)toggleCrafting(false);
      return;
    }

    if((key==='i'||key==='tab')&&!event.repeat){
      toggleInventory();
      return;
    }

    if(state.ui.inventoryOpen){
      if((key==='arrowup'||key==='w')&&!event.repeat)moveInventorySelection(-1);
      else if((key==='arrowdown'||key==='s')&&!event.repeat)moveInventorySelection(1);
      else if(key==='enter'&&!event.repeat)activateInventoryIndex();
      else if(key==='escape'&&!event.repeat)toggleInventory(false);
      return;
    }

    if(key==='p'&&!event.repeat){ actions.togglePause(); return; }
    if(key==='r'&&!event.repeat){ toggleWorldMenu(true); return; }
    if(state.paused)return;
    if(key==='f'&&!event.repeat){ actions.interactFurniture(); return; }

    if(jumpKeys.has(key)&&!event.repeat)state.jumpBuffer=PLAYER_CONFIG.jumpBufferFrames;

    if(key==='q'&&!event.repeat)actions.cycleWeapon();
    else if(key==='e'&&!event.repeat)actions.cycleMaterial();
    else if(key==='escape'&&!event.repeat)actions.exitBuildMode(true);
    else state.input.keys.add(key);
  }

  function onKeyUp(event){
    const key=event.key.toLowerCase();
    state.input.keys.delete(key);
    if(jumpKeys.has(key))actions.releaseJump();
  }

  function onBlur(){
    state.input.keys.clear();
    state.input.pointerDown=false;
    state.input.pointerButton=0;
    state.input.pointerInside=false;
    state.entities.hook.active=false;
    state.input.portalCodeBuffer='';
    state.input.portalCodeUntil=0;
    state.input.moonMeIndex=0;
    state.input.moonMeUntil=0;
  }

  function install(){
    canvas.addEventListener('contextmenu',event=>event.preventDefault());
    canvas.addEventListener('pointerenter',event=>{
      state.input.pointerInside=true;
      updatePointer(event);
    });
    canvas.addEventListener('pointerleave',()=>{
      if(!state.input.touchMode)state.input.pointerInside=false;
    });
    canvas.addEventListener('pointerdown',onPointerDown);
    canvas.addEventListener('pointermove',event=>{
      state.input.pointerInside=true;
      updatePointer(event);
    });
    canvas.addEventListener('pointerup',onPointerUp);
    canvas.addEventListener('pointercancel',()=>{
      state.input.pointerDown=false;
      state.input.pointerButton=0;
      state.entities.hook.active=false;
    });
    canvas.addEventListener('wheel',onWheel,{passive:false});

    window.addEventListener('keydown',onKeyDown);
    window.addEventListener('keyup',onKeyUp);
    window.addEventListener('blur',onBlur);
  }

  return {
    install,
    updatePointer,
    toggleInventory,
    toggleWorldMenu,
    toggleCrafting,
    activateInventoryIndex,
    activateCraftingIndex,
    performWorldAction,
  };
}
