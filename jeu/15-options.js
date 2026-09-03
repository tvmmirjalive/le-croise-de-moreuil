












/* ================================================================
   OPTIONS DE JEU
   Réglages persistants, avec des défauts DIFFÉRENTS selon qu'on joue
   au doigt ou au clavier-souris. Le tactile a besoin d'assistance ;
   la souris vise déjà où l'on veut et n'en veut pas.
   ================================================================ */
const OPT_DEFS=[
 {k:'son',       nom:'Effets sonores',        cat:'Audio',    def:()=>true},
 {k:'musique',   nom:'Musique',               cat:'Audio',    def:()=>true},
 {k:'musiqueReelle',nom:'Instruments réels',  cat:'Audio',    def:()=>true,
  aide:'Décoché : retour aux thèmes de synthèse d’origine.'},
 {k:'sonFocus',  nom:'Couper le son hors de la fenêtre',cat:'Audio',def:()=>true,
  aide:'Musique et effets se taisent quand l’onglet passe derrière ou que la fenêtre perd le focus.'},
 {k:'vibration', nom:'Vibrations',            cat:'Contrôles',def:()=>IS_TOUCH, tactile:true,
  aide:'Retour au coup critique, au blocage et aux dégâts subis.'},
 {k:'joystick',  nom:'Joystick de déplacement',cat:'Contrôles',def:()=>IS_TOUCH, tactile:true,
  aide:'Apparaît sous le pouce, dans la moitié gauche de l’écran.'},
 {k:'clicMarche',nom:'Toucher le sol pour marcher',cat:'Contrôles',def:()=>!IS_TOUCH, tactile:true,
  aide:'En plus du joystick. Désactivé au doigt : le pouce masque la destination.'},
 {k:'cibleAuto', nom:'Ciblage automatique',   cat:'Contrôles',def:()=>IS_TOUCH, tactile:true,
  aide:'Les sorts partent vers l’ennemi le plus menaçant, sans viser.'},
 {k:'attaqueAuto',nom:'Attaque automatique',  cat:'Contrôles',def:()=>IS_TOUCH, tactile:true,
  aide:'Frappe seul dès qu’un ennemi est à portée.'},
 {k:'marqueur',  nom:'Marqueur sous la cible',cat:'Confort',  def:()=>true,
  aide:'Indique l’ennemi que les sorts vont viser.'},
];
const OPT={};
/* Version des réglages. À incrémenter quand un DÉFAUT change : les sauvegardes
   plus anciennes reprennent alors le nouveau défaut pour les clés concernées,
   au lieu de conserver une valeur qui n'a jamais été un choix du joueur. */
const OPT_VERSION=2;
const OPT_REINIT={2:['musique']};      // v2 : la musique doit repartir active
/* Réglages CONTINUS (0 à 100), à côté des interrupteurs.
   Ils ne passent pas par optSet, qui force un booléen. */
const VOL_DEFS=[
  {k:'volSon',    nom:'Volume des effets',  aide:'Coups, sorts, ramassage, interface.'},
  {k:'volMusique',nom:'Volume de la musique',aide:'Ambiances de chaque acte.'}];
function volGet(k){ const v=OPT[k]; return (typeof v==='number')?v:70; }
function volSet(k,v){
  v=Math.max(0,Math.min(100,Math.round(v)));
  OPT[k]=v;
  if(k==='volSon'&&SFX.setVolume)SFX.setVolume(v/100);
  if(k==='volMusique'&&Music.setVolume)Music.setVolume(v/100);
  saveGame&&saveGame();
}
function appliquerVolumes(){
  if(SFX.setVolume)SFX.setVolume(volGet('volSon')/100);
  if(Music.setVolume)Music.setVolume(volGet('volMusique')/100);
}
function optSet(k,v){
  OPT[k]=!!v;
  if(typeof majBoutonAttaque==='function')majBoutonAttaque();
  if(k==='son')SFX.setEnabled(OPT.son);
  if(k==='musique'){ if(OPT.musique){setMusicOn(Music.start());} else {Music.stop();setMusicOn(false);} }
  if(k==='musiqueReelle'&&Music.rebasculer)Music.rebasculer();
  if(typeof renderOptions==='function')renderOptions();
  if(typeof updateTabs==='function')updateTabs();
  /* On n'écrit QUE si une partie est en cours : sans ce garde-fou, changer un
     réglage hors partie écraserait la sauvegarde avec un personnage vierge. */
  if(typeof running!=='undefined'&&running&&typeof saveGame==='function')saveGame();
}
function optAppliquer(){
  SFX.setEnabled(OPT.son);
  if(OPT.musique&&!musicOn){setMusicOn(Music.start());}
  else if(!OPT.musique&&musicOn){Music.stop();setMusicOn(false);}
}
/* --- vibrations : silencieuses si l'appareil n'en a pas --- */
function vibrer(motif){
  if(!OPT.vibration)return;
  try{ if(navigator.vibrate)navigator.vibrate(motif); }catch(e){}
}
const VIB={ toucher:8, critique:[0,18,40,18], bloque:14, degats:22, mort:[0,60,80,120], butin:[0,10,30,10] };

/* --- panneau des réglages --- */
function rendreVolumes(box){
  for(const d of VOL_DEFS){
      const r=document.createElement('div');
      r.style.cssText='display:flex;align-items:center;gap:10px;padding:6px 0';
      const lab=document.createElement('div'); lab.style.cssText='flex:1;min-width:0';
      const val=document.createElement('b'); val.style.cssText='color:#f4d35e';
      val.textContent=volGet(d.k)+' %';
      lab.innerHTML='<div style="font-size:12px;color:#e8ecf6">'+tOu('opt.'+d.k+'.nom',d.nom)+' — </div>'
        +'<div style="font-size:10px;color:#8ea0c8;line-height:1.35">'+tOu('opt.'+d.k+'.aide',d.aide)+'</div>';
      lab.firstChild.appendChild(val);
      const sl=document.createElement('input');
      sl.type='range'; sl.min='0'; sl.max='100'; sl.step='5'; sl.value=volGet(d.k);
      sl.style.cssText='flex:0 0 auto;width:132px;min-height:30px;accent-color:#caa53a;cursor:pointer';
      sl.oninput=()=>{val.textContent=sl.value+' %';volSet(d.k,+sl.value);};
      /* Un retour sonore au relâchement : on entend ce qu'on règle. */
      sl.onchange=()=>{if(d.k==='volSon')SFX.pick&&SFX.pick();};
      r.appendChild(lab); r.appendChild(sl); box.appendChild(r);
  }
}
/* TROIS SECTIONS CONSTRUISAIENT LE MÊME TITRE ET LA MÊME LIGNE.   (Phase 4)

   Réglages, Sauvegarde et Partie recopiaient chacune huit lignes de style
   identiques — le titre à filet doré, puis la ligne « libellé + aide +
   bouton ». Trois fois. Modifier l'apparence obligeait à la changer aux trois
   endroits, et rien ne le rappelait.

   Les deux motifs sont extraits. `renderOptions` passe de 86 lignes à une
   trentaine, et surtout on ne peut plus faire diverger les trois sections. */
/* ⚠ L'ÉLÉMENT S'APPELLE `el`, ET PAS `t`. Il s'appelait `t` : inoffensif ici,
   puisque cette fonction n'appelle jamais `t('…')` — mais c'est le montage
   exact des sept accidents de la localisation, où un `t` local a masqué la
   traduction. Renommé avant qu'une ligne de traduction n'y entre. */
function _optTitre(box, texte, marge){
  const el=document.createElement('div');
  el.style.cssText='color:#f4d35e;font-size:12px;font-weight:bold;margin:'+(marge||10)+'px 0 4px;'
    +'border-bottom:1px solid #2a3350;padding-bottom:3px';
  el.textContent=texte; box.appendChild(el); return el;
}
/* Le bouton est fabriqué par l'appelant : un interrupteur et une action n'ont
   ni la même forme ni le même comportement. Seule la LIGNE est commune. */
function _optLigne(box, titre, aide, bouton){
  const r=document.createElement('div');
  r.style.cssText='display:flex;align-items:center;gap:10px;padding:6px 0';
  const lab=document.createElement('div'); lab.style.cssText='flex:1;min-width:0';
  lab.innerHTML='<div style="font-size:12px;color:#e8ecf6">'+titre+'</div>'
    +(aide?'<div style="font-size:10px;color:#8ea0c8;line-height:1.35">'+aide+'</div>':'');
  r.appendChild(lab); r.appendChild(bouton); box.appendChild(r); return r;
}
/* L'interrupteur d'un réglage : sa couleur dit son état. */
function _optInterrupteur(o){
  const b=document.createElement('button');
  b.style.cssText='flex:0 0 auto;width:58px;min-height:30px;border-radius:15px;cursor:pointer;'
    +'font-size:11px;font-weight:bold;border:1px solid '+(OPT[o.k]?'#caa53a':'#2a3350')+';'
    +'background:'+(OPT[o.k]?'#2a2410':'#141a2e')+';color:'+(OPT[o.k]?'#f4d35e':'#8ea0c8');
  b.textContent=OPT[o.k]?t('opt.actif'):t('opt.coupe');
  b.onclick=()=>{vibrer(VIB.toucher);optSet(o.k,!OPT[o.k]);};
  return b;
}
/* Un bouton d'action — exporter, revenir au titre. */
function _optAction(texte, fn){
  const b=document.createElement('button');
  b.textContent=texte;
  b.style.cssText='flex:0 0 auto;padding:7px 14px;font-size:12px;border-radius:6px;cursor:pointer;'
    +'border:1px solid #3a4a72;background:#141a2e;color:#cdd6e6;font-family:inherit';
  b.onclick=fn;
  return b;
}
/* LE CHOIX DE LA LANGUE, en tête des options.

   Changer de langue RECHARGE la page. C'est plus simple et plus sûr que de
   reconstruire tous les panneaux à chaud : le jeu en compte une douzaine, dont
   plusieurs sont engendrés à l'ouverture, et un seul oublié laisserait du
   français au milieu de l'anglais. La partie est sauvegardée avant. */
function _optLangue(box){
  if(typeof t!=='function')return;
  const l=document.createElement('div'); l.className='optRow';
  const gauche=document.createElement('div');
  gauche.innerHTML='<b>'+echapperHtml(t('options.langue'))+'</b>'
    +'<br><span style="font-size:11px;color:#8ea0c8">'+echapperHtml(t('options.langue.aide'))+'</span>';
  const droite=document.createElement('div');
  for(const [code,nom] of [['fr','Français'],['en','English']]){
    const b=document.createElement('button');
    b.textContent=nom;
    b.className='plusBtn';
    b.style.cssText='min-width:88px;margin-left:6px'+(langue()===code?';outline:2px solid #f4d35e':'');
    b.onclick=function(){
      if(langue()===code)return;
      setLangue(code);
      try{ if(typeof saveGame==='function')saveGame(); }catch(e){}
      try{ location.reload(); }catch(e){ traduirePage(); renderOptions(); }
    };
    droite.appendChild(b);
  }
  l.appendChild(gauche); l.appendChild(droite); box.appendChild(l);
}
function renderOptions(){
  const box=document.getElementById('optList'); if(!box)return;
  box.innerHTML='';
  _optLangue(box);
  /* Au clavier-souris, les réglages propres au doigt n'ont aucun sens :
     pas de vibreur, pas de joystick, et viser à la souris se suffit. */
  const visibles=OPT_DEFS.filter(o=>IS_TOUCH||!o.tactile);
  const cats=[]; for(const o of visibles)if(!cats.includes(o.cat))cats.push(o.cat);
  for(const cat of cats){
    /* La CATÉGORIE est aussi la clé de regroupement : la donnée reste
       française, seul l'affichage se traduit. */
    _optTitre(box, tOu('opt.cat.'+_cleObjet(cat), cat), 10);
    /* LES JAUGES D'ABORD, dans la même section que les interrupteurs.
       Elles étaient rendues par une boucle séparée, tout en bas : le son
       se trouvait coupé en deux à l'écran. Et c'est le volume qu'on vient
       régler le plus souvent — il passe donc devant. */
    if(cat==='Audio')rendreVolumes(box);
    for(const o of visibles){
      if(o.cat!==cat)continue;
      _optLigne(box, tOu('opt.'+o.k+'.nom',o.nom), tOu('opt.'+o.k+'.aide',o.aide||''), _optInterrupteur(o));
    }
  }
  /* ---- Sauvegarde : exporter sans quitter la partie ---- */
  _optTitre(box, t('opt.titre.sauvegarde'), 12);
  _optLigne(box, t('opt.exporter'), t('opt.exporter.aide',{n:emplActif}),
    _optAction(t('opt.exporter.bouton'), ()=>{ try{saveGame();}catch(e){}
      if(exporterSauvegarde(emplActif))toast(t('opt.exportee'),2.4);
      else{ closeAllPanels(); toast(t('opt.exportImpossible'),4); } }));
  /* ---- Partie : la sortie vers l'écran titre ----             (v8.81)
     Elle n'existait pas : une fois la partie lancée, changer
     d'emplacement ou importer une sauvegarde imposait de recharger la
     page — ce que personne ne devine, et que l'application mobile ne
     permet même pas. */
  _optTitre(box, t('opt.titre.partie'), 12);
  _optLigne(box, t('opt.retourTitre'), t('opt.retourTitre.aide'),
    _optAction(t('opt.retourTitre.bouton'), ()=>{ vibrer(VIB.toucher); demanderRetourTitre(); }));
  const pied=document.createElement('div');
  pied.style.cssText='margin-top:12px;font-size:10px;color:#6b789c;line-height:1.5';
  pied.textContent=t('opt.pied',{mode:IS_TOUCH?t('opt.tactile'):t('opt.clavier')});
  box.appendChild(pied);
}

/* CE QUI S'EXÉCUTE AU CHARGEMENT — sorti du premier niveau.

   Le module ne fait plus que DÉCLARER. Ses actions de chargement sont
   appelées par l'entrée, dans l'ordre des préfixes, ce qui rend l'ordre
   d'évaluation des modules INDIFFÉRENT — sans quoi la conversion en
   modules ES les remettrait dans un ordre imprévisible. */
function _demarrer15(){
  (function initOpts(){ for(const o of OPT_DEFS)OPT[o.k]=o.def(); })();
}



