




/* ================================================================
   LE POINTEUR SE RAMÈNE TOUJOURS DANS LE REPÈRE DU CANEVAS

   Le canevas est étiré en CSS (`width:100%`) alors que sa mémoire fait
   `innerWidth x innerHeight`. Tant que les deux coïncident, retrancher
   simplement `rect.left` suffit. Mais si la fenêtre change de taille
   pendant que l'onglet est CACHÉ, l'événement `resize` n'arrive pas :
   au retour, la mémoire du canevas et sa taille affichée ne sont plus
   à la même échelle.

   Un clic converti sans tenir compte de cette échelle atterrit alors à
   côté, et l'erreur grandit avec la distance au centre — le héros part
   à l'opposé du point visé, et plus rien n'est cliquable. C'est le
   « la souris devient folle » rapporté sur PC après un aller-retour
   vers un autre onglet.

   Deux protections : cette conversion à l'échelle, et un recalage de la
   fenêtre au retour (voir `reprendreFenetre`). L'une répare, l'autre
   empêche.
   ================================================================ */
/* ================================================================
   DIAGNOSTIC DU POINTEUR — ?diag=1

   Le calcul est juste au banc d'essai : un aller-retour monde → écran →
   monde revient à 0,00 px près, et un clic dans chaque direction envoie
   le héros du bon côté. Si le pointage part quand même de travers dans
   un vrai navigateur, c'est que la GÉOMÉTRIE réelle diffère de ce que le
   jeu croit.

   Plutôt que de deviner une fois de plus : ajoute `?diag=1` à l'adresse,
   un encart affiche les chiffres vivants et le dernier clic. Une capture
   d'écran suffit alors à trancher.
   ================================================================ */
let DIAG=false;
let _dernierClic=null;
function majDiag(){
  if(!DIAG)return;
  let b=document.getElementById('diagBox');
  if(!b){
    b=document.createElement('div');b.id='diagBox';
    b.style.cssText='position:fixed;left:8px;bottom:8px;z-index:99;'
      +'background:rgba(4,6,12,.92);border:1px solid #caa53a;border-radius:6px;'
      +'padding:8px 10px;font:11px/1.5 monospace;color:#dfe6f4;pointer-events:none;'
      +'white-space:pre;max-width:60vw';
    document.body.appendChild(b);
  }
  const r=cv.getBoundingClientRect(), e=_echelleCanevas(r);
  b.textContent=
     'rendu W,H '+W+' x '+H+'   ← le repère qui compte\n'
    +'canevas   '+cv.width+' x '+cv.height
      +'  (densité x'+(cv.width/Math.max(1,W)).toFixed(2)+')\n'
    +'fenêtre   '+innerWidth+' x '+innerHeight+'\n'
    +'rectangle '+Math.round(r.width)+' x '+Math.round(r.height)
       +'  à ('+Math.round(r.left)+','+Math.round(r.top)+')\n'
    +'échelle   x'+e.ex.toFixed(3)+' / x'+e.ey.toFixed(3)
       +(e.ex===1&&e.ey===1?'   (aucune correction)':'   ← CORRECTION ACTIVE')+'\n'
    +'origine   isoOX '+Math.round(isoOX)+'  isoOY '+Math.round(isoOY)+'\n'
    +'héros     '+Math.round(player.x)+','+Math.round(player.y)+'\n'
    +(_dernierClic
       ? ('clic      écran '+Math.round(_dernierClic.sx)+','+Math.round(_dernierClic.sy)
          +'  → monde '+Math.round(_dernierClic.wx)+','+Math.round(_dernierClic.wy)+'\n'
          +'écart     '+Math.round(_dernierClic.wx-player.x)+','+Math.round(_dernierClic.wy-player.y))
       : 'clic      (aucun)');
}
function pointeurCanevas(clientX,clientY){
  const r=cv.getBoundingClientRect();
  const e=_echelleCanevas(r);
  return {x:(clientX-r.left)*e.ex, y:(clientY-r.top)*e.ey};
}
/* On ne se fie au rectangle affiché QUE s'il est crédible.

   Leçon de la 8.67 : j'avais appliqué la mise à l'échelle au doigt aussi.
   Sur la WebView Android le rectangle rendu ne correspond pas au canevas —
   un pouce posé en bas à gauche se retrouvait projeté SOUS le canevas, et
   le joystick ne naissait plus. J'ai cassé le tactile en réparant la souris.

   Une désynchronisation de fenêtre reste modérée : on n'accepte donc une
   correction que dans la bande 0,5x - 2x. Au-delà, ce n'est pas un décalage,
   c'est un rectangle auquel on ne peut pas se fier — on ne corrige rien. */
function _echelleCanevas(r){
  /* ON COMPARE AU REPÈRE DU RENDU — `W`/`H` — ET SURTOUT PAS À
     `cv.width`/`cv.height`.

     C'est l'erreur que j'ai traînée de la 8.67 à la 8.76. Une surcouche
     « rendu net sur écran haute densité » redéfinit `resize` :

       W = innerWidth;  H = innerHeight;              // repère du RENDU
       cv.width = W*d;  cv.height = H*d;              // mémoire du canevas
       ctx.setTransform(d,0,0,d,0,0);                 // tout se dessine en W,H

     Sur un écran Retina (d = 2), la mémoire du canevas fait donc le DOUBLE
     du repère de rendu. Je comparais `cv.width` (2940) au rectangle affiché
     (1470) et j'en déduisais qu'il fallait doubler chaque clic — alors que
     `screenToWorld` et `isoOX` travaillent en 1470.

     Résultat sur le Mac de Mirja : un clic au centre partait à 1 346 px de
     là, donc dans un mur, donc le héros ne bougeait pas. Et sur Android,
     même densité, même cause : c'est ce qui avait tué le joystick en 8.67.

     `W` est le seul repère juste : c'est celui dans lequel le jeu dessine. */
  if(!r||!r.width||!r.height)return{ex:1,ey:1};
  if(W===Math.round(innerWidth)&&H===Math.round(innerHeight))
    return{ex:1,ey:1};                    // `resize` est à jour : rien à faire
  const ex=W/r.width, ey=H/r.height;
  if(!isFinite(ex)||!isFinite(ey))return{ex:1,ey:1};
  if(ex>2||ex<0.5||ey>2||ey<0.5)return{ex:1,ey:1};
  return{ex,ey};
}
/* ================= SUPPORT TABLETTE (paysage) ================= */
let IS_TOUCH=(('ontouchstart' in window)||navigator.maxTouchPoints>0);
/* ?tactile=1 force le profil tactile au navigateur, ?tactile=0 le désactive.
   Sert à éprouver le joystick et la visée sans appareil. */
function screenToWorld(mx,my){
  const a=2*(mx-isoOX)/ISO_TW, b=2*(my-isoOY)/ISO_TH;
  return {x:((a+b)/2)*TS, y:((b-a)/2)*TS};
}
/* CE QUI S'EXÉCUTE AU CHARGEMENT — sorti du premier niveau.

   Le module ne fait plus que DÉCLARER. Ses actions de chargement sont
   appelées par l'entrée, dans l'ordre des préfixes, ce qui rend l'ordre
   d'évaluation des modules INDIFFÉRENT — sans quoi la conversion en
   modules ES les remettrait dans un ordre imprévisible. */
function _demarrer08(){
  try{DIAG=/[?&]diag=1/.test(location.search);}catch(e){}
  cv.addEventListener('mousemove',e=>{const p=pointeurCanevas(e.clientX,e.clientY);mouse.x=p.x;mouse.y=p.y;});
  cv.addEventListener('mousedown',e=>{if(!running)return;
    const p=pointeurCanevas(e.clientX,e.clientY);
    const w=screenToWorld(p.x,p.y);
    if(DIAG)_dernierClic={sx:p.x,sy:p.y,wx:w.x,wy:w.y};
    onClick(w.x,w.y);});
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  try{const _m=/[?&]tactile=([01])/.exec(location.search); if(_m)IS_TOUCH=(_m[1]==='1');}catch(e){}
}



