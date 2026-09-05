










/* ================================================================
   LES QUATRE EMPLACEMENTS, À L'ÉCRAN TITRE                 (v8.80)

   Chaque ligne dit ce qu'il faut pour reconnaître une partie sans
   l'ouvrir : niveau, acte, démons purgés, or, et la date.

   La suppression demande TROIS choses, dans cet ordre : veux-tu
   exporter d'abord ? puis la confirmation. Le nom du personnage est
   rappelé au dernier moment — c'est lui qui empêche d'effacer le
   mauvais emplacement.
   ================================================================ */
let _emplVue=null;          /* {n, etape} pendant une suppression */
function _dateEmpl(o){
  if(!o||!o.horo)return '';
  try{const d=new Date(o.horo),p=n=>String(n).padStart(2,'0');
    /* La DATE aussi change de forme : « 14/03 à 21 h 05 » en français,
       « 14/03 at 21:05 » en anglais. Le gabarit porte les deux. */
    return t('empl.date',{j:p(d.getDate()),m:p(d.getMonth()+1),
                          h:p(d.getHours()),min:p(d.getMinutes())});}
  catch(e){return '';}
}
/* L'INTENTION AVEC LAQUELLE ON EST ARRIVÉ                     (v8.81)
   La même vue sert à reprendre une partie et à en commencer une : sans
   dire lequel des deux le joueur a demandé, elle répond à côté. */
let _emplIntention=null;         /* 'nouvelle' | null */
function ouvrirEmplacements(intention){
  _emplIntention=intention||null;
  /* ⚠ PASSE PAR `ovPoserVue`, ET C'EST TOUT LE CORRECTIF.          (v9.64)
     Cette fonction écrivait `ovVue.innerHTML` puis rendait la main : la vue
     restait `display:none`, faute de la classe `ouvert`. Le joueur cliquait
     « Nouvelle partie », 2088 caractères et huit boutons atterrissaient dans
     le DOM, et rien n'apparaissait. */
  if(!ovPoserVue('emplacements', vueEmplacements()))return;
  if(typeof brancherEmplacements==='function')brancherEmplacements();
  ovMenuBoutons();
}
function vueEmplacements(){
  const neuf=(_emplIntention==='nouvelle');
  const libres=[];for(let n=1;n<=NB_EMPL;n++)if(!sauvegardeEmpl(n))libres.push(n);
  /* ⚠ CE PARAGRAPHE SE TRADUIT ENTIER. Découpé en quatre morceaux
     concaténés autour de `NB_EMPL`, il était intraduisible : l'anglais ne
     place ni le nombre ni la proposition au même endroit. */
  let h='<h3>'+(neuf?t('empl.titreNeuf'):t('empl.titre'))+'</h3>'
    +'<p style="font-size:12px;color:#8ea0c8;line-height:1.5;margin:0 0 8px">'
    +t('empl.intro',{n:NB_EMPL})
    +(neuf?(libres.length?' '+t('empl.libres'):' '+t('empl.tousOccupes')):'')+'</p>';
  for(let n=1;n<=NB_EMPL;n++){
    const o=sauvegardeEmpl(n);
    const actif=(n===emplActif)?' — <b style="color:#7dff9a">'+t('empl.enCours')+'</b>':'';
    h+='<div class="ligne" style="align-items:flex-start">'
      +'<span><b style="color:#f4d35e">'+t('empl.numero',{n:n})+'</b>'+actif+'<br>'
      +(o?(resumeSauvegarde(o)+(_dateEmpl(o)?'<br><span style="color:#6b789c">'+_dateEmpl(o)+'</span>':''))
         :'<span style="color:#6b789c">'+t('empl.libre')+'</span>')+'</span>'
      +'<span style="display:flex;flex-direction:column;gap:5px">'
      /* ⚠ PAS DE « JOUER » SUR UN EMPLACEMENT ILLISIBLE : le bouton
         existerait et échouerait. L'export reste offert — c'est le seul geste
         qui peut encore sauver le contenu. */
      +(o&&o.illisible?''
        :o?('<button'+(neuf?' class="second"':'')+' data-empl-jouer="'+n+'">'+t('empl.jouer')+'</button>')
         :('<button'+(neuf?'':' class="second"')+' data-empl-neuf="'+n+'">'+t('empl.commencerIci')+'</button>'))
      /* Recommencer par-dessus une partie existante : proposé seulement
         quand c'est ce que le joueur est venu faire. */
      +(o&&neuf?'<button class="second danger" data-empl-rec="'+n+'">'+t('empl.recommencerIci')+'</button>':'')
      +(o?'<button class="second" data-empl-export="'+n+'">'+t('empl.exporter')+'</button>':'')
      +(o&&!neuf?'<button class="second danger" data-empl-suppr="'+n+'">'+t('empl.supprimer')+'</button>':'')
      +'</span></div>';
  }
  h+='<div class="ligne"><span>'+t('empl.reprendreExportee')+'</span>'
    +'<button class="second" id="ovImporter">'+t('empl.importerBouton')+'</button></div>'
    +'<input type="file" id="ovFichier" accept=".json,application/json" style="display:none">';
  if(neuf)h+='<div class="ligne"><span style="color:#6b789c">'+t('empl.gerer')+'</span>'
    +'<button class="second" id="ovGerer">'+t('empl.toutVoir')+'</button></div>';
  return h;
}
/* Les boutons de la vue se rebranchent à chaque rendu. */
function brancherEmplacements(){
  const v=document.getElementById('ovVue'); if(!v||!v.querySelectorAll)return;
  const q=(sel,fn)=>Array.prototype.forEach.call(v.querySelectorAll(sel),fn);
  q('[data-empl-jouer]',b=>b.onclick=()=>{choisirEmplacement(+b.getAttribute('data-empl-jouer'));startGame(true);});
  q('[data-empl-neuf]', b=>b.onclick=()=>{choisirEmplacement(+b.getAttribute('data-empl-neuf'));startGame(false);});
  q('[data-empl-export]',b=>b.onclick=()=>{ exportOuCode(+b.getAttribute('data-empl-export')); });
  q('[data-empl-suppr]',b=>b.onclick=()=>{ demanderSuppression(+b.getAttribute('data-empl-suppr'),false); });
  /* Recommencer par-dessus : même chaîne que la suppression — on propose
     l'export d'abord, puis on confirme. Seule la fin change. */
  q('[data-empl-rec]',  b=>b.onclick=()=>{ demanderSuppression(+b.getAttribute('data-empl-rec'),true); });
  const ger=document.getElementById('ovGerer');
  if(ger)ger.onclick=()=>ouvrirEmplacements(null);
  const imp=document.getElementById('ovImporter'), fic=document.getElementById('ovFichier');
  if(imp)imp.onclick=()=>{ if(peutTelecharger()&&fic)fic.click(); else vueCodeImport(); };
  if(fic)fic.onchange=e=>{
    const f=e.target.files&&e.target.files[0]; if(!f)return;
    const r=new FileReader();
    r.onload=()=>vueChoixCible(String(r.result||''));
    r.onerror=()=>toast(t('empl.lectureImpossible'),2.5);
    r.readAsText(f);
  };
}
/* Exporter : un vrai fichier si on peut, sinon le code à copier. */
function exportOuCode(n){
  if(exporterSauvegarde(n)){toast(t('opt.exportee'),2.4);return true;}
  vueCodeExport(n); return false;
}
function vueCodeExport(n){
  const code=codeSauvegarde(n);
  if(!code){toast(t('empl.vide'),2);return;}
  ovPoserVue('code',
     '<h3>'+t('code.titre',{n:n})+'</h3>'
    +'<p>'+t('code.intro')+'</p>'
    +'<textarea id="ovCode" readonly style="width:100%;height:110px;font:11px monospace;'
    +'background:#0b1020;color:#9fb0d6;border:1px solid #2a3350;border-radius:6px;padding:6px">'
    +code+'</textarea>'
    +'<div class="ligne"><span>'+t('code.taille',{ko:(code.length/1024).toFixed(1)})+'</span>'
    +'<span style="display:flex;gap:6px">'
    +(navigator.share?'<button id="ovPartager">'+t('code.partager')+'</button>':'')
    +'<button id="ovCopier">'+t('code.copier')+'</button></span></div>');
  const ta=document.getElementById('ovCode');
  const cp=document.getElementById('ovCopier');
  if(cp)cp.onclick=()=>{ try{ta.select();
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(code);
      else document.execCommand('copy');
      toast(t('code.copie'),2);_codeCopie=true;}catch(e){toast(t('code.copieImpossible'),3);} };
  const pt=document.getElementById('ovPartager');
  if(pt)pt.onclick=()=>{ try{navigator.share({title:t('code.partageTitre'),text:code})
      .then(()=>{_codeCopie=true;}).catch(()=>{});}catch(e){} };
  ovMenuBoutons();
}
let _codeCopie=false;
function vueCodeImport(){
  ovPoserVue('code',
     '<h3>'+t('import.titre')+'</h3>'
    +'<p>'+t('import.intro')+'</p>'
    +'<textarea id="ovCodeIn" placeholder="OUTLAW1:…" style="width:100%;height:110px;font:11px monospace;'
    +'background:#0b1020;color:#dfe6f4;border:1px solid #2a3350;border-radius:6px;padding:6px"></textarea>'
    +'<div class="ligne"><span>'+t('import.rienEcrit')+'</span>'
    +'<button id="ovLire">'+t('import.lire')+'</button></div>');
  const b=document.getElementById('ovLire');
  /* ⚠ CETTE VARIABLE S'APPELAIT `t` ET MASQUAIT LA TRADUCTION. Troisième
     fois dans ce chantier : `renderQuests`, les onglets de boutique, et ici.
     Tant que le corps n'appelait pas t(), rien ne le montrait. */
  if(b)b.onclick=()=>{ const code=(document.getElementById('ovCodeIn').value||'').trim();
    if(!code){toast(t('import.colleDabord'),2);return;} vueChoixCible(code); };
  ovMenuBoutons();
}
/* Où poser la sauvegarde importée ? */
function vueChoixCible(txt){
  const json=(txt.trim().charAt(0)==='{')?txt.trim():_depuisTexte(txt);
  const o=json?sauvegardeValide(json):null;
  if(!o){ toast(t('import.pasUneSauvegarde'),3); return; }
  let h='<h3>'+t('import.cettePartie')+'</h3><p>'+resumeSauvegarde(o)+'</p>'
    +'<p style="color:#ff9a5a">'+t('import.choisirCible')+'</p>';
  for(let n=1;n<=NB_EMPL;n++){
    const e=sauvegardeEmpl(n);
    h+='<div class="ligne"><span><b>Emplacement '+n+'</b> — '
      +(e?resumeSauvegarde(e):'<span style="color:#6b789c">vide</span>')+'</span>'
      +'<button class="second" data-cible="'+n+'">Écrire ici</button></div>';
  }
  const v=ovPoserVue('code', h); if(!v)return;
  Array.prototype.forEach.call(v.querySelectorAll('[data-cible]'),b=>{
    b.onclick=()=>{
      const n=+b.getAttribute('data-cible');
      const r=importerDansEmplacement(txt,n);
      if(!r.ok){toast(r.raison,3.5);return;}
      choisirEmplacement(n);
      toast(t('import.importee',{n:n}),3);
      ovMontrer('emplacements');
    };
  });
  ovMenuBoutons();
}
/* La suppression, en deux temps — avec l'export proposé d'abord.
   `neuve` : on efface pour recommencer aussitôt sur cet emplacement.
   Les deux chemins partagent la même chaîne : c'est seulement l'issue,
   après la dernière confirmation, qui diffère. */
function demanderSuppression(n,neuve){
  const o=sauvegardeEmpl(n); if(!o)return;
  _codeCopie=false;
  ovPoserVue('code',
     '<h3>'+(neuve?t('suppr.titreNeuve',{n:n}):t('suppr.titre',{n:n}))
    +'</h3><p>'+resumeSauvegarde(o)+'</p>'
    +'<p>'+(neuve?t('suppr.avertNeuve'):t('suppr.avert'))+'</p>'
    +'<div class="ligne"><span>'+t('suppr.definitif')+'</span>'
    +'<span style="display:flex;gap:6px">'
    +'<button id="ovExpAvant">'+t('empl.exporter')+'</button>'
    +'<button class="second" id="ovSansExp">'+(neuve?t('suppr.nonRemplacer'):t('suppr.nonEffacer'))+'</button></span></div>');
  document.getElementById('ovExpAvant').onclick=()=>{
    const fichier=exportOuCode(n);
    /* Fichier : on sait qu'il est parti. Code : on exige un geste de plus,
       car rien ne prouve qu'il a été rangé quelque part. */
    if(fichier)confirmerSuppression(n,true,neuve);
    else{
      const v=document.getElementById('ovVue');
      const d=document.createElement('div');d.className='ligne';
      d.innerHTML='<span style="color:#ff9a5a">'+t('code.rangeEnSecurite')+'</span>'
        +'<button class="danger" id="ovApresCode">'+t('code.jaiCopie')+'</button>';
      v.appendChild(d);
      document.getElementById('ovApresCode').onclick=()=>confirmerSuppression(n,true,neuve);
    }
  };
  document.getElementById('ovSansExp').onclick=()=>confirmerSuppression(n,false,neuve);
  ovMenuBoutons();
}
function confirmerSuppression(n,exporte,neuve){
  const o=sauvegardeEmpl(n); if(!o)return;
  ovPoserVue('code',
     '<h3>'+t('suppr.derniere')+'</h3>'
    +'<p>'+(exporte?t('suppr.exportee')+' ':'')
    +(neuve?t('suppr.confirmeNeuve',{n:n}):t('suppr.confirme',{n:n}))+'</p>'
    +'<p>'+resumeSauvegarde(o)+'</p>'
    +'<div class="ligne"><span style="color:#ff9a5a">'+t('suppr.irreversible')+'</span>'
    +'<span style="display:flex;gap:6px">'
    +'<button class="second" id="ovAnnuler">'+t('suppr.annuler')+'</button>'
    +'<button class="danger" id="ovEffacer">'+(neuve?t('suppr.remplacerCommencer'):t('suppr.effacer'))+'</button></span></div>');
  document.getElementById('ovAnnuler').onclick=()=>ouvrirEmplacements(neuve?'nouvelle':null);
  document.getElementById('ovEffacer').onclick=()=>{
    supprimerEmpl(n);
    if(neuve){ choisirEmplacement(n); startGame(false); return; }
    if(n===emplActif){const l=[];for(let k=1;k<=NB_EMPL;k++)if(sauvegardeEmpl(k))l.push(k);choisirEmplacement(l[0]||1);}
    toast(t('suppr.efface',{n:n}),2.4);
    ouvrirEmplacements(null);
  };
  ovMenuBoutons();
}

function ovMenuBoutons(){
  const box=document.getElementById('ovBoutons');if(!box)return;
  const s=lireSauvegarde();
  box.innerHTML='';
  const mk=(txt,cls,fn)=>{const b=document.createElement('button');
    b.textContent=txt;if(cls)b.className=cls;b.onclick=fn;box.appendChild(b);return b;};
  if(s)mk(t('bouton.continuer'),null,function(){startGame(true);});
  /* « NOUVELLE PARTIE » N'EFFACE PLUS RIEN                    (v8.81)
     L'ancien bouton proposait d'effacer la partie en cours — sans jamais
     dire que le jeu en garde QUATRE. Un joueur qui voulait simplement
     commencer un second personnage croyait devoir sacrifier le premier.
     Le bouton ouvre maintenant les emplacements, l'effacement n'étant plus
     qu'un cas particulier parmi d'autres. */
  mk(s?t('titre.nouvellePartie'):t('titre.entrerStilmat'),s?'second':null,function(){
    if(!s){startGame(false);return;}
    ouvrirEmplacements('nouvelle');
  });
  mk((ovVueCourante==='emplacements'?'▾ ':'')+t('titre.emplacements'),'second',function(){
    if(ovVueCourante==='emplacements'){ovMontrer('emplacements');return;}   /* referme */
    ouvrirEmplacements(null);
  });
  mk((ovVueCourante==='histoire'?'▾ ':'')+t('titre.histoire'),'second',function(){ovMontrer('histoire');});
  mk((ovVueCourante==='options'?'▾ ':'')+t('titre.reglages'),'second',function(){ovMontrer('options');});
  mk((ovVueCourante==='credits'?'▾ ':'')+t('titre.credits'),'second',function(){ovMontrer('credits');});
}
function ouvrirEcranTitre(){
  const ov=document.getElementById('overlay');
  /* On n'habille l'overlay que pour l'écran titre : les écrans de mort et de
     victoire gardent leur fond noir, où le récit doit se lire sans concurrence. */
  if(typeof TITRE_IMG!=='undefined'&&TITRE_IMG){
    ov.style.backgroundImage='url('+TITRE_IMG+')';
    ov.classList.add('illustre');
  }
  /* Le titre est réécrit par les écrans de mort et de victoire. Tant qu'on
     ne pouvait pas revenir ici en cours de partie, personne ne le voyait ;
     depuis la v8.81, on le remet en état.                        (v8.81) */
  const h1=ov.querySelector('h1');
  if(h1){h1.textContent='LE DERNIER OUTLAW';h1.style.color='';}
  const st=ov.querySelector('.story'),lg=ov.querySelector('.legend'),bt=document.getElementById('startBtn');
  if(st)st.style.display='none';
  if(lg)lg.style.display='none';
  if(bt)bt.style.display='none';
  if(ov._sacBox&&ov._sacBox.parentNode){ov._sacBox.parentNode.removeChild(ov._sacBox);ov._sacBox=null;}
  const m=document.getElementById('ovMenu');if(m)m.style.display='flex';
  const s=lireSauvegarde();
  const r=document.getElementById('ovResume');
  /* ⚠ CETTE LIGNE DISAIT « la glace t'attend ». Faute §00, sur l'écran que
     le joueur voit à CHAQUE lancement, et qu'aucun filet ne regardait :
     le crible ne scanne pas les littéraux de module. Corrigée en v9.31. */
  if(r)r.innerHTML=s?resumeSauvegarde(s):t('titre.aucunePartie');
  const pied=document.getElementById('ovPied');if(pied)pied.textContent='build '+BUILD;
  setOvVueCourante(null);_emplIntention=null;
  const v=document.getElementById('ovVue');if(v){v.innerHTML='';v.className='';v.onclick=null;}
  ovMenuBoutons();
  ov.style.display='flex';
}
/* ================================================================
   REVENIR À L'ÉCRAN TITRE EN COURS DE PARTIE               (v8.81)

   Il n'existait aucune sortie : une fois la partie lancée, on ne
   pouvait plus ni changer d'emplacement ni importer une sauvegarde
   sans recharger la page. Le jeu s'enregistre d'abord — c'est ce qui
   permet de ne poser qu'une seule question au joueur.
   ================================================================ */
function retourEcranTitre(){
  try{if(running)saveGame();}catch(e){}
  running=false;
  /* Une scène en cours ne doit pas être comptée comme vue : on la coupe
     sans passer par _finScene, qui la marquerait. */
  if(typeof _scene!=='undefined'&&_scene){
    set_Scene(null);
    const so=document.getElementById('sceneOv'); if(so)so.classList.remove('on');
  }
  closeAllPanels();
  setPaused(false);set_PauseOpt(false);
  const po=document.getElementById('pauseOv'); if(po)po.style.display='none';
  const pt=document.getElementById('pauseTag'); if(pt&&pt.classList)pt.classList.remove('on');
  ouvrirEcranTitre();
}
function demanderRetourTitre(){
  ouvrirConfirmation({
    titre:t('retour.titre'),
    corps:t('retour.corps',{n:emplActif}),
    ok:t('retour.ok'),action:retourEcranTitre
  });
}
/* Mort et victoire réaffichent le récit : on remet l'overlay dans son état
   classique et on masque le menu. */
function fermerEcranTitre(){
  const ov=document.getElementById('overlay');
  ov.classList.remove('illustre');ov.style.backgroundImage='';
  const st=ov.querySelector('.story'),bt=document.getElementById('startBtn');
  if(st)st.style.display='';
  if(bt)bt.style.display='';
  const m=document.getElementById('ovMenu');if(m)m.style.display='none';
}
/* LA MIGRATION SE FAIT ICI, AVANT QUE QUOI QUE CE SOIT NE LISE UNE
   SAUVEGARDE.                                                       (v9.11)

   Le jeu passera bientôt d'une origine `file://` à une origine `https://`
   virtuelle, pour que les modules ES se chargent dans les WebView. Le
   `localStorage` étant attaché à l'origine, il repartira vide. On le
   reconstruit depuis le pont natif, qui survit — c'est un fichier.

   Ne remplace jamais une sauvegarde déjà présente : au retour à la même
   origine, le stockage local fait foi. Sans pont — en navigateur — ne fait
   rien du tout. */


/* CE QUI S'EXÉCUTE AU CHARGEMENT — sorti du premier niveau.

   Le module ne fait plus que DÉCLARER. Ses actions de chargement sont
   appelées par l'entrée, dans l'ordre des préfixes, ce qui rend l'ordre
   d'évaluation des modules INDIFFÉRENT — sans quoi la conversion en
   modules ES les remettrait dans un ordre imprévisible. */
function _demarrer31(){
  try{
    const _repris=amorcerPont();
    if(_repris>0&&typeof toast==='function')
      toast(t(_repris>1?'empl.restaurees':'empl.restauree',{n:_repris}),3.5);
  }catch(e){}
  ouvrirEcranTitre();
}

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */
function set_EmplIntention(v){_emplIntention=v;}

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */



