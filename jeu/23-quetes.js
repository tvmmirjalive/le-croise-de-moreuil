











/* ================================================================
   QUÊTES EN ÉTAPES — chantier 3                           (v8.72)

   Avant : une quête = UN compteur qui monte. 95 sur 112 étaient
   « tue N », « ouvre N coffres ». Le texte était écrit une fois dans
   `desc` et ne changeait jamais. Rien ne racontait, rien n'emmenait
   nulle part.

   Modèle repris de Diablo III (« L'Étoile déchue » : onze étapes, dont
   cinq dialogues) : une quête est une SUITE d'objectifs, et on alterne
   parler / se battre / marcher.

   LA MÉCANIQUE À COMPRENDRE
   -------------------------
   Les compteurs du jeu (`player.kills`, `qc.chests`…) sont CUMULÉS depuis
   le début de la partie. Une étape « tuer 6 ennemis » ne peut donc pas se
   comparer à `player.kills` : elle serait déjà finie. Chaque étape retient
   donc sa BASE au moment où elle commence, et ne mesure que ce qui s'est
   passé DEPUIS.

   C'est tout le secret, et c'est aussi ce qui rend le système sauvegardable :
   la base est stockée avec l'avancement.
   ================================================================ */

/* Le compteur brut correspondant à un genre d'objectif.

   ATTENTION aux deux familles :
     · CUMULÉS (ennemis tués, coffres ouverts…) — on retranche la base
       prise au début de l'étape, sinon l'étape est finie avant d'avoir
       commencé ;
     · ABSOLUS (niveau atteint, acte atteint, boss tué) — retrancher la
       base les rendrait impossibles : « atteindre le niveau 20 » se
       transformerait en « gagner 20 niveaux ». */
const ETAPE_ABSOLU={level:1,reach:1,boss:1,bossact:1};
function _etapeAbsolue(e){ return !!ETAPE_ABSOLU[e.sur]; }
function _compteurBrut(e){
  switch(e.sur){
    case 'kills':   return player.kills;
    case 'elites':  return qc.elites;
    case 'chests':  return qc.chests;
    case 'shrines': return qc.shrines;
    case 'barrels': return qc.barrels||0;
    case 'level':   return player.lvl;
    case 'reach':   return maxAct;
    case 'boss':    return bossKilled?1:0;
    case 'bossact': return bossCleared[e.act!=null?e.act:0]?1:0;
    default:        return qc[e.sur]||0;
  }
}
/* La base : nulle pour un objectif absolu. */
function _baseEtape(q,e){ return _etapeAbsolue(e)?0:(etatQ(q).base||0); }
function etatQ(q){ initQuests(); return quests[q.id]; }
/* LES TROIS ACCESSEURS DE TEXTE DE QUÊTE.

   Tout affichage de quête passe par eux — bandeau de suivi, panneau, toast de
   récompense, scène de dialogue. Lire `q.name` en direct quelque part, c'est
   rouvrir un trou en anglais : `test_quetes_langue.js` dessine le panneau
   pour de vrai et vérifie que le titre français n'y traîne plus.

   La clé se déduit de l'identifiant, jamais du texte : `quete.m0a.nom`. Un
   identifiant est stable, il est déjà dans les sauvegardes, et renommer un
   titre français ne casse alors pas sa traduction. */
function nomQuete(q){ return q?tOu('quete.'+q.id+'.nom', q.name):''; }
function descQuete(q){ return q?tOu('quete.'+q.id+'.desc', q.desc):''; }
function txtEtape(q,i){
  const E=q&&etapesDe(q); if(!E||!E[i])return '';
  return tOu('quete.'+q.id+'.e'+i, E[i].txt);
}
/* L'étape en cours, déjà traduite — le cas de loin le plus demandé. */
function txtEtapeCourante(q){
  const st=q&&quests[q.id]; if(!st)return '';
  return txtEtape(q, st.e||0);
}

function etapesDe(q){ return q.etapes&&q.etapes.length?q.etapes:null; }
function etapeCourante(q){
  const E=etapesDe(q); if(!E)return null;
  const st=etatQ(q); const i=Math.min(st.e||0,E.length-1);
  return E[i];
}
/* Progression DANS l'étape courante : 0..1 */
function etapeAvance(q){
  const e=etapeCourante(q); if(!e)return 0;
  const st=etatQ(q);
  if(e.n==null)return _etapeFaite(q,e)?1:0;
  const fait=Math.max(0,_compteurBrut(e)-_baseEtape(q,e));
  return Math.min(1,fait/e.n);
}
function etapeTexteProgres(q){
  const e=etapeCourante(q); if(!e||e.n==null)return '';
  const st=etatQ(q);
  const fait=Math.min(e.n,Math.max(0,_compteurBrut(e)-_baseEtape(q,e)));
  return fait+'/'+e.n;
}
/* Une étape sans compteur est satisfaite par un ÉVÉNEMENT du jeu. */
function _etapeFaite(q,e){
  const st=etatQ(q);
  switch(e.t){
    case 'parler':  return !!(st.parle);
    case 'relique': return !!relicDestroyed[q.act];
    case 'gardien': return !!bossCleared[q.act];
    case 'lieu':    return !!(st.lieu);
    case 'compte':  return (_compteurBrut(e)-_baseEtape(q,e))>=e.n;
    default:        return (_compteurBrut(e)-_baseEtape(q,e))>=(e.n||1);
  }
}
/* On repart d'une base propre à chaque étape. */
function _ouvrirEtape(q){
  const st=etatQ(q), e=etapeCourante(q);
  st.base=(e&&!_etapeAbsolue(e))?_compteurBrut(e):0;
  st.parle=false;st.lieu=false;
  return e;
}
/* Le joueur a parlé au donneur de l'acte : les étapes « parler » avancent. */
function signalerParole(act){
  let bouge=false;
  for(const q of QUESTS){
    if(q.act!==act||!etapesDe(q))continue;
    const st=etatQ(q); if(!st.unl||st.done)continue;
    const e=etapeCourante(q);
    if(e&&e.t==='parler'){st.parle=true;bouge=true;}
  }
  if(bouge)checkQuests();
}
/* Le joueur est arrivé quelque part : les étapes « lieu » avancent. */
function signalerLieu(cle){
  let bouge=false;
  for(const q of QUESTS){
    if(!etapesDe(q))continue;
    const st=etatQ(q); if(!st.unl||st.done)continue;
    const e=etapeCourante(q);
    if(e&&e.t==='lieu'&&(!e.cle||e.cle===cle)){st.lieu=true;bouge=true;}
  }
  if(bouge)checkQuests();
}
/* Fait avancer les étapes d'une quête. Renvoie true si elle est ACHEVÉE. */
function avancerEtapes(q){
  const E=etapesDe(q); if(!E)return false;
  const st=etatQ(q);
  if(st.e==null){st.e=0;_ouvrirEtape(q);}
  let garde=0;
  while(st.e<E.length&&_etapeFaite(q,E[st.e])&&garde++<40){
    st.e++;
    /* RATTRAPAGE : seules les quêtes PRINCIPALES paient, et seulement si le
       joueur est en retard sur la courbe visée. Une quête annexe est
       facultative — la payer ne garantirait rien et récompenserait celui qui
       fait déjà tout. Voir niveauVise dans 11-progression.js. */
    if(q.id&&q.id[0]==='m'&&typeof rattraperEtape==='function')rattraperEtape();
    if(st.e<E.length){
      _ouvrirEtape(q);
      SFX.queteEtape&&SFX.queteEtape();
      /* On ANNONCE la nouvelle étape : sans ça, le joueur ne voit pas que
         la quête a bougé, et le découpage ne sert à rien. */
      const ne=E[st.e];
      if(ne&&ne.txt&&typeof replique==='function'&&q.id[0]==='m')
        replique('aldric','*'+t('quete.objectif')+'* — '+txtEtapeCourante(q));
      if(typeof questNew!=='undefined')questNew++;
    }
  }
  return st.e>=E.length;
}

function initQuests(){for(const q of QUESTS)if(!quests[q.id])
  quests[q.id]={p:0,done:false,unl:false,e:0,base:0,parle:false,lieu:false};}
function qProgress(q){switch(q.type){case 'kills':return player.kills;case 'elites':return qc.elites;case 'chests':return qc.chests;case 'shrines':return qc.shrines;case 'reach':return maxAct;case 'boss':return bossKilled?1:0;case 'bossact':return bossCleared[q.act]?1:0;case 'level':return player.lvl;case 'kind':return qc[q.kind]||0;case 'echo':return player.arenaBossKills||0;case 'arena':return qc.arenaRuns||0;case 'arenaT':return qc['arenaT'+q.tier]||0;case 'arenaAll':return (qc.arenaT1>0?1:0)+(qc.arenaT2>0?1:0)+(qc.arenaT3>0?1:0);case 'legendary':return qc.legendary||0;case 'key':{const K=player.keys||{};return (K.bronze||0)+(K.silver||0)+(K.gold||0)+((player.arenaBossKills||0)>0?1:0);}case 'talkArena':return qc.talkArena||0;case 'noPot':return qc.arenaNoPot||0;default:return 0;}}
function qMet(need){if(!need)return true;if(need.act!=null&&maxAct<need.act)return false;if(need.lvl!=null&&player.lvl<need.lvl)return false;if(need.prev){for(const p of need.prev)if(!quests[p]||!quests[p].done)return false;}return true;}
/* Les quêtes annexes versaient 31 700 or au total, soit un cinquième des
   recettes pour du remplissage. On garde la structure, on baisse le robinet. */
const QUEST_GOLD=0.6;
function questReward(q){if(q.gold)player.gold+=Math.round(q.gold*QUEST_GOLD);if(q.potion)player.potions+=q.potion;if(q.frags)player.frags+=q.frags;if(q.gem)inventory.push(makeSocketable(true));if(q.xp)gainXp(q.xp);toast(t('quete.accomplie')+' '+nomQuete(q)+(q.gold?' (+'+Math.round(q.gold*QUEST_GOLD)+' or)':''),2.6);burst(player.x,player.y,'#f4d35e',20);refreshHud();
  /* QUELQU'UN RÉAGIT. Rendre une quête sans que personne ne dise rien, c'est
     ce qui donnait au jeu son air de distributeur automatique. Le donneur de
     l'acte parle — en bulle, sans rien arrêter, et seulement pour les quêtes
     PRINCIPALES : 87 secondaires qui commentent, ce serait du bavardage. */
  if(q.id&&q.id[0]==='m'&&typeof replique==='function'){
    const g=GIVER[q.act]||GIVER['-1'];
    const cle=VOIX_DONNEUR[q.act]||'faucon';
    if(g&&g.fin)replique(cle,_extraitVoix(g.fin));
  }
}
/* Quelle voix parle pour quel acte — pour retrouver le portrait. */
const VOIX_DONNEUR={0:'regis',1:'coequipier',2:'poilu',3:'vaast',4:'faucon','-1':'faucon',arena:'anselme'};
/* Une bulle n'est pas un panneau : on prend la PREMIÈRE phrase, pas le
   monologue complet, et on retire les balises du texte d'origine. */
function _extraitVoix(t){
  const nu=String(t).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  const m=nu.match(/^.*?[.!?…](?:\s|$)/);
  let p=(m?m[0]:nu).trim();
  if(p.length<24){const m2=nu.match(/^(?:.*?[.!?…](?:\s|$)){2}/);if(m2)p=m2[0].trim();}
  return p.length>160?p.slice(0,157)+'…':p;
}
function checkQuests(){initQuests();let newq=false,rew=false;
  for(const q of QUESTS){const st=quests[q.id];
    if(!st.unl){if(qMet(q.need)){st.unl=true;newq=true;questNew++;SFX.quetePrise&&SFX.quetePrise();
      /* une quête à étapes s'ouvre sur sa PREMIÈRE étape, base comprise */
      if(etapesDe(q)){st.e=0;_ouvrirEtape(q);} }else continue;}
    if(st.done)continue;
    if(etapesDe(q)){
      /* Le compteur global sert encore à l'affichage : on le calque sur
         l'avancement des étapes pour que barres et pourcentages suivent. */
      const E=etapesDe(q), fini=avancerEtapes(q);
      st.p=Math.min(q.target,Math.round(q.target*Math.min(1,(st.e+etapeAvance(q))/E.length)));
      if(fini){st.done=true;st.p=q.target;questReward(q);rew=true;SFX.queteFinie&&SFX.queteFinie();}
      continue;
    }
    st.p=qProgress(q);if(st.p>=q.target){st.done=true;questReward(q);rew=true;SFX.queteFinie&&SFX.queteFinie();}}
  if(newq&&!rew)toast('📜 Nouvelle(s) quête(s) — touche J',1.8);
  updateQuestBadge();
  if((newq||rew)&&document.getElementById('questPanel').style.display==='block')renderQuests();}
function onKill(en){if(en.kind&&qc[en.kind]!=null)qc[en.kind]++;if(en.elite)qc.elites++;if(en.boss){if(level.kind==='act'&&level.actNum!=null)bossCleared[level.actNum]=true;if(en.finalBoss)bossKilled=true;}checkQuests();}
let questTab='todo';

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */
function setQuestTab(v){questTab=v;}

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */



