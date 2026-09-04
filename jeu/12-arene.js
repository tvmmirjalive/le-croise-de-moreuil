


















/* ================================================================
   BOUCLE
   ================================================================ */

/* ================================================================
   ARÈNE DE LA FOSSE — vagues, giga-boss, clés, butin définitif
   ================================================================ */
/* ================================================================
   LA PART DES NOUVEAUX ENNEMIS DANS LA FOSSE                 (v9.59)
   Réglages propres à l'arène : l'acte 5 porte 36 % de variantes et 20 % de
   tireurs, mais un acte se traverse et une arène s'endure.
   ================================================================ */
const FOSSE_VARIANTE_BASE=0.30, FOSSE_VARIANTE_PALIER=0.10;  /* 40 / 50 / 60 % */
const FOSSE_TIREUR_PART=0.16;      /* un ennemi sur six tenté             */
const FOSSE_TIREUR_PART_MAX=0.25;  /* jamais plus d'un quart de la vague  */
const FOSSE_TIREURS_MAX=3;         /* ni plus de trois, quelle que soit   */
/* ⚠ LE SOLDAT DE 1918 ENTRE DANS LA FOSSE, ET C'EST COHÉRENT : l'arène
   d'Anselme convoque les ÉCHOS de ce qu'on a affronté — ses boss sont les
   gardiens des cinq actes. Le soldat du Bois y a donc sa place, là où il
   n'en a aucune dans les quatre autres actes. */
function tirerTireurFosse(){
  const noms=Object.keys(TIREURS);
  return noms[randi(0,noms.length-1)];
}

const ARENA_TIERS=[
 /* ⚠ `gratuit` N'EST PAS UNE FAVEUR, C'EST LA PORTE DE SORTIE DU JOUEUR
    RUINÉ. Sans un palier qui ne coûte rien, quelqu'un à court de clés de
    bronze n'aurait plus AUCUN moyen d'en regagner : la boucle serait fermée
    par le bas, ce qui est exactement le défaut que la phase 1 corrige. */
 {id:1,nom:'Bronze',key:'bronze',dlvl:5, waves:6, leg:0.35,rune:0.35,gold:[400,700],gratuit:true},
 {id:2,nom:'Argent',key:'silver',dlvl:10,waves:8, leg:0.60,rune:0.55,gold:[900,1500]},
 {id:3,nom:'Or',    key:'gold',  dlvl:15,waves:10,leg:1.00,rune:0.80,gold:[2000,3200]},
 /* ⚠ LE SCEAU EST LE PALIER OUVERT, ET SON `dlvl` TOMBE À ZÉRO.
    Il valait +20 niveaux : à 60, les échos sortaient à 80, et c'était LE mur
    de l'endgame — après lui, plus rien. Il ne monte donc plus le niveau, il
    monte le PALIER : PV ×1,17^palier, dégâts ×1,02337^palier, et le palier
    vaut toujours un cran au-dessus du meilleur jamais franchi. La
    progression devient infinie sans qu'aucun nombre ne soit à rallonger.
    Les trois premiers paliers gardent leur `dlvl` : ce sont les barreaux de
    l'échelle qui y mène, et les rééquilibrer n'était pas demandé. */
 {id:4,nom:'Sceau du Falcon',key:'gold',dlvl:0,waves:12,leg:1.00,rune:1.00,gold:[4000,6500],needFalcon:true,ouvert:true}
];
/* Le nom d'un palier et d'un modificateur d'arène, traduits. Les deux tables
   sont indexées par un identifiant (`id`) : la clé s'y adosse, jamais au
   libellé — c'est le cas simple du §36. */
function nomPalier(tier){ return tier?tOu('fosse.palier.'+tier.id, tier.nom):''; }
function nomModArene(m){ return (m&&m.nom)?tOu('fosse.mod.'+m.id, m.nom):''; }

/* ⚠ LE MODIFICATEUR DE VAGUE PASSE PAR ICI, ET PAR NULLE PART AILLEURS.
   « SPECTRAUX » ajoute `phys:+30`. Sur un « de Givre », dont toute la
   contrepartie est `phys:-15`, il rendait l'ennemi RÉSISTANT au corps à
   corps — c'est-à-dire immunisé contre la seule réponse que le joueur avait.
   Même défaut que le modificateur d'élite `Glacial` (§96), même correctif :
   la faiblesse est réappliquée après coup. */
function arenaAppliquerMod(e,mod){
  if(!e||!mod)return e;
  mod.apply(e);
  if(e._faiblesse)e.res=Object.assign({},e.res,e._faiblesse);
  return e;
}
const ARENA_MODS=[
 {id:'rapide',   nom:'ENNEMIS RAPIDES',   apply:e=>{e.spd*=1.55;}},
 {id:'blinde',   nom:'ENNEMIS BLINDÉS',   apply:e=>{e.hp=e.hpMax=Math.round(e.hpMax*1.6);}},
 {id:'enflamme', nom:'ENNEMIS ENFLAMMÉS', apply:e=>{e.dmg=Math.round(e.dmg*1.35);e.col='#ff7a3d';}},
 {id:'spectral', nom:'ENNEMIS SPECTRAUX', apply:e=>{e.res=Object.assign({},e.res,{phys:(e.res&&e.res.phys||0)+30});}},
 {id:'meute',    nom:'LA MEUTE',          apply:e=>{e.spd*=1.2;e.dmg=Math.round(e.dmg*1.1);},extra:0.6},
 {id:'sobriete', nom:'SOBRIÉTÉ FORCÉE',   apply:e=>{}, noPot:true},
 {id:'vampire',  nom:'ENNEMIS VAMPIRIQUES',apply:e=>{e.vamp=true;}},
 {id:'essaim',   nom:'ESSAIM',            apply:e=>{e.spd*=1.35;e.hp=e.hpMax=Math.round(e.hpMax*0.6);},extra:1.1},
 {id:'colosse',  nom:'COLOSSES',          apply:e=>{e.r=Math.round(e.r*1.4);e.hp=e.hpMax=Math.round(e.hpMax*2.2);e.spd*=0.75;e.dmg=Math.round(e.dmg*1.4);},extra:-0.45},
 {id:'gel',      nom:'MORSURE DU GEL',    apply:e=>{e.chill=true;}},
 {id:'aucun',    nom:'',                  apply:e=>{}}
];
/* boss jouables en arène : uniquement ceux déjà vaincus en campagne */
function arenaBossPool(){
  const p=[];
  for(let i=0;i<4;i++) if(bossCleared&&bossCleared[i]) p.push({act:i,kind:ACT_BOSSES[i].bkind,nom:tOu('ennemi.'+_cleObjet(ACT_BOSSES[i].name),ACT_BOSSES[i].name)});
  if(bossKilled) p.push({act:4,kind:'falcon',nom:'Green Falcon'});
  return p;
}
function arenaKeys(){ player.keys=player.keys||{bronze:0,silver:0,gold:0}; return player.keys; }

/* ── LES PALIERS DE LA FOSSE ──────────────────────────── phase 2, v9.45

   ⚠ LES QUATRE PALIERS MONTAIENT LE **NIVEAU** DES ÉCHOS (+5/+10/+15/+20), et
   c'était la mauvaise mécanique : elle butait sur le même mur que l'Enfer. Le
   héros est bloqué à 60 ; les échos montaient à 80 ; l'écart ne pouvait que
   devenir infranchissable, puis s'arrêter faute de cinquième palier.

   Le palier devient donc un **entier libre**, et il multiplie les **PV** —
   pas le niveau. C'est ce que fait Diablo III en haut de Faille, et le
   classeur donne les deux pentes :

     PV     × 1,17   par palier    (+17 %, ce qui se sent tout de suite)
     dégâts × 1,02337 par palier   (une pente dix fois plus douce)

   L'asymétrie n'est pas un oubli : c'est elle qui rend les hauts paliers
   LONGS plutôt que MORTELS. Un joueur qui monte trop haut n'est pas tué, il
   n'arrive pas à tuer — il redescend d'un palier, et il comprend pourquoi.

   ⚠ CONSÉQUENCE VOULUE : « L'ENFER PLAT » CESSE D'ÊTRE UN PROBLÈME. La
   progression infinie n'est plus dans les actes mais ici. On ne touche donc
   ni à `_over`, ni au niveau des monstres par acte. */
const FOSSE_PV_PALIER=1.17;
const FOSSE_DGT_PALIER=1.02337;

/* ⚠ UN PALIER ABSENT, NÉGATIF OU NON NUMÉRIQUE VAUT ZÉRO. Ces fonctions sont
   appelées depuis la fabrique d'ennemis, où le palier vient d'une sauvegarde
   qui peut dater d'avant la phase 2 : un `NaN` y multiplierait les PV par
   `NaN` et rendrait les échos immortels, en silence. */
function _palierSain(p){ const n=Number(p); return (isFinite(n)&&n>0)?n:0; }
function multFossePv(p){ return Math.pow(FOSSE_PV_PALIER, _palierSain(p)); }
function multFosseDgt(p){ return Math.pow(FOSSE_DGT_PALIER, _palierSain(p)); }

/* Le niveau d'un écho. Il ne dépend PLUS du palier — c'est tout l'objet de la
   phase 2 — mais la fonction existe pour que le contrôle porte sur un nom, et
   qu'une régression se voie au test plutôt qu'en jouant. */
function niveauFosse(niveauHeros){ return Math.max(1, niveauHeros); }

/* Le palier le plus haut jamais franchi, mémorisé. Il borne le rang de la
   gravure d'écho (phase 3) : c'est le CONTENU qui borne la puissance, pas un
   nombre écrit en dur. */
function noterPalierFosse(p){
  const n=_palierSain(p);
  if(n>(player.fossePalier||0))player.fossePalier=n;
  return player.fossePalier||0;
}
function arenaBanner(t,sub,dur){ARENA_BAN.t=dur||2.6;ARENA_BAN.txt=t;ARENA_BAN.sub=sub||'';}

/* ── LA BOUCLE D'ACCÈS À LA FOSSE ─────────────────────── phase 1, v9.45

   ⚠ ELLE NE SE FERMAIT PAS, ET TOUT L'ENDGAME REPOSAIT DESSUS. La Fosse
   CONSOMMAIT une clé à l'entrée et n'en rendait AUCUNE. Racheter chez Anselme
   coûte `prix × 1,8` par achat : la 8ᵉ clé d'or vaut 2,45 millions d'or. Une
   partie ne permettait donc qu'une dizaine de descentes au palier haut, après
   quoi l'endgame s'arrêtait — définitivement, et sans que rien ne le dise.

   Le principe retenu : **gagner entretient la boucle, perdre la consomme.**
   Le joueur compétent descend autant qu'il veut ; celui qui échoue paie. C'est
   la même économie que les clés de Faille de Diablo III, et elle a l'avantage
   d'être auto-régulée : la difficulté du palier borne le nombre de descentes,
   pas un compteur.

   Ces deux fonctions existent SÉPARÉMENT de `arenaEnter` et `arenaWin` pour
   une raison de mesure : la boucle se vérifie en la faisant tourner vingt fois
   d'affilée, ce qu'on ne peut pas faire en construisant vingt arènes. */
function payerEntree(tier){
  if(!tier)return false;
  if(tier.gratuit)return true;
  const K=arenaKeys();
  if((K[tier.key]||0)<=0)return false;
  K[tier.key]--;
  return true;
}
function recompenserCles(tier,gagne){
  if(!tier||!gagne)return 0;
  const K=arenaKeys();
  K[tier.key]=(K[tier.key]||0)+1;
  return 1;
}

/* ---- génération de la salle ---- */
/* ── LE RAYON DE LA FOSSE ────────────────────────────────────── v9.41

   Il valait 13, sur une grille de 33×33. Mirja : « on va agrandir la fosse,
   elle est trop petite, on va doubler le rayon ». 26, donc, sur 59×59 — la
   surface de sol passe de 531 à 2 124 cases, soit ×4.

   ⚠ LE RISQUE N'EST PAS LA TAILLE, C'EST LE RYTHME. Une arène quatre fois
   plus grande avec le même effectif paraît VIDE, et le joueur passe deux fois
   plus de temps à marcher pour trouver le prochain ennemi. Deux choses
   suivent donc le rayon, et doivent continuer de le suivre :

     · les points d'apparition passent de 8 à 23, sur DEUX anneaux — huit
       points sur un seul cercle à R-2 laisseraient tout le centre vide, et
       le joueur qui s'y tient ne verrait rien venir ;
     · l'effectif de vague est proportionnel à la surface (`effectifVague`).

   `test_fosse_geometrie` mesure la densité en ennemis pour 100 cases de sol,
   et la garde dans la plage qu'avait l'ancienne arène. */
const ARENE_RAYON=26;
/* Deux anneaux : le contour, et un cercle intérieur pour que le centre ne soit
   pas un refuge. Les pas sont différents pour que les deux couronnes ne
   s'alignent pas radialement — sinon les ennemis arrivent par colonnes. */
const ARENE_ANNEAUX=[{r:2, pas:24}, {r:0.45, pas:45}];

function buildArena(tier){
  const R=ARENE_RAYON, w=R*2+7, h=R*2+7, cx=(w>>1), cy=(h>>1);
  const grid=new Uint8Array(w*h).fill(T_WALL);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const dx=x-cx,dy=y-cy;
    if(dx*dx+dy*dy<=R*R)grid[idx(w,x,y)]=T_FLOOR;}
  const lvl={id:prochainLevelSeq(),kind:'arena',theme:'arena',depth:4,w,h,grid,
    enemies:[],drops:[],chests:[],entrances:[],npcs:[],shrines:[],breakables:[],caves:[],
    seen:new Uint8Array(w*h).fill(1),name:t('fosse.nomNiveau',{palier:nomPalier(tier)}),spawn:[cx,cy+R-2]};
  // motif : anneaux concentriques en texture B
  lvl.deco=new Uint8Array(w*h);
  /* Les anneaux de décor étaient à R-3 et R-7 : sur un rayon de 26 ils se
     retrouveraient collés au bord, avec un centre nu. On les répartit. */
  for(const rr of [Math.round(R*0.85),Math.round(R*0.55),Math.round(R*0.25)]) for(let a=0;a<360;a+=2){
    const x=Math.round(cx+Math.cos(a*Math.PI/180)*rr),y=Math.round(cy+Math.sin(a*Math.PI/180)*rr);
    if(grid[idx(w,x,y)]===T_FLOOR)lvl.deco[idx(w,x,y)]=1;}
  /* Le palier de CETTE descente. Sur le palier ouvert, on tente toujours un
     cran au-dessus de son meilleur : c'est ce qui rend la progression
     infinie sans écran de sélection ni compteur à saisir. */
  const palier=tier.ouvert?((player.fossePalier||0)+1):0;
  lvl.arena={tier,palier,wave:0,state:'intro',t:1.2,mod:null,spawnPts:[],bag:[],goldBag:0,cx,cy,R,chrono:0,potUsed:false};
  for(const an of ARENE_ANNEAUX){
    /* `r` ≥ 1 se lit « à `r` cases DU BORD » ; `r` < 1 se lit « à cette
       fraction du rayon ». Les deux formes coexistent parce que le contour
       se règle par rapport au mur et l'anneau intérieur par rapport au
       centre : les exprimer pareil obligerait à recalculer l'un des deux à
       chaque changement de rayon. */
    const rr=an.r>=1?(R-an.r):Math.round(R*an.r);
    for(let a=0;a<360;a+=an.pas){
      const x=Math.round(cx+Math.cos(a*Math.PI/180)*rr),y=Math.round(cy+Math.sin(a*Math.PI/180)*rr);
      lvl.arena.spawnPts.push([x,y]);}}
  return lvl;
}
/* ---- entrée / sortie ---- */
let arenaReturn=null;
function arenaEnter(tierId){
  const tier=ARENA_TIERS.find(t=>t.id===tierId); if(!tier)return;
  if(arenaBossPool().length===0){toast(t('fosse.pasDecho'),2.8);return;}
  /* ⚠ LE CONTRÔLE DE L'ÉCHO PASSE AVANT LE PAIEMENT. Il était après : la clé
     était déjà décomptée quand le refus tombait, et le joueur la perdait pour
     rien. Un seul chemin de sortie doit débiter, et c'est le dernier. */
  if(!payerEntree(tier)){toast(tDiff('fosse.pasDeCle',{palier:nomPalier(tier).toLowerCase()}),2.6);return;}
  arenaReturn={lvl:village,x:village.spawn[0]*TS+TS/2,y:village.spawn[1]*TS+TS/2};
  const a=buildArena(tier); closeAllPanels();
  enterLevel(a,a.spawn[0]*TS+TS/2,a.spawn[1]*TS+TS/2);
  arenaBanner(t('fosse.banniere',{palier:nomPalier(tier).toUpperCase()}),
              tier.ouvert?t('fosse.palierEchos',{n:(player.fossePalier||0)+1})
                        :t('fosse.niveauEchos',{n:tier.dlvl}),3.2);
  SFX.gate&&SFX.gate();refreshHud();
}
function arenaLeave(win){
  const A=level.arena; if(!A)return;
  if(win){ // butin définitivement acquis
    qc.arenaRuns=(qc.arenaRuns||0)+1;
    const tk='arenaT'+A.tier.id;qc[tk]=(qc[tk]||0)+1;
    if(A.tier.id===3&&!A.potUsed)qc.arenaNoPot=(qc.arenaNoPot||0)+1;
    for(const it of A.bag)if(it.rarity==='legendary')qc.legendary=(qc.legendary||0)+1;
    checkQuests&&checkQuests();
    {let _f=0;for(const it of A.bag){
       if(autoDemonter(it)){_f+=demonterAuto(it);continue;}
       if(!sacPlein(it))inventory.push(it); else stash.push(it); }
     if(_f)toast(t('fosse.autoDemontage',{n:_f}),2);}
    player.gold+=A.goldBag;
    toast(t('fosse.vaincue',{n:A.bag.length,or:A.goldBag}),3.4);
    setTimeout(()=>toast(motAnselme('victoire'),4.2),900);
  } else {
    toast(t('fosse.butinPerdu'),3.2);
    setTimeout(()=>toast(motAnselme('defaite'),4.2),900);
  }
  const r=arenaReturn||{lvl:village,x:village.spawn[0]*TS+TS/2,y:village.spawn[1]*TS+TS/2};
  arenaReturn=null; const st=P(); player.hp=st.hpMax; player.mp=st.mpMax;
  player.dying=false;player.dyingT=0;player.anim='Idle';player.animOnce=false;
  enterLevel(r.lvl,r.x,r.y); refreshHud(); renderInventory();
}
/* ---- boucle des vagues ---- */
function arenaUpdate(dt){
  const A=level.arena; if(!A)return;
  if(A.state==='fight'||A.state==='pause')A.chrono+=dt;
  if(A.state==='intro'||A.state==='pause'){
    A.t-=dt; if(A.t<=0)arenaStartWave();
    return;
  }
  if(A.state==='fight'){
    const reste=level.enemies.filter(e=>!e.dying).length;
    if(reste===0){
      if(A.wave>=A.tier.waves){arenaWin();}
      else{A.state='pause';A.t=3.0;arenaBanner(t('fosse.vagueNettoyee',{n:A.wave}),t('fosse.souffle'),2.2);}
    }
  }
}
/* ⚠ LA FOSSE POSAIT SES ENNEMIS DANS LE MUR.                       (v9.16)

   Signalé par Mirja en jouant. La dispersion était `rand(-2,2)` en x ET en y
   autour d'un point d'apparition, SANS AUCUN CONTRÔLE de praticabilité. Or
   l'arène est un disque de rayon R=13 et les huit points sont à R-2 = 11 :
   √(13² + 2²) ≈ 13,15 tombe hors du disque. Ce n'était pas un risque, c'était
   de l'arithmétique — mesuré : 11 ennemis sur 93, soit 11,8 %.

   LES ACTES N'AVAIENT PAS CE DÉFAUT parce qu'ils tirent dans `rf`, la liste
   des cases de SOL réelles. La Fosse retrouve ici la même garantie : on
   n'accepte qu'une case praticable, et à défaut on retombe sur le point
   d'apparition lui-même, qui est sur du sol par construction. */
const ARENE_DISPERSION=2, ARENE_ESSAIS=8;
function _arenePosePropre(sp){
  for(let k=0;k<ARENE_ESSAIS;k++){
    const tx=sp[0]+Math.round(rand(-ARENE_DISPERSION,ARENE_DISPERSION));
    const ty=sp[1]+Math.round(rand(-ARENE_DISPERSION,ARENE_DISPERSION));
    if(tx>=0&&ty>=0&&tx<level.w&&ty<level.h&&walkableCode(level.grid[idx(level.w,tx,ty)]))
      return [tx*TS+TS/2, ty*TS+TS/2];
  }
  return [sp[0]*TS+TS/2, sp[1]*TS+TS/2];
}

/* L'EFFECTIF D'UNE VAGUE, RAPPORTÉ À LA SURFACE.

   Il valait `5 + vague×2`, calibré sur un disque de rayon 13 — 531 cases de
   sol. Le laisser tel quel dans une arène quatre fois plus grande, c'était
   garantir une Fosse vide : 7 ennemis pour 2 124 cases, le joueur marche plus
   qu'il ne se bat.

   La formule d'origine est donc conservée telle quelle et multipliée par le
   rapport des surfaces. `test_fosse_geometrie` vérifie que la densité — en
   ennemis pour 100 cases de sol — reste dans la plage de l'ancienne arène.

   ⚠ CE N'EST PAS UN NOMBRE MAGIQUE DE PLUS : 13 est le rayon d'ORIGINE, celui
   sur lequel la formule a été calibrée. Le jour où le rayon rebouge, l'effectif
   suit tout seul. */
const ARENE_RAYON_CALIBRE=13;
function effectifVague(wave){
  const f=(ARENE_RAYON*ARENE_RAYON)/(ARENE_RAYON_CALIBRE*ARENE_RAYON_CALIBRE);
  return Math.round((5+wave*2)*f);
}

function arenaStartWave(){
  const A=level.arena; A.wave++; A.state='fight';
  const last=(A.wave>=A.tier.waves);
  const mod=last?ARENA_MODS.find(m=>m.id==='aucun'):pick(ARENA_MODS);
  A.mod=mod; A.noPot=!!mod.noPot;
  const L=Math.max(1,player.lvl+A.tier.dlvl);
  /* ⚠ LE PALIER S'APPLIQUE APRÈS LA FABRIQUE, PAS DEDANS. `makeEnemy` et
     `makeActBoss` servent tout le jeu ; y faire entrer une notion propre à
     la Fosse les rendrait dépendants d'un état d'arène. On multiplie donc
     ici, sur l'ennemi déjà né — et `hpMax` avec `hp`, sinon la barre de vie
     part pleine sur un maximum qui ne l'est pas. */
  const mPv=multFossePv(A.palier), mDg=multFosseDgt(A.palier);
  const marquer=e=>{ if(!e)return e;
    e.hpMax=Math.round(e.hpMax*mPv); e.hp=e.hpMax;
    e.dmg=Math.round(e.dmg*mDg); return e; };
  if(last){ // GIGA-BOSS
    const pool=arenaBossPool(); const b=pick(pool);
    const [px,py]=[A.cx,A.cy];
    const mult=[0,1,1.6,2.4][A.tier.id]||1.6;
    let boss;
    if(b.kind==='falcon')boss=makeEnemy('falcon',px*TS+TS/2,py*TS+TS/2,4,L);
    else boss=makeActBoss(b.act,px*TS+TS/2,py*TS+TS/2,L);
    boss.hpMax=boss.hp=Math.round(boss.hp*mult*2.2);
    boss.dmg=Math.round(boss.dmg*(1+0.18*A.tier.id));
    boss.r=Math.round(boss.r*1.25); boss.xp=Math.round(boss.xp*2);
    /* ⚠ CE NOM EST COMPOSÉ À LA NAISSANCE (§45), mais l'écho ne survit pas à
     un changement de langue : il meurt avec le run. On le compose donc ici,
     dans la langue du moment, ce qui suffit. */
  boss.name=t('fosse.echoDe',{nom:(b.nom||'').toUpperCase()}); boss.arenaBoss=true; boss.aggro=true;
    for(let k=0;k<A.tier.id;k++)makeElite(boss);
    level.enemies.push(boss); level.boss=boss;
    arenaBanner(t('fosse.vagueFinale'),t('fosse.echoSeLeve',{nom:boss.name}),3.4);
    SFX.levelup&&SFX.levelup();
    return;
  }
  const n=Math.round(effectifVague(A.wave)*(1+(mod.extra||0)));
  /* ⚠ LA FOSSE PEUPLAIT SES VAGUES TOUTE SEULE.                    (v9.59)
     Elle tirait dans les cinq espèces ordinaires et n'appelait ni
     `tirerVariante` ni `tirerTireur` : tout le chantier élémentaire
     s'arrêtait à la porte de l'arène — c'est-à-dire précisément là où le
     joueur passe sa fin de partie. Signalé par Mirja.

     ⚠ ET LES TIREURS Y SONT PLAFONNÉS PLUS SÉVÈREMENT QU'EN DONJON. Dans un
     acte on contourne un tireur ; dans une arène fermée on le prend de face.
     Une vague pleine de tireurs, c'est un peloton d'exécution. */
  let tireurs=0;
  for(let i=0;i<n;i++){
    const sp=pick(A.spawnPts);
    const [x,y]=_arenePosePropre(sp);
    const r=alea();
    let kind = r<0.22?'imp' : r<0.46?'wraith' : r<0.68?'shade' : r<0.87?'brute' : 'golem';
    if(tireurs<FOSSE_TIREURS_MAX && tireurs<n*FOSSE_TIREUR_PART_MAX
       && alea()<FOSSE_TIREUR_PART){
      const _t=tirerTireurFosse();
      if(_t){kind=_t;tireurs++;}
    }
    const e=marquer(makeEnemy(kind,x,y,4,L));
    /* La part de variantes monte avec le palier : la Fosse est l'après-jeu,
       l'acte 5 en porte déjà 36 %. */
    if(alea()<FOSSE_VARIANTE_BASE+FOSSE_VARIANTE_PALIER*A.tier.id)
      appliquerVariante(e,randi(0,VARIANTES.length-1));
    arenaAppliquerMod(e,mod); e.aggro=true;
    if(alea()<0.10+0.05*A.tier.id)makeElite(e);
    level.enemies.push(e);
  }
  arenaBanner('VAGUE '+A.wave+' / '+A.tier.waves, mod.nom, 2.6);
  if(A.wave===1||A.wave%3===0)setTimeout(()=>toast(motAnselme('vague',randi(0,ANSELME.vague.length-1)),3),700);
}
function arenaTime(s){const m=Math.floor(s/60),r=Math.floor(s%60);return m+':'+String(r).padStart(2,'0');}
function drawArenaHud(){const A=level.arena;if(!A)return;
  ctx.save();ctx.textAlign='center';ctx.font='bold 15px Trebuchet MS';
  ctx.fillStyle='rgba(6,8,14,0.55)';ctx.fillRect(W/2-130,8,260,26);
  ctx.fillStyle='#ffd0a8';ctx.fillText('🔥 '+A.tier.nom+'  ·  vague '+Math.max(1,A.wave)+'/'+A.tier.waves+'  ·  '+arenaTime(A.chrono),W/2,26);
  const b=(player.arenaBest||{})['t'+A.tier.id];
  if(b!=null){ctx.font='11px Trebuchet MS';ctx.fillStyle='#8ea0c8';ctx.fillText('meilleur : '+arenaTime(b),W/2,44);}
  ctx.textAlign='left';ctx.restore();}
function arenaWin(){
  const A=level.arena; A.state='reward';
  const T=A.tier;
  /* La clé rendue AVANT le butin : c'est elle qui referme la boucle, et elle
     ne doit dépendre d'aucun tirage. */
  recompenserCles(T,true);
  /* Et le palier franchi devient le nouveau plancher — c'est lui qui bornera
     le rang de la gravure d'écho (phase 3). */
  if(T.ouvert)noterPalierFosse(A.palier);
  A.goldBag+=randi(T.gold[0],T.gold[1]);
  /* ── LE SCELLÉ ─────────────────────────────────── phase 4, v9.47
     Notre Primal : un légendaire dont tous les affixes sont au maximum. Il ne
     dépasse aucun plafond — il le garantit. Son taux dépend du PALIER franchi,
     donc il est nul hors de la Fosse et croît avec elle : c'est ce qui en fait
     une raison de redescendre, et non un palier de puissance de plus.

     ⚠ IL REMPLACE LE LÉGENDAIRE, IL NE S'AJOUTE PAS. S'ajouter aurait doublé
     le butin des hauts paliers en même temps qu'il l'améliore, et l'économie
     mesurée serait partie à la dérive sans que rien ne le dise. */
  if(alea()<T.leg){
    const scel=alea()<tauxScelle(player.fossePalier);
    const piece=scel?makeGear(pick(ENS_SLOTS.concat(['amulet','ring'])),'legendary',
                              Math.max(1,player.lvl),{scelle:true})
                    :makeItem('legendary');
    if(piece)A.bag.push(piece);
  }
  else A.bag.push(makeItem('unique'));
  /* AU PLAFOND, LA FOSSE RECRACHE DES PIÈCES D'ENSEMBLE, et elle en est la
     SEULE source : les ensembles sont la récompense de l'après-campagne, pas
     une étape de plus dedans. La Fosse gagne ainsi un second rôle, après
     celui de fournir les derniers paliers de parangon. */
  if(player.lvl>=ENS_NIVEAU&&alea()<T.leg*ENS_CHANCE){
    const pe=pieceEnsembleAuHasard(player.lvl);
    if(pe)A.bag.push(pe);
  }
  if(alea()<T.rune)A.bag.push(makeHighRune());
  if(alea()<0.5)A.bag.push(makeItem('rare'));
  player.arenaBest=player.arenaBest||{};
  const k='t'+T.id, prev=player.arenaBest[k];
  if(prev==null||A.chrono<prev){player.arenaBest[k]=A.chrono;A.record=true;}
  const cx=A.cx,cy=A.cy;
  {const _c=poserObjet(level,cx,cy,{opened:false,depth:4,arena:true},4);if(_c)level.chests.push(_c);}
  arenaBanner(A.record?t('fosse.record',{t:arenaTime(A.chrono)}):t('fosse.aToi'),
    t('fosse.temps',{t:arenaTime(A.chrono)}),3.8);
}
/* ---- runes hautes (exclusives arène) ---- */
const HIGH_RUNES=[
 {name:'Rune Vael',  t:'dmgpct',v:34,img:'rune_hi1'},
 {name:'Rune Tarn',  t:'crit',  v:18,img:'rune_hi2'},
 {name:'Rune Sköll', t:'dmg',   v:26,img:'rune_hi3'},
 {name:'Rune Orim',  t:'def',   v:40,img:'rune_hi4'},
 {name:'Rune Nyx',   t:'leech', v:6, img:'rune_hi5'},
 {name:'Rune Vhal',  t:'vit',   v:22,img:'rune_hi6'}
];
/* ── LA GRAVURE D'ÉCHO ──────────────────────────────── phase 3, v9.46

   On consume une haute rune dans une pièce ; la gravure porte un RANG, et son
   effet vaut `valeur de base × rang` (l'application est dans `_pEquipement`).

   ⚠ LE RANG EST BORNÉ PAR LE PALIER DE FOSSE FRANCHI, jamais par un nombre
   écrit en dur. C'est ce qui relie la phase 3 à la phase 2 : pour graver au
   rang 8, il faut avoir battu le palier 8. Sans ce couplage, la gravure
   deviendrait une monnaie qu'on accumule hors de la Fosse, et le palier
   ouvert n'aurait plus d'objet.

   Anselme le dit déjà : « quand tu tues une créature de la Faille, elle ne
   meurt pas vraiment. Il en reste un écho, et cet écho, la Fosse sait le
   rappeler. » */
function rangGravureMax(){ return Math.max(0, Math.floor(player.fossePalier||0)); }

/* Grave `rune` dans `piece`. Rend `true` si c'est fait.

   ⚠ RIEN N'EST CONSOMMÉ AVANT QUE TOUT SOIT VALIDE. Quatre refus possibles —
   pas de rang, pas de rune, pas une HAUTE rune, pièce déjà gravée — et chacun
   doit laisser le sac intact. Une rune détruite par un refus serait une perte
   sèche, irrattrapable, et le joueur ne saurait même pas pourquoi. */
function graver(piece,rune){
  const rang=rangGravureMax();
  if(!piece||piece.gravure||rang<=0)return false;
  if(!rune||rune.kind!=='rune'||!rune.sock||rune.tier!==2)return false;
  const i=inventory.indexOf(rune);
  if(i<0)return false;
  inventory.splice(i,1);
  piece.gravure={t:rune.sock.t, v:rune.sock.v, rang:rang, nom:rune._base||rune.name};
  try{saveGame();}catch(e){}
  return true;
}

function makeHighRune(){const r=pick(HIGH_RUNES);
  return {uid:prochainUidCounter(),slot:'gem',kind:'rune',name:r.name,_base:r.name,tier:2,ico:'ᛟ',rarity:'unique',img:r.img,plus:0,affixes:[],sock:{t:r.t,v:r.v}};}

/* La voix d'Anselme. Le français reste ici — c'est de la donnée, indexée par
   rôle et par palier — et seul l'anglais entre au dictionnaire (§36). */
function motAnselme(cle,i){
  const brut=(i==null)?ANSELME[cle]:(ANSELME[cle]||[])[i];
  return tOu('anselme.'+cle+(i==null?'':'.'+i), brut||'');
}
const ANSELME={
 sansCle:'« Pas de clé, pas de Fosse. Va la chercher sur un lieutenant du Falcon — ils en portent tous une. »',
 tier:['','« Bronze. Cinq niveaux au-dessus de toi. C’est l’échauffement, et l’échauffement tue les prétentieux. »','« Argent. Dix niveaux au-dessus. À partir d’ici, on ne parle plus d’entraînement. »','« Or. Quinze niveaux au-dessus. J’ai vu des hommes plus solides que toi ressortir en pleurant. Vas-y quand même. »','« Le Sceau du Falcon. Vingt niveaux. Tu as tué le démon : montre-moi que ce n’était pas un coup de chance. »'],
 vague:['« Ils arrivent. Garde les pieds, gamin. Toujours les pieds. »','« Ne recule pas vers le mur, c’est là qu’on meurt. »','« Respire. Frappe. Recommence. »','« Neuf ans, j’ai fait ça. Neuf ans. Tiens bon. »'],
 victoire:'« … Neuf ans que j’attendais de voir quelqu’un faire ça. Prends ton dû, capitaine. »',
 defaite:'« Debout. La Fosse ne garde personne — plus jamais. Tu as perdu ta prise, pas ton honneur. Recommence. »'
};
/* ---- menu du portail : choix du palier ---- */
/* L'en-tête de la Fosse : les échos disponibles, le mot d'Anselme, les clés. */
function _areneEntete(body, K, pool){
  const head=document.createElement('div');
  head.style.cssText='font-size:12px;color:#ffd0a8;margin-bottom:8px;line-height:1.45';
  head.innerHTML='<b style="font-size:14px">🔥 LA FOSSE</b><br>'+
    (pool.length?t('fosse.echosDispo',{liste:pool.map(p=>p.nom).join(', ')}):
     '<span style="color:#ff8a8a">'+t('fosse.aucunEcho')+'</span>')+
    '<br><i style="color:#c9b8a8">'+((K.bronze||0)+(K.silver||0)+(K.gold||0)?'':motAnselme('sansCle'))+'</i><br>'+
    t('fosse.cles',{b:(K.bronze||0),a:(K.silver||0),o:(K.gold||0)});
  body.appendChild(head);
}

/* Les paliers. Un palier s'ouvre s'il reste une clé de sa couleur, qu'un écho
   existe, et — pour le dernier — que le Falcon soit tombé. */
function _arenePaliers(body, K, pool){
  /* ⚠ CINQUIÈME `t` DE BOUCLE de ce chantier. Renommé `tr` avant d'appeler
     la traduction — sinon `t('fosse.palierBouton')` serait allé chercher un
     champ dans un objet de palier. */
  for(const tr of ARENA_TIERS){
    const has=(K[tr.key]||0)>0 && pool.length>0 && (!tr.needFalcon||bossKilled);
    const b=document.createElement('button');
    b.textContent=(has?'⚔ ':'🔒 ')+t('fosse.palierBouton',
      {nom:nomPalier(tr),niv:tr.dlvl,vagues:tr.waves});
    b.title=motAnselme('tier',tr.id);
    b.style.cssText='pointer-events:auto;display:block;width:100%;text-align:left;font-size:13px;padding:9px 12px;margin-bottom:6px;border-radius:6px;border:1px solid '+(has?'#a8541f':'#3a4a72')+';background:'+(has?'#2a1610':'#0e1424')+';color:'+(has?'#ffd0a8':'#6b789c')+';cursor:'+(has?'pointer':'default');
    b.disabled=!has;
    b.onclick=(function(id){return ()=>{closeAllPanels();arenaEnter(id);};})(tr.id);
    body.appendChild(b);
  }
}

/* MARCHÉ DES CLÉS — le second puits d'or profond. Une clé s'arrache
   normalement à un lieutenant du Falcon ; Anselme accepte d'en céder contre
   de l'or, à un prix qui monte à chaque achat du même palier. L'or dormant
   achète enfin du contenu. */
function _areneMarcheCles(body){
  const secK=document.createElement('div');
  secK.style.cssText='margin-top:12px;padding-top:10px;border-top:1px solid #3a2f10;font-size:12px;color:#ffd0a8';
  secK.innerHTML='<b>'+t('fosse.marche')+'</b><br><span style="color:#c9b8a8;font-size:11px">'+t('fosse.marche.mot')+'</span>';
  body.appendChild(secK);
  /* ⚠ CETTE BOUCLE S'APPELAIT `t` ET MASQUAIT LA TRADUCTION. Quatrième fois
     dans ce chantier — `renderQuests`, les onglets de boutique, la lecture de
     code, et ici. C'est un nom trop court pour une variable de boucle dès
     lors qu'une fonction du même nom est importée partout. */
  for(const tr of ARENA_TIERS){
    const c=prixCle(tr.key);
    const b=document.createElement('button');
    b.innerHTML=t('fosse.cleBouton',{palier:nomPalier(tr).toLowerCase()})+' <span class="gi"></span>'+nb(c);
    b.style.cssText='pointer-events:auto;display:block;width:100%;text-align:left;font-size:12px;padding:8px 12px;margin-top:6px;border-radius:6px;border:1px solid #3a4a72;background:#0e1424;color:#cdd6e6;cursor:pointer';
    b.disabled=player.gold<c;
    if(b.disabled)b.style.opacity='.45';
    b.onclick=(function(k,cout){return ()=>{
      if(player.gold<cout)return;
      player.gold-=cout;const KK=arenaKeys();KK[k]=(KK[k]||0)+1;
      player.clesAchetees=player.clesAchetees||{};player.clesAchetees[k]=(player.clesAchetees[k]||0)+1;
      toast(t('fosse.cleAchetee',{or:nb(cout)}),2);SFX.gold&&SFX.gold();
      refreshHud();saveGame();openArena();};})(t.key,c);
    body.appendChild(b);
  }
}

function openArena(){
  closeAllPanels();
  const K=arenaKeys(), pool=arenaBossPool();
  const body=document.getElementById('wpBody'); body.innerHTML='';
  _areneEntete(body,K,pool);
  _arenePaliers(body,K,pool);
  _areneMarcheCles(body);
  const note=document.createElement('div');
  note.style.cssText='font-size:11px;color:#8ea0c8;margin-top:8px;line-height:1.4';
  note.textContent=t('fosse.note');
  body.appendChild(note);
  SFX.panneau&&SFX.panneau(true);
  document.getElementById('waypointPanel').style.display='block';
  if(typeof majPausePanneau==='function')majPausePanneau();
  if(typeof updateTabs==='function')updateTabs();
}
/* ---- annonce plein écran des vagues ---- */
/* Taille de police qui tient dans la largeur disponible.
   Les 62 px fixes débordaient de l'écran dès qu'un titre était long :
   « GARDIEN DU REPAIRE — REMOUS » sortait des deux côtés sur téléphone.
   On part d'une taille proportionnelle à l'écran, puis on rétrécit
   tant que le texte dépasse. */
function taillePourLargeur(txt,ideale,maxLarg,mini){
  let t=Math.max(mini,Math.round(ideale));
  for(let i=0;i<26;i++){
    ctx.font='bold '+t+'px Trebuchet MS';
    if(ctx.measureText(txt).width<=maxLarg||t<=mini)break;
    t--;
  }
  return t;
}
/* Sonde de mesure : rejoue le calcul de mise en page de la bannière sans
   rien dessiner, pour que les tests puissent vérifier qu'elle tient à
   l'écran à n'importe quelle taille. */
function mesureBanniere(){
  const S=Math.min(W,H*1.9), maxL=W*0.90;
  const t1=taillePourLargeur(ARENA_BAN.txt,Math.min(62,S*0.052),maxL,15);
  const t2=ARENA_BAN.sub?taillePourLargeur(ARENA_BAN.sub,Math.min(30,t1*0.50),maxL,11):0;
  const hBan=t1*1.5+(t2?t2*1.7:0)+18;
  const yBan=Math.max(H*0.26,H*0.42-hBan/2);
  ctx.font='bold '+t1+'px Trebuchet MS';
  const lt=ctx.measureText(ARENA_BAN.txt).width;
  return {t1:t1,t2:t2,largeurTitre:lt,haut:yBan,bas:yBan+hBan};
}
function drawArenaBanner(){
  if(!(ARENA_BAN.t>0))return;
  const a=Math.min(1,ARENA_BAN.t/0.45);
  /* Échelle : la plus petite des deux dimensions commande. En paysage sur
     téléphone, H est le facteur limitant ; sur PC c'est W. */
  const S=Math.min(W,H*1.9);
  const maxL=W*0.90;
  const t1=taillePourLargeur(ARENA_BAN.txt,Math.min(62,S*0.052),maxL,15);
  const t2=ARENA_BAN.sub?taillePourLargeur(ARENA_BAN.sub,Math.min(30,t1*0.50),maxL,11):0;
  /* Le bandeau se dimensionne sur le texte, plus sur un pourcentage fixe. */
  const hBan=t1*1.5+(t2?t2*1.7:0)+18;
  const yBan=Math.max(H*0.26,H*0.42-hBan/2);
  ctx.save();ctx.globalAlpha=a;ctx.textAlign='center';ctx.textBaseline='alphabetic';
  ctx.fillStyle='rgba(6,8,14,0.72)';ctx.fillRect(0,yBan,W,hBan);
  ctx.fillStyle='#ff8a3d';ctx.shadowBlur=Math.round(t1*0.35);ctx.shadowColor='#ff5a1f';
  ctx.font='bold '+t1+'px Trebuchet MS';ctx.fillText(ARENA_BAN.txt,W/2,yBan+t1*1.15);
  ctx.shadowBlur=0;
  if(t2){ctx.fillStyle='#ffd6b0';ctx.font='bold '+t2+'px Trebuchet MS';
    ctx.fillText(ARENA_BAN.sub,W/2,yBan+t1*1.5+t2*1.1);}
  ctx.textAlign='left';ctx.restore();
}

/* CE QUI S'EXÉCUTE AU CHARGEMENT — sorti du premier niveau.

   Le module ne fait plus que DÉCLARER. Ses actions de chargement sont
   appelées par l'entrée, dans l'ordre des préfixes, ce qui rend l'ordre
   d'évaluation des modules INDIFFÉRENT — sans quoi la conversion en
   modules ES les remettrait dans un ordre imprévisible. */
function _demarrer12(){
  /* boutons d'action tactiles (potions, portails, pause) */
  (function(){
    const tap=(id,fn)=>{const el=document.getElementById(id);if(!el)return;
      el.addEventListener('click',e=>{e.preventDefault();if(!running)return;fn();});
      el.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();if(!running)return;fn();},{passive:false});};
    tap('abPot',()=>usePotion());
    tap('abMana',()=>useManaPotion());
    tap('abPortal',()=>usePortal());
    /* Le bouton Pause a disparu : l'onglet Options assure les deux rôles, et la
       case libérée est celle où viendra le joystick. La touche P reste active. */
    const _rh=refreshHud;setRefreshHud(function(){_rh.apply(this,arguments);
      const a=document.getElementById('abPotN'),b=document.getElementById('abManaN'),c=document.getElementById('abPortalN');
      try{const K=player.keys||{},el=document.getElementById('keyLine');
        if(el)el.textContent=((K.bronze||0)+(K.silver||0)+(K.gold||0))?('🗝️ '+(K.bronze||0)+' / '+(K.silver||0)+' / '+(K.gold||0)):'';}catch(e){}
      if(a)a.textContent=player.potions;if(b)b.textContent=player.manaPots;if(c)c.textContent=player.portals||0;});
  })();
}



