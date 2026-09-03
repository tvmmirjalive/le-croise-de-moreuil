














/* ================================================================
   ORBES — l'or et l'expérience tombent par terre (8.63)

   Avant : le compteur montait tout seul à l'instant de la mort. Tuer un
   ennemi n'avait aucune suite, aucun geste. Maintenant le gain JAILLIT du
   cadavre comme une petite fontaine, retombe au sol, et il faut aller le
   chercher. C'est ce qui donne au nettoyage d'une salle son deuxième temps.

   Trois choses à ne jamais casser :

   1. LE TOTAL EST CONSERVÉ. `repartir()` distribue le montant exact, reste
      compris. Si on plafonne le nombre d'orbes, la part restante est versée
      directement — on ne perd JAMAIS un point d'or ni d'expérience.
   2. L'AIMANT ne dispense pas de marcher. Il n'agit qu'à 70 px, soit une case
      et demie : il évite la chasse au pixel, il ne ramasse pas à distance.
   3. QUITTER UN NIVEAU NE VOLE RIEN. `balayerOrbesSol()` verse le reliquat avant
      tout changement de niveau. Perdre l'expérience d'un boss parce qu'on a
      pris l'escalier trop vite serait un bug, pas une règle.

   La hauteur `z` est purement visuelle : la profondeur de tri reste (x,y), au
   sol. Sinon l'orbe passerait devant les murs pendant son vol.
   ================================================================ */
const ORBE_R_AIMANT=70;     // l'aimant se déclenche à une case et demie
const ORBE_R_PRISE=18;      // et il faut vraiment être dessus pour prendre
const ORBE_G=520;           // gravité, px/s² — le saut dure environ 0,6 s
const ORBE_MAX=120;         // au-delà, on verse en direct : pas de tapis d'orbes
let   _orbeSon=0;           // anti-mitraillette sur le son de pièce
const _orbeAcc={or:0,xp:0,t:0};   // les gains se cumulent en UN seul texte

/* La boule verte est pré-rendue une fois. Un dégradé radial par orbe et par
   image, c'est exactement l'erreur qu'on a passé la 8.51 à corriger. */
let _ORBE_XP_CV=null;
function _orbeXpCanvas(){
  if(_ORBE_XP_CV)return _ORBE_XP_CV;
  const c=document.createElement('canvas');c.width=c.height=28;
  const g=c.getContext('2d');if(!g)return null;
  const R=14,gr=g.createRadialGradient(R,R,0,R,R,R);
  gr.addColorStop(0,'rgba(228,255,228,0.98)');
  gr.addColorStop(0.28,'rgba(141,250,166,0.95)');
  gr.addColorStop(0.55,'rgba(74,214,110,0.45)');
  gr.addColorStop(1,'rgba(50,180,80,0)');
  g.fillStyle=gr;g.beginPath();g.arc(R,R,R,0,6.283);g.fill();
  g.fillStyle='rgba(255,255,255,0.8)';g.beginPath();g.arc(R-2.4,R-2.8,2.2,0,6.283);g.fill();
  _ORBE_XP_CV=c;return c;
}
function orbesSolDe(lvl){return lvl.orbes||(lvl.orbes=[]);}
function _verserOrbe(type,val){
  if(val<=0)return;
  if(type==='or'){ if(level.arena)level.arena.goldBag+=val; else player.gold+=val; }
  else crediterXp(val);
}
/* Répartition exacte : base pour tous, +1 aux premiers pour absorber le reste. */
function jaillirOrbesSol(x,y,type,total,n){
  total=Math.round(total||0);if(total<=0)return;
  if(!level){_verserOrbe(type,total);return;}
  const L=orbesSolDe(level);
  n=Math.max(1,Math.min(n|0||1,10,total));
  const base=Math.floor(total/n);let reste=total-base*n;
  for(let i=0;i<n;i++){
    let v=base;if(reste>0){v++;reste--;}
    if(L.length>=ORBE_MAX){_verserOrbe(type,v);continue;}
    const a=alea()*6.283, s=rand(16,52);
    L.push({type,val:v,x,y,
      /* la composante Y est écrasée : en vue isométrique, une gerbe ronde
         au sol se voit comme une ellipse deux fois moins haute */
      vx:Math.cos(a)*s, vy:Math.sin(a)*s*0.52,
      z:10, vz:rand(140,230), t:0, sol:false, ph:alea()*6.283});
  }
  refreshHud();
}
function prendreOrbeSol(o){
  _verserOrbe(o.type,o.val);
  if(o.type==='or'){
    _orbeAcc.or+=o.val;
    if(_orbeSon<=0){SFX.gold();_orbeSon=0.08;}
  }else _orbeAcc.xp+=o.val;
  _orbeAcc.t=0.28;
  refreshHud();
}
function _viderAccOrbes(){
  if(_orbeAcc.or>0)floatText(player.x+rand(-10,10),player.y-38,'+'+_orbeAcc.or+' or','#f4d35e');
  if(_orbeAcc.xp>0)floatText(player.x+rand(-10,10),player.y-52,'+'+_orbeAcc.xp+' XP','#8dfaa6');
  _orbeAcc.or=0;_orbeAcc.xp=0;_orbeAcc.t=0;
}
/* Filet de sécurité : on ne quitte jamais un niveau en laissant un gain derrière. */
function balayerOrbesSol(){
  if(!level||!level.orbes||!level.orbes.length)return;
  for(const o of level.orbes)_verserOrbe(o.type,o.val);
  level.orbes.length=0;_viderAccOrbes();refreshHud();
}
function majOrbesSol(dt){
  if(_orbeSon>0)_orbeSon-=dt;
  if(_orbeAcc.t>0){_orbeAcc.t-=dt;if(_orbeAcc.t<=0)_viderAccOrbes();}
  const L=level&&level.orbes;if(!L||!L.length)return;
  /* Rayon d'aimantation, gants compris. Calculé UNE fois par image : P() est
     une agrégation complète de l'équipement, pas une lecture de champ. */
  const RA=ORBE_R_AIMANT*(1+(P().pick||0)/100);
  for(let i=L.length-1;i>=0;i--){
    const o=L[i];o.t+=dt;
    if(!o.sol){
      o.vz-=ORBE_G*dt;o.z+=o.vz*dt;
      const nx=o.x+o.vx*dt, ny=o.y+o.vy*dt;
      /* un orbe ne franchit pas un mur : sinon on en perd derrière la roche */
      if(poseLibre(level,nx,ny)){o.x=nx;o.y=ny;}
      else{o.vx*=-0.35;o.vy*=-0.35;}
      if(o.z<=0){
        o.z=0;
        if(o.vz<-95){o.vz*=-0.40;o.vx*=0.45;o.vy*=0.45;}  // un seul rebond franc
        else{o.sol=true;o.vz=0;o.vx=0;o.vy=0;}
      }
    }
    const d=dist(player.x,player.y,o.x,o.y);
    if(o.t>0.22&&d<RA){
      const k=(RA-d)/RA;
      const pas=(150+560*k)*dt;
      if(d>0.01){o.x+=(player.x-o.x)/d*pas;o.y+=(player.y-o.y)/d*pas;}
      o.sol=true;o.vz=0;o.z+=(15-o.z)*Math.min(1,dt*7);
    }
    if(o.t>0.18&&d<ORBE_R_PRISE){prendreOrbeSol(o);L.splice(i,1);}
  }
}
function dessinerOrbeSol(o){
  const et=tileAt(o.x,o.y);if(level.seen[idx(level.w,et.tx,et.ty)]!==1)return;
  const gx=o.x-cam.x, gy=o.y-cam.y;
  if(gx<-40||gx>W+40||gy<-60||gy>H+40)return;
  const bob=o.sol?Math.sin(o.t*3.6+o.ph)*1.7:0;
  const sy=gy-o.z+bob;
  ctx.globalAlpha=0.30*(1-Math.min(1,o.z/60));
  ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(gx,gy+4,7,3.4,0,0,6.283);ctx.fill();
  ctx.globalAlpha=1;
  if(o.type==='or'){
    const im=(typeof MISC_IMG!=='undefined')&&MISC_IMG.gold_coin;
    if(im&&im.complete&&im.width){ctx.imageSmoothingEnabled=false;ctx.drawImage(im,gx-9,sy-9,18,18);}
    else{ctx.fillStyle='#f4d35e';ctx.beginPath();ctx.arc(gx,sy,6,0,6.283);ctx.fill();
         ctx.fillStyle='rgba(255,255,255,0.7)';ctx.beginPath();ctx.arc(gx-1.6,sy-1.8,1.8,0,6.283);ctx.fill();}
  }else{
    const c=_orbeXpCanvas();
    if(c)ctx.drawImage(c,gx-14,sy-14);
    else{ctx.fillStyle='#8dfaa6';ctx.beginPath();ctx.arc(gx,sy,6,0,6.283);ctx.fill();}
  }
}

/* ---------------- LOOT ---------------- */
const RARE_LVL=8, MAGIC_LVL=3;
/* ================================================================
   PREMIÈRES TROUVAILLES GARANTIES — 8.66

   Mesuré en 8.65 : l'arme est la SEULE pièce à porter des dégâts, et un
   objet magique vaut x1,9 sur le DPS. Le rythme des premières heures ne
   dépendait donc pas du niveau du héros mais de la date à laquelle il
   croisait son premier objet magique — c'est-à-dire d'un tirage au sort.
   Deux joueurs de même niveau pouvaient vivre deux jeux différents.

   On supprime le tirage au sort au lieu d'en compenser les effets :

   1. Les SIX premiers ennemis lâchent chacun une pièce blanche, choisie
      parmi les emplacements VIDES en priorité — on s'habille au lieu de
      collectionner trois crosses.
   2. Le premier objet MAGIQUE est garanti au plus tard au niveau 5.
      Avant ça il peut tomber tout seul ; à partir du niveau 5, le premier
      ennemi tué le donne.

   Le compteur `player.dons` est sauvegardé : il ne se relance pas à chaque
   partie chargée. Rien de tout cela ne s'applique aux boss, qui ont déjà
   leur butin garanti. */
const DONS_BLANCS=6, DON_MAGIQUE_NIV=5;
const DONS_SLOTS=['weapon','armor','helm','gloves','belt','skates','amulet','ring'];
/* On ne donne jamais deux fois le même emplacement tant qu'il en reste :
   six ceintures ne font pas une panoplie. On tient compte de ce qui est
   déjà porté ET de ce qui a déjà été offert — le joueur n'a pas forcément
   équipé sa trouvaille avant de tuer l'ennemi suivant. */
function slotADonner(){
  const d=player.dons||(player.dons={blancs:0,magique:0});
  const deja=d.slots||(d.slots=[]);
  let libres=DONS_SLOTS.filter(s=>!player.equip[s]&&deja.indexOf(s)<0);
  if(!libres.length)libres=DONS_SLOTS.filter(s=>deja.indexOf(s)<0);
  if(!libres.length)libres=DONS_SLOTS;
  const s=pick(libres);deja.push(s);return s;
}
function donsDebut(en){
  if(en.boss||en.arenaBoss)return false;
  const d=player.dons||(player.dons={blancs:0,magique:0});
  if(!d.magique&&player.lvl>=MAGIC_LVL&&(player.lvl>=DON_MAGIQUE_NIV||alea()<0.12)){
    d.magique=1;
    dropItem(en.x+rand(-10,10),en.y+rand(-6,6),makeItem('magic',slotADonner()));
    toast(t('butin.premierMagique'),2.6);
    if(typeof repliqueUnique==='function')repliqueUnique('premier_magique','aldric',
      t('butin.premierMagique.replique'));
    return true;
  }
  if(d.blancs<DONS_BLANCS&&player.lvl<=DON_MAGIQUE_NIV+3){
    d.blancs++;
    dropItem(en.x+rand(-10,10),en.y+rand(-6,6),makeItem('white',slotADonner()));
    return true;
  }
  return false;
}
function rollLoot(en){
  if(alea()<(en.boss?0.06:en.elite?0.02:0.005))dropItem(en.x+rand(-8,8),en.y+10,makeSocketable(en.boss||en.elite));
  if(donsDebut(en))return;
  let chance=en.boss?1:(en.kind==='brute'?0.22:0.10);
  if(alea()>chance)return;
  const r=alea();let rar='white';
  const mf=Math.min(1.2,(P().mf||0)/100)+difficulty*0.15;
  const magicOK=player.lvl>=MAGIC_LVL, rareOK=player.lvl>=RARE_LVL;
  if(en.boss)rar='rare';
  else if(en.elite){if(magicOK&&r<0.45)rar='magic';}
  else{if(rareOK&&r<0.0002*(1+mf))rar='rare';else if(magicOK&&r<0.05)rar='magic';}
  dropItem(en.x+rand(-10,10),en.y+rand(-6,6),makeItem(rar));
  if(en.finalBoss){dropItem(en.x+30,en.y,makeItem('unique','weapon'));dropItem(en.x-30,en.y,makeItem('unique','armor'));}else if(en.boss){dropItem(en.x,en.y+14,makeItem('unique'));}
}
function dropItem(x,y,item){
  if(level&&level.arena){level.arena.bag.push(item);floatText(x,y-14,'+ butin de la Fosse','#ff9a5a');return;}
  // ensure on walkable tile
  if(!isWalkablePx(level,x,y)){x=player.x;y=player.y;}
  level.drops.push({x,y,item,t:0});
}
const autoSalv={white:false,magic:false};
/* AUTO-DÉMONTAGE — une seule règle, un seul endroit.

   Trois défauts avant :
   — le réglage n'était PAS enregistré : il repartait à zéro à chaque partie,
     d'où l'impression qu'il ne marchait pas ;
   — il ne s'appliquait qu'au ramassage au sol, jamais au butin d'arène ;
   — il pouvait démonter un objet NON IDENTIFIÉ, dont on ignorait le contenu.

   `autoDemonter(it)` répond oui ou non ; `demonterAuto(it)` encaisse les
   fragments. Tout chemin de butin passe par là. */
/* Raretés que RIEN ne démonte automatiquement, jamais, quel que soit le
   réglage. Elles ne l'étaient déjà pas — mais par accident : `autoSalv` ne
   portait simplement pas ces clés. Une clé ajoutée par erreur, une sauvegarde
   bricolée, un futur bouton « démonter les rares », et une pièce unique
   partait en fragments sans confirmation. C'est écrit noir sur blanc. */
const RARETES_PROTEGEES={rare:1,unique:1,legendary:1};
function autoDemonter(it){
  if(!it||!it.slot||it.slot==='gem'||it.charm)return false;
  if(needsId(it))return false;              // jamais un objet inconnu
  if(RARETES_PROTEGEES[it.rarity])return false;   // ni un rare, ni un unique, ni un légendaire
  return !!autoSalv[it.rarity];
}
function demonterAuto(it,x,y){
  const f=salvageValue(it); player.frags+=f;
  if(x!=null&&typeof floatText==='function')floatText(x,y,'+❄'+f,'#7dd0ff');
  return f;
}
function grabDrop(drop){
  const i=level.drops.indexOf(drop);if(i<0)return;
  const _it=drop.item;
  if(autoDemonter(_it)){demonterAuto(_it,drop.x,drop.y-10);
    SFX.pickup();level.drops.splice(i,1);refreshHud();return;}
  if(sacPlein(drop.item)){toast('Sac plein !',1.4);return;}
  inventory.push(drop.item);toast(t('objet.ramasse')+' '+nomObjet(drop.item).replace(/<[^>]+>/g,''),1.6);
  playOnce('Picking_Up');SFX.pickup();
  if(_it.rarity==='legendary'||_it.rarity==='unique')vibrer(VIB.butin);
  level.drops.splice(i,1);renderInventory();
}

/* ---------------- XP / POTION / DAMAGE ---------------- */
const LEVEL_CAP=60;



