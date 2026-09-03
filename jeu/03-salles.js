
















/* ================================================================
   LES SALLES DES PILIERS  —  cinq par acte, vingt-cinq en tout

   Les régions disent dans quelle AMBIANCE on est. Elles ne disent pas OÙ.
   Une carte générée n'offre aucun point de repère : tous les couloirs se
   ressemblent, et dans le menu de téléportation les cinq balises d'un acte
   sont interchangeables — « Balise 3 (60 %) » ne veut rien dire.

   Chaque pilier reçoit donc une SALLE : une forme creusée à la main, un décor
   disposé, une teinte propre et un NOM. Ce nom remonte jusqu'au menu des
   balises. « La Chambre Froide », ça se retient ; « Balise 3 », non.

   Règle de sûreté : une salle ne fait qu'AJOUTER du sol. On ne referme jamais
   un passage, donc la connexité du niveau ne peut pas se dégrader. Les cases
   spéciales — portail, escalier, bouche de grotte — sont épargnées.
   ================================================================ */
const SALLE_FORMES={
  /* Chaque forme rend la liste des décalages de cases à creuser. */
  ronde:   r=>{const o=[];for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r)o.push([x,y]);return o;},
  losange: r=>{const o=[];for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(Math.abs(x)+Math.abs(y)<=r)o.push([x,y]);return o;},
  croix:   r=>{const o=[],b=Math.max(1,(r/2)|0);
    for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(Math.abs(x)<=b||Math.abs(y)<=b)o.push([x,y]);return o;},
  /* La nef était longue mais large de 7 cases seulement : trop étroite pour
     faire salle. Le petit côté ne descend plus sous 11 cases. */
  nef:     r=>{const o=[],L=r+3,W=Math.max(5,(r*0.7)|0);
    for(let y=-W;y<=W;y++)for(let x=-L;x<=L;x++)o.push([x,y]);return o;},
  anneau:  r=>{const o=[];for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const d=x*x+y*y;
    if(d<=r*r&&d>=(r-2)*(r-2))o.push([x,y]);}
    for(let y=-1;y<=1;y++)for(let x=-r;x<=r;x++)o.push([x,y]);        // deux allées
    for(let x=-1;x<=1;x++)for(let y=-r;y<=r;y++)o.push([x,y]);return o;},
  carree:  r=>{const o=[];for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)o.push([x,y]);return o;}
};
/* Cinq salles par acte : nom, forme, rayon, teinte, disposition du décor. */
const SALLES_PAR_ACTE=[
 [ {nom:'Le Petit Bain',        f:'ronde',  r:6, t:'rgba(60,150,190,0.20)', d:'anneau'},
   {nom:'Les Vestiaires Noyés', f:'carree', r:6, t:'rgba(40,70,110,0.26)',  d:'murs'},
   {nom:'Le Grand Plongeoir',   f:'croix',  r:6, t:'rgba(90,180,210,0.18)', d:'centre'},
   {nom:'Le Pédiluve',          f:'losange',r:6, t:'rgba(50,120,140,0.22)', d:'anneau'},
   {nom:'Le Bassin Olympique',  f:'anneau', r:8, t:'rgba(30,90,150,0.24)',  d:'murs'} ],
 [ {nom:'La Chambre Froide',    f:'carree', r:6, t:'rgba(150,200,255,0.22)',d:'murs'},
   {nom:'Le Puits de Givre',    f:'ronde',  r:6, t:'rgba(110,180,240,0.24)',d:'centre'},
   {nom:'La Galerie des Échos', f:'nef',    r:6, t:'rgba(70,120,190,0.26)', d:'allee'},
   {nom:'Le Cœur Gelé',         f:'anneau', r:7, t:'rgba(170,220,255,0.20)',d:'anneau'},
   {nom:'La Crevasse',          f:'croix',  r:6, t:'rgba(40,70,120,0.30)',  d:'centre'} ],
 [ {nom:'La Tranchée aux Croix',f:'nef',    r:7, t:'rgba(110,100,70,0.24)', d:'allee'},
   {nom:'La Clairière Muette',  f:'ronde',  r:6, t:'rgba(90,130,70,0.20)',  d:'anneau'},
   {nom:'Le Poste Éventré',     f:'carree', r:6, t:'rgba(80,70,50,0.26)',   d:'murs'},
   {nom:'Les Racines Mortes',   f:'losange',r:6, t:'rgba(60,80,50,0.24)',   d:'centre'},
   {nom:'Le Cimetière de 1918', f:'anneau', r:8, t:'rgba(70,70,80,0.26)',   d:'anneau'} ],
 [ {nom:'Le Porche Brisé',      f:'carree', r:6, t:'rgba(120,110,140,0.22)',d:'murs'},
   {nom:'La Nef Corrompue',     f:'nef',    r:8, t:'rgba(90,80,120,0.24)',  d:'allee'},
   {nom:'Le Confessionnal',     f:'ronde',  r:4, t:'rgba(60,50,90,0.30)',   d:'centre'},
   {nom:'La Crypte',            f:'croix',  r:6, t:'rgba(40,35,60,0.32)',   d:'murs'},
   {nom:'Le Chœur de Feu Bleu', f:'anneau', r:8, t:'rgba(80,120,190,0.24)', d:'anneau'} ],
 [ {nom:'Le Local Matériel',    f:'carree', r:6, t:'rgba(130,90,80,0.22)',  d:'murs'},
   {nom:'Les Gradins',          f:'nef',    r:7, t:'rgba(150,80,70,0.20)',  d:'allee'},
   {nom:'Le Rond Central',      f:'ronde',  r:7, t:'rgba(60,120,180,0.22)', d:'anneau'},
   {nom:'La Buvette',           f:'losange',r:5, t:'rgba(140,110,60,0.24)', d:'centre'},
   {nom:'Le Banc des Outlaws',  f:'anneau', r:8, t:'rgba(120,60,60,0.26)',  d:'anneau'} ]
];
/* Le nom d'une salle, traduit. Il n'atteint le joueur que par le menu des
   balises — mais c'est là qu'il sert à s'orienter, donc il compte.

   ⚠ LES NOMS D'ANOMALIE, EUX, NE SONT AFFICHÉS NULLE PART : `ANOMALIES` ne
   sert qu'à `spd` et `dot`. Vérifié avant de les traduire — quatre chaînes
   que l'inventaire recensait et que personne ne lit. */
function nomSalle(nom){ return nom?tOu('salle.'+_cleObjet(nom), nom):''; }

const ANOMALIES={
  glisse:  {nom:'Glace vive',   spd:1.35, dot:0,    col:'#bfe8ff'},
  gravats: {nom:'Éboulis',      spd:0.62, dot:0,    col:'#c9b79a'},
  morsure: {nom:'Froid mordant',spd:0.9,  dot:0.9,  col:'#9fd8ff'},
  braise:  {nom:'Braises',      spd:1.0,  dot:1.6,  col:'#ff9a5a'}
};
const REGION_PROFILS=[
  {id:'coeur',   teinte:null,                 densite:1.0, vision:7, penchant:null,     anomalie:null},
  {id:'sombre',  teinte:'rgba(10,14,34,0.34)',densite:0.7, vision:5, penchant:'wraith', anomalie:null},
  {id:'nid',     teinte:'rgba(70,20,30,0.20)',densite:1.5, vision:7, penchant:'imp',    anomalie:null},
  {id:'ruine',   teinte:'rgba(120,96,60,0.22)',densite:1.3,vision:6, penchant:'brute',  anomalie:'gravats'},
  {id:'gel',     teinte:'rgba(120,190,255,0.24)',densite:0.8,vision:8,penchant:'wraith',anomalie:'glisse'},
  {id:'malsain', teinte:'rgba(90,40,120,0.24)',densite:1.1,vision:6, penchant:'shade',  anomalie:'morsure'},
  {id:'brasier', teinte:'rgba(150,60,20,0.22)',densite:1.0,vision:7, penchant:'golem',  anomalie:'braise'}
];
/* UNE RÉGION PAR PILIER.

   Le découpage était au hasard : l'ambiance changeait au milieu d'un couloir,
   sans raison lisible. Les germes sont désormais les CINQ PILIERS de l'acte,
   dans l'ordre de progression. Chaque région commence donc là où l'on arrive,
   et sa salle en est le cœur concentré : on entre dans « La Chambre Froide »,
   et tout le secteur autour d'elle porte la même couleur.

   Le premier profil est toujours « coeur » : l'acte s'ouvre sur son décor de
   référence, sinon on perd son identité dès le premier pas. */
const REGIONS_PAR_ACTE=[
  ['coeur','nid','malsain','nid','brasier'],      // Piscine
  ['coeur','gel','sombre','gel','malsain'],       // Glacière
  ['coeur','ruine','sombre','nid','ruine'],       // Bois
  ['coeur','sombre','malsain','ruine','sombre'],  // Église
  ['coeur','brasier','ruine','nid','brasier']     // Gymnase
];
/* Découpe le niveau en régions. `lvl.region` donne l'indice de profil par case,
   `lvl.regions` la liste des profils utilisés. */
/* LES SEUILS SONT LA PROGRESSION RÉELLE DES PILIERS.

   Prendre les valeurs théoriques (0, 30 %, 60 %…) ne suffit pas : un pilier
   est posé sur la case de SOL la plus proche du point visé, et cette case
   peut mesurer 29,9 % au lieu de 30. Le pilier tombait alors dans la région
   précédente — mesuré : un à deux piliers par acte. On lit donc leur
   avancement réel, et on retranche un cheveu pour que la case du pilier
   appartienne bien à la région qu'elle ouvre.

   Les avancements lus doivent être CROISSANTS : un pilier posé en retrait
   donnerait des seuils dans le désordre, et des régions entrelacées. Dans ce
   cas on garde les valeurs théoriques. */
function _regionsSeuilsReels(germes, profils, seuils, progAt){
  const S=seuils.slice(0,profils.length);
  if(germes.length!==profils.length)return S;
  const reels=germes.map(g=>progAt(g[0],g[1]));
  for(let i=1;i<reels.length;i++) if(reels[i]<reels[i-1])return S;
  return reels.map((v,i)=>i===0?0:Math.max(0,v-1e-6));
}

/* ================================================================
   DÉCOUPAGE LE LONG DE LA PROGRESSION, pas par distance.

   Premier essai : un Voronoï sur les piliers. Erreur — la région d'un pilier
   s'étendait AUSSI EN AMONT de lui, donc l'ambiance changeait avant qu'on
   arrive. Ce n'est pas ce qui était demandé.

   Une région court désormais d'un pilier AU SUIVANT le long du tronc :
   `progAt` donne l'avancement d'une case sur le chemin principal, et les
   seuils sont les avancements des piliers eux-mêmes. On franchit un pilier,
   l'ambiance bascule — et pas une case avant.
   ================================================================ */
function _regionsParProgression(lvl, progAt, S){
  const w=lvl.w,h=lvl.h;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const pr=progAt(x,y);
    let k=0; for(let i=0;i<S.length;i++) if(pr>=S[i]) k=i;
    lvl.region[idx(w,x,y)]=k;
  }
  lvl.seuils=S;
}

/* Repli : sans mesure de progression, on retombe sur la distance — le Voronoï
   des débuts, avec son défaut d'ambiance en amont. Mieux que rien. */
function _regionsParDistance(lvl, germes){
  const w=lvl.w,h=lvl.h;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let bi=0,bd=Infinity;
    for(let i=0;i<germes.length;i++){
      const d=(x-germes[i][0])**2+(y-germes[i][1])**2;
      if(d<bd){bd=d;bi=i;}
    }
    lvl.region[idx(w,x,y)]=bi;
  }
}

/* Les profils d'ambiance de l'acte, ramenés au nombre de piliers : ni plus —
   une région sans pilier n'a pas de porte d'entrée — ni moins, quitte à
   répéter le dernier profil. */
function _regionsProfils(acte, nbGermes){
  const noms=REGIONS_PAR_ACTE[Math.max(0,Math.min(4,acte))]||['coeur'];
  const profils=noms.map(n=>REGION_PROFILS.find(p=>p.id===n)||REGION_PROFILS[0]);
  if(nbGermes<0)return profils;
  while(profils.length<Math.max(2,nbGermes))profils.push(profils[profils.length-1]);
  if(nbGermes)profils.length=nbGermes;
  return profils;
}

function decouperRegions(lvl,acte,rf,progAt,seuils){
  lvl.regions=_regionsProfils(acte,-1);
  lvl.region=new Uint8Array(lvl.w*lvl.h);
  if(!rf||rf.length<20||lvl.regions.length<2)return;
  const bal=(lvl.npcs||[]).filter(x=>x.type==='waypoint').sort((a,b)=>(a.bi||0)-(b.bi||0));
  const germes=bal.map(b=>[b.tx,b.ty]);
  const profils=_regionsProfils(acte,germes.length);
  lvl.regions=profils;
  lvl.germes=germes;
  if(typeof progAt==='function'&&seuils&&seuils.length){
    _regionsParProgression(lvl,progAt,_regionsSeuilsReels(germes,profils,seuils,progAt));
    return;
  }
  if(!germes.length)return;
  _regionsParDistance(lvl,germes);
}
/* Creuse une salle autour d'un pilier. N'AJOUTE que du sol : la connexité du
   niveau ne peut donc pas s'en trouver dégradée. */
/* Dix cases de large au minimum : en dessous, une salle ne se distingue pas
   d'un élargissement de couloir et ne fait pas repère. */
const SALLE_R_MIN=5;
function poserSalle(lvl,tx,ty,def,indice){
  const w=lvl.w,h=lvl.h;
  const r=Math.max(SALLE_R_MIN,def.r||5);
  const forme=(SALLE_FORMES[def.f]||SALLE_FORMES.ronde)(r);
  if(!lvl.salle)lvl.salle=new Int8Array(w*h).fill(-1);
  if(!lvl.salles)lvl.salles=[];
  let n=0;
  for(const [dx,dy] of forme){
    const x=tx+dx, y=ty+dy;
    if(x<2||y<2||x>=w-2||y>=h-2)continue;
    const i=idx(w,x,y), c=lvl.grid[i];
    /* on épargne portail, escalier et bouche de grotte */
    if(c===T_GATE||c===T_STAIR||c===T_CAVE){lvl.salle[i]=indice;continue;}
    lvl.grid[i]=T_FLOOR;
    lvl.salle[i]=indice;
    n++;
  }
  lvl.salles.push({nom:def.nom,tx:tx,ty:ty,teinte:def.t,forme:def.f,r:r,cases:n});
  return n;
}
/* Le décor d'une salle, disposé — pas semé au hasard.

   `pris` est la carte d'occupation du niveau, passée par l'appelant. Sans
   elle, cette fonction posait 3,8 % du décor par-dessus quelque chose : un
   autre prop, ou pire un coffre qu'elle rendait invisible. Le motif `anneau`
   se marchait aussi dessus tout seul — `Math.round(cos(θ)*R)` renvoie la même
   case pour deux angles voisins quand R est petit. */
function decorerSalle(lvl,S,def,liste,pris){
  if(!liste||!liste.length)return;
  const w=lvl.w,r=Math.max(SALLE_R_MIN,def.r||5),tx=S.tx,ty=S.ty;
  const occ=pris||{};
  const pose=(x,y)=>{
    if(x<2||y<2||x>=lvl.w-2||y>=lvl.h-2)return;
    const i=idx(w,x,y);
    if(!walkableCode(lvl.grid[i]))return;
    if(Math.hypot(x-tx,y-ty)<2)return;              // on dégage le pilier
    if(occ[i])return;                               // déjà pris : on ne recouvre pas
    occ[i]=1;
    lvl.props.push({tx:x,ty:y,x:x*TS+TS/2+rand(-4,4),y:y*TS+TS/2+rand(-3,3),
                    kind:liste[randi(0,liste.length-1)],salle:1});
  };
  const D=def.d||'anneau';
  if(D==='anneau'){ const R=Math.max(2,r-1);
    for(let a=0;a<12;a++){const th=a/12*6.283;
      pose(tx+Math.round(Math.cos(th)*R), ty+Math.round(Math.sin(th)*R));} }
  else if(D==='murs'){ for(let k=-r+1;k<=r-1;k+=2){
      pose(tx+k,ty-r+1); pose(tx+k,ty+r-1); pose(tx-r+1,ty+k); pose(tx+r-1,ty+k);} }
  else if(D==='allee'){ const L=r+1;
    for(let k=-L;k<=L;k+=2){ pose(tx+k,ty-2); pose(tx+k,ty+2); } }
  else { /* centre */ for(let a=0;a<6;a++){const th=a/6*6.283;
      pose(tx+Math.round(Math.cos(th)*2.2), ty+Math.round(Math.sin(th)*2.2));} }
}
/* Le profil de la région d'une case, ou d'une position en pixels. */
function regionDe(lvl,tx,ty){
  if(!lvl||!lvl.region)return REGION_PROFILS[0];
  if(tx<0||ty<0||tx>=lvl.w||ty>=lvl.h)return REGION_PROFILS[0];
  return (lvl.regions&&lvl.regions[lvl.region[idx(lvl.w,tx,ty)]])||REGION_PROFILS[0];
}
function regionEn(lvl,px,py){ const t=tileAt(px,py); return regionDe(lvl,t.tx,t.ty); }
function anomalieEn(lvl,px,py){ const r=regionEn(lvl,px,py); return r.anomalie?ANOMALIES[r.anomalie]:null; }
const ACT_MIN=[1,12,18,24,30];
const ACT_START=[1,14,20,26,32];   // niveau attendu à l'ENTRÉE de chaque acte
const ACT_END=[14,20,26,32,38];    // niveau attendu en FIN d'acte = niveau du boss
/* Le surplomb maximal d'un acte REJOUÉ, en niveaux au-dessus du héros. Six,
   parce que c'est exactement l'amplitude des actes 2 à 5 : la borne aligne
   l'acte 1 sur ses voisins au lieu d'inventer un régime de plus. */
const ECART_MAX=6;
function makeActBoss(n,x,y,blvl){const b=ACT_BOSSES[n]||ACT_BOSSES[ACT_BOSSES.length-1];
 /* Les gardiens d'acte suivent les mêmes multiplicateurs géométriques que
    les ennemis ordinaires (§ v9.32). */
 const dmH=multDiffHp(), dmD=multDiffDmg(), xm=multDiffXp();const L=blvl||ACT_END[n];
 /* Un gardien d'acte vaut six à neuf brutes de son niveau, dans son mode :
    il hérite ainsi de la calibration des ennemis ordinaires (§ 04-balises). */
 const hp=Math.round(pvOrdinaire(L)*BOSS_ACTE_PV[Math.max(0,Math.min(3,n))]);
 return {kind:'boss',x,y,r:52,hp,hpMax:hp,dmg:Math.round(dgtOrdinaire(L)*BOSS_ACTE_DGT[Math.max(0,Math.min(3,n))]),spd:0.95,xp:Math.round(XP_BASE*(b.xp/XP_REF)*Math.pow(L,XP_EXPO)*xm),lvl:L,
  col:b.col,wcol:b.wcol,bkind:b.bkind,name:b.name,res:b.res||{},hitCd:0,hurt:0,boss:true,special:3,aggro:false,path:null,pcd:0,slow:0};
}
const acts={};const actDiscovered={};
/* Sondes de test : simuler un lancement à froid et lire l'état des actes. */
function oublierActes(){for(const k in acts)delete acts[k];for(const k in actDiscovered)delete actDiscovered[k];}
function acteDecouvert(a){return !!actDiscovered[a];}
function stamp(grid,w,h,x,y){for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){grid[idx(w,clamp(x+dx,1,w-2),clamp(y+dy,1,h-2))]=T_FLOOR;}}
function carveCorridor(grid,w,h,a,b){
  let x=a[0],y=a[1];const tx=b[0],ty=b[1];
  if(alea()<0.5){ while(x!==tx){x+=x<tx?1:-1;stamp(grid,w,h,x,y);} while(y!==ty){y+=y<ty?1:-1;stamp(grid,w,h,x,y);} }
  else { while(y!==ty){y+=y<ty?1:-1;stamp(grid,w,h,x,y);} while(x!==tx){x+=x<tx?1:-1;stamp(grid,w,h,x,y);} }
}
function genMaze(w,h){
  const grid=new Uint8Array(w*h).fill(T_WALL);
  const rooms=[];const nRooms=Math.round(w*h/560);let tries=0;
  while(rooms.length<nRooms&&tries++<nRooms*4){
    const rw=randi(6,14),rh=randi(6,12);const rx=randi(2,w-rw-2),ry=randi(2,h-rh-2);
    for(let y=ry;y<ry+rh;y++)for(let x=rx;x<rx+rw;x++)grid[idx(w,x,y)]=T_FLOOR;
    rooms.push([rx+(rw>>1),ry+(rh>>1)]);
  }
  for(let i=1;i<rooms.length;i++){
    let best=i-1,bd=1e18;
    for(let j=Math.max(0,i-70);j<i;j++){const dx=rooms[i][0]-rooms[j][0],dy=rooms[i][1]-rooms[j][1];const d=dx*dx+dy*dy;if(d<bd){bd=d;best=j;}}
    carveCorridor(grid,w,h,rooms[i],rooms[best]);
  }
  for(let k=0;k<Math.round(rooms.length*0.14);k++)carveCorridor(grid,w,h,pick(rooms),pick(rooms));
  for(let x=0;x<w;x++){grid[idx(w,x,0)]=T_WALL;grid[idx(w,x,h-1)]=T_WALL;}
  for(let y=0;y<h;y++){grid[idx(w,0,y)]=T_WALL;grid[idx(w,w-1,y)]=T_WALL;}
  return grid;
}
/* ---- Générateur de monde DIRIGÉ, style donjon (salles + couloirs) ---- */
/* LE PINCEAU — les primitives de creusement, qui possèdent la grille.

   Elles étaient sept fermetures imbriquées dans genDirected, ce qui obligeait
   à lire 53 lignes d'un bloc pour trouver comment se dessine une salle. Elles
   ne creusent QUE du sol : une case déjà creusée n'est jamais remurée, ce qui
   garantit qu'aucune primitive ne peut couper le tronc derrière une autre. */
function _pinceau(grid,w,h){
  const inb=(x,y)=>x>=1&&y>=1&&x<w-1&&y<h-1;
  const setF=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(inb(x,y)){const i=idx(w,x,y);if(grid[i]===T_WALL)grid[i]=(c||T_FLOOR);}};
  const disk=(cx,cy,r,c)=>{const ir=Math.ceil(r);for(let dy=-ir;dy<=ir;dy++)for(let dx=-ir;dx<=ir;dx++)if(dx*dx+dy*dy<=r*r)setF(cx+dx,cy+dy,c);};
  const blobRoom=(cx,cy,size)=>{let x=cx,y=cy;for(let k=0;k<size;k++){disk(x,y,rand(1.6,3.2));x=clamp(x+rand(-2.4,2.4),cx-size*0.6,cx+size*0.6);y=clamp(y+rand(-2.4,2.4),cy-size*0.6,cy+size*0.6);}disk(cx,cy,Math.min(6,size*0.5));};
  const rectRoom=(cx,cy,rw,rh,pil)=>{const hw=rw>>1,hh=rh>>1;for(let y=-hh;y<=hh;y++)for(let x=-hw;x<=hw;x++)setF(cx+x,cy+y);
    if(pil)for(let py=-hh+2;py<=hh-2;py+=3)for(let px=-hw+2;px<=hw-2;px+=3){const gx=clamp(cx+px,1,w-2),gy=clamp(cy+py,1,h-2);grid[idx(w,gx,gy)]=T_WALL;}};
  // couloir orthogonal (L) épais entre deux points, empile centres dans out[]
  const corridor=(a,b,width,out)=>{let x=Math.round(a[0]),y=Math.round(a[1]);const tx=Math.round(b[0]),ty=Math.round(b[1]);const half=width>>1;
    const paint=()=>{for(let dy=-half;dy<=half;dy++)for(let dx=-half;dx<=half;dx++)setF(x+dx,y+dy);if(out)out.push([x,y]);};paint();
    if(alea()<0.5){while(x!==tx){x+=x<tx?1:-1;paint();}while(y!==ty){y+=y<ty?1:-1;paint();}}
    else{while(y!==ty){y+=y<ty?1:-1;paint();}while(x!==tx){x+=x<tx?1:-1;paint();}}};
  // route en ESCALIER (plusieurs virages) entre deux noeuds
  const jaggedRoute=(a,b,width,out,crossLen)=>{const k=randi(3,5);let prev=a;
    for(let s=1;s<=k;s++){const u=s/k;
      let x=a[0]+(b[0]-a[0])*u+(s<k?rand(-1,1)*crossLen*0.07:0);
      let y=a[1]+(b[1]-a[1])*u+(s<k?rand(-1,1)*crossLen*0.07:0);
      const p=[clamp(Math.round(x),3,w-4),clamp(Math.round(y),3,h-4)];
      corridor(prev,p,pick([3,4,4,5,6]),out);prev=p;}};
  return {disk,blobRoom,rectRoom,corridor,jaggedRoute};
}

/* NOEUDS principaux A->B (zig-zag, plus nombreux -> segments plus courts).
   Ne fait que POSER les points : le creusement vient après, pour que l'ordre
   des tirages reste celui d'origine — tous les tirages de position, puis tous
   les tirages de forme. */
function _genNoeuds(w,h,horiz,mainLen,crossLen){
  const nNodes=20+randi(0,6);const nodes=[];
  for(let i=0;i<nNodes;i++){const f=i/(nNodes-1);const mp=(0.06+0.88*f)*mainLen;
    let cp;if(i===0||i===nNodes-1)cp=crossLen*0.5;else cp=crossLen*((i%2?0.74:0.26)+rand(-0.12,0.12));
    nodes.push(horiz?[Math.round(mp),Math.round(cp)]:[Math.round(cp),Math.round(mp)]);}
  return nodes;
}

/* La salle de chaque pilier. Les deux extrémités — entrée et arène du
   gardien — sont toujours grandes et rondes ; les autres tirent leur forme. */
function _genSallesNoeuds(P, nodes){
  const dernier=nodes.length-1;
  nodes.forEach((nd,i)=>{const big=(i===0||i===dernier);
    if(big){P.blobRoom(nd[0],nd[1],15);P.disk(nd[0],nd[1],7);}
    else if(alea()<0.5)P.rectRoom(nd[0],nd[1],randi(8,15),randi(6,12),alea()<0.4);
    else P.blobRoom(nd[0],nd[1],randi(8,13));});
}

/* Le tronc : la route qui relie les piliers, et la mesure d'avancement le long
   d'elle. `at(fraction)` rend le point du chemin à cette avance — c'est ce qui
   permet ensuite de poser les balises et de découper les régions. */
function _genTronc(P, nodes, crossLen){
  const path=[];for(let i=1;i<nodes.length;i++)P.jaggedRoute(nodes[i-1],nodes[i],0,path,crossLen);
  const cum=[0];for(let i=1;i<path.length;i++)cum.push(cum[i-1]+Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]));
  const total=cum[cum.length-1]||1;
  const at=fr=>{const d=fr*total;for(let i=1;i<cum.length;i++)if(cum[i]>=d)return path[i];return path[path.length-1];};
  return {path,cum,total,at};
}

/* 80 branches accessoires -> salles annexes (organiques ou rect).
   Chacune part du tronc à une avance connue : c'est `prog` qui donne plus tard
   le niveau des ennemis et des coffres qu'on y trouve. */
const GEN_NB_BRANCHES = 80;
function _genBranches(P, w, h, at){
  const branches=[],nBr=GEN_NB_BRANCHES;
  for(let b=0;b<nBr;b++){const fr=clamp((b+0.5)/nBr+rand(-0.02,0.02),0.03,0.97);const st=at(fr);
    const ang=(alea()<0.5?-1:1)*(Math.PI/2)+rand(-0.6,0.6);const dl=randi(10,32);
    const mx=clamp(Math.round(st[0]+Math.cos(ang)*dl*0.5),5,w-6),my=clamp(Math.round(st[1]+Math.sin(ang)*dl*0.5),5,h-6);
    const ex=clamp(Math.round(st[0]+Math.cos(ang)*dl+rand(-6,6)),5,w-6),ey=clamp(Math.round(st[1]+Math.sin(ang)*dl+rand(-6,6)),5,h-6);
    P.corridor([st[0],st[1]],[mx,my],pick([2,2,3]),null);P.corridor([mx,my],[ex,ey],pick([2,2,3]),null);
    const rr=pick([2,2,3,3,4,4,5,6,7]);
    if(alea()<0.5)P.rectRoom(ex,ey,randi(4,11),randi(4,9),alea()<0.25);else P.blobRoom(ex,ey,rr+3);
    branches.push({x:ex,y:ey,prog:fr,rr});}
  return branches;
}

/* Le pourtour de la carte est toujours du mur : rien ne doit sortir. */
function _genBordures(grid,w,h){
  for(let x=0;x<w;x++){grid[idx(w,x,0)]=T_WALL;grid[idx(w,x,h-1)]=T_WALL;}
  for(let y=0;y<h;y++){grid[idx(w,0,y)]=T_WALL;grid[idx(w,w-1,y)]=T_WALL;}
}

/* ÉLAGAGE : tout sol qu'on ne peut pas atteindre depuis l'entrée est remuré.
   Sans ça les branches creusées à l'aveugle laissent des poches isolées, où
   coffres et ennemis se posaient hors d'atteinte du joueur. */
function _genElaguer(grid,w,h,spawn){
  const reach=new Uint8Array(w*h);const stk=[[spawn[0],spawn[1]]];reach[idx(w,spawn[0],spawn[1])]=1;
  while(stk.length){const c=stk.pop();for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=c[0]+d[0],ny=c[1]+d[1];if(nx<1||ny<1||nx>=w-1||ny>=h-1)continue;const j=idx(w,nx,ny);if(reach[j]||grid[j]===T_WALL)continue;reach[j]=1;stk.push([nx,ny]);}}
  for(let i=0;i<w*h;i++)if(grid[i]!==T_WALL&&!reach[i])grid[i]=T_WALL;
}

/* ---- Générateur de monde DIRIGÉ, style donjon (salles + couloirs) ---- */
function genDirected(w,h){
  const grid=new Uint8Array(w*h).fill(T_WALL);
  const horiz=w>=h, mainLen=horiz?w:h, crossLen=horiz?h:w;
  const P=_pinceau(grid,w,h);
  const nodes=_genNoeuds(w,h,horiz,mainLen,crossLen);
  _genSallesNoeuds(P,nodes);
  const T=_genTronc(P,nodes,crossLen);
  const branches=_genBranches(P,w,h,T.at);
  _genBordures(grid,w,h);
  const spawn=nodes[0].slice(),bpos=nodes[nodes.length-1].slice();
  grid[idx(w,spawn[0],spawn[1])]=T_FLOOR;grid[idx(w,bpos[0],bpos[1])]=T_FLOOR;
  _genElaguer(grid,w,h,spawn);
  return {grid,path:T.path,cum:T.cum,total:T.total,at:T.at,branches,spawn,bpos,nodes};
}

/* buildAct FAISAIT 156 LIGNES — DOUZE PHASES À LA SUITE.          (Phase 4)

   Le tronc, les motifs de sol, les balises, l'arène, les régions, les
   ennemis, les branches, les sanctuaires, le décor, les salles, les tonneaux,
   le boss. Chacune lisible, aucune séparée : pour trouver où naissent les
   grottes il fallait parcourir la fabrication des ennemis.

   ATTENTION — L'ORDRE DES TIRAGES EST LA FORME DU NIVEAU. Déplacer un `alea()`
   d'une ligne change tout le niveau à graine égale. Les phases sont donc
   appelées exactement dans l'ordre d'origine, et `test_equivalence` le vérifie
   sur trois graines et cinq actes. */

/* Une case de sol au voisinage, en s'éloignant par cercles. Rend au pire la
   case demandée, ramenée dans les bornes : jamais rien hors carte. */
function _actCaseSolProche(lvl, ox, oy){
  const w=lvl.w,h=lvl.h,grid=lvl.grid;
  const C=[[ox,oy],[ox+1,oy],[ox-1,oy],[ox,oy+1],[ox,oy-1],[ox+1,oy+1],[ox-1,oy-1],[ox+2,oy],[ox-2,oy],[ox,oy+2],[ox,oy-2]];
  for(const q of C){const cx=clamp(q[0],1,w-2),cy=clamp(q[1],1,h-2);if(grid[idx(w,cx,cy)]===T_FLOOR)return[cx,cy];}
  return[clamp(ox,1,w-2),clamp(oy,1,h-2)];
}

/* Motifs « colle » au sol : le chemin sur deux cases de large, et des anneaux
   en losange autour de chaque pilier. Purement visuel. */
function _actMotifsSol(lvl, G){
  const w=lvl.w,h=lvl.h,grid=lvl.grid,path=G.path;
  lvl.deco=new Uint8Array(w*h);
  const _mark=(px,py)=>{if(px>=1&&py>=1&&px<w-1&&py<h-1&&grid[idx(w,px,py)]===T_FLOOR)lvl.deco[idx(w,px,py)]=1;};
  for(let i=0;i<path.length;i++){const px=Math.round(path[i][0]),py=Math.round(path[i][1]);_mark(px,py);
    const nx=path[Math.min(i+1,path.length-1)],dx=nx[0]-path[i][0],dy=nx[1]-path[i][1];
    if(Math.abs(dx)>=Math.abs(dy))_mark(px,py+1);else _mark(px+1,py);}
  for(let ni=1;ni<G.nodes.length-1;ni++){const nd=G.nodes[ni],R=randi(3,4);
    for(let a=-R;a<=R;a++){const b=R-Math.abs(a);_mark(nd[0]+a,nd[1]+b);_mark(nd[0]+a,nd[1]-b);}}
}

/* Balise d'entrée, PNJ de quête, point d'apparition du héros, puis les balises
   à 30 / 60 / 90 % et celle d'avant-boss. */
function _actBalises(lvl, n, G){
  const spawn=lvl.spawn;
  {const wp=_actCaseSolProche(lvl,spawn[0],spawn[1]);lvl.npcs.push({type:'waypoint',name:'Balise — Entrée',ico:'🔷',tx:wp[0],ty:wp[1],bi:0,acte:n});}
  {const gv=GIVER[n]||{};const qp=_actCaseSolProche(lvl,spawn[0]+2,spawn[1]);lvl.npcs.push({type:'quest',act:n,name:gv.name||'Survivant',ico:gv.ico||'❓',tx:qp[0],ty:qp[1]});}
  lvl.pspawn=_actCaseSolProche(lvl,spawn[0]+1,spawn[1]);
  const _bl=[[0.30,'30%'],[0.60,'60%'],[0.90,'90%'],[0.955,'pré-boss']];
  _bl.forEach((bf,k)=>{const p=_actCaseSolProche(lvl,Math.round(G.at(bf[0])[0]),Math.round(G.at(bf[0])[1]));lvl.npcs.push({type:'waypoint',name:'Balise — '+bf[1],ico:'🔷',tx:p[0],ty:p[1],bi:k+1,acte:n});});
}

/* La porte vers l'acte suivant, et l'arène creusée autour du point B. */
function _actArene(lvl, n, bpos){
  const w=lvl.w,h=lvl.h,grid=lvl.grid;
  if(n<ACTS.length-1){grid[idx(w,bpos[0],bpos[1])]=T_GATE;lvl.gate={tx:bpos[0],ty:bpos[1]};}
  const AR=16;
  for(let dy=-AR;dy<=AR;dy++)for(let dx=-AR;dx<=AR;dx++){
    if(dx*dx+dy*dy>AR*AR)continue;
    const ax=bpos[0]+dx,ay=bpos[1]+dy;
    if(ax<2||ay<2||ax>=w-2||ay>=h-2)continue;
    const _i=idx(w,ax,ay);if(grid[_i]===T_WALL)grid[_i]=T_FLOOR;}
  lvl.bossArena={x:bpos[0],y:bpos[1],r:15};
}

/* Les ennemis : une rampe de niveau selon l'avancement le long du tronc. */
function _actEnnemis(lvl, A, rf, progAt){
  const spawn=lvl.spawn,aStart=lvl.aStart,aEnd=lvl.aEnd;
  const nEn=Math.min(1600,Math.round(rf.length*0.028)+120);
  for(let i=0;i<nEn;i++){const p=rf[randi(0,rf.length-1)];if(dist(p[0],p[1],spawn[0],spawn[1])<14)continue;
    let kind='imp';const r=alea();
    if(A.depth>=3&&r<0.16)kind='golem';else if(A.depth>=1&&r<0.34)kind='shade';else if(A.depth>=2&&r<0.5)kind='brute';else if(r<0.62)kind='wraith';else if(r<0.74)kind='brute';
    /* Penchant de région : deux fois sur trois, la région impose son espèce.
       Un nid grouille de diablotins, une zone sombre de spectres. */
    {const _rp=regionDe(lvl,p[0],p[1]);
     if(_rp.penchant&&alea()<0.66)kind=_rp.penchant;}
    const _pp=progAt(p[0],p[1]);const _elvl=Math.max(1,Math.round(aStart+(aEnd-aStart)*_pp));
    const e=makeEnemy(kind,p[0]*TS+TS/2,p[1]*TS+TS/2,A.depth,_elvl);if(alea()<0.10+A.depth*0.03)makeElite(e);lvl.enemies.push(e);}
}

/* PLACEMENT DE L'ENTRÉE DE GROTTE — contrainte imposée par le sprite lui-même.

   Un bloc isométrique montre son dessus et DEUX faces verticales, qui se
   rejoignent sur l'arête pointant vers le bas de l'écran : le coin sud.
   C'est là que le générateur place l'arche, et il ne peut pas faire
   autrement. Il faut donc choisir un bloc de mur dont le coin sud est
   ENTIÈREMENT dégagé, c'est-à-dire dont les trois voisins du sud —
   (+1,0), (0,+1) et (+1,+1) — sont praticables. Sinon la moitié de
   l'arche s'ouvrirait sur un autre mur.

         (wx,wy)  bloc de mur, arche sur son coin sud
            ◆
           ╱ ╲
     (wx,wy+1) (wx+1,wy)     ← doivent être libres
           ╲ ╱
        (wx+1,wy+1)          ← la case d'entrée, face à l'arche

   La case de grotte est posée en diagonale devant le coin : c'est de là
   que le joueur regarde l'arche bien en face.

   Ne tire aucun hasard : le résultat ne dépend que de la grille. */
function _actGrotte(lvl, bx, by){
  const w=lvl.w,h=lvl.h,grid=lvl.grid;
  const libre=(x,y)=>(x>0&&y>0&&x<w-1&&y<h-1&&grid[idx(w,x,y)]===T_FLOOR);
  const degage=(wx,wy)=>grid[idx(w,wx,wy)]===T_WALL&&libre(wx+1,wy)&&libre(wx,wy+1)&&libre(wx+1,wy+1);
  let cpos=null,cmur=null,cbest=-1;
  for(let ry=-11;ry<=11&&!(cbest>=4);ry++)for(let rx=-11;rx<=11;rx++){
    const wx=bx+rx,wy=by+ry; if(wx<2||wy<2||wx>=w-3||wy>=h-3)continue;
    if(!degage(wx,wy))continue;
    const sc=4-(Math.abs(rx)+Math.abs(ry))*0.05;
    if(sc>cbest){cbest=sc;cpos=[wx+1,wy+1];cmur=[wx,wy];}
  }
  if(cpos)return[cpos,cmur];
  /* Aucun coin dégagé dans le rayon de recherche ? Plutôt que d'accepter un
     mur à demi masqué — l'arche s'ouvrirait alors sur un autre mur —, on
     balaie TOUT le niveau pour trouver le coin dégagé le plus proche. Il y
     en a environ trois cents par acte, donc ce cas ne devrait jamais rester
     sans solution. */
  let d2=1e18;
  for(let wy=2;wy<h-3;wy++)for(let wx=2;wx<w-3;wx++){
    if(!degage(wx,wy))continue;
    const d=(wx-bx)*(wx-bx)+(wy-by)*(wy-by);
    if(d<d2){d2=d;cpos=[wx+1,wy+1];cmur=[wx,wy];}
  }
  return cpos?[cpos,cmur]:null;
}

/* Les récompenses au bout des branches : coffres, camps d'élite, gemmes,
   impasses garnies de tonneaux — et jusqu'à trois grottes. */
function _actBranches(lvl, A, G){
  const w=lvl.w,grid=lvl.grid,aStart=lvl.aStart,aEnd=lvl.aEnd;
  lvl.caves=[];lvl.breakables=[];let _cav=0;
  const _kw=()=>{const r=alea();return r<0.62?'impasse':r<0.78?'coffre':r<0.90?'élite':'gemme';};
  for(let bi=0;bi<G.branches.length;bi++){const br=G.branches[bi];const kind=_kw();
    const bx=br.x,by=br.y;const _el=Math.max(1,Math.round(aStart+(aEnd-aStart)*br.prog));
    if(kind==='coffre'||kind==='gemme'){
      {const _c=poserObjet(lvl,bx,by,{opened:false,depth:A.depth,gem:kind==='gemme'},5);if(_c)lvl.chests.push(_c);}
    } else if(kind==='élite'){
      for(let k=0;k<2;k++){const e=makeEnemy(A.depth>=2?'brute':'wraith',bx*TS+TS/2+rand(-20,20),by*TS+TS/2+rand(-20,20),A.depth,_el);makeElite(e);lvl.enemies.push(e);}
      {const _c=poserObjet(lvl,bx,by,{opened:false,depth:A.depth},5);if(_c)lvl.chests.push(_c);}
    } else {
      for(let k=0;k<randi(2,4);k++){const q=_actCaseSolProche(lvl,bx+randi(-2,2),by+randi(-2,2));lvl.breakables.push({tx:q[0],ty:q[1],x:q[0]*TS+TS/2,y:q[1]*TS+TS/2,broken:false,r:14});}
    }
    // quelques branches profondes deviennent des grottes
    if((kind==='impasse'||kind==='gemme')&&_cav<3&&br.rr>=4){
      const trouve=_actGrotte(lvl,bx,by);
      if(trouve){const cpos=trouve[0],cmur=trouve[1];
        grid[idx(w,cpos[0],cpos[1])]=T_CAVE;
        lvl.caves.push({tx:cpos[0],ty:cpos[1],mx:cmur[0],my:cmur[1],
                        boss:(_cav===0),cave:null,v:randi(0,2)});_cav++;}
    }
  }
}

/* Sanctuaires le long du tronc — soin, puissance, célérité. */
function _actSanctuaires(lvl, rf){
  const spawn=lvl.spawn;
  const _stp=['heal','power','haste'];const nS=Math.min(6,Math.round(rf.length/28000)+2);
  for(let i=0;i<nS;i++){const p=rf[randi(0,rf.length-1)];if(dist(p[0],p[1],spawn[0],spawn[1])<12)continue;{const _s=poserObjet(lvl,p[0],p[1],{used:false,type:pick(_stp)},4);if(_s)lvl.shrines.push(_s);}}
}

/* Décor : posé sur des cases praticables, loin du point d'apparition, et
   jamais sur une case déjà occupée par autre chose. Purement visuel. */
/* UNE SEULE CARTE D'OCCUPATION POUR TOUS LES POSEURS.            (v9.15)

   Elle était déclarée à l'intérieur du bloc de décor, donc morte dès qu'on en
   sortait. Les deux poseurs suivants ne savaient plus ce qui était déjà là :

     · `decorerSalle` posait son décor sans rien vérifier. Mesuré sur
       30 niveaux : 120 props en double sur 3 156, soit 3,8 % — et les 120
       venaient TOUS des salles. Son motif « anneau » se marchait même dessus
       tout seul, deux angles voisins donnant le même arrondi de case.
     · les tonneaux, semés APRÈS le décor, tombaient parfois sur un prop.

   Un prop posé sur un coffre ou un sanctuaire le CACHE : l'objet est toujours
   là, mais le joueur ne le voit plus. La carte vit maintenant au niveau de
   `buildAct`, et TOUT poseur la consulte puis s'y inscrit. */
function _actOccupation(lvl){
  const w=lvl.w,pris={};
  for(const c of lvl.chests||[])pris[idx(w,c.tx,c.ty)]=1;
  for(const s of lvl.shrines||[])pris[idx(w,s.tx,s.ty)]=1;
  for(const b of lvl.breakables||[])pris[idx(w,b.tx,b.ty)]=1;
  for(const cv of lvl.caves||[])pris[idx(w,cv.tx,cv.ty)]=1;
  return pris;
}

function _actDecor(lvl, A, rf, pris){
  const w=lvl.w,spawn=lvl.spawn;
  lvl.props=[];
  const liste=(typeof PROP_THEME!=='undefined'&&PROP_THEME[A.theme])||[];
  if(!liste.length)return;
  const nP=Math.min(120,Math.round(rf.length/900)+14);
  for(let i=0;i<nP;i++){
    const p=rf[randi(0,rf.length-1)];
    const k=idx(w,p[0],p[1]);
    if(pris[k])continue;
    if(dist(p[0],p[1],spawn[0],spawn[1])<8)continue;
    /* densité propre à la région : un nid est encombré, une zone sombre nue */
    const _rp=regionDe(lvl,p[0],p[1]);
    if(alea()>(_rp.densite||1)*0.72)continue;
    pris[k]=1;
    lvl.props.push({tx:p[0],ty:p[1],x:p[0]*TS+TS/2+rand(-7,7),y:p[1]*TS+TS/2+rand(-5,5),
                    kind:liste[randi(0,liste.length-1)]});
  }
}

/* LES SALLES DES PILIERS. Posées après les balises et le décor : elles
   creusent autour de chaque pilier et y disposent leur propre décor. */
function _actSalles(lvl, n, A, pris){
  const defs=SALLES_PAR_ACTE[Math.max(0,Math.min(4,n))]||[];
  const liste=(typeof PROP_THEME!=='undefined'&&PROP_THEME[A.theme])||[];
  const bal=(lvl.npcs||[]).filter(x=>x.type==='waypoint').sort((a,b)=>(a.bi||0)-(b.bi||0));
  bal.forEach((b,k)=>{
    const def=defs[k%Math.max(1,defs.length)]; if(!def)return;
    poserSalle(lvl,b.tx,b.ty,def,k);
    b.salle=def.nom;                     // le nom remonte au menu des balises
    decorerSalle(lvl,lvl.salles[lvl.salles.length-1],def,liste,pris);
  });
}

/* Tonneaux dispersés sur tout l'acte. */
/* Les tonneaux passent EN DERNIER, donc ils doivent consulter la carte comme
   les autres : sans ça ils tombaient sur un prop déjà posé, et le test le
   signalait à l'envers (« un prop sur un tonneau »). */
function _actTonneaux(lvl, rf, pris){
  const w=lvl.w,spawn=lvl.spawn;
  const nB=Math.min(60,Math.round(rf.length/1400)+10);
  for(let i=0;i<nB;i++){const p=rf[randi(0,rf.length-1)];if(dist(p[0],p[1],spawn[0],spawn[1])<6)continue;
    const kB=idx(w,p[0],p[1]); if(pris[kB])continue; pris[kB]=1;
    lvl.breakables.push({tx:p[0],ty:p[1],x:p[0]*TS+TS/2,y:p[1]*TS+TS/2,broken:false,r:14});}
}

/* Le gardien, au point B. Le dernier acte a le Green Falcon lui-même. */
function _actBoss(lvl, n, A, bpos){
  const bx=bpos[0],by=bpos[1];
  const bo=(n===ACTS.length-1)?makeEnemy('falcon',bx*TS+TS/2,by*TS+TS/2,A.depth,lvl.aEnd)
                              :makeActBoss(n,bx*TS+TS/2,by*TS+TS/2,lvl.aEnd);
  lvl.enemies.push(bo);lvl.boss=bo;
}

function buildAct(n){
  const A=ACTS[n];const D=ACT_DIM[n]||[1000,720];const w=D[0],h=D[1];
  const G=genDirected(w,h);const grid=G.grid;const path=G.path,cum=G.cum,total=G.total;
  const spawn=G.spawn,bpos=G.bpos;
  // progression (0 à A -> 1 au boss) via le point de chemin le plus proche
  const progAt=(px,py)=>{let bd=1e18,bi=0;for(let i=0;i<path.length;i+=2){const dx=path[i][0]-px,dy=path[i][1]-py,d=dx*dx+dy*dy;if(d<bd){bd=d;bi=i;}}return clamp(cum[bi]/total,0,1);};
  const rf=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(grid[idx(w,x,y)]===T_FLOOR)rf.push([x,y]);
  const lvl={id:prochainLevelSeq(),kind:'act',actNum:n,theme:A.theme,depth:A.depth,w,h,grid,
    enemies:[],drops:[],chests:[],entrances:[],npcs:[],shrines:[],seen:new Uint8Array(w*h),
    name:'Acte '+(n+1)+' — '+A.name,spawn};
  _actMotifsSol(lvl,G);
  _actBalises(lvl,n,G);
  /* LA BANDE D'UN ACTE EST UNE RAMPE, PAS UN SURPLOMB.

     Elle est faite pour être TRAVERSÉE : le héros entre à ACT_START et sort à
     ACT_END. L'acte 1 a donc une amplitude de TREIZE niveaux — il mène de 1 à
     14, c'est le tutoriel — quand les quatre autres n'en ont que SIX.

     `_over` décale la bande sans la rétrécir. Au plafond, le héros ne monte
     plus : l'acte 1 laissait alors des ennemis +13 au-dessus de lui pour
     toujours, les autres +6. C'était la seule et unique raison pour laquelle
     l'acte 1 était plus dur que les autres en Enfer — mesuré en 9.18 : 4,32 s
     contre 2,91 s pour tuer une brute d'os.

     DÈS QU'UN ACTE EST REJOUÉ au-dessus de son niveau d'entrée, sa rampe n'a
     plus de sens : le héros ne la gravira pas. On borne alors le surplomb à
     six niveaux, c'est-à-dire au régime que les actes 2 à 5 produisent déjà.
     La PREMIÈRE traversée, elle, garde sa rampe intacte — c'est elle que
     test_courbe surveille, et elle est juste. */
  const _over=Math.max(0,player.lvl-ACT_START[n]);
  lvl.aStart=ACT_START[n]+_over; lvl.aEnd=ACT_END[n]+_over;
  if(_over>0) lvl.aEnd=Math.max(lvl.aStart, Math.min(lvl.aEnd, player.lvl+ECART_MAX));
  _actArene(lvl,n,bpos);
  /* Les régions sont découpées AVANT le peuplement ET avant le décor : les deux
     s'y adaptent. Placé après, le découpage n'était vu par personne — c'est
     l'erreur que le test a levée. Aucune incidence sur la forme du niveau ni
     sur sa connexité : c'est un simple étiquetage des cases. */
  /* Les seuils sont l'avancement des piliers : 0, puis 30 %, 60 %, 90 % et
     l'avant-boss. Une région va d'un pilier au suivant. */
  decouperRegions(lvl,n,rf,progAt,[0,0.30,0.60,0.90,0.955]);
  _actEnnemis(lvl,A,rf,progAt);
  _actBranches(lvl,A,G);
  _actSanctuaires(lvl,rf);
  /* La carte d'occupation est construite ICI, après les coffres, les grottes,
     les tonneaux de branche et les sanctuaires — puis partagée par les trois
     poseurs qui suivent. */
  const pris=_actOccupation(lvl);
  _actDecor(lvl,A,rf,pris);
  _actSalles(lvl,n,A,pris);
  _actTonneaux(lvl,rf,pris);
  _actBoss(lvl,n,A,bpos);
  return lvl;
}

/* Combien de coups le héros tiendrait-il dans cet acte ? Sert à écrire un
   avertissement CHIFFRÉ plutôt qu'un « c'est dangereux » qui ne dit rien. */
function coupsTenus(n){
  try{
    const st=P(), niv=ACT_START[n]||1;
    const m=makeEnemy('imp',0,0,n,niv);
    const par=Math.max(1,m.dmg*degatsMultEcart(niv,player.lvl)*(1-reductionDef(st.def,niv)))
              *(1-Math.min(40,(st.block||0)*0.8)/100);
    return Math.max(1,Math.round(st.hpMax/par));
  }catch(e){return 0;}
}
function enterAct(n,forcer){
  if(n>=ACTS.length){victory();return;}
  /* Plancher de niveau. On ne bloque JAMAIS le retour vers un acte déjà
     atteint : sinon un joueur mort et rétrogradé serait enfermé au village. */
  /* LE PLANCHER N'INTERDIT PLUS : IL AVERTIT.

     Un refus sec prive le joueur de tout choix, et la mesure montre que la
     barrière est de toute façon moins dure que les monstres eux-mêmes : au
     niveau 24 dans l'acte 5, on tient 2,4 coups et le boss final tue en
     moins d'un coup. Le vrai mur est là, pas dans une condition.

     On donne donc le chiffre, on rappelle ce qu'on risque de perdre, et on
     laisse décider. La confirmation ne se pose qu'une fois : après, l'acte
     est atteint et la question ne revient plus. */
  const _min=ACT_MIN[n]||1;
  if(player.lvl<_min && n>maxAct && !forcer){
    const _nom=nomActe(n,true)||t('acte.celuiCi');
    const _manque=_min-player.lvl, _c=coupsTenus(n);
    if(typeof replique==='function')
      replique('aldric', t(_manque>1?'acte.tropTot.replique.n':'acte.tropTot.replique.1',
                          {n:_manque}));
    if(typeof ouvrirConfirmation==='function'){
      ouvrirConfirmation({
        titre:t('acte.entrerTitre',{nom:_nom,niv:player.lvl}),
        /* ⚠ CES TROIS PARAGRAPHES SE TRADUISENT ENTIERS. Découpés en huit
           fragments concaténés — « Niveau conseillé : », « </b>. Il t'en
           manque <b> », … — ils étaient intraduisibles : l'anglais ne met ni
           les nombres ni les propositions au même endroit. */
        corps:t('acte.entrerCorps',{min:_min,manque:_manque,
                 coups:_c+' '+(_c>1?t('acte.coups'):t('acte.coup')),
                 boss:(ACT_END[n]||'?')}),
        ok:t('acte.entrerQuandMeme'),
        action:()=>enterAct(n,true)
      });
      return;
    }
    toast(t('acte.tropTot',{min:_min,nom:_nom,niv:player.lvl}),5);
    return;
  }
  if(!acts[n])acts[n]=buildAct(n);
  actDiscovered[n]=true;maxAct=Math.max(maxAct,n);checkQuests();const a=acts[n];
  const ps=a.pspawn||a.spawn;enterLevel(a,ps[0]*TS+TS/2,ps[1]*TS+TS/2);
  /* La scène d'accueil se joue APRÈS l'arrivée : le décor est déjà en place
     derrière le voile, et le joueur reprend la main exactement où il est. */
  if(typeof jouerScene==='function')jouerScene('acte'+n);
}



