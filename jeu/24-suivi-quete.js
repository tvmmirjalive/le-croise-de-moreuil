









/* ================================================================
   SUIVI DE QUÊTE
   ================================================================ */
/* Le nom d'acte est TRADUIT, pas concaténé. Le français colle l'article au
   nom (« dans la Piscine »), l'anglais le porte différemment (« in the
   Swimming Pool ») : on traduit donc la phrase entière par gabarit {lieu},
   et ce tableau ne sert plus que de repli si une clé venait à manquer. */
const ACTE_NOM=['la Piscine','la Glacière','le Bois','l\'Église','le Gymnase','la Fosse'];
function acteNom(a){ return tOu('acte.lieu.'+a, ACTE_NOM[a]||''); }
function questSuivie(){
  initQuests();
  const id=player.questSuivie;
  if(id){const q=QUESTS.find(x=>x.id===id),st=quests[id];
    if(q&&st&&st.unl&&!st.done)return q;}
  /* Rien de suivi, ou la quête suivie est finie : on reprend la QUÊTE
     PRINCIPALE la plus basse encore ouverte. C'est le fil du scénario. */
  let sec=null;
  for(const q of QUESTS){
    const st=quests[q.id]; if(!st||!st.unl||st.done)continue;
    if(q.id[0]==='m'){player.questSuivie=q.id;return q;}
    if(!sec)sec=q;
  }
  if(sec){player.questSuivie=sec.id;return sec;}
  player.questSuivie=null;return null;
}
function suivreQuete(id){ player.questSuivie=id; majSuivi(); saveGame&&saveGame(); }
/* Que faire, et où. Un verbe, un lieu — pas une paraphrase du texte de quête. */
function objectifQuete(q){
  const lieu=acteNom(q.act);
  /* Une quête à étapes annonce SON ÉTAPE EN COURS. Sans ça, le suivi
     resterait sur l'intitulé général et le découpage ne se verrait pas. */
  {const e=(typeof etapeCourante==='function')?etapeCourante(q):null;
   if(e&&e.txt){const p=etapeTexteProgres(q);return [txtEtapeCourante(q),(p?p+' · ':'')+lieu];}}
  const dans=t('quete.ou.dans',{lieu:lieu});
  switch(q.type){
    case 'kills':   return [t('quete.obj.kills'), dans];
    case 'kind':    return [t('quete.obj.kind'), dans];
    case 'elites':  return [t('quete.obj.elites'), dans];
    case 'chests':  return [t('quete.obj.chests'), dans];
    case 'shrines': return [t('quete.obj.shrines'), dans];
    case 'boss': case 'bossact': return [t('quete.obj.boss'), t('quete.ou.de',{lieu:lieu})];
    case 'reach':   return [t('quete.obj.reach'), t('quete.ou.sortie',{lieu:lieu})];
    case 'level':   return [t('quete.obj.level'), t('quete.ou.niveau',{n:q.target})];
    case 'talkArena':return [t('quete.obj.talkArena'), t('quete.ou.portail')];
    case 'key':     return [t('quete.obj.key'), t('quete.ou.lieutenants')];
    case 'echo':    return [t('quete.obj.echo'), t('quete.ou.fosse')];
    case 'arena': case 'arenaT': case 'arenaAll': case 'noPot':
                    return [t('quete.obj.arena'), t('quete.ou.fosse')];
    case 'legendary':return [t('quete.obj.legendary'), t('quete.ou.recrache')];
    default:        return [t('quete.obj.defaut'), lieu?dans:''];
  }
}
/* Où aller MAINTENANT, compte tenu de l'endroit où l'on se trouve. */
function boussoleQuete(q){
  const auVillage=(level&&level.kind==='village');
  if(q.type==='talkArena')return auVillage?t('bous.anselme'):t('bous.village');
  if(['arena','arenaT','arenaAll','noPot','echo','legendary'].includes(q.type))
    return auVillage?t('bous.portail'):t('bous.village');
  if(q.type==='level')return t('bous.niveau');
  if(auVillage)return t('bous.sortir');
  if(level&&level.actNum!=null&&level.actNum!==q.act)
    return t('bous.acte',{lieu:acteNom(q.act)||t('bous.acteN',{n:q.act+1})});
  if(q.type==='reach')return t('bous.porte');
  return t('bous.ici');
}
/* OÙ, EXACTEMENT. Quand l'objectif a une position dans le niveau courant, on
   la rend : le bandeau affiche la distance et une flèche tourne autour du
   héros. C'est ce qui manquait — « sors du village » sans dire par où ne sert
   à rien quand on ne connaît pas la carte. */
function cibleQuete(q){
  if(!q||!level)return null;
  const auVillage=(level.kind==='village');
  const npc=t=>{const l=level.npcs||[];for(const n of l)if(n.type===t)
    return {x:(n.x!=null?n.x:(n.tx+0.5)*TS),y:(n.y!=null?n.y:(n.ty+0.5)*TS),nom:t};return null;};
  const sortie=()=>{
    if(level.gate)return {x:(level.gate.tx+0.5)*TS,y:(level.gate.ty+0.5)*TS,nom:'sortie'};
    const e=(level.exits||[])[0];
    if(e)return {x:(e.x!=null?e.x:(e.tx+0.5)*TS),y:(e.y!=null?e.y:(e.ty+0.5)*TS),nom:'sortie'};
    return null;
  };
  if(q.type==='talkArena')return auVillage?npc('arenamaster'):null;
  if(['arena','arenaT','arenaAll','noPot','echo','legendary'].indexOf(q.type)>=0)
    return auVillage?npc('arena'):null;
  if(q.type==='level')return null;
  if(auVillage)return sortie();
  if(level.actNum!=null&&level.actNum!==q.act)return npc('waypoint')||sortie();
  if(q.type==='reach')return sortie();
  return null;
}
/* LE CHEMIN, PAS LE VOL D'OISEAU.

   Une flèche qui pointe la cible en ligne droite envoie dans le mur dès qu'il
   y a un couloir entre les deux — et le « 408 cases » annoncé n'a aucun rapport
   avec la distance réellement à parcourir.

   On calcule donc un VRAI chemin avec l'A* du jeu, celui des cinq points de
   pose, le même qui sert au déplacement au clic. La flèche pointe le prochain
   virage utile, et la distance est la longueur du chemin.

   Le calcul coûte 15 à 20 ms sur les grandes cartes : il est refait au plus
   une fois par seconde, et seulement si le héros a bougé d'au moins une case
   ou si la cible a changé. Entre deux calculs on suit le chemin déjà connu. */
let _chemQ={t:-1e9,id:null,niv:null,px:0,py:0,pts:null,lg:0};
function cheminQuete(q){
  const c=q?cibleQuete(q):null;
  if(!c){_chemQ.pts=null;return null;}
  const now=(typeof performance!=='undefined'?performance.now():Date.now());
  /* Le chemin n'est refait que si le héros a franchi DEUX CASES ET DEMIE.
     À une case, il était recalculé sans arrêt, et deux chemins A* voisins ne
     passent pas forcément par les mêmes points : d'où des sauts de direction. */
  const bouge=Math.hypot(player.x-_chemQ.px,player.y-_chemQ.py)>TS*4;
  const memeCible=(_chemQ.id===q.id&&_chemQ.niv===(level&&level.id));
  if(_chemQ.pts&&memeCible&&!bouge&&now-_chemQ.t<5000)return _chemQ;
  _chemQ.t=now;_chemQ.id=q.id;_chemQ.niv=level&&level.id;
  _chemQ.px=player.x;_chemQ.py=player.y;
  let pts=null,lg=0;
  try{
    const d0=posePointProche(level,player.x,player.y,14);
    const d1=posePointProche(level,c.x,c.y,14);
    if(d0&&d1){
      /* 1 200 expansions suffisent très largement pour les neuf cases que
         montrent les marqueurs. Mesuré : 40 ms -> moins de 3 ms. */
      const P=astarPoses(level,d0.u,d0.v,d1.u,d1.v,1200);
      if(P&&P.length){
        _chemQ.partiel=!!P.partiel;
        pts=P.map(n=>posePx(n.u,n.v));
        let ax=player.x,ay=player.y;
        for(const w of pts){lg+=Math.hypot(w.x-ax,w.y-ay);ax=w.x;ay=w.y;}
        lg+=Math.hypot(c.x-ax,c.y-ay);
      }
    }
  }catch(e){pts=null;}
  if(!pts){ /* aucun chemin : on retombe sur la ligne droite, en le disant */
    pts=[{x:c.x,y:c.y}];lg=dist(player.x,player.y,c.x,c.y);_chemQ.direct=true;
  } else _chemQ.direct=false;
  if(_chemQ.id!==q.id||_chemQ.niv!==(level&&level.id))_flecheA=null;
  _chemQ.pts=pts;_chemQ.lg=lg;_chemQ.cible=c;
  return _chemQ;
}
/* Flèche de quête : un chevron qui tourne autour du héros, plus la distance.
   Elle ne s'affiche que si l'on sait où aller — jamais « quelque part ». */
/* LA DIRECTION DE LA FLÈCHE — sans rebond.

   Trois défauts se cumulaient :

   1. On visait « le premier point de passage à plus d'une case ». Les points de
      pose sont espacés de 22 px : dès que le héros en dépassait un, la cible
      sautait au suivant, d'un coup. Mesuré : jusqu'à 16,8° de rotation en une
      seule image.
   2. Le chemin était recalculé dès une case parcourue, et deux chemins A*
      voisins ne passent pas par les mêmes points : nouvelle secousse.
   3. Aucun lissage : chaque saut était affiché tel quel.

   Correctifs : on vise un point situé à une LONGUEUR D'ARC fixe le long du
   chemin — interpolé entre deux points de passage, donc il glisse au lieu de
   sauter — et l'angle affiché rejoint la consigne par un filtre passe-bas. */
const ARC_VISEE=3.5;                 // en cases, le long du chemin
let _flecheA=null;
function _pointArc(pts,L){
  let ax=player.x, ay=player.y, reste=L;
  for(const w of pts){
    const seg=Math.hypot(w.x-ax,w.y-ay);
    if(seg<=1e-6)continue;
    if(reste<=seg){ const k=reste/seg; return {x:ax+(w.x-ax)*k, y:ay+(w.y-ay)*k}; }
    reste-=seg; ax=w.x; ay=w.y;
  }
  return {x:ax,y:ay};
}
function angleFlecheQuete(ch,lisse){
  if(!ch||!ch.pts||!ch.pts.length)return null;
  const cible=_pointArc(ch.pts,Math.min(ARC_VISEE*TS,Math.max(TS,ch.lg-TS)));
  const brut=Math.atan2(cible.y-player.y,cible.x-player.x);
  if(lisse===false)return brut;
  if(_flecheA===null){_flecheA=brut;return brut;}
  /* écart signé le plus court, puis rattrapage de 18 % par image :
     un saut de 90° est absorbé en une demi-seconde, sans à-coup. */
  let e=brut-_flecheA;
  while(e>Math.PI)e-=2*Math.PI;
  while(e<-Math.PI)e+=2*Math.PI;
  _flecheA+=e*0.18;
  while(_flecheA>Math.PI)_flecheA-=2*Math.PI;
  while(_flecheA<-Math.PI)_flecheA+=2*Math.PI;
  return _flecheA;
}
/* CHEMIN AU SOL, plus de flèche en orbite.

   Une flèche qui tourne autour du héros bouge à chaque pas : même sans
   saccade, l'œil la suit en permanence et c'est fatigant. On pose donc des
   marqueurs SUR LE SOL, le long du couloir à suivre. Ils sont fixes dans le
   monde : ils ne bougent pas quand on marche, on les suit, c'est tout.

   Un marqueur tous les 1,5 case, sur les 9 premières cases du chemin, avec
   une opacité qui décroît vers le lointain et une pulsation qui court du
   héros vers la cible — l'œil lit le sens sans avoir à réfléchir.

   Les marqueurs sont ancrés sur les POINTS DE PASSAGE du chemin — des points
   du damier de pose, donc des positions fixes du monde. Mesurer une longueur
   d'arc depuis le héros les ferait avancer avec lui : ils glisseraient sous
   les pieds au lieu de rester posés. */
const FLECHE_MARQUEURS=6;      // au plus six marqueurs à l'écran
const FLECHE_SAUT=3;           // un point de passage sur trois, ≈ 1,5 case
const FLECHE_TROP_PRES=1.1;    // en cases : on ne pose rien sur ce qu'on atteint

/* ON NE POSE RIEN DERRIÈRE.

   Écarter les points « à moins d'une case » ne suffisait pas : le chemin
   n'est recalculé que toutes les deux cases et demie, donc il commence là où
   le héros ÉTAIT. Les points déjà dépassés restaient à plus d'une case
   derrière lui — et s'affichaient dans son dos.

   On repère donc le point du chemin le PLUS PROCHE du héros : c'est là qu'il
   en est. Tout ce qui précède est derrière, on ne le regarde même pas. */
function _flecheIndexProche(pts){
  let iProche=0, dMin=Infinity;
  for(let i=0;i<pts.length;i++){
    const d2=(pts[i].x-player.x)**2+(pts[i].y-player.y)**2;
    if(d2<dMin){dMin=d2;iProche=i;}
  }
  return iProche;
}

/* Un losange posé au sol. `n` est son rang dans la file : il décale la
   pulsation, ce qui fait courir la lumière du héros vers la cible, et il
   estompe le lointain. */
function _flecheMarqueur(s, n, t){
  const ph=(t-n*0.22)%1;
  const puls=Math.max(0,1-Math.abs(ph-0.5)*2.6);
  const fondu=1-(n/FLECHE_MARQUEURS)*0.5;      // le lointain s'efface
  const al=(0.22+0.42*puls)*fondu;
  const rx=ISO_TW*0.20*(1+0.12*puls), ry=ISO_TH*0.20*(1+0.12*puls);
  ctx.globalAlpha=al;
  ctx.fillStyle='#f4d35e';
  ctx.beginPath();
  ctx.moveTo(s.x,s.y-ry);ctx.lineTo(s.x+rx,s.y);ctx.lineTo(s.x,s.y+ry);ctx.lineTo(s.x-rx,s.y);
  ctx.closePath();ctx.fill();
  ctx.globalAlpha=al*0.75;
  ctx.strokeStyle='rgba(60,40,0,0.9)';ctx.lineWidth=1;ctx.stroke();
}

function drawFlecheQuete(){
  if(typeof questSuivie!=='function')return;
  const q=questSuivie(); if(!q)return;
  const c=cibleQuete(q); if(!c)return;
  const ch=cheminQuete(q); if(!ch||!ch.pts)return;
  /* ⚠ CETTE LIGNE EST LUE TELLE QUELLE PAR `test_suivi`, qui y cherche
     « ch.lg<TS*2.2 ». Ne pas remplacer le 2,2 par une constante nommée sans
     repointer le test — il deviendrait aveugle sans le dire. */
  if(ch.lg<TS*2.2)return;                    // on y est
  const t=(typeof performance!=='undefined'?performance.now():Date.now())/900;
  const iProche=_flecheIndexProche(ch.pts);
  ctx.save();
  let n=0;
  for(let i=iProche+FLECHE_SAUT;i<ch.pts.length&&n<FLECHE_MARQUEURS;i+=FLECHE_SAUT){
    const w=ch.pts[i];
    if(dist(player.x,player.y,w.x,w.y)<TS*FLECHE_TROP_PRES)continue;  // on l'atteint déjà
    n++;
    const s=isoPx(w.x,w.y);
    if(s.x<-40||s.x>W+40||s.y<-40||s.y>H+40)continue;
    _flecheMarqueur(s,n,t);
  }
  ctx.restore();
}

function majSuivi(){
  const el=document.getElementById('questTrack'); if(!el)return;
  const q=questSuivie();
  if(!q){el.style.display='none';return;}
  const st=quests[q.id]||{p:0};
  const [obj,ou]=objectifQuete(q);
  const p=Math.min(st.p||0,q.target), pct=Math.round(100*p/Math.max(1,q.target));
  el.style.display='block';
  /* Les quatre lignes sont reconstruites si elles manquent : le bandeau reste
     affichable même si le balisage a été remplacé par du code. */
  let t1=el.querySelector('.qtTitre'), t2=el.querySelector('.qtObj'),
      t3=el.querySelector('.qtOu'), bj=el.querySelector('.qtBar i');
  if(!t1||!t2||!t3||!bj){
    el.innerHTML='<div class="qtTitre"></div><div class="qtObj"></div>'
                +'<div class="qtBar"><i></i></div><div class="qtOu"></div>';
    t1=el.querySelector('.qtTitre');t2=el.querySelector('.qtObj');
    t3=el.querySelector('.qtOu');bj=el.querySelector('.qtBar i');
  }
  if(t1)t1.textContent=(q.id[0]==='m'?'✦ ':'')+nomQuete(q);
  if(t2)t2.textContent=obj+(q.target>1?' — '+p+'/'+q.target:'');
  const _ch=(typeof cheminQuete==='function')?cheminQuete(q):null;
  let _d='';
  if(_ch&&_ch.pts){
    if(_ch.direct||_ch.partiel){
      /* chemin tronqué : sa longueur ne veut rien dire, on donne l'écart direct */
      const _c2=cibleQuete(q);
      _d=_c2?('≈ '+Math.round(dist(player.x,player.y,_c2.x,_c2.y)/TS)+' cases'):'';
    } else _d=Math.round(_ch.lg/TS)+' cases';
  }
  /* Deux lignes seulement : le titre et l'essentiel. La direction complète
     reste dans le panneau Quêtes, qui s'ouvre au clic sur le bandeau. */
  if(t3)t3.textContent=_d?(_d+' · '+obj):boussoleQuete(q);
  if(bj&&bj.style)bj.style.width=pct+'%';
  el.dataset.q=q.id;el.dataset.pct=pct;
  el.onclick=()=>{vibrer(VIB.toucher);if(typeof togglePanel==='function')togglePanel('questPanel');
    else{const p2=document.getElementById('questPanel');if(p2)p2.style.display='block';}
    if(typeof renderQuests==='function')renderQuests();};
}
function renderQuests(){initQuests();const box=document.getElementById('questList');box.innerHTML='';
  const AN=[0,1,2,3,4,5].map(function(a){return t('acte.titre.'+a);});
  let doneN=0,todoN=0;
  for(const q of QUESTS){const s=quests[q.id];if(!s||!s.unl)continue;if(s.done)doneN++;else todoN++;}
  const tabs=document.createElement('div');tabs.style.cssText='display:flex;gap:6px;margin-bottom:8px';
  /* ⚠ LE PARAMÈTRE S'APPELAIT `t` ET MASQUAIT LA FONCTION DE TRADUCTION.
     Tant que le corps n'appelait pas t(), personne ne le voyait ; le premier
     t('…') écrit ici serait parti chercher un indice dans un tableau. */
  [['todo',t('quete.onglet.encours',{n:todoN})],
   ['done',t('quete.onglet.terminees',{n:doneN})]].forEach(function(ong){
    const b=document.createElement('button');b.textContent=ong[1];
    b.style.cssText='flex:1;font-size:12px;padding:5px;border-radius:6px;cursor:pointer;border:1px solid #3a4a72;background:'+(questTab===ong[0]?'#f4d35e':'#141a2e')+';color:'+(questTab===ong[0]?'#111':'#cdd6e6');
    b.onclick=function(){setQuestTab(ong[0]);renderQuests();};tabs.appendChild(b);});
  box.appendChild(tabs);
  const hh=document.createElement('div');hh.style.cssText='color:#8ea0c8;font-size:11px;margin-bottom:6px';
  hh.textContent=t('quete.progression',{a:doneN,b:QUESTS.length});box.appendChild(hh);
  let shown=0;
  for(let a=0;a<5;a++){
    const qs=QUESTS.filter(function(q){const s=quests[q.id];return q.act===a&&s&&s.unl&&(questTab==='done'?s.done:!s.done);});
    if(!qs.length)continue;
    const hd=document.createElement('div');hd.style.cssText='color:#f4d35e;font-size:12px;margin:8px 0 4px;border-bottom:1px solid #2a3350;padding-bottom:2px';
    hd.textContent=AN[a]+'  ('+qs.length+')';box.appendChild(hd);
    for(const q of qs){const st=quests[q.id];shown++;const prog=Math.min(st.p,q.target);
      const node=document.createElement('div');node.className='skillNode';
      const tail=(q.target>1)?' — '+prog+'/'+q.target:'';const star=q.id[0]==='m'?'✦ ':'';
      node.innerHTML='<div class="sIco">'+(st.done?'✅':'📜')+'</div><div style="flex:1"><div class="sName">'+star+nomQuete(q)+(st.done?' <span class="rank">'+t('quete.faite')+'</span>':'')+'</div><div class="sDesc">'+descQuete(q)+tail+'</div></div>';
      /* Le bouton « Suivre » était ajouté AVANT node.innerHTML : la ligne
         suivante l'effaçait. Il n'apparaissait donc jamais. Il se pose
         maintenant après, dans la ligne de titre. */
      if(!st.done){
        const bs=document.createElement('button');
        const actif=(player.questSuivie===q.id);
        bs.style.cssText='position:absolute;right:8px;top:8px;font-size:11px;padding:5px 12px;'
          +'border-radius:6px;cursor:pointer;min-height:30px;z-index:2;'
          +'border:1px solid '+(actif?'#caa53a':'#3a4a72')+';background:'+(actif?'#2a2410':'#141a2e')
          +';color:'+(actif?'#f4d35e':'#8ea0c8')+(actif?';font-weight:bold':'');
        bs.textContent=actif?'✓ Suivie':'Suivre';
        bs.onclick=((_id)=>function(e){e.stopPropagation();suivreQuete(_id);renderQuests();})(q.id);
        node.style.position='relative';
        node.appendChild(bs);
      }
      box.appendChild(node);}}
  if(!shown){const e=document.createElement('div');e.style.cssText='font-size:12px;color:#6b789c';
    e.textContent=(questTab==='done')?'Aucune quête terminée pour l’instant.':'Aucune quête en cours — franchis le portail pour en débloquer.';box.appendChild(e);}
}
const GIVER={
 'arena':{name:'Anselme \u00ab la Cage \u00bb, Ma\u00eetre de la Fosse',ico:'\ud83c\udfc6',greet:'Ah. Le petit Aldric. \u2014 Regarde-moi bien : un \u0153il, deux genoux morts, et le seul Outlaw qui ait dit NON \u00e0 Verdier. Pour \u00e7a il m\u2019a jet\u00e9 dans la Fosse, sous le gymnase, l\u00e0 o\u00f9 le d\u00e9mon jetait ceux qui refusaient de signer. J\u2019y suis rest\u00e9 neuf ans. J\u2019ai arr\u00eat\u00e9 des choses qu\u2019aucun gardien n\u2019aurait d\u00fb voir arriver.<br><br>Et j\u2019ai compris un truc, gamin : quand tu tues une cr\u00e9ature de la Faille, elle ne meurt pas vraiment. Il en reste un \u00e9cho, et cet \u00e9cho, la Fosse sait le rappeler \u2014 en pire.<br><br>Alors ram\u00e8ne-moi une cl\u00e9 prise sur un boss, et je t\u2019ouvre le portail. Bronze, argent, or : trois paliers, trois fa\u00e7ons de mourir. Tu ressortiras plus riche, ou tu ressortiras humili\u00e9. Mais tu ressortiras \u2014 la Fosse ne garde plus personne. J\u2019ai pay\u00e9 pour \u00e7a.',encours:'Toujours en vie ? *Il rit sans desserrer les dents.* La Fosse t\'a laissé ressortir. Elle ne le fait pas pour tout le monde.',fin:'Voilà. *Il crache par terre.* Neuf ans que j\'attendais de voir quelqu\'un ressortir de là en marchant droit.'},"0":{"name":"Régis, le Maître-Nageur","ico":"🛟","greet":"Un survivant ! Enfin ! Trois jours que je garde ce bassin, trois jours que l'eau me murmure des choses. La première relique du Falcon dort ici — le Sifflet du Pacte, celui que Verdier a fait sonner pour sceller le marché. Chaque nuit, je l'entends siffler tout seul. Trouve-le. Et brise-le avant qu'il ne m'appelle, moi aussi.","encours":"L'eau est encore plus noire qu'hier, Outlaw. Fais vite — je ne sais pas combien de temps je tiens à siffler contre elle.","fin":"Le bassin s'est tu. *Il se laisse tomber sur un banc.* Trois jours que je n'avais pas entendu le silence. Merci, gamin."},"1":{"name":"Un Coéquipier Gelé","ico":"👻","greet":"A-Aldric… c'est toi ? On a signé, mon vieux… le Coach a juré qu'on gagnerait, et on a gagné. Regarde ce que la victoire a fait de nous. La Rondelle Maudite est ici — celle du but en or, figée dans la glace avec nos âmes. Détruis-la, capitaine. Qu'on puisse enfin quitter cette glaci\u00e8re.","encours":"Il fait plus froid, tu sens ? *Sa voix craque comme la glace.* Chaque minute que tu perds, la glacière en gagne une.","fin":"Le froid a lâché d'un cran. *Un temps.* Je peux presque bouger les doigts. Presque."},"2":{"name":"Un Poilu de 1918","ico":"🎖️","greet":"Halte-là ! …Ah, un vivant. Repos. Le démon a corrompu jusqu'à nos médailles, petit : celle de 1918 est devenue l'une de ses reliques. Cent ans qu'on monte la garde sous ces arbres, et voilà qu'on sert un traître. Brise-la, et rends-nous le silence qu'on a mérité. Le nom du vendu ? Verdier. Retiens-le bien.","encours":"Vous traînez, soldat. *Il gratte le givre de son casque.* On a perdu des tranchées pour moins que ça.","fin":"Repos. *Il salue, maladroitement.* Vous en avez fait plus en une nuit que nous en quatre ans."},"3":{"name":"Sœur Vaast","ico":"⛪","greet":"Bénie soit ta crosse, Outlaw. La créature de Verdier a dressé son autel dans notre chœur et souillé le calice de la paroisse. Le Calice Profané est la quatrième relique — brise-le, et rappelle au Séraphin déchu une vérité qu'il a oubliée en tombant : le sacré, ça pique.","encours":"Le calice déborde toujours, Aldric. J'entends la crypte respirer sous mes pieds. Ne me laisse pas seule avec ça.","fin":"La pierre est redevenue de la pierre. *Elle expire.* Je vais pouvoir rouvrir les portes aux vivants."},"4":{"name":"Le Casier du Coach","ico":"🥅","greet":"Le casier du Coach Verdier. Vide, comme ses promesses. La dernière relique, c'est la Coupe Maudite — celle qu'il a levée le soir du pacte, pendant qu'on applaudissait notre propre condamnation. Brise-la, et le Falcon n'aura plus rien pour se protéger. Il t'attend sur le Stilmat. Il t'a toujours attendu.","encours":"Il est là, derrière la porte du gymnase. *Il baisse la voix.* Il a cessé de crier, c'est mauvais signe — il économise.","fin":"C'est fini. *Un long silence.* Va dire aux autres qu'ils peuvent rentrer, Outlaw. Va leur dire."},"-1":{"name":"Le Vieux Outlaw","ico":"🦅","greet":"Aldric… mon garçon. Verdier a vendu notre âme pour un bout de métal doré, et le démon a tenu parole : le voilà Green Falcon, perché sur les ruines de notre ville. Sa force tient à cinq reliques maudites, cachées aux quatre coins de Moreuil. Brise-les une à une — commence par la Piscine. Et pour l'amour du hockey, ne sois pas en retard. Pas cette nuit.","encours":"Toujours là, gamin ? *Il ne lève pas les yeux.* Tant que le Falcon a ses reliques, tout ce que tu fais ici ne compte qu'à moitié. Va.","fin":"Bien joué. *Il hoche la tête, longuement.* Ton père aurait aimé voir ça. Moi je le vois, c'est déjà quelque chose."}};

/* Aide de TEST, rendue à son propriétaire.                        (Phase 5)
   Elle vivait dans 19-halos.js, loin de la variable qu'elle écrit — ce
   que la portée globale unique autorisait sans le dire. */
function resetFlecheQuete(){_flecheA=null;}   /* pour les tests */

/* Aides de TEST, rendues à leur propriétaire.                     (Phase 5)
   Elles vivaient dans un autre module que la variable qu'elles écrivent —
   ce qu'une portée globale unique autorisait sans le dire. */
function videCacheChemin(){_chemQ.pts=null;_chemQ.t=-1e9;}   /* pour les tests */



