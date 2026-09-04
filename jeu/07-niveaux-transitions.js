



















/* ================================================================
   ÉTAT GLOBAL / NIVEAUX
   ================================================================ */
let overworld=null,level=null,running=false,difficulty=0;
const cam={x:0,y:0};
const banner={text:'',sub:'',t:0};
function showBanner(t,sub){banner.text=t;banner.sub=sub||'';banner.t=2.8;}
let travelLock=0;

/* Déclaré ICI, avant enterLevel et killEnemy qui l'effacent. Un const laissé
   plus bas serait en zone morte à l'appel, et « typeof » lève une
   ReferenceError sur un const en zone morte au lieu de renvoyer 'undefined'. */
const ARENA_BAN={t:0,txt:'',sub:''};
function enterLevel(lvl,px,py){if(level)level.zones=null;
  /* Au village, on atterrit au centre d'une cellule libre, jamais au coin. */
  {const q=poserSurCellule(lvl,px,py); px=q.x; py=q.y;}
  ARENA_BAN.t=0;   // rien ne survit au changement de niveau
  /* Les effets en cours n'ont aucun sens dans le niveau suivant. */
  if(typeof fantomes!=='undefined')fantomes.length=0;
  player.moulinet=null;player.cri=null;player.tempest=0;player.ancre=0;
  if(typeof SECOUSSE!=='undefined'){SECOUSSE.t=0;SECOUSSE.amp=0;}
  /* Le sac de mort se réancre ici : le niveau où il est tombé peut avoir été
     régénéré entre-temps (les actes ne sont pas sauvegardés). */
  setTimeout(()=>{try{ancrerSac();majRappelSac();}catch(e){}},0);
  /* On ne quitte jamais un niveau en y laissant de l'or ou de l'expérience. */
  balayerOrbesSol();
  if(typeof viderRepliques==='function')viderRepliques();
  level=lvl;player.x=px;player.y=py;player.path=null;player.attackTarget=null;
  travelLock=0.5;
  cam.x=player.x-W/2; cam.y=player.y-H/2;
  document.getElementById('zoneName').textContent=lvl.name;
  showBanner(nomNiveau(lvl), lvl.kind==='act'?t('niveau.relique',{nom:nomRelique(lvl.actNum)}):(lvl.kind==='village'?t('niveau.refuge'):''));
}

// trouve une tuile SOL adjacente (jamais une tuile de transition) pour ne pas rebondir
function spotNear(lvl,tx,ty){
  /* Le repli renvoyait la case de transition ELLE-MÊME quand aucun voisin
     immédiat n'était du sol pur. On réapparaissait alors pile sur l'escalier
     ou sur la bouche de grotte : au premier contrôle de transition, on
     repartait aussitôt d'où l'on venait. Va-et-vient sans fin.
     On élargit donc la recherche jusqu'à quatre cases, du plus proche au
     plus lointain, avant d'envisager le repli. */
  /* On cherche d'abord une case TENABLE : du sol pur ne garantit pas qu'on
     puisse s'y tenir. Le balayage d'origine reste en repli, donc ce contrôle
     ne peut que rendre le résultat meilleur, jamais pire. */
  {const _t=caseTenableProche(lvl,tx,ty,4,true);
   if(_t)return{x:_t.tx*TS+TS/2,y:_t.ty*TS+TS/2};}
  for(let r=1;r<=4;r++){
    let best=null,bd=1e9;
    for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
      const x=tx+dx,y=ty+dy;
      if(x<0||y<0||x>=lvl.w||y>=lvl.h)continue;
      if(lvl.grid[idx(lvl.w,x,y)]!==T_FLOOR)continue;
      const d=dx*dx+dy*dy;
      if(d<bd){bd=d;best={x:x*TS+TS/2,y:y*TS+TS/2};}
    }
    if(best)return best;
  }
  return{x:tx*TS+TS/2,y:ty*TS+TS/2};
}
/* ================================================================
   TRANSITIONS — pourquoi « être SUR la case » ne suffit pas (v8.64)

   Une case de transition ne se déclenchait que si `tileAt(héros)` tombait
   exactement dessus. Or la règle des quartiers interdit de se poser au
   centre d'une case dont un voisin diagonal est un bloc de mur — et c'est
   la configuration MÊME d'une bouche de grotte : le sprite est adossé au
   coin sud d'un bloc, donc ce bloc touche la case d'entrée en diagonale.

   Résultat mesuré avant correction : **3 grottes sur 4 dans CHAQUE acte**
   n'avaient aucun point de pose retombant sur leur propre case. Elles
   étaient inatteignables. Même cause pour la porte de Moreuil, collée au
   bord de la carte.

   On accepte donc une case de transition **voisine** dont le centre est à
   moins de 0,8 case. La demi-diagonale d'une case vaut 0,707 : le héros
   doit toucher la case, il ne la déclenche pas en passant à côté.
   ================================================================ */
function caseTransition(){
  const est=k=>(k===T_CAVE||k===T_STAIR||k===T_GATE);
  const t=tileAt(player.x,player.y);
  const ici=level.grid[idx(level.w,t.tx,t.ty)];
  if(est(ici))return{tx:t.tx,ty:t.ty,c:ici};
  let best=null,bd=TS*0.8;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;
    const X=t.tx+dx,Y=t.ty+dy;
    if(X<0||Y<0||X>=level.w||Y>=level.h)continue;
    const k=level.grid[idx(level.w,X,Y)];
    if(!est(k))continue;
    const d=dist(player.x,player.y,X*TS+TS/2,Y*TS+TS/2);
    if(d<bd){bd=d;best={tx:X,ty:Y,c:k};}
  }
  return best;
}
function travelCheck(){
  if(travelLock>0)return;
  const _t=caseTransition();if(!_t)return;
  const tx=_t.tx,ty=_t.ty,c=_t.c;
  /* La porte du village menait TOUJOURS à l'acte 1. Elle mène à l'acte le plus
     avancé qu'on ait atteint : à l'acte 2, elle ouvre sur la Glacière. */
  if(c===T_GATE&&level.kind==='village'){SFX.gate();enterAct(acteCourant());}
  else if(c===T_GATE&&level.kind==='act'){if(level.boss&&level.enemies.indexOf(level.boss)>=0){toast(t('trans.gardienBloque'),2.2);}
    else if(level.relic&&!level.relic.destroyed){toast('✦ '+RELICS[level.actNum||0].nom+' tient encore la porte close — détruis-la !',2.8);}
    else {SFX.gate();enterAct((level.actNum||0)+1);}}
  else if(c===T_CAVE&&level.kind==='act'){const e=(level.caves||[]).find(k=>k.tx===tx&&k.ty===ty);if(e)enterCave(e,level);}
  else if(c===T_STAIR&&level.kind==='cave'&&level.parent){const pl=level.parent;const sp=spotNear(pl.lvl,pl.tx,pl.ty);enterLevel(pl.lvl,sp.x,sp.y);toast('Retour à '+pl.lvl.name,1.6);}
}
function enterCave(entrance,parentLvl){
  if(!entrance.cave){const depth=parentLvl.depth||0;const clvl=parentLvl.aEnd||ACT_END[parentLvl.actNum||0]||10;
    entrance.cave=buildCave(depth,entrance.boss,clvl);}
  const cave=entrance.cave;cave.parent={lvl:parentLvl,tx:entrance.tx,ty:entrance.ty};
  if(typeof repliqueUnique==='function')repliqueUnique('premiere_grotte','aldric',
    "*L'air change en passant l'arche.* Ça descend. Et ça respire.");
  if(typeof signalerLieu==='function')signalerLieu('grotte');
  const sp=spotNear(cave,cave.stair[0],cave.stair[1]);enterLevel(cave,sp.x,sp.y);
  toast(entrance.boss?'🕳️ Repaire — un Gardien rôde…':'🕳️ Grotte de Cendre',2);
}
let portalBack=null;
function usePortal(){
  if(!village)return;
  if(level.kind==='village'){
    if(portalBack){const b=portalBack;portalBack=null;village.npcs=(village.npcs||[]).filter(function(n){return n.type!=='return';});
      enterLevel(b.lvl,b.x,b.y);toast(t('trans.retourCombat'),1.8);SFX.gate();}
    else toast(t('trans.aucunPortail'),1.2);return;}
  if((player.portals||0)<=0){toast(t('trans.pasDeParchemin'),2.4);return;}
  player.portals--;portalBack={lvl:level,x:player.x,y:player.y};
  const sp=village.spawn;let mx=sp[0]+2,my=sp[1];
  if(!walkableCode(village.grid[idx(village.w,mx,my)])){mx=sp[0];my=sp[1]+2;}
  village.npcs=(village.npcs||[]).filter(function(n){return n.type!=='return';});
  village.npcs.push({type:'return',name:'Portail de Retour',ico:'🌀',tx:mx,ty:my});
  enterLevel(village,sp[0]*TS+TS/2,sp[1]*TS+TS/2);
  toast('🌀 Portail ouvert — touche R ou parle au Portail 🌀 pour revenir',3);SFX.gate();refreshHud();
}

/* ---------------- MODE TEST (touches cachées F9 / F10) ---------------- */
function devKit(){
  for(let i=0;i<ACTS.length;i++)actDiscovered[i]=true;maxAct=ACTS.length-1;
  const target=35;
  if(player.lvl<target){const g=target-player.lvl;player.lvl=target;player.statPts+=5*g;player.treePts+=g;player.xp=0;player.xpNext=Math.round(40*Math.pow(player.lvl,1.5));}
  for(const s of ['weapon','armor','helm','gloves','belt','amulet','ring','ring2','skates']){
    const sl=(s==='ring2'?'ring':s);
    try{player.equip[s]=makeGear(sl,alea()<0.5?'unique':'rare',player.lvl);}catch(err){}
  }
  player.potions=10;player.manaPots=10;player.gold+=5000;player.frags+=200;
  const st=P();player.hp=st.hpMax;player.mp=st.mpMax;
  checkQuests();refreshHud();if(typeof renderInventory==='function')renderInventory();renderSkillBar();
  toast('🔧 MODE TEST — 5 actes débloqués · niveau '+player.lvl+' · équipement fourni. Balise 🔷 pour voyager, F10 près du boss.',5);
}
function devToBoss(){
  if(!level||level.kind!=='act'||!level.boss||level.enemies.indexOf(level.boss)<0){toast(t('test.aucunBoss'),1.6);return;}
  const b=level.boss;let px=b.x,py=b.y+70;
  if(!isWalkablePx(level,px,py)){px=b.x;py=b.y;}
  player.x=px;player.y=py;player.path=null;player.attackTarget=null;travelLock=0.4;
  cam.x=player.x-W/2;cam.y=player.y-H/2;
  toast('🔧 Téléporté au boss : '+(b.name||'?'),2.4);
}

/* ---------------- EFFECTS ---------------- */
const projectiles=[],floaters=[],particles=[];

/* LA COULEUR D'UN CHIFFRE DE DÉGÂTS, PAR ÉLÉMENT.

   Elle était en 09-entree-tactile.js, où seul `hitEnemy` s'en servait — et
   `fire` y était déclarée sans être employée nulle part : la couleur avait
   été posée d'avance, l'élément jamais écrit. La v9.54 met `fire` en service,
   ajoute `shock` et `venom`, et descend la table ici : la brûlure et le venin
   affichent leurs dégâts depuis 11-progression.js, qui ne peut pas importer
   de 09 puisque c'est 09 qui importe 11.

   Un élément sans couleur de chiffre est un élément que le joueur ne peut
   pas distinguer : `test_statuts.js` exige une entrée pour chacun. */
const DMG_COL={phys:'#ffd85e',cold:'#7fd0ff',holy:'#fff2a0',fire:'#ff9a4d',
               shock:'#c9a8ff',venom:'#9fe06a'};
function floatText(x,y,txt,col,big){floaters.push({x,y,txt,col,t:0,life:big?1.2:0.9,big});}
/* ── PARTICULES ──────────────────────────────────────────────────────────
   Toutes les gerbes du jeu sortaient de la même fonction et donnaient le même
   nuage de carrés de 4 px. Quatre champs facultatifs suffisent à les
   différencier, sans toucher aux appels existants qui gardent leurs valeurs
   par défaut :
     r     rayon en pixels          (défaut 2)
     g     gravité en px/s²         (défaut 0 — flotte)
     rot   vitesse de rotation      (défaut 0 — carré droit)
     forme 'carre' | 'eclat' | 'rond' | 'glace'   (défaut 'carre')
   ------------------------------------------------------------------------ */
function part(o){
  particles.push({x:o.x,y:o.y,vx:o.vx||0,vy:o.vy||0,t:0,life:o.life||0.5,
    col:o.col||'#fff',r:o.r||2,g:o.g||0,rot:o.rot||0,a:o.a||rand(0,6.28),
    forme:o.forme||'carre',fade:o.fade!=null?o.fade:1});
}
function burst(x,y,col,n,opt){
  opt=opt||{};
  for(let i=0;i<n;i++){const a=rand(0,6.28),s=rand(opt.vmin||1,opt.vmax||4);
    part({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(opt.tmin||.3,opt.tmax||.7),col,
      r:opt.r?rand(opt.r*0.6,opt.r*1.4):rand(1.4,2.6),g:opt.g||0,
      rot:opt.rot?rand(-opt.rot,opt.rot):0,forme:opt.forme});}
}
/* Étincelles qui retombent : poussière de charge, éclats de crosse. */
function gerbe(x,y,col,n,dir,ouverture,opt){
  opt=opt||{};
  for(let i=0;i<n;i++){const a=dir+rand(-ouverture,ouverture),s=rand(opt.vmin||2,opt.vmax||6);
    part({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(opt.tmin||.25,opt.tmax||.55),col,
      r:opt.r||rand(1,2.4),g:opt.g!=null?opt.g:220,rot:opt.rot||0,forme:opt.forme||'eclat',a:a});}
}

/* ---------------- SKILLS ---------------- */
const SKILL_ICON={slap:'skill_slap',charge:'skill_charge',whirl:'skill_whirl',tempest:'skill_tempest',holy:'skill_holy',warcry:'skill_warcry',multi:'skill_multi'};
function skillIco(k,size){const im=SKILL_ICON[k]&&MISC_ICON&&MISC_ICON[SKILL_ICON[k]];
  return im?('<img src="'+im+'" style="width:'+(size||28)+'px;height:'+(size||28)+'px;image-rendering:pixelated;vertical-align:middle">'):(SKILLS[k]?SKILLS[k].ico:'·');}
const SKILLS={
  slap:{ico:'💥',name:'Slap Shot',desc:'Tir puissant qui perce en ligne (physique).',manaBase:12,cdBase:1.2,type:'phys',arch:'Mêlée'},
  charge:{ico:'🌀',name:'Charge de l’Outlaw',desc:'Fonce vers le curseur et renverse les ennemis (physique).',manaBase:22,cdBase:3.4,type:'phys',arch:'Mêlée'},
  whirl:{ico:'🌪️',name:'Moulinet',desc:'Frappe tournoyante : touche tous les ennemis autour (physique).',manaBase:32,cdBase:2.8,type:'phys',arch:'Mêlée'},
  tempest:{ico:'❄️',name:'Tempête de Givre',desc:'Explosion de glace (froid), ralentit et gèle les ennemis.',manaBase:38,cdBase:5,type:'cold',arch:'Froid'},
  holy:{ico:'✨',name:'Palet Sacré',desc:'Palet béni (sacré) qui rebondit et transperce.',manaBase:27,cdBase:2.2,type:'holy',arch:'Distance'},
  multi:{ico:'🎯',name:'Triple Palet',desc:'Envoie 3 palets en éventail (physique).',manaBase:27,cdBase:2.4,type:'phys',arch:'Distance'},
  warcry:{ico:'📣',name:'Cri de Guerre',desc:'Galvanise : dégâts +50% et soin pendant quelques secondes.',manaBase:42,cdBase:9,type:'buff',arch:'Défense'}};
/* Trois tours de crosse. Le son du Moulinet dure 1,23 s : le geste le suit. */
const MOULINET_DUREE=1.0;
/* Un nœud d'arbre peut lever l'ancrage du Moulinet. On le CHERCHE au
   lieu d'écrire son identifiant en dur : déplacer le nœud dans l'arbre
   ne cassera rien. */
function moulinetMobile(){
  const t=player&&player.tree; if(!t)return false;
  for(const id in t){ if(t[id]&&TREE_NODES[id]&&TREE_NODES[id].mob==='whirl')return true; }
  return false;
}
const skillCd={slap:0,charge:0,tempest:0,holy:0,whirl:0,multi:0,warcry:0};
let activeSkill='slap';
function selectSkill(s){
  if(s!=='slap'&&player.skillRanks[s]<=0){toast(t('trans.sortVerrouille'),1.4);return;}
  activeSkill=s;renderSkillBar();}

/* ---------------- INPUT ---------------- */
const mouse={x:0,y:0};

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */
function setTravelLock(v){travelLock=v;}
function setActiveSkill(v){activeSkill=v;}

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */



