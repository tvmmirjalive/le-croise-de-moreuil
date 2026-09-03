










/* ================================================================
   PHASES DE BOSS SCÉNARISÉES
   Chaque boss traverse 3 phases déclenchées par seuil de PV.
   Une phase change la cadence, la vitesse, les dégâts, et surtout
   le RÉPERTOIRE d'attaques : le motif de combat évolue vraiment.
   ================================================================ */

/* --- zones au sol télégraphiées : on voit venir, on a le temps de sortir --- */
function addZone(x,y,r,delay,dmg,col,kind){
  if(!level)return;
  level.zones=level.zones||[];
  level.zones.push({x,y,r,t:0,delay:delay,dur:delay+0.85,dmg,col:col||'#ff6a3d',kind:kind||'blast',hit:false});
}
function updateZones(dt){
  const Z=level&&level.zones; if(!Z||!Z.length)return;
  for(let i=Z.length-1;i>=0;i--){const z=Z[i]; z.t+=dt;
    if(!z.hit&&z.t>=z.delay){ z.hit=true;
      if(dist(player.x,player.y,z.x,z.y)<z.r+player.r*0.5){
        damagePlayer(z.dmg,z.lvl);
        if(z.kind==='ice'){player.chill=2.4;floatText(player.x,player.y-40,t('combat.gele'),'#7fd0ff');}
      }
      burst(z.x,z.y,z.col,16); SFX.hit&&SFX.hit();
    }
    if(z.t>=z.dur)Z.splice(i,1);
  }
}
function drawZones(){
  const Z=level&&level.zones; if(!Z||!Z.length)return;
  const cvt=(wx,wy)=>{const fx=wx/TS,fy=wy/TS;
    return{x:(fx-fy)*(ISO_TW/2)+isoOX,y:(fx+fy)*(ISO_TH/2)+isoOY};};
  ctx.save();
  for(const z of Z){
    const p=cvt(z.x,z.y);
    const grow=Math.min(1,z.t/Math.max(0.01,z.delay));
    const after=z.t>z.delay?(z.t-z.delay)/(z.dur-z.delay):0;
    const rx=z.r, ry=z.r*0.5;   /* losange iso */
    if(!z.hit){
      ctx.globalAlpha=0.18+0.22*grow;
      ctx.fillStyle=z.col;
      ctx.beginPath();ctx.ellipse(p.x,p.y,rx,ry,0,0,6.28);ctx.fill();
      ctx.globalAlpha=0.55+0.45*Math.sin(z.t*14);
      ctx.strokeStyle=z.col;ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(p.x,p.y,rx*grow,ry*grow,0,0,6.28);ctx.stroke();
    } else {
      ctx.globalAlpha=Math.max(0,0.6*(1-after));
      ctx.fillStyle=z.col;
      ctx.beginPath();ctx.ellipse(p.x,p.y,rx*(1+after*0.25),ry*(1+after*0.25),0,0,6.28);ctx.fill();
    }
  }
  ctx.globalAlpha=1;ctx.restore();
}

/* --- répertoire d'attaques, partagé par tous les boss --- */
const BOSS_MOVES={
  volley:(en,n,spd,dmg,col)=>{const a0=Math.atan2(player.y-en.y,player.x-en.x);
    for(let i=0;i<n;i++){const a=a0+(i-(n-1)/2)*0.19;
      projectiles.push({x:en.x,y:en.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,dmg:dmg,bounces:0,
        r:11,life:3,t:0,hitSet:new Set(),enemy:true,col:col});}},
  nova:(en,n,spd,dmg,col)=>{for(let i=0;i<n;i++){const a=i*6.2832/n+(en._spin||0);
      projectiles.push({x:en.x,y:en.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,dmg:dmg,bounces:0,
        r:10,life:3.4,t:0,hitSet:new Set(),enemy:true,col:col});} en._spin=(en._spin||0)+0.4;},
  summon:(en,kind,n,lvl)=>{let ok=0;
    for(let i=0;i<n*3&&ok<n;i++){const a=rand(0,6.28),d=52+rand(0,34);
      const bx=en.x+Math.cos(a)*d,by=en.y+Math.sin(a)*d;
      if(isWalkablePx(level,bx,by)){level.enemies.push(makeEnemy(kind,bx,by,lvl));ok++;}}
    if(ok)floatText(en.x,en.y-en.r-24,'renforts !','#ffb45e');},
  ground:(en,n,r,dmg,col,kind)=>{
    addZone(player.x,player.y,r,1.0,dmg,col,kind);
    for(let i=1;i<n;i++){const a=rand(0,6.28),d=rand(60,150);
      addZone(player.x+Math.cos(a)*d,player.y+Math.sin(a)*d,r,1.0+i*0.18,dmg,col,kind);}},
  charge:(en,dmg)=>{const a=Math.atan2(player.y-en.y,player.x-en.x);
    en._dash={a:a,t:0.42,dmg:dmg}; floatText(en.x,en.y-en.r-24,'CHARGE !','#ff8a5a');},
  ring:(en,r,dmg,col)=>{const n=14;
    for(let i=0;i<n;i++){const a=i*6.2832/n;
      addZone(en.x+Math.cos(a)*r,en.y+Math.sin(a)*r,34,0.9,dmg,col,'blast');}},
  shield:(en)=>{en._shield=Math.max(en._shield||0,3.0);
    floatText(en.x,en.y-en.r-24,'CARAPACE','#7fd0ff');}
};

/* --- scénario de chaque boss : 3 phases, seuils de PV décroissants --- */
/* Le nom et le sous-titre d'une phase de boss, traduits. Clé par KIND et par
   INDICE — `phase.iceheart.1` — donc insensible au renommage.

   La phase 2 de Givre-Cœur s'appelait « BANQUISE » : faute §00 corrigée en
   v9.31, en même temps que l'ajout de BOSS_PHASES au crible. Quatrième source
   de texte joué trouvée hors du filet en deux versions (§41). */
function nomPhase(kind,i,champ){
  const L=BOSS_PHASES[kind]||BOSS_PHASES_DEFAUT;
  const f=L&&L[i]; if(!f)return '';
  return tOu('phase.'+kind+'.'+i+'.'+champ, f[champ]||'');
}

const BOSS_PHASES={
 swimmer:[
  {at:1.00,nom:'Bassin calme',   sub:'Il tourne, il jauge.',            spd:1.00,dmg:1.00,cd:4.0,moves:['volley3','summonImp2']},
  {at:0.65,nom:'Remous',         sub:'L’eau se met à tourner.',         spd:1.18,dmg:1.10,cd:3.0,moves:['nova8','flaques','volley5']},
  {at:0.30,nom:'Noyade',         sub:'Le grand bain se referme.',       spd:1.40,dmg:1.25,cd:2.1,moves:['nova12','flaques','summonImp3','volley5']}
 ],
 iceheart:[
  {at:1.00,nom:'Gel de surface', sub:'Le froid s’installe.',            spd:1.00,dmg:1.00,cd:3.8,moves:['volley3','givre']},
  {at:0.70,nom:'Grand Gel',      sub:'Le sol se couvre de givre.',      spd:1.10,dmg:1.15,cd:2.9,moves:['givre','nova10','carapace']},
  {at:0.35,nom:'Cœur de glace',  sub:'Sa carapace se fend.',            spd:1.30,dmg:1.30,cd:2.0,moves:['couronne','givre','nova14','summonWraith3']}
 ],
 ent:[
  {at:1.00,nom:'Écorce',         sub:'Il tient racine.',                spd:0.95,dmg:1.00,cd:4.2,moves:['carapace','summonBrute2']},
  {at:0.70,nom:'Ronces',         sub:'Les racines percent le sol.',     spd:1.15,dmg:1.15,cd:3.0,moves:['racines','charge','summonBrute2']},
  {at:0.32,nom:'Fureur du Bois', sub:'Le Bois entier se réveille.',     spd:1.45,dmg:1.30,cd:2.0,moves:['charge','racines','nova12','summonBrute3']}
 ],
 seraphin:[
  {at:1.00,nom:'Litanie',        sub:'Il psalmodie encore.',            spd:1.00,dmg:1.00,cd:3.6,moves:['volley5','jugement']},
  {at:0.72,nom:'Anathème',       sub:'Les vitraux se brisent.',         spd:1.20,dmg:1.15,cd:2.7,moves:['jugement','nova12','summonImp3','charge']},
  {at:0.34,nom:'Chute',          sub:'L’aile brisée s’embrase.',        spd:1.45,dmg:1.35,cd:1.8,moves:['couronne','jugement','nova16','charge','summonWraith4']}
 ]
};
const BOSS_PHASES_DEFAUT=BOSS_PHASES.swimmer;

function bossMoveLvl(en){return (level&&level.depth)||1;}
function bossPlay(en,mv){
  const D=Math.round(en.dmg*0.9), L=bossMoveLvl(en), C=en.col||'#ff7a3d';
  switch(mv){
    case 'volley3': BOSS_MOVES.volley(en,3,4.2,D,C); break;
    case 'volley5': BOSS_MOVES.volley(en,5,4.4,D,C); break;
    case 'nova8':   BOSS_MOVES.nova(en,8,3.6,D,C); break;
    case 'nova10':  BOSS_MOVES.nova(en,10,3.6,D,C); break;
    case 'nova12':  BOSS_MOVES.nova(en,12,3.8,D,C); break;
    case 'nova14':  BOSS_MOVES.nova(en,14,3.8,D,C); break;
    case 'nova16':  BOSS_MOVES.nova(en,16,4.0,D,C); break;
    case 'summonImp2':    BOSS_MOVES.summon(en,'imp',2,L); break;
    case 'summonImp3':    BOSS_MOVES.summon(en,'imp',3,L); break;
    case 'summonWraith3': BOSS_MOVES.summon(en,'wraith',3,L); break;
    case 'summonWraith4': BOSS_MOVES.summon(en,'wraith',4,L); break;
    case 'summonBrute2':  BOSS_MOVES.summon(en,'brute',2,L); break;
    case 'summonBrute3':  BOSS_MOVES.summon(en,'brute',3,L); break;
    case 'flaques': BOSS_MOVES.ground(en,3,40,Math.round(D*1.1),'#2f8fbf','blast'); break;
    case 'givre':   BOSS_MOVES.ground(en,3,42,Math.round(D*0.9),'#7fd0ff','ice'); break;
    case 'racines': BOSS_MOVES.ground(en,4,38,Math.round(D*1.15),'#5a8f3a','blast'); break;
    case 'jugement':BOSS_MOVES.ground(en,2,54,Math.round(D*1.35),'#f4d35e','blast'); break;
    case 'couronne':BOSS_MOVES.ring(en,120,Math.round(D*1.2),C); break;
    case 'charge':  BOSS_MOVES.charge(en,Math.round(en.dmg*1.4)); break;
    case 'carapace':BOSS_MOVES.shield(en); break;
  }
}
function bossPhaseInit(en){
  en._phases=BOSS_PHASES[en.bkind]||BOSS_PHASES_DEFAUT;
  en._phase=-1; en._mi=0;
  en._spdBase=en.spd; en._dmgBase=en.dmg;
  bossPhaseSet(en,0,true);
}
function bossPhaseSet(en,i,silent){
  if(i===en._phase)return;
  en._phase=i; en._mi=0;
  const f=en._phases[i];
  en.spd=en._spdBase*f.spd;
  en.dmg=Math.round(en._dmgBase*f.dmg);
  en.special=Math.min(en.special||f.cd,f.cd);
  if(!silent){
    /* Le KIND du boss porte la clé : `en.bkind` le donne, sinon on retombe
       sur le texte de la donnée. */
    arenaBanner((nomEnnemi(en)||t('boss.defaut')).toUpperCase()+' — '
                +tOu('phase.'+(en.bkind||'')+'.'+i+'.nom',f.nom).toUpperCase(),
                tOu('phase.'+(en.bkind||'')+'.'+i+'.sub',f.sub),2.6);
    burst(en.x,en.y,en.col||'#ff7a3d',34);
    SFX.gate&&SFX.gate();
    en._flash=0.7;
  }
}
function bossPhaseUpdate(en,dt){
  if(!en._phases)bossPhaseInit(en);
  const fr=en.hp/Math.max(1,en.hpMax);
  let want=0;
  for(let i=0;i<en._phases.length;i++)if(fr<=en._phases[i].at)want=i;
  if(want>en._phase)bossPhaseSet(en,want,false);
  if(en._flash>0)en._flash-=dt;
  if(en._shield>0)en._shield-=dt;
  // ruée : déplacement rapide en ligne droite, dégâts au contact
  if(en._dash){const d=en._dash; d.t-=dt;
    const sp=en.spd*4.2;
    const nx=en.x+Math.cos(d.a)*sp, ny=en.y+Math.sin(d.a)*sp;
    if(isWalkablePx(level,nx,en.y))en.x=nx; else d.t=0;
    if(isWalkablePx(level,en.x,ny))en.y=ny; else d.t=0;
    if(dist(en.x,en.y,player.x,player.y)<en.r+player.r+4){damagePlayer(d.dmg,en.lvl);d.t=0;}
    if(d.t<=0)en._dash=null;
    return true;   // pendant la ruée, l'IA normale est suspendue
  }
  const f=en._phases[en._phase];
  en.special-=dt;
  if(en.special<=0){
    en.special=f.cd;
    const mv=f.moves[en._mi%f.moves.length]; en._mi++;
    en._atkT=0.9;en._atkDur=0.9;en._atkIdx=randi(0,2);
    bossPlay(en,mv);
  }
  return false;
}
function bossPhaseLabel(en){
  if(!en._phases||en._phase<0)return '';
  const f=en._phases[en._phase];
  return tOu('phase.'+(en.bkind||'')+'.'+en._phase+'.nom',f.nom)
        +'  ('+(en._phase+1)+'/'+en._phases.length+')';
}



