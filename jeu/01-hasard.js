





/* ================================================================
   LE OUTLAW DE MOREUIL — ARPG d'exploration à monde procédural
   Univers original. Mécaniques génériques (tuiles, A*, CA caves).
   ================================================================ */
const cv=document.getElementById('game'),ctx=cv.getContext('2d');
let W=0,H=0; function resize(){W=cv.width=innerWidth;H=cv.height=innerHeight;}

/* ================================================================
   LE HASARD, ET COMMENT LE RENDRE REPRODUCTIBLE            (v9.08)

   Six tests de la batterie donnaient un verdict différent d'un passage à
   l'autre : test_salles, test_estompage, test_tonneau, test_transitions,
   test_chemin_sol, test_moulinet. Tant que c'est vrai, un passage vert ne
   prouve rien — et un passage rouge non plus. Chaque enquête coûtait une
   dizaine de tirages, comme celle du décor en 9.05.

   LA RÈGLE, ET ELLE COMPTE AUTANT QUE LE RESTE : le jeu reste ALÉATOIRE
   pour le joueur. `_alea` vaut `Math.random` et n'en bouge pas tout seul.
   Seuls les tests appellent `semer()`. Une graine fixe livrée au joueur
   donnerait la même carte à tout le monde — bien pire que le défaut qu'on
   corrige ici.

   Mulberry32 : trente lignes, pas de dépendance, et `Math.imul` est dans le
   socle depuis longtemps (Chrome 28, Safari 7). `semer(null)` rend la main
   au vrai hasard.
   ================================================================ */
let _alea=Math.random;
const alea=()=>_alea();
function semer(graine){
  if(graine===null||graine===undefined){_alea=Math.random;return null;}
  let s=(graine>>>0)||1;
  _alea=function(){
    s=(s+0x6D2B79F5)>>>0;
    let t=s;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
  return s;
}

const rand=(a,b)=>a+alea()*(b-a);
const randi=(a,b)=>Math.floor(rand(a,b+1));
const dist=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=a=>a[Math.floor(alea()*a.length)];

const TS=44;
/* Ramassage. RAYON_LOOT est la distance d'aimantation automatique : le héros
   attrape un objet dès qu'il passe à moins de ça. 38 px, soit moins d'une case
   (TS=44), obligeait à marcher pile dessus. 56 px = 1,27 case : on ramasse en
   frôlant, sans aspirer tout l'écran. RAYON_CLIC_LOOT est la tolérance du
   doigt ou de la souris pour désigner un butin au sol. */
const RAYON_LOOT=56, RAYON_CLIC_LOOT=40;               // taille tuile en px
/* tuiles : 0 sol, 1 mur, 2 ravin, 3 grotte, 4 escalier, 5 portail village↔plaines */
const T_FLOOR=0,T_WALL=1,T_CHASM=2,T_CAVE=3,T_STAIR=4,T_GATE=5;
const walkableCode=c=>c===T_FLOOR||c===T_CAVE||c===T_STAIR||c===T_GATE;

/* ---------------- PLAYER ---------------- */
const player={
  x:0,y:0,r:16,face:1,
  /* Balises débloquées, par acte : { 0:[0,2], 1:[0] }. Sauvegardé. */
  balises:{},
  baseStr:10,baseDex:10,baseVit:10,baseEne:10,baseAgi:10,
  lvl:1,xp:0,xpNext:40,xpTotal:0,statPts:0,paraLvl:0,paraXp:0,para:{},paraBonus:{},
  hp:100,mp:50,potions:3,manaPots:2,portals:0,gold:60,frags:0,arenaBossKills:0,scrollsId:2,chill:0,
  corpse:null,_sacFait:false,   /* sac laissé à la mort — voir la section SAC DE MORT */
  clesAchetees:{}, resets:0,    /* puits d'or : clés de la Fosse, réinitialisations d'arbre */
  atkCd:0,path:null,attackTarget:null,
  swing:0,hurt:0,tempest:0,kills:0,totalDmg:0,
  anim:'Idle',animFrame:0,animT:0,animOnce:false,dirRow:0,_moved:false,buffType:null,buffT:0,
  equip:{weapon:null,armor:null,amulet:null,ring:null,ring2:null,helm:null,gloves:null,belt:null,skates:null},
  skillRanks:{slap:1,charge:0,tempest:0,holy:0,whirl:0,multi:0,warcry:0},tree:{},treeBonus:{},treePts:0,bar:['slap',null,null,null]
};
const UPMULT=plus=>1+ (plus||0)*0.12;   // +12% par niveau d'amélioration
/* Cadence d'attaque en PALIERS.
   L'animation tourne à 25 images/s et consomme un nombre ENTIER d'images :
   c'est la quantification qui crée les paliers. La Dextérité conserve
   exactement son rôle d'avant (courbe inchangée, donc équilibrage préservé) ;
   l'affixe « Vitesse d'attaque » s'ajoute par-dessus avec rendements décroissants. */
const ATK_FPS=25, ATK_FRAMES_MIN=4, ATK_FRAMES_MAX=14;
/* Cadence : la courbe descendait de 0,012 s par point et butait sur le plancher
   de 4 images (6,25 att/s) dès 32 points d'attribut. Au-delà, l'attribut ne
   servait plus à rien : c'est le défaut qu'on corrige.

   Nouvelle courbe, à rendements décroissants : la même cadence maximale reste
   atteignable, mais il faut environ 130 points au lieu de 32, et chaque point
   continue de rapporter quelque chose sur presque toute la progression.
   2,27 att/s à 10 points (identique à avant) · 3,13 à 32 · 4,17 à 60 ·
   5,00 à 100 · 6,25 (maximum) à 130. */
function dexFrames(agi){
  const a=Math.max(0,agi-10);
  const sec=clamp(0.16+0.28*Math.exp(-a/45),0.16,0.55);
  return clamp(Math.round(sec*ATK_FPS),ATK_FRAMES_MIN,ATK_FRAMES_MAX);
}
function eiasOf(ias){const i=Math.max(0,ias);return Math.floor(120*i/(120+i));}
function iasFrames(dex,ias){
  return Math.max(ATK_FRAMES_MIN,Math.ceil(dexFrames(dex)*100/(100+eiasOf(ias))));
}
/* IAS brut minimal pour descendre à f images, à Dextérité donnée. */
function iasForFrames(dex,f){
  const b=dexFrames(dex);
  if(f>=b)return 0;
  const e=Math.ceil(100*(b-f)/f);
  if(e>=120)return Infinity;
  return Math.ceil(120*e/(120-e));
}
function nextBreakpoint(dex,ias){
  const f=iasFrames(dex,ias);
  if(f<=ATK_FRAMES_MIN)return null;
  const need=iasForFrames(dex,f-1);
  return isFinite(need)?{frames:f-1,need:need,manque:Math.max(0,need-ias)}:null;
}
/* LES NEUF EMPLACEMENTS D'ÉQUIPEMENT. La liste était recopiée deux fois. */
const P_SLOTS=['weapon','armor','amulet','ring','ring2','helm','gloves','belt','skates'];

/* Le personnage nu : ses attributs de base, et les cumuls à zéro.
   Le critique part de 5 % — c'est le socle de tout le monde. */
function _pInitial(){
  return {str:player.baseStr, dex:player.baseDex, vit:player.baseVit,
          ene:player.baseEne, agi:(player.baseAgi||10),
          dmg:0, def:0, dmgpct:0, dmgMult:0, mf:0, crit:5, critDmg:0, leech:0,
          cast:0, block:0, acc:0, ias:0, pick:0,
          /* ⚠ UNE CLÉ ABSENTE D'ICI EST UNE LIGNE MORTE : `_pCumuler` n'ajoute
             que si la clé existe DÉJÀ, et se tait sinon. Trois des huit lignes
             de parangon légendaire (`hpPct`, `holy`, `cold`) ne faisaient donc
             rien — un légendaire sur trois portait une ligne inerte, sans qu'un
             seul test s'en aperçoive. */
          hpPct:0, mpPct:0, sortPct:0, moveSpeed:0};
}

/* L'AIGUILLAGE CLÉ → CUMUL ÉTAIT ÉCRIT QUATRE FOIS.               (Phase 4)

   Affixes, sertissages, mots runiques et charmes avaient chacun leur chaîne
   de `else if` sur les mêmes clés. Presque les mêmes : chacune en oubliait.

     affixes      16 clés (toutes)
     sertissages  14 — sans cast ni pick
     mots runiques 13 — sans acc, cast, pick
     charmes      12 — sans acc, cast, ias, pick

   AUCUN de ces manques ne se voyait, parce qu'aucune donnée du jeu ne les
   déclenche. Mesuré le 28 août 2026 sur les tables : les charmes n'emploient
   que def/dex/dmgpct/mf/str/vit, les mots runiques que
   block/crit/def/dmg/dmgpct/leech, les gemmes et runes que
   crit/def/dex/dmg/dmgpct/ene/leech/mf/str/vit. Toutes couvertes partout.

   Un seul aiguillage, donc. Le résultat est identique aujourd'hui — vérifié
   par `test_empreinte_stats` sur six personnages — et un charme d'IAS ajouté
   demain ne sera plus silencieusement ignoré.

   Une clé inconnue reste ignorée, comme avant. */
function _pCumuler(S, cle, v){
  if(typeof S[cle]==='number')S[cle]+=v;
}

/* L'ÉQUIPEMENT. Une pièce BRISÉE garde ses affixes mais perd sa contribution
   matérielle : dégâts et défense de base, sertissages, et son compte dans la
   panoplie. C'est ce que dit le `continue` — ne pas le remonter. */
/* Ce qu'une gravure verse dans `dmgMult` par rang et par pièce.

   ⚠ CE 8 EST MESURÉ EN JOUANT, PAS CALCULÉ. La cible du plan est « la gravure
   complète (9 pièces au rang maximum) doit valoir ×3 à ×5 de DPS, soit 7 à
   10 paliers ». Duels joués contre une brute d'Enfer de niveau 60, héros au
   plafond, ensemble complet, trois tirages appariés :

     rang  0 → 7,68 s   ×1,00        rang  8 → 2,02 s   ×3,81
     rang  3 → 3,85 s   ×2,00        rang 10 → 1,52 s   ×5,07
     rang  5 → 2,85 s   ×2,70        rang 15 → 1,02 s   ×7,56

   La fourchette demandée tombe donc bien sur 7 à 10 paliers. Le calcul seul
   annonçait ×3,96 au rang 10 : il ignorait le critique et les lignes de rune,
   et se trompait d'un quart. C'est la règle du projet — on mesure. */
const GRAVURE_DMGMULT=8;

function _pEquipement(S){
  let uc=0;
  for(const slot of P_SLOTS){
    const it=player.equip[slot]; if(!it)continue;
    const m=UPMULT(it.plus);
    for(const a of it.affixes)_pCumuler(S,a.t,Math.round(a.v*m));
    if(isBroken(it))continue;
    if(it.baseDmg)S.dmg+=Math.round(it.baseDmg*m);
    if(it.baseDef)S.def+=Math.round(it.baseDef*m);
    if(it.sockets)for(const g of it.sockets){
      if(!g||!g.sock)continue;
      _pCumuler(S,g.sock.t,g.sock.v);
    }
    /* LA LIGNE DE PARANGON. Elle ne vaut rien à zéro palier et croît avec eux :
       c'est le couplage voulu entre l'endgame et l'équipement.

       Elle suit `isBroken` comme le reste — une pièce hors d'usage ne tient
       aucune promesse (même règle que la panoplie et les ensembles). */
    if(it.para&&(player.paraLvl||0)>0)
      _pCumuler(S,it.para.t,it.para.par100*facteurParaLigne(player.paraLvl));
    /* LA GRAVURE D'ÉCHO.                                    (phase 3, v9.46)

       ⚠ TOUTES NOS BRIQUES D'AMÉLIORATION ÉTAIENT PLATES. Une haute rune à
       +34 % de dégâts est énorme au niveau 20 et invisible au niveau 60, quand
       les affixes montent de ×1,26 par bande d'objet. Le joueur qui en trouvait
       une à l'endgame la rangeait et l'oubliait.

       La gravure porte un RANG, et son effet vaut `valeur de base × rang`. Le
       rang est borné par le palier de Fosse franchi : c'est le CONTENU qui
       borne la puissance, jamais un nombre écrit en dur.

       Elle suit `isBroken` comme le reste — une pièce hors d'usage ne tient
       aucune promesse, même règle que la panoplie, les ensembles et la ligne
       de parangon. C'est le `continue` plus haut qui s'en charge. */
    if(it.gravure){
      _pCumuler(S,it.gravure.t,it.gravure.v*it.gravure.rang);
      /* ⚠ LA LIGNE DE LA RUNE NE SUFFIT PAS, ET LA MESURE LE DIT.
         Neuf pièces gravées au rang 10 ne donnaient que **+5,7 % de dégâts** —
         mesuré, dmgMax 14 535 778 → 15 369 047. Les valeurs de haute rune (34 %
         de dégâts, 22 de vitalité…) ont été calibrées pour le niveau 20 ; à 60,
         elles sont noyées dans des affixes cent fois plus gros. Multiplier par
         le rang ne rattrape pas deux ordres de grandeur : c'est exactement la
         PLATITUDE que cette phase devait corriger.

         La gravure verse donc aussi dans `dmgMult`, le seul godet NON DILUÉ du
         jeu — `mult = 1 + dmgMult/100`. La ligne de rune garde son caractère
         (une Vael n'est pas une Orim), et le rang porte la puissance. */
      S.dmgMult+=GRAVURE_DMGMULT*it.gravure.rang;
    }
    if(it.rarity==='unique')uc++;
  }
  return uc;
}

/* Panoplie de l’Outlaw : bonus selon le nombre d'uniques équipés. */
function _pPanoplie(S, uc){
  if(uc>=2)S.dmgpct+=({2:5,3:10,4:18}[uc]||30);
  if(uc>=3){S.str+=5;S.dex+=5;S.vit+=5;S.ene+=5;S.agi+=5;}
  if(uc>=5){S.str+=5;S.dex+=5;S.vit+=5;S.ene+=5;S.agi+=5;S.def+=25;}
}

function _pMotsRuniques(S){
  for(const slot of P_SLOTS){
    const it=player.equip[slot]; if(!it)continue;
    const rw=runewordOf(it); if(!rw)continue;
    for(const k in rw.bonus)_pCumuler(S,k,rw.bonus[k]);
  }
}

/* Les charmes agissent depuis LE SAC, sans être équipés. */
function _pCharmes(S){
  const cb=charmBonus();
  for(const k in cb)_pCumuler(S,k,cb[k]);
  /* LES CINQ ÉCLATS.                             (chantier C bis, v9.48)
     Ils n'occupent aucun emplacement non plus : ce ne sont pas des pièces
     d'équipement mais des morceaux de ce qui ancrait le Falcon. Ils agissent
     par leur PRÉSENCE, et l'Étoile complète — 5/5 — ajoute sa ligne dans le
     seul godet non dilué du jeu. */
  const be=bonusEclats();
  for(const k in be)_pCumuler(S,k,be[k]);
}

/* L'arbre de compétences. Ses clés ne sont PAS celles des affixes : il écrit
   `dmgPct` avec une majuscule, et il ne donne ni block, ni acc, ni pick. Son
   `ias` est repris plus bas, avec le reste de la cadence. */
/* ⚠ CE VERSEMENT ÉTAIT UNE LISTE FIXE DE TREIZE CLÉS.             (v9.35)

   L'arbre, le parangon et les ensembles arrivent tous par `TB`. Or `_pArbre`
   n'en reversait que treize clés nommées à la main : `acc`, `sortPct`, `ias`,
   `block`, `pick` n'y figuraient pas, et tout bonus qui les visait tombait
   dans le vide. C'est ce qui rendait la ligne de parangon « Justesse » inerte
   — et un point de parangon ne se reprend pas.

   Une liste à tenir à jour finit toujours par ne plus l'être. On reverse
   désormais TOUTE clé numérique que la fiche connaît déjà : ajouter une
   statistique à `_pInitial` suffit à la brancher partout.

   `dmgPct` est le seul alias : l'arbre l'écrit ainsi, l'accumulateur le nomme
   `dmgpct`. */
function _pArbre(S, TB){
  for(const cle in TB){
    if(cle==='dmgPct'){ S.dmgpct+=(TB.dmgPct||0); continue; }
    if(typeof S[cle]==='number' && typeof TB[cle]==='number') S[cle]+=TB[cle];
  }
}

/* ── RÉPARTITION DES RÔLES ────────────────────────────────────────────
   La Dextérité faisait TROIS métiers : cadence, précision et déplacement.
   Deux d'entre eux plafonnaient (cadence à 32 points, précision à 60), si
   bien qu'au-delà de 32 points elle ne servait plus qu'à courir. On répartit :

     Force      dégâts d'arme                        (inchangé)
     AGILITÉ    cadence d'attaque, incantation,      (NOUVEAU)
                vitesse de déplacement
     Dextérité  chance de toucher, coup critique     (récupère le critique)
     Vitalité   points de vie, un peu de défense     (récupère la défense)
     Énergie    mana, régénération, DÉGÂTS DES SORTS (devient offensive)

   Vitesse d'attaque par paliers, à la manière de Diablo II. L'animation
   tourne à ATK_FPS images/s : le nombre d'images est un ENTIER, donc la
   cadence ne bouge qu'en franchissant un palier, jamais en continu.
   Rendements décroissants : eias = 120·ias / (120+ias).

   ÉNERGIE — c'est le chemin qu'a pris Diablo : dans II elle ne donnait que du
   mana et personne n'en mettait ; dans III et IV l'attribut équivalent est
   devenu l'attribut OFFENSIF des lanceurs de sorts. Ici elle augmente les
   dégâts de toutes les compétences et réduit leur coût.
   ------------------------------------------------------------------- */
function _pDerivees(S, TB, uc){
  const str=S.str, dex=S.dex, vit=S.vit, ene=S.ene, agi=S.agi;
  const flatDmg=S.dmg, dmgPct=S.dmgpct;
  let def=S.def, crit=S.crit, cast=S.cast;
  const hpMax=Math.round((60+vit*7+player.lvl*8)*(1+(S.hpPct||0)/100));
  const mpMax=Math.round((20+ene*4+player.lvl*3)*(1+(S.mpPct||0)/100));
  /* DEUX SEAUX, ET C'EST TOUT L'INTÉRÊT.

     `dmgPct` est ADDITIF : arme, affixes, arbre, sertissages y tombent
     ensemble. Mesuré le 29 août 2026 sur un héros de niveau 60 en uniques
     avec un arbre LÉGAL de 59 nœuds, ce cumul atteint déjà **996 %** — si
     bien que les cinquante points de parangon de la ligne « Dégâts » n'y
     ajoutaient que **+3,1 %**, c'est-à-dire moins que le bruit de mesure.
     La ligne était un piège : plus le héros progressait, moins elle valait.

     `dmgMult` est un seau SÉPARÉ que rien d'autre n'alimente. Cinquante
     points y valent +50 % réels, quelle que soit la puissance déjà atteinte.
     C'est le choix de Mirja, et c'est ce que fait Diablo III avec ses sources
     dites multiplicatives — celles que tout le monde y recherche. */
  /* La cadence se calcule AVANT les dégâts : son surplus les alimente. */
  const iasRaw=Math.max(0,S.ias);
  const eias=eiasOf(iasRaw);
  const mult=1+(S.dmgMult||0)/100;
  /* LA FORCE MULTIPLIE LE STUFF, ELLE NE S'Y AJOUTE PLUS.   (v9.32)

     Avant : `(3 + str×0,7 + flatDmg)`. La Force tombait dans la même
     parenthèse que les dégâts de l'arme, donc elle s'ADDITIONNAIT à un terme
     qui, lui, explose avec le niveau d'objet. Mesuré au niveau 60, avec les
     mêmes 295 points investis :

       à ilvl 10   →  +120 %
       à ilvl 60   →  +8 %

     Plus on s'équipait, moins le personnage comptait — exactement le piège
     de la ligne « Dégâts » du parangon, sortie du seau additif pour la même
     raison. Un point d'attribut finissait à +0,027 % : imperceptible.

     Maintenant la Force est un FACTEUR. Deux conséquences voulues par Mirja :
     sans arme les points ne valent rien — le stuff devient obligatoire, pas
     seulement rentable — et un point garde la même valeur relative quel que
     soit l'équipement. */
  const forceMult=1+str*FORCE_PCT/100;
  const dmgMin=Math.round((3+flatDmg)*forceMult*(1+dmgPct/100)*mult);
  const dmgMax=Math.round((6+flatDmg*1.4)*forceMult*(1+dmgPct/100)*mult);
  const atkFrames=iasFrames(agi,iasRaw);
  let moveSpeed=2.5+agi*0.02+((player.equip.skates&&player.equip.skates.spd)||0)+(S.moveSpeed||0);
  /* L'Agilité accélère aussi les incantations. Le plafond de 60 % est appliqué
     au moment du lancer, comme pour l'affixe. */
  cast+=agi*0.45;
  /* La Dextérité récupère le coup critique : elle cesse d'être un péage qu'on
     paie jusqu'à 32 points avant de l'abandonner. */
  crit+=dex*0.09;
  /* La Vitalité apporte un peu de défense : elle protège au lieu de seulement
     rallonger la barre de vie. */
  def+=Math.round(vit*0.8);
  const sortPct=ene*0.55+(S.sortPct||0);
  const manaCoutPct=Math.min(40,ene*0.35);
  if((player.chill||0)>0)moveSpeed*=0.55;
  const _pw=(player.buffT>0&&player.buffType==='power')?1.5:1;
  const _ha=(player.buffT>0&&player.buffType==='haste');
  const framesFinal=_ha?Math.max(ATK_FRAMES_MIN,Math.ceil(atkFrames*0.7)):atkFrames;
  return {str,dex,vit,ene,agi,sortPct,manaCoutPct,hpMax,mpMax,hpPct:(S.hpPct||0), mpPct:(S.mpPct||0),
    dmgMin:Math.round(dmgMin*_pw), dmgMax:Math.round(dmgMax*_pw),
    atkSpeed:framesFinal/ATK_FPS, ias:iasRaw, eias:eias, atkFrames:framesFinal,
    moveSpeed:_ha?moveSpeed+1.2:moveSpeed,
    def, mf:S.mf, uc, crit, critDmg:S.critDmg, dmgMult:S.dmgMult, leech:S.leech, cast,
    block:Math.min(60,S.block+Math.floor(dex*0.10)), acc:S.acc, pick:S.pick};
}

/* Somme de deux tables clé → nombre, sans toucher ni l'une ni l'autre. */
function fusionBonus(a,b){
  const o={}; if(a)for(const k in a)o[k]=a[k];
  if(b)for(const k in b)o[k]=(o[k]||0)+b[k];
  return o;
}
function P(){
  const S=_pInitial();
  const uc=_pEquipement(S);
  _pPanoplie(S,uc);
  _pMotsRuniques(S);
  _pCharmes(S);
  /* L'ARBRE ET LE PARANGON SE CUMULENT, et se lisent au même endroit. On
     fabrique une table neuve plutôt que d'écrire dans celle de l'arbre :
     `player.treeBonus` est recalculée par computeTreeBonus, et y verser le
     parangon le ferait compter deux fois au prochain appel. */
  /* Trois sources de bonus se cumulent au même endroit : l'arbre, le
     parangon, et les ENSEMBLES — dont le dernier palier croît avec le
     parangon. On fabrique une table neuve à chaque fois plutôt que d'écrire
     dans l'une des trois, qui sont recalculées séparément. */
  const TB=fusionBonus(fusionBonus(player.treeBonus,player.paraBonus),bonusEnsembles());
  _pArbre(S,TB);
  return _pDerivees(S,TB,uc);
}

/* ---------------- ITEMS ---------------- */
const RAR={legendary:{name:'Légendaire',col:'#ff6a3d',aff:[5,6]},
  white:{name:'Commun',col:'#e8ecf6',aff:[0,0]},
  magic:{name:'Magique',col:'#6ea8ff',aff:[1,2]},
  rare:{name:'Rare',col:'#f4d35e',aff:[3,4]},
  unique:{name:'Unique',col:'#d98a3d',aff:[4,5]}};
const AFFIX=[
  {t:'str',n:'+# Force',min:2,max:9},{t:'dex',n:'+# Dextérité',min:2,max:9},
  {t:'agi',n:'+# Agilité',min:2,max:9},
  {t:'vit',n:'+# Vitalité',min:2,max:10},{t:'ene',n:'+# Énergie',min:2,max:8},
  {t:'dmg',n:'+# Dégâts',min:2,max:8},{t:'def',n:'+# Défense',min:3,max:14},
  {t:'dmgpct',n:'+#% Dégâts',min:6,max:22},{t:'mf',n:'+#% Trouvaille magique',min:8,max:30},{t:'crit',n:'+#% Coup critique',min:3,max:12},{t:'leech',n:'+#% Vol de vie',min:1,max:3},{t:'cast',n:'+#% Vitesse d’incantation',min:4,max:15},
  {t:'block',n:'+#% Blocage (crosse levée)',min:3,max:10},
  {t:'acc',n:'+#% Précision',min:5,max:18},
  {t:'ias',n:'+#% Vitesse d’attaque',min:5,max:20},
  /* `only` restreint un affixe à un emplacement. Le rayon d'aimantation des
     orbes est un pouvoir de MAIN : il n'a de sens que sur des gants. */
  {t:'pick',n:'+#% Zone de ramassage',min:12,max:40,only:'gloves'}];
const GEAR={"weapon":{"white":[["Crosse fêlée du vestiaire","w_ash1"],["Crosse d'entraînement râpée","w_ash2"],["Crosse de recrue","w_ash3"],["Crosse de titulaire","w_ash4"]],"magic":[["Crosse composite runique","w_comp1"],["Crosse sifflante","w_comp2"],["Crosse de la mise en échec","w_comp3"],["Crosse du power-play","w_comp4"],["Crosse givrée","w_frost1"],["Crosse de glace runique","w_frost2"]],"rare":[["Mordante des Outlaws","w_frost3"],["Brise-Givre","w_frost4"],["Rédemption Emberblue","w_ember1"],["Braise-Bleue","w_ember2"],["Crosse des Cendres Ardentes","w_ember3"],["Fléau Emberblue","w_ember4"]],"unique":[["Cendreglace, la Crosse Damnée","w_ash21"],["Cendreglace, Cœur de Suie","w_ash22"],["Cendreglace, Serment de Cendre","w_ash23"],["Cendreglace, l'Ultime Damnation","w_ash24"],["Aile Brisée du Séraphin","w_wing1"],["Plume Déchue du Séraphin","w_wing2"],["Rémige du Jugement","w_wing3"],["Envergure du Séraphin Corrompu","w_wing4"]],"legendary":[["Cendre-Fosse, Crosse des Échos","leg_weapon"]]},"armor":{"white":[["Maillot rembourré des cadets","a_jersey1"],["Maillot rapiécé de Moreuil","a_jersey2"],["Maillot des Outlaws juniors","a_jersey3"],["Maillot de capitaine élimé","a_jersey4"]],"magic":[["Plastron d'écailles givrées","a_scale1"],["Plastron écaillé runique","a_scale2"],["Cotte d'écailles bleuies","a_scale3"],["Plastron d'écailles renforcé","a_plackart1"],["Plastron runique du Veilleur","a_plackart2"]],"rare":[["Cuirasse des Outlaws","a_plackart3"],["Plastron du Gardien Éternel","a_plackart4"],["Harnois ailé de l’Outlaw","a_harness1"],["Harnois des Ailes de Givre","a_harness2"],["Harnois du Serment Bleu","a_harness3"],["Harnois ailé du Grand Outlaw","a_harness4"]],"unique":[["Égide de la Piste Gelée","a_aegis1"],["Égide du Cercle Central","a_aegis2"],["Égide des Outlaws Déchus","a_aegis3"],["Égide de l'Arène Éternelle","a_aegis4"]],"legendary":[["Harnois du Survivant de la Fosse","leg_armor"]]},"amulet":{"white":[["Jeton de vestiaire","m_token1"],["Jeton des Outlaws","m_token2"],["Médaillon d'amateur","m_token3"],["Jeton de capitaine terni","m_token4"]],"magic":[["Amulette de Glacier","m_glacier1"],["Pendentif de Givre","m_glacier2"],["Amulette du Froid Runique","m_glacier3"]],"rare":[["Cœur de la Faille","m_heart1"],["Éclat de la Faille","m_heart2"],["Cœur Battant des Outlaws","m_heart3"],["Cœur Profond de la Faille","m_heart4"]],"unique":[["Larme du Séraphin","m_tear1"],["Larme de l'Ange Déchu","m_tear2"],["Perle du Jugement","m_tear3"],["Larme Ultime du Séraphin","m_tear4"]]},"ring":{"white":[["Anneau de fer brut","r_iron1"],["Anneau de fer poli","r_iron2"],["Anneau de recrue","r_iron3"],["Anneau de fer gravé","r_iron4"]],"magic":[["Anneau de givre-verre","r_frost1"],["Anneau de verre gelé","r_frost2"],["Anneau du Froid Runique","r_frost3"],["Anneau de givre-verre poli","r_frost4"],["Anneau du Patin Rapide","r_swift1"],["Anneau de la Glisse","r_swift2"],["Anneau du Contre-Rapide","r_swift3"],["Anneau du Patin Fulgurant","r_swift4"]],"rare":[["Chevalière du Pacte de Sang","r_blood1"],["Chevalière Écarlate","r_blood2"],["Chevalière du Serment de Sang","r_blood3"],["Chevalière du Pacte Damné","r_blood4"],["Boucle de la Faille","r_loop1"],["Anneau de la Brèche","r_loop2"],["Boucle des Outlaws","r_loop3"],["Boucle de la Faille Profonde","r_loop4"]],"unique":[["Anneau du Serment d'Aldric","r_aldric1"],["Anneau du Dernier Serment","r_aldric2"],["Anneau de l’Outlaw Éternel","r_aldric3"],["Anneau du Serment Indéfectible","r_aldric4"],["Halo du Séraphin","r_halo1"],["Auréole Déchue","r_halo2"],["Halo du Jugement Corrompu","r_halo3"]]},"skates":{"white":[["Patins usés du vestiaire","s_worn1"],["Patins de recrue","s_worn2"],["Patins des Outlaws juniors","s_worn3"],["Patins reconditionnés","s_worn4"]],"magic":[["Patins composites","s_comp1"],["Patins givrés","s_comp2"],["Patins runiques","s_comp3"],["Patins du power-play","s_comp4"],["Patins givrés renforcés","s_warden2"],["Patins gravés du Gardien","s_warden3"],["Patins d'acier trempé","s_warden4"]],"rare":[["Roues de Givre","s_frost1"],["Roues Gelées des Outlaws","s_frost2"],["Roues du Grand Gel","s_frost3"],["Patins Emberglide","s_ember1"],["Patins des Cendres Ardentes","s_ember3"],["Patins Emberglide Suprêmes","s_ember4"],["Patins du Gardien","s_warden1"]],"unique":[["Roues de l'Hiver Éternel","s_frost4"],["Patins des Cendres Damnées","s_ember2"],["Coureurs de Glacier","s_glacier1"],["Ailes de Moreuil","s_wings1"]],"legendary":[["Brûle-Piste, Roues de la Fosse","leg_skates"]]},"helm":{"white":[["Casque de cuir bosselé","h9"],["Casque de recrue","h10"],["Casque matelassé","h11"],["Casque de cuir clouté","h12"]],"magic":[["Casque d'acier givré","h13"],["Heaume runique","h14"],["Casque d'acier trempé","h15"],["Heaume enchanté","h16"]],"rare":[["Heaume du Veilleur","h5"],["Heaume des Outlaws","h6"],["Armet du Gardien","h7"],["Heaume du Gardien Éternel","h8"]],"unique":[["Heaume du Serment Brisé","h1"],["Couronne de l'Hiver Éternel","h2"],["Diadème du Falcon","h3"],["Couronne du Dernier Outlaw","h4"]],"legendary":[["Heaume d’Anselme","leg_helm"]]},"gloves":{"white":[["Gants matelassés troués","gl5"],["Gants de recrue","gl6"],["Mitaines usées","gl7"],["Gants matelassés renforcés","gl8"]],"magic":[["Gantelets givrés","gl1"],["Gants runiques","gl2"],["Mitaines enchantées","gl3"],["Gantelets d'écailles bleuies","gl4"]],"rare":[["Gantelets de Givre","gl13"],["Poignes des Outlaws","gl14"],["Gantelets du Veilleur","gl15"],["Poignes gelées du Gardien","gl16"]],"unique":[["Poignes du Dernier Outlaw","gl9"],["Serres du Falcon","gl10"],["Étreinte de la Faille","gl11"],["Gantelets du Grand Serment","gl12"]]},"belt":{"white":[["Ceinturon élimé","be13"],["Ceinturon de recrue","be14"],["Ceinture usée","be15"],["Ceinturon clouté usé","be16"]],"magic":[["Ceinture cloutée givrée","be5"],["Ceinture runique","be6"],["Ceinture de la mise en échec","be7"],["Ceinture cloutée bleuie","be8"]],"rare":[["Ceinture du Gardien","be9"],["Ceinture du Veilleur","be10"],["Ceinture des Outlaws","be11"],["Ceinture du Gardien Éternel","be12"]],"unique":[["Ceinture du Dernier Outlaw","be1"],["Étreinte de la Faille","be2"],["Ceinture du Pacte Brisé","be3"],["Ceinture des Profondeurs Gelées","be4"]]}};
let uidCounter=1;
const GEMS=[
 {name:'Grenat',ico:'🔴',img:'gem_grenat',t:'str',v:10},{name:'Saphir',ico:'🔵',img:'gem_saphir',t:'ene',v:9},
 {name:'Émeraude',ico:'🟢',img:'gem_emeraude',t:'dex',v:10},{name:'Améthyste',ico:'🟣',img:'gem_amethyste',t:'vit',v:13},
 {name:'Topaze',ico:'🟡',img:'gem_topaze',t:'mf',v:18},{name:'Diamant',ico:'⚪',img:'gem_diamant',t:'def',v:16}];
const RUNES=[
 {name:'Rune El',ico:'ᛝ',t:'crit',v:10},{name:'Rune Sol',ico:'ᛋ',t:'dmgpct',v:18},
 {name:'Rune Ort',ico:'ᛟ',t:'leech',v:3},{name:'Rune Ith',ico:'ᛁ',t:'dmg',v:14}];
function makeSocketable(good){
  if(good&&alea()<0.5){const ri=randi(0,RUNES.length-1),r=RUNES[ri];return {uid:uidCounter++,slot:'gem',kind:'rune',name:r.name,_base:r.name,tier:1,ico:r.ico,rarity:'rare',img:'rune'+ri,plus:0,affixes:[],sock:{t:r.t,v:r.v}};}
  const g=pick(GEMS);return {uid:uidCounter++,slot:'gem',kind:'gem',name:g.name,_base:g.name,tier:1,ico:g.ico,rarity:'magic',img:g.img||null,plus:0,affixes:[],sock:{t:g.t,v:g.v}};
}
/* LE NIVEAU D'OBJET DOIT PESER — sans quoi chercher de l'équipement n'est
   qu'un agrément.

   L'échelle était LINÉAIRE : `1 + (ilvl-1)×0,2` pour les dégâts d'arme,
   ×0,07 pour les affixes. Mesuré le 29 août 2026, DPS réellement joué au
   niveau 60 avec l'arbre complet, en ne faisant varier que le niveau des
   pièces :

     ilvl 20 → 60   rare ×1,9   unique ×2,5

   Les PV d'une brute d'os, sur le même intervalle, sont multipliés par
   SOIXANTE-DOUZE. Autrement dit : toute la progression venait des niveaux —
   attributs et arbre — et ramasser une pièce à son niveau ne récompensait
   presque rien. Un rare de l'acte 2 valait un rare de l'acte 4.

   L'échelle est donc EXPONENTIELLE, comme celle des ennemis. Un objet de son
   niveau devient un vrai progrès, et garder son vieux stuff se paie — ce qui
   est le propre d'un action-RPG. Les taux sont calés pour que la puissance
   d'une pièce suive la courbe des ennemis au-dessus de EN_NIV_CALIBRE.

   ⚠ Ces trois nombres et EN_HP_EXP_HAUT se règlent ENSEMBLE : monter l'un
   sans l'autre déplace tout l'équilibre. Voir Etude_parangon.md §11. */
/* CE QUE VAUT UN POINT DE FORCE, en pourcentage des dégâts du stuff.

   0,10 % par point : les 295 points d'un niveau 60 valent **+30,5 %**.
   Minoritaire face au stuff — une seule arme de niveau 60 multiplie déjà les
   dégâts par 32 — mais perceptible : les cinq points d'un palier de niveau
   rendent +0,5 %, contre +0,027 % avec l'ancienne formule. */
const FORCE_PCT=0.10;

/* LE PALIER D'OBJET.                                          (v9.32)

   Trois niveaux d'objet forment une MARCHE : ilvl 1-2-3 valent la même chose,
   4-5-6 la même chose, et passer de 3 à 4 fait un saut franc. Décision de
   Mirja — « faut vraiment un gap tous les 3 lvl ».

   La courbe d'ensemble ne bouge pas : on prend la valeur du MILIEU de la
   bande, ce qui conserve la moyenne. Ce qui change, c'est que le joueur SENT
   le passage. Mesuré sur la courbe d'arme, un niveau valait +4 à +11 % ; une
   bande de trois en vaut +13 à +37 %.

   ⚠ LE PALIER PORTE SUR LES TROIS COURBES — arme, affixes et défense — parce
   qu'elles passent toutes par `facteurObjet`. C'est le choix de Mirja : une
   pièce d'une bande inférieure doit être franchement dépassée, affixes
   compris, et pas seulement un peu moins bonne. */
const OBJ_PALIER=3;

const OBJ_NIV_CALIBRE=22;
const OBJ_PENTE_ARME=0.2,  OBJ_EXP_ARME=1.075;
const OBJ_PENTE_AFF=0.07,  OBJ_EXP_AFFIXE=1.055;
const OBJ_PENTE_DEF=0.15,  OBJ_EXP_DEF=1.065;
/* PAR MORCEAUX, comme la courbe des ennemis, et au MÊME point de calibrage.

   Une exponentielle partant du niveau 1 rendait l'équipement de début de
   partie plus FAIBLE qu'avant — 1,055^13 = 2,0 contre 1+13×0,2 = 3,6 à
   l'ilvl 14 — et alourdissait les trois premiers actes, qu'on ne voulait pas
   toucher. La pente linéaire est donc gardée telle quelle jusqu'à 22, et
   l'exponentielle ne prend le relais qu'au-delà : exactement là où la courbe
   des ennemis change elle aussi de régime. Les deux se règlent ensemble. */
/* Le niveau REPRÉSENTATIF d'une bande : son milieu. Conservé pour les outils
   qui l'interrogent, et pour lire une bande en niveaux. */
function niveauPalier(ilvl){
  const n=Math.max(1,ilvl||1);
  return Math.floor((n-1)/OBJ_PALIER)*OBJ_PALIER+Math.ceil(OBJ_PALIER/2);
}
/* Le NUMÉRO de bande : 0 pour les ilvl 1-3, 1 pour 4-6, et ainsi de suite. */
function bandeObjet(ilvl){ return Math.floor((Math.max(1,ilvl||1)-1)/OBJ_PALIER); }

/* LA PUISSANCE D'UN OBJET NE DÉPEND PLUS QUE DE SA BANDE.

   ⚠ LA PREMIÈRE VERSION DES PALIERS N'A RIEN CHANGÉ À L'OBLIGATION, et il a
   fallu la bonne mesure pour le voir. Elle quantifiait la courbe existante en
   prenant le MILIEU de bande, pour préserver l'enveloppe : la marche devenait
   visible, pas haute. Mesuré en JOUANT le duel, à niveau égal et stuff en
   retard de trois niveaux, le coût était de 0 %, 25 %, 36 % selon le niveau —
   c'est-à-dire un confort, pas une obligation. Mirja : « le but c'est que le
   joueur soit obligé de changer de stuff, là il n'a aucune obligation ».

   LA CIBLE : trois niveaux de retard doivent coûter **47 %** du DPS — le
   milieu des deux bornes qu'elle a données (40 % et 55 %).

   Le facteur de bande n'est PAS 1,89 pour autant. Le DPS varie comme le CARRÉ
   du facteur d'objet : les dégâts de base et le pourcentage de dégâts montent
   tous les deux avec le niveau d'objet, et ils se multiplient. Mesuré au
   niveau 44 : un facteur d'objet de 1,242 par bande donnait 1,56 de DPS.
   Pour 1,89 de DPS il faut donc √1,89 ≈ **1,374** par bande.

   ⚠ LES TROIS COURBES DEVIENNENT IDENTIQUES, et c'est le choix de Mirja :
   « sur tout, affixes compris ». Une pièce d'une bande inférieure doit être
   dépassée sur TOUS ses chiffres, pas seulement sur ses dégâts de base. Les
   paramètres `pente` et `taux` ne servent donc plus — ils restent dans la
   signature parce que quatre appelants les passent, et les retirer serait un
   remaniement sans rapport avec ce réglage. */
const OBJ_TAUX_BANDE=1.45;

/* ⚠ LES AFFIXES NE PEUVENT PAS SUIVRE LA MÊME PENTE, ET J'AI FAIT L'ERREUR.

   Premier jet : les trois courbes recevaient le même facteur de bande. J'en
   ai conclu que les affixes en pourcentage devaient tous être bridés — un
   « +5 % dégâts » atteignait +2 090 % au niveau 60.

   ⚠ MIRJA A TRANCHÉ AUTREMENT, ET SA RÈGLE EST MEILLEURE : « un +5 % de
   dégâts qui vaut +2 090 % au niveau 60 ne me perturbe pas ; par contre un
   vol de vie à 105 %, ou un taux de critique à 90 %, là ça me choque. »

   Ce n'est donc pas « plat contre pourcentage », c'est **BORNÉ contre NON
   BORNÉ**. Les dégâts n'ont pas de plafond naturel : qu'ils explosent est le
   propre du genre. Le vol de vie, le critique, le blocage et la précision en
   ont un — le jeu plafonne déjà le critique à 80 % — et les laisser grimper
   ne produirait pas de la puissance mais du gaspillage.

   Deux familles, donc :
     — NON BORNÉS (dégâts plats, % de dégâts, attributs) : pente intermédiaire.

       ⚠ ET PAS LA PENTE PLEINE, POUR UNE RAISON MESURÉE. Mis sur 1,45 comme
       les dégâts de base, les affixes deviennent aussi gros que l'arme
       elle-même : en avoir un ou trois change tout, et deux personnages du
       MÊME niveau avec le MÊME stuff se retrouvaient à un facteur **3 638**
       l'un de l'autre au niveau 44. Ce n'est plus une chasse au butin, c'est
       une loterie — et rien ne se calibre là-dessus.

       Les affixes montent donc moins vite que la base (1,26 contre 1,45),
       ce qui est le rapport qu'avait la courbe d'origine. La base porte la
       progression, les affixes la nuancent ;
     — BORNÉS (crit, vol de vie, incantation, blocage, précision, cadence,
       trouvaille, ramassage) : pente douce, ×3 sur toute la partie, ce qui
       laisse deux ou trois affixes atteindre le plafond sans le ridiculiser. */
const OBJ_TAUX_BANDE_AFF=1.26;
const OBJ_TAUX_BANDE_BORNE=1.06;

/* LES LIGNES DE PARANGON DES UNIQUES ET LÉGENDAIRES.        (v9.33)

   Demande de Mirja : « les unique et legendaire de lvl 60 vont intégrer des
   palier de parangon aussi ». Les ensembles étaient jusqu'ici le seul endroit
   où les paliers passaient par l'équipement — et seulement une fois les six
   pièces réunies. Hors ensemble, le parangon restait une table qu'on lit sans
   la voir.

   ⚠ LA VALEUR S'ÉCRIT « POUR CENT PALIERS », JAMAIS PAR PALIER.

   La v9.17 a coûté cher là-dessus : les bonus d'ensemble étaient écrits par
   palier, et quand le plafond est passé de 100 à 500 ils ont quintuplé EN
   SILENCE. Une valeur « pour cent » ne bouge pas si le plafond change — et
   elle ne dépend d'AUCUN module, donc `makeGear` n'a pas à importer le
   parangon, ce qui éviterait de justesse une dépendance circulaire.

   Les lignes plafonnées (critique, vol de vie, cadence) portent des valeurs
   volontairement modestes : à 500 paliers elles ajoutent +15 % de critique ou
   +4 % de vol de vie, pas de quoi ramener le vol de vie à 105 % — c'est la
   règle du §51. */
/* ⚠ LE NOM `PARA_LIGNES` ÉTAIT DÉJÀ PRIS par l'index des lignes du panneau
   de parangon (34-parangon.js). Les modules sont concaténés dans UNE SEULE
   portée : deux `const` du même nom font échouer le chargement entier, et le
   message ne désigne pas le coupable. Renommé `LEG_PARA_LIGNES`. */
const LEG_PARA_LIGNES=[
  {t:'dmgMult', par100:6},    /* +30 % de dégâts multiplicatifs à 500 paliers */
  {t:'hpPct',   par100:5},    /* +25 % de vie                                 */
  {t:'critDmg', par100:10},   /* +50 % de dégâts critiques                    */
  {t:'def',     par100:120},  /* +600 de défense                              */
  /* `holy` et `cold` figuraient ici. Aucun des deux n'existe côté héros :
     `holy` est un SORT (`skillRanks.holy`), et le froid n'est qu'une
     résistance d'ENNEMI. Les deux lignes étaient inertes depuis leur écriture.
     Remplacées par deux statistiques réelles et désirables en fin de partie. */
  {t:'sortPct', par100:5},    /* +20 % de puissance des sorts à 400 paliers    */
  {t:'mf',      par100:5},    /* +20 % de trouve-magie                         */
  {t:'crit',    par100:3},    /* +15 % de critique — plafonné à 80 en dur     */
  {t:'leech',   par100:0.8}   /* +4 % de vol de vie                           */
];
/* Le niveau à partir duquel ces lignes apparaissent : le plafond de
   personnage, comme les ensembles. Écrit ici pour que `makeGear` n'ait pas à
   importer `35-ensembles.js`, qui l'importe déjà. */
const LEG_PARA_NIVEAU=60;
/* ⚠ LES LIGNES DE PARANGON SE DÉBLOQUENT PAR PALIERS, PAS EN RAMPE.

   Demandé par Mirja le 30 août 2026 : « pas de lvl 10, lvl 50, lvl 100,
   lvl 200, lvl 400 ? ». La version précédente était une rampe continue
   (`par100 × paraLvl / 100`) : elle montait, mais elle ne se VOYAIT pas. Un
   palier de parangon gagné déplaçait la troisième décimale d'un bonus, et le
   joueur n'avait jamais de jalon à viser — or c'est tout l'intérêt d'un
   système d'après-plafond.

   La puissance totale est conservée : au palier n, la ligne vaut exactement ce
   que la rampe valait au même endroit. Elle y arrive par cinq marches au lieu
   d'une pente, et le panneau annonce la suivante. */
const LEG_PARA_PALIERS=[10,50,100,200,400];
function facteurParaLigne(paraLvl){
  const n=Math.max(0,paraLvl||0);
  let f=0;
  for(let i=0;i<LEG_PARA_PALIERS.length;i++) if(n>=LEG_PARA_PALIERS[i]) f=LEG_PARA_PALIERS[i]/100;
  return f;
}
/* Le prochain jalon, ou 0 quand il n'y en a plus. Sert au panneau : un palier
   qu'on ne peut pas viser ne motive personne. */
function prochainPalierPara(paraLvl){
  const n=Math.max(0,paraLvl||0);
  for(let i=0;i<LEG_PARA_PALIERS.length;i++) if(n<LEG_PARA_PALIERS[i]) return LEG_PARA_PALIERS[i];
  return 0;
}
/* Les statistiques qui ont un plafond, naturel ou codé en dur. */
/* ⚠ LES ATTRIBUTS SONT DES MULTIPLICATEURS DÉGUISÉS.

   La Force multiplie désormais les dégâts du stuff (0,10 %/point). Un affixe
   « +# Force » n'est donc pas une valeur plate mais un FACTEUR — et sur la
   pente des affixes il atteignait **+17 287 de Force** au niveau 60, soit un
   ×18 sur les dégâts. Les 295 points que le joueur répartit lui-même n'y
   pesaient plus que **+10 %**, alors que la règle de Mirja veut justement
   qu'ils comptent pour un pourcentage lisible.

   Les cinq attributs rejoignent donc la famille douce : le stuff en donne un
   appoint, le personnage garde la main sur les siens. */
/* ⚠ ET PAS TOUS LES ATTRIBUTS : SEULS CEUX QUI MULTIPLIENT.

   Premier jet : les cinq y sont passés d'un bloc. Le héros a perdu sa survie
   d'un coup — cinq morts par brute au niveau 60 — parce que la VITALITÉ, elle,
   donne des points de vie PLATS (`60 + vit×7 + niveau×8`). Elle n'a rien d'un
   multiplicateur et doit suivre la même pente que la défense.

   Le partage est donc celui de l'EFFET, pas du nom :
     — Force → multiplie les dégâts du stuff        → pente douce
     — Dextérité → alimente le critique, plafonné   → pente douce
     — Agilité → cadence et incantation, plafonnées → pente douce
     — Vitalité, Énergie → valeurs plates           → pente pleine */
const AFFIX_BORNES={crit:1,leech:1,cast:1,block:1,acc:1,ias:1,mf:1,pick:1,
                    str:1,dex:1,agi:1};

function facteurObjet(tauxBande,ilvl){
  return Math.pow(tauxBande, bandeObjet(ilvl));
}
/* ── LES OBJETS SCELLÉS ─────────────────────────────── phase 4, v9.47

   Notre équivalent du Primal de Diablo III : un légendaire dont **tous les
   affixes sont au maximum de leur plage**.

   ⚠ AUCUNE PUISSANCE NOUVELLE, ET C'EST LE POINT. Le plafond existe déjà —
   c'est le `max` de chaque affixe, qu'un tirage chanceux atteint parfois. Un
   scellé ne le dépasse pas : il le GARANTIT. Ce qu'il apporte est une raison
   de rejouer la Fosse, pas un palier de puissance de plus. Un scellé qui
   sortirait de la plage rendrait caduc tout l'équilibrage mesuré. */

/* La valeur maximale qu'un affixe peut prendre, à rareté et niveau donnés.
   Elle est extraite ICI plutôt que recopiée dans le test : une formule
   dupliquée dans son propre contrôle ne prouve rien — elle se contente de se
   confirmer elle-même. */
function valeurAffixeMax(a,rarity,ilvl){
  const RMUL={white:1,magic:1.15,rare:1.35,unique:1.65,legendary:2.05}[rarity]||1;
  const f=AFFIX_BORNES[a.t]?facteurObjet(OBJ_TAUX_BANDE_BORNE,ilvl)
                           :facteurObjet(OBJ_TAUX_BANDE,ilvl);
  return Math.max(1,Math.round(a.max*f*RMUL));
}

/* Le taux d'apparition d'un scellé, selon le palier de Fosse franchi.

   ⚠ NUL HORS DE LA FOSSE, ET IL LE RESTE. C'est ce qui rattache le scellé au
   contenu, comme le rang de la gravure : on n'en trouve pas en campagne. La
   courbe monte vite au début — un premier scellé doit arriver dans les
   premières descentes, sinon la chasse n'est pas lisible — puis s'aplatit
   sous un plafond : au-delà, tout serait scellé et le mot perdrait son sens. */
const SCELLE_MAX=0.20, SCELLE_DEMI=12;
function tauxScelle(palier){
  const n=Number(palier);
  if(!isFinite(n)||n<=0)return 0;
  return SCELLE_MAX*n/(n+SCELLE_DEMI);
}

function makeGear(slot,rarity,ilvl,opt){
  ilvl=ilvl||player.lvl||1;
  const lv=facteurObjet(OBJ_TAUX_BANDE_AFF,ilvl);
  const wlv=facteurObjet(OBJ_TAUX_BANDE,ilvl);
  const dlv=facteurObjet(OBJ_TAUX_BANDE,ilvl);
  const pool=(GEAR[slot]&&GEAR[slot][rarity]&&GEAR[slot][rarity].length?GEAR[slot][rarity]:(GEAR[slot]&&GEAR[slot].white))||[['Objet',null]];
  const g=pick(pool);
  const [amin,amax]=RAR[rarity].aff;const naff=randi(amin,amax);
  const p=AFFIX.filter(a=>!a.only||a.only===slot);const affixes=[];
  const RMUL={white:1,magic:1.15,rare:1.35,unique:1.65,legendary:2.05}[rarity]||1;
  for(let i=0;i<naff&&p.length;i++){const a=p.splice(randi(0,p.length-1),1)[0];
    /* Chaque affixe prend la pente de SA famille. */
    const f=AFFIX_BORNES[a.t]?facteurObjet(OBJ_TAUX_BANDE_BORNE,ilvl):lv;
    /* Un objet SCELLÉ prend le haut de la plage sur chaque affixe. On passe
       par `valeurAffixeMax` plutôt que d'écrire `a.max*f*RMUL` ici : la
       formule doit vivre à UN seul endroit, sinon les deux dérivent et le
       contrôle ne mord plus. */
    const scelle=!!(opt&&opt.scelle);
    affixes.push({t:a.t, v: scelle ? valeurAffixeMax(a,rarity,ilvl)
                                   : Math.max(1,Math.round(randi(a.min,a.max)*f*RMUL))});}
  const ico={weapon:'🏒',armor:'🛡️',amulet:'📿',ring:'💍',skates:'⛸️',helm:'🪖',gloves:'🧤',belt:'🎗️'}[slot]||'❔';
  const bd=Math.round((slot==='weapon'?({white:5,magic:10,rare:16,unique:22,legendary:30}[rarity]||0):0)*wlv);
  const DEFBY={armor:{white:6,magic:12,rare:20,unique:30,legendary:42},amulet:{white:2,magic:4,rare:6,unique:9},skates:{white:4,magic:6,rare:9,unique:13},helm:{white:3,magic:6,rare:10,unique:16},gloves:{white:2,magic:4,rare:7,unique:11},belt:{white:2,magic:4,rare:6,unique:10}};
  const df=Math.round(((DEFBY[slot]&&DEFBY[slot][rarity])||0)*dlv);
  const it={uid:uidCounter++,slot,name:g[0],ico:ico,img:g[1]||null,rarity,plus:0,ilvl:ilvl,req:Math.max(1,ilvl-randi(1,3)),baseDmg:bd,baseDef:df,affixes};
  /* La marque, seulement quand elle est vraie : un `scelle:false` traînerait
     dans toutes les sauvegardes pour ne rien dire. */
  if(opt&&opt.scelle)it.scelle=true;
  /* La ligne de parangon : uniques et légendaires de l'endgame seulement. */
  if((rarity==='unique'||rarity==='legendary')&&ilvl>=LEG_PARA_NIVEAU){
    const l=pick(LEG_PARA_LIGNES);
    it.para={t:l.t,par100:l.par100};
  }
  if(slot==='skates')it.spd={white:0.15,magic:0.3,rare:0.5,unique:0.75}[rarity]||0;
  if(slot==='belt')it.pot={white:0.1,magic:0.2,rare:0.35,unique:0.5}[rarity]||0;
  const _sk=({white:0,magic:randi(0,1),rare:randi(1,2),unique:randi(2,3),legendary:3})[rarity]||0;if(_sk>0)it.sockets=new Array(_sk).fill(null);
  initDura(it);
  if(rarity==='rare'||rarity==='unique'||rarity==='legendary'){it.unid=true;it.identified=false;}else it.identified=true;
  return it;}
function makeItem(rarity,forceSlot,ilvl){
  const slot=forceSlot||pick(['weapon','armor','amulet','ring','skates','helm','gloves','belt','weapon','armor']);
  return makeGear(slot,rarity,ilvl);
}
const SELL={white:4,magic:16,rare:45,unique:140,legendary:380};
const SALVAGE={white:1,magic:3,rare:7,unique:14,legendary:30};
/* La revente ne dépendait que de la rareté : un objet blanc valait 6 or à
   l'acte 5 comme à l'acte 1, et fouiller le sol n'avait jamais d'intérêt.
   Elle suit désormais le niveau de l'objet — x3 en fin de campagne. */
const sellValue=it=>Math.round((SELL[it.rarity]||4)*(1+((it.ilvl||it.req||1))/18)*(1+(it.plus||0)*0.5));
const salvageValue=it=>(SALVAGE[it.rarity]||1)+(it.plus||0);
/* Forge : c'est le levier de puissance le plus fort du jeu (+66 % de dégâts à
   +5) et il coûtait 3 000 or pour cinq pièces. Courbe quadratique : chaque
   palier supplémentaire coûte nettement plus cher que le précédent. */
/* Prix indexés sur le niveau : à 25 or la potion, en encaisser 36 000 par acte
   revenait à les distribuer. La tension des premières heures est conservée. */
/* Clés de la Fosse : prix de base par palier, x1,8 à chaque achat du même
   palier. C'est le poste qui peut absorber tout l'or dormant d'une fin de jeu. */
const CLE_BASE={bronze:3000,silver:12000,gold:40000};
const prixCle=k=>Math.round((CLE_BASE[k]||3000)*Math.pow(1.8,((player.clesAchetees||{})[k]||0)));
const prixPotion  =()=>15+player.lvl*3;
const prixMana    =()=>12+player.lvl*2;
const prixIdent   =()=>30+player.lvl*2;
const prixPortail =()=>100+player.lvl*6;
const upgradeCost=it=>({frags:2+(it.plus||0)*2, gold:120+Math.pow((it.plus||0),2)*140});
/* Forge : le palier +1 est libre ; au-delà il faut avoir terrassé des échos dans la Fosse */
const UPGRADE_ECHOES=[0,1,3,6,10];   // pour passer à +1, +2, +3, +4, +5
const echoesKilled=()=>player.arenaBossKills||0;
const upgradeNeed=it=>UPGRADE_ECHOES[(it.plus||0)]||0;
const upgradeLocked=it=>echoesKilled()<upgradeNeed(it);
/* UNE DONNÉE DE SAUVEGARDE N'EST PAS DU HTML.

   Le jeu exporte et importe des sauvegardes : c'est le SEUL chemin par lequel
   une donnée passe d'un joueur à un autre, donc le seul par lequel une donnée
   HOSTILE peut entrer. Éprouvé le 29 août 2026 : un objet nommé
   `<img src=x onerror=…>` s'exécutait dès l'ouverture de l'inventaire, et une
   rareté forgée sortait de son attribut `class` pour ajouter un gestionnaire
   d'évènement.

   Aucun nom légitime ne contient de chevron — vérifié sur 240 objets
   engendrés — donc échapper ne casse rien à l'affichage.

   ⚠ CECI NE PROTÈGE PAS DE LA TRICHE, et n'essaie pas. Un joueur qui modifie
   sa propre copie ne peut pas être empêché : le code qui vérifierait serait
   dans le fichier qu'il prétend protéger. Et ce n'est pas un problème — pas de
   serveur, pas de classement, personne d'autre de lésé. On protège ce qui
   TRAVERSE, pas ce qui reste chez soi. */
function echapperHtml(s){
  return String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\u0022/g,'&quot;').replace(/\u0027/g,'&#39;');
  /* ⚠ LES DEUX DERNIERS SONT EN ÉCHAPPEMENT UNICODE, ET C'EST OBLIGATOIRE.
     Écrite `/'/g`, cette expression régulière contient une APOSTROPHE — et
     `convertir_modules.js`, qui masque les chaînes pour trouver les
     déclarations, la prend pour une ouverture de chaîne et avale la fin du
     fichier. Résultat observé : `_demarrer01` disparaissait de la liste
     d'exports et le build refusait de résoudre le graphe, sans que rien ne
     désigne la cause. */
}
/* Pour un ATTRIBUT, échapper ne suffit pas toujours : on n'accepte qu'une
   valeur d'une liste FERMÉE. Une rareté inconnue devient « white ». */
const RARETES_CONNUES={white:1,magic:1,rare:1,unique:1,legendary:1};
function rareteSure(r){ return RARETES_CONNUES[r]?r:'white'; }
/* Idem pour une couleur d'ensemble : seul un code hexadécimal passe. */
function couleurSure(c){ return /^#[0-9a-fA-F]{3,8}$/.test(String(c||''))?c:'#4fd07a'; }

/* UNE PIÈCE D'ENSEMBLE SE RECONNAÎT AU PREMIER COUP D'ŒIL, et elle annonce
   COMBIEN de pièces sont déjà portées. Sans ce compte, il faudrait ouvrir la
   feuille et compter à la main pour savoir si le prochain palier est proche —
   or c'est exactement la question qu'on se pose en ramassant la pièce. */
const itemLabel=it=>{
  const rar=rareteSure(it.rarity);
  /* ⚠ LE SCEAU SE VOIT AVANT L'IDENTIFICATION, ET C'EST TOUTE SA RAISON D'ÊTRE.
     Un objet scellé n'apporte aucune puissance nouvelle : il garantit le haut
     de plage. Ce qu'il apporte est la JOIE DE LE RECONNAÎTRE au sol — comme la
     bordure rouge des Primal de Diablo III. Le cacher derrière un parchemin
     d'identification lui retirerait exactement ce pour quoi il existe. */
  const sceau=it.scelle?' <span style="color:#ff9d3d;font-size:10px">'+tOu('objet.scelle','⛭ scellé')+'</span>':'';
  if(needsId(it))return '<span class="rar-'+rar+'">Objet non identifié</span>'+sceau;
  const plus=it.plus?' <span style="color:#7dff9a">+'+echapperHtml(it.plus)+'</span>':'';
  const niv=(it.slot&&it.slot!=='gem')?' <span style="opacity:.55;font-size:10px">niv '+echapperHtml(it.ilvl||it.req||1)+'</span>':'';
  if(it.set){
    const col=couleurSure(it.setCol||'#4fd07a');
    const e=ENS_PAR_ID[it.set];
    const n=comptesEnsembles()[it.set]||0;
    return '<span style="color:'+col+'">'+echapperHtml(nomObjet(it))+plus+'</span>'+sceau
      +' <span style="color:'+col+';opacity:.7;font-size:10px">'+echapperHtml(e?tOu('ensemble.'+e.id+'.nom',e.nom):'')+' '+n+'/'+ENS_SLOTS.length+'</span>'+niv;
  }
  return '<span class="rar-'+rar+'">'+echapperHtml(nomObjet(it))+plus+'</span>'+sceau+niv;
};
/* ======== LES NOMS D'OBJETS, TRADUITS SANS TOUCHER AUX SAUVEGARDES ========

   `it.name` est ÉCRIT DANS LA SAUVEGARDE, et il sert de clé de recherche
   ailleurs : `GEMS.find(x=>x.name===it.name)` dans la migration, la signature
   d'objet de `02-generation.js`, les panoplies. Le traduire en place casserait
   les trois. Il reste donc le français, et la traduction se fait À
   L'AFFICHAGE, comme pour les quêtes (§36).

   LA CLÉ SE DÉDUIT DU NOM FRANÇAIS, ici, et pas d'un identifiant — parce que
   le nom EST l'identifiant stocké. Il ne peut pas changer sans casser les
   sauvegardes : il est donc aussi stable qu'un identifiant, ce qui lève
   l'objection habituelle.

   Six patins s'appelaient des « Lames » et deux objets une « Banquise »
   (§00) ; renommés en v9.28. Les anciens noms restent dans le dictionnaire
   comme ALIAS, sinon un objet déjà rangé dans une sauvegarde perdrait sa
   traduction. */
function _cleObjet(nom){
  let s=String(nom==null?'':nom).toLowerCase();
  s=s.split('\u0153').join('oe').split('\u00e6').join('ae');
  const A='\u00e0\u00e2\u00e4\u00e1\u00e3\u00e5\u00e7\u00e9\u00e8\u00ea\u00eb\u00ed\u00ec\u00ee\u00ef\u00f1\u00f3\u00f2\u00f4\u00f6\u00f5\u00fa\u00f9\u00fb\u00fc\u00fd\u00ff';
  const B='aaaaaaceeeeiiiinooooouuuuyy';
  let o='';
  for(let i=0;i<s.length;i++){ const k=A.indexOf(s.charAt(i)); o+=(k>=0?B.charAt(k):s.charAt(i)); }
  return o.replace(/[^a-z0-9]+/g,'_').replace(/^_+/,'').replace(/_+$/,'');
}
/* Le nom d'un objet tel qu'il doit s'AFFICHER. Une panoplie ou un mot runique
   réécrit `it.name` à la volée : sans clé connue, on rend ce nom-là. */
function nomObjet(it){
  if(!it)return '';
  return tOu('objet.'+_cleObjet(it.name), it.name||'');
}
function nomRarete(r){
  const d=RAR[rareteSure(r)];
  return tOu('rarete.'+rareteSure(r), d?d.name:'');
}
function affixText(a){const def=AFFIX.find(x=>x.t===a.t);
  const nm=tOu('affixe.'+a.t, def?def.n:(a.t==='dmg'?'+# Dégâts':a.t));
  return nm.replace('#',a.v);}
const inventory=[];
/* CE QUI S'EXÉCUTE AU CHARGEMENT — sorti du premier niveau.

   Le module ne fait plus que DÉCLARER. Ses actions de chargement sont
   appelées par l'entrée, dans l'ordre des préfixes, ce qui rend l'ordre
   d'évaluation des modules INDIFFÉRENT — sans quoi la conversion en
   modules ES les remettrait dans un ordre imprévisible. */
function _demarrer01(){
  "use strict";
  addEventListener('resize',resize);resize();
  addEventListener('resize',()=>{if(typeof caleBarreOnglets==='function')caleBarreOnglets();});
}

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */
function prochainUidCounter(){return uidCounter++;}
function setUidCounter(v){uidCounter=v;}
function setW(v){W=v;}

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */

/* Aides de TEST, rendues à leur propriétaire.                     (Phase 5)
   Elles vivaient dans un autre module que la variable qu'elles écrivent —
   ce qu'une portée globale unique autorisait sans le dire. */
function setViewport(w,h){W=cv.width=w;H=cv.height=h;}



