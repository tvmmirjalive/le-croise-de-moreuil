






























/* ================================================================
   MAINTIEN POUR VISER
   Garder le doigt sur un emplacement de sort ouvre un indicateur au
   sol : on oriente en glissant, on lance en relâchant. Un appui bref
   reste un lancer immédiat vers la cible automatique.
   ================================================================ */
const VISE_SEUIL=0.24;         // secondes de maintien avant de basculer en visée
const VISE_PORTEE=230;         // longueur de l'indicateur, en pixels monde
const vise={actif:false,sort:null,ang:0,t:0,id:null};

function viseDebut(sort,id){
  vise.sort=sort; vise.id=id; vise.t=0; vise.actif=false;
}
/* Le seuil est compté dans la boucle de jeu, pas par un minuteur : ainsi il
   se fige avec la pause, et reste testable image par image. */
function majVisee(dt){
  if(!vise.sort||vise.actif)return;
  vise.t+=dt;
  if(vise.t>=VISE_SEUIL){
    vise.actif=true;
    vise.ang=(player.angMonde==null)?0:player.angMonde;
    vibrer(VIB.toucher);
  }
}
function viseOriente(px,py){
  if(!vise.actif)return;
  // direction ÉCRAN du doigt par rapport au héros, convertie en direction MONDE
  const fx=player.x/TS,fy=player.y/TS;
  const hx=(fx-fy)*(ISO_TW/2)+isoOX, hy=(fx+fy)*(ISO_TH/2)+isoOY;
  const ex=px-hx, ey=py-hy;
  if(Math.hypot(ex,ey)<8)return;
  const a=2*ex/ISO_TW, b=2*ey/ISO_TH;
  vise.ang=Math.atan2((b-a)/2,(a+b)/2);
}
function viseFin(){
  const s=vise.sort, actif=vise.actif;
  vise.sort=null; vise.actif=false; vise.id=null;
  if(!s)return false;
  if(actif){
    const wx=player.x+Math.cos(vise.ang)*VISE_PORTEE;
    const wy=player.y+Math.sin(vise.ang)*VISE_PORTEE;
    setActiveSkill(s); faceAngle(vise.ang);
    trySkill(s,wx,wy);
    return true;                      // visé : on ne relance pas en appui bref
  }
  return false;                       // appui bref : l'appelant lance normalement
}
function drawVisee(){
  if(!vise.actif||!vise.sort)return;
  const fx=player.x/TS,fy=player.y/TS;
  const hx=(fx-fy)*(ISO_TW/2)+isoOX, hy=(fx+fy)*(ISO_TH/2)+isoOY;
  const wx=player.x+Math.cos(vise.ang)*VISE_PORTEE;
  const wy=player.y+Math.sin(vise.ang)*VISE_PORTEE;
  const gx=wx/TS,gy=wy/TS;
  const bx=(gx-gy)*(ISO_TW/2)+isoOX, by=(gx+gy)*(ISO_TH/2)+isoOY;
  const t=performance.now()/1000, p=0.6+0.4*Math.sin(t*6);
  ctx.save();
  // fuseau du sol, du héros vers la cible
  ctx.strokeStyle='rgba(94,200,255,'+(0.45+0.35*p)+')'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(hx,hy); ctx.lineTo(bx,by); ctx.stroke();
  ctx.fillStyle='rgba(94,200,255,'+(0.18+0.12*p)+')';
  ctx.beginPath(); ctx.ellipse(bx,by,ISO_TW*0.55,ISO_TH*0.55,0,0,6.28); ctx.fill();
  ctx.strokeStyle='rgba(159,216,255,'+(0.7+0.3*p)+')'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(bx,by,ISO_TW*0.55,ISO_TH*0.55,0,0,6.28); ctx.stroke();
  ctx.fillStyle='rgba(232,236,246,0.9)'; ctx.font='bold 11px Trebuchet MS'; ctx.textAlign='center';
  ctx.fillText(SKILLS[vise.sort]?SKILLS[vise.sort].name:'',bx,by-ISO_TH*0.8);
  ctx.textAlign='left'; ctx.restore();
}

let last=performance.now();
/* Revenir sur l'onglet : la fenêtre a pu changer de taille pendant qu'on
   était ailleurs, sans qu'aucun `resize` ne nous parvienne, et l'horloge a
   avancé de plusieurs secondes. On recale la taille du canevas ET on repart
   d'un pas de temps neuf, sinon la première image simule tout le temps
   passé hors de l'onglet d'un coup. */
function reprendreFenetre(){ try{resize();}catch(e){} last=performance.now(); }
let paused=false;
/* ── IMPACT ──────────────────────────────────────────────────────────────
   Rien ne réagissait à un coup : ni recul, ni arrêt sur image, ni tremblement.
   Trois mécanismes globaux, volontairement plafonnés pour rester lisibles et
   ne jamais gêner la visée.
   ------------------------------------------------------------------------ */
const fantomes=[];                           // images rémanentes de la Charge
const SECOUSSE={t:0,amp:0};                 // tremblement de caméra
let arretImage=0;                            // arrêt sur image, en secondes
function secouer(amp,duree){
  /* on garde la plus forte des deux secousses en cours : elles ne s'additionnent
     pas, sinon un moulinet dans une foule rend l'écran illisible */
  const a=Math.min(9,amp);
  if(a>=SECOUSSE.amp||SECOUSSE.t<=0){SECOUSSE.amp=a;SECOUSSE.t=Math.min(0.35,duree||0.18);}
}
function geler(d){ arretImage=Math.max(arretImage,Math.min(0.06,d)); }
/* Éclat au point de contact : quelques traits courts qui partent du choc. */
function eclatImpact(x,y,col,force,angle){
  const n=Math.min(9,3+Math.round(force*4));
  gerbe(x,y,col,n,(angle==null?rand(0,6.28):angle),(angle==null?3.14:0.9),
        {vmin:2.5,vmax:5.5+force*3,tmin:0.10,tmax:0.24,r:1.5+force,g:120,forme:'eclat'});
}

function loop(now){
  const brut=Math.min(0.05,(now-last)/1000);last=now;
  /* Le tremblement s'épuise avec le temps RÉEL : il continue de jouer pendant
     l'arrêt sur image, ce qui est exactement l'effet recherché. */
  if(SECOUSSE.t>0)SECOUSSE.t=Math.max(0,SECOUSSE.t-brut);
  /* Arrêt sur image : on continue de dessiner, on suspend la simulation. Cette
     poignée de millisecondes est ce qui donne du poids à un critique. */
  let dt=brut;
  if(arretImage>0){arretImage=Math.max(0,arretImage-brut);dt=0;}
  if(running&&!paused&&dt>0){update(dt);majOrbes();}
  /* La scène s'écrit pendant que la simulation est suspendue : c'est le
     seul système qui avance en pause, et c'est voulu. */
  if(typeof majScene==='function')majScene(brut);
  render();
  if(DIAG)majDiag();try{appliquerVolumes();}catch(e){}
requestAnimationFrame(loop);}

let pathBudget=0;
/* Les minuteurs du héros : refroidissements, régénération de mana, verrous. */
function _majMinuteursHeros(dt, st){
  if(player.chill>0)player.chill-=dt;
  if((player._mpLock||0)>0)player._mpLock-=dt;
  else player.mp=Math.min(st.mpMax,player.mp+(2+st.ene*0.15)*dt);
  if((player._chargeLock||0)>0)player._chargeLock-=dt;
  for(const s in skillCd)skillCd[s]=Math.max(0,skillCd[s]-dt);
  updateSkillBar();
}

/* Compte à rebours des effets de sort. Chacun se dessine tant que t < life. */
function _majEffetsSort(dt){
  if(player.moulinet){
    const M=player.moulinet;M.t+=dt;
    /* Une salve par tour. On compare l'avancement au nombre de salves déjà
       versées : pas de minuterie séparée à tenir synchronisée. */
    const dues=Math.min(M.salves,Math.floor(M.t/M.life*M.salves)+1);
    while(M.faites<dues){
      M.faites++;
      if(level&&level.enemies)for(const en of level.enemies)
        if(dist(player.x,player.y,en.x,en.y)<M.r)hitEnemy(en,M.dmg,'phys');
      casserAutour(player.x,player.y,M.r);
      if(typeof secouer==='function')secouer(2.2,0.10);
    }
    if(M.t>=M.life)player.moulinet=null;
  }
  if((player.ancre||0)>0){player.ancre-=dt;if(player.ancre<0)player.ancre=0;}
  if(player.cri){player.cri.t+=dt;if(player.cri.t>=player.cri.life)player.cri=null;}
  for(let i=fantomes.length-1;i>=0;i--){fantomes[i].t+=dt;if(fantomes[i].t>=fantomes[i].life)fantomes.splice(i,1);}
  player.atkCd=Math.max(0,player.atkCd-dt);player.swing=Math.max(0,player.swing-dt);
  player.hurt=Math.max(0,player.hurt-dt);
  if(player.tempest)player.tempest=Math.max(0,player.tempest-dt);
  if(player.buffT>0)player.buffT=Math.max(0,player.buffT-dt);
  if(banner.t>0)banner.t=Math.max(0,banner.t-dt);
}

/* LE JOYSTICK PRIME SUR LE DÉPLACEMENT, JAMAIS SUR LA FRAPPE : si la cible est
   déjà à portée, le héros se retourne et frappe sans lâcher le pouce.
   Auparavant, tenir le joystick annulait purement et simplement l'attaque. */
function _majAttaqueOuChemin(dt, st, joyPrime){
  if(player.attackTarget&&level.enemies.indexOf(player.attackTarget)<0)player.attackTarget=null;
  if(!player.attackTarget){ if(!joyPrime)followPath(st,dt); return; }
  const en=player.attackTarget;
  const d=dist(player.x,player.y,en.x,en.y);
  // au doigt, viser à 36 px près est irréaliste : on élargit quand le ciblage assiste
  const reach=en.r+player.r+6+((OPT&&OPT.cibleAuto)?14:0);
  if(d<=reach){
    player.path=null;
    faceAngle(Math.atan2(en.y-player.y,en.x-player.x));   // demi-tour bref, puis coup
    if(player.atkCd<=0){
      player.atkCd=st.atkSpeed;player.swing=0.14;playOnce('Attack1');
      hitEnemy(en,randi(st.dmgMin,st.dmgMax),'phys');
      /* En attaque automatique on garde la cible : sinon il faudrait réappuyer
         à chaque coup. Au clavier-souris, un clic reste un coup. */
      if(!(OPT&&OPT.attaqueAuto)||en.dying||en.hp<=0)player.attackTarget=null;
    }
  } else if(!joyPrime){
    if(!player.path||player._retarget<0){setPathTo(en.x,en.y);player._retarget=0.4;}
    player._retarget-=dt; followPath(st,dt);
  }
}

/* USURE DE ZONE. Les braises et le froid mordant grignotent la vie : une
   seconde de plus dans la zone coûte quelque chose, mais on ne meurt pas
   d'y passer. Plafonné à 1,6 % des PV maximum par seconde.

   `player.hpMax` N'EXISTE PAS : le maximum vient de P().hpMax, il dépend de
   l'équipement. On lisait donc `undefined`, et la vie passait à NaN — la jauge
   se figeait et l'ATH affichait « NaN / … » jusqu'au changement de zone. Le
   `st` de la boucle l'a déjà.

   ⚠ `test_regions` lit le TEXTE de cette fonction et y cherche le plancher
   « Math.max(1,player.hp ». Il vivait dans `update` avant la Phase 4. */
function _majUsureZone(dt, st){
  if(!(level&&level.kind!=='village'&&typeof anomalieEn==='function'))return;
  const _an=anomalieEn(level,player.x,player.y);
  if(!(_an&&_an.dot>0&&player.hp>0))return;
  const _d=(st.hpMax||0)*0.01*_an.dot*dt;
  player.hp=Math.max(1,player.hp-_d);      /* elle ne tue jamais seule */
  player._usure=(player._usure||0)+_d;
}

/* Une case qui devient VUE change le sol : la dalle qui la contient doit
   être refaite. On ne salit que pour les cases réellement découvertes —
   sinon on jetterait le cache à chaque pas. */
function _majBrouillard(){
  const pt=tileAt(player.x,player.y);
  const Rv=Math.round(((typeof regionEn==='function'&&regionEn(level,player.x,player.y).vision)||7));
  for(let dy=-Rv;dy<=Rv;dy++)for(let dx=-Rv;dx<=Rv;dx++){
    const nx=pt.tx+dx,ny=pt.ty+dy;if(nx<0||ny<0||nx>=level.w||ny>=level.h)continue;
    if(dx*dx+dy*dy<=Rv*Rv){const _i=idx(level.w,nx,ny);
      if(!level.seen[_i]){level.seen[_i]=1;if(typeof salirDalle==='function')salirDalle(nx,ny);}}}
}

/* Un ennemi : ses minuteurs, sa visibilité, puis sa poursuite ou sa flânerie. */
function _majEnnemi(en, dt){
  if(en.dying){en.dieT=(en.dieT||0)+dt;return;}
  en.hurt=Math.max(0,en.hurt-dt);en.hitCd=Math.max(0,en.hitCd-dt);if(en._atkT>0)en._atkT-=dt;
  if(en.slow)en.slow=Math.max(0,en.slow-dt);
  const et=tileAt(en.x,en.y);en._visible=level.seen[idx(level.w,et.tx,et.ty)]===1
    && dist(en.x,en.y,player.x,player.y)<Math.max(W,H)*0.8;
  const dP=dist(en.x,en.y,player.x,player.y);
  if(dP<300)en.aggro=true;
  if(en.frozen>0)en.frozen-=dt;
  const spd=en.spd*(en.slow>0?0.45:1);
  if(en.boss&&en._dash){ if(bossPhaseUpdate(en,dt))return; }
  if(en.aggro&&!(en.frozen>0)){
    if(dP>en.r+player.r+2){
      // path toward player, throttled
      en.pcd-=dt;
      if((!en.path||en.pcd<=0)&&pathBudget>0){pathBudget--;en.pcd=0.5;
        const es=tileAt(en.x,en.y),ps=tileAt(player.x,player.y);
        /* Un ennemi à plus de 30 cases est hors de l'écran : il n'a pas
           besoin d'un itinéraire, il avance en ligne droite. Et pour les
           autres, 900 expansions suffisent — c'est la DIRECTION qui compte. */
        const _d=Math.abs(es.tx-ps.tx)+Math.abs(es.ty-ps.ty);
        const p=(_d>30)?null:astar(level,es.tx,es.ty,ps.tx,ps.ty,900);
        en.path=p&&p.length>1?pathToPixels(p.slice(1)):null;}
      // move along path or direct if close
      if(en.path&&en.path.length){
        const w0=en.path[0];const a=Math.atan2(w0.y-en.y,w0.x-en.x);
        en.x+=Math.cos(a)*spd;en.y+=Math.sin(a)*spd;
        if(dist(en.x,en.y,w0.x,w0.y)<6)en.path.shift();
      } else { const a=Math.atan2(player.y-en.y,player.x-en.x);
        const nxp=en.x+Math.cos(a)*spd,nyp=en.y+Math.sin(a)*spd;
        if(isWalkablePx(level,nxp,en.y))en.x=nxp; if(isWalkablePx(level,en.x,nyp))en.y=nyp; }
    } else if(en.hitCd<=0){en.hitCd=1.0;damagePlayer(en.dmg,en.lvl);
      if(en.vamp){en.hp=Math.min(en.hpMax,en.hp+Math.round(en.dmg*0.6));floatText(en.x,en.y-en.r-18,'+vol','#ff6b9a');}
      if(en.chill){player.chill=2.2;floatText(player.x,player.y-40,'GELÉ','#7fd0ff');}if(!en.boss){en._atkT=0.55;en._atkDur=0.55;en._atkIdx=randi(0,1);}}
    if(en.boss)bossPhaseUpdate(en,dt);
  } else if(en.wander!==undefined){ // idle wander
    en.wander-=dt;
    if(en.wander<=0){en.wander=rand(1,3);en.wdir=rand(0,6.28);}
    const nxp=en.x+Math.cos(en.wdir)*spd*0.4,nyp=en.y+Math.sin(en.wdir)*spd*0.4;
    if(dist(nxp,nyp,en.wx,en.wy)<90&&isWalkablePx(level,nxp,nyp)){en.x=nxp;en.y=nyp;}
    else en.wander=0;
  }
}

function _majEnnemis(dt){
  pathBudget=2;   /* trois par image, c'était 34 ms de calcul par image */
  for(const en of level.enemies)_majEnnemi(en,dt);
}

function _majProjectiles(dt){
  for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.t+=dt;
    let nx=p.x+p.vx,ny=p.y+p.vy;
    /* `perce` : traverse les ennemis mais MEURT sur un mur. Sans ce cas, le
       Slap Shot ricochait indéfiniment au lieu de s'arrêter comme avant. */
    if(p.perce){
      if(!isWalkablePx(level,nx,p.y)||!isWalkablePx(level,p.x,ny)){
        eclatImpact(p.x,p.y,p.col,0.5);secouer(1.2,0.1);projectiles.splice(i,1);continue;}
    } else {
      if(!isWalkablePx(level,nx,p.y)){p.vx*=-1;p.bounces--;nx=p.x;}
      if(!isWalkablePx(level,p.x,ny)){p.vy*=-1;p.bounces--;ny=p.y;}
    }
    p.x=nx;p.y=ny;
    /* Traînée : les huit dernières positions, redessinées en dégradé. C'est ce
       qui transforme un rond qui se téléporte en objet lancé. */
    if(p.trail){p.trail.unshift(p.x,p.y);if(p.trail.length>16)p.trail.length=16;}
    if(p.spin!=null)p.spin+=(p.spinV||16)*dt;
    if(p.enemy){if(dist(p.x,p.y,player.x,player.y)<player.r+p.r){damagePlayer(p.dmg,p.lvl);projectiles.splice(i,1);continue;}}
    else{for(const en of level.enemies){if(p.hitSet.has(en))continue;
      if(dist(p.x,p.y,en.x,en.y)<en.r+p.r){hitEnemy(en,p.dmg,p.type||'phys');p.hitSet.add(en);
        if(!p.perce)p.bounces--;}}
      /* Un palet doit casser un tonneau qu'il percute, comme il blesse un
         ennemi. Sans ça, seuls les clics directs détruisaient le décor. */
      if(level.breakables)for(const b of level.breakables){
        if(b.broken||(p.hitSet&&p.hitSet.has(b)))continue;
        if(dist(p.x,p.y,b.x,b.y)<(b.r||14)+p.r+6){breakBarrel(b);if(p.hitSet)p.hitSet.add(b);
          if(!p.perce)p.bounces--;}}}
    if(p.t>p.life||p.bounces<0)projectiles.splice(i,1);}
}

function _majParticules(dt){
  for(let i=particles.length-1;i>=0;i--){const q=particles[i];q.t+=dt;
    if(q.g)q.vy+=q.g*dt*dt*6;          // gravité : les étincelles retombent
    q.x+=q.vx;q.y+=q.vy;
    q.vx*=0.92;q.vy*=(q.g?0.985:0.92); // ce qui tombe garde sa vitesse verticale
    if(q.rot)q.a+=q.rot*dt;
    if(q.t>q.life)particles.splice(i,1);}
  for(let i=floaters.length-1;i>=0;i--){const f=floaters[i];f.t+=dt;f.y-=22*dt;if(f.t>f.life)floaters.splice(i,1);}
}

/* Le ménage de fin de tour : répliques, ambiance, butin ramassé, cadavres
   retirés, sauvegarde périodique, musique contextuelle. */
function _majFinDeTour(dt){
  majRepliques(dt);
  majAmbiance(dt);
  if(_cdVieBasse>0)set_CdVieBasse(_cdVieBasse-(dt));
  for(let _i=level.drops.length-1;_i>=0;_i--){const d=level.drops[_i];d.t+=dt;
    if(!sacPlein(d.item)&&dist(player.x,player.y,d.x,d.y)<RAYON_LOOT)grabDrop(d);}
  majOrbesSol(dt);
  for(let _e=level.enemies.length-1;_e>=0;_e--){if(level.enemies[_e].dying&&(level.enemies[_e].dieT||0)>=0.5)level.enemies.splice(_e,1);}
  if(toastTimer>0){setToastTimer(toastTimer-(dt));if(toastTimer<=0)document.getElementById('toast').textContent='';}
  setSaveTimer(saveTimer-(dt));if(saveTimer<=0){setSaveTimer(6);saveGame();}
  // musique contextuelle (throttle)
  musicModeTimer-=dt;
  if(musicModeTimer<=0){musicModeTimer=0.5;updateMusicMode();}
}

/* UNE IMAGE DE JEU, EN ONZE TEMPS.                                 (Phase 4)
   `update` faisait 195 lignes d'affilée : minuteurs, sorts, entrée, combat,
   caméra, usure, brouillard, ennemis, projectiles, particules, ménage. On ne
   pouvait pas lire une phase sans traverser les autres. L'ORDRE EST LA RÈGLE
   — voir le commentaire du joystick, ci-dessous : le déplacer casse la
   marche. */
function update(dt){
  if(player.dying){player.dyingT=(player.dyingT||0)+dt;
    if(player.dyingT>=1.6){ if(level.arena){arenaLeave(false);} else gameOver(); }return;}
  if(ARENA_BAN.t>0)ARENA_BAN.t-=dt;   // partout, pas seulement dans la Fosse
  if(level&&level.arena)arenaUpdate(dt);
  const st=P();
  _majMinuteursHeros(dt,st);
  _majEffetsSort(dt);
  if(travelLock>0)setTravelLock(travelLock-(dt));
  player._moved=false;
  /* Le joystick est traité AVANT le suivi de chemin et AVANT updateAnim :
     il pose player._moved, que l'animation lit juste après. Placé plus bas,
     son drapeau était écrasé avant d'être lu et la marche restait figée. */
  if(typeof ramasserSac==='function')ramasserSac();
  const joyPrime=joyDeplacer(dt);
  _majAttaqueOuChemin(dt,st,joyPrime);
  updateAnim(dt,player._moved);
  travelCheck();
  // caméra TOUJOURS centrée sur le héros : la zone de jeu reste au centre,
  // le décor défile aux limites, le joueur ne passe jamais sous l'ATH.
  cam.x=player.x-W/2; cam.y=player.y-H/2;
  _majUsureZone(dt,st);
  _majBrouillard();
  _majEnnemis(dt);
  majVisee(dt);
  majCibleAuto(dt);
  majAttaqueAuto(dt);
  updateZones(dt);
  _majProjectiles(dt);
  _majParticules(dt);
  _majFinDeTour(dt);
}
let musicModeTimer=0;
function updateMusicMode(){
  if(!Music.isOn())return;let m='explore';
  if(level.kind==='village')m='town';
  else{
    const bossActive=level.boss&&level.enemies.indexOf(level.boss)>=0&&level.boss.aggro;
    if(bossActive)m='boss';
    else{let fight=false;
      for(const en of level.enemies)if(en.aggro&&dist(en.x,en.y,player.x,player.y)<520){fight=true;break;}
      m=fight?'combat':'explore';}
  }
  Music.setMode(m);
}
/* PORTÉES D'INTERACTION. Elles étaient trois nombres nus dans autant de
   copies : une relique s'attrape d'un peu plus loin qu'un PNJ, lui-même d'un
   peu plus loin qu'un coffre. */
const PORTEE_RELIQUE = TS*1.7;
const PORTEE_PNJ     = TS*1.6;
const PORTEE_OBJET   = TS*1.4;

/* Ce qu'ouvre un PNJ quand on l'atteint. C'était une chaîne de sept ternaires
   sur une seule ligne, dans laquelle il fallait compter les « : » pour savoir
   quel type menait où. */
function _pnjInteragir(n){
  switch(n.type){
    case 'arenamaster': qc.talkArena=1; if(checkQuests)checkQuests(); openDialogue(n); break;
    case 'arena':       openArena(); break;
    case 'return':      usePortal(); break;
    case 'stash':       toggleStash(); break;
    case 'waypoint':    debloquerBalise(n.acte,n.bi); openWaypoint(); break;
    case 'quest':       openDialogue(n); break;
    default:            openShop(n);
  }
}

/* TROIS CIBLES AU SOL — coffre, autel, tonneau — étaient traitées par trois
   blocs rigoureusement identiques au nom près : même test d'épuisement, même
   test de distance, même oubli de la cible ensuite. Rend `true` quand elle a
   agi, auquel cas le chemin est abandonné. */
function _approcheCible(champ, epuise, agir){
  const c=player[champ];
  if(!c)return false;
  if(c[epuise]){player[champ]=null;return false;}
  if(dist(player.x,player.y,c.x,c.y)>=PORTEE_OBJET)return false;
  player.path=null; agir(c); player[champ]=null; return true;
}

/* Les interactions de proximité, quelle que soit la progression sur le chemin. */
function _interactionsProches(){
  if(player._relic&&!player._relic.destroyed){
    const R=player._relic;
    if(dist(player.x,player.y,R.x,R.y)<PORTEE_RELIQUE){
      player.path=null; hitRelic();
      /* `hitRelic` peut détruire la relique : on relit l'état APRÈS le coup.
         L'ancienne écriture le faisait deux fois de suite — un ternaire puis
         un `if` — qui rendaient exactement le même résultat. */
      if(R.destroyed)player._relic=null;
      return true;}
  }
  if(player._npc){
    const n=player._npc,nx=n.tx*TS+TS/2,ny=n.ty*TS+TS/2;
    if(dist(player.x,player.y,nx,ny)<PORTEE_PNJ){
      player.path=null; _pnjInteragir(n); player._npc=null; return true;}
  }
  if(_approcheCible('_chest','opened',ch=>openChest(ch)))return true;
  if(_approcheCible('_shrine','used',sh=>activateShrine(sh)))return true;
  if(_approcheCible('_break','broken',bk=>breakBarrel(bk)))return true;
  return false;
}

/* Ramasse le butin visé, une fois le chemin fini. */
function _ramasserSiArrive(){
  if(player._grab&&dist(player.x,player.y,player._grab.x,player._grab.y)<RAYON_LOOT){
    grabDrop(player._grab);player._grab=null;}
}

/* UN PAS LE LONG DU CHEMIN, avec collision.

   Le suivi de chemin déplaçait le joueur SANS aucun contrôle de collision :
   il faisait confiance à l'A*. Or l'A* raisonne sur des CENTRES de case, et
   un centre praticable n'empêche pas un corps de 16 px de mordre le mur
   d'à côté — reproduit à l'acte 2. Même traitement qu'au joystick : test
   axe par axe, ce qui fait glisser le long des murs au lieu de bloquer.

   AUCUN repli. Les anciens réessais avec un corps réduit — jusqu'à 9,6 px
   de rayon au lieu de 21 — laissaient le héros se faufiler entre deux blocs
   collés en diagonale : un interstice d'un pixel suffisait. Si le corps ne
   passe pas, il ne passe pas.

   Rend `false` quand le héros est vraiment coincé. */
function _avancerSurChemin(st, a){
  const _an=(typeof anomalieEn==='function')?anomalieEn(level,player.x,player.y):null;
  const _vs=st.moveSpeed*(_an?_an.spd:1);
  const nx=player.x+Math.cos(a)*_vs, ny=player.y+Math.sin(a)*_vs;
  const R=R_MARCHE;
  let avance=false;
  if(corpsLibre(level,nx,player.y,R)){player.x=nx;avance=true;}
  if(corpsLibre(level,player.x,ny,R)){player.y=ny;avance=true;}
  return avance;
}

/* ON COLLE LE HÉROS SUR LE DERNIER POINT — v8.64.

   Le point de passage était abandonné dès 5 px, sans jamais y arriver.
   Cinq pixels, c'est un peu plus d'un pas (4,4 px à vitesse de base) :
   le héros s'arrêtait donc systématiquement un pas avant sa destination.

   Invisible partout… sauf sur la porte du village. Le couloir de sortie
   fait deux cases de large et la rangée de porte est collée au bord de
   la carte : la règle des quartiers n'y laisse AUCUN point de pose au
   centre, seulement sur l'arête nord de la case. Arriver « presque »
   sur cette arête, c'est se retrouver sur la case du dessus — du sol
   ordinaire. `travelCheck` ne voyait jamais la porte, et la Piscine
   était inaccessible depuis Moreuil.

   Une destination atteinte doit être atteinte exactement. */
const ARRIVEE_PX = 5;
function _finirEtape(w0){
  if(dist(player.x,player.y,w0.x,w0.y)>=ARRIVEE_PX)return;
  if(player.path.length===1&&corpsLibre(level,w0.x,w0.y,R_MARCHE)){player.x=w0.x;player.y=w0.y;}
  player.path.shift();
  if(!player.path.length)_ramasserSiArrive();
}

function followPath(st,dt){
  if((player.ancre||0)>0)return;          /* ancré : le chemin attend */
  if(_interactionsProches())return;
  if(!player.path||!player.path.length){_ramasserSiArrive();return;}
  const w0=player.path[0];
  const a=Math.atan2(w0.y-player.y,w0.x-player.x);
  if(!_avancerSurChemin(st,a)){
    /* Vraiment coincé : on abandonne ce point de passage plutôt que de
       laisser le héros vibrer contre le mur. */
    player.path.shift();
    if(!player.path.length){player.path=null;player._grab=null;}
    return;
  }
  faceAngle(a);player._moved=true;
  _finirEtape(w0);
}

/* CE QUI S'EXÉCUTE AU CHARGEMENT — sorti du premier niveau.

   Le module ne fait plus que DÉCLARER. Ses actions de chargement sont
   appelées par l'entrée, dans l'ordre des préfixes, ce qui rend l'ordre
   d'évaluation des modules INDIFFÉRENT — sans quoi la conversion en
   modules ES les remettrait dans un ordre imprévisible. */
function _demarrer17(){
  addEventListener('focus',reprendreFenetre);
  addEventListener('pageshow',reprendreFenetre);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden)reprendreFenetre(); });
}

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */
function setPaused(v){paused=v;}
function setLast(v){last=v;}

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */



