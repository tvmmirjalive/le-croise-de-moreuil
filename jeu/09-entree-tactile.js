

























/* ================================================================
   ENTRÉE TACTILE — DEUX ZONES DISJOINTES
   Gauche : joystick de déplacement. Droite : viser et agir.
   Multi-touch : on suit chaque doigt par son identifiant, pour que
   marcher et lancer un sort en même temps fonctionne.
   ================================================================ */
let _tDroite=null;          // doigt actif dans la moitié droite
let _tHold=null;            // maintien pour le déplacement au toucher
/* LE DOIGT NE PASSE PAS PAR LA MISE À L'ÉCHELLE.

   Le bug de pointeur rapporté en 8.66 est un bug de SOURIS, sur PC, après
   un aller-retour d'onglet — une situation qui n'existe pas au doigt. La
   conversion directe est éprouvée depuis des mois sur Android ; la 8.67 l'a
   remplacée et a fait disparaître le joystick. On la remet.

   Le vrai correctif du cas PC est `reprendreFenetre`, qui rejoue `resize()`
   au retour sur l'onglet : il agit AVANT toute conversion, et ne dépend
   d'aucun rectangle. */
function _cvPos(t){const r=cv.getBoundingClientRect();
  return{px:t.clientX-r.left,py:t.clientY-r.top,identifier:t.identifier};}



function _finDoigt(e){
  for(const raw of e.changedTouches){
    if(joy.actif&&raw.identifier===joy.id)joyFin();
    if(raw.identifier===_tDroite){_tDroite=null;_tHold=null;}
  }
}

/* ennemi sous un point du monde, pour frapper sans déplacer */
function _ennemiSous(wx,wy){
  if(!level||!level.enemies)return null;
  let best=null,bd=1e9;
  for(const en of level.enemies){
    if(en.dying)continue;
    const d=dist(wx,wy,en.x,en.y);
    if(d<en.r+26&&d<bd){bd=d;best=en;}
  }
  return best;
}
// appui long sur un objet = infobulle (remplace le survol souris)
function bindLongPress(el,it,equipped){
  if(!IS_TOUCH)return; let tid=null;
  el.addEventListener('touchstart',ev=>{const t=ev.touches[0];
    tid=setTimeout(()=>{showTip({clientX:t.clientX,clientY:t.clientY},it,equipped,true);},380);},{passive:true});
  const cancel=()=>{if(tid){clearTimeout(tid);tid=null;}};
  el.addEventListener('touchend',()=>{cancel();setTimeout(hideTip,2600);},{passive:true});
  el.addEventListener('touchcancel',cancel,{passive:true});
  el.addEventListener('touchmove',cancel,{passive:true});
}

// position MONDE sous le curseur (inverse iso si vue iso, sinon top-down)
function mouseWorld(){ return screenToWorld(mouse.x,mouse.y); }

function _walkNear(tx,ty){
  if(walkableCode(level.grid[idx(level.w,tx,ty)]))return{x:tx*TS+TS/2,y:ty*TS+TS/2};
  const R=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1],[2,0],[-2,0],[0,2],[0,-2]];
  for(const d of R){const x=tx+d[0],y=ty+d[1];
    if(x>0&&y>0&&x<level.w-1&&y<level.h-1&&walkableCode(level.grid[idx(level.w,x,y)]))return{x:x*TS+TS/2,y:y*TS+TS/2};}
  return{x:tx*TS+TS/2,y:ty*TS+TS/2};
}
function onClick(wx,wy){
  {const c=(typeof sacIci==='function')?sacIci():null;
   if(c&&dist(wx,wy,c.x,c.y)<TS*1.0){clearIntents();
     if(!ramasserSac())setPathTo(c.x,c.y);return;}}
  if(level.relic&&!level.relic.destroyed&&dist(wx,wy,level.relic.x,level.relic.y)<TS*0.9){
    clearIntents();player._relic=level.relic;
    if(dist(player.x,player.y,level.relic.x,level.relic.y)<TS*1.7)hitRelic();else setPathTo(level.relic.x,level.relic.y);return;}
  // NPC (village)
  if(level.npcs)for(const npc of level.npcs){
    const nx=npc.tx*TS+TS/2,ny=npc.ty*TS+TS/2;
    if(dist(wx,wy,nx,ny)<TS*0.75){clearIntents();player._npc=npc;
      /* ⚠ ON REMET `_npc` À `null` QUAND ON A OUVERT ICI MÊME.        (v9.50)

         Le défaut des DEUX APPUIS sur la croix venait de cette ligne. `_npc`
         est posé avant le test de distance, et la branche PROCHE ne le
         reprenait jamais : le panneau s'ouvrait, la partie se mettait en
         pause, la croix fermait — et à l'image suivante
         `_interactionsProches()` voyait `_npc` toujours posé, le héros
         toujours à portée, et ROUVRAIT le panneau. Le second appui semblait
         marcher parce que `_pnjInteragir` avait alors fait le ménage.
         Exactement deux appuis, jamais trois, et seulement pour les PNJ et
         les balises — c'est le symptôme décrit.

         La branche recopiait en outre la chaîne de sept ternaires que la
         Phase 4 avait extraite dans `_pnjInteragir` : le correctif supprime
         la duplication du même geste. */
      if(dist(player.x,player.y,nx,ny)<TS*1.6){_pnjInteragir(npc);player._npc=null;}
      else{const _w=_walkNear(npc.tx,npc.ty);setPathTo(_w.x,_w.y);}return;}}
  // chest (cave)
  if(level.chests)for(const ch of level.chests){
    if(ch.opened)continue;
    if(dist(wx,wy,ch.x,ch.y)<TS*0.7){clearIntents();player._chest=ch;
      if(dist(player.x,player.y,ch.x,ch.y)<TS*1.5)openChest(ch);else setPathTo(ch.x,ch.y);return;}}
  if(level.shrines)for(const sh of level.shrines){if(sh.used)continue;
    if(dist(wx,wy,sh.x,sh.y)<TS*0.7){clearIntents();player._shrine=sh;
      if(dist(player.x,player.y,sh.x,sh.y)<TS*1.5)activateShrine(sh);else setPathTo(sh.x,sh.y);return;}}
  if(level.breakables)for(const bk of level.breakables){if(bk.broken)continue;
    if(dist(wx,wy,bk.x,bk.y)<TS*0.55){clearIntents();player._break=bk;
      if(dist(player.x,player.y,bk.x,bk.y)<TS*1.4)breakBarrel(bk);else setPathTo(bk.x,bk.y);return;}}
  // pickup drop
  for(let i=level.drops.length-1;i>=0;i--)
    if(dist(wx,wy,level.drops[i].x,level.drops[i].y)<RAYON_CLIC_LOOT){pathToThenGrab(level.drops[i]);return;}
  // enemy?
  let tgt=null,best=1e9;
  for(const en of level.enemies){if(!en._visible)continue;const d=dist(wx,wy,en.x,en.y);
    if(d<en.r+16&&d<best){best=d;tgt=en;}}
  if(tgt){clearIntents();
    if(activeSkill!=='slap'){faceAngle(Math.atan2(tgt.y-player.y,tgt.x-player.x));if(trySkill(activeSkill,tgt.x,tgt.y))return;}
    player.attackTarget=tgt;setPathTo(tgt.x,tgt.y);return;}
  clearIntents();setPathTo(wx,wy);
}
function clearIntents(){player.attackTarget=null;player._grab=null;player._npc=null;player._chest=null;player._shrine=null;player._break=null;}
function setPathTo(wx,wy){
  /* Au village : on navigue sur la grille des CELLULES. Le héros s'arrête
     donc au CENTRE d'une cellule — le point où il a 22 px de sol partout —
     et non plus au centre d'une case, qui tombe pile au coin où quatre
     cellules se touchent. C'est ça qui ne changeait rien avant. */
  if(regleQuartiers(level)){
    const d=posePointProche(level,player.x,player.y,14);
    const a=posePointProche(level,wx,wy,14);
    if(!d||!a){player.path=null;return;}
    const p=astarPoses(level,d.u,d.v,a.u,a.v);
    if(p&&p.length>1){player.path=p.slice(1).map(q=>posePx(q.u,q.v));player._grab=null;}
    else player.path=null;
    return;
  }
  const s=tileAt(player.x,player.y);let t=tileAt(wx,wy);
  // if target tile not walkable, find nearest walkable neighbor
  if(!walkableCode(level.grid[idx(level.w,clamp(t.tx,0,level.w-1),clamp(t.ty,0,level.h-1))])){
    let bestD=1e9,bt=null;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
      const nx=t.tx+dx,ny=t.ty+dy;if(nx<0||ny<0||nx>=level.w||ny>=level.h)continue;
      if(walkableCode(level.grid[idx(level.w,nx,ny)])){const d=Math.hypot(dx,dy);if(d<bestD){bestD=d;bt={tx:nx,ty:ny};}}}
    if(!bt)return;t=bt;}
  const p=astar(level,s.tx,s.ty,t.tx,t.ty);
  if(p&&p.length>1){player.path=pathToPixels(p.slice(1));player._grab=null;}
  else player.path=null;
}
function pathToThenGrab(drop){setPathTo(drop.x,drop.y);player._grab=drop;player.attackTarget=null;}

// Sélectionne le sort ET le lance immédiatement vers le curseur
function castSlot(i){const s=player.bar&&player.bar[i];if(!s){toast('Emplacement '+(i+1)+' vide — assigne un sort (touche S)',1.4);return;}castSkillKey(s);}
function castSkillKey(s){
  if(s!=='slap'&&(player.skillRanks[s]||0)<=0){toast('Compétence non débloquée (arbre)',1.4);return;}
  setActiveSkill(s);
  const p=pointVise();                    // cible automatique si active, sinon curseur
  if(p.cible)faceAngle(Math.atan2(p.cible.y-player.y,p.cible.x-player.x));
  if(!trySkill(s,p.x,p.y)){ /* recharge ou mana : le sort reste sélectionné */ }
}

/* ---------------- SKILL EXEC ---------------- */
/* Les tonneaux, caisses et urnes n'étaient cassés que par un clic dessus :
   aucune compétence ne les touchait. Un Moulinet à côté d'un tonneau le
   laissait intact, ce qui n'a aucun sens. Toute zone de dégâts passe
   désormais par ici. */
function casserAutour(x,y,r){
  if(!level||!level.breakables)return 0;
  let n=0;
  for(const b of level.breakables){
    if(b.broken)continue;
    if(dist(x,y,b.x,b.y)<=r+10){breakBarrel(b);n++;}
  }
  return n;
}
/* LES DÉGÂTS D'UNE COMPÉTENCE. Six branches de `trySkill` recopiaient cette
   formule en ne changeant que trois nombres : le coup de base, ce qu'ajoute
   chaque rang, et l'école de l'arbre qui la majore. Le multiplicateur
   d'Énergie s'applique à TOUTES. */
function _skillDegats(C, base, parRang, ecole){
  return randi(C.st.dmgMin,C.st.dmgMax)*(base+C.rank*parRang)
         *(1+((C.TBp[ecole]||0))/100)*C.SP;
}

/* Le son du sort. Table relue à chaque appel : `SFX` est garni au décodage des
   échantillons, donc une table figée au chargement serait vide. */
function _skillSon(s){
  return ({slap:SFX.slap,charge:SFX.charge,tempest:SFX.frost,holy:SFX.holy,
           whirl:SFX.whirl,warcry:SFX.warcry,multi:SFX.multi}[s]||function(){});
}

/* Les dégâts étaient appliqués instantanément sur 260 px, sans que rien ne
   parte : le sort ressemblait à l'attaque de base. C'est maintenant un vrai
   palet lancé, qui traverse et garde EXACTEMENT la même portée et les mêmes
   dégâts — seule la présentation change.
   Portée 260 px, vitesse 14 px/frame : la cible est atteinte en ~0,31 s. */
function _skSlap(C){
  const ang=C.ang, dmg=_skillDegats(C,2.2,0.15,'phys');
  projectiles.push({x:player.x+Math.cos(ang)*18,y:player.y+Math.sin(ang)*18,
    vx:Math.cos(ang)*14,vy:Math.sin(ang)*14,dmg:dmg,
    perce:true,bounces:0,  // traverse les ennemis, s'arrête sur un mur
    r:8,life:260/(14*60),  // vit exactement le temps de parcourir sa portée
    t:0,hitSet:new Set(),type:'phys',col:'#5ec8ff',
    forme:'palet',trail:[],spin:0,spinV:26});
  gerbe(player.x+Math.cos(ang)*26,player.y+Math.sin(ang)*26,'#9fe0ff',10,ang,0.4,
        {vmin:3,vmax:7,tmin:.1,tmax:.26,g:0,r:1.8});
  secouer(2.2,0.12);player.swing=0.18;
}

/* La Charge sondait le trajet avec isWalkablePx, qui ne teste QU'UN POINT :
   le héros finissait sa ruée de 200 px à moitié encastré dans le mur.
   Même correction qu'au joystick — on sonde le CORPS, et par pas de 3 px
   pour ne pas franchir une paroi mince entre deux sondes. */
function _skCharge(C){
  const ang=C.ang;
  let dd=Math.min(200,dist(player.x,player.y,C.wx,C.wy));let nx=player.x,ny=player.y;
  const Rc=Math.max(4,player.r-2);
  for(let d=0;d<dd;d+=3){const tx=player.x+Math.cos(ang)*d,ty=player.y+Math.sin(ang)*d;
    if(!corpsLibre(level,tx,ty,Rc))break;nx=tx;ny=ty;}
  const dmg=_skillDegats(C,1.6,0.15,'phys');
  for(let t=0;t<=1;t+=0.08){const px=player.x+(nx-player.x)*t,py=player.y+(ny-player.y)*t;
    for(const en of level.enemies){if(en._chHit)continue;
      if(dist(px,py,en.x,en.y)<en.r+22){hitEnemy(en,dmg,'phys');en._chHit=true;}}}
  level.enemies.forEach(en=>en._chHit=false);
  /* Images fantômes : quatre silhouettes le long du trajet, qui s'effacent.
     Sans elles le héros se téléportait, et le sort n'était pas lisible. */
  fantomes.length=0;
  for(let k=1;k<=4;k++){const t=k/5;
    fantomes.push({x:player.x+(nx-player.x)*t,y:player.y+(ny-player.y)*t,
      t:0,life:0.34,dir:player.dirRow|0});}
  gerbe(player.x,player.y,'#8fdcff',10,ang+3.14,0.7,{vmin:2,vmax:5,g:200,tmin:.2,tmax:.45});
  for(let t=0;t<=1;t+=0.12)casserAutour(player.x+(nx-player.x)*t,player.y+(ny-player.y)*t,34);
  player.x=nx;player.y=ny;player.path=null;player.attackTarget=null;player._chargeLock=0.4;
  burst(nx,ny,'#8fdcff',18,{r:2.6,forme:'eclat',rot:8});
  secouer(4,0.2);
}

function _skTempest(C){
  const dmg=_skillDegats(C,1.4,0.2,'cold');
  for(const en of level.enemies)if(dist(player.x,player.y,en.x,en.y)<150){hitEnemy(en,dmg,'cold');en.slow=1.6;en.frozen=1.2;}
  casserAutour(player.x,player.y,150);
  for(let i=0;i<44;i++){const a=rand(0,6.28),v=rand(2,6);
    part({x:player.x,y:player.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.4,.9),
      col:i%3?'#7fd0ff':'#dff2ff',r:rand(1.6,3.4),g:i%2?150:0,rot:rand(-7,7),forme:'glace'});}
  /* Éclats qui retombent en périphérie de l'onde, pour épaissir le halo. */
  for(let i=0;i<16;i++){const a=rand(0,6.28),d=rand(90,150);
    part({x:player.x+Math.cos(a)*d,y:player.y+Math.sin(a)*d,vx:0,vy:-rand(1,2),
      life:rand(.5,1.0),col:'#bfe8ff',r:rand(1.2,2.6),g:330,rot:rand(-5,5),forme:'glace'});}
  player.tempest=0.4;secouer(3.4,0.2);
}

function _skHoly(C){
  const ang=C.ang, dmg=_skillDegats(C,1.8,0.2,'holy');
  projectiles.push({x:player.x,y:player.y,vx:Math.cos(ang)*7,vy:Math.sin(ang)*7,
    dmg:dmg,bounces:2+C.rank,r:9,life:2.5,t:0,
    hitSet:new Set(),type:'holy',col:'#ffe89a',forme:'palet',trail:[],spin:0,spinV:18});
  gerbe(player.x+Math.cos(ang)*22,player.y+Math.sin(ang)*22,'#fff2a0',7,ang,0.5,
        {vmin:1.5,vmax:4,tmin:.12,tmax:.28,g:0});
  secouer(1.4,0.10);
}

/* LE MOULINET TOURNE POUR DE BON                              (v9.00)
   Il durait 0,26 s — un balayage unique, alors que le nom promet une
   toupie. Le son mesuré durait 1,23 s : quatre fois et demie le geste,
   et l'oreille entendait tourner ce que l'œil voyait déjà fini.

   Il fait maintenant TROIS TOURS en 1,0 s. Les dégâts ne changent pas
   d'un point : ils sont simplement découpés en trois salves. Ce qui
   change, c'est le RISQUE — le héros est ancré sur place pendant qu'il
   tourne. C'est le prix du geste, et ça donne enfin une décision à
   prendre avant de l'employer. */
const WHIRL_SALVES=3, WHIRL_RAYON=130;
function _skWhirl(C){
  const dmg=_skillDegats(C,1.3,0.15,'phys');
  const salves=WHIRL_SALVES;
  /* Première salve tout de suite : sans elle, le sort paraîtrait mou. */
  for(const en of level.enemies)if(dist(player.x,player.y,en.x,en.y)<WHIRL_RAYON)hitEnemy(en,dmg/salves,'phys');
  casserAutour(player.x,player.y,WHIRL_RAYON);
  player.moulinet={t:0,life:MOULINET_DUREE,r:WHIRL_RAYON,ang:C.ang,
                   dmg:dmg/salves,salves:salves,faites:1};
  /* Ancré, sauf si la Tornade a été apprise. */
  if(!moulinetMobile())player.ancre=MOULINET_DUREE;
  for(let i=0;i<22;i++){const a=rand(0,6.28),d=rand(60,WHIRL_RAYON);
    part({x:player.x+Math.cos(a)*d,y:player.y+Math.sin(a)*d,
      vx:Math.cos(a)*rand(1,3),vy:Math.sin(a)*rand(1,3),life:rand(.25,.5),
      col:'#ffd27f',r:rand(1.2,2.4),g:260,rot:rand(-10,10),forme:'eclat'});}
  player.swing=0.2;secouer(3,0.16);
}

function _skMulti(C){
  const ang=C.ang, base=_skillDegats(C,1.2,0.15,'phys');
  for(const off of [-0.15,0,0.15]){const aa=ang+off;
    projectiles.push({x:player.x,y:player.y,vx:Math.cos(aa)*8,vy:Math.sin(aa)*8,dmg:base,bounces:0,
      r:6.5,life:1.6,t:0,hitSet:new Set(),type:'holy',col:'#bfe3ff',
      forme:'palet',trail:[],spin:rand(0,3),spinV:22});}
  gerbe(player.x+Math.cos(ang)*20,player.y+Math.sin(ang)*20,'#bfe3ff',9,ang,0.55,
        {vmin:2,vmax:5,tmin:.12,tmax:.3,g:0});
  secouer(1.6,0.10);
}

/* Onde de choc dorée, même grammaire que la Tempête, plus une aura qui dure
   tant que le buff est actif : on voit enfin qu'on est galvanisé. */
function _skWarcry(C){
  const st=C.st;
  player.buffType='power';player.buffT=5+C.rank;
  soigner(Math.round(st.hpMax*0.12));      /* le venin mord ici aussi */
  player.cri={t:0,life:0.5,r:170};
  for(let i=0;i<34;i++){const a=rand(0,6.28),v=rand(2,5);
    part({x:player.x,y:player.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1.5,life:rand(.5,1.0),
      col:i%2?'#ffe08a':'#fff2c0',r:rand(1.4,3),g:120,rot:rand(-6,6),forme:'eclat'});}
  secouer(4.5,0.26);
  toast('Cri de Guerre !',1);
}

/* SEPT BRANCHES, SEPT FONCTIONS.                                  (Phase 4)
   `trySkill` faisait 119 lignes : le péage — rang, recharge, mana, son,
   orientation — puis une chaîne de sept `else if` qu'il fallait traverser
   pour trouver le bon sort. Le péage reste ici ; l'effet est ailleurs.

   Un `s` absent de cette table ne fait rien, comme avant : l'ancienne chaîne
   ne s'arrêtait sur aucune branche et rendait quand même `true`. */
const SKILL_EFFET={slap:_skSlap, charge:_skCharge, tempest:_skTempest,
                   holy:_skHoly, whirl:_skWhirl, multi:_skMulti, warcry:_skWarcry};

function trySkill(s,wx,wy){
  const rank=player.skillRanks[s];if(s!=='slap'&&rank<=0)return false;
  if(skillCd[s]>0)return false;
  if(s==='charge'&&(player._chargeLock||0)>0)return false;
  const def=SKILLS[s];const _st0=P();
  /* L'Énergie réduit le coût en mana, jusqu'à 40 %. */
  const mana=Math.max(1,Math.round((def.manaBase+(s==='slap'?0:rank))*(1-(_st0.manaCoutPct||0)/100)));
  if(player.mp<mana){toast('Pas assez de mana',1);return false;}
  player.mp-=mana;
  skillCd[s]=def.cdBase*(1-Math.min(0.6,(P().cast||0)/100));
  _skillSon(s)();
  const st=P();const ang=Math.atan2(wy-player.y,wx-player.x);
  faceAngle(ang);playOnce('Attack1');
  const effet=SKILL_EFFET[s];
  if(effet)effet({st:st, rank:rank, ang:ang, wx:wx, wy:wy,
                  TBp:fusionBonus(player.treeBonus,player.paraBonus),
                  /* Multiplicateur d'Énergie appliqué à TOUTES les compétences. */
                  SP:1+(st.sortPct||0)/100});
  renderSkillBar();return true;
}
/* `DMG_COL` vivait ici. Elle est descendue en 07 : la brûlure et le venin
   affichent leurs dégâts depuis 11-progression.js, et 11 ne peut pas importer
   de 09 — c'est 09 qui importe 11. Une seule table pour tout le monde. */
/* LE CRITIQUE : LA CHANCE EST PLAFONNÉE EN DUR, LES DÉGÂTS NE LE SONT PAS.

   Demandé par Mirja : « un plafond en dur de 80 % de critique, mais pour les
   dégâts pas de limite. » C'est la séparation classique des action-RPG —
   Diablo III sépare de même la chance et les dégâts critiques — et elle
   règle un défaut de fond : sans elle, le critique était un stat MORT
   au-dessus de 100 (`alea()*100 < crit` : tout coup était déjà critique), et
   un héros complet monte à plus de 400.

   LE SURPLUS N'EST PAS JETÉ POUR AUTANT. Chaque point de chance au-dessus du
   plafond devient 0,25 point de DÉGÂTS critiques. Sans cela, plafonner à 80
   rendrait mort tout ce que l'arbre et l'équipement donnent au-delà — on
   remplacerait un gaspillage par un autre, en pire. Les dégâts critiques,
   eux, n'ont aucune borne : c'est la voie de progression sans fin que le
   plafond de chance libère. */
const CRIT_PLAFOND=80, CRIT_MULT_BASE=2, CRIT_SURPLUS=0.25;
function chanceCritique(c){return Math.min(CRIT_PLAFOND,Math.max(0,c||0));}
function multCritique(c,critDmg){
  const surplus=Math.max(0,(c||0)-CRIT_PLAFOND)*CRIT_SURPLUS;
  return CRIT_MULT_BASE+(surplus+(critDmg||0))/100;
}
function hitEnemy(en,dmg,type){
  if(en.dying)return;
  {const st0=P();const lvlGap=Math.max(0,(en.lvl||1)-player.lvl);
   const hitChance=Math.max(55,Math.min(97,88+(st0.acc||0)*0.6+st0.dex*0.15-lvlGap*2.2));
   if(alea()*100>hitChance){floatText(en.x,en.y-en.r-6,'RATÉ','#9aa0a6');return;}}
  type=type||'phys';const res=(en.res&&en.res[type])||0;
  if(res>=100){floatText(en.x,en.y-en.r-6,'IMMUNISÉ','#9aa0a6');return;}
  const st=P();let crit=false;
  if(alea()*100<chanceCritique(st.crit)){crit=true;dmg*=multCritique(st.crit,st.critDmg);SFX.crit({x:en.x,y:en.y});vibrer(VIB.critique);}
  dmg=Math.round(dmg*(1-res/100));
  if(en._shield>0){dmg=Math.round(dmg*0.45);floatText(en.x,en.y-en.r-20,'⛨',en.col||'#7fd0ff');}
  if(dmg<1)dmg=1;
  en.hp-=dmg;en.hurt=crit?0.24:0.15;en.aggro=true;player.totalDmg+=dmg;
  /* Retour d'impact. La force est le rapport des dégâts aux PV max de la cible,
     plafonné : un petit coup sur un boss ne doit pas secouer l'écran. */
  {const force=Math.min(1,dmg/Math.max(1,en.hpMax)*3);
   const ang=Math.atan2(en.y-player.y,en.x-player.x);
   const col=(typeof DMG_COL!=='undefined'&&DMG_COL[type])||'#ffd85e';
   eclatImpact(en.x,en.y-en.r*0.4,crit?'#fff2a0':col,force,ang);
   /* Recul : on ne repousse ni les boss ni les mourants, et on vérifie que la
      case d'arrivée est praticable — sinon l'ennemi traverserait les murs. */
   if(!en.boss&&!en.dying){
     const rec=Math.min(11,3+force*8)*(crit?1.6:1);
     const nx=en.x+Math.cos(ang)*rec, ny=en.y+Math.sin(ang)*rec;
     if(isWalkablePx(level,nx,en.y))en.x=nx;
     if(isWalkablePx(level,en.x,ny))en.y=ny;
   }
   if(crit){geler(0.045);secouer(3.5+force*4,0.22);}
   else if(force>0.35)secouer(1.6+force*2,0.14);
  }
  if(st.leech>0){soigner(Math.max(1,Math.round(dmg*st.leech/100)));}
  const tag=res>0?' ⛨':(res<0?' ‼':'');
  floatText(en.x,en.y-en.r-6,(crit?'✷':'')+dmg+tag,crit?'#ff7a3d':(DMG_COL[type]||'#ffd85e'),crit);
  burst(en.x,en.y,en.col,crit?10:6);if(!crit)SFX.enemyHit({x:en.x,y:en.y});
  document.getElementById('dTotalDmg').textContent=player.totalDmg.toLocaleString('fr-FR');
  if(en.hp<=0)killEnemy(en);
}
function killEnemy(en){
  if(en.dying)return;const i=level.enemies.indexOf(en);if(i<0)return;en.dying=true;en.dieT=0;en.hp=0;
  if(en.boss)ARENA_BAN.t=0;   // l'annonce de phase n'a plus d'objet
  player.kills++;
  if(alea()<USURE_ARME)wearGear(['weapon'],1);
  /* L'écart de niveau module le gain. On affiche le chiffre RÉELLEMENT versé,
     et une flèche quand l'écart pèse — sinon le joueur ne comprend pas
     pourquoi deux ennemis identiques ne rapportent pas pareil. */
  const _m=xpMultNiveau(en.lvl,player.lvl);
  const _xp=Math.max(1,Math.round((en.xp||1)*_m));
  /* Depuis la 8.63 l'expérience ne se verse plus ici : elle jaillit en boules
     vertes et se ramasse au sol. Le chiffre s'affiche donc au RAMASSAGE.
     Ce qui reste ici, c'est l'écart de niveau — une information sur le
     monstre, qui n'aurait plus de sens une fois l'orbe pris. */
  jaillirOrbesSol(en.x,en.y-6,'xp',xpNet(_xp),en.boss?8:3);
  if(_m>=1.15||_m<=0.85)
    floatText(en.x,en.y-en.r-20,'×'+_m.toFixed(2).replace('.',',')+' XP',
              _m>=1.15?'#7dff9a':'#c0c8d8');
  burst(en.x,en.y,en.col,20);onKill(en);SFX.death();
  /* ÉCONOMIE — les monstres et les tonneaux versaient beaucoup trop d'or : un
     run rapportait 144 000 or pour 27 500 de dépenses possibles. Les gains de
     base sont divisés par deux et TOUS indexés sur la profondeur, y compris le
     boss d'acte qui rapportait moins que trois tonneaux de son propre niveau. */
  const _pf=(level.depth||0);
  const g=en.boss?Math.round(randi(150,250)*(1+_pf*0.8)):randi(1,4)+_pf*2;
  jaillirOrbesSol(en.x,en.y,'or',g,en.boss?10:(g>=6?3:2));
  rollLoot(en);
  if(en.elite&&alea()<0.05&&placesUtilisees()<invCap){dropItem(en.x,en.y+8,makeCharm());}
  if(en.elite){const eg=randi(8,16)+_pf*5;jaillirOrbesSol(en.x,en.y-4,'or',eg,4);const _rr=alea();if(player.lvl>=RARE_LVL&&_rr<0.01)dropItem(en.x,en.y+10,makeItem('rare'));else if(player.lvl>=MAGIC_LVL&&_rr<0.51)dropItem(en.x,en.y+10,makeItem('magic'));}
  if(en.arenaBoss){player.arenaBossKills=(player.arenaBossKills||0)+1;
    toast('⚒ Écho terrassé ('+player.arenaBossKills+') — la forge se souvient',2.6);}
  if(en.boss&&!en.arenaBoss&&level.kind==='act'){const K=arenaKeys();
    const an=level.actNum||0, kk=an<=1?'bronze':an<=3?'silver':'gold';
    const first=!(bossCleared&&bossCleared[an]);
    if(first||alea()<0.22){K[kk]++;toast('🗝️ Clé '+(kk==='bronze'?'de bronze':kk==='silver'?'d’argent':'d’or')+' — la Fosse t’attend',3);refreshHud();}}
  if(en.boss&&!en.arenaBoss&&level.kind==='act'&&!level.relic){
    const t=tileAt(en.x,en.y);spawnRelic(level,t.tx,t.ty);}
  if(en.finalBoss){
    /* Le drapeau se lève AVANT le minuteur, pas dedans : c'est pendant
       l'attente que le héros se faisait tuer. */
    player._finale=true;
    setTimeout(()=>{
      /* La scène finale passe AVANT l'écran de victoire : le joueur voit
         Verdier redevenir un homme, puis seulement le bilan. */
      /* ⚠ LA BASCULE VIENT APRÈS LE FINAL, PAS À SA PLACE.       (v9.42)
         Le mode Normal se termine sur Verdier redevenu un vieil homme ; c'est
         seulement APRÈS que le succube se révèle. Enchaîner les deux ici plutôt
         que d'allonger `final` garde la victoire du Normal intacte pour qui la
         rejoue, et laisse la bascule être une scène à part — donc rejouable
         depuis le journal, et absente en Cauchemar où elle n'a plus de sens. */
      /* ⚠ LA CINÉMATIQUE PRÉCÈDE LA SCÈNE, ELLE NE LA REMPLACE PAS. Aucun .mp4
         n'est livré aujourd'hui : `jouerVideo` rend la main immédiatement et
         appelle la suite, donc la chaîne se comporte exactement comme avant.
         Le jour où Mirja pose `videos/bascule.mp4`, il s'intercale tout seul. */
      if(typeof jouerScene==='function'
         &&jouerScene('final',()=>{
             const suite=()=>{ if(!jouerScene('bascule',victory))victory(); };
             if(typeof jouerVideo==='function')jouerVideo('bascule',suite); else suite();
           }))return;
      victory();
    },900);}else if(en.boss&&!en.arenaBoss){toast('⚑ Gardien vaincu — la relique se révèle !',2.4);}
  updateStatLine();refreshHud();
}
function updateStatLine(){document.getElementById('statLine').textContent=
  'Démons purgés : '+player.kills+' · XP totale : '+player.xpTotal.toLocaleString('fr-FR')+(difficulty>0?' · '+['Normal','Cauchemar','Enfer'][difficulty]:'');}

/* CE QUI S'EXÉCUTE AU CHARGEMENT — sorti du premier niveau.

   Le module ne fait plus que DÉCLARER. Ses actions de chargement sont
   appelées par l'entrée, dans l'ordre des préfixes, ce qui rend l'ordre
   d'évaluation des modules INDIFFÉRENT — sans quoi la conversion en
   modules ES les remettrait dans un ordre imprévisible. */
function _demarrer09(){
  cv.addEventListener('touchstart',e=>{
    if(!running)return; e.preventDefault();
    for(const raw of e.changedTouches){
      const t=_cvPos(raw);
      if(OPT.joystick&&joyZoneGauche(t.px)&&!joy.actif){ joyDebut(t); continue; }
      // moitié droite (ou joystick désactivé) : viser et agir
      _tDroite=t.identifier;
      mouse.x=t.px; mouse.y=t.py;
      const w=screenToWorld(t.px,t.py);
      if(activeSkill&&activeSkill!=='slap'&&(player.skillRanks[activeSkill]||0)>0){
        faceAngle(Math.atan2(w.y-player.y,w.x-player.x));
        if(trySkill(activeSkill,w.x,w.y)){_tHold=null;continue;}
      }
      /* On appelle TOUJOURS onClick : c'est lui qui gère PNJ, coffres, balises,
         sanctuaires, tonneaux, reliques et ramassage. Couper le toucher-pour-marcher
         ne doit couper que le DÉPLACEMENT, pas l'interaction — sans quoi plus rien
         n'est activable au doigt. */
      const marcheAutorisee=(OPT.clicMarche||!OPT.joystick);
      const av={npc:player._npc,chest:player._chest,shrine:player._shrine,
                relic:player._relic,grab:player._grab,cible:player.attackTarget};
      onClick(w.x,w.y);
      const aVise=(player._npc!==av.npc)||(player._chest!==av.chest)||
                  (player._shrine!==av.shrine)||(player._relic!==av.relic)||
                  (player._grab!==av.grab)||(player.attackTarget!==av.cible);
      if(marcheAutorisee){ _tHold={x:t.px,y:t.py}; }
      else if(!aVise){ player.path=null; }   // clic dans le vide : on ne se déplace pas
    }
  },{passive:false});
  cv.addEventListener('touchmove',e=>{
    if(!running)return; e.preventDefault();
    for(const raw of e.changedTouches){
      const t=_cvPos(raw);
      if(joy.actif&&t.identifier===joy.id){ joyBouge(t); continue; }
      if(t.identifier===_tDroite){
        mouse.x=t.px; mouse.y=t.py;
        if(_tHold){ _tHold.x=t.px; _tHold.y=t.py;
          const w=screenToWorld(t.px,t.py);
          if(!player.attackTarget)setPathTo(w.x,w.y); }
      }
    }
  },{passive:false});
  cv.addEventListener('touchend',e=>{_finDoigt(e);},{passive:false});
  cv.addEventListener('touchcancel',e=>{_finDoigt(e);},{passive:false});
  // maintien du doigt immobile = continuer d'avancer (uniquement si le toucher-pour-marcher est actif)
  setInterval(()=>{ if(!running||!_tHold||player.attackTarget)return;
    if(!(OPT.clicMarche||!OPT.joystick))return;
    const w=screenToWorld(_tHold.x,_tHold.y);
    if(dist(player.x,player.y,w.x,w.y)>TS*0.8)setPathTo(w.x,w.y);
  },260);
  // rendu net sur écran haute densité
  (function(){const _r=resize;resize=function(){const d=Math.min(2,window.devicePixelRatio||1);
    setW(innerWidth);H=innerHeight;cv.width=Math.round(W*d);cv.height=Math.round(H*d);
    cv.style.width=W+'px';cv.style.height=H+'px';ctx.setTransform(d,0,0,d,0,0);};resize();})();
  addEventListener('keydown',e=>{
    /* Pendant une scène, le clavier ne pilote plus le héros : Échap saute
       (si elle a déjà été vue), tout le reste avance. Sans ce filtre, on
       lance un sort dans le vide en lisant un dialogue. */
    if(typeof sceneEnCours==='function'&&sceneEnCours()){
      e.preventDefault();
      if(e.key==='Escape')passerScene(); else avancerScene();
      return;
    }
    if(!running){if(e.code==='Enter')startGame();return;}
    // touches de sorts : on lit le CODE physique (Digit1..4 / Numpad1..4)
    // → fonctionne aussi bien en AZERTY qu'en QWERTY, sans Shift.
    const c=e.code;
    if(c==='Digit1'||c==='Numpad1'){castSlot(0);return;}
    if(c==='Digit2'||c==='Numpad2'){castSlot(1);return;}
    if(c==='Digit3'||c==='Numpad3'){castSlot(2);return;}
    if(c==='Digit4'||c==='Numpad4'){castSlot(3);return;}
    if(c==='Space'){e.preventDefault();usePotion();return;}
    if(e.key==='F9'){e.preventDefault();devKit();return;}
    if(e.key==='F10'){e.preventDefault();devToBoss();return;}
    const k=e.key.toLowerCase();
    if(k==='i')togglePanel('invPanel');else if(k==='c')togglePanel('charPanel');
    else if(k==='s')togglePanel('skillPanel');else if(k==='m')toggleFullMap();else if(k==='j')togglePanel('questPanel');
    else if(k==='a')useManaPotion();else if(k==='b')toggleStash();else if(k==='o')togglePanel('optPanel');
    else if(k==='p'){setPaused(!paused);document.getElementById('pauseOv').style.display=paused?'flex':'none';}
    else if(k==='r')usePortal();
    else if(k==='e'){if(document.getElementById('invPanel').style.display==='block'&&invSel>=0&&inventory[invSel])equipItem(invSel);}
    else if(k==='d'){if(document.getElementById('invPanel').style.display==='block'&&invSel>=0&&inventory[invSel])salvageItem(invSel);}
    else if(k==='escape'){ if(sceneEnCours()){passerScene();return;}
      closeAllPanels();fermerCarte();}
  });
}



