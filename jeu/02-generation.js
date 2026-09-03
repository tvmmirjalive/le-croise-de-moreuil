





/* ================================================================
   LA BESACE

   Deux manques : les gemmes, runes et charmes occupaient une case chacun
   alors qu'ils sont interchangeables par lot, et la besace ne s'agrandissait
   jamais — contrairement au coffre.

   Empilement : l'inventaire reste une LISTE PLATE d'objets, pour que tout le
   code existant continue de fonctionner. Ce qui change, c'est la façon de
   compter la place : des objets identiques partagent une case. Un tas ne
   consomme qu'un emplacement, quel que soit son effectif.
   ================================================================ */
let invCap=18;                       // sauvegardé
const INV_CAP_MAX=40;
const prixCaseBesace=cap=>Math.round(90*Math.pow(1.22,Math.max(0,cap-18)));
/* Seuls les objets sans identité propre s'empilent : gemmes, runes, charmes.
   Une arme a des affixes tirés au sort, deux exemplaires ne sont jamais
   équivalents — elles ne s'empilent donc jamais. */
function cleEmpilage(it){
  if(!it)return null;
  const empilable=(it.slot==='gem')||(it.slot==='charm')||it.charm;
  if(!empilable)return null;
  return [it.slot,it.kind||'',(it._base||it.name||''),(it.tier||1),(it.fuse||0),(it.plus||0)].join('|');
}
function groupesInventaire(){
  const g=[],map=new Map();
  for(const it of inventory){
    const k=cleEmpilage(it);
    if(k===null){g.push({cle:null,items:[it]});continue;}
    let e=map.get(k);
    if(!e){e={cle:k,items:[]};map.set(k,e);g.push(e);}
    e.items.push(it);
  }
  return g;
}
const placesUtilisees=()=>groupesInventaire().length;
/* « Le sac est-il plein POUR CET OBJET ? » — un objet qui rejoint un tas
   existant ne demande aucune case libre. */
function sacPlein(it){
  if(placesUtilisees()<invCap)return false;
  const k=cleEmpilage(it);
  if(k===null)return true;
  return !groupesInventaire().some(g=>g.cle===k);
}
const INV_MAX=18;   // conservé pour les anciens appels ; la vraie limite est invCap

/* ---------------- ENEMY TYPES ---------------- */
const ENEMY_TYPES={
  imp:{name:'Diablotin',r:12,hp:22,dmg:5,spd:1.5,xp:9,col:'#c23b3b',res:{holy:-25}},
  wraith:{name:'Spectre bleu',r:13,hp:34,dmg:8,spd:2.0,xp:16,col:'#3f7fd6',res:{cold:60,holy:-25}},
  brute:{name:"Brute d'os",r:18,hp:60,dmg:12,spd:1.0,xp:24,col:'#8a6b3a',res:{phys:30}},
  shade:{name:'Ombre rôdeuse',r:12,hp:26,dmg:9,spd:2.4,xp:14,col:'#7a4fb0',res:{cold:20,holy:-30}},
  golem:{name:'Golem de givre',r:22,hp:120,dmg:16,spd:0.8,xp:34,col:'#5a86b8',res:{phys:35,cold:65,holy:-20}}};

/* LES NOMS D'ENNEMIS, D'ACTES ET DE NIVEAUX.

   Même réduction que pour les objets (§40) : la clé se déduit du nom
   français. Ici la justification est plus simple encore — `NPC_KEY` est
   indexé par le nom de PNJ pour retrouver son portrait, et `en.name` sert à
   composer le nom d'élite. La donnée reste donc française.

   Les ennemis ne sont pas sauvegardés : aucune précaution de ce côté. */
function nomEnnemi(en){
  const n=(en&&en.name)||'';
  return n?tOu('ennemi.'+_cleObjet(n), n):'';
}
function nomActe(i,court){
  const a=ACTS[i]; if(!a)return '';
  return court?tOu('acte.lieu.'+i, a.court||a.name):tOu('acte.nom.'+i, a.name);
}
function nomRelique(i){ return tOu('acte.relique.'+i, ACT_SUB[i]||''); }
function nomNiveau(lvl){
  if(!lvl)return '';
  if(lvl.kind==='village')return tOu('niveau.village', lvl.name);
  if(lvl.kind==='act'&&lvl.actNum!=null)return nomActe(lvl.actNum,false);
  if(lvl.kind==='overworld')return tOu('niveau.plaines', lvl.name);
  if((lvl.depth||0)>=3)return tOu('niveau.abime', lvl.name);
  /* ⚠ LE NOM DE GROTTE PORTE SA PROFONDEUR : « Grotte de Cendre — profondeur 2 ».
     Réduit en clé, il en donnerait une par profondeur. On traduit la partie
     fixe et on recompose le suffixe. */
  return tOu('niveau.grotte','Grotte de Cendre')
       + ((lvl.depth||0)>1?t('niveau.profondeur',{n:lvl.depth}):'');
}
function nomPnj(npc){
  const n=(npc&&npc.name)||'';
  return n?tOu('pnj.'+_cleObjet(n), n):'';
}

/* ================================================================
   GÉNÉRATION PROCÉDURALE
   ================================================================ */
function idx(w,x,y){return y*w+x;}
function neighborsWall(grid,w,h,x,y){
  let c=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(dx===0&&dy===0)continue;const nx=x+dx,ny=y+dy;
    if(nx<0||ny<0||nx>=w||ny>=h){c++;continue;}
    if(grid[idx(w,nx,ny)]===T_WALL)c++;}
  return c;}
function cellular(grid,w,h,steps){
  for(let s=0;s<steps;s++){
    const ng=grid.slice();
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const n=neighborsWall(grid,w,h,x,y);
      if(x===0||y===0||x===w-1||y===h-1){ng[idx(w,x,y)]=T_WALL;continue;}
      ng[idx(w,x,y)]=n>=5?T_WALL:T_FLOOR;}
    grid.set(ng);}
}
function largestRegion(grid,w,h,blockCodes){
  const seen=new Uint8Array(w*h);let best=[];
  const isBlock=c=>blockCodes.includes(c);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=idx(w,x,y);if(seen[i]||isBlock(grid[i]))continue;
    const stack=[[x,y]];const reg=[];seen[i]=1;
    while(stack.length){const[cx,cy]=stack.pop();reg.push([cx,cy]);
      for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;
        const j=idx(w,nx,ny);if(seen[j]||isBlock(grid[j]))continue;seen[j]=1;stack.push([nx,ny]);}}
    if(reg.length>best.length)best=reg;}
  return best;
}
function carveRavines(grid,w,h,count){
  for(let k=0;k<count;k++){
    let x=randi(6,w-6),y=randi(6,h-6);let ang=rand(0,6.28);const len=randi(18,44);
    for(let s=0;s<len;s++){
      ang+=rand(-0.4,0.4);
      x=clamp(Math.round(x+Math.cos(ang)),2,w-3);
      y=clamp(Math.round(y+Math.sin(ang)),2,h-3);
      for(let dy=0;dy<=randi(0,1);dy++)for(let dx=0;dx<=randi(0,1);dx++){
        const gx=clamp(x+dx,1,w-2),gy=clamp(y+dy,1,h-2);
        if(grid[idx(w,gx,gy)]===T_FLOOR)grid[idx(w,gx,gy)]=T_CHASM;}
    }
  }
}

let levelSeq=1;
function genLevel(kind,depth){
  const w=kind==='overworld'?70:52, h=kind==='overworld'?52:44;
  const grid=new Uint8Array(w*h);
  const fill=kind==='overworld'?0.42:0.46;
  for(let i=0;i<w*h;i++)grid[i]=alea()<fill?T_WALL:T_FLOOR;
  cellular(grid,w,h,kind==='overworld'?4:5);
  // keep largest floor region, fill rest with wall
  const reg=largestRegion(grid,w,h,[T_WALL,T_CHASM]);
  const keep=new Uint8Array(w*h);for(const[x,y]of reg)keep[idx(w,x,y)]=1;
  for(let i=0;i<w*h;i++)if(!keep[i]&&grid[i]!==T_WALL)grid[i]=T_WALL;
  if(kind==='overworld')carveRavines(grid,w,h,5);

  const lvl={id:levelSeq++,kind,depth:depth||0,w,h,grid,
    enemies:[],drops:[],entrances:[],seen:new Uint8Array(w*h),
    name:kind==='overworld'?'Plaines de Cendre':(depth>=3?"L'Abîme":'Grotte de Cendre'+(depth>1?' — profondeur '+depth:'')),
    spawn:null,stair:null};

  // floor tiles list
  const floors=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)
    if(grid[idx(w,x,y)]===T_FLOOR)floors.push([x,y]);
  // spawn = a floor tile; for overworld center-ish, for cave near an edge
  /* Ce point porte AUSSI l'escalier de sortie (voir buildCave). Le tirer
     parmi les seules cases TENABLES évite une sortie posée là où le héros ne
     peut pas se rendre — 15 % des grottes avant cette correction. */
  const _tenables=floors.filter(function(c){return poseObjetOk(lvl,c[0],c[1]);});
  lvl.spawn=pick(_tenables.length?_tenables:floors);
  return {lvl,floors};
}

/* place cave entrances on overworld */
function buildOverworld(){
  const {lvl,floors}=genLevel('overworld',0);
  // choose entrances far from spawn
  const sp=lvl.spawn;
  const far=floors.filter(([x,y])=>dist(x,y,sp[0],sp[1])>14);
  const nEnt=4;
  const chosen=[];
  for(let i=0;i<nEnt&&far.length;i++){
    let bestIdx=randi(0,far.length-1);
    const[tx,ty]=far.splice(bestIdx,1)[0];
    lvl.grid[idx(lvl.w,tx,ty)]=T_CAVE;
    const boss=(i===nEnt-1); // dernière = repaire du boss
    chosen.push({tx,ty,caveId:null,boss,depth:boss?3:1});
    // remove nearby to spread out
  }
  lvl.entrances=chosen;
  // portail retour vers le village, près du spawn
  const nearSp=floors.filter(([x,y])=>dist(x,y,sp[0],sp[1])>2&&dist(x,y,sp[0],sp[1])<6);
  const gt=nearSp.length?pick(nearSp):sp;
  lvl.grid[idx(lvl.w,gt[0],gt[1])]=T_GATE;lvl.gate={tx:gt[0],ty:gt[1]};
  // scatter enemies on overworld (loin du spawn/portail)
  scatterEnemies(lvl,floors.filter(([x,y])=>dist(x,y,sp[0],sp[1])>8),10,0);
  return lvl;
}
/* ---------------- VILLAGE (hub avec vendeurs) ---------------- */
let village=null;
function buildVillage(){
  /* 24x23 : le village occupe y=0..17, une allée de sortie descend ensuite
     jusqu'à la porte. On voit où l'on va au lieu de marcher sur une dalle invisible. */
  const w=24,h=23,VY=17;const grid=new Uint8Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)grid[idx(w,x,y)]=T_WALL;
  for(let y=1;y<VY;y++)for(let x=1;x<w-1;x++)grid[idx(w,x,y)]=T_FLOOR;
  // l'allée : 2 cases de large, bordée de murs, de la brèche du rempart à la porte
  const AX0=11,AX1=12,AY0=VY-1,AY1=h-3;
  for(let y=AY0;y<=AY1;y++){grid[idx(w,AX0,y)]=T_FLOOR;grid[idx(w,AX1,y)]=T_FLOOR;}
  // maisonnettes décoratives (murs)
  const houses=[[3,3],[4,3],[3,4],[4,4],[19,3],[20,3],[19,4],[20,4],
    [3,13],[4,13],[3,14],[4,14],[19,13],[20,13],[19,14],[20,14]];
  for(const[hx,hy]of houses)grid[idx(w,hx,hy)]=T_WALL;
  // la porte ferme le fond de l'allée, sur les deux cases de large
  const gate={tx:AX1,ty:AY1};
  grid[idx(w,AX0,AY1)]=T_GATE;grid[idx(w,AX1,AY1)]=T_GATE;
  const lvl={id:levelSeq++,kind:'village',depth:0,theme:'town',w,h,grid,enemies:[],drops:[],
    entrances:[],seen:new Uint8Array(w*h).fill(1),name:'Village de Moreuil',
    spawn:[12,9],stair:null,gate,alley:{x0:AX0,x1:AX1,y0:AY0,y1:AY1},
    npcs:[
      {type:'merchant',name:'Garrek le Marchand',ico:'🛒',tx:7,ty:6},
      {type:'smith',name:'Bruna la Forgeronne',ico:'🔨',tx:16,ty:6},
      {type:'waypoint',name:'Balise de Moreuil',ico:'🔷',tx:12,ty:12},
      {type:'quest',act:-1,name:'Le Vieux Outlaw',ico:'🦅',tx:9,ty:9},
      {type:'stash',name:'Coffre de Moreuil',ico:'🧰',tx:12,ty:3},
      {type:'arena',name:'Portail de l\u2019Ar\u00e8ne',ico:'\ud83d\udd25',tx:5,ty:13,vert:true},
      {type:'arenamaster',act:'arena',name:'Anselme \u00ab la Cage \u00bb',ico:'\ud83c\udfc6',tx:7,ty:12}
    ]};
  lvl.portalCube={X:5,Y:13};   // le cube de mur F14 est retiré : le portail prend sa place
  // décor : chemins de terre (2 cases) + losange central, en texture "terre" (dual-grid)
  lvl.deco=new Uint8Array(w*h);
  const _dm=(px,py)=>{if(px>=1&&py>=1&&px<w-1&&py<h-1&&(grid[idx(w,px,py)]===T_FLOOR||grid[idx(w,px,py)]===T_GATE))lvl.deco[idx(w,px,py)]=1;};
  for(let y=2;y<=AY1;y++){_dm(11,y);_dm(12,y);}         // l'allée prolonge le chemin central
  for(let x=6;x<=17;x++){_dm(x,6);_dm(x,7);}            // traverse marchand<->forgeronne
  {const cx=12,cy=9,R=3;for(let a=-R;a<=R;a++){const b=R-Math.abs(a);_dm(cx+a,cy+b);_dm(cx+a,cy-b);}} // losange central
  // losange devant chaque PNJ + anneau autour de la balise
  const _diamond=(cx,cy,R)=>{for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++)if(Math.abs(dx)+Math.abs(dy)<=R)_dm(cx+dx,cy+dy);};
  const _ring=(cx,cy,R)=>{for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++)if(Math.abs(dx)+Math.abs(dy)===R)_dm(cx+dx,cy+dy);};
  for(const np of lvl.npcs){ if(np.type==='waypoint')_ring(np.tx,np.ty,2); else _diamond(np.tx,np.ty+1,1); }
  return lvl;
}
/* ================================================================
   5 ACTES DE MOREUIL — cartes labyrinthiques thématisées
   ================================================================ */
const THEME={
 pool:{wall:['#1d6289','#134761'],floor:['#14455f','#0f3448']},
 ice:{wall:['#6f93b5','#51738f'],floor:['#4a6d8a','#3d5c75']},
 wood:{wall:['#4a3d1e','#332a14'],floor:['#2c3a1e','#233016']},
 church:{wall:['#4f4368','#38304c'],floor:['#2e2740','#241e33']},
 gym:{wall:['#5e3030','#421f1f'],floor:['#2b4a3a','#223d30']}
};
const ACTS=[
 {name:'Piscine de Moreuil',court:'la Piscine',theme:'pool',depth:0},
 {name:'La Glacière',court:'la Glacière',theme:'ice',depth:1},
 {name:'Bois de Moreuil',court:'le Bois',theme:'wood',depth:2},
 {name:'Église Saint-Vaast',court:'l’Église',theme:'church',depth:3},
 {name:'Gymnase du Collège',court:'le Gymnase',theme:'gym',depth:4,boss:true}
];
const ACT_SUB=['Le Sifflet du Pacte','La Rondelle Maudite','La Médaille de 1918','Le Calice Profané','La Coupe Maudite'];
const ACT_DIM=[[500,360],[380,470],[650,280],[200,760],[450,450]];
const ACT_BOSSES=[
 {name:'Le Maître-Nageur Noyé', bkind:'swimmer', col:'#2f8fbf', wcol:'rgba(47,143,191,0.32)', hp:320, dmg:14, xp:260, res:{phys:15,holy:-25}},
 {name:'Givre-Cœur, Gardien de Glace', bkind:'iceheart', col:'#5ac8e0', wcol:'rgba(90,200,224,0.32)', hp:480, dmg:18, xp:410, res:{cold:70,phys:20,holy:-25}},
 {name:"L'Ancien des Bois", bkind:'ent', col:'#5a8f3a', wcol:'rgba(90,143,58,0.32)', hp:680, dmg:22, xp:660, res:{phys:30,holy:-20}},
 {name:'Séraphin Corrompu', bkind:'seraphin', col:'#d98a3d', wcol:'rgba(217,138,61,0.32)', hp:900, dmg:26, xp:950, res:{phys:20,cold:20,holy:-30}}
];
// Niveaux attendus (mode Normal, run ~35% d'ennemis tués par acte)
/* NIVEAU MINIMUM POUR ENTRER DANS UN ACTE.

   Les ennemis montent déjà au niveau du joueur quand il est en avance
   (`_over`), mais rien n'empêchait d'entrer très en RETARD : un niveau 15 dans
   l'acte 3, prévu pour 20-26. Il y affronte des mobs de son niveau ou presque,
   avec l'équipement de l'acte précédent — et surtout, il saute la courbe de
   progression. Un plancher par acte, volontairement 2 niveaux SOUS le niveau
   d'entrée : on peut arriver un peu tôt, pas avec cinq niveaux de retard. */
/* Réglages de la courbe des ennemis — voir makeEnemy. */
/* Calibrés numériquement : on balaie 4 000 combinaisons et on garde celle qui
   rapproche le plus le temps de mise à mort de 2 s et les coups encaissés de
   10, sur les dix points de mesure — les entrées d'acte comptant double, c'est
   là que le joueur arrive avec l'équipement de l'acte précédent. */
/* COURBE DES ENNEMIS — recalibrée en v9.32 sur la puissance d'objet par
   bande. Les exposants et le multiplicateur sont AJUSTÉS SUR UNE MESURE, pas
   choisis : le DPS joué a été relevé à chaque entrée et fin d'acte, puis la
   courbe passée au moindre carré sur le logarithme.

   Ils montent beaucoup — 1,165 → 1,21 en dessous du calibrage, 1,098 → 1,36
   au-dessus — parce que le héros lui-même monte beaucoup plus : sa puissance
   d'objet varie désormais comme 1,374 par bande de trois niveaux, et son DPS
   comme le CARRÉ de ce facteur. */
let EN_HP_EXP=1.235, EN_HP_MUL=0.95, EN_DMG_EXP=1.105, EN_DMG_MUL=5.2;
/* VALEUR D'UN ENNEMI EN EXPÉRIENCE — recalée le 28 août 2026.

   La formule précédente, `t.xp*(1+profondeur*0,4)*xm`, faisait dépendre la
   récompense de l'ACTE et non du NIVEAU. Comme `_over` relève les ennemis au
   niveau du héros sans toucher à leur valeur, un héros en avance affrontait
   des monstres plus durs pour exactement le même gain — et l'XP nette
   DÉCROISSAIT d'acte en acte en Normal, de 3 810 à 1 783. Résultat mesuré :
   la campagne entière, trois modes et tous les ennemis tués, plafonnait le
   héros au niveau 39 pour un plafond fixé à 60. Il manquait un facteur 2,8.

   La valeur suit maintenant le niveau réel de l'ennemi. `t.xp/XP_REF` ne
   porte plus que la saveur du type — un golem vaut toujours près de quatre
   diablotins — et `XP_REF` est la moyenne mesurée de `t.xp`.

   L'EXPOSANT EST VOLONTAIREMENT INFÉRIEUR À CELUI DU COÛT D'UN NIVEAU
   (0,74 contre 1,5) : c'est lui qui ralentit la montée. Un simple facteur
   global, essayé d'abord, ne pouvait pas satisfaire les deux bornes à la
   fois — il donnait le niveau 60 dès l'acte 2 de Cauchemar.

   Les deux nombres sont issus d'une recherche sur 1 600 couples, chacun
   simulé sur les quinze actes ; voir Etude_parangon.md §4. */
const XP_BASE=10.85, XP_EXPO=0.74, XP_REF=19;

/* LA COURBE DES ENNEMIS EST CALIBRÉE POUR LA CAMPAGNE, QUI FINIT À 38.

   Elle a été posée en 8.54 et `test_courbe` la surveille depuis : sur la
   plage 1-38, elle est juste, et on n'y touche pas. Mais `_over` la prolonge
   jusqu'au plafond de 60, VINGT-DEUX NIVEAUX HORS DE SA PLAGE DE CALIBRAGE,
   et là elle décroche. Mesuré le 29 août 2026, sur un héros complet à chaque
   niveau — points de caractéristique, arbre, équipement rare de son niveau :

     héros    DPS RÉELLEMENT DÉLIVRÉ ×1,0626 par niveau · PV ×1,052
     ennemi   PV ×1,1650 · dégâts ×1,105

   ⚠ CE CHIFFRE A ÉTÉ CORRIGÉ DEUX FOIS, ET LA SECONDE FOIS EST LA BONNE.

   La première mesure calculait le DPS : dégâts moyens × chance critique ÷
   cadence. Elle donnait ×1,058 et plaçait la cassure au niveau 38. Elle
   ignorait les RÉSISTANCES (une brute d'os encaisse 30 % de physique en
   moins), les déplacements, et les temps de replacement entre deux coups.

   La seconde mesure JOUE : un mannequin sans dégâts, la boucle du jeu à
   60 im/s pendant huit secondes, et on compte les dégâts réellement posés.
   Elle donne ×1,0626 — et surtout elle montre que la bande de 1 à 2 secondes
   ne tient que jusqu'au niveau VINGT-DEUX :

     niveau  10  16  22  28  34  40  60
     TTK     1,1 1,9 1,9 4,2 8,0 11,2 16,0  secondes

   `test_courbe` annonçait 0,97 à 2,05 s aux entrées d'acte parce qu'il
   calculait, lui aussi. Il surestimait le DPS d'un facteur sept.

   C'EST LA CAUSE PROFONDE DE L'ENFER INJOUABLE, et elle n'était pas celle
   qu'on croyait. On accusait `_over` de tenir les ennemis six niveaux
   au-dessus du héros ; l'écart de niveau n'est que le déclencheur. Le vrai
   défaut est qu'au-delà de 38 les deux courbes ne se répondent plus, et six
   niveaux d'écart y coûtent alors ×2,6 au lieu de ×1,4.

   On garde donc la courbe telle quelle sous 38, et on aligne l'exposant sur
   celui du héros au-dessus. Les multiplicateurs de mode (`dm`) restent seuls
   à porter l'identité de Cauchemar et d'Enfer. */
const EN_NIV_CALIBRE=22, EN_HP_EXP_HAUT=1.205, EN_DMG_EXP_HAUT=1.12;
const EN_BOSS_HP_EXP=1.115, EN_BOSS_DMG_EXP=1.07;
function facteurCourbe(expBas,expHaut,L){
  const n=Math.max(1,L||1);
  if(n<=EN_NIV_CALIBRE)return Math.pow(expBas,n-1);
  return Math.pow(expBas,EN_NIV_CALIBRE-1)*Math.pow(expHaut,n-EN_NIV_CALIBRE);
}
/* ADOUCISSEMENT DU DÉBUT DE PARTIE — 8.65

   La courbe de la 8.54 a été calibrée sur un personnage « équipé de la
   rareté attendue à ce stade ». C'est vrai à partir de l'acte 2. Ce n'est
   JAMAIS vrai dans les premières minutes : on sort de Moreuil avec une
   crosse blanche et rien d'autre.

   Mesuré sans équipement, avant correction : un diablotin demandait 2,9 s
   au niveau 1, une brute 7,8 s, et une ombre rôdeuse tuait le héros en
   cinq coups. La cible est 1,5 à 2,5 s et 8 à 12 coups.

   On applique donc un coefficient qui part bas au niveau 1 et rejoint 1
   au niveau `EN_DEBUT_NIV`. Il ne touche RIEN au-delà : la courbe calibrée
   reste intacte à partir de l'acte 2. */
let EN_DEBUT_NIV=14, EN_DEBUT_HP=0.50, EN_DEBUT_DMG=0.72;
function douceurDebut(L,base){
  if(!(L>1))return base;
  if(L>=EN_DEBUT_NIV)return 1;
  return base+(1-base)*((L-1)/(EN_DEBUT_NIV-1));
}
function setDebut(niv,hp,dmg){EN_DEBUT_NIV=niv;EN_DEBUT_HP=hp;EN_DEBUT_DMG=dmg;}
function setCourbe(he,hm,de,dm){EN_HP_EXP=he;EN_HP_MUL=hm;EN_DMG_EXP=de;EN_DMG_MUL=dm;}
/* ================================================================
   RÉGIONS  —  un acte n'est plus un seul décor uniforme

   Le générateur produit un tronc et des branches, et jusqu'ici tout le niveau
   partageait la même teinte, le même décor et le même peuplement : vingt
   minutes rigoureusement identiques.

   On découpe désormais chaque acte en trois à cinq RÉGIONS, tirées parmi des
   profils. Une région porte six réglages : une teinte, un jeu de décors, une
   densité, un rayon de lumière, un penchant d'ennemis, et parfois une ANOMALIE
   de terrain.

   Le découpage est un Voronoï : quelques germes espacés, chaque case appartient
   au germe le plus proche. C'est instantané, ça ne touche NI la forme du
   niveau, NI sa connexité, NI la pose des coffres.

   La teinte ne coûte rien à l'affichage : le sol est mis en cache par dalles
   depuis la 8.51, donc elle est appliquée UNE FOIS par dalle, pas soixante fois
   par seconde.
   ================================================================ */

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */
function setInvCap(v){invCap=v;}
function prochainLevelSeq(){return levelSeq++;}
function setLevelSeq(v){levelSeq=v;}
function setVillage(v){village=v;}

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */

/* Aides de TEST, rendues à leur propriétaire.                     (Phase 5)
   Elles vivaient dans un autre module que la variable qu'elles écrivent —
   ce qu'une portée globale unique autorisait sans le dire. */
function getInvCap(){return invCap;}



