
















/* ================================================================
   BALISES — pourquoi elles disparaissaient

   Une balise n'était « débloquée » que si level.seen[sa case] valait 1.
   Or `seen` vit sur l'objet de niveau, que rien ne sauvegarde : les actes
   sont régénérés à chaque lancement. Quitter le jeu effaçait donc toutes
   les balises.
   Et même en mémoire, la liste des balises d'un acte n'était affichée que
   si on se trouvait DÉJÀ dans cet acte. Après une mort on réapparaît au
   village : plus aucune balise n'était proposée, seulement « Acte 1 », qui
   ramène à l'entrée. C'est le symptôme décrit — la balise 2 « disparue ».

   Le déblocage est maintenant un fait explicite et sauvegardé :
   player.balises = { numéroActe: [indices débloqués] }.
   L'ordre des balises dans un acte est fixe (0 Entrée, 1 à 30 %, 2 à 60 %,
   3 à 90 %, 4 pré-boss), donc l'indice reste valable même si la carte est
   régénérée. Une balise débloquée l'est DÉFINITIVEMENT.
   ================================================================ */
const BALISES_PAR_ACTE=5;
function _surBalise(bi){
  if(!level||!level.npcs)return false;
  const np=level.npcs.find(x=>x.type==='waypoint'&&x.bi===bi);
  return !!np&&dist(player.x,player.y,np.tx*TS+TS/2,np.ty*TS+TS/2)<TS*1.6;
}
function balisesActe(a){
  if(!player.balises)player.balises={};
  if(!player.balises[a])player.balises[a]=[];
  return player.balises[a];
}
function baliseDebloquee(a,bi){ return balisesActe(a).indexOf(bi)>=0; }
function debloquerBalise(a,bi,silencieux){
  if(a==null||bi==null)return false;
  const L=balisesActe(a);
  if(L.indexOf(bi)>=0)return false;
  L.push(bi); L.sort((x,y)=>x-y);
  if(!silencieux){SFX.balise&&SFX.balise();toast(t('balise.debloquee',{n:bi+1}),2.6);}
  saveGame();
  return true;
}
/* Rattrapage : toute balise dont la case est déjà explorée compte comme
   débloquée. Sans ça, une partie en cours perdrait ce qu'elle avait acquis
   avant cette version. */
function recolterBalisesVues(){
  if(!level||level.kind!=='act'||!level.npcs)return;
  const a=level.actNum;
  for(const np of level.npcs){
    if(np.type!=='waypoint'||np.bi==null)continue;
    if(level.seen[idx(level.w,np.tx,np.ty)]===1)debloquerBalise(a,np.bi,true);
  }
}
/* Se rendre à une balise, depuis n'importe où. */
function allerBalise(a,bi){
  if(!baliseDebloquee(a,bi))return false;
  if(!(level&&level.kind==='act'&&level.actNum===a))enterAct(a);
  const np=(level.npcs||[]).find(x=>x.type==='waypoint'&&x.bi===bi);
  const cible=np||(level.npcs||[]).find(x=>x.type==='waypoint');
  if(cible){
    player.x=cible.tx*TS+TS/2;player.y=cible.ty*TS+TS/2;
    player.path=null;player.attackTarget=null;setTravelLock(0.4);
    /* La case d'arrivée doit être visible, sinon on atterrit dans le noir. */
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
      const X=cible.tx+dx,Y=cible.ty+dy;
      if(X>=0&&Y>=0&&X<level.w&&Y<level.h){level.seen[idx(level.w,X,Y)]=1;if(typeof salirDalle==='function')salirDalle(X,Y);}}
  }
  refreshHud();
  return true;
}
/* ================================================================
   LA BALISE — UN REPLI PAR ACTE, LE PLUS LOIN EN TÊTE        (v9.06)

   La liste était plate : le village, puis les actes, puis TOUTES les balises
   de tous les actes, dans l'ordre où elles avaient été posées — donc Entrée,
   30 %, 60 %… Sur téléphone, la balise la plus utile, la plus profonde, était
   la dernière et sortait de l'écran.

   Demandé par Mirja, et c'est le bon sens : ce qu'on veut atteindre depuis une
   balise, c'est l'endroit le plus avancé du monde. Chaque acte est donc un
   volet. Replié — l'état par défaut — il ne montre QUE sa balise la plus
   profonde. Le déplier donne les autres, de la plus profonde à l'entrée.
   ================================================================ */
let _wpDeplie={};                 /* acte -> déplié ? mémorisé le temps de la partie */
function openWaypoint(){
  closeAllPanels();
  _wpRendre();
  SFX.panneau&&SFX.panneau(true);
  document.getElementById('waypointPanel').style.display='block';
  if(typeof majPausePanneau==='function')majPausePanneau();
  if(typeof updateTabs==='function')updateTabs();
}
/* Le rendu est séparé de l'ouverture : déplier un volet le rejoue sans
   refermer le panneau ni rejouer le son d'ouverture. */
/* Le style commun de toutes les lignes du panneau des balises. Il était
   recopié dans les deux fabriques de boutons. */
const WP_BOUTON_BASE='pointer-events:auto;text-align:left;font-size:13px;padding:8px 12px;border-radius:6px;border:1px solid #3a4a72;color:#cdd6e6;';
const WP_NOMS_BALISE=['Entrée','30 %','60 %','90 %','pré-boss'];
/* Le rang d'une balise, traduit. « Entrée » et « pré-boss » sont des mots,
   « 30 % » n'en est pas un — le dictionnaire les porte tous les cinq quand
   même, pour que la liste reste une liste. */
function nomRangBalise(bi){ return tOu('balise.rang.'+bi, WP_NOMS_BALISE[bi]||'?'); }

/* Une destination : village, balise, entrée d'acte. Désactivée quand on y est
   déjà — d'où le « (ici) ». */
function _wpBouton(body, label, fn, cur, retrait){
  const b=document.createElement('button');
  b.textContent=label+(cur?' (ici)':'');
  b.disabled=!!cur;
  b.style.cssText=WP_BOUTON_BASE+'background:'+(cur?'#16203a':'#0e1424')
    +';cursor:'+(cur?'default':'pointer')
    +(retrait?';margin-left:16px':'');
  b.onclick=()=>{closeAllPanels();fn();};
  body.appendChild(b);return b;
}

/* L'en-tête d'acte ne voyage pas : il ouvre et referme son volet. Le voyage
   vers l'entrée de l'acte reste une ligne à part, sinon on perdrait la
   seule façon d'y aller quand aucune balise n'y est encore débloquée. */
function _wpVolet(body, label, a, nb){
  const b=document.createElement('button');
  b.textContent=(_wpDeplie[a]?'▾ ':'▸ ')+label+(nb>0?'   ('+nb+')':'');
  b.style.cssText=WP_BOUTON_BASE+'background:#111a2e;border-color:#4a5c8c;color:#e8ecf6;font-weight:bold;cursor:pointer;margin-top:6px';
  b.onclick=()=>{_wpDeplie[a]=!_wpDeplie[a];_wpRendre();};
  body.appendChild(b);return b;
}

/* Le nom d'une balise. On préfère celui de la SALLE où elle se trouve, lu sur
   le PNJ quand on est dans l'acte, sinon dans la table des salles. Faute des
   deux, on retombe sur son rang. */
function _wpNomBalise(a, bi){
  let n=null;
  if(level.kind==='act'&&level.actNum===a&&level.npcs){
    const _b=level.npcs.find(x=>x.type==='waypoint'&&x.bi===bi);
    if(_b&&_b.salle)n=_b.salle;
  }
  if(!n&&typeof SALLES_PAR_ACTE!=='undefined'&&SALLES_PAR_ACTE[a]&&SALLES_PAR_ACTE[a][bi])
    n=SALLES_PAR_ACTE[a][bi].nom;
  return n?nomSalle(n)+'  ·  '+nomRangBalise(bi)
          :t('balise.rangDefaut',{n:bi+1,rang:nomRangBalise(bi)});
}

/* Le bloc d'un acte : son volet, puis ses balises. */
function _wpActe(body, a){
  /* De la plus profonde à l'entrée : c'est l'ordre dans lequel on cherche. */
  const L=balisesActe(a).slice().sort((x,y)=>y-x);
  _wpVolet(body,t('balise.acte',{n:a+1,nom:nomActe(a,false)}), a, L.length);
  /* Replié : la plus profonde seulement. Dépliée : toutes, puis l'entrée. */
  const visibles=_wpDeplie[a]?L:L.slice(0,1);
  for(const bi of visibles){
    const ici=(level.kind==='act'&&level.actNum===a&&_surBalise(bi));
    _wpBouton(body,'◈ '+_wpNomBalise(a,bi), ((_a,_b)=>()=>allerBalise(_a,_b))(a,bi), ici, true);
  }
  if(_wpDeplie[a])
    _wpBouton(body,'⚑ Entrée de l\'acte', ((_a)=>()=>enterAct(_a))(a),
       level.kind==='act'&&level.actNum===a, true);
}

function _wpRendre(){
  const body=document.getElementById('wpBody');if(!body)return;
  body.innerHTML='';
  _wpBouton(body,'🏰 Village de Moreuil',
     ()=>enterLevel(village,village.spawn[0]*TS+TS/2,village.spawn[1]*TS+TS/2),
     level.kind==='village');
  recolterBalisesVues();
  for(let a=0;a<ACTS.length;a++)
    if(actDiscovered[a])_wpActe(body,a);
}
function drawFalcon(sx,sy,en){
  const R=en.r,t=performance.now()/220,flap=Math.sin(t)*10;
  ctx.fillStyle='rgba(47,191,79,0.18)';ctx.beginPath();ctx.arc(sx,sy,R+22,0,6.28);ctx.fill();
  ctx.fillStyle='rgba(30,120,50,0.85)';
  for(const s of[-1,1]){ctx.beginPath();ctx.moveTo(sx,sy-8);
    ctx.quadraticCurveTo(sx+s*70,sy-70-flap,sx+s*104,sy-18+flap);
    ctx.quadraticCurveTo(sx+s*68,sy+8,sx,sy-8);ctx.fill();
    ctx.strokeStyle='rgba(130,235,150,0.6)';ctx.lineWidth=2;
    for(let k=1;k<=3;k++){ctx.beginPath();ctx.moveTo(sx+s*22,sy-12);ctx.lineTo(sx+s*(42+k*18),sy-28-k*6-flap*0.5);ctx.stroke();}ctx.lineWidth=1;}
  ctx.fillStyle=en.hurt>0?'#dfffe4':'#2f8f45';ctx.beginPath();ctx.ellipse(sx,sy,R*0.7,R,0,0,6.28);ctx.fill();
  ctx.fillStyle='#1e5e30';ctx.beginPath();ctx.ellipse(sx,sy+R*0.2,R*0.5,R*0.7,0,0,6.28);ctx.fill();
  ctx.fillStyle='#2f8f45';ctx.beginPath();ctx.arc(sx,sy-R*0.8,R*0.42,0,6.28);ctx.fill();
  ctx.fillStyle='#e8c23a';ctx.beginPath();ctx.moveTo(sx-6,sy-R*0.8);ctx.lineTo(sx+6,sy-R*0.8);ctx.lineTo(sx,sy-R*0.38);ctx.closePath();ctx.fill();
  ctx.fillStyle='#aaffb0';ctx.shadowBlur=14;ctx.shadowColor='#2fff5a';
  ctx.fillRect(sx-13,sy-R*0.95,6,4);ctx.fillRect(sx+7,sy-R*0.95,6,4);ctx.shadowBlur=0;
  ctx.strokeStyle='#e8c23a';ctx.lineWidth=3;
  for(const s of[-1,1]){ctx.beginPath();ctx.moveTo(sx+s*10,sy+R*0.85);ctx.lineTo(sx+s*16,sy+R*1.1);ctx.stroke();}ctx.lineWidth=1;
}

function buildCave(depth,boss,clvl){
  const {lvl,floors}=genLevel('cave',depth);
  lvl.theme='cave';
  lvl.shrines=[];lvl.breakables=[];lvl.npcs=[];lvl.caves=[];
  // stair back up
  const st=lvl.spawn;lvl.grid[idx(lvl.w,st[0],st[1])]=T_STAIR;lvl.stair=[st[0],st[1]];
  scatterEnemies(lvl,floors.filter(([x,y])=>dist(x,y,st[0],st[1])>6), boss?7:11, depth, clvl||10);
  // coffres à butin — la récompense de l'exploration
  lvl.chests=[];
  const chestPool=floors.filter(([x,y])=>dist(x,y,st[0],st[1])>7);
  const nChest=boss?3:randi(2,3);
  for(let i=0;i<nChest&&chestPool.length;i++){
    const[cx,cy]=chestPool.splice(randi(0,chestPool.length-1),1)[0];
    {const _c=poserObjet(lvl,cx,cy,{opened:false,depth},4);if(_c)lvl.chests.push(_c);}
  }
  if(boss){
    const far=floors.filter(([x,y])=>dist(x,y,st[0],st[1])>16);
    const[bx,by]=far.length?pick(far):pick(floors);
    const b=makeEnemy('boss',bx*TS+TS/2,by*TS+TS/2,depth,(clvl||10)+2);
    lvl.enemies.push(b);lvl.boss=b;
  }
  return lvl;
}
function activateShrine(sh){
  if(sh.used)return;sh.used=true;SFX.shrine();
  if(sh.type==='heal'){const st=P();player.hp=st.hpMax;player.mp=st.mpMax;floatText(player.x,player.y-30,t('sanctuaire.pleineSante'),'#7dff9a');}
  else{player.buffType=sh.type;player.buffT=30;toast(sh.type==='power'?t('sanctuaire.puissance'):t('sanctuaire.celerite'),2.4);}
  qc.shrines++;checkQuests();burst(sh.x,sh.y,'#8fdcff',24);refreshHud();
}
function breakBarrel(b){if(b.broken)return;b.broken=true;
  /* Le tonneau crache ses pièces comme le monstre : même geste, même règle. */
  const g=Math.max(1,Math.round(randi(1,2)*(1+(level.depth||0)*0.6)));
  jaillirOrbesSol(b.x,b.y-8,'or',g,g>=4?3:2);
  const r=alea();
  if(r<0.15)dropItem(b.x,b.y+8,makeItem(alea()<0.2?'magic':'white'));
  else if(r<0.27){player.potions++;floatText(b.x,b.y-24,'+potion','#7dff9a');}
  burst(b.x,b.y,'#a07850',12);SFX.tonneau&&SFX.tonneau({x:b.x,y:b.y});refreshHud();}
function openChest(ch){
  if(ch.opened)return;
  if(ch.arena){ch.opened=true;SFX.chest&&SFX.chest();burst(ch.x,ch.y,'#f4d35e',30);arenaLeave(true);return;}ch.opened=true;qc.chests++;checkQuests();SFX.chest();
  const d=ch.depth||0;
  const gold=randi(10,22)+d*10;player.gold+=gold;SFX.gold();
  floatText(ch.x,ch.y-24,'+'+gold+' or','#f4d35e',true);
  // 2-4 objets, au moins un de qualité
  const n=randi(1,3);
  for(let i=0;i<n;i++){
    const r=alea();let rar='magic';
    if(i===0){rar=r<0.004?'unique':r<0.03?'rare':r<0.25?'magic':'white';}
    else{rar=r<0.001?'unique':r<0.012?'rare':r<0.12?'magic':'white';}
    dropItem(ch.x+rand(-16,16),ch.y+rand(6,22),makeItem(rar));
  }
  if(alea()<0.05)dropItem(ch.x,ch.y+18,makeSocketable((ch.depth||0)>=2));
  burst(ch.x,ch.y,'#f4d35e',24);toast('Coffre ouvert ! +'+gold+' or',1.8);refreshHud();
}
/* LES MULTIPLICATEURS DE DIFFICULTÉ.                            (v9.32)

   ⚠ ILS ÉTAIENT LINÉAIRES ET BEAUCOUP TROP FAIBLES. `dm = 1 + difficulté×0,8`
   donnait ×1,8 en Cauchemar et ×2,6 en Enfer — alors que le héros y arrive
   avec du parangon, des uniques et des ensembles, c'est-à-dire une puissance
   qui, elle, se multiplie. Mesuré au niveau 60 : tuer une brute prenait
   **0,77 s en Cauchemar comme en Enfer**, contre 8,54 s en Normal au même
   niveau. Les deux difficultés supérieures étaient plus faciles que la
   première.

   Ils sont donc GÉOMÉTRIQUES, et SÉPARÉS pour les PV et les dégâts : mélangés
   dans un seul nombre, on ne peut pas régler la létalité sans changer le
   temps de tuer, et réciproquement. C'est ce qui rendait l'ancien réglage
   impossible à ajuster.

   Les valeurs viennent d'une mesure, pas d'un choix : voir NOTES_v9.32. */
/* ⚠ RELEVÉ EN v9.33, APRÈS L'ARRIVÉE DES HUIT ENSEMBLES ET DES LIGNES DE
   PARANGON SUR LES UNIQUES.

   Mesuré au niveau 60 avec DIFF_HP=4 : un ensemble COMPLET faisait tomber une
   brute en 0,57 s en Cauchemar et 1,10 s en Enfer — et l'Enfer avec ensemble
   était plus facile que le Cauchemar sans. Le contenu d'endgame que Mirja a
   demandé rend le héros trois à quatre fois plus fort, et la difficulté doit
   en tenir compte.

   La calibration vise le joueur ATTENDU à chaque cran : uniques en Cauchemar
   — les ensembles n'y tombent que d'y arriver — et ensemble complet en Enfer.
   Y entrer sans ensemble reste punitif, ce qui est le sens de la règle : après
   le niveau 60, ce sont le parangon, les ensembles et les légendaires qui font
   monter le palier. */
/* ⚠ DIFF_HP EST PASSÉ DE 6,6 À 10,0 EN MÊME TEMPS QUE LES ENSEMBLES.  (v9.36)

   Les deux valeurs se tiennent : réparer les ensembles leur a rendu leur
   puissance (×2,41 au niveau 60, ×3,28 en Enfer, mesuré), et l'Enfer est
   aussitôt tombé à 1,49 s par brute — plus FACILE que le Cauchemar. Un
   ensemble complet ne doit pas dissoudre la difficulté qu'il est censé rendre
   franchissable.

   Ne toucher à l'un sans remesurer l'autre serait reproduire l'erreur : la
   difficulté d'Enfer est calibrée SUR le profil équipé d'un ensemble, jamais
   sur un héros nu. */
const DIFF_HP=10.0, DIFF_DMG=1.24, DIFF_XP=1.5;

/* ⚠ LES BOSS ONT LEUR PROPRE MULTIPLICATEUR DE DIFFICULTÉ.       (v9.34)

   Mesuré après le recalage de la v9.32-33 : le Green Falcon avait
   **3,7 milliards de PV en Enfer** et n'était jamais tué en deux minutes. Un
   boss porte déjà cent fois les PV d'un ennemi ordinaire ; lui appliquer en
   plus le multiplicateur de difficulté des ennemis ordinaires (×43,6 en
   Enfer) le rend arithmétiquement invincible.

   ×4,5 par cran au lieu de ×6,6 — soit ×20 en Enfer au lieu de ×43,6. */
/* ⚠ UN BOSS VAUT UN MULTIPLE DE L'ENNEMI ORDINAIRE, PLUS UNE COURBE À LUI.

   Les boss avaient leur propre exposant, leur propre multiplicateur de
   difficulté et un coefficient par acte réglé à la main. Résultat mesuré sur
   la matrice complète acte × mode : le gardien de l'acte 1 tombait en 0,4 s en
   Cauchemar, celui de l'acte 3 n'était JAMAIS tué en 90 s, et le Green Falcon
   passait de 13 s en Normal à 54 s sans mourir en Cauchemar puis 19 s en
   Enfer. Aucun ordre, et trois boutons pour quinze cases : ça ne converge pas.

   Un boss est maintenant défini comme « N brutes de son niveau, dans son
   mode ». Il hérite donc automatiquement de la calibration des ennemis
   ordinaires — celle que `test_courbe` et `test_difficultes` tiennent — et le
   jour où on la retouche, les boss suivent sans qu'on y pense.

   Le nombre, lui, est lisible : un gardien d'acte vaut six à neuf brutes, un
   gardien de repaire cinq, le Green Falcon quatorze. */
function pvOrdinaire(L){
  const t=ENEMY_TYPES.brute;
  return t.hp*facteurCourbe(EN_HP_EXP,EN_HP_EXP_HAUT,L)
        *douceurDebut(L,EN_DEBUT_HP)*multDiffHp()*1.6*EN_HP_MUL;
}
function dgtOrdinaire(L){
  const t=ENEMY_TYPES.brute;
  return t.dmg*facteurCourbe(EN_DMG_EXP,EN_DMG_EXP_HAUT,L)
        *douceurDebut(L,EN_DEBUT_DMG)*multDiffDmg()*1.5*EN_DMG_MUL;
}
/* ⚠ CES MULTIPLES SONT PETITS, ET C'EST MESURÉ.

   Premier jet : un gardien valait six à neuf brutes. Mesuré sur la matrice
   complète, une brute coûte de 1,2 s (Normal, acte 5) à 40 s (Enfer sans
   ensemble) — un multiple de huit y transforme le gardien en mur infranchi
   (70 s sans le tuer, dans les vingt cases de Cauchemar et d'Enfer) et,
   côté dégâts, en trente et une morts sur le gardien de l'acte 1.

   Un boss doit rester un boss dans les DEUX hypothèses d'équipement — le
   joueur qui arrive avec des uniques quelconques comme celui qui a son
   ensemble. Trois à quatre brutes tient les deux bouts. */
const BOSS_ACTE_PV=[3,3.2,3.5,3.8], BOSS_ACTE_DGT=[1.15,1.25,1.35,1.45];
const BOSS_REPAIRE_PV=2.5, BOSS_REPAIRE_DGT=1.1;
const BOSS_FALCON_PV=6, BOSS_FALCON_DGT=1.6;
function multDiffHp(){ return Math.pow(DIFF_HP, difficulty); }
function multDiffDmg(){ return Math.pow(DIFF_DMG, difficulty); }
function multDiffXp(){ return Math.pow(DIFF_XP, difficulty); }

function makeEnemy(kind,x,y,depth,elvl){
  if(kind==='falcon'){const L=elvl||ACT_END[4];const dmH=multDiffHp(), dmD=multDiffDmg(), xm=multDiffXp();
    const hp=Math.round(pvOrdinaire(L)*BOSS_FALCON_PV);
    return {kind:'falcon',x,y,r:70,hp,hpMax:hp,dmg:Math.round(dgtOrdinaire(L)*BOSS_FALCON_DGT),spd:1.0,xp:Math.round(XP_BASE*(1400/XP_REF)*Math.pow(L,XP_EXPO)*xm),lvl:L,
      col:'#2fbf4f',name:'Green Falcon',res:{phys:25,cold:20,holy:-25},hitCd:0,hurt:0,boss:true,finalBoss:true,special:3,
      aggro:false,path:null,pcd:0,slow:0};
  }
  if(kind==='boss'){const L=elvl||12;const dmH=multDiffHp(), dmD=multDiffDmg(), xm=multDiffXp();
    /* ⚠ LE GARDIEN DE REPAIRE AVAIT UN COEFFICIENT UNIQUE (45), et il souffrait
       du même défaut que les gardiens d'acte : au niveau 14, face à un héros en
       blanc qui délivre 22 de DPS, ses 11 116 PV demandaient **505 secondes**
       et il tuait le joueur soixante fois. La courbe de boss suit le NIVEAU,
       la puissance du héros suit son STUFF — et le stuff fait des bonds de
       rareté d'un acte à l'autre. Un coefficient par ACTE, comme les
       gardiens. */
    const hp=Math.round(pvOrdinaire(L)*BOSS_REPAIRE_PV);
    return {kind:'boss',x,y,r:46,hp,hpMax:hp,dmg:Math.round(dgtOrdinaire(L)*BOSS_REPAIRE_DGT),spd:0.95,xp:Math.round(XP_BASE*(400/XP_REF)*Math.pow(L,XP_EXPO)*xm),lvl:L,
      col:'#8a5ad0',name:'Gardien du Repaire',bkind:'hooligan',wcol:'rgba(138,90,208,0.32)',res:{phys:20,cold:20,holy:-30},hitCd:0,hurt:0,boss:true,special:3,
      aggro:false,path:null,pcd:0,slow:0};
  }
  /* ⚠ UN TIREUR SE BÂTIT SUR SON ESPÈCE DE BASE, PUIS SE CORRIGE.
     Recopier la courbe de PV, de dégâts et d'XP pour quatre espèces de plus,
     c'était quatre occasions de la laisser diverger. On fabrique donc la
     base, et on applique des FACTEURS — le rythme est dans la table, la
     courbe reste unique. */
  if(TIREURS[kind]){
    const TI=TIREURS[kind];
    const e=makeEnemy(TI.base==='poilu'?'brute':TI.base,x,y,depth,elvl);
    e.kind=kind;           /* ce qu'il EST                                  */
    e.base=TI.base;        /* la planche qu'il emprunte — voir drawEnemy    */
    e.tireur=kind;         /* le drapeau que lit l'IA                       */
    e.name=TI.nom;
    e.r=TI.r;
    e.teinte=TI.teinte;
    if(TI.npc)e.npcSprite=TI.npc;
    e.hpMax=Math.max(1,Math.round(e.hpMax*TI.hp));e.hp=e.hpMax;
    e.dmg=Math.max(1,Math.round(e.dmg*TI.dmg));
    e.spd=TI.spd;
    e.xp=Math.round(e.xp*TI.xp);
    if(TI.el)e.element=TI.el;
    e._tirCd=alea()*TI.cd;   /* ils ne tirent pas tous sur le même temps   */
    /* ⚠ SON PROPRE BIAIS DE FUITE. Sans lui, quatre fuyards reculent vers
       le même point et s'empilent en un tas infranchissable. Un angle tiré
       à la naissance suffit, et il ne coûte AUCUN calcul par image — une
       répulsion deux à deux serait quadratique sur neuf cents ennemis. */
    e._biais=rand(-0.55,0.55);
    e._accule=false;
    return e;
  }
  const t=ENEMY_TYPES[kind];const dmH=multDiffHp(), dmD=multDiffDmg(), xm=multDiffXp();
  const L=Math.max(1,elvl||1);
  /* ================================================================
     COURBE DES ENNEMIS — recalibrée en 8.54 (solution « par la courbe »)

     Mesuré en 8.52 : le DPS du joueur croît de x1,148 par niveau, les PV des
     ennemis de x1,115 seulement. Trois points d'écart, composés sur 37
     niveaux : le joueur finit trois fois trop fort. Un mob normal mourait en
     0,14 s à l'entrée de l'acte 4, et le joueur y encaissait 43 coups.

     On aligne donc l'exposant des PV sur celui du joueur, et on ajoute un
     coefficient d'ensemble pour recaler le niveau absolu. Même traitement,
     plus modéré, sur les dégâts — c'est la défense qui absorbe le reste.

     Les quatre nombres sont NOMMÉS : ils se règlent ici, et le test
     _outils/test_courbe.js remesure le temps de mise à mort à chaque acte.
     ================================================================ */
  const hpF=facteurCourbe(EN_HP_EXP,EN_HP_EXP_HAUT,L)*douceurDebut(L,EN_DEBUT_HP);
  const dmgF=facteurCourbe(EN_DMG_EXP,EN_DMG_EXP_HAUT,L)*douceurDebut(L,EN_DEBUT_DMG);
  const hp0=Math.round(t.hp*hpF*dmH*1.6*EN_HP_MUL);
  return {kind,x,y,r:t.r,hp:hp0,hpMax:hp0,lvl:L,
    dmg:Math.round(t.dmg*dmgF*dmD*1.5*EN_DMG_MUL),spd:t.spd,xp:Math.round(XP_BASE*(t.xp/XP_REF)*Math.pow(L,XP_EXPO)*xm),
    col:t.col,name:t.name,res:t.res||{},hitCd:0,hurt:0,aggro:false,path:null,pcd:0,slow:0,
    wander:0,wx:x,wy:y};
}
/* Poser une variante sur un ennemi déjà fabriqué. Appelée juste après
   `makeEnemy`, AVANT `makeElite` : l'élite se pose par-dessus. */
function appliquerVariante(en,vi){
  const v=VARIANTES[vi]; if(!en||!v)return en;
  en.variante=vi;
  en.element=v.el;        /* ce que ses coups infligent    */
  en.teinte=v.teinte;     /* ce qui le rend reconnaissable */
  en.res=Object.assign({},en.res||{},v.res||{});
  /* ⚠ ON MÉMORISE LA FAIBLESSE À PART. `makeElite` peut poser `cold:75`
     (modificateur Glacial) par-dessus un « de Braise » dont toute la
     contrepartie est `cold:-35` — et supprimer ainsi la seule réponse que le
     joueur avait. Elle est réappliquée après le modificateur. */
  en._faiblesse={};
  for(const k in (v.res||{}))if(v.res[k]<0)en._faiblesse[k]=v.res[k];
  en.hpMax=Math.round(en.hpMax*(v.hp||1));en.hp=en.hpMax;
  en.dmg=Math.round(en.dmg*(v.dmg||1));
  return en;
}
/* Faut-il en poser une, et laquelle ? La région a son mot à dire : le « gel »
   fait naître du Givre, le « brasier » de la Braise. Une région cesse ainsi
   d'être une teinte de sol pour devenir un lieu. */
function tirerVariante(acte,region){
  if(alea()>=partVariante(acte))return -1;
  if(region&&region.penchantVar&&alea()<0.7){
    for(let i=0;i<VARIANTES.length;i++)if(VARIANTES[i].id===region.penchantVar)return i;
  }
  return randi(0,VARIANTES.length-1);
}

const ELITE_MODS=[
 {n:'Rapide',col:'#7dff9a',apply:e=>{e.spd*=1.6;}},
 {n:'Colossal',col:'#c8a0ff',apply:e=>{e.hp=e.hpMax=Math.round(e.hpMax*1.7);e.r=Math.round(e.r*1.35);e.spd*=0.85;e.dmg=Math.round(e.dmg*1.25);}},
 {n:'Glacial',col:'#7fd0ff',apply:e=>{e.res=Object.assign({},e.res,{cold:75});e.dmg=Math.round(e.dmg*1.15);}},
 {n:'Ardent',col:'#ff9a4d',apply:e=>{e.dmg=Math.round(e.dmg*1.6);e.res=Object.assign({},e.res,{holy:40});}}];
/* Le nom complet d'une élite, recomposé À L'AFFICHAGE. */
function nomElite(en){
  if(!en)return '';
  const base=nomEnnemi(en);
  const m=ELITE_MODS[en.eliteMod];
  if(!m)return en.eliteName||base;      /* ancienne partie : nom déjà figé */
  return base+' '+tOu('elite.'+_cleObjet(m.n), m.n);
}
function makeElite(en,forcer){
  const m=(forcer!=null&&ELITE_MODS[forcer])?ELITE_MODS[forcer]:pick(ELITE_MODS);
  /* ⚠ LE NOM D'ÉLITE ÉTAIT FIGÉ À LA NAISSANCE : `en.name+' '+m.n`, en
     français, une fois pour toutes. On garde l'INDICE du modificateur et on
     recompose à l'affichage — sinon les élites déjà sur la carte gardaient
     leur nom français après un changement de langue. */
  en.elite=true;en.eliteMod=ELITE_MODS.indexOf(m);en.auraCol=m.col;
  en.hp=en.hpMax=Math.round(en.hpMax*2.2);en.dmg=Math.round(en.dmg*1.9);
  en.xp=Math.round(en.xp*3);en.r=Math.round(en.r*1.15);m.apply(en);
  /* ⚠ LA FAIBLESSE DE LA VARIANTE SURVIT AU MODIFICATEUR (§96).
     `Glacial` pose `cold:75` ; sur un « de Braise » il effacerait le `cold:-35`
     qui EST toute la réponse du joueur. Une élite doit être plus dure, pas
     imprenable par ce qui devait marcher. */
  if(en._faiblesse)en.res=Object.assign({},en.res,en._faiblesse);
}
function scatterEnemies(lvl,floors,count,depth,elvl){
  const pool=[...floors];
  let _tireursGrotte=0;
  for(let i=0;i<count&&pool.length;i++){
    const[tx,ty]=pool.splice(randi(0,pool.length-1),1)[0];
    let kind='imp';const r=alea();
    if(depth>=2&&r<0.35)kind='brute';else if(r<0.55)kind='wraith';
    else if(depth>=1&&r<0.7)kind='brute';
    /* ⚠ LES GROTTES ET LES PLAINES N'AVAIENT AUCUN TIREUR.        (v9.60)
       Elles recevaient les variantes depuis la v9.56 mais pas les tireurs :
       le même angle mort que la Fosse (§105), un cran plus bas. Trouvé par
       l'agent `recensement`. Le plafond y est le même qu'en donjon — une
       grotte est étroite, on ne veut pas d'un couloir de tir. */
    {const _t=tirerTireur(depth);
     if(_t&&_tireursGrotte<TIREURS_MAX_SALLE){kind=_t;_tireursGrotte++;}}
    const _e=makeEnemy(kind,tx*TS+TS/2,ty*TS+TS/2,depth,elvl||1);
    {const _v=tirerVariante(depth,null);if(_v>=0)appliquerVariante(_e,_v);}
    if(alea()<0.12+depth*0.03)makeElite(_e);lvl.enemies.push(_e);
  }
}



