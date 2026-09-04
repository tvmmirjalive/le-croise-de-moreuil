











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
/* ================================================================
   LES QUÊTES DU CAUCHEMAR — LE JOURNAL SUIT LE RÉCIT      (v9.52)

   Mirja, en jouant la v9.51 : les scènes et les PNJ racontaient l'enquête
   pendant que le JOURNAL réclamait toujours de briser les reliques du Falcon.
   Le récit et les objectifs se contredisaient.

   ⚠ LA CLÉ : LES CINQ RELIQUES DE CAUCHEMAR SONT DES ÉCHOS. Mécaniquement,
   `passerDifficulteSuivante` remet `relicDestroyed` à zéro (v9.48) : le joueur
   les rebrise. Il fallait que ça veuille dire quelque chose — elle les a
   REFAITES avec ce que la ville se rappelle. Rien de neuf n'est inventé : le
   monde a déjà des échos, Anselme les nomme depuis la v9.45. Et briser un
   écho lui coûte un fragment : Aldric ne les brise plus pour la vaincre, mais
   POUR LA FAIRE PARLER. Le découpage des sept donneurs de la v9.51 tombe
   dessus acte par acte, sans qu'une ligne soit à reprendre.

   ⚠ SEUL LE TEXTE CHANGE. JAMAIS LA MÉCANIQUE. Une variante ne porte que
   `nom`, `desc` et `e` — pas de `target`, pas de `need`, pas de `type`. Et le
   NOMBRE d'étapes doit rester identique : `quests[q.id].e` est SAUVEGARDÉ, et
   une étape de plus ou de moins décalerait l'objectif d'un joueur en cours de
   partie sans que rien ne le signale.

   ⚠ 32 QUÊTES SUR 112, ET C'EST UN CHOIX. Les 25 principales portent le
   récit ; les 4 boss et `a2`, `s72`, `s75` sont les seules autres à nommer le
   Falcon. « Vide le petit bain », « ratisse ligne d'eau par ligne d'eau » ne
   contredisent rien : les traduire serait 200 textes pour zéro gain.
   ================================================================ */
const QUESTS_CAUCHEMAR={

/* ---------- ACTE 1 · PISCINE — le fragment est : LES LETTRES ---------- */
m0a:{nom:"Retour au Chlore",
 desc:"Le bassin est vide et l'eau clapote quand même. « Elle est passée avant moi. » Dégage l'entrée : Régis a quelque chose de gravé à montrer, et il n'ose pas y redescendre seul.",
 e:["Retrouver Régis, qui n'a pas dormi","Dégager l'entrée du bassin","Revenir écouter Régis"]},
m0b:{nom:"L'Écho du Sifflet",
 desc:"Le Sifflet est en morceaux depuis des mois, et il siffle encore. Ce n'est plus la relique : c'est ce qu'elle a refait avec le souvenir qu'en garde la ville. Brise l'écho — chacun lui coûte quelque chose.",
 e:["Écouter Régis parler du sifflet qui souffle tout seul","Descendre dans les vestiaires noyés","Forcer trois casiers","Briser l'écho du Sifflet","Revenir vers Régis — il est déjà en maillot"]},
m0c:{nom:"Ce que l'Eau Retient",
 desc:"« Le carrelage du fond est sous trente ans de calcaire et une couche de diablotins. » On ne relève pas huit lettres au ciseau avec de la vermine dans le dos.",
 e:["Vider le bassin de sa vermine","Dire à Régis qu'il peut plonger"]},
m0d:{nom:"Le Maître-Nageur, Encore",
 desc:"Il est revenu au grand bain, sifflet au cou, sans un souvenir de sa première mort. Elle recopie tout — échos de reliques, échos de gardiens, la nuit entière remontée à l'identique.",
 e:["Demander à Régis qui garde le fond, cette fois","Terrasser deux champions","Le dire à Régis"]},
m0e:{nom:"Huit Lettres",
 desc:"Régis remonte trempé avec huit lettres relevées sous le carrelage — et aucun son pour les dire. Premier fragment. La Glacière en garde un autre, dans une bouche gelée.",
 e:["Terrasser le gardien du grand bain","Prendre la route de la Glacière"]},

/* ---------- ACTE 2 · GLACIÈRE — le fragment est : L'ANCIENNETÉ ---------- */
m1a:{nom:"Marceau Parle Encore",
 desc:"Le froid n'a pas lâché, et la voix de Marceau n'est plus tout à fait la sienne. Tiens la caverne assez longtemps pour qu'il finisse sa phrase : ce qu'il a entendu compter tient dans le nom qu'on cherche.",
 e:["Parler à Marceau — et écouter qui répond","Repousser ce qui rôde dans le froid","Revenir près de lui"]},
m1b:{nom:"L'Écho de la Rondelle",
 desc:"La rondelle est refaite, et elle pèse plus lourd qu'avant. « Elle a mis dedans tout ce que la ville en garde. Ça fait beaucoup de rancune pour un bout de caoutchouc. » Brise le deuxième écho.",
 e:["Se faire indiquer le casier du fond, une fois de plus","Atteindre le fond de la glacière","Ouvrir six casiers","Briser l'écho de la Rondelle","Retourner voir Marceau"]},
m1c:{nom:"Onze Années Comptées",
 desc:"Marceau a mis onze ans à mourir de froid, et quelqu'un comptait à voix haute à côté de lui — pas ses années à lui. Disperse les spectres qui répètent encore les chiffres — ils comptent plus loin que la ville, et le nom qu'on cherche est plus vieux qu'elle.",
 e:["Faire taire les spectres qui comptent","Rapporter à Marceau jusqu'où elle est remontée"]},
m1d:{nom:"Gardiens Recopiés",
 desc:"Cinq échos de Gardiens du Froid, revenus à l'identique jusqu'aux fêlures dans leur acier. Aldric compte : « Cinq. Comme la première fois. Elle ne réinvente rien — elle recopie. »",
 e:["Écouter Marceau décrire les Gardiens","Abattre cinq champions","Le dire à Marceau"]},
m1e:{nom:"Plus Vieille que la Ville",
 desc:"Deuxième fragment : elle était là avant le pacte, avant la piscine, avant les tranchées. Le Bois de Moreuil est le seul endroit assez vieux pour avoir gardé son nom sur une pierre.",
 e:["Terrasser l'écho de Givre-Cœur","Prendre la route du Bois"]},

/* ---------- ACTE 3 · BOIS — le fragment est : LE COMPTE ---------- */
m2a:{nom:"Le Bois Qui a Compté",
 desc:"Cent-huit ans que le Poilu monte la garde devant une pierre grattée sans savoir ce qu'il gardait. Maintenant, si. Tiens la ligne pendant qu'il raconte.",
 e:["Se présenter au Poilu, une seconde fois","Nettoyer les sentiers","Faire son rapport"]},
m2b:{nom:"L'Écho de la Médaille",
 desc:"La Médaille est ressortie de la boue, intacte, comme si 1918 n'avait pas eu lieu. Troisième écho. Fouille les caches du champ de bataille, puis rends-la à la terre.",
 e:["Interroger le Poilu sur la médaille revenue","Descendre dans un trou d'obus","Fouiller dix caches","Briser l'écho de la Médaille","Retourner au poste du Poilu"]},
m2c:{nom:"La Pierre Grattée",
 desc:"À l'entrée de la seconde tranchée, une pierre porte des creux mal effacés à la baïonnette — on a effacé le mot, pas les creux. Les brutes d'os campent dessus. Dégage-la.",
 e:["Briser les brutes d'os qui campent sur la pierre","Compter les creux avec le Poilu"]},
m2d:{nom:"Chasse aux Recopiés",
 desc:"Les mêmes échos d'élites aux yeux d'émeraude, au même endroit, à la même heure. « Elle rejoue la nuit en boucle. Moi, j'ai changé de plan. » Terrasse huit champions.",
 e:["Demander au Poilu où sont les meneurs","Abattre huit champions","Rendre compte"]},
m2e:{nom:"Huit Creux, Huit Lettres",
 desc:"Troisième fragment : le compte tombe juste. Reste à savoir comment on prononce un mot dont on n'a que les lettres — et Sœur Vaast, qui a brûlé les registres, sait peut-être ce qu'elle n'a pas brûlé.",
 e:["Terrasser l'écho de l'Ancien des Bois","Gagner l'église Saint-Vaast"]},

/* ---------- ACTE 4 · ÉGLISE — le fragment est : LA RÈGLE ---------- */
m3a:{nom:"La Nef, une Fois de Plus",
 desc:"Le feu bleu est revenu sur l'autel, et Sœur Vaast n'a pas bougé de sa place. « Vous m'attendiez. » — « Je vous attends depuis 1918, Aldric. » Fraye-toi un chemin jusqu'au chœur : elle a gardé un registre qu'elle n'a pas eu le droit de brûler.",
 e:["Parler à Sœur Vaast","Purger la nef","Revenir vers elle"]},
m3b:{nom:"L'Écho du Calice",
 desc:"Le calice déborde de nouveau et la crypte respire sous les dalles. Quatrième écho, et le dernier avant le gymnase. Ouvre les reliquaires, puis brise-le.",
 e:["Écouter Sœur Vaast à propos du calice revenu","Descendre dans la crypte","Ouvrir quinze reliquaires","Briser l'écho du Calice","Remonter vers Sœur Vaast"]},
m3c:{nom:"L'Ange Recopié",
 desc:"Le Séraphin est de retour, six ailes et pas un souvenir de sa chute — un écho ne se rappelle rien, c'est ce qui le rend commode. Élimine douze champions pour percer sa garde.",
 e:["Se faire décrire le Séraphin, encore","Abattre douze champions","Le dire à Sœur Vaast"]},
m3d:{nom:"Ce Qu'on n'a pas Brûlé",
 desc:"On ne brûle pas un ordre : on le classe. L'ordre de brûler de 1918 porte le mot en marge, de la main de l'évêque, et sous le mot une note pour son secrétaire. Fais taire les spectres qui gardent l'armoire.",
 e:["Faire taire ce qui hante les archives","Se faire lire la note de l'évêque"]},
m3e:{nom:"À la Romaine",
 desc:"Quatrième fragment, et c'est la clé : sur une pierre romaine il n'y a pas de U — on y taille un V, et on le dit U. Reste une signature à voir, au fond d'un casier de gymnase.",
 e:["Terrasser l'écho du Séraphin","Rejoindre le gymnase du collège"]},

/* ---------- ACTE 5 · GYMNASE — la signature, l'étoile, et le mot ---------- */
m4a:{nom:"La Maison, une Dernière Fois",
 desc:"Le Stilmat craque sous les roues et le Vieux Outlaw attend au bord, comme la première nuit. « Tu sais quel nom tu vas dire ? » — « Presque. » Reprends le terrain.",
 e:["Retrouver le Vieux Outlaw au gymnase","Reprendre le terrain, mètre par mètre","Faire le point avec lui"]},
m4b:{nom:"L'Écho de la Coupe",
 desc:"La Coupe est de nouveau entière sur son socle, et le contrat de Verdier est resté dans le casier, plié en deux, signé sous une ligne vide. Cinquième et dernier écho.",
 e:["Se faire confirmer les quatre échos brisés","Fouiller vingt casiers","Briser l'écho de la Coupe","Revenir vers le Vieux Outlaw"]},
m4c:{nom:"La Porte Renvoyée",
 desc:"Elle ne se montre pas. Elle rouvre la porte et pousse le Green Falcon devant elle une dernière fois. « Vous ne pouviez vraiment pas trouver autre chose ? » Terrasse l'écho.",
 e:["Écouter le dernier conseil du Vieux Outlaw","Affronter l'écho aux ailes d'émeraude"]},
m4d:{nom:"Cinq Éclats en Étoile",
 desc:"Bruna reforge les cinq éclats, Aldric les plante dans le Stilmat, et le givre s'arrête net à leur cercle. Pour la première fois depuis le pacte, elle est QUELQUE PART. Dégage le gymnase avant de prononcer le nom.",
 e:["Nettoyer le gymnase autour de l'étoile","Prendre la parole"]},
m4e:{nom:"Le Mot sous l'Eau",
 desc:"Huit lettres relevées sous un carrelage, huit creux comptés dans une pierre, une règle de lecture sauvée d'un feu de 1918. Il ne manque plus qu'une voix assez solide pour porter le nom.",
 e:["Devenir assez solide pour dire le mot","Se le faire confirmer par le Vieux Outlaw"]},

/* ---------- LES GARDIENS, ET LES TROIS SECONDAIRES QUI NOMMAIENT LE FALCON ---------- */
b0:{nom:"L'Écho du Maître-Nageur",
 desc:"Il s'accroche de nouveau à son poste, sifflet au cou et haine au ventre, sans un souvenir de sa première mort. Terrasse l'écho pour ouvrir la voie hors de la Piscine."},
b1:{nom:"L'Écho de Givre-Cœur",
 desc:"Le cœur de gel bat encore pour toute la caverne, recopié jusqu'à ses fêlures. Brise l'écho — le froid ne l'atteint pas, frappe au physique ou au sacré."},
b2:{nom:"L'Écho de l'Ancien",
 desc:"L'entité sylvestre est revenue à la lisière, aux racines près, monter la garde devant une pierre grattée. Abats l'écho pour rejoindre l'Église."},
b3:{nom:"L'Écho du Séraphin",
 desc:"L'ange déchu veille de nouveau sur le chœur embrasé — un écho recopié jusqu'aux plumes qui lui manquent. Rappelle-lui, crosse en main, que le sacré, ça pique."},
a2:{nom:"La Première Clé",
 desc:"Chaque gardien recopié porte sa clé de la Fosse — l'écho a les mêmes poches que l'original. Arrache-lui."},
s72:{nom:"Tueur d'échos — Gymnase",
 desc:"Des échos de champions patrouillent la piste, aux mêmes places qu'à la première nuit. Abats les marqués. « Facile. Enfin, presque. »",
 e:["Abattre des champions","Rendre compte au Vieux Outlaw"]},
s75:{nom:"Entraînement intensif — Gymnase du Collège",
 desc:"Il faudra une voix solide pour porter ce nom, et un corps derrière pour tenir ce qui suivra. Gagne en puissance avant la suite. « Pour l'équipe. »"}

};

/* ── LA RÉSOLUTION, AUX TROIS SEULS ACCÈS AU TEXTE D'UNE QUÊTE ────────────
   Même règle que les scènes (v9.42) et que les donneurs (v9.51) : elle se
   fait ICI, et nulle part ailleurs, de sorte qu'ajouter une variante reste
   une affaire de DONNÉES. L'Enfer retombe sur le Cauchemar.

   ⚠ `difficulty` est lu comme un GLOBAL, sans import — convention du
   voisinage, et un `import` ici fait ÉCHOUER la validation esbuild. */
function _qCauchemar(q){
  if(!q)return null;
  if(typeof difficulty==='undefined'||difficulty<1)return null;
  return QUESTS_CAUCHEMAR[q.id]||null;
}
function nomQuete(q){
  if(!q)return '';
  const c=_qCauchemar(q);
  if(c&&c.nom)return tOu('quete.'+q.id+'.nom_cauchemar', c.nom);
  return tOu('quete.'+q.id+'.nom', q.name);
}
function descQuete(q){
  if(!q)return '';
  const c=_qCauchemar(q);
  if(c&&c.desc)return tOu('quete.'+q.id+'.desc_cauchemar', c.desc);
  return tOu('quete.'+q.id+'.desc', q.desc);
}
function txtEtape(q,i){
  const E=q&&etapesDe(q); if(!E||!E[i])return '';
  const c=_qCauchemar(q);
  if(c&&c.e&&c.e[i])return tOu('quete.'+q.id+'.e'+i+'_cauchemar', c.e[i]);
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



