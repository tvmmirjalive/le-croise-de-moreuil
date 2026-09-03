








/* ================================================================
   LE TEXTE DES SCÈNES

   Aldric PARLE. Jusqu'ici il n'existait qu'à la troisième personne, dans
   les descriptifs de quête ; il n'avait pas de voix. Une scène à deux
   voix vaut trois monologues.

   Convention : *entre astérisques* = didascalie, affichée en gris italique.
   ================================================================ */
const SCENES={

/* ---------- LE PROLOGUE ---------- */
prologue:{repliques:[
 {qui:'recit',nom:'Moreuil, la nuit du sacre',
  texte:"*La Coupe est encore tiède. Dans le gymnase vide, un homme rit tout seul — et le rire se déforme.*"},
 {qui:'verdier',
  texte:"J'AI GAGNÉ, ALDRIC ! Tu entends ? Vingt ans qu'on nous traitait de voyous, et ce soir Moreuil est à NOUS !"},
 {qui:'aldric',
  texte:"Coach… qu'est-ce que vous avez signé."},
 {qui:'verdier',
  texte:"Ce qu'il fallait. *Les lumières éclatent une à une.* Ce que tu n'aurais jamais eu le cran de signer."},
 {qui:'recit',nom:'',
  texte:"*Le sol se fend. Deux ailes vertes s'ouvrent là où se tenait un vieil homme. Le premier cri du Green Falcon déchire la ville et ouvre la Faille.*"},
 {qui:'aldric',
  texte:"*Il ramasse sa crosse dans les gravats.* Trois jours. Trois jours qu'ils sortent de sous la piscine, de la glacière, du bois. Et il n'y a plus personne pour les arrêter."},
 {qui:'faucon',
  texte:"Il reste toi. *Le vieux pose une main sur son épaule.* Sa force n'est pas dans ses ailes, gamin. Elle est dans cinq reliques — un sifflet, une rondelle, une médaille, un calice, une coupe. Brise-les, et il redevient ce qu'il est : un homme qui a eu peur de perdre."},
 {qui:'aldric',
  texte:"Cinq reliques. Cinq endroits où j'ai appris à patiner. *Il serre les sangles.* Très bien. On commence par la piscine."},
 {qui:'faucon',
  texte:"Aldric. *Un temps.* Quand tu le retrouveras — souviens-toi qu'il t'a appris à tenir une crosse."}
]},

/* ---------- ENTRÉE DANS CHAQUE ACTE ---------- */
acte0:{repliques:[
 {qui:'aldric',texte:"*L'odeur de chlore, et autre chose dessous.* La piscine municipale. J'ai passé plus d'heures ici que chez moi."},
 {qui:'regis',texte:"Un survivant ! Trois jours que je garde ce bassin, trois jours que l'eau me parle. Le Sifflet du Pacte est là-dessous, Outlaw. Chaque nuit il siffle tout seul — et chaque nuit, il siffle un peu plus près."},
 {qui:'aldric',texte:"Alors on va lui apprendre à se taire."}
]},
acte1:{repliques:[
 {qui:'aldric',texte:"*Sa respiration gèle avant de sortir.* La glacière. C'est ici qu'on changeait les roulements avant les matchs."},
 {qui:'coequipier',texte:"A… Aldric ? *La glace craque autour d'une silhouette en maillot des Outlaws.* Tu es venu… on t'a attendu si longtemps…"},
 {qui:'aldric',texte:"*Il baisse sa crosse.* … Marceau."},
 {qui:'coequipier',texte:"Ne t'arrête pas pour moi. La Rondelle Maudite est au fond, dans le casier du fond. Celui qu'on n'ouvrait jamais."}
]},
acte2:{repliques:[
 {qui:'aldric',texte:"Le bois de Moreuil. On venait courir ici en présaison, quand le Coach voulait nous punir."},
 {qui:'poilu',texte:"Halte-là ! *Un uniforme de 1918, criblé de givre.* Vous êtes de la relève ? Ça fait cent-huit ans que j'attends la relève."},
 {qui:'aldric',texte:"Je cherche une médaille."},
 {qui:'poilu',texte:"La Médaille de 1918. *Il rit sans joie.* Elle n'a jamais récompensé personne, mon gars. Elle a acheté quelque chose. Suivez le chemin — et ne regardez pas dans les trous d'obus."}
]},
acte3:{repliques:[
 {qui:'aldric',texte:"*Les portes de l'église Saint-Vaast, arrachées de leurs gonds.* On y venait le dimanche. Le Coach s'asseyait toujours au dernier rang."},
 {qui:'vaast',texte:"Il s'y asseyait encore la semaine dernière, Aldric. Il venait demander pardon. *Elle serre son chapelet.* Puis il a cessé de venir, et le Calice s'est mis à déborder."},
 {qui:'aldric',texte:"Déborder de quoi ?"},
 {qui:'vaast',texte:"Va voir toi-même. Et fais vite : ce qui coule de ce calice a déjà atteint la crypte."}
]},
acte4:{repliques:[
 {qui:'aldric',texte:"*Le gymnase du collège. Le dernier endroit.* C'est ici qu'on a soulevé la Coupe."},
 {qui:'faucon',texte:"Et c'est ici qu'il t'attend. Quatre reliques brisées, gamin — il le sait. Il sent chaque éclat."},
 {qui:'aldric',texte:"Tant mieux. Je n'ai plus envie de le surprendre. J'ai envie qu'il me voie arriver."}
]},

/* ---------- PREMIÈRE RENCONTRE DU GARDIEN ---------- */
gardien0:{repliques:[
 {qui:'recit',texte:"*Une masse boursouflée émerge du grand bain. Elle porte encore un maillot de sauveteur.*"},
 {qui:'aldric',texte:"Le Maître-Nageur. *Il crache.* Vous siffliez les faux départs. Vous voilà arbitre de rien du tout."}
]},
gardien1:{repliques:[
 {qui:'recit',texte:"*Le froid change de nature : il ne pique plus, il serre.*"},
 {qui:'aldric',texte:"Givre-Cœur. Le Coach parlait de toi comme d'une légende de vestiaire. Voyons combien tu tiens de reprises."}
]},
gardien2:{repliques:[
 {qui:'recit',texte:"*Les arbres s'écartent d'eux-mêmes. Quelque chose de très vieux se redresse.*"},
 {qui:'aldric',texte:"L'Ancien des Bois. *Il recule d'un pas.* Toi, tu étais là avant le pacte. Tu n'as pas choisi ce camp — mais tu es dedans."}
]},
gardien3:{repliques:[
 {qui:'recit',texte:"*Six ailes s'ouvrent sous la voûte. Elles ont dû être blanches.*"},
 {qui:'aldric',texte:"Un séraphin. Dans MON église. *Il serre sa crosse.* Sœur Vaast avait raison : le calice a débordé jusqu'ici."}
]},
gardienFinal:{repliques:[
 {qui:'verdier',texte:"TU ES VENU. *La voix racle comme une roue sur du gravier.* Après tout ce que je t'ai donné, tu viens me reprendre la seule chose que j'ai gagnée."},
 {qui:'aldric',texte:"Vous n'avez rien gagné, Coach. Vous avez acheté. Il y a une différence, et vous nous l'avez apprise vous-même."},
 {qui:'verdier',texte:"ALORS PROUVE-LE. UNE DERNIÈRE FOIS. SUR LE STILMAT."}
]},

/* ---------- DESTRUCTION DE CHAQUE RELIQUE ---------- */
relique0:{repliques:[
 {qui:'recit',texte:"*Le sifflet se fend. Un son qui n'en finit pas de mourir traverse le bassin.*"},
 {qui:'aldric',texte:"Une de moins. *Il souffle.* Quatre à trouver, Coach."}
]},
relique1:{repliques:[
 {qui:'recit',texte:"*La rondelle éclate en givre noir. Quelque part, très loin, une glacière cesse de gémir.*"},
 {qui:'aldric',texte:"Marceau, si tu m'entends encore — c'est pour toi, celle-là."}
]},
relique2:{repliques:[
 {qui:'recit',texte:"*La médaille se ternit, puis tombe en poussière de rouille.*"},
 {qui:'aldric',texte:"Cent-huit ans qu'elle achetait des hommes. C'est fini."}
]},
relique3:{repliques:[
 {qui:'recit',texte:"*Le calice se brise net. Ce qui débordait reflue dans la pierre.*"},
 {qui:'aldric',texte:"Il ne reste que la Coupe. *Un temps.* Celle qu'on a soulevée ensemble."}
]},
relique4:{repliques:[
 {qui:'recit',texte:"*La Coupe se fend du pied au bord. Le gymnase entier retient son souffle.*"},
 {qui:'verdier',texte:"NON — NON, PAS ELLE ! *Le cri se brise.* Elle était… elle était à nous…"},
 {qui:'aldric',texte:"Non, Coach. Elle était à l'équipe. Vous l'avez vendue tout seul."}
]},

/* ---------- LA FIN ---------- */
final:{repliques:[
 {qui:'recit',texte:"*Les ailes vertes se referment. Sous les serres brisées, il ne reste qu'un vieil homme en survêtement, qui pleure.*"},
 {qui:'verdier',nom:'Coach Verdier',texte:"Aldric… j'ai eu si peur de perdre. C'est tout. C'est tout ce que c'était."},
 {qui:'aldric',texte:"*Il s'agenouille et pose sa crosse au sol.* Je sais, Coach. On avait tous peur. C'est pour ça qu'on jouait ensemble."},
 {qui:'recit',texte:"*Dehors, pour la première fois depuis trois jours, on entend des voix vivantes dans Moreuil.*"}
]},

/* ================================================================
   LA BASCULE — fin du mode Normal, juste après le Green Falcon

   Canon arrêté par Mirja le 31 août 2026. Le Green Falcon est l'ENTITÉ
   démoniaque ; Coach Verdier et le succube en sont deux émanations, sorties
   de lui au même moment. Verdier est donc une VICTIME, et sa réplique du
   `final` — « j'ai eu si peur de perdre » — prend tout son sens ici : il a eu
   peur, l'entité s'est servie de cette peur, et ce qui en est réellement sorti,
   c'est ELLE.

   ⚠ SON NOM N'EST ÉCRIT NULLE PART. La balise ⟦ELLE⟧ le porte, et se résout
   en périphrase tant que Mirja n'a pas tranché — ce qui est aussi le sujet du
   Cauchemar : une enquête sur quelqu'un qu'on ne sait pas nommer.

   ⚠ ET LES CINQ RELIQUES SE RETOURNENT. Décision de Mirja : brisées, elles
   n'ont pas détruit le Falcon, elles l'ont vidé — et ce qu'il retenait est
   sorti. Les éclats seront reforgés en Cauchemar. Rien de la campagne n'est
   à réécrire : la révélation est rétroactive.
   ================================================================ */
bascule:{repliques:[
 {qui:'recit',nom:'Moreuil, le lendemain',
  texte:"*Les cinq reliques brisées sont posées côte à côte sur le banc du gymnase. Le sifflet, la rondelle, la médaille, le calice, la coupe. Aucune ne fait plus de bruit.*"},
 {qui:'verdier',nom:'Coach Verdier',
  texte:"Elles sont froides. *Il en retourne une du bout du doigt.* Aldric, quand je les tenais… je n'entendais pas ma voix. J'entendais quelqu'un d'autre me dire ce que je voulais entendre."},
 {qui:'aldric',
  texte:"Vous étiez seul dans ce gymnase, Coach. Je vous ai vu signer."},
 {qui:'verdier',
  texte:"Non. *Il lève les yeux.* J'ai signé. Mais je n'étais pas seul. Il y avait la chose à qui j'ai vendu — et il y avait ce qui est sorti de moi en même temps."},
 {qui:'recit',
  texte:"*Sur le Stilmat, entre les dalles, le givre se met à courir. Pas depuis le mur : depuis les cinq reliques.*"},
 {qui:'elle',
  texte:"Merci. *La voix vient de partout et de nulle part.* Vraiment. Vingt ans qu'il me tenait par les os. Il a fallu que tu casses cinq bibelots pour me défaire de lui."},
 {qui:'aldric',
  texte:"*Il ne bouge pas.* … Le Falcon n'était pas le maître."},
 {qui:'elle',
  texte:"Le Falcon était la PORTE, Outlaw. Une porte n'a pas de volonté. Elle s'ouvre, et quelque chose passe. *Un rire, très bas.* Ta ville, tes coéquipiers, ton vieux dans la glacière — ce n'était pas lui. C'était moi. À chaque fois."},
 {qui:'verdier',
  texte:"*Blanc comme un drap.* Aldric. Cette voix. C'est celle que j'entendais."},
 {qui:'elle',
  texte:"Et tu ne sais même pas comment m'appeler. *Le givre reflue.* Reviens quand tu sauras. C'est la seule façon de me toucher."},
 {qui:'recit',
  texte:"*Elle n'est plus là. Sur le banc, les cinq éclats se sont mis à luire — faiblement, mais tous en même temps.*"},
 {qui:'aldric',
  texte:"*Il ramasse les éclats un à un.* Bruna. Il faut que tu me forges quelque chose."}
]},

/* ---------- LE CAUCHEMAR : L'ENQUÊTE ----------
   Le joueur ne sait pas à qui il a affaire et cherche qui elle est. Chaque
   acte apporte un fragment, jamais le nom. Il tombe à la fin de l'acte 4. */
acte0_cauchemar:{repliques:[
 {qui:'aldric',texte:"*Le bassin est vide, et pourtant l'eau clapote.* Régis. Elle est passée par ici avant moi."},
 {qui:'regis',texte:"Passée ? *Le maître-nageur ne se retourne pas.* Elle n'est jamais partie, Outlaw. Le sifflet a beau être en morceaux, quelqu'un continue de souffler dedans."},
 {qui:'aldric',texte:"Qui, « quelqu'un » ? Le Coach est vivant. Le Falcon est tombé."},
 {qui:'regis',texte:"Va au fond du grand bain et regarde le carrelage. Il y a un mot gravé là-dessous depuis 1974. Ce n'est pas un mot d'ici."}
]},
acte1_cauchemar:{repliques:[
 {qui:'aldric',texte:"*Le givre remonte le long des casiers.* Marceau. Tu m'entends encore ?"},
 {qui:'coequipier',texte:"Je t'entends. *Un temps.* Mais je ne suis plus le seul à parler avec ma bouche."},
 {qui:'elle',texte:"Il a mis onze ans à mourir de froid, tu sais. *La voix sort du même corps.* J'ai tenu compagnie à chacune de ces onze années."},
 {qui:'aldric',texte:"Sors de lui."},
 {qui:'elle',texte:"Sors de MOI, Outlaw. J'étais là avant le pacte. Le vieux Verdier n'a pas fait naître grand-chose : il a juste ouvert."}
]},
acte2_cauchemar:{repliques:[
 {qui:'aldric',texte:"Le bois. *Les trous d'obus fument.* Poilu ! Tu es encore de garde ?"},
 {qui:'poilu',texte:"Cent-huit ans, mon gars. Et j'ai fini par comprendre ce que je gardais. *Il montre la terre.* Pas une tranchée. Une PORTE. Elle était là bien avant le hockey, bien avant le Coach."},
 {qui:'aldric',texte:"Alors elle a un nom. Les choses vieilles ont toujours un nom."},
 {qui:'poilu',texte:"Elle en a eu, et on les a effacés. *Il crache.* Un nom qu'on prononce, c'est une prise. C'est pour ça qu'on l'a rayé de toutes les pierres du bois."}
]},
acte3_cauchemar:{repliques:[
 {qui:'aldric',texte:"Sœur Vaast. J'ai besoin des registres, pas d'un cierge."},
 {qui:'vaast',texte:"*Elle pose une main sur le calice fêlé.* Les registres, je les ai brûlés en 1918. Sur ordre. On y avait consigné ce que les hommes du bois entendaient la nuit."},
 {qui:'aldric',texte:"Vous avez brûlé son nom."},
 {qui:'vaast',texte:"J'ai brûlé sa PRISE sur nous — c'est ce qu'on m'avait dit. *Un temps.* Je crois aujourd'hui qu'on m'a fait détruire la seule arme qu'on avait."},
 {qui:'elle',texte:"Elle a bien travaillé, la petite sœur. *Le calice se givre entre ses mains.* Cherche encore, Outlaw. J'aime te regarder chercher."}
]},
acte4_cauchemar:{repliques:[
 {qui:'aldric',texte:"*Le gymnase. Le Stilmat craque sous les roues.* Coach. Vous avez signé quelque chose. Sur ce papier, il y avait un nom."},
 {qui:'verdier',texte:"Je ne l'ai pas lu, Aldric. J'ai signé sous une ligne, dans le noir. *Il tremble.* Mais je l'ai ENTENDU. Une fois. Elle s'est présentée."},
 {qui:'aldric',texte:"Dites-le."},
 {qui:'verdier',texte:"*Il ouvre la bouche. Rien ne sort.* Elle me l'a repris. Elle reprend toujours ce qu'on pourrait retourner contre elle."},
 {qui:'aldric',texte:"*Il pose les cinq éclats sur le banc.* Alors on va le lui arracher."},
 {qui:'recit',texte:"*Les éclats reforgés s'allument ensemble. Pour la première fois, quelque chose dans le gymnase a peur.*"}
]},

/* ⚠ LA RÉVÉLATION DU NOM, ET ELLE N'EN PORTE AUCUN POUR L'INSTANT.
   Mirja donnera le nom ; la balise le fera apparaître ici et partout ailleurs
   d'un coup. Tant qu'elle vaut la périphrase, la scène tient debout et se lit
   comme une révélation manquée — ce qui est faux et sera corrigé le jour dit. */
final_cauchemar:{repliques:[
 {qui:'recit',texte:"*Les cinq éclats reforgés se plantent dans le Stilmat en étoile. Le givre s'arrête net à leur cercle.*"},
 {qui:'elle',texte:"*Pour la première fois, la voix vient d'UN endroit.* Tu n'as pas le droit de me tenir."},
 {qui:'aldric',texte:"Je n'ai pas cassé cinq reliques pour te libérer. Je les ai cassées pour te faire sortir."},
 {qui:'elle',texte:"Tu ne sais pas ce que je suis."},
 {qui:'aldric',texte:"Non. Mais Verdier a signé sous une ligne. Sœur Vaast a brûlé un registre. Le Poilu a gardé une porte pendant cent-huit ans. *Il lève sa crosse.* Et le carrelage du grand bain, lui, n'a pas brûlé."},
 {qui:'recit',texte:"*Il prononce le mot gravé sous l'eau depuis 1974.*"},
 {qui:'elle',nom:'',texte:"⟦ELLE⟧."},
 {qui:'aldric',texte:"*Il resserre les sangles.* Enchantée. Moi c'est Aldric, dernier des Outlaws de Moreuil. Et sur ce Stilmat, on joue à MES règles."}
]}

};



/* ================================================================
   LE MONDE HABITÉ — répliques déclenchées par le jeu       (v8.71)

   Chantier 6. Entre deux scènes, personne ne disait plus rien : le héros
   traversait des régions gelées, trouvait son premier objet magique et
   tombait à 10 % de vie dans le même silence.

   Ces répliques ne s'imposent JAMAIS : elles passent par la bulle, qui
   n'arrête rien. Et la plupart sont uniques dans la partie — la bonne
   phrase dite une fois vaut mieux que la même phrase dite trente fois.
   ================================================================ */
/* ⚠ LA LIGNE `gel` DISAIT « De la glace. […] Enfin un terrain que je
   connais. » — Aldric revendiquant la glace comme SON terrain, dans un jeu de
   roller en ligne. Septième faute §00 du chantier, et encore une table que le
   crible ne regardait pas (§41). Corrigée en v9.31 : c'est le GLISSEMENT
   qu'il connaît, pas la glace.

   Les six répliques d'ambiance sont indexées par identifiant de région. */
function replAmbiance(id){ return tOu('ambiance.'+id, AMBIANCE_REGION[id]||''); }

const AMBIANCE_REGION={
  sombre:  "Je ne vois pas à trois mètres. *Il ralentit.* C'est exactement comme ça qu'on perd un match.",
  nid:     "Ça grouille, là-devant. Elles pondent, ou quoi ?",
  ruine:   "*Les gravats accrochent ses roues.* Impossible de prendre de la vitesse là-dedans.",
  gel:     "Du givre partout. *Un sourire, le premier.* Ça glisse — et glisser, je sais faire.",
  malsain: "L'air pique. Il ne faudra pas traîner ici.",
  brasier: "*La chaleur ondule au-dessus du sol.* Ça brûle même à travers les patins."
};
let _regionDite=null, _ambCd=0;
function majAmbiance(dt){
  if(_ambCd>0)_ambCd-=dt;
  if(!level||level.kind==='village'||typeof regionEn!=='function')return;
  /* on annonce un CHANGEMENT de région, pas une présence : sinon la phrase
     revient à chaque pas passé sur la frontière */
  const r=regionEn(level,player.x,player.y);
  const id=r&&r.id;
  if(id&&id!==_regionDite){
    _regionDite=id;
    /* ⚠ `const t` MASQUAIT LA TRADUCTION ici aussi. Renommé `phrase`. */
    const phrase=replAmbiance(id);
    if(phrase&&_ambCd<=0&&repliqueUnique('reg_'+id,'aldric',phrase))_ambCd=6;
  }
  /* la salle unique : on la nomme en y entrant */
  if(level.salles&&level.salles.length){
    /* ⚠ `const t` masquait encore la traduction. Renommé `tuile`. */
    const tuile=tileAt(player.x,player.y);
    for(const S of level.salles){
      if(Math.abs(tuile.tx-S.tx)>S.r||Math.abs(tuile.ty-S.ty)>S.r)continue;
      if(_ambCd<=0&&repliqueUnique('salle_'+S.nom,'aldric',
          t('ambiance.salle',{nom:nomSalle(S.nom)})))_ambCd=6;
      if(typeof signalerLieu==='function')signalerLieu('salle');
      break;
    }
  }
}
/* Vie basse : ce n'est pas unique, mais c'est bridé — une fois par minute
   au plus, sinon la bulle devient une alarme et on cesse de la lire. */
let _cdVieBasse=0;
function alerteVieBasse(part){
  if(_cdVieBasse>0)return;
  if(part>0.25)return;
  _cdVieBasse=60;
  replique('aldric', t(part<=0.12?'ambiance.vieCritique':'ambiance.vieBasse'));
}

/* ================================================================
   RÉPLIQUES EN MARCHANT — la voix qui vient au joueur     (v8.71)

   Le canal que Diablo III réussit le mieux : un personnage parle, on
   continue à jouer. Rien ne s'arrête, rien ne se clique.

   À distinguer de `toast`, qui annonce un FAIT au joueur (« +200 or »,
   « niveau requis »). Ici c'est quelqu'un qui PARLE : il y a un portrait,
   un nom, et ça ne remplace pas l'annonce précédente — ça fait la queue.

   Trois répliques d'affilée ne se marchent donc pas dessus, et la file
   est bornée : au-delà, on jette les plus anciennes plutôt que de faire
   monologuer le jeu pendant une minute.
   ================================================================ */
const REPL_MAX=3, REPL_DUREE=4.2;
const _repl={file:[],t:0};
function replique(qui,texte,duree){
  if(!texte)return;
  if(_repl.file.length>=REPL_MAX)_repl.file.shift();
  _repl.file.push({qui,texte,duree:duree||REPL_DUREE});
  if(_repl.file.length===1)_afficherReplique();
}
/* Une réplique qui ne doit être dite qu'une fois dans la partie. */
function repliqueUnique(cle,qui,texte,duree){
  if(!player.dits)player.dits={};
  if(player.dits[cle])return false;
  player.dits[cle]=1;replique(qui,texte,duree);return true;
}
function _afficherReplique(){
  const r=_repl.file[0], b=document.getElementById('replBulle');
  if(!b)return;
  if(!r){b.classList.remove('on');return;}
  const V=(typeof VOIX!=='undefined'&&VOIX[r.qui])||{nom:''};
  const im=document.getElementById('replImg');
  const por=(typeof _voixPortrait==='function')?_voixPortrait(r.qui):null;
  if(im){ if(por){im.src=por;im.style.display='';} else im.style.display='none'; }
  const nm=document.getElementById('replNom');
  if(nm){nm.textContent=V.nom||'';nm.style.color=V.col||'#f4d35e';}
  const tx=document.getElementById('replTxt');
  if(tx)tx.innerHTML=(typeof _echapper==='function')?_echapper(r.texte):r.texte;
  b.classList.add('on');
  _repl.t=r.duree;
}
function majRepliques(dt){
  if(!_repl.file.length)return;
  _repl.t-=dt;
  if(_repl.t<=0){_repl.file.shift();_afficherReplique();}
}
function viderRepliques(){_repl.file.length=0;_repl.t=0;
  const b=document.getElementById('replBulle');if(b)b.classList.remove('on');}

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */
function set_CdVieBasse(v){_cdVieBasse=v;}

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */



