





/* ================================================================
   A* PATHFINDING (grille)
   ================================================================ */
/* Masque des cases ou le CORPS du heros tient vraiment, une fois la collision
   calee sur les blocs dessines. L'A* raisonne sur des centres de case : s'il
   ignore ce masque, il trace des chemins passant par des cases devenues
   interdites, et le heros se bloque. Calcule une fois par niveau. */
function masqueLibre(lvl){
  if(lvl._libre)return lvl._libre;
  const m=new Uint8Array(lvl.w*lvl.h);
  const R=(typeof R_MARCHE!=='undefined'?R_MARCHE:16);
  for(let ty=0;ty<lvl.h;ty++)for(let tx=0;tx<lvl.w;tx++){
    if(!walkableCode(lvl.grid[idx(lvl.w,tx,ty)]))continue;
    if(corpsLibre(lvl,tx*TS+TS/2,ty*TS+TS/2,R))m[idx(lvl.w,tx,ty)]=1;
  }
  lvl._libre=m; return m;
}
function caseLibre(lvl,tx,ty){
  return tx>=0&&ty>=0&&tx<lvl.w&&ty<lvl.h&&masqueLibre(lvl)[idx(lvl.w,tx,ty)]===1;
}
/* UN TAS BINAIRE — la liste ouverte du A*.                        (Phase 4)

   C'était quatre fermetures imbriquées dans `astar` : une structure de
   données générale enfouie au milieu d'un algorithme de recherche, où on ne
   pouvait ni la lire seule, ni l'éprouver seule.

   Elle reste une fabrique à fermetures — et non un objet à `this` — parce que
   le coût mesuré du A* est le sujet de toute la fonction ci-dessous : on ne
   change pas la forme du chemin chaud pour faire joli. Une allocation par
   recherche, comme avant. */
function _tasBinaire(premier){
  const tas=[premier];
  const monte=i=>{while(i>0){const q=(i-1)>>1;if(tas[q].f<=tas[i].f)break;
    const t=tas[q];tas[q]=tas[i];tas[i]=t;i=q;}};
  const descend=i=>{for(;;){const a=2*i+1,b=a+1;let m=i;
    if(a<tas.length&&tas[a].f<tas[m].f)m=a;
    if(b<tas.length&&tas[b].f<tas[m].f)m=b;
    if(m===i)break;const t=tas[m];tas[m]=tas[i];tas[i]=t;i=m;}};
  return {
    pousser:e=>{tas.push(e);monte(tas.length-1);},
    retirer:()=>{const t=tas[0],d=tas.pop();if(tas.length){tas[0]=d;descend(0);}return t;},
    vide:()=>tas.length===0
  };
}

/* Remonte la chaîne des parents jusqu'au départ. Cette boucle était écrite
   DEUX FOIS dans `astar` — une pour le chemin complet, une pour le repli sur
   le meilleur partiel — mot pour mot. */
function _astarRefaireChemin(n){
  const path=[];
  while(n){path.push({x:n.x,y:n.y});n=n.p;}
  return path.reverse();
}

/* ================================================================
   A* — TROIS CORRECTIFS DE PERFORMANCE. C'ÉTAIT LE PLUS GROS COÛT DU JEU.

   Ces explications vivaient DANS le corps de la fonction, où elles pesaient
   la moitié de ses 74 lignes. Elles documentent la fonction entière, pas une
   instruction : leur place est ici.

   1. La liste ouverte était BALAYÉE LINÉAIREMENT pour trouver son minimum.
      Sur une carte de 500 x 360, une recherche coûtait 11 ms en moyenne et
      27 ms au pire — et le jeu en lance TROIS PAR IMAGE pour les ennemis,
      soit 34 ms de calcul par image sur un ordinateur de bureau. Sur un
      téléphone, c'est trois à dix fois plus : injouable. Un tas binaire
      remplace le balayage (voir `_tasBinaire`).

   2. Un BUDGET d'exploration, avec repli sur le meilleur chemin partiel.
      Un ennemi n'a pas besoin d'un itinéraire à travers toute la carte : il
      lui faut la bonne direction sur vingt cases. Le déplacement au clic,
      lui, garde le budget complet.

   3. LES TABLEAUX DE TRAVAIL SONT RÉUTILISÉS.
      `new Float32Array(w*h).fill(Infinity)` plus `new Uint8Array(w*h)` à
      chaque appel, c'est 900 Ko alloués ET remplis — trois fois par image sur
      une carte de 500 x 360. À elle seule, cette ligne nourrissait le
      ramasse-miettes. On garde les tableaux d'une fois sur l'autre et on les
      « efface » avec un numéro de passage : une case n'est valide que si sa
      marque vaut le passage courant. Aucun remplissage, aucune allocation.

   Mesuré après : 0,18 ms en moyenne, 2 ms au pire. `test_cout_cpu` le tient.
   ================================================================ */
function astar(lvl,sx,sy,tx,ty,budget){
  const {grid,w,h}=lvl;
  if(!walkableCode(grid[idx(w,tx,ty)]))return null;
  const MAX=budget||60000;
  const tas=_tasBinaire({x:sx,y:sy,g:0,f:0,p:null});
  const _n=w*h;
  if(!astar._g||astar._g.length<_n){
    astar._g=new Float32Array(_n); astar._m=new Int32Array(_n); astar._gen=0;
  }
  const gScore=astar._g, marque=astar._m, gen=++astar._gen;
  const key=(x,y)=>idx(w,x,y);
  gScore[key(sx,sy)]=0; marque[key(sx,sy)]=gen;
  const clos=astar._c&&astar._c.length>=_n?astar._c:(astar._c=new Int32Array(_n));
  let iter=0, meilleur=null, hMin=Infinity;
  while(!tas.vide()&&iter++<MAX){
    const cur=tas.retirer();
    if(clos[key(cur.x,cur.y)]===gen)continue;
    {const hh=Math.hypot(cur.x-tx,cur.y-ty); if(hh<hMin){hMin=hh;meilleur=cur;}}
    if(cur.x===tx&&cur.y===ty)return _astarRefaireChemin(cur);
    clos[key(cur.x,cur.y)]=gen;
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const nx=cur.x+dx,ny=cur.y+dy;
      if(nx<0||ny<0||nx>=w||ny>=h)continue;
      if(!walkableCode(grid[key(nx,ny)]))continue;
      if(dx!==0&&dy!==0){ // no corner cutting
        if(!walkableCode(grid[key(cur.x+dx,cur.y)])||!walkableCode(grid[key(cur.x,cur.y+dy)]))continue;}
      if(clos[key(nx,ny)]===gen)continue;
      const step=(dx!==0&&dy!==0)?1.41:1;
      const ng=cur.g+step;
      const _k=key(nx,ny);
      const _anc=(marque[_k]===gen?gScore[_k]:Infinity);   /* inline : pas d'appel de fonction par arête */
      if(ng<_anc){
        gScore[_k]=ng; marque[_k]=gen;
        const hh=Math.hypot(nx-tx,ny-ty);
        tas.pousser({x:nx,y:ny,g:ng,f:ng+hh,p:cur});}
    }
  }
  /* Budget épuisé : le meilleur bout de chemin trouvé vaut mieux que rien. */
  if(meilleur&&meilleur.p)return _astarRefaireChemin(meilleur);
  return null;
}
/* Recale un point de passage hors d'un quartier interdit.
   L'A* raisonne sur des CENTRES de case ; or le centre d'une case tombe
   toujours dans le quartier sud-est. Si ce quartier porte un bloc, on cherche
   le point libre le plus proche À L'INTÉRIEUR de la même case — les trois
   autres quartiers d'abord, puis un balayage fin. Sans village concerné
   (regleQuartiers faux), la fonction rend le point tel quel. */
function recalerPoint(lvl,px,py){
  if(!regleQuartiers(lvl))return {x:px,y:py};
  if(corpsLibre(lvl,px,py,R_MARCHE))return {x:px,y:py};
  const tx=Math.floor(px/TS), ty=Math.floor(py/TS);
  let best=null,bd=1e9;
  for(let i=1;i<=7;i++)for(let j=1;j<=7;j++){
    const cx=(tx+i/8)*TS, cy=(ty+j/8)*TS;
    if(!corpsLibre(lvl,cx,cy,R_MARCHE))continue;
    const d=(cx-px)**2+(cy-py)**2;
    if(d<bd){bd=d;best={x:cx,y:cy};}
  }
  return best||{x:px,y:py};
}
function pathToPixels(path){return path.map(p=>recalerPoint(level,p.x*TS+TS/2,p.y*TS+TS/2));}
function tileAt(px,py){return{tx:Math.floor(px/TS),ty:Math.floor(py/TS)};}
function isWalkablePx(lvl,px,py){
  const tx=Math.floor(px/TS),ty=Math.floor(py/TS);
  if(tx<0||ty<0||tx>=lvl.w||ty>=lvl.h)return false;
  return walkableCode(lvl.grid[idx(lvl.w,tx,ty)]);
}
/* ── COLLISION DU CORPS ────────────────────────────────────────────────────
   isWalkablePx ne teste QU'UN POINT. Au clavier ce n'est pas grave : le
   déplacement suit un chemin calculé de centre de case en centre de case, donc
   le héros ne peut pas entrer dans un mur. Au joystick, le déplacement est
   libre et seul le centre du personnage était testé : son corps, large de 16 px
   de rayon, s'enfonçait donc de 16 px dans chaque mur avant que quoi que ce
   soit ne l'arrête. C'est ce qu'on voit sur téléphone, où le joystick est actif
   par défaut — et qu'on verrait aussi sur ordinateur en l'activant.

   On teste ici le DISQUE du personnage contre les cases non praticables qu'il
   recouvre : intersection cercle / rectangle, exacte, sur 4 à 9 cases au plus. */
/* Écart de MARCHE au mur.

   Le corps de collision fait 16 px de rayon, ce qui suffit à empêcher le héros
   d'entrer dans un mur — vérifié, ses pieds ne débordent jamais (0,00 px sur
   39 403 pas). Mais en isométrique, le dessus d'un bloc de mur occupe l'espace
   écran situé juste au-dessus de la ligne de la case : un héros collé au mur a
   donc ses pieds posés sur cette face beige, et on le croit sur le mur.

   Mesuré : 99,7 % des cases praticables appartiennent à un passage d'au moins
   3 cases de large. On peut donc l'écarter des murs sans le coincer, le repli
   « se faire petit » couvrant les rares passages d'une seule case.

   16 → 22 px : ses pieds retombent franchement sur le losange du sol. */
/* 21 px, et pas un de plus : à 22 — la demi-case — le CENTRE d'une case
   bordée de mur devient inatteignable, et l'A* ne passe que par les centres.
   Mesuré : 21 → 0 blocage sur 90 trajets ; 22 → 89 blocages. */
let R_MARCHE=21;
/* ================================================================
   LA COLLISION SUIT CE QUI EST DESSINE

   Le dual-grid pose ses blocs de mur sur les SOMMETS de la grille : un bloc
   dessine au sommet (X,Y) couvre le carre CENTRE sur (X.TS, Y.TS), donc un
   QUART de chacune des quatre cases qui l'entourent -- y compris les cases de
   sol. C'est pour cela que le heros pouvait se tenir sur du sol parfaitement
   praticable et avoir un pied sur un mur : le mur etait dessine par-dessus.

   Decaler la grille ne servait a rien -- mesure : 17,5 % de cases couvertes
   dans l'ancienne comme dans la nouvelle convention, puisque ce n'est qu'une
   translation de tout le systeme.

   La solution est celle de Mirja : ce qui bloque, c'est ce qu'on VOIT.
   On teste donc le corps contre l'emprise des blocs DESSINES, pas contre les
   cases de mur. Cout mesure : ~18 % de cases interdites, et 100 % de ce qui
   reste demeure accessible dans les cinq actes.
   ================================================================ */
/* Demi-largeur des pieds du héros, mesurée sur la planche : colonnes 52 à 75
   de la case de 128, soit 24 px de large. */
const RAYON_PIEDS=12;
function _solEn(lvl,x,y){
  if(x<0||y<0||x>=lvl.w||y>=lvl.h)return false;
  return walkableCode(lvl.grid[idx(lvl.w,x,y)]);
}
function blocDessine(lvl,X,Y){
  const a=_solEn(lvl,X-1,Y-1),b=_solEn(lvl,X,Y-1),c=_solEn(lvl,X-1,Y),d=_solEn(lvl,X,Y);
  const gi=(a?0:8)|(b?0:4)|(c?0:2)|(d?0:1);
  return gi!==0&&gi!==15;
}
/* ================================================================
   LA RÈGLE DES QUARTIERS  —  À L'ESSAI, VILLAGE UNIQUEMENT

   Le dual-grid pose ses blocs de mur sur les SOMMETS de la grille. Un bloc
   dessiné au sommet (X,Y) recouvre le quart de chacune des quatre cases qui
   l'entourent — cases de sol comprises. Le héros pouvait donc se tenir sur du
   sol praticable avec un pied posé sur du mur dessiné.

   L'idée de Mirja : découper chaque case en QUATRE QUARTIERS, un par coin, et
   n'interdire que le quartier dont le coin porte un bloc. La case entière
   n'est plus condamnée : les trois autres quarts restent praticables, et un
   couloir d'une seule case reste franchissable en longeant le côté opposé.
   Les QUATRE coins sont testés, pas seulement le coin sud.

   Mesuré sur l'acte 4 : 13,1 % de quartiers interdits, contre 35 % de sol
   perdu avec la règle par case entière qui coupait le niveau en deux.

   À L'ESSAI SUR LE VILLAGE SEULEMENT. Les actes gardent le comportement
   d'origine tant que ce n'est pas validé à la main.
   ================================================================ */
/* Portée de la règle. Essayée au village en 8.41-8.44, étendue à TOUT le jeu
   en 8.45 après mesure sur 45 niveaux régénérés des cinq actes : 1 872 cibles
   (coffres, sanctuaires, grottes, sorties, PNJ, reliques, portails), AUCUNE
   inatteignable, connexité des points de pose 100 % partout. */
function regleQuartiers(lvl){ return !!lvl && !!lvl.grid; }

/* LA CELLULE DE POSE — le croisement des quatre quartiers.
   Un bloc dessiné au sommet (X,Y) couvre EXACTEMENT le carré d'une case
   entière centré sur ce sommet. Ces carrés pavent le monde sans se
   chevaucher : c'est la vraie grille de pose du héros, décalée d'une
   demi-case par rapport à la grille des cases.

   Convention du moteur : gi=(N?0:8)|(E?0:4)|(W?0:2)|(S?0:1), N/E/W/S valant
   « est du sol ».  gi=0 → les quatre tuiles sont du SOL, rien n'est dessiné :
   CELLULE LIBRE.  gi=15 → les quatre sont du mur : plein roc.  1 à 14 → un
   bloc est dessiné : cellule occupée.

   Conséquence, et c'est tout l'intérêt : au CENTRE d'une cellule libre il y a
   22 px de sol dans toutes les directions. Mesuré au village : 283 cellules
   libres, 0 refusée par le test du corps à 21 px de rayon. */
function celluleLibre(lvl,X,Y){
  return _solEn(lvl,X-1,Y-1)&&_solEn(lvl,X,Y-1)&&_solEn(lvl,X-1,Y)&&_solEn(lvl,X,Y);
}
/* Le sommet le plus proche du point est le centre de sa cellule. */
function celluleDe(px,py){ return {X:Math.round(px/TS), Y:Math.round(py/TS)}; }
/* Demi-largeur des PIEDS du héros : 24 px de large, colonnes 52 à 75 du cadre
   de 128, mesuré sur la planche. */
const DEMI_PIEDS=12;
/* Au CLIC, le héros atterrit sur un des 499 points de pose : il est alors à
   22 px de tout bord, donc largement au sec. Au JOYSTICK il se déplace en
   continu, et la seule contrainte était que son CENTRE soit dans une cellule
   libre — un centre à un pixel du bord laissait 11 px de pied sur la cellule
   d'à côté. Mesuré : 12,6 % des positions autorisées posaient un pied hors
   d'une cellule libre. C'est exactement ce qu'on voit sur Android, où l'on ne
   joue qu'au joystick.

   On teste donc les QUATRE COINS de l'empreinte des pieds, pas le centre.
   Coût mesuré : village toujours connexe à 100 %, et les 499 points de pose
   respectent tous la règle — le clic n'est pas touché. */
function poseLibre(lvl,px,py){
  if(!regleQuartiers(lvl))return true;
  const d=DEMI_PIEDS, r=(a,b)=>celluleLibre(lvl,Math.round(a/TS),Math.round(b/TS));
  return r(px-d,py-d)&&r(px+d,py-d)&&r(px-d,py+d)&&r(px+d,py+d);
}

/* Aide de TEST, rendue à son propriétaire.                        (Phase 5)
   Elle vivait dans 19-halos.js, loin de la variable qu'elle écrit — ce
   que la portée globale unique autorisait sans le dire. */
function setR(v){R_MARCHE=v;}



