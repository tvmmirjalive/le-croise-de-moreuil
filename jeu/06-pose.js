




/* ================================================================
   RÈGLE DE POSE DES OBJETS — ajoutée le 20 août 2026

   Signalée en jeu par Mirja : une sortie de grotte dans une zone interdite au
   joueur, et un sac de mort hors d'atteinte. Le mouvement du héros n'est PAS
   en cause — il est juste. Ce sont les objets qui se posaient sans vérifier
   qu'on puisse aller les chercher.

   La règle tient en une phrase : TOUT CE QUE LE JOUEUR DOIT ATTEINDRE SE POSE
   SUR UNE CASE OÙ IL PEUT SE TENIR. Pas « du sol » — les cinq points de pose,
   les mêmes que le héros. C'est la pose des objets qui s'aligne sur le
   mouvement, jamais l'inverse.

   Mesuré AVANT correction, sur le jeu livré en v9.04 :
     · escalier de sortie de grotte : 9 sur 60 (15 %) sur une case sans point
       de pose — une grotte sur sept ;
     · sac de mort laissé dans une grotte : posé sur la BOUCHE elle-même,
       c'est-à-dire, par construction, une case où l'on ne peut pas se tenir —
       100 % des cas. Le rayon de ramassage (TS*1.5 = 66 px) le sauvait quand
       un voisin était tenable, et le perdait sinon.

   `grid[i]===T_FLOOR` ne suffit donc jamais à décider d'une pose : une case
   de sol coincée dans un recoin n'a aucun point de pose. C'est déjà ce qui
   avait tué 16 transitions et rendu la Piscine inaccessible.
   ================================================================ */
function poseObjetOk(lvl,tx,ty){
  if(!lvl||!lvl.grid)return false;
  if(tx<0||ty<0||tx>=lvl.w||ty>=lvl.h)return false;
  if(!walkableCode(lvl.grid[idx(lvl.w,tx,ty)]))return false;
  return poseLibre(lvl,tx*TS+TS/2,ty*TS+TS/2);
}
/* La case TENABLE la plus proche d'un point, en anneaux croissants. Rend null
   si rien de tenable dans le rayon : c'est à l'appelant de choisir son repli,
   pour qu'aucun objet ne soit posé « quelque part » par défaut. */
function caseTenableProche(lvl,tx,ty,rmax,exclureCentre){
  /* `exclureCentre` n'est pas un détail : `spotNear` balaie à partir de r=1
     DÉLIBÉRÉMENT depuis la 8.64. Rendre la case elle-même y ferait réapparaître
     le héros PILE sur l'escalier ou la bouche, et il repartirait aussitôt d'où
     il vient — le va-et-vient sans fin. Vérifié : sans cette option,
     test_transitions passe de 3 échecs sur 6 à 6 sur 6. */
  if(!exclureCentre&&poseObjetOk(lvl,tx,ty))return{tx:tx,ty:ty};
  const R=rmax||4;
  for(let r=1;r<=R;r++){
    let best=null,bd=1e9;
    for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
      const x=tx+dx,y=ty+dy;
      if(!poseObjetOk(lvl,x,y))continue;
      const d=dx*dx+dy*dy; if(d<bd){bd=d;best={tx:x,ty:y};}
    }
    if(best)return best;
  }
  return null;
}

/* ================================================================
   LES CINQ POINTS DE POSE D'UNE TUILE

   Découper une tuile de collision en quatre quartiers ne donne pas quatre
   points de pose : il en donne CINQ. Les quatre COINS de la tuile — qui sont
   les centres des cellules — et le CENTRE de la tuile, là où les quatre
   quartiers se croisent.

        coin ─────── coin
         │  q1   q2   │
         │     ●      │   ● = centre de la tuile, 5e point
         │  q3   q4   │
        coin ─────── coin

   Les coins de toutes les tuiles + les centres de toutes les tuiles forment
   un damier de pas TS/2 : les points (u,v) en demi-cases dont la SOMME EST
   PAIRE. Coins : u et v pairs. Centres : u et v impairs. Les milieux d'arête
   (un seul impair) n'en font pas partie — ce ne sont pas des points de pose.

   Deux fois plus de points qu'avec les seuls coins, donc un déplacement deux
   fois plus fin, sans rien relâcher près des murs :

   - un COIN est valide si sa cellule est libre (aucun bloc dessiné dessus) ;
   - un CENTRE est valide si les QUATRE cellules qui le touchent sont libres.

   C'est la désactivation demandée : tout point en contact avec un pied de
   bloc mur tombe. Un centre de tuile touche quatre cellules à la fois, il est
   donc le premier à disparaître le long d'un mur — et c'est voulu, c'est lui
   qui posait un pied dessus. */
const PAS_POSE=TS/2;
function posePointValide(lvl,u,v){
  if(((u+v)&1)!==0)return false;              // milieu d'arête : pas un point de pose
  if((u&1)===0)                               // COIN de tuile = centre de cellule
    return celluleLibre(lvl,u>>1,v>>1);
  const x=(u-1)>>1, y=(v-1)>>1;               // CENTRE de tuile
  return celluleLibre(lvl,x,y)&&celluleLibre(lvl,x+1,y)
      && celluleLibre(lvl,x,y+1)&&celluleLibre(lvl,x+1,y+1);
}
function posePx(u,v){ return {x:u*PAS_POSE, y:v*PAS_POSE}; }
/* Une case est DÉGAGÉE si son centre est un point de pose valide, c'est-à-dire
   si aucune des quatre cellules qui l'entourent ne porte un bloc de mur.

   Sans ce contrôle, la génération posait des coffres au bout d'une branche
   morte : une case de sol cernée par les quatre blocs dessinés à ses coins. Le
   coffre était à moitié enfoui dans le décor et on devait le chercher à
   l'aveugle. Fonctionnellement ouvrable, visuellement absurde. */
function caseDegagee(lvl,tx,ty){ return posePointValide(lvl,2*tx+1,2*ty+1); }
/* Ramène (tx,ty) sur la case dégagée la plus proche. Rend null s'il n'y en a
   aucune dans le rayon — l'appelant décide alors s'il renonce. */
function caseDegageeProche(lvl,tx,ty,rayon){
  if(caseDegagee(lvl,tx,ty))return [tx,ty];
  const R=rayon||4; let bd=1e9,best=null;
  for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){
    const x=tx+dx,y=ty+dy;
    if(x<1||y<1||x>=lvl.w-1||y>=lvl.h-1)continue;
    if(!caseDegagee(lvl,x,y))continue;
    const d=dx*dx+dy*dy; if(d<bd){bd=d;best=[x,y];}
  }
  return best;
}
/* Pose un objet interactif sur une case dégagée. Rend l'objet, ou null. */
function poserObjet(lvl,tx,ty,extra,rayon){
  const c=caseDegageeProche(lvl,tx,ty,rayon);
  if(!c)return null;
  return Object.assign({tx:c[0],ty:c[1],x:c[0]*TS+TS/2,y:c[1]*TS+TS/2},extra||{});
}
/* Point de pose valide le plus proche d'un pixel. */
function posePointProche(lvl,px,py,portee){
  const u0=px/PAS_POSE, v0=py/PAS_POSE;
  const R=portee||8; let bd=1e18,best=null;
  const cu=Math.round(u0), cv=Math.round(v0);
  for(let dv=-R;dv<=R;dv++)for(let du=-R;du<=R;du++){
    const u=cu+du, v=cv+dv;
    if(!posePointValide(lvl,u,v))continue;
    const d=(u-u0)*(u-u0)+(v-v0)*(v-v0);
    if(d<bd){bd=d;best={u,v};}
  }
  return best;
}
/* A* sur le damier des points de pose. Voisins : les quatre diagonales du
   damier (un demi-pas en x ET en y, 31 px) et les quatre axes (un pas
   entier, 44 px).

   Aucune condition de relais n'est nécessaire, et j'en avais mis une à tort :
   entre deux points de pose valides, le segment reste toujours dans la zone
   libre. Un pas d'axe entre deux coins longe la frontière de deux cellules
   libres ; un pas d'axe entre deux centres traverse deux tuiles dont les
   quatre coins sont libres ; une diagonale reste à l'intérieur d'une seule
   cellule libre. La condition de relais coupait 32 points sur 499 sans raison
   — mesuré. */
/* Remonte la chaîne des parents. Cette boucle était écrite DEUX FOIS dans
   `astarPoses` — chemin complet et repli partiel — comme elle l'était deux
   fois dans `astar`. Quatre copies en tout, sur deux fichiers. */
function _posesRefaireChemin(n){
  const P=[];
  while(n){P.push({u:n.u,v:n.v});n=n.p;}
  return P.reverse();
}

/* ================================================================
   A* SUR LES POINTS DE POSE — deux mesures dictent cette fonction.

   BUDGET D'EXPLORATION. Le chemin de quête traverse la carte entière : 1 250
   points de passage à l'acte 1, et 40 ms de calcul sur un ordinateur de
   BUREAU. Sur un téléphone, c'est 120 à 480 ms — une image figée, toutes les
   deux ou trois secondes de marche. C'était ça, la saccade régulière.

   Or on n'a besoin que des NEUF premières cases : les marqueurs au sol ne vont
   pas plus loin. On borne donc l'exploration et, si le budget s'épuise, on rend
   le meilleur chemin partiel — celui qui s'est le plus rapproché du but. La
   direction reste juste ; seule la distance affichée devient une estimation,
   et on le dit (`R.partiel`).

   Le déplacement au CLIC garde le budget complet : lui doit vraiment arriver.

   TAS BINAIRE. La recherche linéaire du minimum tenait sur les 499 points du
   village ; l'acte 0 en compte 48 000 et le damier en offre 720 000. Coût
   mesuré d'un trajet long à l'acte 0 : 1,2 s en linéaire, 12 ms en tas.

   Le tas était ici RECOPIÉ mot pour mot depuis `astar` — deux exemplaires de
   la même structure, dans deux fichiers. C'est maintenant `_tasBinaire`.
   ================================================================ */
function astarPoses(lvl,U0,V0,U1,V1,budget){
  if(!posePointValide(lvl,U1,V1))return null;
  const MAX=budget||200000;
  let meilleur=null, hMin=Infinity;
  const cle=(u,v)=>u+','+v;
  const tas=_tasBinaire({u:U0,v:V0,g:0,f:0,p:null});
  const gS=new Map([[cle(U0,V0),0]]), clos=new Set();
  const VOIS=[[1,1,1],[1,-1,1],[-1,1,1],[-1,-1,1],[2,0,1.414],[-2,0,1.414],[0,2,1.414],[0,-2,1.414]];
  let iter=0;
  while(!tas.vide()&&iter++<MAX){
    const cur=tas.retirer(), kc=cle(cur.u,cur.v);
    if(clos.has(kc))continue;
    {const h=Math.hypot(cur.u-U1,cur.v-V1); if(h<hMin){hMin=h;meilleur=cur;}}
    if(cur.u===U1&&cur.v===V1)return _posesRefaireChemin(cur);
    clos.add(kc);
    for(const [du,dv,co] of VOIS){
      const u=cur.u+du, v=cur.v+dv;
      if(!posePointValide(lvl,u,v))continue;
      const k=cle(u,v);
      if(clos.has(k))continue;
      const ng=cur.g+co, an=gS.has(k)?gS.get(k):Infinity;
      if(ng<an){gS.set(k,ng);
        tas.pousser({u,v,g:ng,f:ng+Math.hypot(u-U1,v-V1)*0.71,p:cur});}
    }
  }
  /* Budget épuisé : on rend le meilleur bout de chemin trouvé. Mieux vaut une
     direction juste sur neuf cases qu'une image figée pendant un tiers de
     seconde. */
  if(meilleur){const R=_posesRefaireChemin(meilleur); R.partiel=true; return R;}
  return null;
}

/* Cellule libre la plus proche d'un point — pour recaler une arrivée. */

function celluleProche(lvl,px,py,portee){
  const c=celluleDe(px,py);
  if(celluleLibre(lvl,c.X,c.Y))return c;
  const R=portee||4; let bd=1e18,best=null;
  for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){
    const X=c.X+dx, Y=c.Y+dy;
    if(!celluleLibre(lvl,X,Y))continue;
    const d=(X*TS-px)**2+(Y*TS-py)**2;
    if(d<bd){bd=d;best={X,Y};}
  }
  return best;
}
/* Pose le héros au CENTRE de la cellule libre la plus proche. Sans ça, une
   arrivée sur un centre de case le déposerait pile au coin où quatre
   cellules se touchent — le point ambigu, celui qui ne changeait rien. */
function poserSurCellule(lvl,px,py){
  if(!regleQuartiers(lvl))return {x:px,y:py};
  const p=posePointProche(lvl,px,py,10);
  return p?posePx(p.u,p.v):{x:px,y:py};
}
/* A* sur la grille des CELLULES — (w+1)×(h+1) sommets, pas les cases. */
function astarCellules(lvl,SX,SY,TX,TY){
  const W=lvl.w+1, H=lvl.h+1, K=(x,y)=>y*W+x;
  if(!celluleLibre(lvl,TX,TY))return null;
  const open=[{x:SX,y:SY,g:0,f:0,p:null}];
  const gS=new Float32Array(W*H).fill(Infinity); gS[K(SX,SY)]=0;
  const clos=new Uint8Array(W*H);
  let iter=0;
  while(open.length&&iter++<60000){
    let bi=0;for(let i=1;i<open.length;i++)if(open[i].f<open[bi].f)bi=i;
    const cur=open.splice(bi,1)[0];
    if(clos[K(cur.x,cur.y)])continue;
    if(cur.x===TX&&cur.y===TY){const P=[];let n=cur;while(n){P.push({x:n.x,y:n.y});n=n.p;}return P.reverse();}
    clos[K(cur.x,cur.y)]=1;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const nx=cur.x+dx, ny=cur.y+dy;
      if(nx<0||ny<0||nx>=W||ny>=H)continue;
      if(!celluleLibre(lvl,nx,ny))continue;
      if(dx!==0&&dy!==0&&(!celluleLibre(lvl,cur.x+dx,cur.y)||!celluleLibre(lvl,cur.x,cur.y+dy)))continue;
      if(clos[K(nx,ny)])continue;
      const ng=cur.g+((dx!==0&&dy!==0)?1.41:1);
      if(ng<gS[K(nx,ny)]){gS[K(nx,ny)]=ng;
        open.push({x:nx,y:ny,g:ng,f:ng+Math.hypot(nx-TX,ny-TY),p:cur});}
    }
  }
  return null;
}
function corpsLibre(lvl,px,py,r){
  if(!lvl)return false;
  r=(r==null?16:r);
  const x0=Math.floor((px-r)/TS), x1=Math.floor((px+r)/TS);
  const y0=Math.floor((py-r)/TS), y1=Math.floor((py+r)/TS);
  const r2=r*r;
  /* 1. Le CORPS ne rentre pas dans une case de mur — règle d'origine. */
  for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
    if(tx<0||ty<0||tx>=lvl.w||ty>=lvl.h)return false;
    if(walkableCode(lvl.grid[idx(lvl.w,tx,ty)]))continue;
    const cx=Math.max(tx*TS,Math.min(px,(tx+1)*TS));
    const cy=Math.max(ty*TS,Math.min(py,(ty+1)*TS));
    const dx=px-cx, dy=py-cy;
    if(dx*dx+dy*dy<r2)return false;
  }
  /* 2. LES PIEDS HORS DES BLOCS DESSINÉS — essayé, PAS retenu.

     L'idée était juste : ce qui bloque devrait être ce qu'on voit. Mais un
     bloc au sommet (X,Y) couvre le carré centré sur ce sommet, et le centre
     d'une case tombe EXACTEMENT sur le bord de ce carré. Toute case ayant un
     bloc à l'un de ses quatre coins devient donc interdite, quel que soit le
     rayon testé — mesuré identique de 14 à 21 px.

     Coût réel : 35 % du sol perdu, l'acte 4 coupé en deux (71 % dans la plus
     grande zone), et des coffres devenus inaccessibles. Non livrable en
     l'état : il faudrait que la génération de niveaux tienne compte de la
     règle, ce qui est un autre chantier.

     Le code est laissé en commentaire pour ne pas avoir à le retrouver.

     const rp=RAYON_PIEDS, rp2=rp*rp;
     const X0=Math.round((px-rp)/TS), X1=Math.round((px+rp)/TS);
     const Y0=Math.round((py-rp)/TS), Y1=Math.round((py+rp)/TS);
     for(let Y=Y0;Y<=Y1;Y++)for(let X=X0;X<=X1;X++){
       if(!blocDessine(lvl,X,Y))continue;
       const cx=Math.max(X*TS-TS/2,Math.min(px,X*TS+TS/2));
       const cy=Math.max(Y*TS-TS/2,Math.min(py,Y*TS+TS/2));
       if((px-cx)**2+(py-cy)**2<rp2)return false;
     }
  */
  /* 3. LA RÈGLE DES QUARTIERS — à l'essai, VILLAGE uniquement.
     Les pieds ne se posent pas sur le quart de case recouvert par un bloc. */
  if(!poseLibre(lvl,px,py))return false;
  return true;
}



