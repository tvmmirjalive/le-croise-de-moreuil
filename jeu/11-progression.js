



















/* ================================================================
   EXPÉRIENCE SELON L'ÉCART DE NIVEAU

   Jusqu'ici un ennemi rapportait la même chose quel que soit son niveau : un
   diablotin de niveau 26 valait exactement un diablotin de niveau 4. Deux
   effets pervers — on pouvait farmer indéfiniment le premier acte, et un joueur
   parti trop vite ne rattrapait jamais son retard.

   L'écart joue désormais des deux côtés :

     plus fort que toi   ->  jusqu'à +60 %   (rattrapage)
     à ton niveau        ->  100 %
     plus faible que toi ->  jusqu'à -75 %   (le vieux contenu ne paie plus)

   Volontairement modéré : un rapport de quatre entre les deux extrêmes. Une
   courbe brutale à la Diablo II punirait l'exploration, ce qui n'est pas le but.
   Les bornes sont atteintes à +6 et -8 niveaux : au-delà, plus rien ne bouge. */
/* L'XP MONTE, PUIS REDESCEND — corrigé en 8.74.

   Défaut mesuré : l'expérience plafonnait à x1,60 dès +6 niveaux et y
   restait, pendant que les dégâts subis continuaient de grimper jusqu'à
   x1,90. La zone la plus RENTABLE était donc exactement celle où l'on
   meurt : le jeu payait le joueur pour faire ce qu'il prétendait punir.

   La courbe culmine désormais à +6 — l'avance raisonnable — puis redescend.
   Le croisement avec la courbe des dégâts tombe vers +9 / +10, c'est-à-dire
   là où la zone devient « punitive » au sens où on l'a définie. Au-delà,
   foncer n'est plus seulement risqué : c'est un mauvais calcul. */
const XP_ECART={pente_haut:0.10, pente_bas:0.09, sommet:6, redescente:0.07,
                plafond:1.6, plancher:0.25, plancher_haut:0.70};
function xpMultNiveau(nivEnnemi,nivJoueur){
  const d=(nivEnnemi||1)-(nivJoueur||1);
  if(d<=0)return Math.max(XP_ECART.plancher,1+d*XP_ECART.pente_bas);
  const s=XP_ECART.sommet;
  const m=(d<=s)?(1+d*XP_ECART.pente_haut)
                :((1+s*XP_ECART.pente_haut)-(d-s)*XP_ECART.redescente);
  return Math.max(XP_ECART.plancher_haut,Math.min(XP_ECART.plafond,m));
}
/* Le taux global (17 %) s'applique UNE FOIS, sur le montant complet.
   Depuis que le gain se découpe en orbes, l'appliquer par orbe ferait perdre
   un peu d'expérience à chaque arrondi : 77 XP en quatre parts ne valaient
   plus 77. `gainXp` reste l'entrée publique (quêtes, relique) ; `crediterXp`
   verse un montant DÉJÀ net, et c'est lui que les orbes appellent. */
function xpNet(v){return Math.max(1,Math.round((v||0)*0.17));}
function gainXp(v){return crediterXp(xpNet(v));}
/* ============================================================
   LE RATTRAPAGE — pour que le parangon s'ouvre à Cauchemar acte 5
   quel que soit le style de jeu.
   ============================================================

   LE PROBLÈME, MESURÉ. Le plafond de 60 tombait à Cauchemar acte 4 pour un
   joueur qui nettoie tout, à Enfer acte 4 à 50 % de nettoyage, et JAMAIS en
   dessous de 25 %. Or un joueur qui va droit au boss ne croise que 15 à 30 %
   des monstres — mesuré par chemin A* de l'entrée de chaque acte jusqu'au
   boss. La promesse ne tenait donc que pour un complétiste.

   CE QUE FONT LES AUTRES. Dans Diablo IV, le seuil du parangon (niveau 50)
   est atteint « simplement en progressant dans l'histoire principale et les
   quêtes annexes » : il est garanti par le CONTENU. Dans Diablo III, la
   campagne seule ne suffit pas et les joueurs basculent en mode Aventure.
   C'est le modèle de Diablo IV qu'on vise, rendu explicite.

   QUATRE SOLUTIONS ONT ÉTÉ SIMULÉES (voir Etude_parangon.md §14) :
   — ne rien faire : ne tient pas la promesse ;
   — multiplier l'XP des kills quand on est en retard : ne referme jamais le
     cas du joueur très pressé, qui ne tue presque rien ;
   — payer les quêtes à prix fixe : CASSE le rythme du complétiste, qui
     plafonne alors dès Normal acte 5 ;
   — payer les quêtes en fonction du RETARD : retenu.

   POURQUOI ÇA MARCHE. Le don est proportionnel au retard, donc un joueur à
   l'heure reçoit exactement ZÉRO — la mécanique lui est invisible et son
   avance est préservée. Et les quêtes principales sont OBLIGATOIRES : un
   joueur pressé les fait par définition, contrairement aux monstres.

   POURQUOI À L'ÉTAPE ET NON À LA QUÊTE. Payer les 25 quêtes donnait des
   sauts de 1,6 niveau d'un coup — une mécanique qu'on voit fonctionner n'en
   est plus une. Les mêmes quêtes comptent 73 ÉTAPES, soit quinze par acte au
   lieu de cinq : le plus gros don tombe à 0,6 niveau pour un joueur
   ordinaire, sans écrire une ligne de contenu. */
const RATTRAPAGE_K=0.15;
/* De combien Cauchemar démarre au-dessus de la fin de Normal. */
const RATTRAPAGE_MARGE=2;

/* La courbe visée, écrite RELATIVEMENT aux tables du jeu et jamais en dur :
   c'est la règle du §29 des règles du projet — une constante exprimée par
   unité d'une autre dérive en silence dès que celle-ci change. Si ACT_START,
   ACT_END ou LEVEL_CAP bougent, la courbe suit. */
function niveauVise(diff,acte){
  const a=Math.max(0,Math.min(ACT_START.length-1,acte|0));
  if((diff||0)<=0)return ACT_START[a];
  if((diff||0)>=2)return LEVEL_CAP;
  const deb=ACT_END[ACT_END.length-1]+RATTRAPAGE_MARGE;
  return Math.round(deb+(LEVEL_CAP-deb)*a/(ACT_START.length-1));
}

/* Versé au franchissement d'une étape de quête PRINCIPALE. Renvoie le montant
   pour que le test puisse le lire ; zéro quand le joueur est à l'heure. */
function rattraperEtape(){
  if((player.lvl||1)>=LEVEL_CAP)return 0;
  const a=(level&&level.actNum!=null)?level.actNum:0;
  const retard=Math.max(0,niveauVise(difficulty,a)-player.lvl);
  if(retard<=0)return 0;
  const don=Math.round(RATTRAPAGE_K*retard*(player.xpNext||1));
  if(don>0)crediterXp(don);
  return don;
}

function crediterXp(v){
  v=Math.max(0,Math.round(v||0));if(v<=0)return;
  player.xpTotal+=v;
  /* AU PLAFOND, L'EXPÉRIENCE N'EST PLUS PERDUE : elle va au parangon. Avant,
     elle s'entassait dans player.xp derrière une boucle que `lvl<LEVEL_CAP`
     n'ouvrait plus jamais — six actes de jeu ne rapportaient donc rien. */
  if(player.lvl>=LEVEL_CAP){crediterParagon(v);refreshHud();return;}
  player.xp+=v;
  while(player.xp>=player.xpNext&&player.lvl<LEVEL_CAP){
    player.xp-=player.xpNext;player.lvl++;player.xpNext=Math.round(40*Math.pow(player.lvl,1.5));
    player.statPts+=5;player.treePts+=1;const st=P();player.hp=st.hpMax;player.mp=st.mpMax;SFX.levelup();
    toast(t('prog.niveau',{n:player.lvl}),2.2);burst(player.x,player.y,'#f4d35e',26);}
  /* AU FRANCHISSEMENT DU PLAFOND, LE RELIQUAT APPARTIENT DÉJÀ AU PARANGON.
     Sans ce déversement il restait coincé dans `player.xp` : la boucle
     ci-dessus s'arrête sur `lvl<LEVEL_CAP` et le raccourci d'entrée ne
     s'ouvre qu'à l'appel SUIVANT. L'expérience du coup qui fait passer 60
     était donc perdue — et un héros qui atteint le plafond sur le boss final
     repartait à parangon 0 avec un reliquat invisible. */
  if(player.lvl>=LEVEL_CAP&&player.xp>0){const _r=player.xp;player.xp=0;crediterParagon(_r);}
  refreshHud();
}
function useManaPotion(){
  if(player.manaPots<=0){toast(t('prog.plusDeMana'),1);return;}
  const st=P();if(player.mp>=st.mpMax){toast(t('prog.manaPlein'),1);return;}
  player.manaPots--;player.mp=Math.min(st.mpMax,player.mp+Math.round(st.mpMax*0.5));SFX.potion();
  playOnce('Drinking');floatText(player.x,player.y-30,'+MANA','#7dd0ff');burst(player.x,player.y,'#5ec8ff',12);refreshHud();
}
function usePotion(){
  if(level&&level.arena)level.arena.potUsed=true;
  if(level&&level.arena&&level.arena.noPot){toast(t('prog.sobriete'),1.6);return;}
  if(player.potions<=0){toast(t('prog.plusDePotions'),1);return;}
  const st=P();if(player.hp>=st.hpMax){toast(t('prog.viePleine'),1);return;}
  player.potions--;soigner(Math.round(st.hpMax*(0.5+((player.equip.belt&&player.equip.belt.pot)||0))));SFX.potion();
  playOnce('Drinking');
  floatText(player.x,player.y-30,'+SOIN','#7dff9a');burst(player.x,player.y,'#7dff9a',12);refreshHud();
}
/* Réduction de dégâts par la défense.
   Ancienne formule : def/(def+80), plafond 70 %. Le plafond tombait à 187 de
   défense, atteint dès le niveau 23 — après quoi toute l'armure ramassée ne
   servait plus à rien, et un monstre de fin de jeu mettait 150 coups à tuer.
   La constante suit maintenant le NIVEAU de l'agresseur : l'armure garde sa
   valeur toute la partie, et une pièce trouvée à l'acte 5 est un vrai progrès. */
function reductionDef(def,niveauAgresseur){
  const seuil=60+14*Math.max(1,niveauAgresseur||1);
  return clamp(def/(def+seuil),0,0.75);
}
/* ================================================================
   ÉCART DE NIVEAU — le prix de l'avance (8.67)

   La 8.62 récompense déjà en EXPÉRIENCE le joueur qui affronte plus fort
   que lui. Rien ne le PUNISSAIT de le faire. Un personnage niveau 21 dans
   un acte prévu pour 31 encaissait exactement comme un personnage à
   niveau : il pouvait forcer le passage.

   Deux pentes, pour que le message soit clair :
     jusqu'à +5  → +3 % de dégâts par niveau : on sent que ça mord, on peut
                   tenir. C'est l'avance raisonnable.
     au-delà     → +5,5 % par niveau, soit près du DOUBLE de pente.

   Ces chiffres paraissent modestes : ils s'ajoutent à la courbe propre des
   monstres, qui fait déjà le gros du travail. Mesuré sur un héros niveau 21
   équipé de magique +1, coups encaissés avant de tomber :

     monstres 21 (à niveau) ... 11 coups
     monstres 26 (+5) .......... 5 coups   — dur, jouable
     monstres 31 (+10) ......... 3 coups   — on fait demi-tour

   Trois coups, c'est punitif sans être une exécution : on a le temps de
   comprendre et de reculer. Plafond x1,9.

   Rien en dessous du niveau du joueur : les monstres plus faibles frappent
   déjà moins fort par leur propre courbe, et la 8.62 leur retire déjà
   l'expérience. Deux punitions pour la même chose seraient une de trop. */
const DEG_ECART={doux:0.03, dur:0.055, seuil:5, plafond:1.9};
function degatsMultEcart(nivEnnemi,nivJoueur){
  const d=(nivEnnemi||1)-(nivJoueur||1);
  if(d<=0)return 1;
  const doux=Math.min(d,DEG_ECART.seuil)*DEG_ECART.doux;
  const dur=Math.max(0,d-DEG_ECART.seuil)*DEG_ECART.dur;
  return Math.min(DEG_ECART.plafond,1+doux+dur);
}
/* ================================================================
   LES QUATRE ÉLÉMENTS SUBIS PAR LE HÉROS                     (v9.54)

   ⚠ LE HÉROS N'A AUCUNE RÉSISTANCE ÉLÉMENTAIRE, ET C'EST VOULU.

   La v9.35 avait déjà retiré `holy` et `cold` des lignes de parangon en
   constatant qu'elles étaient INERTES depuis leur écriture : `holy` est un
   sort, `cold` une résistance d'ENNEMI. Les remettre côté héros aurait
   demandé une ligne d'affixe, une case de panneau, un ensemble et un
   rééquilibrage complet — pour une statistique que le joueur ne peut pas
   lire pendant un combat.

   La contrepartie n'est donc pas une résistance qu'on PORTE, c'est une
   faiblesse que l'ennemi PORTE, exprimée dans le triangle phys/cold/holy
   que le héros possède déjà (voir Plan_ennemis_elementaires.md §3). Ce que
   l'élément change ici, c'est un ÉTAT — quelque chose qui se voit, qui dure
   quelques secondes, et auquel on répond en jouant.

   Aucun de ces états n'entre dans la sauvegarde : recharger une brûlure de
   trois secondes n'aurait aucun sens. `reinitialiserPartie` les efface.
   ================================================================ */
const BRULURE_DUREE=3.0;    /* secondes                                    */
const BRULURE_PART=0.30;    /* part du coup rejouée en dégâts sur la durée */
const BRULURE_TIC=0.5;      /* ⚠ sans palier, la brûlure crache un chiffre
                               flottant par image : illisible, et la vie
                               tombait en décimales dans le bandeau.       */
const GEL_DUREE=2.2;        /* aligné sur `en.chill`, qui existait déjà    */
const DECHARGE_MANA=2.6;    /* > le verrou ordinaire de 1,5 s de damagePlayer */
const VENIN_MAX=3;
const VENIN_DUREE=5.0;
const VENIN_SOIN=0.22;      /* soin perdu PAR CHARGE : 66 % à trois        */

/* ⚠ LE VENIN NE « COUPE PAS LA RÉGÉNÉRATION » : IL N'Y EN A PAS.

   Le plan parlait de régénération de vie. En relisant le code : le héros
   n'en a aucune — la vie ne revient que par potion, par Cri de Guerre et
   par vol de vie. Couper une régénération inexistante aurait fait un
   quatrième état décoratif, exactement ce que §3 cherche à éviter.

   Le venin réduit donc LE SOIN REÇU, sur ces trois voies. C'est ce qui rend
   le Cracheur dangereux : on ne peut pas simplement boire. */
function malusSoinVenin(){
  return Math.max(0, 1-Math.min(VENIN_MAX,player.venom||0)*VENIN_SOIN);
}
/* LE POINT DE PASSAGE UNIQUE DU SOIN. Trois endroits rendaient de la vie —
   la potion, le Cri de Guerre, le vol de vie — chacun avec son propre
   `Math.min(st.hpMax, …)`. Le venin devait mordre sur les trois : plutôt
   que de recopier le malus trois fois, tout passe ici. Renvoie ce qui a
   RÉELLEMENT été rendu, pour que l'appelant puisse l'afficher. */
function soigner(montant){
  if(!(montant>0))return 0;
  const st=P();
  const eff=Math.max(1,Math.round(montant*malusSoinVenin()));
  const avant=player.hp;
  player.hp=Math.min(st.hpMax,player.hp+eff);
  return player.hp-avant;
}

/* L'état posé par un coup élémentaire. Appelé APRÈS que les dégâts ont été
   encaissés : un coup bloqué ne pose rien, puisque `damagePlayer` sort
   avant. */
function appliquerStatutElement(type,degatsRecus){
  if(!type||type==='phys'||type==='holy')return;
  if(type==='fire'){
    /* On garde le PIRE et on renouvelle la durée. Empiler les dégâts par
       seconde ferait qu'un ennemi de feu à cadence rapide tue par
       accumulation invisible, sans que le joueur voie jamais de gros coup. */
    const dps=Math.max(1,(degatsRecus*BRULURE_PART)/BRULURE_DUREE);
    player.burnDps=Math.max(player.burnDps||0,dps);
    player.burn=BRULURE_DUREE;
    floatText(player.x,player.y-44,t('combat.brule'),DMG_COL.fire);
  } else if(type==='cold'){
    player.chill=Math.max(player.chill||0,GEL_DUREE);
    floatText(player.x,player.y-40,t('combat.gele'),DMG_COL.cold);
  } else if(type==='shock'){
    player._mpLock=Math.max(player._mpLock||0,DECHARGE_MANA);
    floatText(player.x,player.y-44,t('combat.decharge'),DMG_COL.shock);
  } else if(type==='venom'){
    const avant=player.venom||0;
    player.venom=Math.min(VENIN_MAX,avant+1);
    player.venomT=VENIN_DUREE;      /* chaque charge relance la durée entière */
    if(player.venom>avant)floatText(player.x,player.y-44,
      t('combat.venin',{n:player.venom}),DMG_COL.venom);
  }
}

/* Les états qui s'écoulent, une image à la fois. Appelé par
   `_majMinuteursHeros`, aux côtés du gel et du verrou de mana. */
function majStatuts(dt){
  if(player.dying||player._finale)return;
  if((player.burn||0)>0){
    player.burn-=dt;
    player._burnTic=(player._burnTic||0)+dt;
    if(player._burnTic>=BRULURE_TIC){
      player._burnTic-=BRULURE_TIC;
      const n=Math.max(1,Math.round((player.burnDps||0)*BRULURE_TIC));
      player.hp-=n;
      floatText(player.x,player.y-28,n,DMG_COL.fire);
      verifierMortDuHeros();
    }
    if(player.burn<=0){player.burn=0;player.burnDps=0;player._burnTic=0;}
  }
  if((player.venomT||0)>0){
    player.venomT-=dt;
    if(player.venomT<=0){player.venomT=0;player.venom=0;}
  }
}

/* LA MORT, EN UN SEUL ENDROIT. Elle était écrite en toutes lettres à la fin
   de `damagePlayer` ; la brûlure peut tuer elle aussi, et recopier ce bloc
   aurait laissé deux morts qui divergent — l'une déposant le sac, l'autre
   non. */
function verifierMortDuHeros(){
  if(player.hp>0||player.dying)return;
  player.hp=0;player.dying=true;player.dyingT=0;player.path=null;
  player.attackTarget=null;player.anim='Idle';player.animOnce=false;
  SFX.death();vibrer(VIB.mort);SFX.hurt();
  burst(player.x,player.y,'#7fd0ff',26);burst(player.x,player.y,'#ff6b6b',16);
  if(!player._sacFait){player._sacFait=true;deposerSacMort();}
}

function damagePlayer(dmg,niveauSource,type){
  if(player.dying)return;
  /* ON NE MEURT PAS APRÈS AVOIR GAGNÉ.

     L'écran de victoire arrive 900 ms après la mort du Falcon — et après la
     scène finale, donc bien plus tard. Pendant tout ce temps la boucle
     tourne et les démons restants de l'acte 5 continuent de frapper : le
     héros mourait, `gameOver` déposait son sac dans l'acte 5, puis le
     minuteur en attente affichait l'écran de victoire par-dessus l'écran de
     mort. Signalé par Mirja le 29 août 2026. */
  if(player._finale)return;
  const st=P();
  const _me=degatsMultEcart(niveauSource,player.lvl);
  dmg=dmg*_me;
  /* Le blocage se cumulait multiplicativement avec la défense : deux plafonds
     atteints laissaient passer 15 % des dégâts. Son apport est ramené à 40 %
     effectifs au maximum. */
  const bloc=Math.min(40,(st.block||0)*0.8);
  if(alea()*100<bloc){floatText(player.x,player.y-30,t('combat.bloque'),'#9fd8ff',true);SFX.enemyHit&&SFX.enemyHit();vibrer(VIB.bloque);player.swing=0.12;return;}
  const red=Math.max(1,Math.round(dmg*(1-reductionDef(st.def,niveauSource||player.lvl))));
  if(alea()<USURE_PROT)wearGear([pick(SLOTS_PROT)],1);
  player.hp-=red;player.hurt=0.2;player._mpLock=1.5;
  /* L'état vient APRÈS l'encaissement : il lit les dégâts RÉELLEMENT subis,
     défense et blocage déduits. Une brûlure calculée sur les dégâts bruts
     ignorerait toute l'armure du joueur. */
  appliquerStatutElement(type,red);
  if(typeof alerteVieBasse==='function')alerteVieBasse(player.hp/Math.max(1,st.hpMax));
  /* Le chiffre vire au rouge vif et porte un signe quand l'écart de niveau
     pèse : sans ça le joueur voit juste « je meurs vite » sans comprendre. */
  floatText(player.x,player.y-28,(_me>=1.3?'‼ ':'')+red,_me>=1.3?'#ff2d2d':(_me>1.01?'#ff8a5a':'#ff6b6b'));
  SFX.hurt();vibrer(VIB.degats);
  verifierMortDuHeros();refreshHud();
}


/* ================================================================
   SAC DE MORT
   À la mort, le contenu du sac et la moitié de l'or restent sur place.
   Deux règles gouvernent tout le code ci-dessous :

   1. Le sac N'EST PAS un objet du niveau. `level.drops` disparaît dès qu'un
      acte est régénéré — et les actes ne sont pas sauvegardés, donc ils le sont
      à chaque rechargement. Le sac vit sur `player`, il part dans la sauvegarde.
   2. Aucun chemin ne doit pouvoir le faire disparaître : mort dans une grotte
      ou dans la Fosse, deuxième mort avant récupération, sac plein au ramassage,
      niveau régénéré sous le sac. Chaque cas est traité explicitement.
   ================================================================ */
const SAC_PART_OR=0.5;      // moitié du pécule

function sacZoneCourante(){
  if(!level)return null;
  if(level.arena)return null;   // la Fosse a ses propres règles : voir deposerSacMort
  if(level.kind==='act')return{zone:'act',act:level.actNum};
  if(level.kind==='cave'&&level.parent&&level.parent.lvl&&level.parent.lvl.actNum!=null)
    return{zone:'act',act:level.parent.lvl.actNum};                   // la grotte peut être régénérée : on remonte à l'acte
  return{zone:'village',act:-1};
}
function deposerSacMort(){
  /* LA FOSSE EST UNE MORT FACTICE. La règle y est fixée depuis longtemps :
     on ne perd QUE le butin du run, tenu à part dans A.bag, et arenaLeave(false)
     s'en charge. Ni le sac, ni l'or, ni l'équipement ne bougent. Aucun sac de
     mort n'est déposé ici — sinon la Fosse punirait deux fois. */
  if(level&&level.arena)return;
  const z=sacZoneCourante(); if(!z)return;
  let x=player.x,y=player.y;
  if(level.kind==='cave'&&level.parent){
    /* On posait le sac sur la BOUCHE de grotte elle-même — jamais tenable.
       On le pose désormais sur la case tenable la plus proche, exactement là
       où le héros réapparaît quand il ressort. */
    const _pl=level.parent;
    const _t=caseTenableProche(_pl.lvl,_pl.tx,_pl.ty,4,true);
    if(_t){x=_t.tx*TS+TS/2;y=_t.ty*TS+TS/2;}
    else{const _sp=spotNear(_pl.lvl,_pl.tx,_pl.ty);x=_sp.x;y=_sp.y;}
  }
  const objets=inventory.splice(0,inventory.length);
  let or=Math.floor((player.gold||0)*SAC_PART_OR);
  player.gold=Math.max(0,(player.gold||0)-or);
  const anc=player.corpse;
  if(anc){                       // deuxième mort : on FUSIONNE, l'ancien sac n'est jamais abandonné
    for(const it of (anc.items||[]))objets.push(it);
    or+=anc.gold||0;
  }
  if(!objets.length&&!or){player.corpse=null;majRappelSac();return;}
  player.corpse={zone:z.zone,act:(z.act==null?-1:z.act),x:x,y:y,items:objets,gold:or,lvl:player.lvl};
  toast(t('prog.sacResteSurPlace',
    {n:t('prog.objets',{n:objets.length})+(or?' '+t('prog.etOr',{or:or}):'')}),4.5);
  saveGame();                    // écrit AVANT l'écran de mort : une fermeture brutale ne peut plus le perdre
  majRappelSac();
}
function sacIci(){
  const c=player.corpse; if(!c||!level)return null;
  if(c.zone==='village')return level.kind==='village'?c:null;
  return (level.kind==='act'&&level.actNum===c.act)?c:null;
}
/* Le niveau a pu être régénéré depuis la mort : on réancre le sac sur la case
   praticable la plus proche, et à défaut sur le point d'apparition. */
function ancrerSac(){
  const c=sacIci(); if(!c)return;
  const w=level.w,hh=level.h,t=tileAt(c.x,c.y);
  let tx=clamp(t.tx,0,w-1),ty=clamp(t.ty,0,hh-1);
  if(!walkableCode(level.grid[idx(w,tx,ty)])){
    let best=null;
    for(let r=1;r<=30&&!best;r++){let bd=1e9;
      for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
        if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
        const X=tx+dx,Y=ty+dy; if(X<1||Y<1||X>=w-1||Y>=hh-1)continue;
        if(!walkableCode(level.grid[idx(w,X,Y)]))continue;
        const d=dx*dx+dy*dy; if(d<bd){bd=d;best=[X,Y];}
      }
    }
    if(!best&&level.spawn)best=[level.spawn[0],level.spawn[1]];
    if(best){c.x=best[0]*TS+TS/2;c.y=best[1]*TS+TS/2;}
  }
  const t2=tileAt(c.x,c.y);c.tx=t2.tx;c.ty=t2.ty;
  level.seen[idx(w,clamp(c.tx,0,w-1),clamp(c.ty,0,hh-1))]=1;   // toujours visible sur la carte
}
function ramasserSac(){
  const c=sacIci(); if(!c)return false;
  if(dist(player.x,player.y,c.x,c.y)>TS*1.5)return false;
  let pris=0;const reste=[];
  for(const it of (c.items||[])){ if(!sacPlein(it)){inventory.push(it);pris++;} else reste.push(it); }
  if(pris===0&&reste.length){
    /* RIEN n'a pu être pris : l'inventaire est plein. Cette fonction tourne à
       CHAQUE image tant qu'on est sur le sac — elle jouait donc le son de
       ramassage et la gerbe de particules en boucle. On sort sans effet, et
       on ne rappelle le message que toutes les 4 secondes. */
    /* ⚠ SEPTIÈME `t` QUI MASQUE LA TRADUCTION, et le premier à casser le jeu
       pour de bon : ici `t` était un HORODATAGE, donc `t('cle')` appelait un
       nombre. `test_sac_plein` l'a attrapé à l'exécution — aucune relecture
       ne l'aurait vu, puisque la ligne au-dessus lit `t` comme un temps.
       Renommé `maintenant`. */
    const maintenant=performance.now();
    if(!ramasserSac._dit||maintenant-ramasserSac._dit>4000){
      ramasserSac._dit=maintenant;
      toast(t('prog.inventairePlein',{n:reste.length}),3);
    }
    return false;
  }
  ramasserSac._dit=0;
  if(reste.length){
    /* On prend ce qui tient ; l'or attend le dernier objet, sinon le joueur
       repart en croyant avoir tout récupéré. */
    c.items=reste;
    toast(t('prog.sacPlein',{a:pris,b:reste.length}),3.4);
  } else {
    const or=c.gold||0;player.gold+=or;player.corpse=null;
    toast(t('prog.sacRecupere',
      {n:t('prog.objets',{n:pris})+(or?' '+t('prog.etOr',{or:or}):'')}),3);
  }
  SFX.pickup();burst(player.x,player.y,'#f4d35e',18);
  if(document.getElementById('invPanel').style.display==='block')renderInventory();
  refreshHud();majRappelSac();saveGame();return true;
}
function nomZoneSac(c){
  if(!c)return '';
  return c.zone==='village'?t('corps.village'):t('corps.acte',{n:(c.act|0)+1,nom:nomActe(c.act,true)||'?'});
}
/* Rappel permanent : sans lui, on oublie qu'un sac attend quelque part. */
function majRappelSac(){
  const el=document.getElementById('sacLine'); if(!el)return;
  const c=player.corpse;
  if(!c){el.style.display='none';el.textContent='';return;}
  el.style.display='block';
  const zone=nomZoneSac(c), nb=(c.items||[]).length;
  const long=t('prog.sacARecuperer')+' '+zone+' — '+t('prog.objets',{n:nb})
    +(c.gold?' · '+t('prog.or',{or:c.gold}):'');
  /* Au doigt le bloc est limité à 28 vw : la version longue passait à la ligne
     et repoussait tout sous la rangée d'onglets. Version courte à l'écran,
     version complète dans l'infobulle. */
  el.textContent=IS_TOUCH
    ? ('💀 Sac : '+zone.replace(/^à l['’]/,'').replace(/ — .*$/,'')+' · '+nb+' obj'+(c.gold?' · '+c.gold+' or':''))
    : long;
  el.title=long;
  caleBarreOnglets();
}
/* La rangée d'onglets était calée à « --mT + 58px », une constante qui suppose
   un bloc d'infos de trois lignes exactement. Dès qu'une ligne s'ajoute — le
   rappel du sac — le texte passait DERRIÈRE les onglets. On mesure la hauteur
   réelle plutôt que de la deviner. */
function caleBarreOnglets(){
  const tb=document.getElementById('tabBar'), tl=document.getElementById('topLeft');
  if(!tb||!tl)return;
  if(!IS_TOUCH){tb.style.top='';return;}
  const hh=tl.offsetHeight||0;
  const mT=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mT'))||0;
  tb.style.top=Math.round(mT+Math.max(58,hh+8))+'px';
}
function drawSacMort(c){
  const sx=c.x-cam.x,sy=c.y-cam.y;if(sx<-40||sx>W+40||sy<-40||sy>H+40)return;
  const p=0.55+0.45*Math.sin(performance.now()/380);
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.45)';ctx.beginPath();ctx.ellipse(sx,sy+9,15,6,0,0,6.28);ctx.fill();
  ctx.globalAlpha=0.25+0.2*p;ctx.fillStyle='#f4d35e';ctx.beginPath();ctx.arc(sx,sy-6,22,0,6.28);ctx.fill();
  ctx.globalAlpha=1;
  const im=PROP_IMG['sac_mort'];
  if(im&&im.complete&&im.naturalWidth){
    const DR=54;ctx.imageSmoothingEnabled=false;
    ctx.drawImage(im,sx-DR/2,hautSprite(sy,DR,im,64,64,'p:sac_mort'),DR,DR);
  } else {
    ctx.fillStyle='#5a3f22';ctx.beginPath();ctx.ellipse(sx,sy-4,12,11,0,0,6.28);ctx.fill();
    ctx.fillStyle='#3a2814';ctx.fillRect(sx-6,sy-16,12,6);
    ctx.font='16px serif';ctx.textAlign='center';ctx.fillText('💀',sx,sy-24);
  }
  ctx.textAlign='center';
  ctx.fillStyle='rgba(244,211,94,'+(0.6+0.4*p)+')';ctx.font='bold 11px Trebuchet MS';
  etiquette(sx,sy-58,'Ton sac','#ffb45e');
  ctx.textAlign='left';ctx.restore();
}



