


















/* ================================================================
   OUVRIR UN PANNEAU SUSPEND LA PARTIE                      (v8.78)

   Seuls les Paramètres suspendaient le jeu. On ne peut pourtant pas
   comparer deux objets, répartir des points ou lire une quête pendant
   qu'une meute avance : au doigt, le panneau couvre l'écran, on ne voit
   même pas ce qui arrive.

   La liste ci-dessous est celle des panneaux qui PRENNENT L'ÉCRAN. Le
   dialogue en fait partie : c'est un temps de récit, pas un temps de jeu.

   Un seul drapeau, `_pausePanneau`, partagé par tous : deux mécanismes
   concurrents finiraient par se marcher dessus et laisser la partie
   figée. `closeAllPanels` le relâche, quel que soit le chemin. */
const PANNEAUX_PAUSE=['invPanel','charPanel','skillPanel','treePanel','questPanel',
                      'shopPanel','stashPanel','waypointPanel','dialoguePanel','optPanel'];
function pauseOptions(actif){        // nom conservé : appelé depuis togglePanel
  if(actif){ if(!paused){setPaused(true);set_PauseOpt(true);} }
  else if(_pauseOpt){ setPaused(false);set_PauseOpt(false); }
  const po=document.getElementById('pauseOv');
  if(po)po.style.display=(paused&&!_pauseOpt)?'flex':'none';   // pas de voile par-dessus le panneau
  const pt=document.getElementById('pauseTag');
  if(pt)pt.classList.toggle('on',!!(paused&&_pauseOpt));       // le voile ET le témoin ne coexistent pas
}
/* Y a-t-il, à cet instant, un panneau ouvert qui doit suspendre la partie ? */
function _panneauOuvert(){
  for(const id of PANNEAUX_PAUSE){
    const el=document.getElementById(id);
    if(el&&el.style.display&&el.style.display!=='none')return true;
  }
  return false;
}
/* Appelée après CHAQUE ouverture ou fermeture : on relit l'état réel de
   l'interface au lieu de tenir un compte, qui finit toujours par dériver. */
function majPausePanneau(){ pauseOptions(_panneauOuvert()); }
/* Sur un écran court (iPhone en paysage), ouvrir Perso ET Sac côte à côte
   masque tout le jeu et tronque les deux. On n'en ouvre qu'un. */
const ECRAN_COURT=()=>{try{return matchMedia('(max-height:520px)').matches;}catch(e){return false;}};
/* Sac + Perso côte à côte : le sac est passé à deux colonnes et fait jusqu'à
   640 px. En dessous de 1110 px de large, les deux panneaux se recouvriraient —
   on n'en montre alors qu'un seul. 344 (Perso) + 640 (Sac) + navigation + marges. */
const ECRAN_ETROIT=()=>{try{return matchMedia('(max-width:1109px)').matches;}catch(e){return false;}};
function togglePanel(id){const el=document.getElementById(id);const open=el.style.display&&el.style.display!=='none';
  /* Le sac a droit à son propre bruit de cuir ; les autres panneaux se
     contentent d'un souffle, sous peine de fatiguer. La FERMETURE est
     gérée par closeAllPanels — ici, on ne sonne que l'ouverture. */
  closeAllPanels();
  if(!open){
    try{ if(id==='invPanel'||id==='stashPanel')SFX.sacOuvre&&SFX.sacOuvre();
         else SFX.panneau&&SFX.panneau(true); }catch(e){}
    el.style.display=_showMode(id);
    const _duo=!ECRAN_COURT()&&!ECRAN_ETROIT();
    if(id==='invPanel'){renderInventory();if(_duo)document.getElementById('charPanel').style.display='flex';}
    /* L'ONGLET PERSONNAGE N'OUVRE PLUS L'INVENTAIRE.               (v9.07)

       Sur grand écran, les deux onglets ouvraient la MÊME paire : Personnage
       tirait l'inventaire, et l'inventaire tirait le personnage. Les deux
       boutons donnaient donc exactement le même écran.
       La règle voulue, rappelée par Mirja : Personnage ouvre le personnage,
       Inventaire ouvre l'inventaire ET le personnage à côté, sur PC. */
    if(id==='charPanel'){renderInventory();setCharTab(charTab||'eq');updateBadges();}
    if(id==='skillPanel')renderSkillPanel();if(id==='optPanel'){renderOptions();}   /* la pause vient de majPausePanneau */if(id==='treePanel')renderTree();if(id==='charPanel')renderParagon();if(id==='questPanel'){questNew=0;updateQuestBadge();renderQuests();}refreshHud();}
  if(typeof majPausePanneau==='function')majPausePanneau();
  if(typeof updateTabs==='function')updateTabs();}
/* Onglets internes du panneau Perso : chaque section tient dans la hauteur fixe. */
function setCharTab(k){
  document.querySelectorAll('#charPanel .ptab').forEach(t=>t.classList.toggle('sel',t.dataset.ptab===k));
  document.querySelectorAll('#charPanel .psec').forEach(s=>s.classList.toggle('on',s.dataset.psec===k));
  const b=document.querySelector('#charPanel .pbody'); if(b)b.scrollTop=0;
  if(k==='para')renderParagon();
  charTab=k;
}
let charTab='eq';
const PANNEAUX_FERMABLES=['invPanel','charPanel','skillPanel','treePanel','shopPanel',
  'stashPanel','waypointPanel','questPanel','dialoguePanel','optPanel'];
function closeAllPanels(){fermerConfirmation();
  /* LE SON DE FERMETURE SE JOUE ICI, et nulle part ailleurs.      (v9.00)
     La croix ✕, la touche Échap, le bouton de la boutique et le coffre
     appellent tous `closeAllPanels` DIRECTEMENT, sans passer par
     `togglePanel` : le son posé dans `togglePanel` ne se déclenchait donc
     qu'à la fermeture par l'onglet. En le remontant au seul point de
     passage commun, tous les chemins sont couverts d'un coup. */
  try{
    let sac=false, autre=false;
    for(const id of PANNEAUX_FERMABLES){
      const e=document.getElementById(id);
      if(e&&e.style.display&&e.style.display!=='none'){
        if(id==='invPanel'||id==='stashPanel')sac=true; else autre=true;
      }
    }
    if(sac)      SFX.sacFerme&&SFX.sacFerme();
    else if(autre)SFX.panneau&&SFX.panneau(false);
  }catch(e){}
  PANNEAUX_FERMABLES.forEach(id=>document.getElementById(id).style.display='none');
  pauseOptions(false);          /* APRÈS la fermeture : sinon `_panneauOuvert`
                                   verrait encore un panneau visible */
  hideTip();
  if(typeof updateTabs==='function')updateTabs();}

/* ---------------- BOUTIQUES (marchand / forgeron) ---------------- */
let shopNpc=null;let socketSel=-1;
function itemIco(it){
  if(it.img&&typeof MISC_ICON!=='undefined'&&MISC_ICON[it.img]){const _s=gemPx(it,26);return '<img src="'+MISC_ICON[it.img]+'" style="width:'+_s+'px;height:'+_s+'px;vertical-align:middle;image-rendering:pixelated">';}
  if(it.img){const _h=iconeObjetHtml(it.img,28);if(_h)return _h;}
  /* `it.ico` vient de la sauvegarde : il est échappé comme le reste. */
  return echapperHtml(it.ico);
}
function gemIco(gr){
  const key=gr.img||((GEMS.find(x=>x.name===gr.base)||{}).img);
  const _s=gemPx({slot:'gem',kind:gr.kind||'gem',fuse:gr.fuse},22);
  if(key&&MISC_ICON[key])return '<img src="'+MISC_ICON[key]+'" style="width:'+_s+'px;height:'+_s+'px;vertical-align:middle;image-rendering:pixelated">';
  if(key&&typeof ITEM_ICON_URL!=='undefined'&&ITEM_ICON_URL[key])return '<img src="'+ITEM_ICON_URL[key]+'" style="width:22px;height:22px;vertical-align:middle">';
  return gr.ico;
}
function openShop(npc){
  shopNpc=npc;closeAllPanels();SFX.panneau&&SFX.panneau(true);
  const _pk=(typeof NPC_KEY!=='undefined'&&NPC_KEY[npc.name])||(npc.type==='smith'?'bruna':'garrek');
  const _pi=(typeof POR!=='undefined'&&POR[_pk])?MISC_ICON[POR[_pk]]:null;
  document.getElementById('shopTitle').innerHTML=
    (_pi?'<img src="'+_pi+'" style="width:44px;height:44px;vertical-align:-12px;margin-right:8px;border-radius:6px;border:1px solid #3a4a72;background:#0d1322;image-rendering:pixelated">'
        :(npc.type==='smith'?'🔨 ':'🛒 '))+nomPnj(npc).toUpperCase();
  renderShop();document.getElementById('shopPanel').style.display='block';refreshHud();
  if(typeof majPausePanneau==='function')majPausePanneau();
}
function fuseGems(base,tier){
  const idxs=[];for(let i=0;i<inventory.length;i++){const g=inventory[i];if(g.slot==='gem'&&(g._base||g.name)===base&&(g.tier||1)===tier)idxs.push(i);}
  if(idxs.length<3){toast(t('boutique.troisGemmes'),1.4);return;}
  const cost=Math.round(80*Math.pow(2,tier-1));
  if(player.gold<cost){toast(t('boutique.pasAssezOr'),1.2);return;}
  player.gold-=cost;const src=inventory[idxs[0]];
  const ng={uid:prochainUidCounter(),slot:'gem',kind:src.kind,_base:base,tier:tier+1,fuse:(src.kind==='gem'?tier+1:1),ico:src.ico,rarity:src.rarity,img:src.img||null,plus:0,affixes:[],sock:{t:src.sock.t,v:Math.round(src.sock.v*1.7)}};
  ng.name=base+' ★'+(tier+1);
  idxs.slice(0,3).sort((a,b)=>b-a).forEach(i=>inventory.splice(i,1));
  inventory.push(ng);toast('Fusion : '+ng.name+' ('+affixText({t:ng.sock.t,v:ng.sock.v}).replace(/<[^>]+>/g,'')+')',2.4);SFX.pickup();
}
/* PUITS D'OR PROFOND. Le jeu n'avait aucun poste capable d'absorber des
   dizaines de milliers d'or. Reforger la MÊME pièce coûte 1,6 fois plus cher à
   chaque tentative : la chasse au bon jet devient un gouffre assumé. Le compteur
   vit sur l'objet, il part donc dans la sauvegarde. */
function reforgeCost(it){
  const base=(150+((it.ilvl||it.req||1))*14)*(({magic:1,rare:1.7,unique:2.6})[it.rarity]||1);
  return Math.round(base*Math.pow(1.6,(it.reforges||0)));}
function reforgeItem(it){
  it.reforges=(it.reforges||0)+1;   // le prix de la PROCHAINE reforge monte
  const lv=1+((it.ilvl||it.req||1)-1)*0.045;const RM=({white:1,magic:1.15,rare:1.35,unique:1.65})[it.rarity]||1;
  const ac=RAR[it.rarity].aff;const naff=randi(ac[0],ac[1]);const p=[...AFFIX];const aff=[];
  for(let i=0;i<naff&&p.length;i++){const a=p.splice(randi(0,p.length-1),1)[0];aff.push({t:a.t,v:Math.max(1,Math.round(randi(a.min,a.max)*lv*RM))});}
  it.affixes=aff;
}
function gambleItem(){
  const L=player.lvl;const r=alea();let rar='magic';
  if(L>=8&&r<0.05)rar='unique';else if(L>=8&&r<0.28)rar='rare';else if(r<0.70)rar='magic';else rar='white';
  const it=makeItem(rar,null,L);
  if(!sacPlein(it)){inventory.push(it);toast('🎁 '+nomRarete(it.rarity)+' : '+nomObjet(it).replace(/<[^>]+>/g,''),2.6);SFX.pickup();}
  else toast(t('boutique.sacPlein'),1.4);
}
/* Vignette d'article de boutique. Les parchemins avaient leur sprite, les
   potions et les charmes étaient restés en emoji : incohérent dans une même
   liste. Une seule fonction pour tout le monde, avec repli sur l'emoji si
   l'icône manque. */
function icoBoutique(cle,secours){
  const u=(typeof MISC_ICON!=='undefined')&&MISC_ICON[cle];
  return u?('<img src="'+u+'" style="width:26px;height:26px;vertical-align:middle;image-rendering:pixelated">')
          :(secours||'');
}
let smithTab='reparation';
/* La haute rune choisie pour la gravure, par son rang dans le sac. Même
   convention que `socketSel` du sertissage — et même piège : c'est un INDEX,
   donc il doit être remis à -1 dès que le sac change. */
let gravureSel=-1;
function setSmithTab(k){smithTab=k;}   /* pour les tests */
/* LES ONGLETS DE LA FORGERONNE.
   Six sections empilées dans une seule colonne : réparation, réentraînement,
   amélioration, reforge, fusion, sertissage, démontage. On descendait
   indéfiniment pour trouver le sertissage. Chaque famille a son onglet ;
   `fg(cle)` rend le conteneur de l'onglet, et le code de construction de
   chaque section n'a pas bougé d'une ligne. */
function _fgOnglets(racine, defs){
  const cont={};
  const barre=document.createElement('div');
  barre.style.cssText='display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px';
  for(const [cle,lbl] of defs){
    const b=document.createElement('button');
    const actif=(smithTab===cle);
    b.style.cssText='flex:1 1 auto;min-height:30px;padding:5px 8px;font-size:11px;border-radius:6px;cursor:pointer;'
      +'border:1px solid '+(actif?'#caa53a':'#3a4a72')+';background:'+(actif?'#2a2410':'#141a2e')
      +';color:'+(actif?'#f4d35e':'#8ea0c8')+(actif?';font-weight:bold':'');
    b.textContent=lbl;
    b.onclick=((k)=>()=>{smithTab=k;vibrer(VIB.toucher);renderShop();})(cle);
    barre.appendChild(b);
    const d=document.createElement('div'); d.style.display=(actif?'block':'none');
    cont[cle]=d;
  }
  racine.appendChild(barre);
  for(const k in cont)racine.appendChild(cont[k]);
  return function fg(cle){ return cont[cle]||racine; };
}

/* La réplique du marchand ou de la forgeronne, tirée au sort à chaque
   ouverture. */
function _shopReplique(body){
  /* Quatre répliques par commerçant, tirées au sort. Elles passent par des
     clés numérotées plutôt que par une table de chaînes : c'est le seul moyen
     d'en avoir quatre en anglais AUSSI, sans les recopier en français. */
  const nb=(shopNpc.type==='merchant'||shopNpc.type==='smith')?4:0;
  if(nb){const q=document.createElement('div');q.style.cssText='font-size:11px;color:#93a1c4;font-style:italic;margin-bottom:8px';
    q.textContent=tDiff('boutique.'+shopNpc.type+'.'+randi(0,nb-1));body.appendChild(q);}
}

/* UN ARTICLE À VENDRE. Six blocs du marchand étaient bâtis sur ce moule, à
   l'identique : une ligne, une icône, un nom, une aide, un bouton avec le
   prix, et une action qui débite l'or puis reconstruit le panneau. */
function _shopArticle(body, icoHtml, titre, aide, libelle, cout, bloque, action){
  const li=document.createElement('div');li.className='shopItem';
  li.innerHTML='<div class="info">'+icoHtml+' <b>'+titre+'</b><br><span style="color:#8ea0c8">'+aide+'</span></div>';
  const b=document.createElement('button');
  b.innerHTML=libelle+' <span class="gi"></span>'+cout;
  b.disabled=bloque;
  b.onclick=action;
  li.appendChild(b);body.appendChild(li);
}

/* Ce que le marchand vend. Le son d'achat manque volontairement sur la potion
   de soin : c'est ainsi depuis l'origine, on ne le change pas ici. */
/* LES SIX ARTICLES DU MARCHAND ÉTAIENT SIX BLOCS IDENTIQUES.  (Phase 4)
   Même ligne, même icône, même bouton, même débit d'or, même reconstruction —
   trente lignes recopiées. Ils passent tous par `_shopArticle`. Seul le
   « sec1 Acheter » d'en-tête a disparu ? Non : il est conservé ci-dessous. */
function _shopAchats(body){
  const sec1=document.createElement('div');sec1.className='shopSec';sec1.textContent=t('boutique.acheter');body.appendChild(sec1);
  const A=_shopArticle;
  const cPot=prixPotion();
  A(body,icoBoutique('pot_heal','🧪'),t('boutique.potSoin.nom'),t('boutique.potSoin.aide'),t('boutique.potSoin.bouton'),cPot,
    player.gold<cPot,
    /* Pas de SFX.acheter ici, et c'est ainsi depuis l'origine : les cinq autres
       articles en jouent un, la potion de soin non. Conservé tel quel. */
    ()=>{if(player.gold>=cPot){player.gold-=cPot;player.potions++;toast(t('boutique.potSoin.ok'),1.2);renderShop();refreshHud();}});
  const cMan=prixMana();
  A(body,icoBoutique('pot_mana','🔵'),t('boutique.potMana.nom'),t('boutique.potMana.aide'),t('boutique.potMana.bouton'),cMan,
    player.gold<cMan,
    ()=>{if(player.gold>=cMan){player.gold-=cMan;SFX.acheter&&SFX.acheter();player.manaPots++;toast(t('boutique.potMana.ok'),1.2);renderShop();refreshHud();}});
  const cPor=prixPortail();
  A(body,icoBoutique('scroll_return','📜'),t('boutique.parchRetour.nom'),t('boutique.parchRetour.aide'),t('boutique.parchRetour.bouton'),cPor,
    player.gold<cPor,
    ()=>{if(player.gold>=cPor){player.gold-=cPor;SFX.acheter&&SFX.acheter();player.portals++;toast(t('boutique.parchRetour.ok'),1.2);renderShop();refreshHud();}});
  const cId=prixIdent();
  A(body,icoBoutique('parchemin_identification','🔎'),t('boutique.parchIdent.nom'),t('boutique.parchIdent.aide'),t('boutique.parchIdent.bouton'),cId,
    player.gold<cId,
    ()=>{if(player.gold>=cId){player.gold-=cId;SFX.acheter&&SFX.acheter();player.scrollsId=(player.scrollsId||0)+1;toast(t('boutique.parchIdent.ok'),1.2);renderShop();refreshHud();}});
  const ccost=Math.round(600+player.lvl*60);
  A(body,icoBoutique('charme_moyen','🔷'),t('boutique.charme.nom'),t('boutique.charme.aide'),t('boutique.charme.bouton'),ccost,
    player.gold<ccost||placesUtilisees()>=invCap,
    ()=>{if(player.gold>=ccost&&placesUtilisees()<invCap){player.gold-=ccost;SFX.acheter&&SFX.acheter();inventory.push(makeCharm());toast(t('boutique.charme.ok'),1.4);renderShop();renderInventory();refreshHud();}});
  const gcost=Math.round(200+player.lvl*25);
  A(body,icoBoutique('arena_chest_closed','🎁'),t('boutique.mystere.nom'),t('boutique.mystere.aide'),t('boutique.mystere.bouton'),gcost,
    player.gold<gcost,
    ()=>{if(player.gold>=gcost){player.gold-=gcost;gambleItem();renderShop();renderInventory();refreshHud();}});
}

function _shopVente(body){
  // vendre
  const sec2=document.createElement('div');sec2.className='shopSec';sec2.textContent=t('boutique.vendre');body.appendChild(sec2);
  const _sell=inventory.filter(x=>x.slot&&x.slot!=='gem');
  if(_sell.length){const all=document.createElement('div');all.className='shopItem';
    const totv=_sell.reduce((a,x)=>a+sellValue(x),0);
    all.innerHTML='<div class="info"><span class="gi"></span> <b>'+t('boutique.toutVendre')+'</b><br><span style="color:#8ea0c8">'+t('boutique.toutVendre.aide')+'</span></div>';
    const ba=document.createElement('button');ba.innerHTML=t('boutique.vendreTout')+' <span class="gi"></span>'+totv;
    ba.onclick=()=>{let g=0;for(let i=inventory.length-1;i>=0;i--){const it=inventory[i];if(it.slot&&it.slot!=='gem'){g+=sellValue(it);inventory.splice(i,1);}}player.gold+=g;setInvSel(-1);SFX.vendre&&SFX.vendre();toast(t('boutique.toutVendu',{or:g}),2);SFX.gold();renderShop();renderInventory();refreshHud();};
    all.appendChild(ba);body.appendChild(all);}
  if(!inventory.length)body.insertAdjacentHTML('beforeend','<div style="font-size:11px;color:#6b789c">'+t('boutique.sacVide')+'</div>');
  inventory.forEach((it,i)=>{
    const row=document.createElement('div');row.className='shopItem';
    row.innerHTML=`<div class="info">${itemIco(it)} ${itemLabel(it)}</div>`;
    const b=document.createElement('button');b.innerHTML=t('boutique.vendreUn')+' <span class="gi"></span>'+sellValue(it);
    b.onclick=()=>{player.gold+=sellValue(it);inventory.splice(i,1);setInvSel(-1);SFX.vendre&&SFX.vendre();toast(t('boutique.vendu',{or:sellValue(it)}),1.3);renderShop();renderInventory();refreshHud();};
    row.appendChild(b);row.onmouseenter=e=>showTip(e,it);bindLongPress(row,it);row.onmousemove=moveTip;row.onmouseleave=hideTip;
    body.appendChild(row);});
}

function _shopMarchand(body){
  _shopAchats(body);
  _shopVente(body);
}

function _forgeReparation(body){
  const resp=document.createElement('div');resp.className='shopItem';
  resp.innerHTML='<div class="info">♻️ <b>'+t('forge.reentrainement')+'</b><br><span style="color:#8ea0c8">'+t('forge.reentrainement.aide')+'</span></div>';
  const brs=document.createElement('button');brs.innerHTML='<span class="gi"></span>250';brs.disabled=player.gold<250;
  brs.onclick=()=>{if(player.gold>=250){player.gold-=250;
    player.statPts+=(player.baseStr-10)+(player.baseDex-10)+(player.baseVit-10)+(player.baseEne-10);
    player.baseStr=player.baseDex=player.baseVit=player.baseEne=10;
    let tn=0;for(const id in player.tree){if(player.tree[id]){tn++;player.tree[id]=0;}}player.treePts+=tn;computeTreeBonus();
    toast(t('forge.reentrainement.ok'),1.8);renderShop();refreshHud();renderSkillBar();}};
  resp.appendChild(brs);body.appendChild(resp);
  const rep=document.createElement('div');rep.className='shopItem';
  let rtot=0;for(const s of ['weapon','armor','amulet','ring','ring2','helm','gloves','belt','skates']){const it=player.equip[s];if(it&&it.duraMax!=null&&it.dura<it.duraMax)rtot+=repairCost(it);}
  rep.innerHTML='<div class="info">🔨 <b>'+t('forge.reparerTout')+'</b><br><span style="color:#8ea0c8">'+(rtot?(t('forge.cout')+' <span class="gi"></span>'+rtot):t('forge.parfaitEtat'))+'</span></div>';
  const brp=document.createElement('button');brp.innerHTML=rtot?(t('forge.toutReparer')+' <span class="gi"></span>'+rtot):t('forge.rienAFaire');brp.disabled=!rtot||player.gold<rtot;
  brp.onclick=()=>repairAll();rep.appendChild(brp);body.appendChild(rep);
  /* Pièce par pièce : avec 300 or et 900 de réparation totale, on doit
     pouvoir au moins remettre l'arme en état. */
  for(const s of SLOTS_REPARABLES){
    const it=player.equip[s];
    if(!it||it.duraMax==null||it.dura>=it.duraMax)continue;
    const c=repairCost(it);
    const li=document.createElement('div');li.className='shopItem';
    const usee=(it.dura<=0);
    li.innerHTML='<div class="info">'+(usee?'⚠ ':'')+'<b>'+echapperHtml(nomObjet(it))+'</b><br>'+
      '<span style="color:'+(usee?'#ff8a6a':'#8ea0c8')+'">'+t('forge.solidite',{a:it.dura,b:it.duraMax})+
      (usee?t('forge.horsUsage'):'')+'</span></div>';
    const b=document.createElement('button');
    b.innerHTML=t('forge.reparer')+' <span class="gi"></span>'+c;
    b.disabled=player.gold<c;
    b.onclick=((_s)=>()=>repairOne(_s))(s);
    li.appendChild(b);body.appendChild(li);
  }
}

function _forgeAmelioration(body){
  const sec1=document.createElement('div');sec1.className='shopSec';sec1.textContent=t('forge.ameliorer');body.appendChild(sec1);
  let any=false;
  for(const slot of['weapon','armor','amulet','ring','skates']){const it=player.equip[slot];if(!it)continue;any=true;
    const c=upgradeCost(it);const max=(it.plus||0)>=5;const lock=!max&&upgradeLocked(it);const need=upgradeNeed(it);
    const row=document.createElement('div');row.className='shopItem';
    row.innerHTML=`<div class="info">${itemIco(it)} ${itemLabel(it)}<br><span style="color:#8ea0c8">${max?t('forge.ameliorationMax'):(lock?t('forge.requiertEchos',{n:need,echos:need>1?t('forge.echos'):t('forge.echo'),as:echoesKilled()}):(t('forge.cout')+' ❄'+c.frags+' + <span class="gi"></span>'+c.gold))}</span></div>`;
    const b=document.createElement('button');b.textContent=max?t('forge.max'):(lock?('🔒 '+need+' '+t('forge.echos')):t('forge.ameliorerBouton'));
    b.disabled=max||lock||player.frags<c.frags||player.gold<c.gold;
    b.onclick=()=>{if(lock){toast(t('forge.refus',{n:need,echos:need>1?t('forge.echos'):t('forge.echo')}),2.4);return;}if(!max&&player.frags>=c.frags&&player.gold>=c.gold){player.frags-=c.frags;player.gold-=c.gold;it.plus=(it.plus||0)+1;
      toast(t('objet.ameliore',{nom:nomObjet(it).replace(/<[^>]+>/g,''),n:it.plus}),1.8);burst(player.x,player.y,'#f4d35e',16);renderShop();refreshHud();}};
    row.appendChild(b);row.onmouseenter=e=>showTip(e,it,true);bindLongPress(row,it,true);row.onmousemove=moveTip;row.onmouseleave=hideTip;
    body.appendChild(row);}
  if(!any)body.insertAdjacentHTML('beforeend','<div style="font-size:11px;color:#6b789c">'+t('forge.rienAAmeliorer')+'</div>');
}

function _forgeReforge(body){
  const secR=document.createElement('div');secR.className='shopSec';secR.innerHTML=t('forge.reforger')+' <span class="gi"></span>';body.appendChild(secR);
  let anyR=false;
  inventory.forEach((it,i)=>{ if(it.slot==='gem'||it.rarity==='white')return; anyR=true;
    const cost=reforgeCost(it);const row=document.createElement('div');row.className='shopItem';
    row.innerHTML=`<div class="info">${itemIco(it)} ${itemLabel(it)}<br><span style="color:#8ea0c8">Relance ${RAR[it.rarity].aff[0]}-${RAR[it.rarity].aff[1]} affixes · <span class="gi"></span>${cost}</span></div>`;
    const b=document.createElement('button');b.innerHTML=t('forge.reforgerBouton')+' <span class="gi"></span>'+cost;b.disabled=player.gold<cost;
    b.onclick=()=>{if(player.gold>=cost){player.gold-=cost;SFX.acheter&&SFX.acheter();reforgeItem(it);toast(t('forge.reforge'),1.6);burst(player.x,player.y,'#8fd0ff',16);renderShop();renderInventory();refreshHud();}};
    row.appendChild(b);row.onmouseenter=e=>showTip(e,it);bindLongPress(row,it);row.onmousemove=moveTip;row.onmouseleave=hideTip;body.appendChild(row);});
  if(!anyR)body.insertAdjacentHTML('beforeend','<div style="font-size:11px;color:#6b789c">'+t('forge.rienAReforger')+'</div>');
}

function _forgeSertissage(body){
  const secF=document.createElement('div');secF.className='shopSec';secF.innerHTML=t('forge.fusionner')+' <span class="gi"></span>';body.appendChild(secF);
  const grps={};inventory.forEach(g=>{if(g.slot!=='gem')return;const bs=g._base||g.name,tr=g.tier||1,k=bs+'|'+tr;grps[k]=grps[k]||{base:bs,tier:tr,ico:g.ico,img:g.img,kind:g.kind,fuse:fuseLevel(g),v:g.sock.v,t:g.sock.t,n:0};grps[k].n++;});
  let anyF=false;
  Object.values(grps).forEach(gr=>{if(gr.n<3)return;anyF=true;const cost=Math.round(80*Math.pow(2,gr.tier-1)),nv=Math.round(gr.v*1.7);
    const row=document.createElement('div');row.className='shopItem';
    row.innerHTML=`<div class="info">${gemIco(gr)} <b>${gr.base}${gr.tier>1?' ★'+gr.tier:''}</b> ×${gr.n}<br><span style="color:#8ea0c8">3 → ${affixText({t:gr.t,v:nv})} · <span class="gi"></span>${cost}</span></div>`;
    const b=document.createElement('button');b.innerHTML=t('forge.fusionnerBouton')+' <span class="gi"></span>'+cost;b.disabled=player.gold<cost;
    b.onclick=()=>{fuseGems(gr.base,gr.tier);renderShop();renderInventory();refreshHud();};
    row.appendChild(b);body.appendChild(row);});
  if(!anyF)body.insertAdjacentHTML('beforeend','<div style="font-size:11px;color:#6b789c">'+t('forge.fusionAide')+'</div>');
  const secS=document.createElement('div');secS.className='shopSec';secS.textContent=t('forge.sertir');body.appendChild(secS);
  const socks=[];inventory.forEach((it,i)=>{if(it.slot==='gem')socks.push([it,i]);});
  if(!socks.length)body.insertAdjacentHTML('beforeend','<div style="font-size:11px;color:#6b789c">'+t('forge.rienASertir')+'</div>');
  else{
    socks.forEach(([it,i])=>{const row=document.createElement('div');row.className='shopItem';
      if(socketSel===i)row.style.borderColor='#f4d35e';
      row.innerHTML=`<div class="info">${itemIco(it)} ${itemLabel(it)} — ${affixText({t:it.sock.t,v:it.sock.v})}</div>`;
      const bb=document.createElement('button');bb.textContent=(socketSel===i?t('forge.choisi'):t('forge.choisir'));
      bb.onclick=()=>{socketSel=(socketSel===i?-1:i);renderShop();};row.appendChild(bb);body.appendChild(row);});
    for(const slot of['weapon','armor','amulet','ring','ring2','helm','gloves','belt','skates']){const it=player.equip[slot];
      if(!it||!it.sockets||!it.sockets.some(s=>!s))continue;
      const row=document.createElement('div');row.className='shopItem';
      row.innerHTML=`<div class="info">${itemIco(it)} ${itemLabel(it)} — châsses ${it.sockets.map(s=>s?'●':'○').join(' ')}</div>`;
      const bb=document.createElement('button');bb.textContent=t('forge.sertirIci');bb.disabled=socketSel<0;
      bb.onclick=()=>{if(socketSel<0)return;const g=inventory[socketSel];if(!g||g.slot!=='gem')return;
        const k=it.sockets.findIndex(s=>!s);if(k<0)return;it.sockets[k]=g;inventory.splice(socketSel,1);socketSel=-1;
        SFX.sertir&&SFX.sertir();toast('Serti : '+g.name,1.6);renderShop();refreshHud();renderInventory();};
      row.appendChild(bb);body.appendChild(row);}
  }
}

/* ── LA GRAVURE D'ÉCHO ──────────────────────────────── phase 3, v9.47

   La mécanique est dans `12-arene.js` (`graver`, `rangGravureMax`) et son effet
   dans `_pEquipement`. Ici, l'interface — sans quoi le joueur n'avait aucun
   moyen d'appeler la fonction, et une mécanique qu'on ne peut pas déclencher
   n'existe pas.

   ⚠ ON DIT POURQUOI C'EST REFUSÉ, PAS SEULEMENT QUE C'EST REFUSÉ. Quatre
   raisons de ne pas pouvoir graver — aucun palier franchi, aucune haute rune,
   pièce déjà gravée, rien d'équipé — et un bouton grisé sans explication est
   la façon la plus sûre de faire croire à un bogue. */
/* ── LA REFORGE DES CINQ ÉCLATS ─────────────── chantier C bis, v9.48

   ⚠ SANS INTERFACE, LA MÉCANIQUE N'EXISTE PAS. La v9.46 avait livré `graver()`
   avec 22 contrôles verts et aucun bouton pour l'appeler ; on ne refait pas
   deux fois la même erreur (règle 79).

   Et comme pour la gravure, l'onglet DIT POURQUOI il refuse — ici il y a
   quatre raisons possibles, et l'une d'elles (« rebrise d'abord la relique »)
   est le cœur du chantier : elle envoie le joueur refaire l'acte. */
function _forgeEclats(body){
  const sec=document.createElement('div');sec.className='shopSec';
  sec.textContent=t('forge.eclats');body.appendChild(sec);

  if(difficulty<1){
    body.insertAdjacentHTML('beforeend',
      '<div style="font-size:11px;color:#6b789c">'+t('forge.eclats.pasEncore')+'</div>');
    return;
  }
  const n=eclatsReforges();
  body.insertAdjacentHTML('beforeend',
    '<div style="font-size:11px;color:'+(n>=5?'#c46ee0':'#8ea0c8')+';margin-bottom:6px">'
    +(n>=5?t('forge.eclats.complete'):t('forge.eclats.compte',{n:n}))+'</div>');

  for(let i=0;i<ECLATS.length;i++){
    const E=ECLATS[i], c=coutReforge(i), fait=!!(player.eclats||[])[i];
    const row=document.createElement('div');row.className='shopItem';
    let etat;
    if(fait) etat='<span style="color:#c46ee0">'+t('forge.eclats.reforge')+' — '
                  +affixText({t:E.t,v:E.v})+'</span>';
    else if(!relicDestroyed[i]) etat='<span style="color:#6b789c">'
                  +t('forge.eclats.rebrise',{nom:nomRelique(i)})+'</span>';
    else etat='<span style="color:#8ea0c8">'+affixText({t:E.t,v:E.v})
              +' · '+t('forge.cout')+' ❄'+c.frags+' + <span class="gi"></span>'+c.gold+'</span>';
    row.innerHTML='<div class="info"><b style="color:'+couleurSure(RELICS[i].col)+'">'
      +echapperHtml(E.nom)+'</b><br>'+etat+'</div>';
    const b=document.createElement('button');
    b.textContent=fait?t('forge.eclats.fait'):t('forge.eclats.bouton');
    b.disabled=!peutReforger(i);
    b.onclick=()=>{ if(reforgerEclat(i)){
      SFX.relique&&SFX.relique();
      toast(t('forge.eclats.ok',{nom:E.nom}),2.2);
      renderShop();refreshHud();renderInventory(); } };
    row.appendChild(b);body.appendChild(row);
  }
}

function _forgeGravure(body){
  const rang=(typeof rangGravureMax==='function')?rangGravureMax():0;
  const sec=document.createElement('div');sec.className='shopSec';
  sec.textContent=t('forge.graver');body.appendChild(sec);

  if(rang<=0){
    body.insertAdjacentHTML('beforeend',
      '<div style="font-size:11px;color:#6b789c">'+t('forge.gravure.pasDePalier')+'</div>');
    return;
  }
  body.insertAdjacentHTML('beforeend',
    '<div style="font-size:11px;color:#8ea0c8;margin-bottom:6px">'
    +t('forge.gravure.rang',{n:rang})+'</div>');

  /* Les hautes runes du sac. Une gemme ou une rune ordinaire ne grave pas :
     `graver` les refuse déjà, mais les afficher ici serait une invitation. */
  const runes=[];
  inventory.forEach((it,i)=>{ if(it.kind==='rune'&&it.tier===2&&it.sock)runes.push([it,i]); });
  if(!runes.length){
    body.insertAdjacentHTML('beforeend',
      '<div style="font-size:11px;color:#6b789c">'+t('forge.gravure.pasDeRune')+'</div>');
    return;
  }
  runes.forEach(([it,i])=>{
    const row=document.createElement('div');row.className='shopItem';
    if(gravureSel===i)row.style.borderColor='#f4d35e';
    row.innerHTML='<div class="info">'+itemIco(it)+' '+itemLabel(it)+' — '
      +affixText({t:it.sock.t,v:it.sock.v*rang})+'</div>';
    const b=document.createElement('button');
    b.textContent=(gravureSel===i?t('forge.choisi'):t('forge.choisir'));
    b.onclick=()=>{gravureSel=(gravureSel===i?-1:i);renderShop();};
    row.appendChild(b);body.appendChild(row);
  });

  const sec2=document.createElement('div');sec2.className='shopSec';
  sec2.textContent=t('forge.gravure.surQuoi');body.appendChild(sec2);
  for(const slot of ['weapon','armor','amulet','ring','ring2','helm','gloves','belt','skates']){
    const it=player.equip[slot]; if(!it)continue;
    const row=document.createElement('div');row.className='shopItem';
    const deja=it.gravure
      ? '<span style="color:#c46ee0">'+t('forge.gravure.deja',{
          nom:it.gravure.nom, eff:affixText({t:it.gravure.t,v:it.gravure.v*it.gravure.rang})})+'</span>'
      : '<span style="color:#6b789c">'+t('forge.gravure.vierge')+'</span>';
    row.innerHTML='<div class="info">'+itemIco(it)+' '+itemLabel(it)+'<br>'+deja+'</div>';
    const b=document.createElement('button');
    b.textContent=t('forge.gravure.bouton');
    b.disabled=!!it.gravure||gravureSel<0;
    b.onclick=()=>{
      const r=inventory[gravureSel]; if(!r)return;
      if(graver(it,r)){
        gravureSel=-1;
        SFX.sertir&&SFX.sertir();
        toast(t('forge.gravure.ok',{nom:r._base||r.name,n:rang}),2.0);
        renderShop();refreshHud();renderInventory();
      }
    };
    row.appendChild(b);body.appendChild(row);
  }
}

function _forgeDemontage(body){
  const sec2=document.createElement('div');sec2.className='shopSec';sec2.textContent='Démonter en fragments';body.appendChild(sec2);
  if(!inventory.length)body.insertAdjacentHTML('beforeend','<div style="font-size:11px;color:#6b789c">'+t('boutique.sacVide')+'</div>');
  inventory.forEach((it,i)=>{
    const row=document.createElement('div');row.className='shopItem';
    row.innerHTML=`<div class="info">${itemIco(it)} ${itemLabel(it)}</div>`;
    const b=document.createElement('button');b.textContent=t('forge.demonter')+' ❄'+salvageValue(it);
    b.onclick=()=>{player.frags+=salvageValue(it);inventory.splice(i,1);setInvSel(-1);toast(t('forge.demonte',{n:salvageValue(it)}),1.3);burst(player.x,player.y,'#7dd0ff',8);renderShop();renderInventory();refreshHud();};
    row.appendChild(b);row.onmouseenter=e=>showTip(e,it);bindLongPress(row,it);row.onmousemove=moveTip;row.onmouseleave=hideTip;
    body.appendChild(row);});
}

/* ⚠ LES SEPT LIGNES `body=fg(...)` SONT LUES PAR `test_forge`, qui vérifie que
   les sept sections sont bien ROUTÉES vers leur onglet — et pas seulement
   qu'elles existent. Les garder groupées ici rend ce câblage lisible d'un
   coup d'œil, ce qui est aussi la raison pour laquelle le test le contrôle. */
function _shopForge(racine){
  /* ⚠ LES CLÉS D'ONGLET RESTENT EN DUR — `test_forge` les lit pour vérifier
     le routage. Seul le LIBELLÉ se traduit. */
  const fg=_fgOnglets(racine,[['reparation',t('forge.onglet.reparation')],['amelioration',t('forge.onglet.amelioration')],
          ['reforge',t('forge.onglet.reforge')],['sertissage',t('forge.onglet.sertissage')],
          ['gravure',t('forge.onglet.gravure')],['eclats',t('forge.onglet.eclats')],
          ['demontage',t('forge.onglet.demontage')]]);
  let body=fg('reparation'); _forgeReparation(body);
  body=fg('amelioration');   _forgeAmelioration(body);
  body=fg('reforge');        _forgeReforge(body);
  body=fg('sertissage');     _forgeSertissage(body);
  body=fg('gravure');        _forgeGravure(body);
  body=fg('eclats');         _forgeEclats(body);
  body=fg('demontage');      _forgeDemontage(body);
}

/* renderShop FAISAIT 188 LIGNES — LA PLUS LONGUE DU JEU.          (Phase 4)
   Deux boutiques dans une seule fonction : le marchand et la forgeronne, cette
   dernière découpée en cinq onglets qu'il fallait compter à la main pour
   savoir lequel on lisait. */
function renderShop(){
  const body=document.getElementById('shopBody');body.innerHTML='';
  if(!shopNpc)return;
  _shopReplique(body);
  if(shopNpc.type==='merchant')_shopMarchand(body);
  else _shopForge(body);
}

/* Le texte de la boutique, pour `test_forge` qui vérifie le CÂBLAGE des
   onglets et pas seulement ce qu'ils affichent. Même raison que `srcRender` :
   la Phase 4 a découpé `renderShop`, et lire son seul corps laisserait le test
   passer au VERT en ne protégeant plus rien. Ajouter une section ici quand on
   en ajoute une là-haut. */
function srcBoutique(){
  return [renderShop,_shopMarchand,_shopAchats,_shopVente,_shopForge,_fgOnglets,
          _forgeReparation,_forgeAmelioration,_forgeReforge,
          _forgeSertissage,_forgeGravure,_forgeEclats,_forgeDemontage]
    .map(function(f){return f.toString();}).join('\n');
}
let stash=[];const STASH_MAX=72;let stashCap=30;
/* Prix de LA case suivante. Géométrique : 40 or la 31e, plus de 3 000 la
   dernière. Les derniers emplacements sont volontairement prohibitifs. */
const prixCaseCoffre=cap=>Math.round(40*Math.pow(1.16,Math.max(0,cap-30)));
function toggleStash(){
  if(!level||level.kind!=='village'){toast(t('coffre.auVillage'),1.4);return;}
  const el=document.getElementById('stashPanel');const open=el.style.display==='block';closeAllPanels();
  if(!open){SFX.sacOuvre&&SFX.sacOuvre();el.style.display='block';renderStash();}
  if(typeof majPausePanneau==='function')majPausePanneau();
  if(typeof updateTabs==='function')updateTabs();
}
function _stashCell(it,onClick){
  const c=document.createElement('div');c.className='cell';c.style.boxShadow='inset 0 0 0 2px '+RAR[it.rarity].col;
  setCellIcon(c,it);
  c.onclick=onClick;c.onmouseenter=e=>showTip(e,it);bindLongPress(c,it);c.onmousemove=moveTip;c.onmouseleave=hideTip;return c;
}
function renderStash(){
  const gi=document.getElementById('stashInv'),gb=document.getElementById('stashBox');gi.innerHTML='';gb.innerHTML='';
  inventory.forEach((it,i)=>gi.appendChild(_stashCell(it,()=>{if(stash.length<stashCap){stash.push(it);inventory.splice(i,1);renderStash();renderInventory();saveGame();}else toast(t('coffre.plein'),1.2);})));
  stash.forEach((it,i)=>gb.appendChild(_stashCell(it,()=>{if(!sacPlein(it)){inventory.push(it);stash.splice(i,1);renderStash();renderInventory();saveGame();}else toast(t('boutique.sacPlein'),1.2);})));
  let foot=document.getElementById('stashFoot');
  if(!foot){foot=document.createElement('div');foot.id='stashFoot';foot.style.cssText='margin-top:10px;font-size:12px;color:#cdd6e6;display:flex;gap:8px;align-items:center';document.getElementById('stashPanel').appendChild(foot);}
  /* Une case à la fois, prix géométrique. Les paliers de 10 cases à prix fixe
     étaient tous achetés dès l'acte 1 pour 1 200 or au total. */
  const cost=prixCaseCoffre(stashCap);
  /* ⚠ `toLocaleString('fr-FR')` FORÇAIT LE FORMAT FRANÇAIS. `nb()` suit la
     langue : 1 234 en français, 1,234 en anglais. */
  foot.innerHTML='<span>'+t('coffre.etat',{a:stash.length,b:stashCap})+
    (stashCap<STASH_MAX?(' <span style="color:#6b789c">'+t('coffre.caseSuivante',{or:nb(cost)})+'</span>'):
     ' <span style="color:#7cd06a">'+t('coffre.tailleMax')+'</span>')+'</span>';
  if(stashCap<STASH_MAX){
    const bb=document.createElement('button');
    bb.innerHTML=t('coffre.plusUne')+' <span class="gi"></span>'+nb(cost);
    bb.className='eq';bb.disabled=player.gold<cost;
    bb.onclick=()=>{const c=prixCaseCoffre(stashCap);
      if(player.gold>=c){player.gold-=c;SFX.acheter&&SFX.acheter();stashCap=Math.min(STASH_MAX,stashCap+1);
        toast(t('coffre.agrandi',{n:stashCap}),1.4);renderStash();refreshHud();saveGame();}};
    foot.appendChild(bb);
    /* Achat groupé pour ne pas cliquer trente fois : le prix reste celui de
       chaque case, additionné, donc aucune remise cachée. */
    let lot=0,n5=Math.min(5,STASH_MAX-stashCap);
    for(let k=0;k<n5;k++)lot+=prixCaseCoffre(stashCap+k);
    if(n5>1){const b5=document.createElement('button');
      b5.innerHTML=t('coffre.plusN',{n:n5})+' <span class="gi"></span>'+nb(lot);
      b5.className='eq';b5.style.opacity='.85';b5.disabled=player.gold<lot;
      /* ⚠ `let t=0` ÉTAIT UN TOTAL EN OR, et masquait la traduction : acheter
         cinq cases d'un coup appelait `t('coffre.agrandi')` sur un nombre et
         plantait. Renommé `cout`. C'est le huitième masquage de ce chantier,
         et le second à casser le jeu — d'où `test_t_masquee.js`. */
      b5.onclick=()=>{let cout=0,m=Math.min(5,STASH_MAX-stashCap);
        for(let k=0;k<m;k++)cout+=prixCaseCoffre(stashCap+k);
        if(player.gold>=cout){player.gold-=cout;stashCap=Math.min(STASH_MAX,stashCap+m);
          toast(t('coffre.agrandi',{n:stashCap}),1.4);renderStash();refreshHud();saveGame();}};
      foot.appendChild(b5);}
  }
}

/* ---------------- STATE ---------------- */
/* CE QUI S'EXÉCUTE AU CHARGEMENT — sorti du premier niveau.

   Le module ne fait plus que DÉCLARER. Ses actions de chargement sont
   appelées par l'entrée, dans l'ordre des préfixes, ce qui rend l'ordre
   d'évaluation des modules INDIFFÉRENT — sans quoi la conversion en
   modules ES les remettrait dans un ordre imprévisible. */
function _demarrer27(){
  (function bindCharTabs(){
    const p=document.getElementById('charPanel'); if(!p)return;
    p.addEventListener('click',e=>{const t=e.target&&e.target.closest?e.target.closest('.ptab'):null;
      if(t&&t.dataset.ptab)setCharTab(t.dataset.ptab);});
  })();
  document.getElementById('shopClose').onclick=()=>{closeAllPanels();shopNpc=null;};
  document.getElementById('dlgClose').onclick=()=>closeAllPanels();
  /* `:not(.paraBtn)` n'est pas décoratif : les boutons du parangon portent la
     même classe pour hériter du style, mais leur clic a sa propre règle. Sans
     l'exclusion, ce câblage leur poserait le geste des attributs — et comme
     leur data-stat est vide, il consommerait un point sans rien augmenter. */
  document.querySelectorAll('.plusBtn:not(.paraBtn)').forEach(b=>{b.onclick=()=>{if(player.statPts<=0)return;const s=b.dataset.stat;
    if(s==='str')player.baseStr++;else if(s==='dex')player.baseDex++;else if(s==='vit')player.baseVit++;
    else if(s==='ene')player.baseEne++;else if(s==='agi')player.baseAgi=(player.baseAgi||10)+1;
    player.statPts--;SFX.pointAttribut&&SFX.pointAttribut();refreshHud();};});
}



