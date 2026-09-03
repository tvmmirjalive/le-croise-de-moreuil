




















/* ================================================================
   NOUVELLE PARTIE — remise à zéro COMPLÈTE               (v8.74)

   Trouvé par un test de difficulté qui donnait des chiffres absurdes : un
   personnage « nu » de niveau 24 survivait mieux qu'un personnage équipé.
   Il n'était pas nu — il portait encore l'équipement de la partie
   précédente.

   « Nouvelle partie » ne remettait à zéro que le sac, le sac de mort, les
   balises et les actes découverts. **Le niveau, les attributs, l'or,
   l'équipement, l'arbre de compétences, le coffre et la progression
   d'actes survivaient.** Il fallait recharger la page pour repartir
   vraiment de zéro — ce que personne ne devine.

   Tout ce qui est SAUVEGARDÉ doit être remis à zéro ici : c'est la même
   liste, et elle se relit en regard de `saveGame`. */
function reinitialiserPartie(){
  const p=player;
  p.lvl=1;p.xp=0;p.xpNext=40;p.xpTotal=0;p.statPts=0;p.treePts=0;
  p.baseStr=10;p.baseDex=10;p.baseVit=10;p.baseEne=10;p.baseAgi=10;
  p.gold=60;p.frags=0;p.potions=3;p.manaPots=2;p.portals=0;p.scrollsId=2;
  p.kills=0;p.totalDmg=0;p.arenaBossKills=0;p.arenaBest=null;
  p.keys={};p.clesAchetees={};p.resets=0;
  p.tree={};p.treeBonus={};p.bar=['slap',null,null,null];
  p.paraLvl=0;p.paraXp=0;p.para={};p.paraBonus={};
  p.skillRanks={slap:1,charge:0,tempest:0,holy:0,whirl:0,multi:0,warcry:0};
  p.equip={weapon:null,armor:null,amulet:null,ring:null,ring2:null,
           helm:null,gloves:null,belt:null,skates:null};
  /* LA CROSSE DES GRAVATS.                                      (v9.32)

     Conséquence directe de la nouvelle règle : la Force multiplie le stuff,
     donc un héros NU ne fait plus que 3 dégâts et le premier diablotin
     devient infranchissable. Le jeu donne donc la première crosse.

     Ce n'est pas une concession, c'est ce que le récit dit déjà : « *Il
     ramasse sa crosse dans les gravats.* » — prologue, réplique 5. */
  {const _c=makeGear('weapon','white',1);
   if(_c){_c.dura=_c.duraMax;p.equip.weapon=_c;}}
  p.balises={};p.corpse=null;p._sacFait=false;p._finale=false;
  p.dons={blancs:0,magique:0};p.scenesVues={};p.dits={};
  p.questSuivie=null;p.buffType=null;p.buffT=0;p.chill=0;
  inventory.length=0;stash.length=0;
  setInvCap(18);stashCap=30;
  maxAct=-1;bossKilled=false;bossCleared=[false,false,false,false,false];
  for(let i=0;i<5;i++)relicDestroyed[i]=false;
  for(const k in actDiscovered)delete actDiscovered[k];
  for(const k in acts)delete acts[k];        /* les mondes se régénèrent */
  for(const k in quests)delete quests[k];
  for(const k in qc)qc[k]=0;
  questNew=0;
  if(typeof computeTreeBonus==='function')computeTreeBonus();
  if(typeof viderRepliques==='function')viderRepliques();
}
function startGame(cont){
  /* ARDOISE PROPRE AVANT DE CHARGER                          (v8.81)
     `loadGame` écrit PAR-DESSUS l'état courant : il remplit ce que la
     sauvegarde contient et laisse le reste tel quel. Tant qu'on ne pouvait
     lancer qu'une partie par chargement de page, c'était sans conséquence.
     Depuis qu'on revient à l'écran titre en cours de jeu, ouvrir un autre
     emplacement héritait des quêtes, de l'équipement, des balises et du
     coffre de la partie précédente. La remise à zéro passe donc avant. */
  reinitialiserPartie();
  document.getElementById('overlay').style.display='none';running=true;
  setVillage(buildVillage());
  enterLevel(village,village.spawn[0]*TS+TS/2,village.spawn[1]*TS+TS/2);
  if(cont&&loadGame()){
    if(player._migrationAgi){
      const n=player._migrationAgi;player._migrationAgi=0;
      setTimeout(()=>{if(!running)return;ouvrirConfirmation({
        titre:'Nouvel attribut : l’Agilité',
        corps:'<p>Le personnage a désormais <b>cinq attributs</b>. L’<b>Agilité</b> gouverne la '+
          'vitesse d’attaque, d’incantation et de course ; la <b>Dextérité</b> se recentre sur la '+
          'précision et le coup critique ; l’<b>Énergie</b> augmente les dégâts de tes sorts et '+
          'réduit leur coût.</p>'+
          '<p>Tes <b>'+n+' points</b> d’attribut t’ont été rendus pour que tu les répartisses '+
          'toi-même. Tu les trouveras dans l’onglet <b>Perso → Attributs</b>.</p>',
        ok:'Compris',action:()=>{togglePanel('charPanel');setCharTab('attr');}
      });},900);
    }
    toast(t('partie.chargee'),2.4);
  }
  else{reinitialiserPartie();inventory.push(makeItem('white','weapon'));
       /* LE PROLOGUE. Il remplace le dialogue qui s'ouvrait tout seul :
          celui-ci ne racontait rien, il listait une quête. */
       setTimeout(()=>{
         if(!running)return;
         if(typeof jouerScene==='function'&&jouerScene('prologue',()=>{
              toast(t('partie.villageLibre'),3);
            }))return;
         toast(t('partie.villageMission'),3);
         openDialogue({type:'quest',act:-1});
       },700);}
  const _st=P();player.hp=_st.hpMax;player.mp=_st.mpMax;
  renderSkillBar();refreshHud();renderInventory();updateStatLine();
  optAppliquer();updateTabs();   // la musique suit le réglage, elle ne s'impose plus
}
function reviveAtVillage(){
  const ov=document.getElementById('overlay');ov.style.display='none';
  player.dying=false;player.dyingT=0;player.anim='Idle';player.animOnce=false;player.path=null;player.attackTarget=null;
  player._sacFait=false;
  const _st=P();player.hp=_st.hpMax;player.mp=_st.mpMax;
  running=true;setLast(performance.now());
  // réapparition au village — les mondes générés et l'état du donjon (ennemis tués,
  // coffres ouverts, balises découvertes) restent intacts en mémoire (acts{}).
  enterLevel(village,village.spawn[0]*TS+TS/2,village.spawn[1]*TS+TS/2);
  toast(player.corpse
    ? t('partie.releveAvecSac',{zone:nomZoneSac(player.corpse)})
    : t('partie.releveSansSac'),4);
  saveGame();refreshHud();
}
function gameOver(){running=false;fermerEcranTitre();const ov=document.getElementById('overlay');
  ov.querySelector('h1').textContent=t('ecran.mort.titre');ov.querySelector('h1').style.color='#ff5a5a';
  ov.querySelector('.story').innerHTML=`Les patins d'Aldric glissent une dernière fois… puis s'immobilisent. Au niveau <b>${player.lvl}</b>, après <b>${player.kills}</b> démons purgés et <b>${player.totalDmg.toLocaleString('fr-FR')}</b> dégâts infligés, l’Outlaw tombe. Mais un Outlaw se relève toujours — au village, le monde et le donjon restent tels que tu les as laissés.`;
  /* Le sac laissé au sol doit être annoncé ici : c'est le seul écran que le
     joueur lit vraiment après une mort. */
  {const c=player.corpse;
   if(c){const d=document.createElement('div');
     d.style.cssText='margin-top:10px;padding:8px 12px;border:1px solid #caa53a;border-radius:8px;background:#2a2410;color:#ffd35e;font-size:14px';
     d.innerHTML='💀 <b>Ton sac est resté sur place</b> '+nomZoneSac(c)+' — '+
       (c.items||[]).length+' objet(s)'+(c.gold?' et '+c.gold+' or':'')+
       '.<br><span style="font-size:12px;color:#e0c07a">Retourne le chercher : une tête de mort le signale sur la carte.</span>';
     const st=ov.querySelector('.story');st.parentNode.insertBefore(d,st.nextSibling);
     if(ov._sacBox&&ov._sacBox.parentNode)ov._sacBox.parentNode.removeChild(ov._sacBox);
     ov._sacBox=d;}
   else if(ov._sacBox&&ov._sacBox.parentNode){ov._sacBox.parentNode.removeChild(ov._sacBox);ov._sacBox=null;}}
  const b=ov.querySelector('#startBtn');b.textContent=t('ecran.mort.bouton');b.onclick=reviveAtVillage;ov.style.display='flex';}
/* PASSER AU MODE SUIVANT. Sorti du gestionnaire de clic pour être testable —
   il ne l'était pas, et c'est là que se cachait le sac fantôme.

   LE SAC LAISSÉ AU SOL NE SURVIT PAS AU CHANGEMENT. Il porte des coordonnées
   dans un acte qui va être REGÉNÉRÉ : le laisser, c'est promettre au joueur
   un butin à un endroit qui n'existe plus, et lui coller une tête de mort sur
   la carte pour toujours. */
function passerDifficulteSuivante(sansRecharger){
  if(difficulty>=2)return false;
  difficulty++;
  /* ⚠ CHAQUE MODE EST UNE CAMPAGNE NEUVE, ET IL A FALLU LE DIRE.  (v9.48)

     `relicDestroyed` et `bossCleared` SURVIVAIENT au passage : seule
     `reinitialiserPartie` les effaçait, et elle ne tourne qu'à la création
     d'une partie. Conséquence mesurée : en Cauchemar, toute étape de quête
     « détruire la relique » ou « abattre le gardien » était **déjà cochée**.

     Les portes d'acte, elles, n'étaient PAS ouvertes — elles se ferment sur le
     boss VIVANT du niveau courant, et les actes se régénèrent. Le défaut était
     donc réel mais borné aux quêtes, et il ne s'est jamais vu autrement.

     La reforge des éclats en dépend entièrement : sans cette remise à zéro,
     les cinq éclats auraient été reforgeables dès la première seconde du
     Cauchemar. */
  for(let i=0;i<5;i++){ relicDestroyed[i]=false; bossCleared[i]=false; }
  bossKilled=false;
  player.corpse=null;
  player._finale=false;
  if(typeof majRappelSac==='function')majRappelSac();
  saveGame();
  if(!sansRecharger)location.reload();
  return true;
}
function victory(){running=false;player._finale=false;saveGame();fermerEcranTitre();const ov=document.getElementById('overlay');
  const dn=['Normal','Cauchemar','Enfer'];
  ov.querySelector('h1').textContent=t('ecran.victoire.titre');ov.querySelector('h1').style.color='#2fbf4f';
  ov.querySelector('.story').innerHTML=`Sous les serres brisées du <b style="color:#2fbf4f">Green Falcon</b>, le <b>Coach Verdier</b> redevient un vieil homme en larmes. Les <b>cinq reliques du Falcon</b> détruites, le démon perd tout ancrage : le givre fond, les Outlaws s'éveillent, et Moreuil respire enfin.<br><br>Niveau <b>${player.lvl}</b> · <b>${player.kills}</b> démons purgés · difficulté ${dn[difficulty]}.<br>« Bon. Qui range les ballu, maintenant ? »`;
  const b=ov.querySelector('#startBtn');
  if(difficulty<2){b.textContent='⚔  POURSUIVRE EN '+dn[difficulty+1].toUpperCase();b.onclick=()=>{passerDifficulteSuivante();};}
  else{b.textContent=t('ecran.victoire.rejouer');b.onclick=()=>location.reload();}
  ov.style.display='flex';}
/* ================================================================
   QUATRE EMPLACEMENTS DE SAUVEGARDE                        (v8.80)

   L'astuce qui rend la migration gratuite : **l'emplacement 1 garde la
   clé historique**. Une partie existante devient donc l'emplacement 1
   sans une ligne de conversion, et sans risque. Les emplacements 2 à 4
   prennent un suffixe.

   Le pont natif (`OutlawSave`) ne connaît qu'une seule sauvegarde : il
   ne reçoit donc que l'emplacement 1, exactement comme avant. Les
   autres vivent dans le stockage local, qui persiste tout aussi bien
   dans une WebView. C'est un choix conscient — l'alternative aurait été
   de modifier l'application Android.
   ================================================================ */
const SAVE_BASE='croise_moreuil_save_v1';
const NB_EMPL=4;
const CLE_EMPL_ACTIF='croise_moreuil_empl';
const cleEmpl=n=>(n===1?SAVE_BASE:SAVE_BASE+'_'+n);
let emplActif=1;
function choisirEmplacement(n){
  if(!(n>=1&&n<=NB_EMPL))return;
  emplActif=n;
  try{localStorage.setItem(CLE_EMPL_ACTIF,String(n));}catch(e){}
}
const SAVE_KEY=SAVE_BASE;   /* conservé : d'anciens appels le lisent encore */
let saveTimer=6;
/* Dans un WebView iOS, localStorage peut être purgé quand l'espace manque.
   Si la coque native fournit un pont (window.OutlawSave), on écrit et on lit
   aussi dans un vrai fichier. En navigateur le pont est absent : rien ne change. */
const SaveIO={
  write(s){ try{localStorage.setItem(cleEmpl(emplActif),s);}catch(e){}
            /* LE PONT NE TIENT QU'UN SEUL FICHIER.                    (v9.11)

               Il ne portait que l'emplacement 1 : les 2, 3 et 4 seraient perdus
               au changement d'origine. On y écrit maintenant une ENVELOPPE
               contenant les quatre, plus les réglages. C'est le MÊME appel
               natif et le MÊME fichier — aucune coque à modifier — mais on ne
               peut pas faire les deux : l'enveloppe REMPLACE l'écriture nue,
               sinon les deux formats s'écraseraient l'un l'autre. */
            try{ exporterVersPont(); }catch(e){} },
  read(){ let a=null,b=null;
          try{a=localStorage.getItem(cleEmpl(emplActif));}catch(e){}
          /* Le pont peut contenir DEUX formats : l'enveloppe de la v9.11, ou
             une sauvegarde nue laissée par une version antérieure. On sait
             lire les deux — une vieille installation ne doit rien perdre. */
          try{ if(window.OutlawSave&&window.OutlawSave.read){
                 const brut=window.OutlawSave.read();
                 if(brut){
                   let env=null; try{env=JSON.parse(brut);}catch(e){}
                   if(env&&env.pont===PONT_V){ b=(env.emplacements||{})[String(emplActif)]||null; }
                   else if(emplActif===1){ b=brut; }
                 }
               } }catch(e){}
          if(!a)return b; if(!b)return a;
          try{const pa=JSON.parse(a),pb=JSON.parse(b);
              return ((pb.xpTotal||0)>(pa.xpTotal||0))?b:a;}catch(e){return a;} },
  clear(){ try{localStorage.removeItem(cleEmpl(emplActif));}catch(e){}
           if(emplActif!==1)return;
           try{ if(window.OutlawSave&&window.OutlawSave.clear)window.OutlawSave.clear(); }catch(e){} }
};
/* CE QUI S'EXÉCUTE AU CHARGEMENT — sorti du premier niveau.

   Le module ne fait plus que DÉCLARER. Ses actions de chargement sont
   appelées par l'entrée, dans l'ordre des préfixes, ce qui rend l'ordre
   d'évaluation des modules INDIFFÉRENT — sans quoi la conversion en
   modules ES les remettrait dans un ordre imprévisible. */
function _demarrer28(){
  try{const _e=parseInt(localStorage.getItem(CLE_EMPL_ACTIF),10);
      if(_e>=1&&_e<=NB_EMPL)emplActif=_e;}catch(e){}
}

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */
function setSaveTimer(v){saveTimer=v;}

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */



