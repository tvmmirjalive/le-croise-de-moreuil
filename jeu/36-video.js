


/* ================================================================
   LES CINÉMATIQUES PLEIN ÉCRAN                              (v9.43)

   Chantier D. Elles n'étaient pas possibles tant que le jeu tenait dans un
   fichier unique : une vidéo H.264 720p de 20 s pèse ~3 Mo, soit 4 Mo une
   fois en base64 — cinq d'entre elles auraient porté le fichier de 12,7 à
   32 Mio. Le chantier E ayant fait du PC un DOSSIER, elles sont désormais
   des fichiers posés à côté, comme n'importe quelle ressource.

   ⚠ CE MODULE EST LIVRÉ SANS AUCUNE VIDÉO, ET C'EST VOULU. Mirja les
   fournira. D'ici là le jeu doit se comporter EXACTEMENT comme avant : une
   cinématique absente rend la main immédiatement et appelle la suite. Une
   cinématique qui bloquerait la partie serait pire que pas de cinématique.

   LES CONTRAINTES DU SOCLE iOS 13 / Chrome 80, qui ne bougent pas :

     · `playsinline` ET `webkit-playsinline` — sans eux, iOS confisque
       l'écran avec son lecteur natif et le jeu disparaît derrière ;
     · l'autoplay AVEC SON est bloqué partout : la balise est `muted`. Une
       cinématique parlante devra démarrer sur un geste ;
     · **H.264 / AAC en MP4** uniquement — iOS ne lit ni WebM, ni VP9, ni AV1 ;
     · `preload="none"` : zéro octet lu tant qu'aucune scène ne la demande ;
     · pas de `controls` — le lecteur natif casserait le plein écran ;
     · **on peut TOUJOURS passer**, au clavier comme au doigt.

   ⚠ ANDROID ET iOS AUSSI. Le fichier unique ne les empêche pas d'emporter
   des .mp4 à côté : la WebView Android résout `videos/x.mp4` en
   `file:///android_asset/videos/x.mp4`, et le bundle iOS fait de même. Le
   chemin est RELATIF pour cette raison — une URL absolue ne marcherait sur
   aucune des trois cibles.
   ================================================================ */

const VIDEO_DOSSIER='videos/';

/* Les cinématiques déclarées. `fichier` est relatif à VIDEO_DOSSIER.
   Une entrée peut exister sans que le fichier soit là : c'est l'état normal
   aujourd'hui, et `jouerVideo` le traite comme une absence. */
const VIDEOS={
  /* La bascule de fin de mode Normal — le moment où le succube se révèle.
     C'est la première candidate évidente : elle est déjà écrite (§71), elle
     est unique dans la partie, et elle vaut une image. */
  bascule:{fichier:'bascule.mp4'}
};

let _video=null;          // {apres, el, fini}

function videoEnCours(){ return !!_video; }

/* ⚠ LE NETTOYAGE PASSE PAR UN SEUL CHEMIN. Deux sorties — la fin naturelle et
   le saut — appelaient deux fois `apres()` dans la première version : la
   vidéo se terminait, `onended` rendait la main, et le clic qui l'avait
   terminée déclenchait aussi `passerVideo`. On garde donc un drapeau. */
function _finVideo(){
  if(!_video)return;
  const V=_video; _video=null;
  const el=V.el;
  if(el){
    try{ el.pause(); }catch(e){}
    el.removeAttribute('src');
    try{ el.load(); }catch(e){}   // libère le décodeur : 720p en RAM, ce n'est pas rien
    el.style.display='none';
  }
  const ov=document.getElementById('cineOv');
  if(ov)ov.style.display='none';
  setPaused(V.pauseAvant);
  if(V.apres)V.apres();
}

function passerVideo(){ if(_video)_finVideo(); }

/* Joue une cinématique, et rend `true` si elle a effectivement démarré.

   ⚠ LE RETOUR `false` N'EST PAS UNE ERREUR. Il dit « il n'y a rien à jouer »,
   et la suite a DÉJÀ été appelée. Les appelants s'écrivent donc comme ceux de
   `jouerScene` : `if(!jouerVideo(id, suite)) suite();` serait un DOUBLE appel.
   On appelle `suite` ici, une fois, quoi qu'il arrive. */
function jouerVideo(id,apres){
  const V=VIDEOS[id];
  const el=document.getElementById('cine');
  const ov=document.getElementById('cineOv');
  if(!V||!el||!ov){ if(apres)apres(); return false; }
  if(_video)_finVideo();

  _video={apres:apres||null, el:el, pauseAvant:paused};
  ov.style.display='flex';
  el.style.display='';
  /* ⚠ `onerror` AVANT `src`. Un fichier absent en `file://` échoue parfois
     avant le retour de l'affectation, et un gestionnaire posé après ne verrait
     jamais l'événement : la partie resterait figée sur un écran noir. */
  el.onerror=function(){ _finVideo(); };
  el.onended=function(){ _finVideo(); };
  el.src=VIDEO_DOSSIER+V.fichier;
  _lancerLecture(el);
  return true;
}

/* ── LE SON : ON L'ESSAIE, ET ON SAIT RECULER ─────────────────── v9.44

   La balise porte `muted` dans le HTML, et c'est le bon défaut : si le script
   ne tournait pas, une cinématique silencieuse vaut mieux qu'un autoplay
   refusé et un écran noir.

   Mais les cinématiques de Mirja ONT une bande son, et la jouer muette
   reviendrait à jeter la moitié du travail. Or elles ne se déclenchent jamais
   à froid : la bascule arrive après le coup qui abat le gardien final, donc
   après un geste du joueur — ce qui est exactement la condition que les
   navigateurs exigent pour autoriser le son.

   On tente donc le son, et on RECULE proprement si le navigateur refuse :

     1. son → si `play()` est rejeté,
     2. muet → si c'est encore rejeté (page en arrière-plan, réglage système),
     3. on referme la cinématique et on rend la main. Jamais d'écran noir.

   ⚠ `play()` rend une promesse sur les navigateurs récents et RIEN sur le
   socle iOS 13 : sans le garde `p && p.catch`, le repli ne s'armerait pas là
   où on en a le plus besoin. */
function _lancerLecture(el){
  el.muted=false;
  const p=el.play&&el.play();
  if(!(p&&p.catch))return;                 // socle ancien : pas de promesse, rien à guetter
  p.catch(function(){
    if(!_video)return;                     // le joueur a déjà passé
    el.muted=true;
    const p2=el.play&&el.play();
    if(p2&&p2.catch)p2.catch(function(){ _finVideo(); });
  });
}

function _demarrer36(){
  const ov=document.getElementById('cineOv');
  if(!ov)return;
  /* Passer : n'importe quel appui, n'importe quel doigt. Une cinématique qu'on
     ne peut pas passer est un défaut — y compris la première fois. */
  ov.addEventListener('pointerdown',function(e){e.preventDefault();passerVideo();},{passive:false});
  document.addEventListener('keydown',function(e){
    if(!_video)return;
    e.preventDefault(); passerVideo();
  });
}


