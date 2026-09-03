



















/* ================================================================
   HALOS PRÉ-RENDUS  —  à la place de ctx.shadowBlur

   `shadowBlur` sort du chemin accéléré : il est calculé sur le processeur, à
   chaque appel. Il était utilisé pour les YEUX de chaque ennemi et pour CHAQUE
   projectile — donc par entité et par image. Quarante ennemis à l'écran, c'est
   quarante flous gaussiens soixante fois par seconde.

   Un halo est un dégradé radial : on le rend UNE FOIS dans un petit canevas,
   par couleur et par rayon, et on le recopie. Visuellement identique à l'œil,
   sans commune mesure côté coût.
   ================================================================ */
const _halos={};
function halo(x,y,r,col){
  const k=col+'|'+Math.round(r);
  let hc=_halos[k];
  if(hc===undefined){
    try{
      const d=Math.max(4,Math.ceil(r*2)+2);
      const cv=document.createElement('canvas');cv.width=d;cv.height=d;
      const c2=cv.getContext('2d');
      const g=c2.createRadialGradient(d/2,d/2,0,d/2,d/2,d/2);
      g.addColorStop(0,col);g.addColorStop(0.45,col);
      g.addColorStop(1,'rgba(0,0,0,0)');
      c2.globalAlpha=0.85;c2.fillStyle=g;c2.beginPath();c2.arc(d/2,d/2,d/2,0,6.28);c2.fill();
      hc=cv;
    }catch(e){ hc=null; }
    _halos[k]=hc;
  }
  if(!hc){ctx.beginPath();ctx.arc(x,y,r*0.5,0,6.28);ctx.fillStyle=col;ctx.fill();return;}
  ctx.drawImage(hc,x-hc.width/2,y-hc.height/2);
}
const _parProfondeur=(a,b)=>a.d-b.d;   /* alloué une fois, pas par image */
function videCacheSol(){renderIso._dLvl=null;renderIso._dal=null;}   /* pour les tests */
function nbDalles(){return renderIso._dal?Object.keys(renderIso._dal).length:0;}
function nbDallesPretes(){const c=renderIso._dal;if(!c)return 0;let n=0;for(const k in c)if(c[k]&&c[k].pret)n++;return n;}
function getDalleCount(){return _dalleRendues;}
function _rendreDalleSrc(){return _rendreDalle.toString();}   /* pour les tests */
function srcDalleDessin(){return _dalleDessin.toString();}   /* pour les tests */
function srcCSS(){const e=document.querySelector('style');return (e&&(e.textContent||e.innerHTML))||'';}
/* LE TEXTE DU RENDU ISOMÉTRIQUE, pour les tests qui vérifient la RÈGLE et pas
   seulement son effet — §5 decies au premier chef.

   Rendre `renderIso.toString()` ne suffit plus : la Phase 4 a découpé la
   fonction et son corps ne fait plus que cinq appels. Un test qui ne lirait
   que lui passerait au VERT en ne protégeant plus rien — c'est le défaut
   qu'on s'interdit partout ailleurs dans ce projet. On rend donc toute la
   chaîne. Ajouter une phase ici quand on en ajoute une là-haut. */
function srcRender(){
  return [renderIso,_isoPreparer,_isoSol,_isoEmpilerMurs,_isoEmpilerSorties,
          _isoEmpilerEntites,_isoEmpiler,_isoEstompe,_isoDessinerTri,
          _isoParticule,_isoEffets,_isoBandeaux,_isoSurcouches]
    .map(function(f){return f.toString();}).join('\n');
}
/* renderIso FAISAIT 249 LIGNES.                                    (Phase 4)

   Cinq phases y étaient enchaînées sans séparation : préparer la vue, poser
   le sol, empiler les entités par profondeur, dessiner la pile triée, puis
   les effets et les surcouches. Pour lire la règle d'estompage il fallait
   traverser le brouillard et le tri.

   Et surtout : la règle d'estompage y était écrite DEUX FOIS, une par forme
   de bloc. C'est exactement ce qui a fait que la v9.09 ne l'a corrigée qu'à
   moitié — il y avait une seconde copie, et personne ne l'a vue. Elle est
   maintenant à un seul endroit : `_isoEstompe`. */

/* LA FENÊTRE D'ESTOMPAGE, mesurée en v9.10 (voir §5 decies).
   ISO_TW/2 + ESTOMPE_MARGE_X = 65 : demi-bloc (32) plus demi-sprite utile
   (29), plus la marge d'ancrage. Le seuil de 54 laissait passer les blocs à
   dx = 64 — une largeur de tuile exactement — qui coupaient le héros. */
const ESTOMPE_MARGE_X = 33;
const ESTOMPE_HAUT    = 104;   // jusqu'où le bloc remonte au-dessus de l'ancre
const ESTOMPE_BAS     = 6;     // et jusqu'où il redescend en dessous
const ESTOMPE_AL_MUR  = 0.45;  // bloc plein
const ESTOMPE_AL_TUILE= 0.5;   // tuile de mur d'un tileset

/* LA PILE DE PROFONDEUR — PLUS D'ALLOCATION PAR IMAGE.

   Un tableau neuf de plusieurs milliers d'objets, soixante fois par seconde,
   c'est la cause classique des saccades sur mobile : ce n'est pas la lenteur
   moyenne qui gêne, c'est le ramasse-miettes qui passe. On réutilise le même
   tableau ET les mêmes objets, en ne remettant que leur contenu à jour.

   C'est la seule mutation volontaire du fichier, et elle est mesurée : ne pas
   la « corriger » en croyant bien faire. */
const _isoItems = [];
let _isoNb = 0;
function _isoEmpilerUn(d,k,a,b,c,e){
  let o=_isoItems[_isoNb];
  if(!o)o=_isoItems[_isoNb]={};
  o.d=d;o.k=k;o.X=a;o.Y=b;o.gi=c;o.tx=a;o.ty=b;o.wx=a;o.wy=b;o.fn=e;
  _isoNb++;
}

/* Sommets de grille occupés par une bouche de grotte. Recalculé au
   changement de niveau seulement : c'est appelé des milliers de fois. */
let _isoCavLvl = null, _isoCavSet = null;
function _isoCavSommet(X,Y){
  if(_isoCavLvl!==level.id){
    _isoCavLvl=level.id; _isoCavSet=new Set();
    if(level.caves)for(const c of level.caves){const S=caveSommet(c);_isoCavSet.add(S[0]+':'+S[1]);}
  }
  return _isoCavSet.has(X+':'+Y);
}

/* Ce que toutes les phases ont besoin de savoir sur l'image en cours.
   Un objet par image, contre les milliers d'entités que la pile recycle :
   ce n'est pas le même ordre de grandeur, et la pile, elle, reste recyclée. */
function _isoPreparer(){
  ctx.clearRect(0,0,W,H);
  const fpx=player.x/TS,fpy=player.y/TS;
  isoOX=W/2-(fpx-fpy)*(ISO_TW/2); isoOY=H/2-(fpx+fpy)*(ISO_TH/2)-10;
  const w=level.w,h=level.h;
  const pt=tileAt(player.x,player.y);
  return {
    /* `iso` était une locale de renderIso : toute fonction de dessin sortie de
       cette portée levait « iso is not defined » au premier appel. Elle est
       désormais globale, et les phases s'en servent comme avant. */
    iso:isoPx,
    TH:THEME[level.theme]||THEME.pool,
    w:w, h:h, g:level.grid,
    isVil:level.kind==='village',
    cx0:Math.max(0,pt.tx-32), cx1:Math.min(w-1,pt.tx+32),
    cy0:Math.max(0,pt.ty-32), cy1:Math.min(h-1,pt.ty+32),
    /* Profondeur de référence du héros : sa CASE, pas sa position continue.
       Les blocs de mur se dessinent aux sommets de la grille ; comparer à une
       position continue faisait basculer le tri à chaque demi-case. */
    ptile:pt,
    seuilEstompe:pt.tx+pt.ty+2,
    /* L'ANCRE DE L'ESTOMPAGE N'EST PAS CELLE DU DESSIN.            (v9.09)

       §5 decies avait corrigé la comparaison de PROFONDEUR — on juge sur la
       case, plus sur la position continue — mais avait laissé intacte la
       fenêtre de recouvrement à l'écran, qui se mesurait encore sur `pS`,
       c'est-à-dire sur la position continue du héros.

       Le symptôme survivait donc : mesuré sous GRAINE=2, 1 bloc estompé dans
       la moitié nord, 1 au centre, mais 2 dans la moitié sud — et un
       changement d'opacité sur 21 pas de joystick successifs. Un mur qui
       s'éclaircit d'un coup au milieu d'une case, sans que rien ne le masque.

       `pS` reste l'ancre du DESSIN (voir la caméra) : on ne la touche pas.
       `pE` est l'ancre de l'ESTOMPAGE, calée sur le centre de la case — la
       même que le seuil de profondeur. Les deux moitiés de la règle disent
       enfin vraiment la même chose. */
    pS:isoPx(player.x,player.y),
    pE:isoPx(pt.tx*TS+TS/2, pt.ty*TS+TS/2)
  };
}

/* Le sol, puis le brouillard. Deux chemins : les dalles d'un tileset quand
   il est chargé, la peinture géométrique sinon — le jeu n'est jamais nu. */
function _isoSol(v){
  const iso=v.iso, w=v.w, h=v.h, g=v.g, isVil=v.isVil;
  const cx0=v.cx0, cx1=v.cx1, cy0=v.cy0, cy1=v.cy1;
  const _tsF=TILESETS[level.theme]&&TILESETS[level.theme].floor&&TILESETS[level.theme].floor.complete&&TILESETS[level.theme].floor.naturalWidth;
  if(_tsF&&dessinerSolEnCache(cx0,cy0,cx1,cy1)){
    /* Sol servi depuis le cache de dalles : rien à faire ici. */
  } else if(_tsF){
    const ts=TILESETS[level.theme];
    for(let Y=cy0;Y<=cy1+1;Y++)for(let X=cx0;X<=cx1+1;X++){
      const anyF=_floorish(X-1,Y-1)||_floorish(X,Y-1)||_floorish(X-1,Y)||_floorish(X,Y); if(!anyF)continue;
      const fi=(_matA(X-1,Y-1)?8:0)|(_matA(X,Y-1)?4:0)|(_matA(X-1,Y)?2:0)|(_matA(X,Y)?1:0);
      if(!isVil){const sa=level.seen[idx(w,clamp(X,0,w-1),clamp(Y,0,h-1))],sb=level.seen[idx(w,clamp(X-1,0,w-1),clamp(Y-1,0,h-1))];if(!sa&&!sb)continue;}
      const s=iso(X*TS,Y*TS);ctx.imageSmoothingEnabled=false;
      let tsF=ts.floor;if(level.bossArena&&TILESETS.arena&&TILESETS.arena.floor.complete&&TILESETS.arena.floor.naturalWidth){const ddx=X-level.bossArena.x,ddy=Y-level.bossArena.y;if(ddx*ddx+ddy*ddy<level.bossArena.r*level.bossArena.r)tsF=TILESETS.arena.floor;}
      const RF=_tsRect(tsF,fi);ctx.drawImage(tsF, RF[0],RF[1],RF[2],RF[3], s.x-ISO_TW/2, s.y-ISO_TH/2, ISO_TW, ISO_TH);
    }
  } else {
    for(let ty=cy0;ty<=cy1;ty++)for(let tx=cx0;tx<=cx1;tx++){const i=idx(w,tx,ty),c=g[i];
      if(c===T_WALL)continue; if(!isVil&&!level.seen[i])continue;
      const s=iso((tx+0.5)*TS,(ty+0.5)*TS);drawIsoFloor(s.x,s.y,c,v.TH,tx,ty);}
  }
  if(!isVil)dessinerVoile();
}

/* Les murs : soit les tuiles d'un tileset posées aux SOMMETS de la grille,
   soit les blocs pleins au centre des cases. */
function _isoEmpilerMurs(v){
  const w=v.w, h=v.h, g=v.g, isVil=v.isVil;
  const cx0=v.cx0, cx1=v.cx1, cy0=v.cy0, cy1=v.cy1;
  const _tsDual=TILESETS[level.theme]&&TILESETS[level.theme].wall&&TILESETS[level.theme].wall.complete&&TILESETS[level.theme].wall.naturalWidth;
  if(_tsDual){
    for(let Y=cy0;Y<=cy1+1;Y++)for(let X=cx0;X<=cx1+1;X++){
      const N=_floorish(X-1,Y-1),E=_floorish(X,Y-1),Sc=_floorish(X,Y),Wc=_floorish(X-1,Y);
      const gi=(N?0:8)|(E?0:4)|(Wc?0:2)|(Sc?0:1); if(gi===0||gi===15)continue;
      if(!isVil){const sa=level.seen[idx(w,clamp(X,0,w-1),clamp(Y,0,h-1))],sb=level.seen[idx(w,clamp(X-1,0,w-1),clamp(Y-1,0,h-1))];if(!sa&&!sb)continue;}
      if(level.portalCube&&X===level.portalCube.X&&Y===level.portalCube.Y)continue;
      if(_isoCavSommet(X,Y))continue;   // la grotte prend la place du bloc de mur
      _isoEmpilerUn(X+Y,'edge',X,Y,gi);}
  } else {
    for(let ty=cy0;ty<=cy1;ty++)for(let tx=cx0;tx<=cx1;tx++){const i=idx(w,tx,ty);
      if(g[i]!==T_WALL)continue; if(!isVil&&!level.seen[i])continue;
      _isoEmpilerUn((tx+0.5)+(ty+0.5),'w',tx,ty);}
  }
}

/* Les sorties : escalier, porte d'acte, et le panneau de l'allée. */
function _isoEmpilerSorties(v, ent){
  const w=v.w, g=v.g, isVil=v.isVil;
  // marqueurs de sortie : escalier (grotte) et porte d'acte — sinon invisibles sous les tuiles
  for(let ty=v.cy0;ty<=v.cy1;ty++)for(let tx=v.cx0;tx<=v.cx1;tx++){const cc=g[idx(w,tx,ty)];
    if(cc!==T_STAIR&&cc!==T_GATE)continue; if(!isVil&&!level.seen[idx(w,tx,ty)])continue;
    const wx=tx*TS+TS/2,wy=ty*TS+TS/2,isStair=(cc===T_STAIR);
    ent(wx,wy,()=>drawExitMark(wx-cam.x,wy-cam.y,isStair));}
  // panneau à l'embouchure de l'allée : on voit la sortie depuis la place centrale
  if(!level.alley)return;
  const A=level.alley,wx=(A.x0+A.x1+1)/2*TS,wy=(A.y0-0.2)*TS;
  ent(wx,wy,()=>{const sx=wx-cam.x,sy=wy-cam.y,p=0.6+0.4*Math.sin(performance.now()/520);
    ctx.save();ctx.textAlign='center';
    ctx.fillStyle='rgba(10,14,26,'+(0.55+0.15*p)+')';
    ctx.strokeStyle='rgba(244,211,94,'+(0.5+0.3*p)+')';ctx.lineWidth=1.5;
    const tw=132,th=20;
    ctx.beginPath();ctx.rect(sx-tw/2,sy-52,tw,th);ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(244,211,94,0.95)';ctx.font='bold 12px Trebuchet MS';
    /* Le panneau annonçait ACTS[0] EN DUR : il indiquait la Piscine même à
       l'acte 3. Il suit maintenant l'acte vers lequel la porte ouvre — la
       même source que la porte elle-même, donc les deux ne peuvent plus
       diverger. */
    ctx.fillText('Direction '+nomActeCourant(),sx,sy-38);
    ctx.fillStyle='rgba(244,211,94,'+(0.45+0.45*p)+')';ctx.font='bold 16px Trebuchet MS';
    ctx.fillText('▼',sx,sy-20+2*p);
    ctx.textAlign='left';ctx.restore();});
}

/* Tout ce qui vit sur le sol : coffres, grottes, sac de mort, autels, décor,
   tonneaux, PNJ, butin, orbes, ennemis. */
function _isoEmpilerEntites(v, seenOK, ent){
  if(level.chests)for(const ch of level.chests)if(seenOK(ch.x,ch.y))ent(ch.x,ch.y,()=>drawChest(ch));
  /* Profondeur EXACTE du bloc de mur remplacé : X+Y du sommet, comme les
     tuiles 'edge'. La profondeur calculée depuis le centre de la case d'entrée
     décalait la grotte d'un demi-pas dans le tri. */
  if(level.caves)for(const c of level.caves){const wx=c.tx*TS+TS/2,wy=c.ty*TS+TS/2;
    if(!seenOK(wx,wy))continue;
    const S=caveSommet(c);
    _isoEmpilerUn(S[0]+S[1],'e',wx,wy,0,()=>drawCaveEntrance(c));}
  _isoEmpilerSorties(v, ent);
  {const _sac=(typeof sacIci==='function')?sacIci():null;
   if(_sac)ent(_sac.x,_sac.y,()=>drawSacMort(_sac));}
  if(level.shrines)for(const sh of level.shrines)if(seenOK(sh.x,sh.y))ent(sh.x,sh.y,()=>drawShrine(sh));
  if(level.props)for(const pr of level.props)if(seenOK(pr.x,pr.y))ent(pr.x,pr.y,()=>drawProp(pr));
  if(level.breakables)for(const b of level.breakables)if(seenOK(b.x,b.y))ent(b.x,b.y,()=>drawBreakable(b));
  if(level.npcs)for(const npc of level.npcs){const wx=npc.vert?npc.tx*TS:npc.tx*TS+TS/2,wy=npc.vert?npc.ty*TS:npc.ty*TS+TS/2;ent(wx,wy,()=>drawNpc(npc));}
  for(const d of level.drops)ent(d.x,d.y,()=>drawDrop(d));
  if(level.orbes)for(const o of level.orbes)ent(o.x,o.y,()=>dessinerOrbeSol(o));
  for(const en of level.enemies)if(en._visible){
    /* PREMIÈRE RENCONTRE D'UN GARDIEN. On la déclenche au moment où il
       entre dans le champ, pas à sa mort : c'est l'apparition qui vaut
       une scène. Le registre `scenesVues` garantit l'unicité. */
    if(en.boss&&!en.arenaBoss&&level.kind==='act'&&typeof jouerScene==='function')
      jouerScene(en.finalBoss?'gardienFinal':('gardien'+(level.actNum||0)));
    ent(en.x,en.y,()=>drawEnemy(en));
  }
}

/* Remplit la pile et la rend triée par profondeur. */
function _isoEmpiler(v){
  _isoNb=0;
  _isoEmpilerMurs(v);
  const w=v.w, isVil=v.isVil;
  const seenOK=(wx,wy)=>{if(isVil)return true;const t=tileAt(wx,wy);return level.seen[idx(w,t.tx,t.ty)]===1;};
  const ent=(wx,wy,fn)=>_isoEmpilerUn(wx/TS+wy/TS,'e',wx,wy,0,fn);
  _isoEmpilerEntites(v, seenOK, ent);
  /* ================================================================
     PROFONDEUR DU HÉROS — pourquoi il était « à moitié dans le mur »

     Le héros était trié sur sa position CONTINUE (fpx+fpy). Les blocs de mur,
     eux, sont aux SOMMETS de la grille : ceux qui flanquent sa case ont
     d = tx+ty+1. Dans la moitié SUD de sa case, il passait devant eux ;
     dans la moitié NORD, derrière — et ils le recouvraient.
     Au clic, l'A* marche de centre à centre et le cas ne se produisait
     presque jamais. Au joystick, à chaque pas.

     Mesuré sur la planche : le personnage occupe 58 x 60 px et pose 42 px
     au sol, alors que son corps de collision n'en fait que 32. Il déborde
     donc de 5 px de chaque côté — c'est assez pour que ces blocs latéraux
     le mordent visuellement.

     On le trie sur sa CASE, entre les blocs latéraux (+1) et le bloc sud
     (+2), qui est le seul à devoir le masquer — et c'est aussi le seul
     qu'on estompe. Les deux règles disent enfin la même chose.
     ================================================================ */
  _isoEmpilerUn(v.ptile.tx+v.ptile.ty+1.5,'p',0,0,0,null);
  /* On ne trie que la portion remplie. `sort` sur le tableau entier
     comparerait aussi les objets recyclés de l'image précédente. */
  const rendu=_isoItems.length===_isoNb?_isoItems:_isoItems.slice(0,_isoNb);
  rendu.sort(_parProfondeur);
  return rendu;
}

/* ================================================================
   QUELS BLOCS PEUVENT ÊTRE ESTOMPÉS — LA RÈGLE, À UN SEUL ENDROIT

   Le test était « it.d > playerD », avec playerD = position CONTINUE du
   héros. Or les blocs se dessinent aux SOMMETS de la grille : ceux qui
   flanquent la case du héros — son coin est et son coin ouest — ont
   d = tx+ty+1. Dès que le héros se tenait dans la moitié nord de sa case,
   playerD passait sous tx+ty+1 et ces deux blocs-là devenaient
   transparents. Ils ne le cachent pourtant en rien : ils sont à sa
   gauche et à sa droite, à la même hauteur.
   Résultat : deux blocs fantômes de part et d'autre du héros, qui
   clignotaient au moindre pas, et un héros qui semblait délavé dans le mur.

   Seul un bloc situé au moins DEUX rangs devant la case du héros peut le
   masquer : le coin sud de sa case, d = tx+ty+2. On compare donc à la
   profondeur de la CASE, pas à la position continue — stable, sans
   clignotement, et les blocs nord-est et nord-ouest ne sont plus touchés.

   (`playerD` n'existe plus : la variable était calculée et jamais lue,
   seule sa mention dans ce commentaire l'avait maintenue en vie.)
   ================================================================ */
function _isoEstompe(v, s, d, hautBloc, opacite){
  if(d<v.seuilEstompe)return 1;
  const pE=v.pE;
  const dx=Math.abs(s.x-pE.x), top=s.y-hautBloc, bot=s.y+ISO_TH/2;
  return (dx<ISO_TW/2+ESTOMPE_MARGE_X && bot>pE.y-ESTOMPE_HAUT && top<pE.y+ESTOMPE_BAS)
    ? opacite : 1;
}

/* Dessine la pile triée. La caméra est déplacée entité par entité, puis
   remise où elle était : les fonctions de dessin lisent `cam`. */
function _isoDessinerTri(v, rendu){
  const iso=v.iso, pS=v.pS, scx=cam.x, scy=cam.y;
  for(const it of rendu){
    if(it.k==='w'){
      const s=iso((it.tx+0.5)*TS,(it.ty+0.5)*TS);
      const al=_isoEstompe(v,s,it.d,ISO_WH+ISO_TH/2,ESTOMPE_AL_MUR);
      drawIsoWall(s.x,s.y,v.TH,al,it.tx,it.ty);
    } else if(it.k==='edge'){
      const s=iso(it.X*TS,it.Y*TS);
      const al=_isoEstompe(v,s,it.d,ISO_TW*0.75,ESTOMPE_AL_TUILE);
      const ts=TILESETS[level.theme];ctx.save();ctx.globalAlpha=al;ctx.imageSmoothingEnabled=false;
      const RW=_tsRect(ts.wall,it.gi);ctx.drawImage(ts.wall, RW[0],RW[1],RW[2],RW[3], s.x-ISO_TW/2, s.y-ISO_TW*0.75, ISO_TW, ISO_TW);
      ctx.restore();
    } else if(it.k==='p'){
      cam.x=player.x-pS.x;cam.y=player.y-pS.y;drawPlayer();
    } else {
      const s=iso(it.wx,it.wy);cam.x=it.wx-s.x;cam.y=it.wy-s.y;it.fn();
    }
  }
  cam.x=scx;cam.y=scy;
}

/* Une particule : quatre formes, la même enveloppe d'opacité et de taille. */
function _isoParticule(v, q){
  const s=v.iso(q.x,q.y),k=clamp(1-q.t/q.life,0,1);
  ctx.globalAlpha=q.fade===0?1:k;ctx.fillStyle=q.col;
  const r=(q.r||2)*(q.fade===0?1:(0.55+0.45*k));   // les particules maigrissent
  if(q.forme==='eclat'){
    ctx.save();ctx.translate(s.x,s.y);ctx.rotate(q.a||0);
    ctx.fillRect(-r*2.2,-r*0.42,r*4.4,r*0.84);ctx.restore();
  } else if(q.forme==='rond'){
    ctx.beginPath();ctx.arc(s.x,s.y,r,0,6.28);ctx.fill();
  } else if(q.forme==='glace'){
    ctx.save();ctx.translate(s.x,s.y);ctx.rotate(q.a||0);
    ctx.beginPath();ctx.moveTo(0,-r*1.7);ctx.lineTo(r*0.85,0);ctx.lineTo(0,r*1.7);ctx.lineTo(-r*0.85,0);
    ctx.closePath();ctx.fill();ctx.restore();
  } else {
    ctx.save();ctx.translate(s.x,s.y);if(q.rot)ctx.rotate(q.a||0);
    ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();
  }
  ctx.globalAlpha=1;
}

/* Ce qui flotte au-dessus du monde, dans le repère du monde. */
function _isoEffets(v){
  if(typeof drawFlecheQuete==='function')drawFlecheQuete();
  dessinerFantomes();
  for(const p of projectiles)dessinerProjectile(p);
  for(const q of particles)_isoParticule(v,q);
  ctx.textAlign='center';
  for(const f of floaters){const s=v.iso(f.x,f.y);ctx.globalAlpha=clamp(1-f.t/f.life,0,1);ctx.fillStyle=f.col;ctx.font='bold '+(f.big?17:15)+'px Trebuchet MS';ctx.fillText(f.txt,s.x,s.y);ctx.globalAlpha=1;}
  ctx.textAlign='left';
}

/* Le bandeau de gardien et la bulle de bonus : deux textes centrés en haut. */
function _isoBandeaux(){
  if(level.boss&&level.enemies.indexOf(level.boss)>=0&&level.boss.aggro)drawBossBar();
  if(player.buffT>0){ctx.fillStyle=player.buffType==='power'?'#ff7a5a':'#7fd0ff';ctx.font='bold 13px Trebuchet MS';ctx.textAlign='center';ctx.fillText((player.buffType==='power'?'⚔ Puissance ':'➤ Célérité ')+Math.ceil(player.buffT)+'s',W/2,86);ctx.textAlign='left';}
  if(banner.t>0){let al=1;if(banner.t>2.4)al=(2.8-banner.t)/0.4;else if(banner.t<0.6)al=banner.t/0.6;
    ctx.globalAlpha=clamp(al,0,1);ctx.textAlign='center';ctx.fillStyle='#05070d';ctx.fillRect(0,H*0.30,W,72);
    ctx.fillStyle='#e8ecf6';ctx.font='bold 30px Trebuchet MS';ctx.fillText(banner.text,W/2,H*0.34+8);
    if(banner.sub){ctx.fillStyle='#f4d35e';ctx.font='15px Trebuchet MS';ctx.fillText(banner.sub,W/2,H*0.34+34);}
    ctx.textAlign='left';ctx.globalAlpha=1;}
}

/* L'interface dessinée sur le canvas, dans le repère de l'ÉCRAN.
   Le rappel « V : vue » était ici, en bas à gauche, donc sous l'orbe de vie.
   Aucune position n'y est sûre : la barre d'XP se recentre selon la largeur.
   Il vit désormais dans la ligne de rappels HTML, avec les autres touches. */
function _isoSurcouches(){
  _isoBandeaux();
  if(level&&level.arena)drawArenaHud();
  drawZones();
  drawMarqueurCible();
  if(level&&level.relic)drawRelic();
  drawVisee();
  drawArenaBanner();
  drawJoystick();
  drawMinimap();
}

function renderIso(){
  const v=_isoPreparer();
  _isoSol(v);
  _isoDessinerTri(v, _isoEmpiler(v));
  _isoEffets(v);
  _isoSurcouches();
}

function render(){
  /* Le jeu est isométrique, sans alternative : la vue de dessus a été retirée. */
  ctx.clearRect(0,0,W,H);
  if(!level)return;
  /* Le tremblement s'applique UNE seule fois, autour de tout le rendu du monde.
     Le HUD est en HTML, il n'est donc pas secoué — ce qui est voulu. */
  const sk=SECOUSSE.t>0?SECOUSSE.amp*(SECOUSSE.t/0.35):0;
  if(sk>0.2){
    const dx=rand(-sk,sk),dy=rand(-sk,sk);
    ctx.save();ctx.translate(dx,dy);renderIso();ctx.restore();
  } else renderIso();
}

function drawTiles(){
  setCurTP(THEMEPAT[level.theme]||null);
  if(curTP&&typeof DOMMatrix!=='undefined'){
    if(curTP.floor&&curTP.floor.setTransform)curTP.floor.setTransform(new DOMMatrix().translate(-cam.x,-cam.y));
    if(curTP.wall&&curTP.wall.setTransform)curTP.wall.setTransform(new DOMMatrix().translate(-cam.x,-cam.y));}
  const x0=Math.max(0,Math.floor(cam.x/TS)),y0=Math.max(0,Math.floor(cam.y/TS));
  const x1=Math.min(level.w-1,Math.ceil((cam.x+W)/TS)),y1=Math.min(level.h-1,Math.ceil((cam.y+H)/TS));
  const pt=tileAt(player.x,player.y);const Rv=7;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const i=idx(level.w,x,y);const seen=level.seen[i];
    const sx=x*TS-cam.x,sy=y*TS-cam.y;
    if(!seen){ctx.fillStyle='#04060b';ctx.fillRect(sx,sy,TS,TS);continue;}
    const vis=((x-pt.tx)**2+(y-pt.ty)**2)<=Rv*Rv;
    const c=level.grid[i];
    drawTile(sx,sy,c,x,y,level.kind,level.theme);
    if(!vis){ctx.fillStyle='rgba(4,6,11,0.55)';ctx.fillRect(sx,sy,TS,TS);}
  }
}
function drawTile(sx,sy,c,gx,gy,kind,theme){
  const TH=THEME[theme];
  if(c===T_WALL){
    const gr=level.grid,lw=level.w,lh=level.h;
    const wk=(xx,yy)=>xx>=0&&yy>=0&&xx<lw&&yy<lh&&walkableCode(gr[idx(lw,xx,yy)]);
    const fU=wk(gx,gy-1),fD=wk(gx,gy+1),fL=wk(gx-1,gy),fR=wk(gx+1,gy);
    const anyF=fU||fD||fL||fR||wk(gx-1,gy-1)||wk(gx+1,gy-1)||wk(gx-1,gy+1)||wk(gx+1,gy+1);
    if(!anyF){ctx.fillStyle='#03040a';ctx.fillRect(sx,sy,TS,TS);}
    else{
      const top=TH?TH.wall[0]:(kind==='cave'?'#26221a':'#222838');
      const side=TH?TH.wall[1]:(kind==='cave'?'#1a1712':'#171b26');
      ctx.fillStyle='#03040a';ctx.fillRect(sx,sy,TS,TS);
      if(curTP&&curTP.wall)ctx.fillStyle=curTP.wall;else ctx.fillStyle=top;ctx.fillRect(sx,sy,TS,TS);
      if(fD){const hb=Math.round(TS*0.5);ctx.fillStyle=(curTP&&curTP.wall)?'rgba(0,0,0,0.42)':side;ctx.fillRect(sx,sy+TS-hb,TS,hb);ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(sx,sy+TS-hb,TS,2);}
      if(fU){ctx.fillStyle='rgba(255,255,255,0.13)';ctx.fillRect(sx,sy,TS,3);}
      if(fL){ctx.fillStyle='rgba(0,0,0,0.18)';ctx.fillRect(sx,sy,3,TS);}
      if(fR){ctx.fillStyle='rgba(255,255,255,0.06)';ctx.fillRect(sx+TS-3,sy,3,TS);}
      ctx.strokeStyle='rgba(0,0,0,0.35)';ctx.strokeRect(sx+0.5,sy+0.5,TS-1,TS-1);
    }
  } else if(c===T_CHASM){
    ctx.fillStyle='#02030a';ctx.fillRect(sx,sy,TS,TS);
    const g=ctx.createLinearGradient(sx,sy,sx,sy+TS);
    g.addColorStop(0,'rgba(20,50,120,0.05)');g.addColorStop(1,'rgba(60,140,255,0.28)');
    ctx.fillStyle=g;ctx.fillRect(sx,sy,TS,TS);
    ctx.strokeStyle='rgba(70,130,220,0.25)';ctx.strokeRect(sx+0.5,sy+0.5,TS-1,TS-1);
  } else if(c===T_CAVE){
    if(curTP&&curTP.floor){ctx.fillStyle=curTP.floor;ctx.fillRect(sx,sy,TS,TS);}else{ctx.fillStyle='#0b0f18';ctx.fillRect(sx,sy,TS,TS);}
  } else if(c===T_STAIR){
    ctx.fillStyle='#0b0f18';ctx.fillRect(sx,sy,TS,TS);
    ctx.fillStyle='#2a3350';for(let k=0;k<4;k++)ctx.fillRect(sx+6,sy+8+k*7,TS-12-k*4,4);
    ctx.font='16px serif';ctx.textAlign='center';ctx.fillStyle='#f4d35e';ctx.fillText('⬆',sx+TS/2,sy+TS-6);ctx.textAlign='left';
  } else if(c===T_GATE){
    ctx.fillStyle=kind==='village'?'#141a10':'#0b0e15';ctx.fillRect(sx,sy,TS,TS);
    ctx.fillStyle='#3a2a14';ctx.fillRect(sx+5,sy+4,6,TS-8);ctx.fillRect(sx+TS-11,sy+4,6,TS-8);
    ctx.fillStyle='#5a4020';ctx.fillRect(sx+5,sy+4,TS-10,6);
    const gl=0.4+0.25*Math.sin(performance.now()/300);
    ctx.fillStyle='rgba(94,200,255,'+gl+')';ctx.fillRect(sx+11,sy+10,TS-22,TS-14);
    ctx.font='16px serif';ctx.textAlign='center';ctx.fillStyle='#e8ecf6';ctx.fillText(kind==='village'?'⚔':'🏰',sx+TS/2,sy+TS/2+6);ctx.textAlign='left';
  } else { // floor
    if(curTP&&curTP.floor){ctx.fillStyle=curTP.floor;ctx.fillRect(sx,sy,TS,TS);}
    else{const alt=((gx+gy)%2===0);
    ctx.fillStyle=TH?(alt?TH.floor[0]:TH.floor[1]):(kind==='cave'?(alt?'#141109':'#100d08'):(alt?'#0e1119':'#0b0e15'));
    ctx.fillRect(sx,sy,TS,TS);
    ctx.strokeStyle='rgba(40,60,100,0.08)';ctx.strokeRect(sx+0.5,sy+0.5,TS-1,TS-1);}
  }
}



