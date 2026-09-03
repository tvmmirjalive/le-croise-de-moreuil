







/* LES ENSEMBLES DE NIVEAU 60.

   POURQUOI ILS EXISTENT. Mesuré au niveau 60, à équipement identique : le
   parangon à 100 — tout l'endgame — ne pesait que 5,2 % du DPS quand
   l'équipement en pesait 71 %. Relever les valeurs du parangon a corrigé la
   moitié du problème (23,9 % désormais) ; les ensembles corrigent l'autre.

   CE QU'ILS FONT QUE LA PANOPLIE NE FAISAIT PAS. Le jeu comptait déjà les
   uniques portés (`_pPanoplie`) : un bonus générique, sans identité, sans
   objectif. Un ensemble est NOMMÉ, se complète pièce à pièce, et porte un
   bonus qui CROÎT AVEC LE PARANGON. C'est le point de couplage demandé : les
   cent paliers ne se lisent plus seulement dans une table, ils passent par
   l'équipement et se voient sur la feuille de personnage.

   SIX PIÈCES SUR NEUF. Amulette et deux anneaux restent libres : un ensemble
   complet ne doit pas fermer toute la feuille, sinon il n'y a plus de choix
   d'équipement du tout — c'est la faute que Diablo II faisait avec ses
   panoplies intégrales, qu'on portait ou qu'on ignorait. */

const ENS_SLOTS=['weapon','armor','helm','gloves','belt','skates'];

/* Le niveau à partir duquel les ensembles tombent. C'est le plafond : ils
   sont la récompense de l'après-campagne, pas une étape de plus dedans. */
/* ⚠ POURQUOI CHAQUE PALIER PORTE UN `dmgMult`.                    (v9.36)

   Mesuré le 31 août 2026 : un ensemble complet des Outlaws valait **×0,75**
   contre neuf légendaires quelconques — il était donc PIRE que pas
   d'ensemble du tout. Six pièces à réunir, une seule source au monde, pour
   perdre un quart de ses dégâts.

   Deux causes. D'abord une pièce d'ensemble porte 5 affixes là où un
   légendaire en porte 6 : le handicap est structurel. Ensuite les bonus
   étaient en valeurs PLATES — `dmgPct:16`, `crit:20` — qui se noient dans des
   dégâts à deux millions. C'est le défaut des gemmes et des runes, encore
   lui : ce qui ne suit pas la courbe meurt à l'arrivée.

   `dmgMult` est le seul seau que rien d'autre n'alimente : `mult = 1 +
   dmgMult/100`, jamais dilué, quelle que soit la puissance déjà atteinte.
   C'est aussi ce que fait Diablo III, dont TOUS les sets six pièces donnent
   un multiplicateur — y compris les défensifs, sans quoi personne ne les
   porterait en fin de partie.

   Le dosage suit l'orientation : 20/40/160 pour les ensembles offensifs et
   les lanceurs, 15/30/120 pour les deux défensifs (Moreuil, Poilu), qui
   reçoivent en compensation davantage de `hpPct`.

   ⚠ ET TROIS CLÉS NE DÉSIGNAIENT RIEN : `phys`, `holy` et `cold` sont
   inconnues de la fiche de personnage, donc `_pCumuler` les ignorait en
   silence — huit lignes sur cinquante-six. Rebranchées sur `dmg` (dégâts
   plats), `sortPct` (puissance des sorts) et `critDmg`. */
/* ⚠ 60 ÉTAIT TROP TARD, ET ÇA A CASSÉ LE CAUCHEMAR.               (v9.36)

   Les ensembles ne tombaient qu'au plafond. Quand `DIFF_HP` est passé à 10
   pour que l'Enfer résiste à un ensemble complet, l'entrée en Cauchemar —
   niveau 40, aucun ensemble possible — est devenue infranchissable : 22,7 s
   par ennemi ordinaire pour un héros pourtant optimisé, sans le tuer.

   La difficulté d'un mode se calibre sur l'équipement QU'ON PEUT Y AVOIR. En
   interdisant les ensembles avant 60, on demandait au Cauchemar d'être
   franchi avec l'équipement du mode précédent.

   Le seuil descend donc au niveau où commence le Cauchemar. Les pièces sont
   générées au niveau du joueur et non plus au plafond : un ensemble trouvé au
   niveau 42 doit valoir 42, sans quoi il resterait inutilisable jusqu'au 60. */
const ENS_NIVEAU=12;

/* ── ET LE SEUIL DESCEND ENCORE, PARCE QUE LA CAMPAGNE ÉTAIT VIDE ── v9.40

   Mesuré le 4 septembre 2026, en jouant les duels, plafond de mesure porté à
   300 s (les 90 s précédentes étaient un plafond de MESURE, pas un verdict) :

     mode        boss non optimisé   boss optimisé   écart
     Normal          18 à 36 s          11 à 24 s     ×1,5 à ×1,7
     Cauchemar       37 à 117 s        4,0 à 6,3 s    ×8,4 à ×29
     Enfer          244 à 300 s         19 à 44 s     ×6,8 à ×12,6

   Cible de Mirja : ×8 en endgame, ×3 à ×4 en Normal. **L'Enfer y était déjà.**
   Restaient deux écarts qui tiraient en sens INVERSE — trop petit en Normal,
   beaucoup trop grand au Cauchemar.

   Les deux avaient la même cause : les ensembles apparaissaient d'un bloc, à
   PLEINE PUISSANCE, à l'ilvl 40. D'où le vide de la campagne, et une marche de
   ×29 à l'instant exact où ils apparaissent.

   Ils tombent donc dès l'ilvl 12, mais leurs paliers sont PROPORTIONNELS au
   niveau des pièces portées, à pleine puissance à `ENS_PLEIN`. Un seul levier,
   trois cases :

     Normal (ilvl 14–38)    l'ensemble vaut le quart au tiers → l'écart monte
     Cauchemar (ilvl 40–60) il vaut les deux tiers → la marche s'adoucit
     Enfer (ilvl 60)        plein tarif → RIEN NE BOUGE, et c'était déjà juste

   ⚠ `ENS_PLEIN` VAUT LE PLAFOND DU HÉROS, ET CE N'EST PAS UN HASARD. Un
   ensemble complet au niveau maximal doit valoir exactement ce qu'il valait
   avant ce changement, sinon on aurait rééquilibré l'Enfer sans le vouloir —
   or il était bon. `test_ensembles_campagne` fige ce 220. */
/* ⚠ 92, ET PAS 60 — LE CHIFFRE EST MESURÉ. Le sondage donne, sur le gardien
   de l'acte 1 en Enfer, héros au plafond :

     facteur 0,65 → 29,5 s pour un personnage optimisé, écart ×7,3
     facteur 1,00 → 21,9 s,                             écart ×9,9

   La cible de Mirja est 30 s et ×8 : c'est 0,65 qui l'atteint, pas 1. Un
   ensemble n'est donc à pleine puissance qu'à un niveau d'objet que le héros
   ne peut PAS atteindre — 60 / 92 ≈ 0,65 — et il reste de la marge pour les
   niveaux d'objet plus hauts que la Fosse apportera. */
const ENS_PLEIN=92;
/* Un ensemble de début ne doit pas être une décoration : sous ce plancher, le
   joueur porterait six pièces liées pour rien et n'y comprendrait rien. */
const ENS_FACTEUR_MIN=0.20;

/* La force d'un ensemble, d'après le niveau MOYEN de ses pièces portées. */
function facteurEnsemble(ilvlMoyen){
  const f=(ilvlMoyen||0)/ENS_PLEIN;
  return f>=1?1:(f<ENS_FACTEUR_MIN?ENS_FACTEUR_MIN:f);
}

/* Le niveau moyen des pièces portées de chaque ensemble.

   ⚠ ON NE TOUCHE PAS À `comptesEnsembles`. Elle rend une table id → nombre,
   et quatre tests la lisent sous cette forme ; lui faire rendre un objet
   composé les casserait tous en silence sur `c[id] >= 6`. */
function ilvlEnsembles(){
  const somme={}, n={};
  for(const slot of ENS_SLOTS){
    const it=player.equip[slot];
    if(!it||!it.set||isBroken(it))continue;
    somme[it.set]=(somme[it.set]||0)+(it.ilvl||it.lvl||1);
    n[it.set]=(n[it.set]||0)+1;
  }
  const moy={};
  for(const id in somme) moy[id]=somme[id]/n[id];
  return moy;
}


/* Le nom, la description et les noms de pièces d'un ensemble, traduits.

   ⚠ `it.name` D'UNE PIÈCE D'ENSEMBLE EST RÉÉCRIT à l'équipement et part dans
   la sauvegarde (§40) : `nomObjet()` le retrouve par sa réduction, comme une
   base ordinaire. Rien de particulier à faire ici pour les pièces — seuls le
   nom de l'ENSEMBLE et sa description passent par ces deux accesseurs.

   « Forgée dans les gradins fondus de la vieille PATINOIRE » : faute §00
   corrigée en v9.31, en même temps que l'ajout d'ENSEMBLES au crible. */
function nomEnsemble(e){ return e?tOu('ensemble.'+e.id+'.nom', e.nom):''; }
function descEnsemble(e){ return e?tOu('ensemble.'+e.id+'.desc', e.desc):''; }

const ENSEMBLES=[
 {id:'outlaws', nom:'Livrée des Outlaws', col:'#4fd07a',
  desc:"Ce que portait l'équipe le soir du sacre, avant le pacte.",
  pieces:{weapon:'Crosse du Dernier Outlaw', armor:'Maillot de Moreuil',
          helm:'Casque cabossé', gloves:'Gants de la Ligne',
          belt:'Ceinture du Capitaine', skates:'Patins du Bitume'},
  paliers:[
    {n:2, b:{dmg:25, ias:8, dmgMult:20}},
    {n:4, b:{dmgPct:14, crit:20, dmgMult:40}},
    {n:6, b:{dmg:45, dmgPct:16, leech:4, dmgMult:160}}],
  /* +25 % de dégâts À PARANGON PLEIN — exprimé RELATIVEMENT au plafond.

     Ces trois coefficients étaient écrits par palier (0,25 par palier pour
     +25 % à cent). Quand le plafond est passé de 100 à 500, ils ont
     quintuplé EN SILENCE : la Livrée serait montée à +125 % de dégâts sans
     que rien ne le signale. Les diviser par PARA_MAX les rend insensibles au
     prochain changement de plafond. */
  parangon:{dmgMult:25/PARA_MAX}},

 {id:'falcon', nom:'Parure du Green Falcon', col:'#e0a24a',
  desc:"Les oripeaux du coach damné. Ils brûlent la main qui les prend.",
  pieces:{weapon:'Crosse aux Serres', armor:'Plastron du Faucon',
          helm:'Masque à Bec', gloves:'Serres de Cuir',
          belt:'Sangle du Sacre', skates:'Patins de Cendre'},
  paliers:[
    {n:2, b:{cast:18, mpPct:12, dmgMult:20}},
    {n:4, b:{sortPct:30, critDmg:30, dmgMult:40}},
    {n:6, b:{cast:30, ene:40, mpPct:18, dmgMult:160}}],
  /* Les sorts d'abord, toujours rapporté au plafond. */
  parangon:{cast:50/PARA_MAX, holy:20/PARA_MAX, cold:20/PARA_MAX}},

 {id:'moreuil', nom:'Carapace de Moreuil', col:'#5a86b8',
  desc:"Forgée dans les gradins fondus du vieux gymnase.",
  pieces:{weapon:'Masse de Chantier', armor:'Carapace de Gradin',
          helm:'Heaume de Moreuil', gloves:'Mitaines de Fer',
          belt:'Ceinturon de Poutre', skates:'Patins Lestés'},
  paliers:[
    {n:2, b:{def:120, vit:25, dmgMult:15}},
    {n:4, b:{hpPct:14, def:200, dmgMult:30}},
    {n:6, b:{hpPct:28, vit:50, leech:3, dmgMult:120}}],
  /* +25 % de PV à parangon plein. */
  parangon:{hpPct:25/PARA_MAX}},

 /* ---- LES CINQ ENSEMBLES AJOUTÉS EN v9.33 ----

    Demande de Mirja : « il va falloir un nombre conséquent d'ensembles ». Il
    y en avait trois — de quoi nommer l'endgame, pas de quoi le peupler. Huit
    donnent un vrai choix : chacun tire vers un axe différent, et aucun n'est
    la version faible d'un autre.

    Le mécanisme de VISÉE (66 % des pièces vont vers l'ensemble déjà le plus
    avancé) fait qu'ajouter des ensembles élargit le choix sans allonger la
    complétion à proportion. Sans lui, passer de trois à huit aurait rendu
    l'objectif inatteignable. */

 {id:'glaciere', nom:'Habit de la Glacière', col:'#7fd0ff',
  desc:"Ce que le froid a gardé de ceux qui n'en sont pas ressortis.",
  pieces:{weapon:'Crosse de Givre Vif', armor:'Cotte de la Glacière',
          helm:'Capuche Gelée', gloves:'Gantelets de Frimas',
          belt:'Ceinture de Stalactite', skates:'Roues de Glacier'},
  paliers:[
    {n:2, b:{critDmg:35, cast:12, dmgMult:20}},
    {n:4, b:{ene:40, mpPct:16, dmgMult:40}},
    {n:6, b:{critDmg:60, cast:25, dmgPct:18, dmgMult:160}}],
  parangon:{cold:40/PARA_MAX, cast:30/PARA_MAX}},

 {id:'poilu', nom:'Paquetage du Poilu', col:'#a89b6a',
  desc:"Cent-huit ans de garde, et l'uniforme tient encore.",
  pieces:{weapon:'Crosse de Tranchée', armor:'Capote de 1918',
          helm:'Casque Adrian Cabossé', gloves:'Mitaines de Guetteur',
          belt:'Ceinturon de Cuir Craquelé', skates:'Roues Cloutées'},
  paliers:[
    {n:2, b:{def:150, block:12, dmgMult:15}},
    {n:4, b:{vit:45, hpPct:12, dmgMult:30}},
    {n:6, b:{def:280, block:18, hpPct:26, dmgMult:120}}],
  parangon:{def:400/PARA_MAX, hpPct:20/PARA_MAX}},

 {id:'vaast', nom:'Ornements de Sœur Vaast', col:'#f0e0a0',
  desc:"Bénis un dimanche, portés le lundi. Elle n'a pas demandé la permission.",
  pieces:{weapon:'Crosse Bénie', armor:'Chasuble de Saint-Vaast',
          helm:'Voile de la Sacristie', gloves:'Gants de Communion',
          belt:'Cordon de Chœur', skates:'Roues de Procession'},
  paliers:[
    {n:2, b:{sortPct:40, crit:10, dmgMult:20}},
    {n:4, b:{dex:40, acc:20, dmgMult:40}},
    {n:6, b:{sortPct:70, crit:15, dmgPct:20, dmgMult:160}}],
  /* ⚠ LE CRITIQUE EST PLAFONNÉ À 80 % EN DUR (§51) : sa part de parangon
     reste volontairement petite, sinon elle ne produirait que du gaspillage. */
  parangon:{holy:45/PARA_MAX, crit:10/PARA_MAX}},

 {id:'fosse', nom:'Harnachement de la Fosse', col:'#ff8a3d',
  desc:"Neuf ans de gardien, et tout ce qu'il en a rapporté.",
  pieces:{weapon:'Crosse des Neuf Ans', armor:'Plastron d’Arène',
          helm:'Grille de Gardien', gloves:'Poignes d’Anselme',
          belt:'Sangle de Cage', skates:'Roues de Sable Rouge'},
  paliers:[
    {n:2, b:{crit:12, critDmg:30, dmgMult:20}},
    {n:4, b:{mf:35, ias:12, dmgMult:40}},
    {n:6, b:{crit:16, critDmg:60, dmgPct:22, dmgMult:160}}],
  /* Les dégâts critiques n'ont pas de plafond, eux : ils peuvent porter. */
  parangon:{critDmg:80/PARA_MAX, mf:40/PARA_MAX}},

 {id:'verdier', nom:'Vestige du Coach Verdier', col:'#6fbf6f',
  desc:"Ce qu'il portait le soir du pacte. Ça sent encore le vestiaire et la peur.",
  pieces:{weapon:'Crosse du Sacre', armor:'Survêtement du Coach',
          helm:'Casquette Damnée', gloves:'Gants de Serrement',
          belt:'Ceinture de Sifflet', skates:'Roues du Dernier Match'},
  paliers:[
    {n:2, b:{leech:4, dmgPct:16, dmgMult:20}},
    {n:4, b:{str:45, moveSpeed:0.15, dmgMult:40}},
    {n:6, b:{leech:6, dmgPct:28, ias:14, dmgMult:160}}],
  /* Le vol de vie est plafonné par le bon sens (§51) : trois points au
     parangon plein. Le gros du couplage passe par le seau multiplicatif, qui
     n'a pas de plafond. */
  parangon:{dmgMult:20/PARA_MAX, leech:3/PARA_MAX}}
];

/* Index identifiant → ensemble, construit une fois. */
const ENS_PAR_ID={};
function _indexerEnsembles(){ for(const e of ENSEMBLES)ENS_PAR_ID[e.id]=e; }

/* Fabrique une pièce d'ensemble. Elle passe par makeGear pour hériter de tout
   ce qui fait un objet du jeu — affixes, sertissages, durabilité, dégâts de
   base — puis reçoit son identité.

   Elle est IDENTIFIÉE d'office : un ensemble se reconnaît à sa pièce, et
   laisser le joueur découvrir en l'identifiant qu'il tenait la sixième pièce
   qu'il cherchait serait une fausse tension. */
/* ⚠ UNE PIÈCE D'ENSEMBLE DE CAMPAGNE N'EST PAS UNE LÉGENDAIRE.

   Mesuré le 4 septembre 2026, en sondant le facteur d'ensemble palier par
   palier sur le gardien de l'acte 5 en Normal :

     facteur 0 (pas d'ensemble)  → écart ×1,7
     facteur 0,08                → écart ×12,4
     facteur 1,00                → écart ×33,4

   Le saut est ENTRE 0 ET 0,08, pas le long de la courbe. Ce n'est donc pas la
   force des paliers qui domine dans la campagne, c'est la RARETÉ de la base :
   `makeSetGear` fabriquait une légendaire quel que soit le niveau, et une
   légendaire au niveau 38 vaut deux crans de rareté de plus que ce que porte
   un joueur de campagne. L'ensemble apportait ×12 avant même son premier
   palier.

   La base suit donc la rareté du niveau, comme n'importe quel butin : rare
   dans la campagne, légendaire à partir du Cauchemar. C'est ce que le plan
   demandait en toutes lettres — « les ensembles de campagne restent plus
   faibles que ceux d'endgame ». */
const ENS_RARETE_LEG=40;          // ilvl à partir duquel la base est légendaire
function rareteSetGear(ilvl){ return ilvl>=ENS_RARETE_LEG?'legendary':'rare'; }

function makeSetGear(setId,slot,ilvl){
  const e=ENS_PAR_ID[setId]; if(!e)return null;
  const nom=e.pieces[slot]; if(!nom)return null;
  const il=Math.max(1,ilvl||ENS_NIVEAU);
  const it=makeGear(slot,rareteSetGear(il),il);
  it.set=e.id; it.name=nom; it.setCol=e.col;
  it.unid=false; it.identified=true;
  return it;
}

/* Combien de pièces de chaque ensemble sont portées.

   UNE PIÈCE BRISÉE NE COMPTE PAS — même règle que la panoplie
   (`_pEquipement` fait `continue` sur `isBroken`). L'oublier aurait donné un
   ensemble qui tient ses promesses avec de l'équipement hors d'usage. */
function comptesEnsembles(){
  const c={};
  for(const slot of ENS_SLOTS){
    const it=player.equip[slot];
    if(!it||!it.set)continue;
    if(isBroken(it))continue;
    c[it.set]=(c[it.set]||0)+1;
  }
  return c;
}

/* Le bonus consolidé de tous les ensembles portés. Même forme que
   `treeBonus` et `paraBonus` : une table clé → total. */
function bonusEnsembles(){
  const B={}, c=comptesEnsembles(), il=ilvlEnsembles();
  for(const id in c){
    const e=ENS_PAR_ID[id]; if(!e)continue;
    const n=c[id], f=facteurEnsemble(il[id]);
    for(const p of e.paliers){
      if(n<p.n)continue;
      /* Le palier est mis à l'échelle du niveau des pièces. Arrondi PAR
         PALIER et non sur le total : c'est ce que la fiche de personnage
         affiche, et un total juste composé de lignes fausses se voit. */
      for(const k in p.b){
        const val=f>=1?p.b[k]:Math.round(p.b[k]*f);
        if(val)B[k]=(B[k]||0)+val;
      }
    }
    /* LE BONUS DE PARANGON NE COULE QUE SUR UN ENSEMBLE COMPLET. C'est ce qui
       en fait un objectif : cinq pièces sur six ne donnent rien de la centaine
       de paliers accumulés. */
    if(n>=ENS_SLOTS.length){
      const pl=player.paraLvl||0;
      for(const k in e.parangon){
        const v=Math.round(e.parangon[k]*pl*100)/100;
        if(v)B[k]=(B[k]||0)+v;
      }
    }
  }
  return B;
}

/* L'ensemble complet porté, s'il y en a un — pour l'affichage. */
function ensembleComplet(){
  const c=comptesEnsembles();
  for(const id in c) if(c[id]>=ENS_SLOTS.length) return ENS_PAR_ID[id]||null;
  return null;
}

/* UNE PIÈCE QUI TOMBE, ET QUI VISE.

   Le tirage entièrement au hasard serait cruel : trois ensembles de six
   pièces font dix-huit tirages possibles, et compléter le sixième emplacement
   d'un ensemble donné demanderait des dizaines de descentes — c'est le
   problème du collectionneur de vignettes, et Diablo III a fini par le
   corriger avec son « smart loot ».

   Deux fois sur trois, la pièce complète l'ensemble que le joueur porte déjà
   le plus, sur un emplacement qui lui manque. Le reste du temps elle est
   quelconque, pour qu'on découvre encore quelque chose. */
/* Fraction de la chance de légendaire du palier. Bronze 0,35 → 0,21 ;
   Sceau du Falcon 1,00 → 0,60. */
const ENS_CHANCE=0.6;
const ENS_VISEE=0.66;
function pieceEnsembleAuHasard(ilvl){
  const c=comptesEnsembles();
  let vise=null, meilleur=0;
  for(const id in c) if(c[id]>meilleur&&c[id]<ENS_SLOTS.length){meilleur=c[id];vise=id;}
  if(vise&&alea()<ENS_VISEE){
    const e=ENS_PAR_ID[vise];
    const manquants=ENS_SLOTS.filter(function(sl){
      const it=player.equip[sl];
      return e.pieces[sl]&&!(it&&it.set===vise);
    });
    if(manquants.length)
      return makeSetGear(vise, manquants[randi(0,manquants.length-1)], ilvl);
  }
  const e=pick(ENSEMBLES);
  const slots=Object.keys(e.pieces);
  return makeSetGear(e.id, slots[randi(0,slots.length-1)], ilvl);
}

function _demarrer35(){ _indexerEnsembles(); }



