







/* LE PARANGON — ce qu'on gagne une fois le niveau 60 atteint.

   POURQUOI IL EXISTE. Avant le recalage de la courbe d'expérience, la
   campagne entière — trois modes, tous les ennemis tués — laissait le héros
   au niveau 39 pour un plafond fixé à 60 : le plafond n'était pas un
   plafond, c'était une asymptote. Recalé (voir 02-generation.js), le niveau
   60 tombe à l'entrée de l'acte 5 de Cauchemar. Restent alors SIX ACTES et
   la Fosse sans aucune progression en face. C'est ce vide que le parangon
   remplit.

   POURQUOI IL EST BORNÉ. Diablo III a rendu le parangon infini en 2014, et
   a dû inventer une difficulté infinie — les Failles Supérieures — pour
   l'absorber. Notre jeu a trois modes et rien au-delà : un parangon infini y
   produirait en quelques heures un héros que plus rien ne menace. Diablo IV
   a fait le chemin inverse et l'a borné à 300, avec un plafond de niveau à
   60 — exactement notre structure. Le nôtre s'arrête à 100.

   CE QU'IL NE RÉPARE PAS. Enfer reste injouable au plafond : `_over` tient
   les ennemis six niveaux au-dessus du héros (treize à l'acte 1), soit un
   écart de x6,8 avec le multiplicateur du mode. Cent points de parangon
   valent au mieux un doublement. La décision d'amplitude reste entière —
   voir Etude_difficulte_paliers.md. */

/* Le barème : UN NOMBRE FIXE, le même à tous les paliers.

   6 000 XP, et CINQ CENTS paliers. La première version en donnait cent à
   12 000 : le total passe donc de 1 200 000 à 3 000 000 d'XP, soit deux fois
   et demie plus long, avec des paliers deux fois plus fins. Un palier tombe
   plus souvent et chacun pèse moins — c'est la différence entre une échelle
   et un escabeau.

   D'où viennent les nombres. Un ennemi de l'acte 5 rapporte 189 XP nettes en
   Enfer au plafond : un palier coûte donc 32 ennemis, et un acte entier en
   produit 34. La campagne d'après-plafond — acte 5 de Cauchemar plus les cinq
   d'Enfer — mène au palier 132 ; une descente complète de la Fosse en donne
   dix de plus. Le reste se farme, et c'est l'endgame. */
const PARA_MAX=500, PARA_COUT=6000;
function coutParagon(p){return PARA_COUT;}

/* Les plafonds, relevés à la mesure des cinq cents points.

   Seize lignes à cinquante points font 800 de capacité pour 500 points
   gagnables : on ne s'offre que 62 % du tableau, il faut donc toujours
   choisir. Et le plafond de CATÉGORIE garde exactement le rapport d'avant —
   500 / 175 = 2,86, comme 100 / 35 — donc il en faut au moins TROIS sur
   quatre, et une seule ne peut jamais être remplie. */
const PARA_LIGNE_MAX=50, PARA_CAT_MAX=175;

/* Les seize lignes. `cle` est la clé de bonus lue par le jeu, `pas` ce
   qu'un point y ajoute.

   POURQUOI CES VALEURS-LÀ, ET PAS CELLES DE LA PREMIÈRE VERSION. Mesuré au
   niveau 60, à équipement identique : l'équipement pesait 71 % du DPS,
   l'arbre 24 %, et le parangon à 100 — c'est-à-dire TOUT l'endgame —
   **5,2 %**. Cent paliers ne valaient pas un objet. Les valeurs étaient
   posées à l'échelle d'un bonus d'arbre, alors qu'elles arrivent après
   l'équipement, qui donne des centaines.

   La règle qui en sort : les lignes utiles sont celles qui MULTIPLIENT.
   `dmgMin/Max = (3 + str·0,7 + dégâts d'arme) × (1 + dmgPct/100)` et
   `hpMax = (60 + vit·7 + niv·8) × (1 + hpPct/100)`. Une addition plate se
   noie ; un pourcentage tient sa valeur quelle que soit la pièce portée.

   IL N'Y A PAS DE LIGNE « CADENCE », ET C'EST MESURÉ. `iasFrames` ne descend
   jamais sous ATK_FRAMES_MIN, et un héros de niveau 60 y est DÉJÀ dès
   l'équipement MAGIQUE : quatre images par coup, quinze attaques par seconde.
   Quatre cents points de cadence n'y changent strictement rien. Vendre de la
   vitesse d'attaque au parangon, c'était vendre du vide. Convertir le surplus
   en dégâts a été essayé et annulé : l'équipement porte à lui seul près de
   1 100 points de cadence inutilisable, si bien que tout taux assez fort pour
   sauver la ligne triplait le DPS de base.

   LES VALEURS SONT LA MOITIÉ DE CELLES DE LA v9.19, pour cinq fois plus de
   points : un palier pèse deux fois moins et le total accessible est deux
   fois et demie plus grand. C'est ce qui rend le farm progressif plutôt
   qu'une suite de sauts.

   `crit` ACHÈTE DE LA CHANCE, PLAFONNÉE EN DUR À 80 %, et `critDmg` achète
   des DÉGÂTS critiques, qui n'ont aucune borne. C'est la séparation demandée
   par Mirja : « c'est bien de mettre du critique, mais il faut pouvoir monter
   les dégâts de ses critiques. » Tout point de chance au-dessus de 80 devient
   0,25 point de dégâts critiques : rien n'est perdu.

   `leech` EST UN POURCENTAGE DES DÉGÂTS INFLIGÉS, rendus en vie
   (`dmg × leech / 100`). À 0,5 par point et 50 points il monte à 25 — un
   quart de tout ce qu'on inflige revient en soins, et la branche Sang de
   l'arbre en ajoute 14. C'est la valeur la plus susceptible de devoir
   baisser, et elle n'a jamais été jouée en situation.

   `moveSpeed` reste tenu court, à 0,5 au total : il s'ajoute à une base de
   2,5 et la branche Tornade en donne déjà 3,55. Au-delà, le héros dépasse la
   portée du pathfinding et de la caméra. */
const PARA_CATS=[
 {id:'puissance',nom:'Puissance',lignes:[
   {id:'p_dmg',  nom:'Dégâts',            cle:'dmgMult', pas:1},
   {id:'p_crit', nom:'Critique',          cle:'crit',    pas:4},
   {id:'p_cdmg', nom:'Dégâts critiques',  cle:'critDmg', pas:4},
   {id:'p_cast', nom:'Incantation',       cle:'cast',    pas:2}]},
 {id:'defense',nom:'Défense',lignes:[
   {id:'d_hp',   nom:'Vie',               cle:'hpPct',   pas:1},
   {id:'d_def',  nom:'Armure',            cle:'def',     pas:8},
   {id:'d_vit',  nom:'Vitalité',          cle:'vit',     pas:4},
   {id:'d_lee',  nom:'Vol de vie',        cle:'leech',   pas:0.5}]},
 {id:'corps',nom:'Corps',lignes:[
   {id:'c_str',  nom:'Force',             cle:'str',     pas:4},
   {id:'c_dex',  nom:'Dextérité',         cle:'dex',     pas:4},
   {id:'c_ene',  nom:'Énergie',           cle:'ene',     pas:4},
   {id:'c_mov',  nom:'Foulée',            cle:'moveSpeed', pas:0.01}]},
 /* ⚠ TROIS DE CES QUATRE LIGNES NE FAISAIENT RIEN.               (v9.35)

    `_pCumuler` n'ajoute que si la clé existe DÉJÀ dans la fiche, et se tait
    sinon. « Sacré » visait `holy`, qui est un SORT (`skillRanks.holy`) et non
    une statistique ; « Givre » visait `cold`, qui n'est qu'une résistance
    d'ENNEMI ; « Mana » visait `mpPct`, que la fiche ne connaissait pas. Le
    joueur pouvait y dépenser des points DÉFINITIVEMENT PERDUS, sans qu'aucun
    test ne s'en aperçoive — un point de parangon ne se reprend pas.

    « Vie » (`hpPct`) était morte pour la même raison ; `hpPct` et `mpPct` sont
    désormais de vraies statistiques, et les deux autres visent des clés qui
    existent. */
 {id:'arcanes',nom:'Arcanes',lignes:[
   {id:'a_holy', nom:'Puissance des sorts', cle:'sortPct', pas:3},
   {id:'a_cold', nom:'Justesse',          cle:'acc',     pas:3},
   {id:'a_mp',   nom:'Mana',              cle:'mpPct',   pas:2},
   {id:'a_mf',   nom:'Fortune',           cle:'mf',      pas:4}]}
];


/* Index identifiant → ligne, construit une fois. Chercher dans quatre
   tableaux imbriqués à chaque clic serait du travail refait pour rien. */
const PARA_LIGNES={};
function _indexerParagon(){
  for(const c of PARA_CATS) for(const l of c.lignes) PARA_LIGNES[l.id]={ligne:l,cat:c};
}

function paraPointsPoses(){
  const t=player.para||{}; let n=0;
  for(const id in t) n+=(t[id]||0);
  return n;
}
function paraPointsLibres(){ return Math.max(0,(player.paraLvl||0)-paraPointsPoses()); }
function paraPointsCategorie(cat){
  const t=player.para||{}; let n=0;
  for(const l of cat.lignes) n+=(t[l.id]||0);
  return n;
}

/* Pose un point. Renvoie true s'il a été posé.

   `ignorerReserve` sert au banc d'essai : il laisse éprouver les plafonds de
   ligne et de catégorie sans avoir à fabriquer d'abord cent niveaux de
   parangon. Le jeu, lui, ne l'emploie jamais. */
function poserPointParagon(idLigne,verifierReserve){
  /* LE PARANGON NE COMMENCE QU'AU PLAFOND, jamais avant. `crediterXp` ne
     verse déjà rien en dessous, mais rien n'interdisait de DÉPENSER un point
     hérité d'une sauvegarde abîmée ou d'un test étourdi. Le verrou est ici,
     au seul point d'entrée. */
  if((player.lvl||0)<LEVEL_CAP)return false;
  const e=PARA_LIGNES[idLigne]; if(!e)return false;
  if(!player.para)player.para={};
  if(verifierReserve&&paraPointsLibres()<=0)return false;
  const t=player.para;
  if((t[idLigne]||0)>=PARA_LIGNE_MAX)return false;
  if(paraPointsCategorie(e.cat)>=PARA_CAT_MAX)return false;
  /* Immuabilité : on remplace la table, on ne la modifie pas en place. */
  const neuf={}; for(const k in t)neuf[k]=t[k];
  neuf[idLigne]=(neuf[idLigne]||0)+1;
  player.para=neuf;
  computeParaBonus();
  return true;
}

/* Le bonus consolidé. Même forme que `player.treeBonus` : une table
   clé → total, que 01-hasard.js fusionne avec celle de l'arbre. */
function computeParaBonus(){
  const B={}; const t=player.para||{};
  for(const id in t){
    const e=PARA_LIGNES[id]; if(!e)continue;
    const n=Math.min(PARA_LIGNE_MAX,t[id]||0); if(n<=0)continue;
    B[e.ligne.cle]=(B[e.ligne.cle]||0)+e.ligne.pas*n;
  }
  player.paraBonus=B;
}

/* L'expérience gagnée AU PLAFOND. Appelée par crediterXp, qui garde la main
   sur tout le reste : le parangon n'est pas une seconde barre d'expérience
   parallèle, c'est le déversoir de la première. */
function crediterParagon(v){
  if((player.lvl||0)<LEVEL_CAP)return;          /* même verrou, même raison */
  if((player.paraLvl||0)>=PARA_MAX)return;
  player.paraXp=(player.paraXp||0)+(v||0);
  let monte=0;
  while(player.paraLvl<PARA_MAX&&player.paraXp>=coutParagon(player.paraLvl+1)){
    player.paraXp-=coutParagon(player.paraLvl+1);
    player.paraLvl++; monte++;
  }
  /* Au plafond du parangon, l'expérience n'a plus nulle part où aller : on
     ne la laisse pas gonfler indéfiniment un compteur que rien ne lit. */
  if(player.paraLvl>=PARA_MAX)player.paraXp=0;
  return monte;
}

/* Remise à zéro — appelée par reinitialiserPartie et par la migration. */
function reinitParagon(){
  player.paraLvl=0; player.paraXp=0; player.para={}; player.paraBonus={};
}

/* ============================================================
   LE PANNEAU — sans lui, les points s'accumuleraient sans que le joueur
   puisse jamais les poser. Il vit dans un onglet du panneau Perso, à côté
   des ATTRIBUTS : c'est le même geste, dépenser des points gagnés.
   ============================================================ */

/* Le libellé d'une ligne : ce qu'elle donne au total, pas seulement le pas.
   Un « +1 Dégâts » ne dit rien ; « 4/10 · +4 % dégâts » dit tout. */
/* LE POURCENTAGE SE DIT. Mirja a douté que le vol de vie en soit un, et elle
   avait raison de douter : la ligne affichait « +25 Vol de vie », un nombre
   nu. Or `leech`, `dmgPct`, `crit`, `critDmg` et les autres SONT des
   pourcentages — la table TBL le sait déjà, elle les préfixe d'un « % ». On
   s'en sert plutôt que de tenir une seconde liste qui dériverait. */
function _estPourcentage(cle){
  return typeof TBL!=='undefined' && TBL[cle] && String(TBL[cle]).charAt(0)==='%';
}
function _texteLigneParagon(l,n){
  const tot=Math.round(l.pas*n*100)/100;
  const suffixe=_estPourcentage(l.cle)?' %':'';
  return n+'/'+PARA_LIGNE_MAX+(n>0?'  ·  +'+tot+suffixe+' '+tOu('para.ligne.'+l.id,l.nom):'');
}

function renderParagon(){
  const hote=document.getElementById('paraBody'); if(!hote)return;
  const libres=paraPointsLibres(), poses=paraPointsPoses();
  /* ⚠ `t` ÉTAIT LA TABLE DES POINTS POSÉS, et `nb` le compte d'une ligne :
     deux noms qui masquent la traduction et le formateur de nombres. Renommés
     `pts` et `nl` avant d'appeler t() ici — c'est le motif que
     `test_t_masquee.js` surveille désormais. */
  const pts=player.para||{};
  let h='';
  if((player.paraLvl||0)<=0&&libres<=0){
    h+='<div style="font-size:12px;line-height:1.7;color:#7f8db0">'
      +t('para.introduction',{niv:LEVEL_CAP,max:PARA_MAX})+'</div>';
    hote.innerHTML=h; return;
  }
  h+='<div style="font-size:12px;margin-bottom:6px">'
    +t('para.etat',{n:(player.paraLvl||0),max:PARA_MAX,libres:libres,poses:poses})+'</div>';
  if((player.paraLvl||0)<PARA_MAX){
    const need=coutParagon((player.paraLvl||0)+1), cur=player.paraXp||0;
    const pct=Math.max(0,Math.min(100,Math.round(cur/need*100)));
    h+='<div style="font-size:11px;color:#7f8db0;margin-bottom:8px">'
      +t('para.xp',{a:cur,b:need})
      +'<div style="height:6px;background:#141a2e;border:1px solid #2a3350;margin-top:3px">'
      +'<div style="height:100%;width:'+pct+'%;background:#f4d35e"></div></div></div>';
  }
  /* L'ENSEMBLE PORTÉ, ET CE QUE LE PARANGON LUI AJOUTE. C'est le point de
     couplage : sans cette ligne, le joueur voit ses paliers monter sans
     jamais voir où ils passent. */
  const ens=(typeof ensembleComplet==='function')?ensembleComplet():null;
  if(ens){
    const pl=player.paraLvl||0; const parts=[];
    for(const k in ens.parangon)parts.push('+'+(Math.round(ens.parangon[k]*pl*100)/100)+' '+k);
    h+='<div style="margin-top:8px;font-size:11px;color:'+ens.col+'">'
      +t('para.ensembleComplet',{nom:nomEnsemble(ens)})+'<br>'
      +'<span style="opacity:.8">'+t('para.parLeParangon',{liste:(parts.join(', ')||'—')})+'</span></div>';
  }
  for(const c of PARA_CATS){
    const n=paraPointsCategorie(c);
    const plein=n>=PARA_CAT_MAX;
    h+='<div style="margin-top:10px;font-size:12px;color:#f4d35e">'+tOu('para.cat.'+c.id,c.nom)
      +' <span style="color:'+(plein?'#c9633f':'#6b789c')+'">('+n+'/'+PARA_CAT_MAX+')</span></div>';
    for(const l of c.lignes){
      const nl=pts[l.id]||0;
      const bloque=nl>=PARA_LIGNE_MAX||plein||libres<=0;
      h+='<div class="statRow"><span>'+_texteLigneParagon(l,nl)+'</span>'
        +'<button class="plusBtn paraBtn" data-para="'+l.id+'"'+(bloque?' disabled':'')+'>+</button></div>';
    }
  }
  h+='<div style="font-size:11px;color:#6b789c;margin-top:10px;line-height:1.6">'
    +t('para.arbitrage',{ligne:PARA_LIGNE_MAX,cat:PARA_CAT_MAX,
        total:(PARA_CATS.length*PARA_CATS[0].lignes.length*PARA_LIGNE_MAX),max:PARA_MAX})+'</div>';
  hote.innerHTML=h;
  const btns=hote.querySelectorAll('.paraBtn');
  for(let i=0;i<btns.length;i++){
    btns[i].onclick=function(){
      if(!poserPointParagon(this.dataset.para,true))return;
      SFX.pointAttribut&&SFX.pointAttribut(); renderParagon(); refreshHud();
    };
  }
}

/* La pastille de l'onglet : un point libre non posé doit se voir sans avoir à
   ouvrir le panneau. C'est ce qui manquait aux quêtes avant la 8.9. */
function majBadgeParagon(){
  const b=document.getElementById('paraBadge'); if(!b)return;
  const n=paraPointsLibres();
  b.textContent=n>0?String(n):'';
  b.style.display=n>0?'':'none';
}

function _demarrer34(){ _indexerParagon(); }



