















/* ================= LES 5 RELIQUES DU FALCON ================= */
const RELICS=[
 {nom:'Le Sifflet du Pacte',   col:'#e8c23a',col2:'#8a6a10',forme:'sifflet'},
 {nom:'La Rondelle Maudite',   col:'#7fd0ff',col2:'#1d5a80',forme:'palet'},
 {nom:'La Médaille de 1918',   col:'#d9a05b',col2:'#6b4418',forme:'medaille'},
 {nom:'Le Calice Profané',     col:'#c88fff',col2:'#4a2a70',forme:'calice'},
 {nom:'La Coupe Maudite',      col:'#f4d35e',col2:'#7a1f2b',forme:'coupe'}
];
const relicDestroyed=[false,false,false,false,false];

/* ── LES CINQ ÉCLATS ─────────────────────────── chantier C bis, v9.48

   Décision de Mirja : les cinq reliques **se retournent**. « Brisées, elles
   deviennent des armes contre elle, le joueur doit les reforger en
   Cauchemar. »

   Le récit le porte depuis la v9.42 — à la bascule, « *Il ramasse les éclats
   un à un.* Bruna. Il faut que tu me forges quelque chose. » ; à l'acte 4 du
   Cauchemar, « *Les éclats reforgés s'allument ensemble. Pour la première
   fois, quelque chose dans le gymnase a peur.* »

   ⚠ ILS NE S'ÉQUIPENT PAS, ET C'EST VOULU. Neuf emplacements sont déjà pris,
   et les éclats ne sont pas de l'équipement : ce sont des morceaux de ce qui
   l'ancrait. Ils agissent par leur PRÉSENCE, comme les charmes — un état du
   personnage, pas une pièce à porter.

   ⚠ ET QUATRE NE VALENT PAS CINQ. Les lignes individuelles sont modestes ;
   c'est **l'Étoile complète** qui paie, et elle seule. Un bonus qui monterait
   régulièrement de un à cinq ferait de la collecte une rampe qu'on abandonne
   à mi-chemin ; un palier unique à 5/5 en fait un objectif. C'est la même
   raison qui fait que le parangon d'un ensemble ne coule qu'à six pièces. */
const ECLATS=[
 {nom:'Éclat du Sifflet',  t:'cast',    v:14},
 {nom:'Éclat de la Rondelle', t:'ias',  v:10},
 {nom:'Éclat de la Médaille', t:'def',  v:220},
 {nom:'Éclat du Calice',   t:'leech',   v:5},
 {nom:'Éclat de la Coupe', t:'critDmg', v:35}
];
/* Ce que l'Étoile complète ajoute, dans le seul godet non dilué du jeu. Même
   raisonnement que la gravure (règle 78) : une ligne plate serait invisible à
   l'endgame, et c'est justement là que l'Étoile se gagne. */
const ETOILE_DMGMULT=90;

function eclatsReforges(){
  const e=player.eclats; if(!e||!e.length)return 0;
  let n=0; for(let i=0;i<5;i++) if(e[i])n++;
  return n;
}
function etoileComplete(){ return eclatsReforges()===5; }

/* Le coût de la reforge. Il monte avec le rang de l'éclat — la Coupe est la
   dernière relique de la campagne, et son éclat doit se mériter. */
function coutReforge(i){ return {gold:4000+i*3000, frags:20+i*15}; }

/* ⚠ TROIS CONDITIONS, ET LA DEUXIÈME EST LE CŒUR DU CHANTIER. On ne reforge
   qu'en Cauchemar ou au-delà, et seulement après avoir **rebrisé** la relique
   correspondante dans ce mode-là. C'est ce qui fait de la reforge un parcours
   et non une case à cocher — et c'est pour ça que `passerDifficulteSuivante`
   devait remettre `relicDestroyed` à zéro. */
function peutReforger(i){
  if(i<0||i>4)return false;
  if(difficulty<1)return false;
  if(!relicDestroyed[i])return false;
  if((player.eclats||[])[i])return false;
  const c=coutReforge(i);
  return player.gold>=c.gold && player.frags>=c.frags;
}
function reforgerEclat(i){
  if(!peutReforger(i))return false;
  const c=coutReforge(i);
  player.gold-=c.gold; player.frags-=c.frags;
  if(!player.eclats)player.eclats=[false,false,false,false,false];
  player.eclats[i]=true;
  try{saveGame();}catch(e){}
  return true;
}

/* Le bonus consolidé des éclats reforgés. Même forme que `charmBonus` : une
   table clé → total, cumulée par `_pCumuler`. */
function bonusEclats(){
  const o={}, e=player.eclats||[];
  for(let i=0;i<5;i++) if(e[i]) o[ECLATS[i].t]=(o[ECLATS[i].t]||0)+ECLATS[i].v;
  if(etoileComplete()) o.dmgMult=(o.dmgMult||0)+ETOILE_DMGMULT;
  return o;
}
function spawnRelic(lvl,x,y){
  const n=lvl.actNum||0;
  lvl.relic={tx:x,ty:y,x:x*TS+TS/2,y:y*TS+TS/2,act:n,hp:3,destroyed:false,t:0,spawn:0};
  showBanner(t('relique.apparait'), t('relique.apparait.sub',{nom:nomRelique(n)}));
  toast(t('relique.materialise',{nom:nomRelique(n)}),3.4);
}
function hitRelic(){
  const R=level.relic; if(!R||R.destroyed)return;
  R.hp--; R.t=0.28; burst(R.x,R.y,RELICS[R.act].col,26); SFX.crit({x:R.x,y:R.y});
  if(R.hp>0){floatText(R.x,R.y-40,t('relique.fissure',{n:R.hp}),RELICS[R.act].col,true);return;}
  R.destroyed=true; relicDestroyed[R.act]=true; SFX.relique&&SFX.relique();
  burst(R.x,R.y,'#ffffff',60); burst(R.x,R.y,RELICS[R.act].col,60);
  showBanner(t('relique.detruite'), t('relique.detruite.sub',{nom:nomRelique(R.act)}));
  toast(tDiff('relique.brisee',{nom:nomRelique(R.act)}),3.6);
  player.gold+=200+R.act*150; gainXp(200+R.act*120);
  dropItem(R.x+20,R.y,makeItem(R.act>=3?'unique':'rare'));
  checkQuests&&checkQuests(); refreshHud();
  if(typeof jouerScene==='function')jouerScene('relique'+R.act);
}
function drawRelic(){
  const R=level.relic; if(!R||R.destroyed)return;
  if(level.seen[idx(level.w,R.tx,R.ty)]!==1)return;
  const sx=R.x-cam.x, sy=R.y-cam.y;
  if(sx<-80||sx>W+80||sy<-80||sy>H+80)return;
  const D=RELICS[R.act], t=performance.now()/1000, bob=Math.sin(t*2)*4, pulse=0.55+0.45*Math.sin(t*3.2);
  if(!drawRelic._im)drawRelic._im=['relique_1_sifflet','relique_2_rondelle','relique_3_medaille','relique_4_calice','relique_5_coupe']
    .map(k=>{const i=new Image();i.src=(MISC_ICON&&MISC_ICON[k])||'';return i;});
  const shake=R.t>0?rand(-3,3):0;
  ctx.save();
  // halo au sol
  ctx.fillStyle='rgba(0,0,0,0.42)';ctx.beginPath();ctx.ellipse(sx,sy+14,26,10,0,0,6.28);ctx.fill();
  ctx.fillStyle=D.col.replace(')',',0.16)').replace('#','rgba(')||'rgba(255,255,255,0.16)';
  ctx.globalAlpha=0.20+0.16*pulse;ctx.fillStyle=D.col;
  ctx.beginPath();ctx.ellipse(sx,sy+10,40,16,0,0,6.28);ctx.fill();ctx.globalAlpha=1;
  // socle
  ctx.fillStyle='#2b2f3e';ctx.beginPath();ctx.ellipse(sx,sy+6,20,8,0,0,6.28);ctx.fill();
  ctx.fillStyle='#3d4356';ctx.fillRect(sx-13,sy-10,26,16);
  const cy=sy-34+bob+shake;
  const _ri=drawRelic._im[R.act];
  if(_ri&&_ri.complete&&_ri.naturalWidth){const DR=58;ctx.save();ctx.shadowBlur=24;ctx.shadowColor=D.col;
    ctx.imageSmoothingEnabled=false;ctx.drawImage(_ri,sx-DR/2,cy-DR/2,DR,DR);ctx.restore();}
  else{
  ctx.shadowBlur=26;ctx.shadowColor=D.col;ctx.fillStyle=D.col;ctx.strokeStyle=D.col2;ctx.lineWidth=2;
  if(D.forme==='sifflet'){ctx.fillRect(sx-13,cy-6,22,12);ctx.beginPath();ctx.arc(sx+11,cy,6,0,6.28);ctx.fill();
    ctx.fillStyle=D.col2;ctx.fillRect(sx-6,cy-3,4,6);}
  else if(D.forme==='palet'){ctx.beginPath();ctx.ellipse(sx,cy,15,7,0,0,6.28);ctx.fill();
    ctx.fillStyle=D.col2;ctx.beginPath();ctx.ellipse(sx,cy-3,15,7,0,0,6.28);ctx.fill();}
  else if(D.forme==='medaille'){ctx.beginPath();ctx.arc(sx,cy,13,0,6.28);ctx.fill();
    ctx.fillStyle=D.col2;ctx.beginPath();ctx.arc(sx,cy,6,0,6.28);ctx.fill();
    ctx.strokeStyle=D.col;ctx.beginPath();ctx.moveTo(sx-7,cy-13);ctx.lineTo(sx,cy-24);ctx.lineTo(sx+7,cy-13);ctx.stroke();}
  else if(D.forme==='calice'){ctx.beginPath();ctx.moveTo(sx-12,cy-10);ctx.lineTo(sx+12,cy-10);ctx.lineTo(sx+6,cy+4);ctx.lineTo(sx-6,cy+4);ctx.closePath();ctx.fill();
    ctx.fillRect(sx-2,cy+4,4,10);ctx.fillRect(sx-9,cy+13,18,4);}
  else {ctx.beginPath();ctx.moveTo(sx-13,cy-12);ctx.lineTo(sx+13,cy-12);ctx.lineTo(sx+7,cy+2);ctx.lineTo(sx-7,cy+2);ctx.closePath();ctx.fill();
    ctx.fillRect(sx-3,cy+2,6,12);ctx.fillRect(sx-11,cy+13,22,5);
    ctx.strokeStyle=D.col;ctx.beginPath();ctx.arc(sx-15,cy-6,6,1.2,4.6);ctx.stroke();ctx.beginPath();ctx.arc(sx+15,cy-6,6,-1.5,1.9);ctx.stroke();}
  }
  ctx.shadowBlur=0;ctx.lineWidth=1;
  // libellé + PV
  ctx.textAlign='center';ctx.fillStyle=D.col;ctx.font='bold 12px Trebuchet MS';
  ctx.fillText(RELICS[R.act].nom,sx,sy+34);
  ctx.fillStyle='#e8ecf6';ctx.font='11px Trebuchet MS';
  ctx.fillText('Frappe-la — '+R.hp+' coup'+(R.hp>1?'s':''),sx,sy+48);
  ctx.textAlign='left';ctx.restore();
  if(R.t>0)R.t-=0.016;
}

/* ============ IDENTIFICATION · DURABILITÉ · MOTS RUNIQUES · CHARMES ============ */
/* --- Identification : rare et au-dessus tombent non identifiés --- */
function needsId(it){return it&&it.unid&&!it.identified;}
function identifyItem(it){
  if(!needsId(it))return false;
  if((player.scrollsId||0)<=0){toast(t('objet.pasDeParchemin'),2.6);return false;}
  player.scrollsId--; it.identified=true; delete it.unid;
  toast(t('objet.identifie')+' '+nomObjet(it).replace(/<[^>]+>/g,''),2.2); SFX.pickup&&SFX.pickup();
  renderInventory&&renderInventory(); renderShop&&(document.getElementById('shopPanel')||{}).style&&document.getElementById('shopPanel').style.display==='block'&&renderShop(); refreshHud&&refreshHud(); return true;
}
/* --- Durabilité --- */
function initDura(it){
  if(!it||it.slot==='gem'||it.slot==='charm')return it;
  if(it.duraMax==null){const base={white:40,magic:60,rare:80,unique:110,legendary:150}[it.rarity]||50;
    it.duraMax=base; it.dura=base;}
  return it;
}
/* ================================================================
   USURE — refondue en 8.66

   Elle était comptée AU COUP PORTÉ (10 %) et AU COUP REÇU (22 % sur les
   cinq pièces de protection à la fois). Deux défauts :

   1. Le coût suivait le nombre de coups nécessaires pour tuer — donc il a
      été multiplié par 2,5 le jour où j'ai remonté les PV des ennemis en
      8.54, sans que personne ne retouche la durabilité. À l'acte 3, tuer un
      ennemi demandait 15,6 coups : une arme de 60 points rendait l'âme
      toutes les 38 victimes.
   2. Bilan mesuré sur un acte entier, TOUTES recettes comprises (or des
      mobs, élites, tonneaux, coffres, revente) : la réparation prenait
      **76 % du revenu à l'acte 1 et 91 % à l'acte 5**. Le joueur travaillait
      pour la forgeronne.

   L'usure est désormais comptée à l'ENNEMI TUÉ pour l'arme, et sur UNE
   pièce au hasard quand on encaisse. Elle est ainsi indexée sur la
   progression, pas sur la santé des monstres : retoucher la courbe de
   difficulté ne déréglera plus l'économie.

   Cible retenue : la réparation coûte 10 à 20 % du revenu. */
const USURE_ARME=0.25;        // probabilité par ennemi tué
const USURE_PROT=0.08;        // probabilité par coup encaissé
const SLOTS_PROT=['armor','helm','gloves','belt','skates'];
function wearGear(slots,amount){
  for(const s of slots){const it=player.equip[s];if(!it||it.duraMax==null)continue;
    if(it.dura<=0)continue;
    it.dura=Math.max(0,it.dura-amount);
    if(it.dura===0)toast(t('objet.horsUsage',{nom:nomObjet(it).replace(/<[^>]+>/g,'')}),3);}
}
const isBroken=it=>it&&it.duraMax!=null&&it.dura<=0;
function repairCost(it){
  /* Indexée sur le niveau de la pièce : réparer une pièce de fin de jeu coûtait
     autant qu'une pièce de départ. */
  const niv=1+((it.ilvl||it.req||1))/20;
  return Math.round((it.duraMax-it.dura)*(1.2+({white:0,magic:0.4,rare:0.9,unique:1.6,legendary:2.6}[it.rarity]||0))*niv);}
const SLOTS_REPARABLES=['weapon','armor','amulet','ring','ring2','helm','gloves','belt','skates'];
/* Réparer UNE pièce. « Tout réparer » exigeait la somme complète : sans elle,
   on ne pouvait rien remettre en état, pas même l'arme. */
function repairOne(slot){
  const it=player.equip[slot];
  if(!it||it.duraMax==null||it.dura>=it.duraMax){toast(t('forge.rienIci'),1.2);return false;}
  const c=repairCost(it);
  if(player.gold<c){toast(t('forge.manqueOr',{or:c-player.gold}),2);return false;}
  player.gold-=c; it.dura=it.duraMax;
  toast(t('objet.repare',{nom:nomObjet(it).replace(/<[^>]+>/g,''),or:c}),2);
  renderShop&&renderShop();refreshHud();saveGame();
  return true;
}
function repairAll(){
  let tot=0;const list=[];
  for(const s of SLOTS_REPARABLES){
    const it=player.equip[s];if(it&&it.duraMax!=null&&it.dura<it.duraMax){tot+=repairCost(it);list.push(it);}}
  if(!list.length){toast(t('forge.rienAReparer'),1.4);return;}
  if(player.gold<tot){toast(t('forge.reparationTropCher',{or:tot}),2.4);return;}
  player.gold-=tot;for(const it of list)it.dura=it.duraMax;
  SFX.reparer&&SFX.reparer();toast(t('forge.equipementRepare',{or:tot}),2.4);renderShop&&renderShop();refreshHud();
}
/* Le nom et l'effet d'un mot runique, et le nom d'un charme, traduits.

   Un mot runique s'appelait « BANQUISE » : sixième faute §00 de ce chantier,
   et encore une source de texte joué que le crible ne regardait pas (§41).
   Renommé « GRAND GEL » — il n'est pas stocké, il se recalcule depuis les
   runes serties, donc rien à migrer.

   ⚠ LE NOM D'UN CHARME, LUI, EST DANS LA SAUVEGARDE (`it.name`) : il suit la
   règle des objets (§40) et passe par `nomObjet()`. Seule sa description
   d'effet passe ici. */
function nomMotRunique(rw){ return rw?tOu('runique.'+_cleObjet(rw.mot)+'.nom', rw.mot):''; }
function descMotRunique(rw){ return rw?tOu('runique.'+_cleObjet(rw.mot)+'.desc', rw.desc):''; }

/* --- Mots runiques : runes serties dans l'ordre --- */
const RUNEWORDS=[
 {mot:'SERMENT',   runes:['Rune El','Rune Sol'],              bonus:{dmgpct:25,crit:8},   desc:'+25% dégâts, +8% critique'},
 {mot:'GRAND GEL', runes:['Rune Ith','Rune Ort'],             bonus:{dmg:20,leech:4},     desc:'+20 dégâts, +4% vol de vie'},
 {mot:'DERNIER',   runes:['Rune Sol','Rune Ort','Rune El'],   bonus:{dmgpct:40,crit:12,leech:5}, desc:'+40% dégâts, +12% crit, +5% vol de vie'},
 {mot:'REMPART',   runes:['Rune Vael','Rune Orim'],           bonus:{def:60,block:10},    desc:'+60 défense, +10% blocage'},
 {mot:'FOSSE',     runes:['Rune Nyx','Rune Tarn','Rune Sköll'],bonus:{dmg:45,crit:15,leech:8}, desc:'+45 dégâts, +15% crit, +8% vol de vie'}
];
function runewordOf(it){
  if(!it||!it.sockets||it.sockets.some(s=>!s))return null;
  const noms=it.sockets.map(s=>s.name);
  for(const rw of RUNEWORDS){
    if(rw.runes.length!==noms.length)continue;
    if(rw.runes.every((r,i)=>noms[i]===r))return rw;
  }
  return null;
}
/* --- Charmes : agissent depuis le sac --- */
const CHARMS=[
 {name:'Petit Charme de Vigueur',  t:'vit', v:8,  ico:'🔹',img:'charme_petit'},
 {name:'Petit Charme d’Adresse',   t:'dex', v:8,  ico:'🔹',img:'charme_petit'},
 {name:'Charme de Force',          t:'str', v:12, ico:'🔷',img:'charme_moyen'},
 {name:'Charme du Braconnier',     t:'mf',  v:20, ico:'🔷',img:'charme_moyen'},
 {name:'Grand Charme de Rage',     t:'dmgpct', v:14, ico:'💠',img:'charme_grand'},
 {name:'Grand Charme du Gardien',  t:'def', v:35, ico:'💠',img:'charme_grand'}
];
function makeCharm(){const c=pick(CHARMS);
  return {uid:prochainUidCounter(),slot:'charm',kind:'charm',name:c.name,_base:c.name,ico:c.ico,rarity:'magic',
    img:c.img||null,plus:0,affixes:[],charm:{t:c.t,v:c.v},identified:true};}
function charmBonus(){
  const o={};
  for(const it of inventory){if(it&&it.charm)o[it.charm.t]=(o[it.charm.t]||0)+it.charm.v;}
  return o;
}



