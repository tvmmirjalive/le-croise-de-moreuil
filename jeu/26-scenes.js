













/* ================================================================
   SCÈNES — LE JEU S'ARRÊTE ET PARLE                        (v8.69)

   Ce que le jeu savait faire avant : afficher un texte figé quand on
   allait cliquer sur un PNJ. Le récit ne se rencontrait pas, il se
   cherchait — et il ne changeait jamais.

   Une scène, ici, c'est :
     - la simulation SUSPENDUE (`paused`), le doigt et la souris captés ;
     - des répliques une par une, portrait à l'appui, texte qui s'écrit ;
     - un clic pour avancer, un second pour tout révéler d'un coup ;
     - un bouton « Passer » qui n'apparaît QUE si on l'a déjà vue.

   Trois règles à ne pas casser :

   1. UNE SCÈNE NE SE DÉCLENCHE JAMAIS DEUX FOIS toute seule. Le registre
      `player.scenesVues` est SAUVEGARDÉ : recharger ne rejoue rien.
   2. `paused` est RESTITUÉ tel qu'il était. Une scène ouverte pendant que
      les Paramètres suspendaient déjà la partie ne doit pas la relancer
      en se refermant.
   3. Le rappel `apres` est appelé UNE SEULE FOIS, à la fermeture, quel que
      soit le chemin — fin normale, saut, ou scène inconnue. C'est lui qui
      porte la suite du jeu (entrer dans l'acte, poser le héros…).
   ================================================================ */

/* ENGENDRÉ PAR `_outils/generer_portrait.js` — NE PAS ÉDITER À LA MAIN.

   Le buste d'Aldric, recadré de sa planche d'animation à la construction
   pour que le jeu n'ait plus à le fabriquer au vol avec `toDataURL` — appel
   qui lève une exception dès que le canevas est teinté, et rendait `null`
   sans un mot. Recadrage (34,10) sur 60×60, rendu en 64×64. */
const PORTRAIT_ALDRIC='data:image/png;base64,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';

/* ⚠ LE PORTRAIT EST DÉCOUPÉ AU BUILD, PLUS AU VOL.                (v9.37)

   Aldric n'a pas de portrait dessiné : on en fabrique un en recadrant le
   buste de sa planche d'animation. Ce recadrage se faisait au démarrage, dans
   un canevas, et le résultat était gardé par `toDataURL` — appel qui lève une
   exception dès que le canevas est teinté, donc dès que la planche sera un
   fichier séparé. Le `catch` rendait `null` : les scènes auraient perdu le
   visage d'Aldric sans un mot.

   `_outils/generer_portrait.js` fait le même recadrage au pixel près, à la
   construction. Aucun asset à produire, comme avant. */
function portraitAldric(){
  return (typeof PORTRAIT_ALDRIC!=='undefined')?PORTRAIT_ALDRIC:null;
}
const VOIX={
  aldric:{nom:'Aldric, le dernier Outlaw',por:()=>portraitAldric(),col:'#7fd0ff'},
  faucon:{nom:'Le Vieux Outlaw',por:'por_faucon'},
  regis:{nom:'Régis, le Maître-Nageur',por:'por_regis'},
  coequipier:{nom:'Un Coéquipier Gelé',por:'por_coequipier'},
  poilu:{nom:'Un Poilu de 1918',por:'por_poilu'},
  vaast:{nom:'Sœur Vaast',por:'por_vaast'},
  bruna:{nom:'Bruna la Forgeronne',por:'por_bruna'},
  garrek:{nom:'Garrek le Marchand',por:'por_garrek'},
  anselme:{nom:'Anselme « la Cage »',por:'por_anselme'},
  /* ⚠ SON NOM N'EST PAS UNE CHAÎNE, ET IL A CESSÉ DE L'ÊTRE.       (v9.53)

     Il valait 'Green Falcon'. Or DEUX répliques d'`acte4_cauchemar` et DEUX
     de la `bascule` ne surchargent pas ce nom : celles où il tremble en
     avouant avoir signé sans lire s'affichaient sous l'en-tête « Green
     Falcon ». L'homme portait le nom de la chose qui l'avait mangé, dans la
     scène même où il en était la victime.

     Rien ne pouvait l'attraper : le défaut n'était pas dans le texte, il
     était ICI. Même famille que la fuite du nom du succube (§85) — une donnée
     résolue à l'affichage se révèle partout à la fois, ou nulle part. */
  verdier:{nom:()=>nomVerdier(),por:null,col:'#2fbf4f'},
  /* ⚠ SON NOM N'EST PAS ÉCRIT ICI NON PLUS. La voix porte la BALISE, comme
     les textes : `nomSuccube()` la résout à l'affichage, en périphrase tant
     que Mirja n'a pas donné le nom. Le violet la sépare du vert du Falcon —
     elle en est sortie, elle n'est pas lui. */
  elle:{nom:()=>nomSuccube(),por:null,col:'#c46ee0'},
  recit:{nom:'',por:null,col:'#8ea0c8'}
};
function _voixPortrait(v){
  const V=VOIX[v]||VOIX.recit;
  if(typeof V.por==='function')return V.por();
  if(V.por&&typeof MISC_ICON!=='undefined'&&MISC_ICON[V.por])return MISC_ICON[V.por];
  return null;
}

let _scene=null, _sceneTimer=0;
function sceneEnCours(){ return !!_scene; }
function sceneVue(id){ return !!(player.scenesVues&&player.scenesVues[id]); }
function marquerSceneVue(id){
  if(!player.scenesVues)player.scenesVues={};
  player.scenesVues[id]=1;
  try{saveGame();}catch(e){}
}
/* ── LES SCÈNES DÉPENDENT DE LA DIFFICULTÉ ────────────────────── v9.42

   Elles ne dépendaient que de l'ACTE : `jouerScene('acte'+n)`, sans que le
   mode entre jamais en compte. Or `player.scenesVues` est SAUVEGARDÉ, et
   `jouerScene` refuse ce qui a déjà été vu — un joueur qui recommence en
   Cauchemar a donc tout « déjà vu », et **n'aurait jamais découvert le nouvel
   arc**. Le défaut n'était pas visible : il ne se manifeste qu'au deuxième
   passage, en silence.

   La résolution se fait ICI, et pas dans les cinq appelants : ajouter une
   variante devient une affaire de DONNÉES, on écrit `acte2_cauchemar` dans
   SCENES et elle prend le relais toute seule. Une scène sans variante retombe
   sur celle du mode Normal, ce qui est exactement le comportement d'avant.

   ⚠ L'ENFER RETOMBE SUR LE CAUCHEMAR, ET C'EST VOULU. L'arc du succube
   commence au Cauchemar ; l'Enfer le prolonge sans le reprendre à zéro. Un
   `acte2_enfer` écrit un jour l'emportera, sans rien changer d'autre. */
/* ⚠ `difficulty` est lu comme un GLOBAL, sans import. C'est la convention du
   voisinage — `11-progression.js` fait de même — parce que la variable est un
   `let` réassigné de `07-niveaux-transitions.js` qui n'est pas exporté. Un
   `import` ici fait ÉCHOUER la validation esbuild du build. */
const SCENE_SUFFIXES=[[''],['_cauchemar',''],['_enfer','_cauchemar','']];
function idSceneSelonDifficulte(id){
  const essais=SCENE_SUFFIXES[difficulty]||[''];
  for(const suf of essais) if(suf && SCENES[id+suf]) return id+suf;
  return id;
}

/* Rejoue une scène à la demande (journal, relecture) : ni marquage ni suite. */
function rejouerScene(id){ _lancerScene(idSceneSelonDifficulte(id),null,true); }
/* Le point d'entrée normal : ne joue QUE si elle n'a jamais été vue. */
function jouerScene(id,apres){
  const rid=idSceneSelonDifficulte(id);
  /* ⚠ LA RÉVÉLATION DU NOM EXIGE L'ÉTOILE COMPLÈTE.     (chantier C bis)
     `final_cauchemar` est la scène où Aldric prononce le mot gravé sous le
     grand bain. Elle n'a de sens qu'une fois les cinq éclats reforgés — c'est
     ce qu'elle MONTRE : « les cinq éclats reforgés se plantent dans le Stilmat
     en étoile ». La jouer sans eux annoncerait une victoire que le joueur n'a
     pas gagnée, et le mode Cauchemar perdrait son objectif. */
  if(rid==='final_cauchemar' && typeof etoileComplete==='function' && !etoileComplete()){
    if(apres)apres(); return false;
  }
  if(!SCENES[rid]||sceneVue(rid)){ if(apres)apres(); return false; }
  _lancerScene(rid,apres,false); return true;
}
function _lancerScene(id,apres,relecture){
  const S=SCENES[id];
  if(!S||!S.repliques||!S.repliques.length){ if(apres)apres(); return; }
  if(_scene){ /* une scène en chasse une autre : on ferme proprement */ _finScene(); }
  if(typeof closeAllPanels==='function')try{closeAllPanels();}catch(e){}
  _scene={id,S,i:0,n:0,fini:false,apres:apres||null,
          pauseAvant:paused, relecture:!!relecture,
          sautable:relecture||sceneVue(id)};
  setPaused(true);
  const ov=document.getElementById('sceneOv');
  if(!ov){ _scene=null; if(apres)apres(); return; }
  ov.classList.add('on');
  const bp=document.getElementById('scenePasser');
  if(bp)bp.style.display=_scene.sautable?'block':'none';
  _pointsScene();
  _replique(0);
}
function _pointsScene(){
  const b=document.getElementById('scenePoints'); if(!b||!_scene)return;
  let h='';for(let k=0;k<_scene.S.repliques.length;k++)h+='<i class="'+(k<=_scene.i?'on':'')+'"></i>';
  b.innerHTML=h;
}
/* LE TEXTE D'UNE RÉPLIQUE, TRADUIT.

   Même règle que pour les quêtes : le français vit dans SCENES, seul l'anglais
   entre au dictionnaire, et la clé se déduit de l'IDENTIFIANT de la scène —
   `scene.prologue.3`. `_scene.id` le porte déjà.

   Les didascalies *entre astérisques* voyagent DANS le texte : elles se
   traduisent avec lui, et `_echapper` les repère après coup. Les découper
   serait intraduisible — l'anglais ne les place pas au même endroit. */
/* ── LE NOM DU SUCCUBE, QU'ON NE CONNAÎT PAS ENCORE ───────────── v9.42

   Mirja : « tu donnes une balise au nom, et quand je saurai comment elle
   s'appelle je te le dirai — je pense que la révélation du nom se fera fin de
   l'acte 4 ».

   Le nom n'est donc écrit NULLE PART. Les textes portent la balise, et la
   substitution se fait à l'affichage. Le jour où Mirja le donne, **une seule
   ligne change** : `SUCCUBE_NOM`. Tant qu'il vaut `null`, la balise se résout
   en périphrase — « celle qui est sortie » — ce qui est aussi ce que le
   Cauchemar raconte : une enquête sur quelqu'un qu'on ne sait pas nommer.

   ⚠ LA SUBSTITUTION EST FAITE APRÈS LA TRADUCTION, pas avant. Le dictionnaire
   anglais porte la balise lui aussi, et sa périphrase lui est propre — écrire
   le nom dans l'une des deux langues seulement serait le pire des deux mondes. */
const SUCCUBE_BALISE='⟦ELLE⟧';
/* ⚠ LE NOM EST DONNÉ — ET IL NE DOIT PAS FUIR AVANT SA SCÈNE.   (v9.51)

   `VELLAUNA`, de la racine gauloise *vellauno-*, « celui qui commande ».
   Gravé en lettres romaines sur les pierres du bois : **VELLAVNA**, huit
   lettres, dont le second V se dit U. C'est tout le ressort de l'enquête :
   Régis relève les lettres au fond du grand bain, Sœur Vaast donne la règle
   de lecture, et le joueur attentif prononce le nom AVANT Aldric.

   ⚠ POSER `SUCCUBE_NOM` NE SUFFIT PAS, ET LE FAIRE SEUL AURAIT TOUT CASSÉ.
   `VOIX.elle.nom` est une fonction résolue à l'affichage : le nom se serait
   affiché en en-tête **dès la bascule de fin de Normal**, avant que
   quiconque le sache, et l'enquête entière serait tombée à plat — sans une
   erreur, sans un test rouge. C'est exactement le genre de défaut que rien
   n'attrape.

   Le nom ne se résout donc qu'une fois RÉVÉLÉ. Le drapeau est posé par la
   réplique elle-même — `{revele:true}` sur la ligne où elle se nomme — et
   non à la fin de la scène : sinon la révélation afficherait la périphrase.
   Il vit dans `player.scenesVues`, déjà sauvegardé et déjà remis à zéro par
   `reinitialiserPartie` : aucun champ nouveau, aucune migration. */
const SUCCUBE_NOM='Vellauna';
const SUCCUBE_LETTRES='VELLAVNA';
function nomRevele(){
  return !!(player && player.scenesVues && player.scenesVues.nomRevele);
}
function revelerNom(){
  if(!player)return;
  if(!player.scenesVues)player.scenesVues={};
  player.scenesVues.nomRevele=1;
}
/* ── LE FALCON EST TOMBÉ, VERDIER RESTE ──────────────────────────── v9.53

   « Green Falcon » tant qu'il l'est ; « Coach Verdier » dès qu'il ne l'est
   plus. La bascule se lit sur le récit, pas sur le mode : elle prend effet dès
   la scène `final` — où il n'est déjà plus qu'un vieil homme en survêtement
   qui pleure — et donc pendant la `bascule` elle-même, sans attendre le
   changement de difficulté.

   ⚠ `difficulty` est lu comme un GLOBAL, sans import : convention du
   voisinage, et un `import` ici fait ÉCHOUER la validation esbuild. */
function falconTombe(){
  if(typeof difficulty!=='undefined' && difficulty>=1)return true;
  /* ⚠ LA SCÈNE EN COURS COMPTE, PAS SEULEMENT LE REGISTRE.
     Dans la `bascule`, il est assis devant les cinq reliques froides et il
     pleure : il n'est plus le Falcon, même si le registre n'a pas encore
     enregistré `final`. S'appuyer sur `scenesVues` seul rendait le bon
     résultat en partie normale — `final` est joué juste avant — et le
     MAUVAIS dès qu'on relit la scène depuis le journal, sur une sauvegarde
     neuve. La scène sait ce qu'elle raconte : on le lui demande. */
  if(_scene && (_scene.id==='bascule' || /_cauchemar$|_enfer$/.test(_scene.id)))return true;
  const vues=player&&player.scenesVues;
  return !!(vues && (vues.final || vues.bascule));
}
function nomVerdier(){ return falconTombe()?t('voix.verdierHomme'):t('voix.verdierFalcon'); }

function nomSuccube(){
  return (SUCCUBE_NOM && nomRevele()) ? SUCCUBE_NOM : t('succube.innommee');
}
function texteSuccube(tx){
  return (tx||'').split(SUCCUBE_BALISE).join(nomSuccube());
}

function texteReplique(i){
  const S=_scene&&_scene.S; if(!S||!S.repliques[i])return '';
  return texteSuccube(tOu('scene.'+_scene.id+'.'+i, S.repliques[i].texte||''));
}
function _replique(k){
  const S=_scene.S, r=S.repliques[k]; if(!r)return _finScene();
  /* LA RÉVÉLATION SE FAIT ICI, PAS À LA FIN DE LA SCÈNE.           (v9.51)
     La réplique qui porte `revele` est celle où elle prononce son nom : le
     drapeau doit être posé AVANT que le texte soit composé, sans quoi la
     révélation elle-même afficherait « celle qui est sortie ». */
  if(r.revele)revelerNom();
  _scene.i=k;_scene.n=0;_scene.fini=false;
  const V=VOIX[r.qui]||VOIX.recit;
  const im=document.getElementById('sceneImg'), rd=document.getElementById('sceneRond');
  const por=_voixPortrait(r.qui);
  if(im){ if(por){im.src=por;im.style.display='';} else {im.removeAttribute('src');im.style.display='none';} }
  /* Pas de portrait — soit la voix n'en a pas (le récit), soit la planche du
     héros n'est pas encore décodée au tout premier lancement. On pose une
     pastille pour que la ligne garde la même hauteur. */
  if(rd){ if(por||r.qui==='recit')rd.style.display='none';
          else {rd.textContent=(V.ico||'✦');rd.style.display='flex';} }
  const nm=document.getElementById('sceneNom');
  if(nm){
    /* Un `nom` posé sur la réplique l'emporte sur celui de la voix — et il
       peut valoir '' exprès, pour un récit sans en-tête. */
    /* Le nom d'une voix peut être une FONCTION — celle du succube l'est,
       parce qu'il n'est pas encore choisi et doit se résoudre à l'affichage. */
    const nr=(r.nom!=null)?tOu('scene.'+_scene.id+'.'+k+'.nom',r.nom):'';
    /* ⚠ `V.nom` PEUT ÊTRE UNE FONCTION. Celle du succube l'est : son nom
       n'étant pas choisi, il se résout à l'affichage et non au chargement.
       Sans cet appel, l'en-tête aurait affiché « function () { … } ». */
    const vn=(typeof V.nom==='function')?V.nom():(V.nom||'');
    nm.textContent=texteSuccube(nr||tOu('voix.'+r.qui,vn)||'');
    nm.style.color=V.col||'#f4d35e';
  }
  const tx=document.getElementById('sceneTxt'); if(tx)tx.innerHTML='';
  _pointsScene();
  _majPied();
}
function _majPied(){
  const p=document.getElementById('sceneSuite'); if(!p||!_scene)return;
  const dernier=(_scene.i>=_scene.S.repliques.length-1);
  p.innerHTML=_scene.fini
    ? (dernier?t('scene.reprendre'):t('scene.suite'))
    : t('scene.tout');
}
/* Le texte s'écrit dans la boucle de jeu, pas dans un minuteur : il se fige
   donc avec la pause du navigateur et reste mesurable image par image. */
const SCENE_CPS=52;                      // caractères par seconde
function majScene(dt){
  if(!_scene||_scene.fini)return;
  const txt=texteReplique(_scene.i);
  _scene.n=Math.min(txt.length,_scene.n+SCENE_CPS*dt);
  const tx=document.getElementById('sceneTxt');
  if(tx)tx.innerHTML=_echapper(txt.slice(0,Math.floor(_scene.n)));
  if(_scene.n>=txt.length){_scene.fini=true;_majPied();}
}
function _echapper(t){
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*([^*]+)\*/g,'<span class="did">$1</span>');
}
function avancerScene(){
  if(!_scene)return;
  if(!_scene.fini){                       // tout révéler d'un coup
    const txt=texteReplique(_scene.i);
    _scene.n=txt.length;
    const tx=document.getElementById('sceneTxt');
    if(tx)tx.innerHTML=_echapper(txt);
    _scene.fini=true;_majPied();return;
  }
  if(_scene.i<_scene.S.repliques.length-1)_replique(_scene.i+1);
  else _finScene();
}
function passerScene(){ if(_scene&&_scene.sautable)_finScene(); }
function _finScene(){
  if(!_scene)return;
  const {id,apres,pauseAvant,relecture}=_scene;
  _scene=null;
  const ov=document.getElementById('sceneOv'); if(ov)ov.classList.remove('on');
  setPaused(pauseAvant);                      // on RESTITUE, on ne force pas à false
  if(!relecture)marquerSceneVue(id);
  if(typeof refreshHud==='function')try{refreshHud();}catch(e){}
  if(apres)try{apres();}catch(e){}
}

function openDialogue(npc){
  closeAllPanels();initQuests();
  const a=(npc.act!=null?npc.act:(level.actNum!=null?level.actNum:-1));
  const g=GIVER[a]||GIVER['-1'];
  /* La clé du donneur est son INDEX dans GIVER, pas son nom : `donneur.0.greet`.
     Les index sont '0'..'4', 'arena' et '-1' — stables, contrairement au nom
     affiché qui, lui, se traduit. */
  const gk=(GIVER[a]?a:'-1');
  /* ── LES DONNEURS CHANGENT DE TEXTE EN CAUCHEMAR ──────────────── v9.51

     Même règle que les scènes, et pour la même raison : la résolution se fait
     ICI, en un seul endroit, de sorte qu'ajouter une variante reste une
     affaire de DONNÉES. Une voix sans variante retombe sur celle du mode
     Normal — le comportement d'avant, à la ligne près.

     ⚠ LA RÉSOLUTION EST PAR VOIX, PAS PAR DONNEUR. Un donneur qui n'aurait
     qu'un `greet` de Cauchemar garde ses `encours` et `fin` d'origine plutôt
     que de perdre les trois.

     ⚠ `difficulty` est lu comme un GLOBAL, sans import : c'est la convention
     du voisinage, et un `import` ici fait ÉCHOUER la validation esbuild. */
  const gcau=(typeof difficulty!=='undefined'&&difficulty>=1
              &&typeof GIVER_CAUCHEMAR!=='undefined')?GIVER_CAUCHEMAR[gk]:null;
  const gtxt=function(c){
    if(gcau&&gcau[c])return tOu('donneur.'+gk+'.'+c+'_cauchemar', gcau[c]);
    return tOu('donneur.'+gk+'.'+c, g[c]||'');
  };
  const gnom=tOu('donneur.'+gk+'.nom', g.name||'');
  {const POR={'faucon':'por_faucon','garrek':'por_garrek','bruna':'por_bruna','vaast':'por_vaast','poilu':'por_poilu','arena':'por_anselme','regis':'por_regis','coequipier':'por_coequipier'};
   /* ⚠ LE PORTRAIT SE CHERCHE SUR LE NOM FRANÇAIS, PAS SUR LE NOM AFFICHÉ.
      `NPC_KEY` est indexé par `g.name` — la donnée. Chercher avec le nom
      traduit ferait disparaître tous les portraits en anglais, sans erreur. */
   let pk=(a==='arena')?'por_anselme':(NPC_KEY[g.name]&&POR[NPC_KEY[g.name]]);
   if(!pk&&/Anselme/.test(g.name))pk='por_anselme';
   const img=pk&&MISC_ICON&&MISC_ICON[pk];
   document.getElementById('dlgSpeaker').innerHTML=(img?('<img src="'+img+'" style="width:52px;height:52px;image-rendering:pixelated;vertical-align:middle;border-radius:6px;border:1px solid #3a4a72;margin-right:8px">'):(g.ico+' '))+gnom;}
  /* TROIS VOIX, pas une. Le donneur disait exactement la même chose avant,
     pendant et après : c'est ce qui donnait l'impression d'un distributeur.
       greet   — on ne lui a encore rien pris en charge ici
       encours — une quête est en cours : il s'impatiente, il relance
       fin     — tout est accompli : il remercie, il conclut
     `greet` reste le repli si un donneur n'a pas encore ses trois voix. */
  const mains=QUESTS.filter(q=>q.act===a&&q.id[0]==='m');
  const active=mains.find(q=>quests[q.id]&&quests[q.id].unl&&!quests[q.id].done);
  const toutFait=mains.length&&mains.every(q=>quests[q.id]&&quests[q.id].done);
  const _dit=toutFait?(gtxt('fin')||gtxt('greet'))
            :(active&&quests[active.id].p>0)?(gtxt('encours')||gtxt('greet'))
            :gtxt('greet');
  let body='<p style="margin-bottom:10px">'+_dit+'</p>';
  if(active){const st=quests[active.id];const prog=Math.min(st.p,active.target);
    body+='<div style="border-left:3px solid #f4d35e;padding:7px 10px;background:rgba(244,211,94,.08);border-radius:4px">'
      +'<b style="color:#f4d35e">✦ '+nomQuete(active)+'</b><br>'+descQuete(active)
      +(active.target>1?'<br><span style="color:#8ea0c8">'+t('dlg.progression',{a:prog,b:active.target})+'</span>':'')+'</div>';
  } else if(toutFait){
    body+='<p style="color:#7dff9a">'+t('dlg.rienDePlus')+'</p>';
  } else if(a>=0){
    body+='<p style="color:#8ea0c8">'+t('dlg.reviens')+'</p>';
  }
  document.getElementById('dlgText').innerHTML=body;
  SFX.panneau&&SFX.panneau(true);
  document.getElementById('dialoguePanel').style.display='block';
  if(typeof majPausePanneau==='function')majPausePanneau();
  if(typeof updateTabs==='function')updateTabs();
  /* Une étape « parler » se satisfait ICI, et nulle part ailleurs. */
  if(typeof signalerParole==='function')signalerParole(a);
}
/* charPanel ET invPanel sont des conteneurs flex à défilement interne : leur
   pied (Équiper / Démonter / Jeter) doit rester visible quoi qu'il arrive.
   Avec display:block, la fiche d'objet poussait les boutons hors du panneau. */
const _showMode=id=>((id==='charPanel'||id==='invPanel')?'flex':'block');
/* Ouvrir les Paramètres suspend la partie : d'une pierre deux coups, le bouton
   sert aussi de pause. On mémorise si la pause était déjà active pour ne pas
   la lever au mauvais moment. */
let _pauseOpt=false;
/* CE QUI S'EXÉCUTE AU CHARGEMENT — sorti du premier niveau.

   Le module ne fait plus que DÉCLARER. Ses actions de chargement sont
   appelées par l'entrée, dans l'ordre des préfixes, ce qui rend l'ordre
   d'évaluation des modules INDIFFÉRENT — sans quoi la conversion en
   modules ES les remettrait dans un ordre imprévisible. */
function _demarrer26(){
  (function(){
    const ov=document.getElementById('sceneOv'); if(!ov)return;
    ov.addEventListener('click',e=>{
      if(e.target&&e.target.id==='scenePasser'){passerScene();return;}
      avancerScene();
    });
    ov.addEventListener('touchstart',e=>{
      if(e.target&&e.target.id==='scenePasser'){e.preventDefault();passerScene();return;}
      e.preventDefault();avancerScene();
    },{passive:false});
  })();
}

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */
function set_PauseOpt(v){_pauseOpt=v;}
function set_Scene(v){_scene=v;}

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */



