











/* ================================================================
   CIBLAGE AUTOMATIQUE
   Sans lui, aucun schéma tactile ne tient : on ne peut pas viser au
   pouce dans un jeu d'action. Le principe est de choisir l'ennemi
   que le joueur VOUDRAIT viser, pas simplement le plus proche.
   ================================================================ */
const CIBLE_PORTEE=340;          // au-delà, on ne cible pas
let _cibleAuto=null, _cibleT=0;

function scoreCible(en){
  const d=dist(player.x,player.y,en.x,en.y);
  if(d>CIBLE_PORTEE)return -1;
  if(en.dying||en.hp<=0)return -1;
  if(!en._visible)return -1;
  let s=1000-d;                                    // le plus proche d'abord
  // devant soi plutôt que derrière : on suit l'intention du joueur
  const aEn=Math.atan2(en.y-player.y,en.x-player.x);
  const aJ=(player.angMonde==null)?aEn:player.angMonde;
  const dA=Math.abs(((aEn-aJ)+Math.PI*3)%(Math.PI*2)-Math.PI);
  s-=dA*70;                                        // 0 devant, jusqu'à -220 dans le dos
  if(en.boss)s+=420;                               // un boss prime sur ses sbires
  else if(en.elite)s+=180;
  if(en.hp<en.hpMax*0.3)s+=140;                    // achever un blessé
  if(en.aggro)s+=90;                               // celui qui nous attaque déjà
  if(player.attackTarget===en)s+=260;              // stabilité : on ne saute pas de cible
  return s;
}
function trouverCible(){
  if(!level||!level.enemies)return null;
  let best=null,bs=-1;
  for(const en of level.enemies){
    const s=scoreCible(en);
    if(s>bs){bs=s;best=en;}
  }
  return bs>0?best:null;
}
/* Recalcul throttlé : inutile de rescanner à chaque image. */
function majCibleAuto(dt){
  if(!OPT.cibleAuto){_cibleAuto=null;return;}
  _cibleT-=dt;
  if(_cibleAuto&&(_cibleAuto.dying||_cibleAuto.hp<=0||
      dist(player.x,player.y,_cibleAuto.x,_cibleAuto.y)>CIBLE_PORTEE*1.15))_cibleAuto=null;
  if(_cibleT<=0||!_cibleAuto){_cibleT=0.18;_cibleAuto=trouverCible();}
}
/* Point visé par un sort : la cible automatique si elle existe, sinon le curseur. */
function pointVise(){
  if(OPT.cibleAuto&&_cibleAuto)return{x:_cibleAuto.x,y:_cibleAuto.y,cible:_cibleAuto};
  const m=mouseWorld();
  return{x:m.x,y:m.y,cible:null};
}
/* --- marqueur au sol sous la cible --- */
function drawMarqueurCible(){
  if(!OPT.marqueur||!_cibleAuto||!level)return;
  const en=_cibleAuto;
  if(en.dying||en.hp<=0)return;
  const fx=en.x/TS,fy=en.y/TS;
  const sx=(fx-fy)*(ISO_TW/2)+isoOX, sy=(fx+fy)*(ISO_TH/2)+isoOY;
  const t=performance.now()/1000, p=0.5+0.5*Math.sin(t*4.2);
  const rx=en.r*1.25, ry=en.r*0.62;
  ctx.save();
  ctx.strokeStyle='rgba(255,120,60,'+(0.55+0.35*p)+')';
  ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(sx,sy,rx,ry,0,0,6.28);ctx.stroke();
  // quatre arcs d'angle, façon réticule
  ctx.beginPath();
  for(const a0 of [-0.55,Math.PI-0.55,Math.PI/2-0.55,-Math.PI/2-0.55]){
    ctx.ellipse(sx,sy,rx*1.22,ry*1.22,0,a0,a0+1.1);
  }
  ctx.stroke();
  ctx.fillStyle='rgba(255,120,60,'+(0.14+0.10*p)+')';
  ctx.beginPath();ctx.ellipse(sx,sy,rx*0.9,ry*0.9,0,0,6.28);ctx.fill();
  ctx.restore();
}

/* --- Attaque de base : bouton dédié + option automatique --- */
let _atkAutoCd=0;
/* Équivalent du clic gauche : on frappe s'il y a un ennemi, sinon on active
   ce qui est à portée — PNJ, balise, coffre, sanctuaire, tonneau, objet au sol. */
function interactifProche(){
  if(!level)return null;
  const R=TS*2.6; let best=null,bd=1e9;
  const test=(x,y)=>{const d=dist(player.x,player.y,x,y); if(d<R&&d<bd){bd=d;best={x:x,y:y};}};
  if(level.npcs)for(const n of level.npcs)test(n.tx*TS+TS/2,n.ty*TS+TS/2);
  if(level.chests)for(const c of level.chests)if(!c.opened)test(c.x,c.y);
  if(level.shrines)for(const s of level.shrines)if(!s.used)test(s.x,s.y);
  if(level.breakables)for(const b of level.breakables)if(!b.broken)test(b.x,b.y);
  if(level.drops)for(const d of level.drops)test(d.x,d.y);
  if(level.relic&&!level.relic.destroyed)test(level.relic.x,level.relic.y);
  return best;
}
function attaqueCible(){
  const c=(OPT.cibleAuto&&_cibleAuto)?_cibleAuto:null;
  if(c){ player.attackTarget=c; player.path=null;
         faceAngle(Math.atan2(c.y-player.y,c.x-player.x)); return true; }
  const p=interactifProche();
  if(p){ onClick(p.x,p.y); return true; }
  /* Plus rien à frapper ni à activer.
     Avant : onClick(mouseWorld()). Or `mouse` n'est mis à jour que par un
     toucher SUR LE CANEVAS — le bouton d'attaque est une surface HTML, il
     n'y touche pas. Le héros partait donc vers le dernier point touché,
     souvent en bas à droite de l'écran, c'est-à-dire plein SUD-EST en
     isométrique. D'où la ruée de trois ou quatre cases sans raison.
     On frappe sur place, on ne se déplace plus. */
  frapperSurPlace();
  return false;
}
/* Coup dans le vide, dans la direction où le héros regarde. Touche les
   ennemis ET les objets destructibles à portée d'arme. */
function frapperSurPlace(){
  const st=P();
  player.path=null;
  playOnce('Attack1'); player.swing=0.18;
  if(SFX&&SFX.slap)SFX.slap();
  const a=(player.angMonde==null?0:player.angMonde);   // déjà tenu à jour par faceAngle
  const portee=player.r+34;
  const cx=player.x+Math.cos(a)*portee*0.6, cy=player.y+Math.sin(a)*portee*0.6;
  const dmg=randi(st.dmgMin,st.dmgMax);
  let touche=0;
  if(level&&level.enemies)for(const en of level.enemies){
    if(en.dying)continue;
    if(dist(cx,cy,en.x,en.y)<en.r+portee*0.7){hitEnemy(en,dmg,'phys');touche++;}
  }
  casserAutour(cx,cy,portee*0.8);
  return touche;
}
function majAttaqueAuto(dt){
  if(!OPT.attaqueAuto||player.dying)return;
  _atkAutoCd-=dt; if(_atkAutoCd>0)return;
  _atkAutoCd=0.25;
  // on n'interrompt jamais un ordre en cours : l'automatique complète, il ne commande pas
  if(player.attackTarget&&!player.attackTarget.dying)return;
  const c=_cibleAuto;
  if(!c||c.dying)return;
  const st=P();
  if(dist(player.x,player.y,c.x,c.y)<=c.r+player.r+8){ player.attackTarget=c; player.path=null; }
}
function majBoutonAttaque(){
  const b=document.getElementById('atkBtn'); if(!b)return;
  const actif=IS_TOUCH;
  b.classList.toggle('on',actif);
  if(!actif)return;
  b.classList.toggle('auto',!!OPT.attaqueAuto);
  if(!b._lie){ b._lie=1;
    b.addEventListener('touchstart',e=>{e.preventDefault();vibrer(VIB.toucher);attaqueCible();},{passive:false});
    b.onclick=()=>{vibrer(VIB.toucher);attaqueCible();};
  }
}

/* ================================================================
   JOYSTICK FLOTTANT + ZONES TACTILES SÉPARÉES
   Moitié gauche : déplacement uniquement. Moitié droite : actions.
   Le joystick naît sous le pouce plutôt qu'à une place fixe, pour
   ne pas obliger à viser un cercle avant de pouvoir bouger.
   ================================================================ */
const JOY_R=52;            // rayon de la course
const JOY_MORT=0.16;       // zone morte, en fraction du rayon
const joy={actif:false,id:null,ox:0,oy:0,x:0,y:0,dx:0,dy:0,force:0};

function joyZoneGauche(px){ return px < W*0.5; }

function joyDebut(t){
  joy.actif=true; joy.id=t.identifier;
  joy.ox=joy.x=t.px; joy.oy=joy.y=t.py;
  joy.dx=joy.dy=0; joy.force=0;
  vibrer(VIB.toucher);
}
function joyBouge(t){
  joy.x=t.px; joy.y=t.py;
  let dx=joy.x-joy.ox, dy=joy.y-joy.oy;
  const d=Math.hypot(dx,dy);
  if(d>JOY_R){ dx=dx/d*JOY_R; dy=dy/d*JOY_R; }
  // le centre suit le pouce s'il s'éloigne : on ne perd jamais le contrôle
  if(d>JOY_R){ joy.ox=joy.x-dx; joy.oy=joy.y-dy; }
  joy.dx=dx/JOY_R; joy.dy=dy/JOY_R;
  joy.force=Math.min(1,Math.hypot(joy.dx,joy.dy));
}
function joyFin(){ joy.actif=false; joy.id=null; joy.dx=joy.dy=0; joy.force=0; }

/* Déplacement continu : l'écran est isométrique, une poussée vers le haut
   doit envoyer le héros vers le haut de l'ÉCRAN, pas vers le nord du monde. */
function joyDeplacer(dt){
  /* Ancré : on tourne sur place. Le joystick vise encore, il ne déplace plus. */
  if((player.ancre||0)>0)return false;
  if(!OPT.joystick||!joy.actif||joy.force<JOY_MORT){return false;}
  const st=P();
  // inversion iso : (dx,dy) écran -> direction monde
  const a=2*joy.dx/ISO_TW, b=2*joy.dy/ISO_TH;
  let wx=(a+b)/2, wy=(b-a)/2;
  const n=Math.hypot(wx,wy); if(n<1e-6)return false;
  wx/=n; wy/=n;
  /* ANOMALIE DE TERRAIN : elle agit sur la VITESSE, jamais sur la collision.
     Toucher à l'inertie ou au corps du héros remettrait en cause la règle des
     cinq points de pose, qui a coûté cher à stabiliser. La Glace vive fait glisser
     plus vite, les éboulis freinent — et rien d'autre ne change. */
  const _an=(typeof anomalieEn==='function')?anomalieEn(level,player.x,player.y):null;
  const v=st.moveSpeed*(_an?_an.spd:1)*60*dt*Math.min(1,joy.force);
  const nx=player.x+wx*v, ny=player.y+wy*v;
  /* Axe par axe : longer un mur reste possible, on ne bloque que la composante
     qui rentre dedans. Le rayon est réduit de 2 px pour que passer une porte
     d'une seule case reste confortable. */
  const R=R_MARCHE;
  if(corpsLibre(level,nx,player.y,R))player.x=nx;
  else if(corpsLibre(level,nx,player.y,Math.max(4,player.r-2)))player.x=nx;   // passage étroit
  if(corpsLibre(level,player.x,ny,R))player.y=ny;
  else if(corpsLibre(level,player.x,ny,Math.max(4,player.r-2)))player.y=ny;
  player.path=null;                       // le joystick prime sur le déplacement automatique
  /* On ne lâche la cible que si elle est HORS de portée : sinon tenir le pouce
     annulait la frappe à chaque image, et le bouton d'attaque restait sans effet. */
  if(player.attackTarget){
    const c=player.attackTarget;
    const port=c.r+player.r+6+((OPT&&OPT.cibleAuto)?14:0);
    if(dist(player.x,player.y,c.x,c.y)>port)player.attackTarget=null;
  }
  faceAngle(Math.atan2(wy,wx));
  /* updateAnim se fie à ce drapeau pour choisir « move » ou « Idle ».
     Sans lui, l'animation de marche était écrasée par Idle à chaque image. */
  player._moved=true;
  return true;
}
function drawJoystick(){
  if(!OPT.joystick||!joy.actif)return;
  ctx.save();
  ctx.globalAlpha=0.30;
  ctx.fillStyle='#0b1020'; ctx.strokeStyle='#5ec8ff'; ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(joy.ox,joy.oy,JOY_R,0,6.28);ctx.fill();ctx.stroke();
  ctx.globalAlpha=0.72;
  ctx.fillStyle='#2a3350'; ctx.strokeStyle='#9fd8ff';
  const hx=joy.ox+joy.dx*JOY_R, hy=joy.oy+joy.dy*JOY_R;
  ctx.beginPath();ctx.arc(hx,hy,JOY_R*0.42,0,6.28);ctx.fill();ctx.stroke();
  ctx.restore();
}



