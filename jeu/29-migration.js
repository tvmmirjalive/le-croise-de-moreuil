














/* ================================================================
   MIGRATION DES SAUVEGARDES — avant le changement d'origine   (v9.11)

   Le jeu va passer d'une origine `file://` à une origine `https://` virtuelle,
   pour que les modules ES puissent se charger dans les WebView. Changer
   d'origine change le `localStorage` : une origine ne peut pas lire celui
   d'une autre, c'est l'isolation elle-même, pas un contournement à trouver.

   Or le pont natif ne portait QUE l'emplacement 1 :

     write(s){ localStorage.setItem(cleEmpl(emplActif), s);
               if(emplActif !== 1) return;        // <- 2, 3 et 4 restaient là
               window.OutlawSave.write(s); }

   Les emplacements 2, 3 et 4, les réglages et l'emplacement actif auraient donc
   été PERDUS à la bascule. La migration ne peut pas se faire après : au nouvel
   emplacement il n'y a plus rien à lire. Elle se fait donc MAINTENANT, pendant
   qu'on est encore en `file://`.

   Les deux ponts — Android et iOS — stockent une CHAÎNE QUELCONQUE dans un
   fichier natif, et iOS amorce son cache depuis ce fichier au chargement. On y
   écrit donc une ENVELOPPE contenant tout : aucune coque native à modifier.

   ⚠ Un joueur qui saute cette version perd ses emplacements 2 à 4. Coût
   accepté par Mirja le 21 août 2026. */
const PONT_V=1;
function exporterVersPont(){
  if(!(window.OutlawSave&&window.OutlawSave.write))return false;
  const empl={};
  for(let n=1;n<=NB_EMPL;n++){
    let brut=null; try{brut=localStorage.getItem(cleEmpl(n));}catch(e){}
    if(brut)empl[n]=brut;
  }
  let opt={}; try{opt=JSON.parse(JSON.stringify(OPT))||{};}catch(e){}
  const env={pont:PONT_V,actif:emplActif,emplacements:empl,opt:opt};
  try{ window.OutlawSave.write(JSON.stringify(env)); return true; }catch(e){ return false; }
}
/* Rend le NOMBRE d'emplacements restaurés, 0 s'il n'y avait rien à faire.
   Ne remplace jamais une sauvegarde déjà présente : au retour à la même
   origine, le stockage local fait foi. */
function restaurerDepuisPont(){
  if(!(window.OutlawSave&&window.OutlawSave.read))return 0;
  let brut=null; try{brut=window.OutlawSave.read();}catch(e){}
  if(!brut)return 0;
  let env=null; try{env=JSON.parse(brut);}catch(e){}
  /* ANCIEN FORMAT — une sauvegarde nue, pas une enveloppe. Une installation
     qui n'a jamais vu cette version doit continuer de retrouver son
     emplacement 1 : on ne casse pas les joueurs d'avant. */
  if(!env||env.pont!==PONT_V){
    let deja=null; try{deja=localStorage.getItem(cleEmpl(1));}catch(e){}
    if(deja)return 0;
    try{localStorage.setItem(cleEmpl(1),brut);}catch(e){return 0;}
    return 1;
  }
  let n=0;
  for(const k in env.emplacements){
    const i=parseInt(k,10); if(!(i>=1&&i<=NB_EMPL))continue;
    let deja=null; try{deja=localStorage.getItem(cleEmpl(i));}catch(e){}
    if(deja)continue;
    try{localStorage.setItem(cleEmpl(i),env.emplacements[k]);n++;}catch(e){}
  }
  /* ⚠ PAS `optSet` ICI. Il se termine par `if(running) saveGame()`, ce qui
     réécrirait l'emplacement ACTIF avec le personnage encore en mémoire.
     Mesuré : l'emplacement 2 repartait au niveau 14, celui du dernier
     personnage chargé, au lieu du 12 qu'il portait. Le garde-fou d'optSet
     protège du cas inverse — changer un réglage hors partie — et ne voyait
     pas celui-ci. On écrit donc dans OPT, puis on applique. */
  if(env.opt&&typeof OPT!=='undefined'){
    for(const k in env.opt){ if(k in OPT)OPT[k]=env.opt[k]; }
    if(typeof optAppliquer==='function'){try{optAppliquer();}catch(e){}}
  }
  if(env.actif>=1&&env.actif<=NB_EMPL){ try{localStorage.setItem(CLE_EMPL_ACTIF,String(env.actif));}catch(e){} }
  return n;
}
/* L'AMORÇAGE — appelé une fois, au démarrage, avant toute lecture. (v9.12)

   Il fait les DEUX sens, et l'ordre compte :

     1. on restaure ce que le pont a gardé, si le stockage local est vide —
        c'est le cas au lendemain d'un changement d'origine ;
     2. on RÉÉCRIT l'enveloppe, même si personne ne sauvegarde ensuite.

   Le second point est la lacune que la v9.11 avait laissée, et qui s'est vue
   sur l'appareil : le fichier natif du Pixel datait d'AVANT la v9.11 et portait
   encore le format nu, parce que l'enveloppe ne s'écrivait qu'à la sauvegarde.
   Un joueur qui bascule d'origine sans avoir joué entre-temps aurait donc perdu
   ses emplacements 2 à 4 malgré la migration.

   Une migration qui attend que le joueur agisse n'est pas une migration. */
function amorcerPont(){
  let repris=0;
  try{ repris=restaurerDepuisPont(); }catch(e){}
  try{ exporterVersPont(); }catch(e){}
  return repris;
}
function saveGame(){try{SaveIO.write(JSON.stringify({v:2,lvl:player.lvl,xp:player.xp,xpNext:player.xpNext,xpTotal:player.xpTotal,statPts:player.statPts,treePts:player.treePts,tree:player.tree,paraLvl:player.paraLvl,paraXp:player.paraXp,para:player.para,bar:player.bar,baseStr:player.baseStr,baseDex:player.baseDex,baseVit:player.baseVit,baseEne:player.baseEne,baseAgi:player.baseAgi,gold:player.gold,frags:player.frags,potions:player.potions,manaPots:player.manaPots,kills:player.kills,totalDmg:player.totalDmg,skillRanks:player.skillRanks,equip:player.equip,inv:inventory,stash:stash,difficulty:difficulty,quests:quests,qc:qc,maxAct:maxAct,bossKilled:bossKilled,bossCleared:bossCleared,portals:player.portals,stashCap:stashCap,keys:player.keys,arenaBossKills:player.arenaBossKills,relics:relicDestroyed,arenaBest:player.arenaBest,fossePalier:player.fossePalier,eclats:player.eclats,scrollsId:player.scrollsId,opts:OPT,optsV:OPT_VERSION,actDiscovered:Object.keys(actDiscovered).filter(k=>actDiscovered[k]).map(Number),invCap:invCap,balises:player.balises,questSuivie:player.questSuivie,autoSalv:autoSalv,corpse:player.corpse,clesAchetees:player.clesAchetees,resets:player.resets,dons:player.dons,scenesVues:player.scenesVues,dits:player.dits,horo:Date.now()}));}catch(e){}}
/* ================================================================
   MIGRATION DES SAUVEGARDES ANTÉRIEURES              (v8.75)

   Une sauvegarde d'avant la 8.66 / 8.69 / 8.71 / 8.72 se charge sans
   erreur — vérifié : niveau, or, équipement, sac, coffre, balises, actes,
   reliques et clés arrivent intacts. Mais trois champs n'existaient pas,
   et leur absence produit des absurdités :

     · `scenesVues` vide → un personnage niveau 26 qui a brisé trois
       reliques revoit le PROLOGUE, puis les scènes d'accueil des actes
       qu'il a déjà nettoyés ;
     · `dons` vide → le premier ennemi tué lâche un objet magique
       « garanti » destiné aux niveaux 1 à 5 ;
     · les quêtes n'avaient ni étape ni base : une quête à 37/60 repartait
       de sa première étape, c'est-à-dire « va reparler au PNJ ».

   On ne peut pas deviner ce que le joueur a VU, mais on peut déduire ce
   qu'il a FAIT. C'est ce que fait cette migration : elle reconstruit un
   état cohérent à partir de la progression réelle.
   ================================================================ */
function migrerSauvegarde(s){
  if(!s)return;
  const p=player;
  /* --- 1. les scènes déjà dépassées ne se rejouent pas --- */
  if(!s.scenesVues){
    p.scenesVues=p.scenesVues||{};
    /* il a quitté le village : le prologue est derrière lui */
    if((s.maxAct!=null?s.maxAct:maxAct)>=0||p.lvl>1)p.scenesVues.prologue=1;
    const mx=(s.maxAct!=null?s.maxAct:maxAct);
    for(let a=0;a<ACTS.length;a++){
      if(a<=mx)p.scenesVues['acte'+a]=1;           // acte atteint : accueil vu
      if(a<mx)p.scenesVues['gardien'+a]=1;         // acte dépassé : gardien vu
      if(relicDestroyed[a])p.scenesVues['relique'+a]=1;
    }
    if(mx>=ACTS.length-1)p.scenesVues.gardienFinal=1;
  }
  /* --- 2. les cadeaux de début n'ont plus lieu d'être --- */
  if(!s.dons&&p.lvl>DON_MAGIQUE_NIV+3)p.dons={blancs:DONS_BLANCS,magique:1,slots:[]};
  /* --- 3. les quêtes retrouvent une étape plausible --- */
  for(const q of QUESTS){
    const st=quests[q.id]; if(!st)continue;
    if(st.e==null){
      const E=etapesDe(q);
      if(!E||st.done){st.e=st.done?(E?E.length:0):0;}
      else{
        /* on replace l'étape au prorata de la progression enregistrée :
           37/60 sur trois étapes retombe sur la deuxième, la bonne. */
        const part=q.target?Math.min(1,(st.p||0)/q.target):0;
        st.e=Math.max(0,Math.min(E.length-1,Math.floor(part*E.length)));
      }
      st.parle=false;st.lieu=false;
      st.base=0;
      if(E&&st.e<E.length)_ouvrirEtape(q);
    }
  }
}
/* Migration : réassocie un sprite aux objets d'anciennes sauvegardes */
function migrateIcons(list){
  if(!list)return;
  for(const it of list){
    if(!it)continue;
    if(it.slot==='gem'&&it.kind==='gem'&&!it.fuse){
      const m=/\u2605\s*(\d)/.exec(it.name||'');it.fuse=m?Math.max(1,Math.min(4,+m[1])):1;
    }
    if(it.img)continue;
    if(it.slot==='gem'&&it.kind==='gem'){const g=GEMS.find(x=>x.name===(it._base||it.name));if(g&&g.img)it.img=g.img;}
    else if(it.slot==='gem'&&it.kind==='rune'){const ri=RUNES.findIndex(x=>x.name===(it._base||it.name));if(ri>=0)it.img='rune'+ri;}
    else if(it.charm){const c=CHARMS.find(x=>x.nom===it.name||x.nom===it._base);if(c&&c.img)it.img=c.img;}
  }
}
function migrateAllIcons(){
  migrateIcons(inventory);migrateIcons(stash);
  if(player&&player.equip)migrateIcons(Object.keys(player.equip).map(k=>player.equip[k]).filter(Boolean));
  for(const l of [inventory,stash])if(l)for(const it of l)if(it&&it.sockets)migrateIcons(it.sockets.filter(Boolean));
}
function hasSave(){try{return !!SaveIO.read();}catch(e){return false;}}
function chargerBrut(o){SaveIO.write(JSON.stringify(Object.assign({v:2},o)));return loadGame();}
function allerVillage(){enterLevel(village,village.spawn[0]*TS+TS/2,village.spawn[1]*TS+TS/2);}
/* Les attributs, l'arbre et l'équipement du personnage. */
function _chargerPersonnage(s){
  ['lvl','xp','xpNext','xpTotal','statPts','treePts','baseStr','baseDex','baseVit','baseEne','baseAgi','gold','frags','potions','manaPots','kills','totalDmg','portals'].forEach(k=>{if(s[k]!=null)player[k]=s[k];});
  if(s.tree)player.tree=s.tree;if(s.bar)player.bar=s.bar;computeTreeBonus();
  /* LE PARANGON EST POSÉ MÊME QUAND LA SAUVEGARDE N'EN PARLE PAS. Une partie
     d'avant la v9.17 n'a aucun de ces champs ; les laisser tels quels ferait
     hériter le parangon de la partie précédemment ouverte, exactement la
     faute que reinitialiserPartie corrige pour les quêtes et le coffre. */
  player.paraLvl=Math.max(0,Math.round(s.paraLvl||0));
  player.paraXp=Math.max(0,Math.round(s.paraXp||0));
  player.para=(s.para&&typeof s.para==='object')?s.para:{};
  computeParaBonus();
  player.dons=s.dons||{blancs:0,magique:0};
  player.scenesVues=s.scenesVues||{};
  player.dits=s.dits||{};
  if(s.equip)player.equip=Object.assign({weapon:null,armor:null,amulet:null,ring:null,ring2:null,helm:null,gloves:null,belt:null,skates:null},s.equip);
}

/* Les sacs, l'avancement du récit et l'état du monde. */
function _chargerMonde(s){
  inventory.length=0;if(s.inv)for(const it of s.inv)inventory.push(it);
  stash.length=0;if(s.stash)for(const it of s.stash)stash.push(it);
  if(s.difficulty!=null)difficulty=s.difficulty;
  if(s.quests)for(const k in s.quests)quests[k]=s.quests[k];
  if(s.qc)for(const k in s.qc)qc[k]=s.qc[k];
  if(s.maxAct!=null)maxAct=s.maxAct;
  if(s.bossKilled)bossKilled=s.bossKilled;
  if(s.bossCleared)bossCleared=s.bossCleared;
  if(s.stashCap)stashCap=s.stashCap;
  if(s.keys)player.keys=s.keys;
  if(s.arenaBossKills!=null)player.arenaBossKills=s.arenaBossKills;
  if(s.relics)for(let i=0;i<5;i++)relicDestroyed[i]=!!s.relics[i];
  if(s.arenaBest)player.arenaBest=s.arenaBest;
  /* Le palier de Fosse le plus haut jamais franchi. Il BORNE le rang de la
     gravure d'écho : une sauvegarde qui le perdrait déclasserait toutes les
     pièces gravées du joueur, en silence. `||0` et non `if` : une partie
     d'avant la phase 2 n'a pas la clé, et zéro est la bonne réponse. */
  player.fossePalier=s.fossePalier||0;
  /* Les cinq éclats reforgés. Une partie d'avant le chantier C bis n'a pas la
     clé : cinq `false` est la bonne réponse, et pas `undefined` — le code de
     la forge indexe cette table sans la tester à chaque ligne. */
  player.eclats=Array.isArray(s.eclats)?s.eclats.slice(0,5):[false,false,false,false,false];
  while(player.eclats.length<5)player.eclats.push(false);
  if(s.scrollsId!=null)player.scrollsId=s.scrollsId;
}

/* ── MIGRATION vers le système à cinq attributs ───────────────────────
   Une sauvegarde antérieure n'a pas d'Agilité, et sa Dextérité avait été
   investie pour la cadence d'attaque — laquelle dépend maintenant de
   l'Agilité. Sans rien faire, le personnage perdrait toute sa vitesse.
   On rend donc TOUS les points d'attribut, gratuitement et une seule fois :
   le joueur redistribue comme il l'entend. */
function _migrerAgilite(s){
  if(s.baseAgi!=null){player.baseAgi=s.baseAgi;return;}
  const depenses=Math.max(0,(player.baseStr-10)+(player.baseDex-10)+(player.baseVit-10)+(player.baseEne-10));
  player.baseStr=player.baseDex=player.baseVit=player.baseEne=player.baseAgi=10;
  player.statPts=(player.statPts||0)+depenses;
  player._migrationAgi=depenses;
}

/* Balises débloquées et actes découverts. Ni les unes ni les autres ne
   survivaient à une fermeture du jeu : les balises se déduisaient de
   `level.seen`, qui n'est jamais sauvegardé et que la régénération des actes
   remet à zéro ; et le panneau des balises n'affichait donc RIEN au village
   tant qu'on n'était pas retourné dans l'acte.

   On les restaure, et par sécurité on redéduit les actes de deux autres
   sources : `maxAct`, et les balises elles-mêmes — on ne peut pas avoir
   débloqué une balise d'un acte sans y être allé. */
function _chargerProgression(s){
  setInvCap(Math.max(18,Math.min(INV_CAP_MAX,s.invCap||18)));
  for(const k in actDiscovered)delete actDiscovered[k];
  if(Array.isArray(s.actDiscovered))for(const a of s.actDiscovered)actDiscovered[a]=true;
  player.balises={};
  if(s.balises)for(const k in s.balises){
    const L=s.balises[k];
    if(Array.isArray(L)&&L.length){
      player.balises[k]=L.slice().filter(v=>typeof v==='number').sort((a,b)=>a-b);
      actDiscovered[k]=true;          // une balise débloquée prouve la visite
    }
  }
  for(let a=0;a<=maxAct&&a<ACTS.length;a++)actDiscovered[a]=true;
}

/* Le sac de mort revient tel quel. `undefined` = ancienne sauvegarde,
   `null` = aucun sac : les deux donnent null, jamais une perte silencieuse. */
function _chargerDivers(s){
  player.corpse=s.corpse||null;
  player.questSuivie=s.questSuivie||null;
  if(s.autoSalv){autoSalv.white=!!s.autoSalv.white;autoSalv.magic=!!s.autoSalv.magic;
    for(const k in RARETES_PROTEGEES)delete autoSalv[k];}
  player.clesAchetees=s.clesAchetees||{};
  player.resets=s.resets||0;
  if(player.corpse)migrateIcons(player.corpse.items);
}

/* Les réglages, avec leur versionnage : une clé dont le DÉFAUT a changé depuis
   la version enregistrée est remise à son nouveau défaut plutôt que de garder
   la valeur d'alors — sans quoi un réglage amélioré ne toucherait jamais les
   joueurs existants. */
function _chargerOptionsSauvees(s){
  if(s.opts){
    const vue=s.optsV||1;
    const aReinit=new Set();
    for(let v=vue+1;v<=OPT_VERSION;v++)for(const k of (OPT_REINIT[v]||[]))aReinit.add(k);
    for(const k in OPT){
      if(aReinit.has(k)){const d=OPT_DEFS.find(o=>o.k===k);if(d)OPT[k]=d.def();continue;}
      if(s.opts[k]!=null)OPT[k]=!!s.opts[k];
    }
  }
  optAppliquer();
}

/* ⚠ UNE SAUVEGARDE CORROMPUE N'EST PAS UN EMPLACEMENT VIDE.       (v9.15)

   `loadGame` enveloppait tout dans `catch(e){return false;}` : n'importe
   quelle erreur rendait `false`, exactement comme une absence de sauvegarde.
   Le joueur voyait « — libre — » sur un emplacement qui contenait des heures
   de jeu, et rien ne l'avertissait avant qu'il ne recommence par-dessus.

   Un seul endroit décide désormais, et il distingue trois états :

     'vide'      rien à lire — silence, c'est normal
     'ok'        du JSON exploitable
     'illisible' il Y A des données, mais elles ne se lisent pas

   ⚠ ON NE DÉTRUIT RIEN. Le diagnostic ne réécrit ni n'efface l'emplacement :
   une sauvegarde illisible ici peut être lisible par une version ultérieure,
   ou récupérable à la main. On avertit, on ne nettoie pas. */
const SAUVE_VIDE='vide', SAUVE_OK='ok', SAUVE_ILLISIBLE='illisible';
function diagnostiquerSauvegarde(brut){
  if(brut==null||brut==='')return {etat:SAUVE_VIDE,s:null,taille:0};
  let s=null;
  try{ s=JSON.parse(brut); }
  catch(e){ return {etat:SAUVE_ILLISIBLE,s:null,taille:brut.length,erreur:'JSON illisible — '+e.message}; }
  if(!s||typeof s!=='object')
    return {etat:SAUVE_ILLISIBLE,s:null,taille:brut.length,erreur:'contenu inattendu'};
  return {etat:SAUVE_OK,s:s,taille:brut.length};
}

/* Ce que le joueur doit voir. Le message reste vrai même si on ne sait pas
   POURQUOI : ce qui compte est qu'il ne recommence pas par-dessus sans savoir. */
function signalerSauvegardeIllisible(d){
  player._saveIllisible={quand:Date.now(),taille:d.taille,erreur:d.erreur||'inconnue'};
  if(typeof toast==='function')
    toast('⚠ Sauvegarde illisible — elle n’a PAS été effacée. Exporte-la avant de recommencer.',6);
  return false;
}

/* ⚠ LE `catch` AVALE TOUT, ET C'EST DÉLIBÉRÉ POUR L'INSTANT.

   N'importe quelle erreur de chargement rend `false`, exactement comme une
   absence de sauvegarde. Une sauvegarde corrompue et un emplacement vide sont
   donc indiscernables — et un vrai défaut ici (comme l'ordre de migration
   corrigé plus bas) resterait invisible.

   Ce n'est PAS corrigé dans la Phase 4 : distinguer les deux cas change ce que
   voit le joueur, ce qui est une décision de jeu, pas de refactorisation. */
function loadGame(){
  let brut=null;
  try{ brut=SaveIO.read(); }catch(e){ brut=null; }
  const d=diagnostiquerSauvegarde(brut);
  if(d.etat===SAUVE_VIDE)return false;                    // rien à dire
  if(d.etat===SAUVE_ILLISIBLE)return signalerSauvegardeIllisible(d);
  const s=d.s;
  try{
  _chargerPersonnage(s);
  _chargerMonde(s);
  _migrerAgilite(s);
  _chargerProgression(s);
  _chargerDivers(s);
  _chargerOptionsSauvees(s);
  /* EN DERNIER, et pas avant : la migration a besoin de `quests`, de
     `relicDestroyed` et de `maxAct`, qui viennent d'être remplis ci-dessus.
     Placée au milieu de la fonction, elle lisait des tableaux encore vides
     et ne migrait rien — c'est ce que le test a montré. */
  migrerSauvegarde(s);
  migrateAllIcons();return true;
  }catch(e){
    /* Le JSON se lisait, mais une phase a échoué : la sauvegarde est
       INCOMPLÈTE, pas absente. Même traitement — on avertit, on n'efface pas. */
    return signalerSauvegardeIllisible({taille:d.taille,erreur:'chargement interrompu — '+e.message});
  }
}
/* CE QUI S'EXÉCUTE AU CHARGEMENT — sorti du premier niveau.

   Le module ne fait plus que DÉCLARER. Ses actions de chargement sont
   appelées par l'entrée, dans l'ordre des préfixes, ce qui rend l'ordre
   d'évaluation des modules INDIFFÉRENT — sans quoi la conversion en
   modules ES les remettrait dans un ordre imprévisible. */
function _demarrer29(){
  window.addEventListener('beforeunload',()=>{if(running)saveGame();});
}



