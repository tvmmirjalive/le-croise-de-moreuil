



















/* ================================================================
   VERROUILLAGE DU PAYSAGE, CÔTÉ WEB
   La coque native le verrouille déjà, mais si elle n'est pas à jour le jeu
   part en portrait. Ce verrou-ci vit dans le HTML : remplacer le seul fichier
   du jeu suffit alors à corriger l'orientation, sans retoucher au Kotlin.
   Sans effet au clavier-souris, où l'API n'existe pas.
   ================================================================ */

const BUILD='v9.66 — '+'2026-09-06';
/* ================================================================
   LES ORBES SE RAFRAÎCHISSENT À CHAQUE IMAGE

   Le mana se régénérait bien — 2 + 0,15 par point d'Énergie, par seconde —
   mais la boucle de jeu n'appelait JAMAIS refreshHud(). Les orbes ne se
   remettaient à jour que sur un événement : potion bue, niveau gagné,
   panneau ouvert. On voyait donc 10/63 figé pendant que la valeur interne
   montait à 27, puis un saut brutal. D'où « le mana ne se régénère pas ».

   refreshHud() recalcule tout le bandeau (or, potions, pastilles, fiche de
   personnage) : trop lourd pour 60 fois par seconde. On extrait donc le
   strict nécessaire, et la boucle n'appelle que ça.
   ================================================================ */
let _orbHp=-1,_orbMp=-1;
/* LES NOMS DE SORTS, D'ARCHÉTYPES ET DE NŒUDS D'ARBRE.

   Clé par identifiant pour les sorts et les nœuds — le cas simple. Pour
   l'archétype, la clé se déduit du libellé français, parce que `ARCH` EST
   indexé par lui : il fait correspondre « Mêlée » à une couleur. La donnée
   reste donc française, seul l'affichage se traduit. */
function nomSort(cle){ const d=SKILLS[cle]; return tOu('sort.'+cle+'.nom', d?d.name:''); }
function descSort(cle){ const d=SKILLS[cle]; return tOu('sort.'+cle+'.desc', d?d.desc:''); }
function nomNoeud(n){ return n?tOu('noeud.'+n.id, n.name||'') : ''; }
function nomArch(a){
  const k=String(a||'').toLowerCase().split('\u00ea').join('e').split('\u00e9').join('e');
  return tOu('arch.'+k, a||'');
}
function majOrbes(st){
  st=st||P();
  const hp=Math.ceil(player.hp), mp=Math.ceil(player.mp);
  if(hp!==_orbHp){                        // on ne touche au DOM que si ça change
    _orbHp=hp;
    document.getElementById('hpFill').style.height=(clamp(player.hp/st.hpMax,0,1)*100)+'%';
    document.getElementById('hpLbl').textContent=hp+'/'+st.hpMax;
  }
  if(mp!==_orbMp){
    _orbMp=mp;
    document.getElementById('mpFill').style.height=(clamp(player.mp/st.mpMax,0,1)*100)+'%';
    document.getElementById('mpLbl').textContent=mp+'/'+st.mpMax;
  }
}
/* Une vie non finie fige la jauge et affiche « NaN / … » : le run est
   perdu sans que rien ne le signale. On rattrape au lieu de laisser courir. */
function vieSaine(){
  if(!Number.isFinite(player.hp)){player.hp=P().hpMax;return false;}
  if(!Number.isFinite(player.mp))player.mp=P().mpMax;
  return true;
}
function refreshHud(){
  vieSaine();
  if(typeof majSuivi==='function')majSuivi();
  if(typeof updateBadges==='function')updateBadges();
  if(typeof majRappelSac==='function')majRappelSac();
  if(typeof caleBarreOnglets==='function')caleBarreOnglets();
  {const _bv=document.getElementById('buildTag');if(_bv&&!_bv._set){_bv.textContent='build '+BUILD;_bv._set=1;}}
  const st=P();player.hp=Math.min(player.hp,st.hpMax);player.mp=Math.min(player.mp,st.mpMax);
  majOrbes(st);



  document.getElementById('tLvl').textContent=player.lvl;
  document.getElementById('xpFill').style.width=(player.xp/player.xpNext*100)+'%';
  document.getElementById('lvlText').textContent='Niv. '+player.lvl+' — '+player.xp+' / '+player.xpNext+' XP';
  document.getElementById('potCount').textContent=player.potions;setTxt('manaCount',player.manaPots);setTxt('hScrolls',player.scrollsId||0);setTxt('invScrolls',player.scrollsId||0);
  document.getElementById('statPts').textContent=player.statPts;
  document.getElementById('sStr').textContent=st.str;document.getElementById('sDex').textContent=st.dex;
  document.getElementById('sVit').textContent=st.vit;document.getElementById('sEne').textContent=st.ene;
  {const e=document.getElementById('sAgi');if(e)e.textContent=st.agi;}
  document.getElementById('dDmg').textContent=st.dmgMin+' - '+st.dmgMax;
  document.getElementById('dHp').textContent=st.hpMax;document.getElementById('dMp').textContent=st.mpMax;
  document.getElementById('dDef').textContent=st.def;setTxt('dSet',st.uc>=2?t('perso.uniquesActif',{n:st.uc}):t('perso.uniques',{n:st.uc}));setTxt('dMF',(st.mf||0)+'%');/* LA CHANCE EST BORNÉE EN DUR À 80 % : afficher 439 % serait un mensonge, et
     c'est exactement ce que la fiche faisait. On montre la valeur EFFECTIVE, et
     le surplus converti quand il y en a — sinon le joueur ne comprend pas où
     passent les points qu'il ramasse. */
  {const brut=Math.round(st.crit||0), eff=chanceCritique(brut);
   setTxt('dCrit', eff+'%'+(brut>eff?' (sur '+brut+'% \u2014 le surplus passe en d\u00e9g\u00e2ts)':''));
   /* Le MULTIPLICATEUR, pas le nombre brut : « x3,05 » se lit, « 105 » non.
      Meme forme que Diablo III, ou les degats critiques sont un pourcentage
      additif ; la base y est +50 %, ici +100 %. */
   const m=multCritique(brut, st.critDmg||0);
   setTxt('dCritDmg', '\u00d7'+(Math.round(m*100)/100)+'  (+'+Math.round((m-1)*100)+'%)');}
  setTxt('dLeech',(st.leech||0)+'%');setTxt('dCast',(st.cast||0)+'%');
  setTxt('dPick',Math.round(ORBE_R_AIMANT*(1+(st.pick||0)/100))+' px'+((st.pick||0)>0?'  (+'+st.pick+'%)':''));
  {const f=st.atkFrames||14, aps=(ATK_FPS/f);
   setTxt('dAtk',f+' images — '+aps.toFixed(2)+' att./s  ('+(st.ias||0)+'% brut, '+(st.eias||0)+'% effectif)');
   const bp=nextBreakpoint(st.agi||10,st.ias||0);
   setTxt('dAtkNext', bp? t('perso.prochainPalier',{need:bp.need,manque:bp.manque,
                              images:bp.frames,att:(ATK_FPS/bp.frames).toFixed(2)})
                        : t('perso.palierMax'));}
  document.getElementById('dTotalDmg').textContent=player.totalDmg.toLocaleString('fr-FR');
  bindEquipSlot('slotWeapon','eqWeapon','weapon');
  bindEquipSlot('slotArmor','eqArmor','armor');
  bindEquipSlot('slotAmulet','eqAmulet','amulet');bindEquipSlot('slotRing','eqRing','ring');bindEquipSlot('slotRing2','eqRing2','ring2');bindEquipSlot('slotHelm','eqHelm','helm');bindEquipSlot('slotGloves','eqGloves','gloves');bindEquipSlot('slotBelt','eqBelt','belt');bindEquipSlot('slotSkates','eqSkates','skates');
  if(typeof majFicheEquip==='function')majFicheEquip();
  /* Les boutons du parangon ont leur propre règle de blocage : ils ne
     dépendent pas de statPts. Sans ce filtre, refreshHud les rouvrait tous. */
  document.querySelectorAll('.plusBtn:not(.paraBtn)').forEach(b=>b.disabled=player.statPts<=0);
  majBadgeParagon();
  {const _tp=document.getElementById('treePts');if(_tp)_tp.textContent=player.treePts;}
  // ressources
  const g=player.gold,f=player.frags;
  setTxt('cGold',g);setTxt('cFrags',f);setTxt('invGold',g);setTxt('invFrags',f);
  setTxt('hGold',g);setTxt('hFrags',f);setTxt('hPot',player.potions);setTxt('hMana',player.manaPots);setTxt('hPortal',player.portals||0);
  setTxt('shopGold',g);setTxt('shopFrags',f);
}
function setTxt(id,v){const el=document.getElementById(id);if(el)el.textContent=v;}
/* Emplacement sélectionné dans la poupée : sa fiche s'affiche en dessous.
   Un second appui sur la même case retire la pièce — au doigt, retirer d'un
   simple contact ne laissait aucune chance de lire les caractéristiques. */
let eqSel=null;
/* Libellés des emplacements vides. Définis ICI et pas dans un attribut data-
   du balisage : une seule source, et vérifiable par les tests. */
const EQ_SIL={"weapon": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAACFElEQVR42u1YXUvCUBh+ZiYum2EUBlYmBEYYXURFFEESdNGvD7xIWFlEsJVlOpdrfpwuYpBuZ9/qGey53Hb0fZ7387xAjBgxIg2ORaNy+TKhvWvJ9TGbk6wqe3p2gqfG59gzsVEzfZdg0Xh16D4wmCOQzBbJYiptUh8AEik+Gh7YWi9E1wMAsLJiTk1ZEqE377lIEGi3B9H0QDJbJNfVS0v1qWdYImCVpACg9DQMOs8c0x5IZoukenFsqj526jObA5M9gaZ+JAiM9B77HjCS1yp87NRn3gNuRoq5V6FcvkzOb64g3r2Y1B/pGvt9QOlpnksnMx4o7B4RIbOBQUc1vRP4NFodxjux/NbETmnVlLyKKkV7mPtWuqabF3MEaKXza9T1Nn6wpv7Pm+Ra/bkRoKlvV5Ui4QGxUXNVOudKwE59XyM4Sx4Q+DTbBOzUlyXRU/LOnICT8b5/dxaGC3zactP2H37UtyWwd3hLgihjlMTdUgUAQkvaSXC0ERf4209O88+DxD7VA7l8mSwJyzio7E/VcL+NyzGJlZ6Gte3NmRjv5sromUAixePnYzCTyuRlC+2agNMWICw8vj5Y7joD5wBtOxZ26Li57/oikFkgUzX+5f0VfYdlVeBO7OVK51X5vq6FEjpUAi25zn0r3dBJyJIIdciFajy1kRn9QB1yjiH1v5JkFgiMM8Zz43yQZhUjRgw6fgG2YwqSgKslhgAAAABJRU5ErkJggg==", "armor": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAD1klEQVR42u1Zz2saQRT+3NXRXY2uSSWHQKHQXJNCAzY9pAcL9ibkz+tf0FPAQ6E5eGgvqdBeml6EQEODEAm2G6u7m1V3ezAzmdX95WZNm9YHAWezvvm+997M+2YElra0pS1taf+zJWJzJKzYQlJk47GpJqJ83xqNAQC29SuxMAIJYcWefrZb3WefV4sP8PbN6/AghBWb/z4AHB0ezLzn5i8ZBTw/ma4PAADdThsAIOcV/AAwyYZiW6OxJ5HpqOv6AH1DAwA82asCACQpy5Oyp30l501xuVKDrg+g9VT2P0MzuTdvnidTaSAFjIYiy5g1GoOWWjKVBgCMcMV8mpoJy9Ih5AoAwOaR8wp2q/s4Ojyw+WyEIiASxS5XagCAi58XEEwTWv/S9V1DA+T8VJpTaaSIBAAYmjr7TMe8WdZk7Oa/b2isVJuNuj021UQoAjTFQeB5ADS6PFiv8Wh4FYiBznkBoFQsMUxCqPJJTFIcBJ5N1lPxdO/VDFgvK1dq6BtaKN+CabJ1F5pAFOMnCWOCaUaaZyEEtP4ltJ6Kze2dwHc3t3fQ7bRDRd/NQq0B205HIkEBSlIWXz6+nwFOyy0q+Eh9IAoJt2z0DS30moqNgHO/B+Trvbr97QQbjx67gqHPDM1ERiY3vnyAC4KEbuc71tYfOnY26kfOTxrl2AyxBkSi2LvVfWg91eFIzhVw2jrGaes4FHnL0idr4/rPzyjR87MWzs9aLFDMT09FuVKDSBQ7kADdbx0TrJZw8vWT8z1CYi0/vsGdto4dJELvQlT36PqAlY8gSMhlZM/Ux2EWITM9xCKEkTA0E91OG+VKLbiEqEah5cPX8V0aHzSKRdcH3gRo9Kk6/BMWppN7EuAPJ9PGS1w+QvwijyvafnP2DS24hKgzOVdwXUgpImFze8chr2/dP3oqtp69YGNe7PE4chnZm8DYVBPNRh2SlMXa+gYsQiYLKa/M7BaLKDNdH8xIbTmvzOAIPPKJZHKq4k9hzUbdoSRvo2U8e8FqCaViCZ8/vGMZoGcSisEajYM7MT2cNxt1e/rALRLFXtQCpup0NLxyYKC9aa4Tmdctg1uTi9v4Odww3EpOC0lxbt0fe6biis69JHAnAH36UWwEpmX2vcvAIvVRUJn+9SW00COlkBQdGiWuZibnCjMd31N03nYyemtHZbdxfTUYKSCChIw8kQmSlMXR4UHgBXEs1+siUeyt5y+ZEHM7E/tFe1rvhAUfGwFeM9FbZSp3/S6t6DG0VCyxZ/RafaG/D4QhAjh/M/AzKg79ruLvjIAXGd+LszlBL21pS/uH7Dec+hBO3n0KxgAAAABJRU5ErkJggg==", "amulet": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAACt0lEQVR42u1YQWsTQRT+ZpZdKySglJSARQxe6qERD4LEU0sMeIoNeCgtaPRUf4E/x0PFm9WLB4knSURykCSHBqQESoSFXIRNiTVmn4fNLrGm7c7uzGYD/S4hmzDzffO99/bNA84B1wwqbu4Q1wxChPC7Lz9vIdumfz6jhpR9uWbQ8/IzAtMpqtN/8uKl5P2YToVSWbkIrhlC+3DEDLZNuHxpQdHqTKfi5o46F1SvP1kdZG8iGjqRlLi45ZcSEZGevPTNZ3HyZ4rwS2T8XxkOMmkxvLENAPi4t+s8oyFzBQKAPfrNXIHufyvvXzvP4wCuGeSGRKFUJq4ZNJknXDMo9+Cx99tMw8aPELfUugJiT/wsIXNF/KSIxNUbSltx5b1Qbm3NaYkVOcBUnn6+uOV9//zhDQbHI686xdsBpnvk69UanNJZBudMuhNcBXm3zterNSSTSdSrNQyOfyFf3ALoT4xzYAp5AJ4IACiUngJgFD8Bp5B3oUoEk52w08hPwrIs3L2fc9qOt68AEJupABHyU0Xs7YaqTFxmtfFD/mQ45fKPQlUmpirm/cCyLNzKZgEAtcq7QE6wqMJGVTjxWZL/rzptbAuHExMlf2+9iEQygXazJf0duJJdFXZC2IHBUR8901TSgQRZV0iAPRri+/4+Uum0EgGpdFrYWUEHiPV//kC72fLsDovFpZQXPu1mC4cHDaFEDlZGmU7Xb97GciaDbqcjJfbbzRa6nabwJT/Yi4yG7PCggW6nE9qJMOTDtxJjJ1wSQcmLho28VmLsRJCckEFeTjsdQMRKdhU90wxNXt59QECES/7bl4qU+7G8C40PEbLJq5lKnJLYy5kMBkd9qeTVXOqnOLG4lPLIJ65cm4+50KQTPdNE4+snZ8AleS6kFkynO7mH49Eim7/ZqCtiLge7F7jAnOAvIHO+Le0111QAAAAASUVORK5CYII=", "ring": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABfElEQVR42u1Yy46CQBCcJlFjNHEvysXgwfD/H0Q8aLzwAYQABz31Bs0ydPUMgU26ztrTNdWPGpwzGAwGg8EwHyhWoM0ufSG/b6qSZiUwlPBqvRX9v2vrKIRIm/x3otnlDMW4FcUH2a6tVSRIc+vXPJ+knm9FAatBaLlMlTzjcX/+lpeECM1966FqUIzk+7cmRXo6uv3hRxTXR4K0yT/uz49pgjYgx+dGHhoCYyRIm7w2cU1/+Ugk2iZrqpJiLKN+HFY1aIzyjP9LUklNhqqBnp1obn6qydNUJXVtDSmRLCX5bxI8RqMQWDIWS0BqCkUE0CUVA9IzRQSuee5W6y3s+UP2gtS6iEsou5wnJ8FjFPFd8CbWWN7QHeA7M0GbiEltdukrhhr9OOijaNTMDd1ITDM35oPGFCetrKF2GomrstNzP2ik25+QBtPWKZo48sgntGYl0oc+I5GeIs3U8E0nNFlWVjsMon3YknqXRXzYQpTx2WZnMBgMBoPhn+MNy8AfSRq+tL0AAAAASUVORK5CYII=", "ring2": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABfElEQVR42u1Yy46CQBCcJlFjNHEvysXgwfD/H0Q8aLzwAYQABz31Bs0ydPUMgU26ztrTNdWPGpwzGAwGg8EwHyhWoM0ufSG/b6qSZiUwlPBqvRX9v2vrKIRIm/x3otnlDMW4FcUH2a6tVSRIc+vXPJ+knm9FAatBaLlMlTzjcX/+lpeECM1966FqUIzk+7cmRXo6uv3hRxTXR4K0yT/uz49pgjYgx+dGHhoCYyRIm7w2cU1/+Ugk2iZrqpJiLKN+HFY1aIzyjP9LUklNhqqBnp1obn6qydNUJXVtDSmRLCX5bxI8RqMQWDIWS0BqCkUE0CUVA9IzRQSuee5W6y3s+UP2gtS6iEsou5wnJ8FjFPFd8CbWWN7QHeA7M0GbiEltdukrhhr9OOijaNTMDd1ITDM35oPGFCetrKF2GomrstNzP2ik25+QBtPWKZo48sgntGYl0oc+I5GeIs3U8E0nNFlWVjsMon3YknqXRXzYQpTx2WZnMBgMBoPhn+MNy8AfSRq+tL0AAAAASUVORK5CYII=", "helm": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAACMElEQVR42u1ZPW+DMBA9I6BMaTJF6hJVqpROGTv2x2fMmKmRKlUsnTMaPLhD4shxDdh3Z1BVbuTDvHf3fHc+AP64Ca6FNts3DaIC0BIAAFQroSgr77OqvTxj369PBzEJgdV6qxfLRwBRRb1XlACqvb9Wf+zFqARW661erNZQlMazOOAUEoIimeKhsmTBp2vVnOH76xiELcfvnjTgL9Fcpo2A8X4fcJ9UYqQWKqeMAt4A8mca/zXOaKEIpJJOZ2rmlNAt149pWvbWiCzW+32ySVNqKx4JPT3vNExkL7t3TSbQ1RbgU2VEXWg5NzECgP2eeTdqjWt/RSYw1AaEepIznWYUGWAiMVkdqE8HMVS8UhlbGnXBU7zJ5YiMIgEKiMn2gAuaQoIjClms11zPcWSlSbJQCsNktpzyQTsr+Xr/IQ93gY2pN3msh7oW9oGhajyESEbxeBdAjkob2nLkWNm40rnzlpkNNf6Z0F1jONCiq0YyEtAS7EmEDfzzuCeNaNwpR0gVjpaQbzHVSNRAKhZokjSqWvyHfeZGMSSq8a2ErUkt2WuBWX9I+2gC9ekgQhenkkgmoTFIhEqT3Er0HbhTzIFIc6G+1Gc2nD07Ksprlrp605BVjQTzL8Hcu038GhmVGARXBFT7u070nR3coocBz0IAAGDzeiERMiu1nzFV3dwb/QeHj0RsI0cBz3oewAIoSiBVcrYIYLMStYdiJ2BLyqf3W//E2ILMNttss832f+0HXJEXH3hCz04AAAAASUVORK5CYII=", "gloves": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAC4ElEQVR42u1ZW4+aQBg9bGAwFVIxW6TpelnNxhf7/5/7HzZpjNmNqA/ImtAEalY0nT7sjhkEK5cBuwnncRxhznzf+W4ANWrUqHFNSKIepBkDqhAV+3CHwJtLVRGQRT7Maln4HW4ADGjgzSWjM6YASiWVmcDXb9/p6yEEO5hCVABA7+4BAECgo0l8LAHakAlMqw8AeHoGBSCcSCYC7EbZYQFgsZrF9hFNh05v4b9sYL6vjYYTuI4NhYypt54KI3FT9AG9uwfsw11svSU132/+8bhmWv3EvZUR2Ic7MPfhMRpOIgdlVhgNJwCAMPAjezVjQP8bCzB0zX6MBE+mLKQioBkDanTGlAn2nN+fusw563TNvjArSGkOr3/Sj9GEPyRzER5Jv4WBj6VrR9Zcx8brIURRQaeygEL+xG4w6bbPkSoTFwkE3lzyt4ezAnUdO/Yf/cttxM2IpqPdasL1nUhEasjkGJpLtYC3nkpJfj8aTuBv/ZgmTN1CQybRHNK+h6lb0X0CwmrqKJT1RbxmrupCvN/z8Zy3wj7cJf6WBkXzQmoCP6c/JOeXg3OutHTtj1NOG50x5eshEVisZrlC6g0+OHInkaTKtAjyJrbUm3mh8TW9SHfKQyKTCylEhULUWPJJEnYesNCbJSrJaW+/a/aPBdtiNYPRGVPRtX2efJNLxElNTFJJkTcvVNLUn75IFAHmqprxNhgQKmJWhZbZoJxq69JEI1PIYuLi9XBtEplciD1kCdB22ITRvi+dwCVRF+qGNGNAq2hgWOOUZIXC8xnmVgpRIbo+unR4IQSSMrUoq7AE+S8NCCvm+BeIyMysv/DWU0lYFMpS6DHx5bXG0/MjFKJerItKH4NnETq79aVrpx4Cy6gAYeCnyhusq8sywa6EQJoy2t/6uUbvpRMIvLnkEJX2TiyQx12uZoGGTOA69rHeZ6PGrO5yFRHzkanx+c0K/sum0u9oQkmI/DZQo0YN4C9zi3bJjDf9jQAAAABJRU5ErkJggg==", "belt": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAA5klEQVR42u3WOxKCMBQF0HxAwlhYORauwEYbWYNLdgc0WuAirCgcK6MBYiEORFPIx9HoPR2TScjNAx6EAAAAAAAAwGfQvhbiYqqbzsnlvvP9vT427zGq59Gy8bwkTo3QRX6hnSvA+EBTf9xokUWLzdvsNtvqUHhGsrw6X61Sa0jjIhRCz6LVVz/zSbw2QjCjhHzk3EtsBKiXzMkAHs/cDuCi3wrA8qP7nTgYTrSSh9tg2Q/u3+CnyeX4O/rAo5f6QJffiDYh6hvWKu2nE7cVCqHPqrBWyVbBwGfkJCUlAAAAAAAA/+oKQEFKKtvbfZkAAAAASUVORK5CYII=", "skates": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABMElEQVR42u1YMQ6DMAyMLSj8oQtbN5aOvJ+xC1s3lv4BxJBOVLQS4EQ2xJVvQgIFO2efL3HOYDAYDAbDeQCJRau68fNz37UgmUDGEaQqBkIDn8bBvZ4PMRZQetfzohRlAEN3MzWgUw5LQE0CVd342Ia83u5eNQOSSnRYCUmxcFgCeVGKTG+k1r+ET1KrQlXdeK5ETpVRjkSA2oCSSjKNw0epQu03nFG3VFCSSXoSUzYueSuxlwRyUWlmLvIMAhx0rjE0f79UGe5GBq5aDCkzSnNS18skmm3r59ySDCnqfwgrqCX4tZhQS/BrsWGMdKmfA33XAlUlqN+GrPn/txIS1lmqLDFkiEzj8PVuj/Ll+60L3t81i/JCllLyHNi6ZV4eeGbbsGcvqDZEi6k0GAyReAN8SphgACVwbAAAAABJRU5ErkJggg=="};
const PASTILLE={"sort": "data:image/png;base64,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", "passif": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAOn0lEQVR42u2bfVBV95nHP/eA8irXi4S3EKXiS8KLJu7NDbtCTWQtgtM6S3BTp+jakm6MjEvazMRMqokxbXf9I07Q0KS2pBNDE43ESZr4khCiBowGidGgRlEICkJA3i4CgsA5+8f1/DjnvgPa6c76zNyB+3bO+X6f7/Pye37nwh27Y/+vzfD3OIlkMChj+Z6sKIb/swTYg44z+ZOaMN2r75afqaO2s//vQobhdgH3ReHB2FAAcjMsPPzwNEKSwj1+v7u6lY6ODtrbJLa9UwbA/nMdACiycsuJMNwOj09EYcf6xSx57H7xfsX737GpqNTjcUKUQZ56PJOZsyaL1zo6Oti47SCfnm1DBoYlieFh2fAPQYAW+KqUeNavTRGeXppZ6PD553MXMSVM5oWXP8MwceT0W194lI6ODvI3l+k+bwqU2PrCo+L59uKDbPmwhqGblz5eRRjGC94XBQmoeG0ZsQvudQBuCpQEwBXrdgPw1uZlAPzXi++J9wDynnmbbsMECtalsXHbQXGM4d4B8XpoaCgXarrIe62Muqb2cZMgjdfzz2XPo/HsBmIX3MvSzEKWZhZiCpSYHRNFwbo08fkV63bz1uZlzI6JEkRobcW63fgE+fHW5mU6FWxc+whR90xldkwU+ZvLWLFuN1PCZAqfTOP57AfGVWXGrADV88XrF2NOmiYAqBJXk5c7aWtjvtswQacWgKwFZubMmaRTwsosMwXFleI8AFearKx57QA3MIxJCaP6go+PpCiyQpzJn49fX6kDrr2orW9+yu82PM76zUW676/MMgvCXNkHH35L2YmzutfWLk9j65uf8h8/fZATp+oor25zOOdPN+zCOoa8YBit5+3Bq15buzyNTUWl5OdYACgorsQUKBEeGsGan8UD8M0316hprHN7juzMuSPyv+n9zj6Z3AwLA7JE8cfHyM2wULTfdvzOPllHQvcoK4RhNOCNKHy16wkHyQO88ud9vPTsYiH1eTNC+NUv0wHYsfs4L+05OaIkWWZYkvCRZd05hjBgkAz8249+yC/nRzAlzPb+m+8d58TFbkKUQX6+Yj4FxZXk51jYsadKEKReR8aGdzFIBq9JMHgLfiIKFa8tIzQ0VIBXvb9x7SMA5G8uwxQoiefLn/uIOuuAAP1YUiSvFGYyPHRKH1q+I15/o/Arnt1djY8sM4SBOJM/r/76J1gHrLy58zhdQwq5GTaVqSrQkmAdsLLytwcY9FIJBm+z/du/SsaSPMcBvH2MT797EgApT+5mUJL4n2VJPPVqnvhMZ/Uf3Z7v7CFfQiacAeAvh8Mo/PQSADvXp4vPqInQ/hpUEs6eb+bp4nKv8oHkDfi8f52mA6/KTWtbX3gUc9I0Nm47yEN57zEoSbQeWsUv8v4J/MJGHp46wZvgAdJn9fPGahuhy3//iQCen2NxAL8yywzApqJS4mdH8cyPZ2KQDB5LpMc+wIgiYlkLfu3yNF2tBpi5/E/sP9dB66FVtB5aBYC/Sd//m8y/cXmuxiPnnb7+tzURFP1nMEfrO8n57QEdYO3/agK2Dlh5xPIAiqxgkAxja4RU5l5+crFDuXvlz/ucggcEcLEuiHRcATojwRn46KgewqRAAMKkQP62JgLAKQkFxZVcqe/ThcgzP56JIituVeBWAatS4pkzZ5JoWefNCGFTUSlPPZ7JpqJSlBu24z6U955T8IBL2WtJcOV5Z7ZnTSSShgQVcHZKIiUVp8Vrm4pKmTd3OpnxU0avAB8fSQG4725fkVzycyykJt+LKVBiU1EppkCJF59eyKsl512D92Am829oqB8g4v4Ip+8HhDknr2RNpK287qkSoaiCz0lPJic92SE8XKnAKQGKrGBE4ZGHZ7Fx20GRcP7y1hHWLk8Tpa69TWJHWfWYwKsWedd1AJckuLLtq0PYd7adusZroizm51go/viYQ7WYiOK9AsQi57G5utd37Kni5yvms+2dMiH9pRt2jazY7Gr7WCzi/giviVBzQ23HgCiJBcWV5GboSQD475wf6pTtUQG+KDyalczBQzV09slCRmrn9eLTCynZd4obGHhj9ST6rYcZ7O2i33pY9xgPEXELYohO8Cc6qsfpA+BnSRFs2f0Zl6+2imss2l+pqwhX6vswTgoUyvaKgB/F22Lv/S8bMAVKIta0WXf7580ALFpyl0sg/dbDdJ/8aNQEBBttq8OmM7a5YFNzsMMD4LFUm7OKv7gsVpb5ORZyMyxC/iUVpwmegstkOKp5QEFxJSuzzNRduUaXtYfyLe4z7ISgyQwPnaKz6ndjBu8qEaoq2L46hLqmdtqvSvxkcaoAPqaBiBr/afPiqaq+RMsNSXh92ztlIhn+qbQJgNiZRq9P5A0J9uDtAduHgPoX4PiZS/hJsi4M1OTY026bLzjrDB0UEGfyJ3V+BGfPtQJw4lSdTvoAZV9WA1B/wUp347BL74+GBHfg45L8nX7nmyuSbpQ+II88z82wcPmqDYP1Wh93RxuZbvRz6AwdCJgdFQRAaVU9ERNlyqvbOHGqjs4+mawFZtqv2r5S9VIQoQG2WHRFgjdK+P5qgFvwqqlx7wz8G6snUdvZT39vj+gBLl9tpbSq3uawmwOWcGOAQyJ0mwNy0pPJzbDoJjCumhQtCc6870kJ7sDbq0AL3pWVVtWTn2MhOyVRv/z1pACA9jbby3vLKwmeMlJSPG5qjFYJA23MmDHkEby35h8ULPJAfo6FK/V9wvvWAavTUujr7oDhoRGi9ntrNhLavfrsYO9mgo0TiE7wZ4h/8fj5S4ffdel9X023p5ZupwMQyQDDyvjH4q6stto7b0Yn+NNysoUe66DXx7bPA7dkR8tBmn0jc7rWjhaHZaefJOvYHi348ISFhCcspPZwo9fx76wFdhtemu41MS509KtBNV4S40J1s3hvPe+KiPCEhULKwUGaKVCMD61nPnN7/KM797klQd0q+/rCOV3TNq6dofLqNgqKK5kdE0VqUhh7Do/E1a6PrF57PjrBn+gEf3z5gvaqEfCjJcGVEsqOjPx/4mI3i8yxYnHkrIJ5JOBKfZ/I/DnpyTyYMI3TtR0j5TElgU17u6it7ncAr3Zq19vaCInxITphpHy1VI3I/ir+XEXf4Lgi4ejOfboO0J6Ev1a36Hr90qp6lqRaRE+QtcDMlfo+Wm5Ingm4NiHEYWdmb3mlLj88mDDNZavqyrTgAdFEOQxFb5Lgyxdu1wD251qSatFVAfslsT0mpwTIimI4U3tZlwjVA2UtGFluqrV2V7l7mbacbHEKHsDneptbEtTEeOnwu05JaGoOpk3u08lfvVY19rUkdPbJfPd9h8Nega838ZYYF0pFdQM56cnioJnxU3j7TCtp820g2lzU56adXcyagcdV42BvlwMJat0Pkxy7v+vNk4BJ7Kq+QGb8SFeanZLIgUMNzI6J4nxjMzPjYkafA45d7uLAoQaRByKMkZxvbBbgB2SJrAVmFFkhd7tr2V9vtk13ai4GU3NxxNvDAWEMB4S5XUCp6qlv8KHhyiSuN0foHgCXZAOSRp0tNyRKKk5zvrFZhOlDM2KoqG7gaH2ndwSoraLaA2gHjqZAieyUREGEuj/vrdkTofX+hKDJNB45T8vJFgFekDHUJh5a2/JhDc9mzxNyz1sYjylQcsgBTb1D3itA3Uraf66DA4caxJp6kTlWlxv2HK5i6l3hTJBltypw1TOo1WOwt4uWky0uR+MRvmFO/8/74CISMPWucLH+9w8KprNPJm1evKhgx89c4pOva1xumLqcCqumrrFLq+rJSU8WalDJ+MOTi/FxQoIqU3f25akOSvde9Twj9A1zAK8OO63X+nRJUHuNWiU7mwe6JEBWFIMiK7xffRk/SRb1VJXVInMs2SmJgvnXXZDgrbla4Djr/VXwL+ekAlD42VkWmWNJTQrTXWNuhoX+3h7OddkWQK42Sd12gtZrvaLsqSRkpySKQcO8GSGChIInMlFkhV+8fk0Xu85qdpvcR5vcp1dDVRTdgwlOa749+OezH8A/KJg/7D1Oyn3RomtVw1Ulo6TiNN993+HS+24JUBlrtV6norpB1P6SitNiyHDiYjemQEmQUPhEho19J0pQGyV74GLAEtXCt6c69EtrDSEq+MInMoiYEknxx8cINwZwobZROEa9jlkx0/m8pklkfndb5G63TtWNhB9EhvLcUrO4RUXbcWnzgTZUjl221fUNGUbM0/yIjurxOMlR88Z9c20ruENf1bBpr+04/xxrcghFV1Ms+2twd6OE1zdI2F+Adn++s09mZlwMFd82kbcwHv8gW+zm/3GfuO1lQ4aR2Hs8T4yuN0fwRd01/lrdIoa0v/73R3SJTm1yxgveKwJUEgySgUVzZ7LUEudAgjl+KgBG/2BKKk5jCpR0vfkHlbWiFLnbs9fGamb8FHGM/t4e3eZnf28P1v4ekYvswX/bOYj1Wu+tuUVGtYkGlGFJIuPeUHFhqhS1W9PasFCTUYQx0uOiRDW1hgN8Uv41UfdMFd7Wqm5J6sgeoD34LmuP17fKjek2uXBjgDjplncPEm4MECRovW8fq9oJrRomDguo9u91ntV+TyXPFfhW63VqO/tv732CBsnADyJDiZgoO01K2SmJlJ04KxJjfo5l1NtVWllrj619bk+0Ct5T1h8XAfZEJE+djClQEouR3fuOADB3TpSozaZAibR58ZRUnGZ2TBRTI/0orap3epfZklQLl5ouUl7dRk56MnvLK0WCBUTJU4lX3x+L58dFgH11UD3d046uVKYmhdHaOYHzjc0sMseKllrrTVOgpJs72qsqNSlMjLXUUNC2ut5m+1tOgDMStADc1WsteDVh2svd/vP9vT0O4I/Wd47qrtBbToA2HACSp052SoSn5sVdQ+MnyXxe0yTkrwJXNznG+8uRW/6TGYNkYLrRj3BjgFNA3po9YfYDjVv126Hb9qMp+9AYj6lx/g/9oylXoaF2ftrwGA3o2wX8thPgKk94a7cT9B27Y3dM2P8CmeFCU1LdEUAAAAAASUVORK5CYII=", "cle": "data:image/png;base64,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"};
const EQ_NOMS={weapon:'Arme',armor:'Armure',amulet:'Amulette',ring:'Anneau',
  ring2:'Anneau 2',helm:'Casque',gloves:'Gants',belt:'Ceinture',skates:'Patins'};
function srcHTML(){return document.documentElement.__srcHTML||'';}   /* pour les tests */
function bindEquipSlot(slotId,valId,slot){
  const it=player.equip[slot];
  const lib=document.getElementById(valId); if(lib)lib.innerHTML=it?itemLabel(it):'—';
  const el=document.getElementById(slotId); if(!el)return;
  el.innerHTML='';
  el.classList.toggle('sel',eqSel===slot&&!!it);
  if(it){
    const url=(it.img&&typeof MISC_ICON!=='undefined')?MISC_ICON[it.img]:null;
    const stAtlas=(!url&&it.img)?iconeObjetStyle(it.img,34):null;
    if(url){const im=document.createElement('img');im.src=url;im.alt='';el.appendChild(im);}
    else if(stAtlas){const sp=document.createElement('span');sp.className='itemIco';
      sp.setAttribute('style',stAtlas);el.appendChild(sp);}
    else{const s=document.createElement('span');s.className='lb';
      s.style.color=(RAR[it.rarity]&&RAR[it.rarity].col)||'#e8ecf6';
      s.textContent=nomObjet(it).replace(/<[^>]+>/g,'').slice(0,18);el.appendChild(s);}
    el.style.borderColor=(RAR[it.rarity]&&RAR[it.rarity].col)||'#2a3350';
    /* Barre de solidité : on repère une pièce à réparer sans ouvrir la fiche. */
    if(it.duraMax!=null&&it.dura<it.duraMax){
      const r=it.dura/it.duraMax;
      const d=document.createElement('div');
      d.className='dura'+(it.dura<=0?' hs':(r<0.35?' bas':''));
      d.innerHTML='<i style="width:'+Math.max(0,Math.round(r*100))+'%"></i>';
      el.appendChild(d);
    }
  } else {
    el.style.borderColor='';
    /* Silhouette de l'emplacement vide : on voit ce qui manque et de quel type. */
    const url=EQ_SIL[slot];
    if(url){const im=document.createElement('img');im.src=url;im.alt='';
      im.style.cssText='width:66%;height:66%;object-fit:contain;opacity:.5;image-rendering:pixelated';
      el.appendChild(im);}
    const s=document.createElement('span');s.className='lb';
    s.style.cssText='align-items:flex-end;padding-bottom:2px';
    s.textContent=EQ_NOMS[slot]||el.dataset.lb||'';el.appendChild(s);
  }
  /* Souris : survol pour la bulle, clic pour retirer — comme avant. */
  el.onmouseenter=(!IS_TOUCH&&it)?(e=>showTip(e,it,true)):null;
  el.onmousemove=(!IS_TOUCH&&it)?moveTip:null;
  el.onmouseleave=IS_TOUCH?null:hideTip;
  el.onclick=()=>{
    if(!player.equip[slot]){eqSel=null;majFicheEquip();return;}
    if(eqSel===slot){unequip(slot);eqSel=null;}
    else{eqSel=slot;}
    refreshHud();majFicheEquip();
  };
}
function majLegendeArbre(){
  const el=document.getElementById('treeLegende'); if(!el||el.dataset.fait)return;
  el.dataset.fait='1';
  const p=(u,t)=>'<img src="'+u+'" style="width:14px;height:14px;vertical-align:-3px;image-rendering:pixelated"> '+t;
  el.innerHTML=p(PASTILLE.sort,'sort')+' · '+p(PASTILLE.passif,'passif')+' · '+p(PASTILLE.cle,'clé');
}
function majFicheEquip(){
  const f=document.getElementById('eqFiche'); if(!f)return;
  const it=eqSel?player.equip[eqSel]:null;
  if(!it){eqSel=null;f.className='';
    f.innerHTML='<div class="vide">'+t('perso.videPiece')+'</div>';return;}
  f.className='on';
  f.innerHTML=itemHTML(it,true)+
    '<div style="margin-top:5px;color:#f4d35e;font-size:10px">Touche de nouveau cette case pour la retirer.</div>';
  document.querySelectorAll('.eqCase').forEach(c=>c.classList.toggle('sel',c.id==='slot'+eqSel.charAt(0).toUpperCase()+eqSel.slice(1)));
}

function unequip(slot){const it=player.equip[slot];if(!it)return;
  if(sacPlein(it)){toast('Sac plein !',1.4);return;}
  inventory.push(it);player.equip[slot]=null;hideTip();
  if(typeof eqSel!=='undefined'&&eqSel===slot)eqSel=null;
  toast(t('objet.retire')+' '+nomObjet(it).replace(/<[^>]+>/g,''),1.4);renderInventory();refreshHud();
  if(typeof majFicheEquip==='function')majFicheEquip();}
/* La barre de sorts se construit une fois, puis se met à jour à CHAQUE IMAGE.
   Avant, elle n'était reconstruite que sur événement : une fois le temps de
   recharge écoulé, l'icône restait grisée jusqu'à ce qu'autre chose la redessine. */
let _slotEls=[];
function renderSkillBar(){
  const bar=document.getElementById('skillBar');bar.innerHTML='';_slotEls=[];
  for(let i=0;i<4;i++){const s=player.bar[i];
    const el=document.createElement('div');
    el.className='slot';
    el.innerHTML='<span class="key">'+(i+1)+'</span>'
      +'<span class="ico">'+(s?skillIco(s,30):'·')+'</span>'
      +'<div class="cdFill"></div><div class="cd"></div>';
    /* Un appui = un lancer. Auparavant, toucher n'ARMAIT que le sort et il fallait
       ensuite toucher le décor : deux gestes, sans retour visuel entre les deux.
       Un MAINTIEN ouvre la visée directionnelle ; on oriente en glissant. */
    (function(sk,elem){
      if(!sk)return;
      elem.onclick=()=>{ vibrer(VIB.toucher);
        if(IS_TOUCH||OPT.cibleAuto)castSkillKey(sk); else selectSkill(sk); };
      if(!IS_TOUCH)return;
      elem.onclick=null;                       // au doigt, tout passe par les événements tactiles
      elem.addEventListener('touchstart',ev=>{
        ev.preventDefault(); ev.stopPropagation();
        vibrer(VIB.toucher); viseDebut(sk,ev.changedTouches[0].identifier);
      },{passive:false});
      elem.addEventListener('touchmove',ev=>{
        ev.preventDefault(); ev.stopPropagation();
        const t=ev.changedTouches[0];
        const r=cv.getBoundingClientRect();
        viseOriente(t.clientX-r.left,t.clientY-r.top);
      },{passive:false});
      const fin=ev=>{ ev.preventDefault(); ev.stopPropagation();
        if(!viseFin())castSkillKey(sk);        // appui bref : lancer immédiat
      };
      elem.addEventListener('touchend',fin,{passive:false});
      elem.addEventListener('touchcancel',()=>{vise.sort=null;vise.actif=false;vise.t=0;},{passive:false});
    })(s,el);
    bar.appendChild(el);
    _slotEls.push({el:el,skill:s,fill:el.querySelector('.cdFill'),cd:el.querySelector('.cd'),
                   _st:null,_txt:null,_h:null});}
  updateSkillBar();
}
function updateSkillBar(){
  if(!_slotEls.length)return;
  const mp=player.mp;
  for(let i=0;i<_slotEls.length;i++){
    const o=_slotEls[i], s=o.skill;
    // le sort assigné a pu changer sans passer par un rendu complet
    if(s!==player.bar[i]){renderSkillBar();return;}
    let etat='vide';
    if(s){
      const rank=player.skillRanks[s]||0;
      const def=SKILLS[s];
      const cout=def.manaBase+(s==='slap'?0:Math.max(0,rank));
      if(s!=='slap'&&rank<=0)etat='verrouille';
      else if((skillCd[s]||0)>0.05)etat='recharge';
      else if(mp<cout)etat='mana';
      else etat='pret';
    }
    if(etat!==o._st){
      o._st=etat;
      o.el.className='slot'
        +(etat==='verrouille'||etat==='vide'?' locked':'')
        +(etat==='mana'?' noMana':'')
        +(etat==='pret'?' ready':'')
        +(s&&activeSkill===s?' active':'');
    } else if(s&&((activeSkill===s)!==o.el.classList.contains('active'))){
      o.el.classList.toggle('active',activeSkill===s);
    }
    // jauge et compte à rebours
    const cd=s?(skillCd[s]||0):0;
    if(cd>0.05){
      const def=SKILLS[s];
      const total=Math.max(0.01,def.cdBase*(1-Math.min(0.6,(P().cast||0)/100)));
      const h=Math.round(100*Math.min(1,cd/total));
      if(h!==o._h){o._h=h;o.fill.style.height=h+'%';o.fill.style.display='block';}
      const t=cd>=1?cd.toFixed(1):cd.toFixed(1);
      if(t!==o._txt){o._txt=t;o.cd.textContent=t;o.cd.style.display='block';}
    } else if(o._h!==0){
      o._h=0;o._txt='';o.fill.style.display='none';o.cd.style.display='none';
    }
  }
}
let invSel=-1;
/* Un seul chemin de sélection, pour que la fiche et les boutons ne puissent
   jamais se désynchroniser. */
function selectionnerObjet(i){
  invSel=(invSel===i?-1:i);
  hideTip();
  renderInventory();
}
function renderInventory(){
  const g=document.getElementById('invGrid');g.innerHTML='';
  if(invSel>=inventory.length)invSel=-1;
  /* Une case par TAS. Les gemmes, runes et charmes identiques se regroupent :
     l'inventaire reste une liste plate, seul le comptage change. */
  const grp=groupesInventaire();
  for(let i=0;i<invCap;i++){const cell=document.createElement('div');
    const G=grp[i]; const it=G?G.items[0]:null;
    const iReel=it?inventory.indexOf(it):-1;
    cell.className='cell'+(iReel>=0&&iReel===invSel?' sel':'');
    if(it){setCellIcon(cell,it);cell.style.boxShadow='inset 0 0 0 2px '+(iReel===invSel?'#f4d35e':RAR[it.rarity].col);
      if(G.items.length>1){
        const n=document.createElement('span');
        n.textContent='×'+G.items.length;
        n.style.cssText='position:absolute;right:2px;bottom:1px;font-size:11px;font-weight:bold;'+
          'color:#f4d35e;text-shadow:0 1px 2px #000,0 0 3px #000;pointer-events:none';
        cell.style.position='relative';cell.appendChild(n);
      }
      cell.onclick=()=>selectionnerObjet(iReel);
      cell.oncontextmenu=e=>{e.preventDefault();if(needsId(it)){hideTip();identifyItem(it);}else toast('Objet déjà identifié',1);return false;};
      if(IS_TOUCH&&needsId(it)){let _lt=0;
        cell.addEventListener('touchend',()=>{const t=Date.now();
          if(t-_lt<340){hideTip();identifyItem(it);_lt=0;}else _lt=t;},{passive:true});}
      /* Ni maintien-long ni survol au doigt : la fiche vit dans l'encart du
         panneau. La bulle flottante reste réservée à la souris. */
      if(!IS_TOUCH){cell.onmouseenter=e=>showTip(e,it);cell.onmousemove=moveTip;cell.onmouseleave=hideTip;}}
    g.appendChild(cell);}
  renderFicheObjet();
  renderInvActions();
}
/* Encart fixe : reflète la sélection. Vide et masqué quand rien n'est choisi,
   pour ne pas voler de la hauteur au sac sur un téléphone. */
function renderFicheObjet(){
  const f=document.getElementById('invFiche');if(!f)return;
  const it=inventory[invSel];
  if(!it){f.className='';
    f.innerHTML='<div class="vide">'+t('sac.videObjet')+'</div>';
    return;}
  f.className='on';f.innerHTML=itemHTML(it,false);
}
function salvageAllRarity(rar){
  /* Même verrou sur le démontage EN MASSE : le bouton ne propose aujourd'hui
     que commun et magique, mais rien n'empêchait un appel avec 'unique'. */
  if(RARETES_PROTEGEES[rar]){toast(t('sac.demontageUnParUn'),2.4);return;}
  let n=0,f=0;
  for(let i=inventory.length-1;i>=0;i--){const it=inventory[i];
    if(it.slot&&it.slot!=='gem'&&it.rarity===rar&&!needsId(it)){f+=salvageValue(it);inventory.splice(i,1);n++;}}
  if(n){player.frags+=f;invSel=-1;toast(t('sac.demonteLot',{n:n,frags:f}),2.2);SFX.pickup();renderInventory();refreshHud();}
  else toast(t('sac.aucuneRarete'),1.4);
}
/* QUATRE BLOCS DANS UNE SEULE FONCTION.                           (Phase 4)

   `renderInvActions` faisait 84 lignes et l'auteur y avait lui-même posé des
   accolades pour séparer les morceaux — la couture était déjà tracée, il
   manquait juste les noms. Chaque bloc devient une fonction : on peut
   maintenant lire la barre de besace sans traverser le menu de démontage. */

/* Agrandissement de la besace, sur le modèle du coffre : une case à la fois,
   prix croissant, plafond à INV_CAP_MAX. */
function _invBarreBesace(box){
  const bar=document.createElement('div');
  bar.style.cssText='display:flex;gap:6px;width:100%;margin-bottom:6px;align-items:center;font-size:11px;color:#8ea0c8';
  const info=document.createElement('span');
  info.innerHTML='Besace : <b style="color:#e8ecf6">'+placesUtilisees()+'/'+invCap+'</b> emplacements';
  bar.appendChild(info);
  if(invCap<INV_CAP_MAX){
    const c=prixCaseBesace(invCap);
    const b=document.createElement('button');b.className='sal';b.style.cssText='font-size:11px;margin-left:auto';
    b.innerHTML='+1 case — <span class="gi"></span>'+c.toLocaleString('fr-FR');
    b.disabled=player.gold<c;
    b.onclick=()=>{const p=prixCaseBesace(invCap);
      if(player.gold>=p){player.gold-=p;setInvCap(Math.min(INV_CAP_MAX,invCap+1));
        toast(t('sac.agrandie',{n:invCap}),1.4);
        renderInventory();refreshHud();saveGame();}};
    bar.appendChild(b);
  } else {
    const s=document.createElement('span');s.style.marginLeft='auto';s.style.color='#7dff9a';
    s.textContent=t('sac.maximum');bar.appendChild(s);
  }
  box.appendChild(bar);
}

/* DÉMONTAGE : quatre boutons occupaient toute une ligne en permanence, pour
   des commandes qu'on utilise une fois de temps en temps. Ils sont repliés
   dans un menu qui s'ouvre au-dessus de la barre — donc sans rien pousser. */
function _invMenuDemontage(box){
  const bMenu=document.createElement('button');
  bMenu.className='sal'; bMenu.style.cssText='flex:0 0 auto;height:30px;min-height:30px;padding:0 9px;font-size:11px;line-height:28px';
  const nAuto=(autoSalv.white?1:0)+(autoSalv.magic?1:0);
  bMenu.innerHTML='Démontage'+(nAuto?' <b style="color:#f4d35e">·'+nAuto+' auto</b>':'')+' ▾';
  const menu=document.createElement('div'); menu.id='salvMenu';
  [[t('sac.demonterCommuns'),'white'],[t('sac.demonterMagiques'),'magic']].forEach(function(p){
    const b=document.createElement('button');b.className='sal';b.style.fontSize='11px';b.textContent=p[0];
    b.onclick=function(){salvageAllRarity(p[1]);menu.classList.remove('on');};menu.appendChild(b);});
  const sep=document.createElement('div');
  sep.style.cssText='border-top:1px solid #2a3350;margin:2px 0 0';menu.appendChild(sep);
  [[t('sac.communs'),'white'],[t('sac.magiques'),'magic']].forEach(function(p){
    const l=document.createElement('div');l.className='ligne';
    /* ⚠ SIXIÈME `t` DE BOUCLE. Renommé `lab`.
       ⚠ ET LE RENOMMAGE N'AVAIT SUIVI QUE SUR LA DÉCLARATION. Quatre lignes
       plus bas, `l.appendChild(t)` posait encore la FONCTION DE TRADUCTION
       dans le DOM : `TypeError`, remonté hors de `renderInvActions` puis
       hors de `startGame()` — la partie démarrait à moitié. Trouvé le
       3 septembre 2026 en lançant le jeu dans un vrai Chrome ; le banc
       d'essai ne pouvait pas le voir, son DOM simulé accepte tout. */
    const lab=document.createElement('span');lab.style.flex='1';lab.textContent=t('sac.autoRamassage',{quoi:p[0]});
    const b=document.createElement('button');
    b.style.cssText='font-size:11px;padding:4px 8px;border-radius:5px;border:1px solid #3a4a72;cursor:pointer;background:'
      +(autoSalv[p[1]]?'#f4d35e':'#141a2e')+';color:'+(autoSalv[p[1]]?'#111':'#8ea0c8');
    b.textContent=autoSalv[p[1]]?'ON':'OFF';
    b.onclick=function(){autoSalv[p[1]]=!autoSalv[p[1]];renderInvActions();
      const m=document.getElementById('salvMenu');if(m)m.classList.add('on');};
    l.appendChild(lab);l.appendChild(b);menu.appendChild(l);});
  bMenu.onclick=function(e){e.stopPropagation();vibrer(VIB.toucher);menu.classList.toggle('on');};
  box.appendChild(bMenu); box.appendChild(menu);
  /* Un appui ailleurs referme le menu — sinon il masque la besace. */
  setTimeout(function(){document.addEventListener('pointerdown',function fermer(ev){
    if(menu.contains(ev.target)||ev.target===bMenu)return;
    menu.classList.remove('on');
    document.removeEventListener('pointerdown',fermer,true);},true);},0);
}

/* Les commandes de l'objet sélectionné : identifier, puis équiper/démonter/jeter.

   Une seule ligne de 30 px. Empilés et pleine largeur, les trois boutons
   mangeaient la moitié de la colonne de droite : il ne restait presque rien
   pour la fiche de l'objet. Équiper reste large — c'est celui qu'on vise —
   les deux autres sont ramenés à l'essentiel. */
function _invBoutonsObjet(box, it){
  if(needsId(it)){
    const bId=document.createElement('button');bId.className='eq';
    bId.style.cssText='background:#3a2f10;border:1px solid #caa53a;color:#ffd35e;'+(IS_TOUCH?'min-height:44px;padding:0 14px;font-size:14px':'');
    bId.innerHTML='🔎 Identifier ('+(player.scrollsId||0)+')';
    bId.disabled=(player.scrollsId||0)<=0;
    bId.onclick=()=>{identifyItem(it);renderInventory();};
    box.appendChild(bId);
  }
  const PB='height:30px;min-height:30px;padding:0 8px;font-size:11px;line-height:28px';
  const bEq=document.createElement('button');bEq.className='eq';bEq.textContent=t('sac.equiper');
  bEq.style.cssText='flex:1 1 auto;'+PB;
  bEq.onclick=()=>equipItem(invSel);
  const bSal=document.createElement('button');bSal.className='sal';
  bSal.style.cssText='flex:0 0 auto;'+PB;bSal.innerHTML='❄ '+salvageValue(it);
  bSal.title=t('sac.demonterFragments');
  bSal.onclick=()=>salvageItem(invSel);
  const bDrop=document.createElement('button');bDrop.className='drop';
  bDrop.style.cssText='flex:0 0 36px;'+PB;bDrop.textContent='🗑';
  bDrop.title=t('sac.jeterAuSol');
  bDrop.onclick=()=>dropFromBag(invSel);
  box.appendChild(bEq);box.appendChild(bSal);box.appendChild(bDrop);
}

function renderInvActions(){
  const box=document.getElementById('invActions');box.innerHTML='';
  _invBarreBesace(box);
  _invMenuDemontage(box);
  const it=inventory[invSel];
  if(!it){
    const s=document.createElement('span');
    s.style.cssText='font-size:11px;color:#6b789c;align-self:center';
    s.textContent=t('sac.aide');
    box.appendChild(s);return;
  }
  _invBoutonsObjet(box, it);
}
function equipItem(i){
  {const _it=inventory[i];if(needsId(_it)){if(!identifyItem(_it))return;}}const it=inventory[i];if(!it)return;if(it.slot==='gem'){toast(t('sac.gemmeASertir'),1.8);return;}if((it.req||1)>player.lvl){toast(t('sac.niveauRequis',{n:it.req}),1.8);return;}let _ts=it.slot;if(_ts==='ring'&&player.equip.ring&&!player.equip.ring2)_ts='ring2';
  const prev=player.equip[_ts];
  player.equip[_ts]=it;inventory.splice(i,1);if(prev)inventory.push(prev);
  invSel=-1;SFX.equiper&&SFX.equiper();toast(t('objet.equipe')+' '+nomObjet(it).replace(/<[^>]+>/g,''),1.5);hideTip();renderInventory();refreshHud();}
function salvageItem(i){const it=inventory[i];if(!it)return;const f=salvageValue(it);
  player.frags+=f;inventory.splice(i,1);invSel=-1;
  SFX.demonter&&SFX.demonter();toast(t('sac.demonteUn',{n:f}),1.6);burst(player.x,player.y,'#7dd0ff',10);hideTip();renderInventory();refreshHud();}
function dropFromBag(i){const it=inventory[i];if(!it)return;
  dropItem(player.x+rand(-20,20),player.y+rand(10,26),it);inventory.splice(i,1);invSel=-1;
  SFX.sortir&&SFX.sortir();toast(t('sac.jete'),1.3);hideTip();renderInventory();}
/* ---------------- ARBRE DE COMPÉTENCES ---------------- */
/* L'ARBRE — dix branches de huit anneaux, plus un nœud-clé chacune.

   CE QU'IL ÉTAIT, ET POURQUOI ÇA N'ALLAIT PAS. Huit branches de cinq
   anneaux : 49 nœuds, tous binaires, pour 59 points reçus au niveau 60. On
   pouvait tout acheter et il restait dix points. Au plafond, tous les héros
   avaient donc exactement le même arbre — le mot « build » ne désignait
   rien. Mesuré le 28 août 2026 ; voir Etude_parangon.md §5.

   CE QU'IL EST. 91 nœuds pour 59 points : on s'offre les deux tiers de
   l'arbre, jamais plus. Et la contrainte d'adjacence renchérit — un nœud-clé
   se paie avec toute sa branche, soit NEUF points. Cinq branches menées à
   leur terme coûtent 45 points sur 59 : l'arbitrage entre la profondeur et
   l'étendue devient un vrai choix.

   LES RANGS DE SORT SONT PLAFONNÉS À 5 (computeTreeBonus). Les anneaux 6 à
   8 ajoutés aux branches existantes ne portent donc de `rk` que là où il
   restait de la place — Faucon, Colosse, Moulinet. Ailleurs ils donnent des
   bonus bruts : un `rk` de plus y serait un nœud payé pour rien.

   LA VITESSE EST TENUE COURT. `moveSpeed` s'ajoute à une base de 2,5 et la
   branche Tornade en donnait déjà 3,55 — plus du double. Les trois anneaux
   neufs n'en ajoutent que 0,5 au total : au-delà, le héros dépasse la portée
   du pathfinding et de la caméra. À éprouver en jeu, pas sur le papier. */
const T_SPOKES=[
 {a:-90, key:{name:'Jugement Divin',rk:'holy',b:{holy:28,cast:12}}, rings:[
   {name:'Visée',b:{holy:5,dex:3}},{name:'Palet Sacré',skill:'holy',b:{}},{name:'Bénédiction',rk:'holy',b:{holy:8}},{name:'Halo Sacré',rk:'holy',b:{holy:12,crit:3}},{name:'Sainteté',rk:'holy',b:{holy:16,crit:4}},
   {name:'Aube Blanche',b:{holy:18,cast:6}},{name:'Chœur des Damnés',b:{holy:22,crit:5}},{name:'Verdict',b:{holy:26,crit:6,cast:8}}]},
 {a:-54, key:{name:'Œil du Faucon',rk:'multi',b:{crit:14,dex:16}}, rings:[
   {name:'Adresse',b:{crit:2,dex:3}},{name:'Œil de lynx',b:{crit:4,dex:4}},{name:'Triple Palet',skill:'multi',b:{}},{name:'Précision',rk:'multi',b:{crit:6,dex:8}},{name:'Maître-Tireur',rk:'multi',b:{crit:8,dex:10}},
   {name:'Trajectoire',b:{crit:10,dex:12}},{name:'Tir Croisé',rk:'multi',b:{crit:12,dex:14}},{name:'Ligne de Mire',b:{crit:14,dex:16}}]},
 {a:-18, key:{name:'Zéro Absolu',rk:'tempest',b:{cold:28,mpPct:12}}, rings:[
   {name:'Fraîcheur',b:{cold:5}},{name:'Tempête de Givre',skill:'tempest',b:{}},{name:'Engelure',rk:'tempest',b:{cold:8}},{name:'Cœur de Glace',rk:'tempest',b:{cold:12,ene:8}},{name:'Blizzard',rk:'tempest',b:{cold:16,mpPct:8}},
   {name:'Bise Noire',b:{cold:20,ene:10}},{name:'Gel Profond',b:{cold:24,mpPct:10}},{name:'Hiver Sans Fin',b:{cold:28,ene:12,mpPct:10}}]},
 {a:18, key:{name:'Puits de Mana',b:{ene:24,mpPct:20,cast:14}}, rings:[
   {name:'Arcane',b:{ene:4,cast:3}},{name:'Concentration',b:{cast:4,mpPct:6}},{name:'Réserve',b:{ene:6,mpPct:6}},{name:'Flux Arcanique',b:{ene:12,mpPct:12,cast:8}},{name:'Archimage',b:{ene:14,mpPct:14,cast:10}},
   {name:'Canalisation',b:{ene:16,cast:12}},{name:'Puits Sans Fond',b:{ene:18,mpPct:16}},{name:'Grand Œuvre',b:{ene:20,mpPct:18,cast:12}}]},
 /* SANG — branche neuve. Survivre par l'agression : on ne se soigne qu'en
    frappant. Le vol de vie était jusqu'ici un bonus d'appoint (9 au total
    sur la branche Frappe) ; il devient ici une identité. Total 14, et il
    faut les neuf points pour l'avoir en entier. */
 {a:54, key:{name:'Buveur de Glace',b:{leech:4,vit:24,hpPct:12}}, rings:[
   {name:'Morsure',b:{leech:1,vit:3}},{name:'Sangsue',b:{leech:1,vit:4}},{name:'Soif',b:{leech:1,hpPct:3}},{name:'Curée',b:{leech:1,vit:8}},{name:'Gorgée Noire',b:{leech:2,hpPct:5}},
   {name:'Veine Ouverte',b:{leech:2,vit:14}},{name:'Hémorragie',b:{leech:2,hpPct:8}},{name:'Cœur Vorace',b:{leech:2,vit:18,hpPct:10}}]},
 {a:90, key:{name:'Colosse',rk:'warcry',b:{vit:26,hpPct:14,def:30}}, rings:[
   {name:'Endurance',b:{vit:5,hpPct:2}},{name:'Robustesse',b:{vit:5,def:12}},{name:'Cri de Guerre',skill:'warcry',b:{}},{name:'Constitution de Fer',rk:'warcry',b:{vit:14,hpPct:8}},{name:'Titan',rk:'warcry',b:{vit:18,hpPct:10,def:20}},
   {name:'Peau de Pierre',b:{def:26,vit:16}},{name:'Rempart',rk:'warcry',b:{vit:20,hpPct:10}},{name:'Inébranlable',b:{vit:22,hpPct:12,def:30}}]},
 {a:126, key:{name:'Frappe Ultime',rk:'slap',b:{phys:26,leech:3}}, rings:[
   {name:'Prise en main',rk:'slap',b:{phys:4}},{name:'Moulinet',skill:'whirl',b:{}},{name:'Slap précis',rk:'whirl',b:{crit:4,phys:6}},{name:'Tir de la Ligue',rk:'slap',b:{phys:12,leech:3}},{name:'Champion des Outlaws',rk:'slap',b:{phys:16,crit:4}},
   {name:'Contre-Appui',b:{phys:18,crit:5}},{name:'Rotation Longue',rk:'whirl',b:{phys:20,leech:3}},{name:'Coup de Grâce',b:{phys:24,crit:6,dmgPct:6}}]},
 {a:162, key:{name:'Berserker',rk:'charge',b:{phys:26,dmgPct:12}}, rings:[
   {name:'Muscle',b:{phys:5,str:3}},{name:'Charge de l’Outlaw',skill:'charge',b:{}},{name:'Impact',rk:'charge',b:{phys:6,str:6}},{name:'Bélier',rk:'charge',b:{phys:12,str:10}},{name:'Berserker Furieux',rk:'charge',b:{phys:16,str:12,dmgPct:6}},
   {name:'Épaule Basse',b:{phys:18,str:14}},{name:'Fureur Froide',b:{phys:22,str:16,dmgPct:6}},{name:'Rage de Moreuil',b:{phys:26,str:18,dmgPct:8}}]},
 /* FORTUNE — branche neuve. Le Falcon a vendu son âme pour une coupe ; on
    lui reprend le reste. Trouvaille magique comme identité, et de quoi
    frapper assez fort pour aller la chercher. */
 {a:198, key:{name:'Braquage du Falcon',b:{mf:30,dmgPct:10,dex:12}}, rings:[
   {name:'Œil du Receleur',b:{mf:5}},{name:'Poches Profondes',b:{mf:6,dex:3}},{name:'Butin de Guerre',b:{mf:8,dmgPct:3}},{name:'Pilleur',b:{mf:10,dex:5}},{name:'Main Leste',b:{mf:12,dmgPct:4}},
   {name:'Sac Sans Fond',b:{mf:14,dex:8}},{name:'Part du Lion',b:{mf:16,dmgPct:5}},{name:'Rançon',b:{mf:18,dex:10,dmgPct:6}}]},
 /* La clé de la branche de vitesse LIBÈRE LE MOULINET.          (v9.02)
    Le Moulinet ancre le héros une seconde ; ici, il devient mobile.
    C'est la place naturelle : la branche s'appelle Tornade, elle est
    déjà celle du déplacement, et sa clé se paie au bout du chemin —
    la mobilité n'est donc pas donnée, elle se construit. */
 {a:234, key:{name:'Tornade',mob:'whirl',b:{moveSpeed:1.4,mf:24,dex:10}}, rings:[
   {name:'Célérité',b:{moveSpeed:0.25,mf:4}},{name:'Foulée',b:{moveSpeed:0.3}},{name:'Chasseur',b:{mf:8,dex:4}},{name:'Vent du Nord',b:{moveSpeed:0.7,mf:12}},{name:'Ouragan',b:{moveSpeed:0.9,mf:16,dex:6}},
   {name:'Appel d’Air',b:{mf:18,dex:6}},{name:'Roues Libres',b:{moveSpeed:0.2,dex:8}},{name:'Cyclone',b:{moveSpeed:0.3,mf:22,dex:8}}]}
];
/* Huit anneaux : le pas est resserré à 68 pour que l'arbre n'explose pas à
   l'écran. Le nœud-clé reste détaché, au-delà du dernier anneau. */
const T_ANNEAUX=8;
const T_RAD=[0,90,158,226,294,362,430,498,566];const T_KEYRAD=640;
/* Les anneaux de TRAVERSE relient chaque branche à ses deux voisines. Sans
   eux l'arbre serait dix couloirs parallèles, et le seul arbitrage possible
   serait « combien de branches ». */
const T_TRAVERSES=[3,6];
const TREE_NODES={};const TREE_ADJ={};
function tAdd(id,x,y,kind,spec,name){TREE_NODES[id]={id,x,y,kind,b:(spec&&spec.b)||{},name,skill:spec&&spec.skill,rk:spec&&spec.rk,mob:spec&&spec.mob};TREE_ADJ[id]=TREE_ADJ[id]||[];}
function tLink(a,b){TREE_ADJ[a]=TREE_ADJ[a]||[];TREE_ADJ[b]=TREE_ADJ[b]||[];TREE_ADJ[a].push(b);TREE_ADJ[b].push(a);}
function computeTreeBonus(){
  const B={};const rk={};const unl={slap:true};
  for(const id in player.tree){if(!player.tree[id])continue;const n=TREE_NODES[id];if(!n)continue;
    for(const k in n.b)B[k]=(B[k]||0)+n.b[k];
    if(n.skill)unl[n.skill]=true;if(n.rk)rk[n.rk]=(rk[n.rk]||0)+1;}
  player.treeBonus=B;
  const R={};for(const s in SKILLS)R[s]=(unl[s]?Math.min(5,1+(rk[s]||0)):0);
  player.skillRanks=R;
  if(player.bar)for(let i=0;i<player.bar.length;i++){const b=player.bar[i];if(b&&b!=='slap'&&(R[b]||0)<=0)player.bar[i]=null;}
}
function nodeReachable(id){if(player.tree[id])return true;for(const nb of TREE_ADJ[id]||[]){if(nb==='c'||player.tree[nb])return true;}return false;}
/* Les dix-neuf statistiques d'arbre. Indexées par leur CODE — `str`,
   `dmgMult` — donc la clé s'y adosse : `stat.str`. Le tableau français reste
   le repli, comme partout ailleurs (§36). */
const TBL={str:'Force',dex:'Dextérité',vit:'Vitalité',ene:'Énergie',agi:'Agilité',def:'Défense',crit:'% Critique',critDmg:'% Dégâts critiques',dmgMult:'% Dégâts (multiplicatif)',leech:'% Vol de vie',mf:'% Trouvaille',cast:'% Incantation',phys:'% dégâts physiques',cold:'% dégâts de froid',holy:'% dégâts sacrés',dmgPct:'% dégâts',hpPct:'% Vie max',mpPct:'% Mana max',moveSpeed:'Vitesse dépl.'};
function nomStat(k){ return tOu('stat.'+k, TBL[k]||k); }
function bonusText(n){const o=[];
  if(n.skill)o.push(t('arbre.debloque',{nom:nomSort(n.skill)}));
  if(n.rk)o.push(t('arbre.rangPlus',{nom:nomSort(n.rk)}));
  for(const k in n.b)o.push('+'+n.b[k]+' '+nomStat(k));
  return o.join(' · ')||t('arbre.noeudDepart');}
let treeVB={x:-740,y:-740,w:1480,h:1480};let treeDrag=null;
/* Nœud SÉLECTIONNÉ, pas encore appris. Toucher un nœud le dépensait aussitôt,
   sans que rien n'ait dit ce qu'il apportait : au doigt il n'y a pas de survol,
   donc pas d'aperçu possible. Deux temps désormais : choisir, puis confirmer. */
let treeSel=null;
function renderTree(){
  if(typeof majLegendeArbre==='function')majLegendeArbre();
  const tp=document.getElementById('treePts');if(tp)tp.textContent=player.treePts;
  const svg=document.getElementById('treeSvg');let edges='',nodes='';const seen={};
  for(const a in TREE_ADJ){for(const b of TREE_ADJ[a]){const key=a<b?a+'|'+b:b+'|'+a;if(seen[key])continue;seen[key]=1;
    const A=TREE_NODES[a],B=TREE_NODES[b];const on=(player.tree[a]||a==='c')&&(player.tree[b]||b==='c');
    edges+='<line x1="'+A.x+'" y1="'+A.y+'" x2="'+B.x+'" y2="'+B.y+'" stroke="'+(on?'#f4d35e':'#28324e')+'" stroke-width="'+(on?4:3)+'"/>';}}
  for(const id in TREE_NODES){const n=TREE_NODES[id];const alloc=player.tree[id]||id==='c';const reach=nodeReachable(id)&&!alloc&&player.treePts>0;
    const rr=n.kind==='center'?18:n.kind==='key'?25:(n.kind==='skill'||n.kind==='notable')?20:14;
    const fill=alloc?(n.kind==='skill'?'#7cd06a':n.kind==='key'?'#e0a24a':'#f4d35e'):(reach?'#1d3a6e':'#141a2e');
    const stroke=alloc?'#fff3c0':(reach?'#5b8fe0':'#2a3350');
    nodes+='<g class="tnode" data-id="'+id+'" style="cursor:pointer"><circle cx="'+n.x+'" cy="'+n.y+'" r="'+rr+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(n.kind==='key'||n.kind==='skill'?4:2)+'"/>';
    if(n.skill||n.rk){const sk=n.skill||n.rk;const su=SKILL_ICON[sk]&&MISC_ICON[SKILL_ICON[sk]];
      const sz=Math.round(rr*1.55);
      if(su)nodes+='<image href="'+su+'" x="'+(n.x-sz/2)+'" y="'+(n.y-sz/2)+'" width="'+sz+'" height="'+sz+'" style="image-rendering:pixelated"'+(alloc?'':' opacity="0.55"')+'/>';
      else nodes+='<text x="'+n.x+'" y="'+(n.y+6)+'" font-size="'+(rr)+'" text-anchor="middle">'+SKILLS[sk].ico+'</text>';}
    if(n.kind==='skill'||n.kind==='notable'||n.kind==='key')nodes+='<text x="'+n.x+'" y="'+(n.y+rr+14)+'" fill="'+(alloc?'#ffe89a':'#cbd5f0')+'" font-size="12" text-anchor="middle">'+nomNoeud(n)+'</text>';
    if(id===treeSel)nodes+='<circle cx="'+n.x+'" cy="'+n.y+'" r="'+(rr+7)+'" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="6 4" opacity="0.95"/>';
    nodes+='</g>';}
  svg.setAttribute('viewBox',treeVB.x+' '+treeVB.y+' '+treeVB.w+' '+treeVB.h);
  svg.innerHTML=edges+nodes;bindTree();majFicheNoeud();
}
/* Fiche du nœud sélectionné + état du bouton Apprendre. */
function etatNoeud(id){
  if(!id||!TREE_NODES[id])return{txt:'',peut:false};
  if(player.tree[id]||id==='c')return{txt:t('arbre.dejaAppris'),peut:false};
  if(!nodeReachable(id))return{txt:t('arbre.nonConnecte'),peut:false};
  if(player.treePts<=0)return{txt:t('arbre.aucunPoint'),peut:false};
  return{txt:t('arbre.disponible'),peut:true};
}
function majFicheNoeud(){
  const info=document.getElementById('treeInfo');
  const btn=document.getElementById('treeLearn');
  const tp=document.getElementById('treePts');if(tp)tp.textContent=player.treePts;
  if(!treeSel||!TREE_NODES[treeSel]){
    if(info)info.innerHTML=t('arbre.aideComplete');
    if(btn){btn.disabled=true;btn.style.opacity='.4';}
    return;
  }
  const n=TREE_NODES[treeSel],e=etatNoeud(treeSel);
  if(info)info.innerHTML='<b style="color:#f4d35e">'+nomNoeud(n)+'</b> &nbsp;·&nbsp; '+e.txt+
    '<br><span style="color:#9cffb0">'+bonusText(n)+'</span>'+
    /* Un effet qui ne tient pas dans une ligne de bonus chiffré doit être
       écrit en toutes lettres, sinon personne ne saura qu'il existe. */
    (n.mob==='whirl'
      ? '<br><span style="color:#ffd27f">✦ Le <b>Moulinet</b> ne t’immobilise plus : '
        +'tu te déplaces en tournant.</span>' : '');
  if(btn){btn.disabled=!e.peut;btn.style.opacity=e.peut?'1':'.4';
    btn.textContent=e.peut?'✨ Apprendre':(player.tree[treeSel]?'✅ Appris':'✨ Apprendre');}
}
/* Boîte de confirmation générique, utilisée par toute action irréversible.
   ok = libellé du bouton d'action, ou null pour n'offrir que l'annulation. */
function ouvrirConfirmation(o){
  const f=document.getElementById('confirmFond');if(!f)return;
  document.getElementById('confirmTitre').textContent=o.titre||'Confirmer ?';
  document.getElementById('confirmCorps').innerHTML=o.corps||'';
  const oui=document.getElementById('confirmOui'),non=document.getElementById('confirmNon');
  oui.textContent=o.ok||'Impossible';
  oui.disabled=!o.ok;
  oui.onclick=()=>{fermerConfirmation();if(o.ok&&o.action)o.action();};
  non.onclick=fermerConfirmation;
  f.className='on';
}
function fermerConfirmation(){const f=document.getElementById('confirmFond');if(f)f.className='';}

/* RÉINITIALISATION DE L'ARBRE
   Elle était gratuite et instantanée : on pouvait tout redistribuer entre deux
   combats, ce qui vidait les choix de leur sens. Elle coûte désormais de l'or,
   et chaque réinitialisation coûte 2,2 fois plus cher que la précédente. */
const RESET_BASE=400;
const coutResetArbre=()=>Math.round(RESET_BASE*Math.pow(2.2,(player.resets||0)));
function noeudsAlloues(){let n=0;for(const id in player.tree)if(player.tree[id])n++;return n;}
function demanderResetArbre(){
  const n=noeudsAlloues();
  if(!n){toast(t('arbre.rienARecuperer'),1.4);return;}
  const c=coutResetArbre();
  ouvrirConfirmation({
    titre:'Réinitialiser l’arbre ?',
    corps:'<p>Les <b>'+n+' nœud'+(n>1?'s':'')+'</b> alloué'+(n>1?'s':'')+' seront rendus sous forme de points à redistribuer.</p>'+
      '<ul style="margin:6px 0 8px 18px;padding:0;line-height:1.6">'+
      '<li>Les <b>sorts débloqués par l’arbre seront reperdus</b> et retirés de la barre.</li>'+
      '<li>Les bonus passifs (force, vie, critique…) disparaissent immédiatement.</li>'+
      '<li>L’or dépensé n’est <b>pas remboursable</b>.</li></ul>'+
      '<p>Coût : <b style="color:#f4d35e">'+c.toLocaleString('fr-FR')+' or</b>'+
      (player.resets?(' <span style="color:#8ea0c8">('+player.resets+'ᵉ réinitialisation — le prix double à chaque fois)</span>'):
       ' <span style="color:#8ea0c8">(première réinitialisation)</span>')+'</p>'+
      '<p style="color:#8ea0c8">Prochaine réinitialisation : '+Math.round(c*2.2).toLocaleString('fr-FR')+' or.</p>'+
      (player.gold<c?'<p style="color:#ff8a8a">Il te manque '+(c-player.gold).toLocaleString('fr-FR')+' or.</p>':''),
    ok:player.gold>=c?('Payer '+c.toLocaleString('fr-FR')+' or'):null,
    action:()=>appliquerResetArbre(c)
  });
}
function appliquerResetArbre(cout){
  if(player.gold<cout)return;
  player.gold-=cout;player.resets=(player.resets||0)+1;
  let n=0;treeSel=null;
  for(const id in player.tree){if(player.tree[id]){n++;player.tree[id]=0;}}
  player.treePts+=n;computeTreeBonus();
  renderTree();renderSkillBar();refreshHud();saveGame();
  toast('Arbre réinitialisé — '+n+' point(s) rendus pour '+cout.toLocaleString('fr-FR')+' or',2.6);
}
function treeAlloc(id){const n=TREE_NODES[id];if(!n||player.tree[id]||id==='c')return;
  if(player.treePts<=0){toast(t('arbre.aucunPointCourt'),1.2);return;}
  if(!nodeReachable(id)){toast('Nœud non connecté — suis un chemin depuis le centre',1.6);return;}
  player.tree[id]=1;player.treePts--;computeTreeBonus();SFX.noeudArbre&&SFX.noeudArbre();
  if(n.skill){if(!player.bar.includes(n.skill))for(let i=0;i<4;i++){if(!player.bar[i]){player.bar[i]=n.skill;break;}}toast(t('arbre.sortDebloque',{nom:nomSort(n.skill)}),2);}
  else toast(t('arbre.alloue',{nom:nomNoeud(n)}),1);
  renderTree();renderSkillBar();refreshHud();
}
/* Bornes du cadrage de l'arbre, en unités de viewBox. */
const ARBRE_VB_MIN=420, ARBRE_VB_MAX=1700;
const ARBRE_VB_DEFAUT={x:-560,y:-560,w:1120,h:1120};

/* LE ZOOM. On applique le facteur AUTOUR d'un point d'ancrage écran, pour que
   le pincement garde sous les doigts ce qui s'y trouvait au départ. Sans
   ancrage, l'arbre fuit sous la main. Rend la fabrique `zoomer`, que la
   molette, le pincement et les boutons partagent. */
function _arbreZoom(svg){
  const appliquerVB=()=>svg.setAttribute('viewBox',treeVB.x+' '+treeVB.y+' '+treeVB.w+' '+treeVB.h);
  const zoomer=(f,ax,ay)=>{
    const nw=clamp(treeVB.w*f,ARBRE_VB_MIN,ARBRE_VB_MAX);const vrai=nw/treeVB.w;
    const r=svg.getBoundingClientRect();
    // point du monde sous l'ancrage écran, avant zoom
    const ux=(ax==null?0.5:(ax-r.left)/Math.max(1,r.width));
    const uy=(ay==null?0.5:(ay-r.top)/Math.max(1,r.height));
    const wx=treeVB.x+ux*treeVB.w, wy=treeVB.y+uy*treeVB.h;
    treeVB.w=nw;treeVB.h=nw;
    treeVB.x=wx-ux*nw;treeVB.y=wy-uy*nw;
    appliquerVB();return vrai;
  };
  zoomer.recadrer=()=>{treeVB={x:ARBRE_VB_DEFAUT.x,y:ARBRE_VB_DEFAUT.y,
                              w:ARBRE_VB_DEFAUT.w,h:ARBRE_VB_DEFAUT.h};appliquerVB();};
  return zoomer;
}

/* Le glissement à un doigt, et la fiche du nœud survolé au clavier-souris.
   `treeDrag.moved` distingue un glissement d'un clic : sans lui, tout
   déplacement finissait par sélectionner un nœud au relâchement. */
function _arbreGlisser(svg, wrap, info){
  svg.addEventListener('pointerdown',e=>{treeDrag={x:e.clientX,y:e.clientY,vx:treeVB.x,vy:treeVB.y,moved:false};wrap.style.cursor='grabbing';});
  window.addEventListener('pointerup',()=>{if(treeDrag)wrap.style.cursor='grab';treeDrag=null;});
  svg.addEventListener('pointermove',e=>{
    if(treeDrag){const sc=treeVB.w/svg.clientWidth;if(Math.abs(e.clientX-treeDrag.x)+Math.abs(e.clientY-treeDrag.y)>3)treeDrag.moved=true;
      treeVB.x=treeDrag.vx-(e.clientX-treeDrag.x)*sc;treeVB.y=treeDrag.vy-(e.clientY-treeDrag.y)*sc;svg.setAttribute('viewBox',treeVB.x+' '+treeVB.y+' '+treeVB.w+' '+treeVB.h);}
    else if(!IS_TOUCH){const g=e.target.closest&&e.target.closest('.tnode');
      if(g){const n=TREE_NODES[g.dataset.id];if(info)info.innerHTML='<b>'+nomNoeud(n)+'</b> — '+etatNoeud(g.dataset.id).txt+'<br><span style="color:#9cffb0">'+bonusText(n)+'</span>';}
      else majFicheNoeud();}
  });
}

/* Un clic sélectionne ou désélectionne un nœud — mais jamais à la fin d'un
   glissement. */
function _arbreSelection(svg){
  svg.addEventListener('click',e=>{if(treeDrag&&treeDrag.moved)return;
    const g=e.target.closest&&e.target.closest('.tnode');
    if(!g)return;
    treeSel=(treeSel===g.dataset.id)?null:g.dataset.id;
    renderTree();});
}

/* Pincement à deux doigts. Tant que deux doigts sont posés, le glissement à
   un doigt est suspendu : sinon l'arbre part en vrille pendant le pincement.
   La molette existait ; au doigt il n'y avait rien du tout. */
function _arbrePincement(svg, zoomer){
  svg.style.touchAction='none';
  let pinc=null;
  const ecart=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
  const milieu=t=>[(t[0].clientX+t[1].clientX)/2,(t[0].clientY+t[1].clientY)/2];
  svg.addEventListener('touchstart',e=>{
    if(e.touches.length>=2){treeDrag=null;const t=[e.touches[0],e.touches[1]];pinc={d:ecart(t)};e.preventDefault();}
  },{passive:false});
  svg.addEventListener('touchmove',e=>{
    if(pinc&&e.touches.length>=2){
      const t=[e.touches[0],e.touches[1]],d=ecart(t);
      if(d>4&&pinc.d>4){const m=milieu(t);zoomer(pinc.d/d,m[0],m[1]);}
      pinc.d=d;e.preventDefault();
    }
  },{passive:false});
  const finPinc=e=>{if(e.touches.length<2)pinc=null;};
  svg.addEventListener('touchend',finPinc);svg.addEventListener('touchcancel',finPinc);
}

/* Filet de sécurité : deux boutons. Le pincement rate parfois sur un petit
   écran où les doigts sortent du cadre, et l'arbre devient alors inutilisable.
   Délégation : un seul écouteur, et rien à retrouver par sélecteur. */
function _arbreBoutonsZoom(zoomer){
  const zw=document.getElementById('treeZoomBtns');
  if(!zw||zw._bound)return;
  zw._bound=1;
  zw.addEventListener('click',e=>{
    const b=e.target&&e.target.closest?e.target.closest('[data-z]'):null;if(!b)return;
    const z=b.getAttribute('data-z');
    if(z==='+')zoomer(0.8,null,null);
    else if(z==='-')zoomer(1.25,null,null);
    else zoomer.recadrer();
  });
}

/* Apprendre le nœud choisi, et réinitialiser l'arbre. */
function _arbreActions(){
  const lb=document.getElementById('treeLearn');
  if(lb)lb.onclick=()=>{if(treeSel&&etatNoeud(treeSel).peut)treeAlloc(treeSel);};
  const rb=document.getElementById('treeReset');if(rb)rb.onclick=demanderResetArbre;
}

/* bindTree NE DESSINE PAS : ELLE CÂBLE.                            (Phase 4)
   68 lignes de gestes empilés — glissement, survol, clic, molette, pincement,
   boutons, actions — dans une seule fonction, avec deux fabriques imbriquées.
   La garde `_bound` reste ici : elle protège l'ensemble d'un double câblage. */
function bindTree(){
  const svg=document.getElementById('treeSvg');if(svg._bound)return;svg._bound=1;
  const wrap=document.getElementById('treeWrap');const info=document.getElementById('treeInfo');
  const zoomer=_arbreZoom(svg);
  _arbreGlisser(svg,wrap,info);
  _arbreSelection(svg);
  svg.addEventListener('wheel',e=>{e.preventDefault();zoomer(e.deltaY>0?1.12:0.89,e.clientX,e.clientY);},{passive:false});
  _arbrePincement(svg,zoomer);
  _arbreBoutonsZoom(zoomer);
  _arbreActions();
}
function renderSkillPanel(){
  const list=document.getElementById('skillList');list.innerHTML='';const R=player.skillRanks;
  const tb=document.createElement('button');tb.className='sBtn';
  tb.style.cssText='width:100%;margin:0 0 10px;font-size:14px;font-weight:bold;padding:9px;background:#2a2410;border:1px solid #caa53a;color:#f4d35e';
  tb.textContent='🌳 ARBRE DE COMPÉTENCES — '+player.treePts+' point(s)';
  tb.onclick=function(){togglePanel('treePanel');};list.appendChild(tb);
  const _sep=document.createElement('div');_sep.style.cssText='color:#f4d35e;font-size:12px;margin:4px 0 6px;border-bottom:1px solid #2a3350;padding-bottom:3px';_sep.textContent='Barre de sorts (4 max)';list.appendChild(_sep);
  const bd=document.createElement('div');bd.style.cssText='display:flex;gap:8px;margin-bottom:8px;justify-content:center';
  for(let i=0;i<4;i++){const s=player.bar[i];const sl=document.createElement('div');sl.className='slot'+(s?'':' locked');sl.style.cssText='width:48px;height:48px;position:relative';sl.innerHTML='<span class="key">'+(i+1)+'</span><span class="ico">'+(s?skillIco(s,28):'·')+'</span>';bd.appendChild(sl);}
  list.appendChild(bd);
  const hint=document.createElement('div');hint.style.cssText='font-size:11px;color:#8ea0c8;margin-bottom:8px;text-align:center';hint.textContent=t('sorts.aideBarre');list.appendChild(hint);
  const ARCH={'Mêlée':'#ff9b6b','Distance':'#8fd0ff','Froid':'#7fe3ff','Défense':'#f4d35e'};
  for(const s in SKILLS){const def=SKILLS[s];const rank=R[s]||0;const unlocked=rank>0;
    const node=document.createElement('div');node.className='skillNode';if(!unlocked)node.style.opacity='0.55';
    let sb='';for(let i=0;i<4;i++){const on=player.bar[i]===s;sb+='<button class="slotAssign" data-s="'+s+'" data-i="'+i+'" '+(unlocked?'':'disabled')+' style="width:22px;height:22px;margin-left:3px;border-radius:4px;border:1px solid #2a3350;background:'+(on?'#f4d35e':'#141a2e')+';color:'+(on?'#111':'#8ea0c8')+';cursor:'+(unlocked?'pointer':'default')+'">'+(i+1)+'</button>';}
    node.innerHTML='<div class="sIco">'+skillIco(s,30)+'</div><div style="flex:1">'
      +'<div class="sName">'+nomSort(s)+' <span class="rank" style="color:'+(ARCH[def.arch]||'#8ea0c8')+'">'+nomArch(def.arch)+'</span> · <span class="rank">'+(unlocked?t('sort.rang',{n:rank}):t('sort.verrouille'))+'</span></div>'
      +'<div class="sDesc">'+descSort(s)+'</div>'
      +'<div style="margin-top:4px;font-size:11px;color:#8ea0c8">Barre : '+sb+'</div></div>';
    list.appendChild(node);}
  document.querySelectorAll('.slotAssign').forEach(b=>b.onclick=()=>{const s=b.dataset.s,i=+b.dataset.i;if((player.skillRanks[s]||0)<=0)return;for(let j=0;j<4;j++)if(player.bar[j]===s)player.bar[j]=null;player.bar[i]=s;renderSkillPanel();renderSkillBar();});
}
// agrège les stats effectives d'un objet (avec niveau d'amélioration)
/* Les clés de l'agrégat sont DÉDUITES d'AFFIX, jamais recopiées à la main.

   Deux affixes ajoutés en cours de route — Agilité (`agi`) et Vitesse
   d'attaque (`ias`) — n'étaient dans aucune des deux listes écrites en dur.
   `o[a.t]!==undefined` était faux pour eux : ils étaient donc **purement et
   simplement ignorés** dans l'agrégat, et la comparaison ne pouvait pas les
   voir. Six autres (`mf`, `crit`, `leech`, `cast`, `block`, `acc`) étaient
   bien agrégés mais absents de la boucle de comparaison.

   Sur quinze types d'affixe, sept seulement étaient comparés. Tout nouvel
   affixe est maintenant pris en compte sans rien toucher ici. */
const AGG_CLES=(function(){
  const l=['dmg','def'];
  for(const a of AFFIX) if(l.indexOf(a.t)<0) l.push(a.t);
  return l;
})();
function itemAgg(it){const m=UPMULT(it.plus);const o={};
  for(const k of AGG_CLES)o[k]=0;
  if(it.baseDmg)o.dmg+=it.baseDmg*m;if(it.baseDef)o.def+=it.baseDef*m;
  for(const a of it.affixes){const v=a.v*m;if(o[a.t]!==undefined)o[a.t]+=v;}
  return o;}
const AGGLBL={dmg:'Dégâts',def:'Défense',block:'% Blocage',acc:'% Précision',str:'Force',dex:'Dextérité',agi:'Agilité',vit:'Vitalité',ene:'Énergie',dmgpct:'% Dégâts',mf:'% Trouvaille',crit:'% Critique',critDmg:'% Dégâts critiques',dmgMult:'% Dégâts (multiplicatif)',leech:'% Vol de vie',cast:'% Incant.',ias:'% Vit. attaque',pick:'% Ramassage'};
/* Filet de sécurité : si un affixe apparaît sans étiquette, on la fabrique à
   partir de son nom dans AFFIX plutôt que d'afficher une clé technique. */
/* Ordre d'affichage : ce qui frappe d'abord, puis les attributs, puis les %. */
const AGG_ORDRE=['dmg','def','str','dex','agi','vit','ene','dmgpct','ias','cast','crit','acc','block','leech','mf']
  .filter(k=>AGG_CLES.indexOf(k)>=0)
  .concat(AGG_CLES.filter(k=>['dmg','def','str','dex','agi','vit','ene','dmgpct','ias','cast','crit','acc','block','leech','mf'].indexOf(k)<0));
function comparisonHTML(it){
  const cur=player.equip[it.slot];if(!cur||cur===it)return '';
  const a=itemAgg(it),b=itemAgg(cur);let rows='';
  const POURCENT={dmgpct:1,mf:1,crit:1,leech:1,cast:1,block:1,acc:1,ias:1};
  for(const k of AGG_ORDRE){
    const d=Math.round(a[k]-b[k]); if(d===0)continue;
    const col=d>0?'#7dff9a':'#ff8a8a', sign=d>0?'▲ +':'▼ ';
    const lbl=(AGGLBL[k]||k).replace(/^%\s*/,'');
    rows+=`<div style="color:${col}">${sign}${d}${POURCENT[k]?'%':''} ${lbl}</div>`;}
  const head=`<div style="margin-top:6px;padding-top:5px;border-top:1px solid #2a3350;color:#8ea0c8;font-size:10px">vs équipé (${itemIco(cur)}${cur.plus?' +'+cur.plus:''}) :</div>`;
  return rows?head+rows:`<div style="margin-top:6px;padding-top:5px;border-top:1px solid #2a3350;color:#6b789c;font-size:10px">Équivalent à l'équipé actuel</div>`;
}
const tip=document.getElementById('tip');
/* Le contenu d'une fiche d'objet ne dépend pas de l'endroit où on l'affiche.
   Il sert désormais à deux choses : la bulle flottante (souris) et l'encart
   fixe du sac (doigt), où la bulle recouvrait les boutons Équiper / Démonter. */
function itemHTML(it,equipped){
  const m=UPMULT(it.plus);const up=it.plus?` <span style="color:#7dff9a">+${it.plus}</span>`:'';
  const _ni=needsId(it);
  const _tic=itemIco(it);
  const _tim=/^<img/.test(_tic)?_tic.replace(/style="[^"]*"/,'style="width:30px;height:30px;vertical-align:-7px;margin-right:6px;image-rendering:pixelated"'):'';
  let html=`<div class="tname rar-${it.rarity}">${_tim}${_ni?'Objet non identifié':it.name+up}</div>`;
  html+=`<div style="color:#8ea0c8;font-size:11px;margin-bottom:4px">${slotName(it.slot)} · ${RAR[it.rarity].name}${it.slot&&it.slot!=='gem'?' · Objet niv. '+(it.ilvl||it.req||1):''}${it.plus?' · amélioré':''}</div>`;if(it.req>1)html+=`<div style="font-size:11px;color:${player.lvl<it.req?'#ff8a8a':'#8ea0c8'}">Niveau requis : ${it.req}</div>`;
  if(_ni){
    html+=`<div style="color:#ffd35e;margin:4px 0">❓ Propriétés inconnues</div>`;
    html+=`<div style="color:#8ea0c8;font-size:11px">Un Parchemin d’Identification révélera son nom et ses affixes.</div>`;
    if(it.duraMax!=null){const p0=Math.round(100*it.dura/it.duraMax);
      html+=`<div style="color:${p0<=0?'#ff6b6b':p0<35?'#ffb45e':'#8ea0c8'}">Durabilité : ${it.dura}/${it.duraMax}${p0<=0?' — HORS D’USAGE':''}</div>`;}
    html+=`<div style="color:#6b789c;font-size:10px;margin-top:5px">Vente : <span class="gi"></span>${sellValue(it)} · Démontage : ❄${salvageValue(it)}</div>`;
    html+=`<div style="color:#6b789c;font-size:10px">${IS_TOUCH?'Double-tap':'Clic droit'} : identifier (${player.scrollsId||0} parchemin${(player.scrollsId||0)>1?'s':''})</div>`;
    return html;
  }
  if(it.duraMax!=null){const p=Math.round(100*it.dura/it.duraMax);
    html+=`<div style="color:${p<=0?'#ff6b6b':p<35?'#ffb45e':'#8ea0c8'}">Durabilité : ${it.dura}/${it.duraMax}${p<=0?' — HORS D’USAGE':''}</div>`;}
  {const rw=runewordOf(it);if(rw)html+=`<div style="color:#c8a2ff">${t('runique.etiquette',{nom:nomMotRunique(rw),effet:descMotRunique(rw)})}</div>`;}
  if(it.charm)html+=`<div style="color:#7dd0ff">Charme (agit depuis le sac) : ${affixText({t:it.charm.t,v:it.charm.v})}</div>`;
  if(it.baseDmg)html+=`<div>Dégâts d'arme : +${Math.round(it.baseDmg*m)}</div>`;
  if(it.baseDef)html+=`<div>Défense : +${Math.round(it.baseDef*m)}</div>`;
  for(const a of it.affixes)html+=`<div class="taff">${affixText({t:a.t,v:Math.round(a.v*m)})}</div>`;
  if(!equipped)html+=comparisonHTML(it);
  if(it.sock)html+=`<div class="taff">Serti : ${affixText({t:it.sock.t,v:it.sock.v})}</div>`;
  if(it.sockets){for(const _g of it.sockets){if(_g&&_g.sock)html+=`<div class="taff" style="color:#8fd0ff">${itemIco(_g)} ${affixText({t:_g.sock.t,v:_g.sock.v})} — ${_g.name}</div>`;}
    html+=`<div style="color:#8ea0c8;font-size:11px">Châsses : ${it.sockets.map(s=>s?'●':'○').join(' ')}</div>`;}
  html+=`<div style="color:#6b789c;font-size:10px;margin-top:5px">Vente : <span class="gi"></span>${sellValue(it)} · Démontage : ❄${salvageValue(it)}</div>`;
  html+=`<div style="color:#6b789c;font-size:10px">${equipped?'Clic pour retirer':'Clic pour sélectionner'}</div>`;
  return html;}
/* Au doigt, un simple appui déclenche aussi mouseenter/mousemove : la bulle
   surgissait sous le pouce et recouvrait la zone de stats du sac. Elle ne
   s'affiche plus que par un geste explicite (maintien long), et jamais dans le
   sac, qui a désormais son encart dédié. */
function showTip(e,it,equipped,forcer){
  if(IS_TOUCH&&!forcer)return;
  tip.innerHTML=itemHTML(it,equipped);tip.style.display='block';moveTip(e);}
function moveTip(e){tip.style.left=Math.min(e.clientX+14,innerWidth-250)+'px';tip.style.top=Math.min(e.clientY+14,innerHeight-160)+'px';}
function hideTip(){tip.style.display='none';}
const slotName=s=>s==='weapon'?'Crosse':s==='armor'?'Armure':'Amulette';
let maxAct=-1,bossKilled=false,bossCleared=[false,false,false,false,false];let questNew=0;
function setBadge(id,n,warn){const b=document.getElementById(id);if(!b)return;if(n>0){b.style.display='block';b.textContent=(n===true)?'!':(n>9?'9+':n);b.style.background=warn?'#e0403a':'#f4b400';b.style.color=warn?'#fff':'#111';}else b.style.display='none';}
function updateQuestBadge(){setBadge('qBadge',questNew,true);}
function updateBadges(){
  updateQuestBadge();
  /* Une pastille ne doit signaler qu'une chose À FAIRE ICI. L'onglet Équipement
     n'en a aucune : on y retire une pièce en cliquant dessus, il n'y a rien à
     traiter. Seuls les points d'attribut et de compétence en méritent une. */
  const pts=player.statPts||0;
  setBadge('statBadge',pts,false);
  setBadge('attrBadge',pts,false);
  setBadge('skillBadge',player.treePts||0,false);
  setBadge('bagBadge',(placesUtilisees()>=invCap)?true:0,true);
}
/* ⚠ `onKill` FAIT `if(qc[en.kind]!=null)qc[en.kind]++` : une espèce absente
   de cette table ne compte NULLE PART. `shade` et `golem` y manquaient
   depuis toujours, et les quatre tireurs depuis la v9.57 — tuer un Cracheur
   n'avançait rien et n'aurait pu servir à aucune quête. Un compteur ne coûte
   rien ; son absence rend une espèce inutilisable par le journal.
   (v9.60, agent `recensement`) */
const qc={elites:0,chests:0,shrines:0,imp:0,wraith:0,brute:0,shade:0,golem:0,
  sorcier:0,tireur:0,cracheur:0,soldat:0,
  arenaRuns:0,arenaT1:0,arenaT2:0,arenaT3:0,arenaNoPot:0,legendary:0,talkArena:0};
const QUESTS=[{"id": "m0a", "act": 0, "name": "Le Grand Plongeon", "desc": "Aldric chausse ses patins : « Bon. La ville est envahie de démons, ma piste est un cratère et mon coach a des ailes. Journée normale. » Nettoie l'entrée de la Piscine.", "type": "kills", "target": 8, "need": {"act": 0}, "gold": 100, "potion": 1, "etapes": [{"t": "parler", "txt": "Parler à Régis, le Maître-Nageur"}, {"t": "compte", "sur": "kills", "n": 8, "txt": "Dégager l'entrée du bassin"}, {"t": "parler", "txt": "Rendre compte à Régis"}]}, {"id": "m0b", "act": 0, "name": "Le Sifflet du Pacte", "desc": "Dans les vestiaires noyés dort le Sifflet du Coach Verdier — celui qui a sonné le pacte et damné toute une équipe. Fouille les coffres, puis brise cette première relique du Falcon.", "type": "chests", "target": 3, "need": {"act": 0, "prev": ["m0a"]}, "gold": 150, "gem": true, "etapes": [{"t": "parler", "txt": "Écouter Régis à propos du Sifflet"}, {"t": "lieu", "cle": "salle", "txt": "Descendre dans les vestiaires noyés"}, {"t": "compte", "sur": "chests", "n": 3, "txt": "Forcer trois casiers"}, {"t": "relique", "txt": "Briser le Sifflet du Pacte"}, {"t": "parler", "txt": "Revenir vers Régis"}]}, {"id": "m0c", "act": 0, "name": "Vidange Générale", "desc": "« Qui a laissé entrer autant de diablotins dans MA piscine ? » Débarrasse le bassin de sa vermine cornue avant qu'elle ne bouche les canalisations de l'Abîme.", "type": "kind", "target": 12, "need": {"act": 0, "prev": ["m0a"]}, "gold": 120, "kind": "imp", "etapes": [{"t": "compte", "sur": "imp", "n": 12, "txt": "Vider le bassin de sa vermine"}, {"t": "parler", "txt": "Prévenir Régis que les canalisations sont libres"}]}, {"id": "m0d", "act": 0, "name": "Le Maître-Nageur Damné", "desc": "Un champion boursouflé règne sur le grand bain et siffle encore les faux départs des morts. Terrasse deux élites pour lui prouver que le règlement a changé.", "type": "elites", "target": 2, "need": {"act": 0, "prev": ["m0b"]}, "gold": 180, "frags": 4, "etapes": [{"t": "parler", "txt": "Demander à Régis qui règne sur le grand bain"}, {"t": "compte", "sur": "elites", "n": 2, "txt": "Terrasser deux champions"}, {"t": "parler", "txt": "Le dire à Régis"}]}, {"id": "m0e", "act": 0, "name": "Descente aux Enfers Gelés", "desc": "Le Sifflet brisé, un écho glacial monte de sous la ville. « La Glacière. Évidemment. Pourquoi ce serait au chaud ? » Rejoins l'Acte 2.", "type": "reach", "target": 1, "need": {"act": 0, "prev": ["m0b", "m0d"]}, "gold": 200, "xp": 60, "etapes": [{"t": "gardien", "txt": "Terrasser le gardien de la Piscine"}, {"t": "compte", "sur": "reach", "n": 1, "txt": "Franchir la sortie vers la Glacière"}]}, {"id": "m1a", "act": 1, "name": "Le Cœur de Givre", "desc": "La Glacière bat d'un froid vivant, comme un cœur sous le givre. Dans la glace résonne une voix familière : celle d'un ancien coéquipier. Survis à la caverne.", "type": "kills", "target": 30, "need": {"act": 1}, "gold": 200, "potion": 2, "etapes": [{"t": "parler", "txt": "Parler au Coéquipier Gelé"}, {"t": "compte", "sur": "kills", "n": 30, "txt": "Repousser ce qui rôde dans le froid"}, {"t": "parler", "txt": "Revenir près de lui"}]}, {"id": "m1b", "act": 1, "name": "La Rondelle Maudite", "desc": "La rondelle du but de la victoire, figée pour l'éternité avec les âmes qu'elle a coûtées, est la deuxième relique du Falcon. Force les coffres gelés, puis détruis-la.", "type": "chests", "target": 6, "need": {"act": 1, "prev": ["m1a"]}, "gold": 250, "gem": true, "etapes": [{"t": "parler", "txt": "Se faire indiquer le casier du fond"}, {"t": "lieu", "cle": "salle", "txt": "Atteindre le fond de la glacière"}, {"t": "compte", "sur": "chests", "n": 6, "txt": "Ouvrir six casiers"}, {"t": "relique", "txt": "Briser la Rondelle Maudite"}, {"t": "parler", "txt": "Retourner voir le Coéquipier Gelé"}]}, {"id": "m1c", "act": 1, "name": "Le Pacte Révélé", "desc": "Le spectre d'un coéquipier avoue : « Le Coach… il a signé quelque chose. Pour qu'on gagne. On a gagné. Puis on est morts. » Purge les spectres qui le tourmentent.", "type": "kind", "target": 20, "need": {"act": 1, "prev": ["m1a"]}, "gold": 220, "frags": 6, "kind": "wraith", "etapes": [{"t": "compte", "sur": "wraith", "n": 20, "txt": "Disperser les spectres du pacte"}, {"t": "parler", "txt": "Rapporter ce qu'ils murmuraient"}]}, {"id": "m1d", "act": 1, "name": "Gardiens du Froid", "desc": "Des champions de givre protègent la vérité derrière leur acier. Aldric soupire : « Toujours un boss entre moi et une info utile. » Abats cinq élites au total.", "type": "elites", "target": 5, "need": {"act": 1, "prev": ["m1b"]}, "gold": 280, "frags": 6, "etapes": [{"t": "parler", "txt": "Écouter parler des Gardiens du Froid"}, {"t": "compte", "sur": "elites", "n": 5, "txt": "Abattre cinq champions"}, {"t": "parler", "txt": "Le dire au Coéquipier Gelé"}]}, {"id": "m1e", "act": 1, "name": "Vers les Bois", "desc": "La piste remonte vers le Bois de Moreuil, là où tout a commencé en 1918… et où tout recommence. Rejoins l'Acte 3.", "type": "reach", "target": 2, "need": {"act": 1, "prev": ["m1b", "m1c"]}, "gold": 320, "xp": 120, "etapes": [{"t": "gardien", "txt": "Terrasser Givre-Cœur"}, {"t": "compte", "sur": "reach", "n": 2, "txt": "Prendre la route du Bois"}]}, {"id": "m2a", "act": 2, "name": "Le Bois Qui Se Souvient", "desc": "Sous les arbres figés errent les soldats de 1918, mêlés aux démons qui profanent leur repos. « Respect, les gars. Mais poussez-vous. » Tiens la ligne.", "type": "kills", "target": 60, "need": {"act": 2}, "gold": 320, "potion": 2, "etapes": [{"t": "parler", "txt": "Se présenter au Poilu de 1918"}, {"t": "compte", "sur": "kills", "n": 60, "txt": "Nettoyer les sentiers"}, {"t": "parler", "txt": "Faire son rapport"}]}, {"id": "m2b", "act": 2, "name": "La Médaille de 1918", "desc": "La Médaille de 1918, gagnée dans la boue et corrompue par le démon, est la troisième relique du Falcon. Fouille les coffres du champ de bataille, puis brise-la.", "type": "chests", "target": 10, "need": {"act": 2, "prev": ["m2a"]}, "gold": 350, "gem": true, "etapes": [{"t": "parler", "txt": "Interroger le Poilu sur la Médaille"}, {"t": "lieu", "cle": "grotte", "txt": "Descendre dans un trou d'obus"}, {"t": "compte", "sur": "chests", "n": 10, "txt": "Fouiller dix caches"}, {"t": "relique", "txt": "Briser la Médaille de 1918"}, {"t": "parler", "txt": "Retourner au poste du Poilu"}]}, {"id": "m2c", "act": 2, "name": "Le Nom du Traître", "desc": "Un vieux fantôme crache enfin le nom : « Verdier. Le Coach. Il nous a vendus au démon d'en-bas. » Brise les brutes qui gardent son secret.", "type": "kind", "target": 25, "need": {"act": 2, "prev": ["m2a"]}, "gold": 330, "frags": 8, "kind": "brute", "etapes": [{"t": "compte", "sur": "brute", "n": 25, "txt": "Briser les Brutes d'os"}, {"t": "parler", "txt": "Donner le nom du traître au Poilu"}]}, {"id": "m2d", "act": 2, "name": "Chasse aux Champions", "desc": "La forêt grouille d'élites aux yeux d'émeraude. Aldric craque ses phalanges : « Séance d'entraînement. » Terrasse huit champions au total.", "type": "elites", "target": 8, "need": {"act": 2, "prev": ["m2b"]}, "gold": 400, "frags": 8, "etapes": [{"t": "parler", "txt": "Demander où sont les meneurs"}, {"t": "compte", "sur": "elites", "n": 8, "txt": "Abattre huit champions"}, {"t": "parler", "txt": "Rendre compte"}]}, {"id": "m2e", "act": 2, "name": "Le Sanctuaire Profané", "desc": "La piste du Coach mène à l'Église Saint-Vaast, où sa créature la plus fidèle veille sur l'autel. Rejoins l'Acte 4.", "type": "reach", "target": 3, "need": {"act": 2, "prev": ["m2b", "m2c"]}, "gold": 450, "xp": 200, "etapes": [{"t": "gardien", "txt": "Terrasser l'Ancien des Bois"}, {"t": "compte", "sur": "reach", "n": 3, "txt": "Gagner l'église Saint-Vaast"}]}, {"id": "m3a", "act": 3, "name": "La Nef Corrompue", "desc": "L'Église est devenue un autel de feu bleu, et les cantiques ont un goût de soufre. « J'ai été de messe plus accueillante. » Fraye-toi un chemin jusqu'au chœur.", "type": "kills", "target": 100, "need": {"act": 3}, "gold": 450, "potion": 3, "etapes": [{"t": "parler", "txt": "Parler à Sœur Vaast"}, {"t": "compte", "sur": "kills", "n": 100, "txt": "Purger la nef"}, {"t": "parler", "txt": "Revenir vers elle"}]}, {"id": "m3b", "act": 3, "name": "Le Calice Profané", "desc": "La quatrième relique du Falcon, le calice de la paroisse souillé par la créature, trône sur l'autel comme un trophée volé. Ouvre les coffres sacrés, puis détruis-le.", "type": "chests", "target": 15, "need": {"act": 3, "prev": ["m3a"]}, "gold": 500, "gem": true, "etapes": [{"t": "parler", "txt": "Écouter Sœur Vaast à propos du Calice"}, {"t": "lieu", "cle": "salle", "txt": "Descendre dans la crypte"}, {"t": "compte", "sur": "chests", "n": 15, "txt": "Ouvrir quinze reliquaires"}, {"t": "relique", "txt": "Briser le Calice Profané"}, {"t": "parler", "txt": "Remonter vers Sœur Vaast"}]}, {"id": "m3c", "act": 3, "name": "Le Séraphin Corrompu", "desc": "Le bras armé du Coach, un ange déchu, barre l'autel de ses six ailes. « Toi, le sacré, tu vas goûter à mon Palet. » Élimine douze champions pour percer sa garde.", "type": "elites", "target": 12, "need": {"act": 3, "prev": ["m3a"]}, "gold": 550, "frags": 10, "etapes": [{"t": "parler", "txt": "Se faire décrire le Séraphin"}, {"t": "compte", "sur": "elites", "n": 12, "txt": "Abattre douze champions"}, {"t": "parler", "txt": "Le dire à Sœur Vaast"}]}, {"id": "m3d", "act": 3, "name": "La Vérité sous les Vitraux", "desc": "Les vitraux racontent tout : la Coupe gagnée, le démon dévorant Verdier, et le Green Falcon déployant ses ailes pour régner sur l'Abîme. Purge les spectres témoins.", "type": "kind", "target": 40, "need": {"act": 3, "prev": ["m3b"]}, "gold": 560, "frags": 10, "kind": "wraith", "etapes": [{"t": "compte", "sur": "wraith", "n": 40, "txt": "Faire taire ce qui hante les vitraux"}, {"t": "parler", "txt": "Rapporter la vérité à Sœur Vaast"}]}, {"id": "m3e", "act": 3, "name": "Le Dernier Vestiaire", "desc": "Quatre reliques en poussière. Ne reste que la Coupe Maudite — dans le Gymnase, entre les serres du Falcon. Rejoins l'Acte 5.", "type": "reach", "target": 4, "need": {"act": 3, "prev": ["m3b", "m3c"]}, "gold": 650, "xp": 320, "etapes": [{"t": "gardien", "txt": "Terrasser le Séraphin Corrompu"}, {"t": "compte", "sur": "reach", "n": 4, "txt": "Rejoindre le gymnase du collège"}]}, {"id": "m4a", "act": 4, "name": "Retour au Gymnase", "desc": "La piste du collège, là où Aldric a appris à patiner, à frapper, à gagner. Aujourd'hui, c'est l'arène finale. « À la maison. Enfin, ce qu'il en reste. »", "type": "kills", "target": 150, "need": {"act": 4}, "gold": 700, "potion": 3, "etapes": [{"t": "parler", "txt": "Retrouver le Vieux Outlaw au gymnase"}, {"t": "compte", "sur": "kills", "n": 150, "txt": "Reprendre le terrain, mètre par mètre"}, {"t": "parler", "txt": "Faire le point avec lui"}]}, {"id": "m4b", "act": 4, "name": "Les Cinq Reliques", "desc": "Sifflet, Rondelle, Médaille, Calice… détruits. Ne reste que la Coupe Maudite, la dernière relique du Falcon. Vide les derniers coffres pour la trouver et la briser.", "type": "chests", "target": 20, "need": {"act": 4, "prev": ["m4a"]}, "gold": 800, "gem": true, "etapes": [{"t": "parler", "txt": "Se faire confirmer les quatre reliques brisées"}, {"t": "compte", "sur": "chests", "n": 20, "txt": "Fouiller vingt casiers"}, {"t": "relique", "txt": "Briser la Coupe Maudite"}, {"t": "parler", "txt": "Revenir vers le Vieux Outlaw"}]}, {"id": "m4c", "act": 4, "name": "Le Green Falcon", "desc": "Ses cinq reliques brisées, le Green Falcon n'a plus d'armure. Il déploie ses ailes d'émeraude : « Aldric ! Tu es EN RETARD à l'entraînement ! » Terrasse-le — il est enfin vulnérable, surtout au sacré.", "type": "boss", "target": 1, "need": {"act": 4, "prev": ["m4b"]}, "gold": 1500, "gem": true, "xp": 500, "etapes": [{"t": "parler", "txt": "Écouter le dernier conseil du Vieux Outlaw"}, {"t": "compte", "sur": "boss", "n": 1, "txt": "Affronter le Green Falcon"}]}, {"id": "m4d", "act": 4, "name": "Le Serment Tenu", "desc": "Privé de ses reliques, le démon n'a plus d'ancrage : en tombant, le Coach redevient un vieil homme brisé qui murmure des excuses, et la Faille se referme. Purge les derniers démons pour clore la nuit.", "type": "kills", "target": 180, "need": {"act": 4, "prev": ["m4c"]}, "gold": 1000, "frags": 20, "etapes": [{"t": "compte", "sur": "kills", "n": 180, "txt": "Tenir la promesse faite à l'équipe"}, {"t": "parler", "txt": "Le dire à voix haute"}]}, {"id": "m4e", "act": 4, "name": "Légende de Moreuil", "desc": "Les Outlaws sont libérés, la ville sauvée, la légende écrite. « Bon. Qui range les palets, maintenant ? » Atteins le niveau 20 pour asseoir ta légende.", "type": "level", "target": 20, "need": {"act": 4, "prev": ["m4c"]}, "gold": 1200, "gem": true, "etapes": [{"t": "compte", "sur": "level", "n": 20, "txt": "Devenir une légende de Moreuil"}, {"t": "parler", "txt": "Se le faire confirmer par le Vieux Outlaw"}]}, {"id": "s01", "act": 0, "name": "Grand ménage — Piscine de Moreuil", "desc": "Les démons ont annexé le petit bain et pataugent dans MA piscine. Vide les lieux. « Je fais ça les yeux fermés. »", "type": "kills", "target": 12, "need": {"act": 0}, "gold": 45, "etapes": [{"t": "compte", "sur": "kills", "n": 12, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte à Régis"}]}, {"id": "s02", "act": 0, "name": "Purge sanitaire — Piscine de Moreuil", "desc": "La vermine de la Faille prolifère entre les plots de départ. Purge la zone. « Pour l'équipe. »", "type": "kills", "target": 20, "need": {"act": 0}, "gold": 45, "etapes": [{"t": "compte", "sur": "kills", "n": 20, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte à Régis"}]}, {"id": "s03", "act": 0, "name": "Ratissage — Piscine de Moreuil", "desc": "Ratisse le bassin, ligne d'eau par ligne d'eau, jusqu'au dernier démon. « Après, je prends une pause. »", "type": "kills", "target": 20, "need": {"act": 0}, "gold": 45, "etapes": [{"t": "compte", "sur": "kills", "n": 20, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte à Régis"}]}, {"id": "s04", "act": 0, "name": "Opération balai — Piscine de Moreuil", "desc": "Un coup de balai s'impose du pédiluve au grand plongeoir. « Facile. Enfin, presque. »", "type": "kills", "target": 30, "need": {"act": 0}, "gold": 45, "potion": 1, "etapes": [{"t": "compte", "sur": "kills", "n": 30, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte à Régis"}]}, {"id": "s05", "act": 0, "name": "Contrat de chasse — diablotins", "desc": "Des diablotins font des bombes dans le grand bain. Traque-les en priorité. Aldric : « Encore ? »", "type": "kind", "target": 8, "need": {"act": 0}, "kind": "imp", "gold": 45, "frags": 2, "etapes": [{"t": "compte", "sur": "imp", "n": 8, "txt": "Traquer une engeance"}, {"t": "parler", "txt": "Rendre compte à Régis"}]}, {"id": "s06", "act": 0, "name": "Extermination ciblée — spectres bleus", "desc": "Des spectres bleus hantent les lignes d'eau comme de vieux records jamais battus. Traque-les en priorité. « Je fais ça les yeux fermés. »", "type": "kind", "target": 15, "need": {"act": 0}, "kind": "wraith", "gold": 45, "etapes": [{"t": "compte", "sur": "wraith", "n": 15, "txt": "Traquer une engeance"}, {"t": "parler", "txt": "Rendre compte à Régis"}]}, {"id": "s07", "act": 0, "name": "Battue — brutes d'os", "desc": "Des brutes d'os squattent les gradins et cassent les transats. Traque-les en priorité. « Pour l'équipe. »", "type": "kind", "target": 8, "need": {"act": 0}, "kind": "brute", "gold": 45, "gem": true, "etapes": [{"t": "compte", "sur": "brute", "n": 8, "txt": "Traquer une engeance"}, {"t": "parler", "txt": "Rendre compte à Régis"}]}, {"id": "s08", "act": 0, "name": "Pilleur de coffres — Piscine de Moreuil", "desc": "Les casiers des vestiaires n'ont pas tout rendu. Force les coffres de la zone. « Après, je prends une pause. »", "type": "chests", "target": 4, "need": {"act": 0}, "gold": 65, "potion": 1, "etapes": [{"t": "compte", "sur": "chests", "n": 4, "txt": "Forcer des coffres"}, {"t": "parler", "txt": "Rendre compte à Régis"}]}, {"id": "s09", "act": 0, "name": "Fouille méthodique — Piscine de Moreuil", "desc": "Fouille la Piscine coffre par coffre, sans oublier le local du maître-nageur. « Facile. Enfin, presque. »", "type": "chests", "target": 5, "need": {"act": 0}, "gold": 65, "etapes": [{"t": "compte", "sur": "chests", "n": 5, "txt": "Forcer des coffres"}, {"t": "parler", "txt": "Rendre compte à Régis"}]}, {"id": "s10", "act": 0, "name": "Trésors oubliés — Piscine de Moreuil", "desc": "Des trésors dorment au fond du bassin depuis la dernière kermesse. Force les coffres de la zone. Aldric : « Encore ? »", "type": "chests", "target": 8, "need": {"act": 0}, "gold": 65, "frags": 2, "etapes": [{"t": "compte", "sur": "chests", "n": 8, "txt": "Forcer des coffres"}, {"t": "parler", "txt": "Rendre compte à Régis"}]}, {"id": "s11", "act": 0, "name": "Défi du champion — Piscine", "desc": "Un champion parade sur le plongeoir des trois mètres. Fais-le descendre. « Je fais ça les yeux fermés. »", "type": "elites", "target": 3, "need": {"act": 0}, "gold": 65, "etapes": [{"t": "compte", "sur": "elites", "n": 3, "txt": "Abattre des champions"}, {"t": "parler", "txt": "Rendre compte à Régis"}]}, {"id": "s12", "act": 0, "name": "Tueur de champions — Piscine", "desc": "Les élites du bassin se croient intouchables depuis la fermeture. Abats les champions marqués. « Pour l'équipe. »", "type": "elites", "target": 4, "need": {"act": 0}, "gold": 65, "potion": 1, "etapes": [{"t": "compte", "sur": "elites", "n": 4, "txt": "Abattre des champions"}, {"t": "parler", "txt": "Rendre compte à Régis"}]}, {"id": "s13", "act": 0, "name": "Communion de Moreuil", "desc": "Les sanctuaires de la ville veillent encore sous le chlore. Active-les pour gagner leurs bienfaits. « Après, je prends une pause. »", "type": "shrines", "target": 1, "need": {"act": 0}, "gold": 45, "etapes": [{"t": "compte", "sur": "shrines", "n": 1, "txt": "Activer des sanctuaires"}, {"t": "parler", "txt": "Rendre compte à Régis"}]}, {"id": "s14", "act": 0, "name": "Bénédictions de Moreuil", "desc": "Une lueur sacrée résiste dans les douches froides. Active les sanctuaires pour gagner leurs bienfaits. « Facile. Enfin, presque. »", "type": "shrines", "target": 2, "need": {"act": 0}, "gold": 45, "gem": true, "etapes": [{"t": "compte", "sur": "shrines", "n": 2, "txt": "Activer des sanctuaires"}, {"t": "parler", "txt": "Rendre compte à Régis"}]}, {"id": "s15", "act": 0, "name": "Aguerrissement — Piscine de Moreuil", "desc": "La Glacière n'attendra pas un patineur tiède. Gagne en puissance avant la suite. Aldric : « Encore ? »", "type": "level", "target": 4, "need": {"act": 0}, "gold": 45, "frags": 2}, {"id": "s16", "act": 1, "name": "Purge sanitaire — La Glacière", "desc": "Le gel abrite plus de démons que de stalactites. Purge la zone. « Facile. Enfin, presque. »", "type": "kills", "target": 40, "need": {"act": 1}, "gold": 90, "etapes": [{"t": "compte", "sur": "kills", "n": 40, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte au Coéquipier Gelé"}]}, {"id": "s17", "act": 1, "name": "Ratissage — La Glacière", "desc": "Ratisse les galeries gelées jusqu'à ce que l'écho se taise. Aldric : « Encore ? »", "type": "kills", "target": 55, "need": {"act": 1}, "gold": 90, "etapes": [{"t": "compte", "sur": "kills", "n": 55, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte au Coéquipier Gelé"}]}, {"id": "s18", "act": 1, "name": "Opération balai — La Glacière", "desc": "Un coup de balai dans la caverne, avant que le froid ne recrute. « Je fais ça les yeux fermés. »", "type": "kills", "target": 48, "need": {"act": 1}, "gold": 90, "etapes": [{"t": "compte", "sur": "kills", "n": 48, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte au Coéquipier Gelé"}]}, {"id": "s19", "act": 1, "name": "Nettoyage de zone — La Glacière", "desc": "La population démoniaque de la Glacière dépasse le quota. Réduis-la. « Pour l'équipe. »", "type": "kills", "target": 65, "need": {"act": 1}, "gold": 90, "potion": 1, "etapes": [{"t": "compte", "sur": "kills", "n": 65, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte au Coéquipier Gelé"}]}, {"id": "s20", "act": 1, "name": "Extermination ciblée — diablotins", "desc": "Des diablotins font des glissades sur les âmes gelées. Traque-les en priorité. « Après, je prends une pause. »", "type": "kind", "target": 18, "need": {"act": 1}, "kind": "imp", "gold": 90, "frags": 4, "etapes": [{"t": "compte", "sur": "imp", "n": 18, "txt": "Traquer une engeance"}, {"t": "parler", "txt": "Rendre compte au Coéquipier Gelé"}]}, {"id": "s21", "act": 1, "name": "Battue — spectres bleus", "desc": "Des spectres bleus se fondent dans le givre — cherche les yeux qui brillent. Traque-les en priorité. « Facile. Enfin, presque. »", "type": "kind", "target": 26, "need": {"act": 1}, "kind": "wraith", "gold": 90, "etapes": [{"t": "compte", "sur": "wraith", "n": 26, "txt": "Traquer une engeance"}, {"t": "parler", "txt": "Rendre compte au Coéquipier Gelé"}]}, {"id": "s22", "act": 1, "name": "Prime démoniaque — brutes d'os", "desc": "Des brutes d'os font craquer la glace sous leur poids. Traque-les en priorité. Aldric : « Encore ? »", "type": "kind", "target": 18, "need": {"act": 1}, "kind": "brute", "gold": 90, "gem": true, "etapes": [{"t": "compte", "sur": "brute", "n": 18, "txt": "Traquer une engeance"}, {"t": "parler", "txt": "Rendre compte au Coéquipier Gelé"}]}, {"id": "s23", "act": 1, "name": "Fouille méthodique — La Glacière", "desc": "Les coffres de la Glacière sont soudés par le givre. Force-les. « Je fais ça les yeux fermés. »", "type": "chests", "target": 8, "need": {"act": 1}, "gold": 110, "potion": 1, "etapes": [{"t": "compte", "sur": "chests", "n": 8, "txt": "Forcer des coffres"}, {"t": "parler", "txt": "Rendre compte au Coéquipier Gelé"}]}, {"id": "s24", "act": 1, "name": "Trésors oubliés — La Glacière", "desc": "Des trésors attendent sous la glace depuis le grand gel. Force les coffres de la zone. « Pour l'équipe. »", "type": "chests", "target": 9, "need": {"act": 1}, "gold": 110, "etapes": [{"t": "compte", "sur": "chests", "n": 9, "txt": "Forcer des coffres"}, {"t": "parler", "txt": "Rendre compte au Coéquipier Gelé"}]}, {"id": "s25", "act": 1, "name": "Rat de cave — La Glacière", "desc": "Descends racler les coffres des galeries les plus profondes. « Après, je prends une pause. »", "type": "chests", "target": 12, "need": {"act": 1}, "gold": 110, "frags": 4, "etapes": [{"t": "compte", "sur": "chests", "n": 12, "txt": "Forcer des coffres"}, {"t": "parler", "txt": "Rendre compte au Coéquipier Gelé"}]}, {"id": "s26", "act": 1, "name": "Tueur de champions — La Glacière", "desc": "Les champions de glace patinent mieux que les tiens ne patinaient. Vexant. Abats les champions marqués. « Facile. Enfin, presque. »", "type": "elites", "target": 6, "need": {"act": 1}, "gold": 110, "etapes": [{"t": "compte", "sur": "elites", "n": 6, "txt": "Abattre des champions"}, {"t": "parler", "txt": "Rendre compte au Coéquipier Gelé"}]}, {"id": "s27", "act": 1, "name": "Prime : élite de la Glacière", "desc": "Une prime sur chaque élite de la caverne. Abats les champions marqués. Aldric : « Encore ? »", "type": "elites", "target": 7, "need": {"act": 1}, "gold": 110, "potion": 1, "etapes": [{"t": "compte", "sur": "elites", "n": 7, "txt": "Abattre des champions"}, {"t": "parler", "txt": "Rendre compte au Coéquipier Gelé"}]}, {"id": "s28", "act": 1, "name": "Bénédictions de la Glacière", "desc": "Des sanctuaires luisent faiblement sous le givre. Active-les pour gagner leurs bienfaits. « Je fais ça les yeux fermés. »", "type": "shrines", "target": 3, "need": {"act": 1}, "gold": 90, "etapes": [{"t": "compte", "sur": "shrines", "n": 3, "txt": "Activer des sanctuaires"}, {"t": "parler", "txt": "Rendre compte au Coéquipier Gelé"}]}, {"id": "s29", "act": 1, "name": "Rites de la Glacière", "desc": "Les vieux rites tiennent encore chaud, même ici. Active les sanctuaires pour gagner leurs bienfaits. « Pour l'équipe. »", "type": "shrines", "target": 4, "need": {"act": 1}, "gold": 90, "gem": true, "etapes": [{"t": "compte", "sur": "shrines", "n": 4, "txt": "Activer des sanctuaires"}, {"t": "parler", "txt": "Rendre compte au Coéquipier Gelé"}]}, {"id": "s30", "act": 1, "name": "Entraînement intensif — La Glacière", "desc": "Le Bois n'épargnera pas un Outlaw engourdi. Gagne en puissance avant la suite. « Après, je prends une pause. »", "type": "level", "target": 8, "need": {"act": 1}, "gold": 90, "frags": 4}, {"id": "s31", "act": 2, "name": "Ratissage — Bois de Moreuil", "desc": "Les sous-bois grouillent de démons entre les tranchées. Ratisse la zone. « Pour l'équipe. »", "type": "kills", "target": 75, "need": {"act": 2}, "gold": 135, "etapes": [{"t": "compte", "sur": "kills", "n": 75, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte au Poilu"}]}, {"id": "s32", "act": 2, "name": "Opération balai — Bois de Moreuil", "desc": "Un coup de balai sous les arbres figés — les Poilus apprécieront. « Après, je prends une pause. »", "type": "kills", "target": 95, "need": {"act": 2}, "gold": 135, "etapes": [{"t": "compte", "sur": "kills", "n": 95, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte au Poilu"}]}, {"id": "s33", "act": 2, "name": "Nettoyage de zone — Bois de Moreuil", "desc": "La population démoniaque du Bois déborde sur les sentiers. Réduis-la. « Facile. Enfin, presque. »", "type": "kills", "target": 83, "need": {"act": 2}, "gold": 135, "etapes": [{"t": "compte", "sur": "kills", "n": 83, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte au Poilu"}]}, {"id": "s34", "act": 2, "name": "Grand ménage — Bois de Moreuil", "desc": "Le Bois mérite mieux que cette infestation. Grand ménage. Aldric : « Encore ? »", "type": "kills", "target": 105, "need": {"act": 2}, "gold": 135, "potion": 1, "etapes": [{"t": "compte", "sur": "kills", "n": 105, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte au Poilu"}]}, {"id": "s35", "act": 2, "name": "Battue — diablotins", "desc": "Des diablotins nichent dans les arbres comme des corbeaux moqueurs. Traque-les en priorité. « Je fais ça les yeux fermés. »", "type": "kind", "target": 30, "need": {"act": 2}, "kind": "imp", "gold": 135, "frags": 6, "etapes": [{"t": "compte", "sur": "imp", "n": 30, "txt": "Traquer une engeance"}, {"t": "parler", "txt": "Rendre compte au Poilu"}]}, {"id": "s36", "act": 2, "name": "Prime démoniaque — spectres bleus", "desc": "Des spectres bleus flottent entre les troncs, à hauteur de baïonnette. Traque-les en priorité. « Pour l'équipe. »", "type": "kind", "target": 40, "need": {"act": 2}, "kind": "wraith", "gold": 135, "etapes": [{"t": "compte", "sur": "wraith", "n": 40, "txt": "Traquer une engeance"}, {"t": "parler", "txt": "Rendre compte au Poilu"}]}, {"id": "s37", "act": 2, "name": "Contrat de chasse — brutes d'os", "desc": "Des brutes d'os déterrent ce qui devrait rester enterré. Traque-les en priorité. « Après, je prends une pause. »", "type": "kind", "target": 30, "need": {"act": 2}, "kind": "brute", "gold": 135, "gem": true, "etapes": [{"t": "compte", "sur": "brute", "n": 30, "txt": "Traquer une engeance"}, {"t": "parler", "txt": "Rendre compte au Poilu"}]}, {"id": "s38", "act": 2, "name": "Trésors oubliés — Bois de Moreuil", "desc": "Le champ de bataille cache des trésors sous ses racines. Force les coffres de la zone. « Facile. Enfin, presque. »", "type": "chests", "target": 12, "need": {"act": 2}, "gold": 155, "potion": 1, "etapes": [{"t": "compte", "sur": "chests", "n": 12, "txt": "Forcer des coffres"}, {"t": "parler", "txt": "Rendre compte au Poilu"}]}, {"id": "s39", "act": 2, "name": "Rat de cave — Bois de Moreuil", "desc": "Fouille les caches creusées sous les tranchées. Force les coffres. Aldric : « Encore ? »", "type": "chests", "target": 14, "need": {"act": 2}, "gold": 155, "etapes": [{"t": "compte", "sur": "chests", "n": 14, "txt": "Forcer des coffres"}, {"t": "parler", "txt": "Rendre compte au Poilu"}]}, {"id": "s40", "act": 2, "name": "Pilleur de coffres — Bois de Moreuil", "desc": "Les coffres du Bois n'ouvriront pas tout seuls. Force-les. « Je fais ça les yeux fermés. »", "type": "chests", "target": 17, "need": {"act": 2}, "gold": 155, "frags": 6, "etapes": [{"t": "compte", "sur": "chests", "n": 17, "txt": "Forcer des coffres"}, {"t": "parler", "txt": "Rendre compte au Poilu"}]}, {"id": "s41", "act": 2, "name": "Prime : élite du Bois", "desc": "Une prime sur chaque élite qui rôde en lisière. Abats les champions marqués. « Pour l'équipe. »", "type": "elites", "target": 9, "need": {"act": 2}, "gold": 155, "etapes": [{"t": "compte", "sur": "elites", "n": 9, "txt": "Abattre des champions"}, {"t": "parler", "txt": "Rendre compte au Poilu"}]}, {"id": "s42", "act": 2, "name": "Trophée de chasse — Bois", "desc": "Les champions du Bois feraient de beaux trophées de chasse. Abats-les. « Après, je prends une pause. »", "type": "elites", "target": 11, "need": {"act": 2}, "gold": 155, "potion": 1, "etapes": [{"t": "compte", "sur": "elites", "n": 11, "txt": "Abattre des champions"}, {"t": "parler", "txt": "Rendre compte au Poilu"}]}, {"id": "s43", "act": 2, "name": "Rites du Bois de Moreuil", "desc": "Les sanctuaires du Bois veillent depuis 1918. Active-les pour gagner leurs bienfaits. « Facile. Enfin, presque. »", "type": "shrines", "target": 5, "need": {"act": 2}, "gold": 135, "etapes": [{"t": "compte", "sur": "shrines", "n": 5, "txt": "Activer des sanctuaires"}, {"t": "parler", "txt": "Rendre compte au Poilu"}]}, {"id": "s44", "act": 2, "name": "Pèlerinage de Moreuil", "desc": "Un pèlerinage entre les arbres qui se souviennent. Active les sanctuaires pour gagner leurs bienfaits. Aldric : « Encore ? »", "type": "shrines", "target": 6, "need": {"act": 2}, "gold": 135, "gem": true, "etapes": [{"t": "compte", "sur": "shrines", "n": 6, "txt": "Activer des sanctuaires"}, {"t": "parler", "txt": "Rendre compte au Poilu"}]}, {"id": "s45", "act": 2, "name": "Monter en gamme — Bois de Moreuil", "desc": "L'Église exigera un Outlaw à la hauteur de son clocher. Gagne en puissance avant la suite. « Je fais ça les yeux fermés. »", "type": "level", "target": 12, "need": {"act": 2}, "gold": 135, "frags": 6}, {"id": "s46", "act": 3, "name": "Opération balai — Église Saint-Vaast", "desc": "Un coup de balai dans la nef — les bancs n'ont jamais vu pareille assemblée. Aldric : « Encore ? »", "type": "kills", "target": 120, "need": {"act": 3}, "gold": 180, "etapes": [{"t": "compte", "sur": "kills", "n": 120, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte à Sœur Vaast"}]}, {"id": "s47", "act": 3, "name": "Nettoyage de zone — Église Saint-Vaast", "desc": "La population démoniaque profane chaque chapelle. Réduis-la. « Je fais ça les yeux fermés. »", "type": "kills", "target": 140, "need": {"act": 3}, "gold": 180, "etapes": [{"t": "compte", "sur": "kills", "n": 140, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte à Sœur Vaast"}]}, {"id": "s48", "act": 3, "name": "Grand ménage — Église Saint-Vaast", "desc": "Grand ménage sous les voûtes, du porche à la sacristie. « Pour l'équipe. »", "type": "kills", "target": 128, "need": {"act": 3}, "gold": 180, "etapes": [{"t": "compte", "sur": "kills", "n": 128, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte à Sœur Vaast"}]}, {"id": "s49", "act": 3, "name": "Purge sanitaire — Église Saint-Vaast", "desc": "Purge la maison de Sœur Vaast de ses squatteurs damnés. « Après, je prends une pause. »", "type": "kills", "target": 150, "need": {"act": 3}, "gold": 180, "potion": 1, "etapes": [{"t": "compte", "sur": "kills", "n": 150, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte à Sœur Vaast"}]}, {"id": "s50", "act": 3, "name": "Prime démoniaque — diablotins", "desc": "Des diablotins se balancent aux cordes des cloches. Traque-les en priorité. « Facile. Enfin, presque. »", "type": "kind", "target": 45, "need": {"act": 3}, "kind": "imp", "gold": 180, "frags": 8, "etapes": [{"t": "compte", "sur": "imp", "n": 45, "txt": "Traquer une engeance"}, {"t": "parler", "txt": "Rendre compte à Sœur Vaast"}]}, {"id": "s51", "act": 3, "name": "Contrat de chasse — spectres bleus", "desc": "Des spectres bleus imitent les vitraux pour passer inaperçus. Traque-les en priorité. Aldric : « Encore ? »", "type": "kind", "target": 55, "need": {"act": 3}, "kind": "wraith", "gold": 180, "etapes": [{"t": "compte", "sur": "wraith", "n": 55, "txt": "Traquer une engeance"}, {"t": "parler", "txt": "Rendre compte à Sœur Vaast"}]}, {"id": "s52", "act": 3, "name": "Extermination ciblée — brutes d'os", "desc": "Des brutes d'os profanent la crypte à grands coups d'épaule. Traque-les en priorité. « Je fais ça les yeux fermés. »", "type": "kind", "target": 45, "need": {"act": 3}, "kind": "brute", "gold": 180, "gem": true, "etapes": [{"t": "compte", "sur": "brute", "n": 45, "txt": "Traquer une engeance"}, {"t": "parler", "txt": "Rendre compte à Sœur Vaast"}]}, {"id": "s53", "act": 3, "name": "Rat de cave — Église Saint-Vaast", "desc": "La crypte garde ses coffres depuis des siècles. Force-les. « Pour l'équipe. »", "type": "chests", "target": 16, "need": {"act": 3}, "gold": 200, "potion": 1, "etapes": [{"t": "compte", "sur": "chests", "n": 16, "txt": "Forcer des coffres"}, {"t": "parler", "txt": "Rendre compte à Sœur Vaast"}]}, {"id": "s54", "act": 3, "name": "Pilleur de coffres — Église Saint-Vaast", "desc": "Le trésor de la paroisse n'attend qu'une bonne crosse. Force les coffres de la zone. « Après, je prends une pause. »", "type": "chests", "target": 18, "need": {"act": 3}, "gold": 200, "etapes": [{"t": "compte", "sur": "chests", "n": 18, "txt": "Forcer des coffres"}, {"t": "parler", "txt": "Rendre compte à Sœur Vaast"}]}, {"id": "s55", "act": 3, "name": "Fouille méthodique — Église Saint-Vaast", "desc": "Fouille l'Église chapelle par chapelle, confessionnal compris. « Facile. Enfin, presque. »", "type": "chests", "target": 21, "need": {"act": 3}, "gold": 200, "frags": 8, "etapes": [{"t": "compte", "sur": "chests", "n": 21, "txt": "Forcer des coffres"}, {"t": "parler", "txt": "Rendre compte à Sœur Vaast"}]}, {"id": "s56", "act": 3, "name": "Trophée de chasse — Église", "desc": "Les champions du Séraphin gardent la nef comme des gargouilles. Abats-les. Aldric : « Encore ? »", "type": "elites", "target": 13, "need": {"act": 3}, "gold": 200, "etapes": [{"t": "compte", "sur": "elites", "n": 13, "txt": "Abattre des champions"}, {"t": "parler", "txt": "Rendre compte à Sœur Vaast"}]}, {"id": "s57", "act": 3, "name": "Défi du champion — Église", "desc": "Un champion se prend pour l'archange du transept. Descends-le de son pilier. « Je fais ça les yeux fermés. »", "type": "elites", "target": 15, "need": {"act": 3}, "gold": 200, "potion": 1, "etapes": [{"t": "compte", "sur": "elites", "n": 15, "txt": "Abattre des champions"}, {"t": "parler", "txt": "Rendre compte à Sœur Vaast"}]}, {"id": "s58", "act": 3, "name": "Pèlerinage de Saint-Vaast", "desc": "Un pèlerinage sous les voûtes profanées. Active les sanctuaires pour gagner leurs bienfaits. « Pour l'équipe. »", "type": "shrines", "target": 7, "need": {"act": 3}, "gold": 180, "etapes": [{"t": "compte", "sur": "shrines", "n": 7, "txt": "Activer des sanctuaires"}, {"t": "parler", "txt": "Rendre compte à Sœur Vaast"}]}, {"id": "s59", "act": 3, "name": "Communion de Saint-Vaast", "desc": "Les sanctuaires de Saint-Vaast n'ont pas dit leur dernier cantique. Active-les pour gagner leurs bienfaits. « Après, je prends une pause. »", "type": "shrines", "target": 8, "need": {"act": 3}, "gold": 180, "gem": true, "etapes": [{"t": "compte", "sur": "shrines", "n": 8, "txt": "Activer des sanctuaires"}, {"t": "parler", "txt": "Rendre compte à Sœur Vaast"}]}, {"id": "s60", "act": 3, "name": "Aguerrissement — Église Saint-Vaast", "desc": "Le Gymnase sera le dernier round — arrive affûté. Gagne en puissance avant la suite. « Facile. Enfin, presque. »", "type": "level", "target": 16, "need": {"act": 3}, "gold": 180, "frags": 8}, {"id": "s61", "act": 4, "name": "Nettoyage de zone — Gymnase du Collège", "desc": "La population démoniaque campe sur la piste d'Aldric. Erreur. Réduis-la. « Après, je prends une pause. »", "type": "kills", "target": 165, "need": {"act": 4}, "gold": 225, "etapes": [{"t": "compte", "sur": "kills", "n": 165, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte au Vieux Outlaw"}]}, {"id": "s62", "act": 4, "name": "Grand ménage — Gymnase du Collège", "desc": "Grand ménage sur la piste, des vestiaires au rond central. « Facile. Enfin, presque. »", "type": "kills", "target": 200, "need": {"act": 4}, "gold": 225, "etapes": [{"t": "compte", "sur": "kills", "n": 200, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte au Vieux Outlaw"}]}, {"id": "s63", "act": 4, "name": "Purge sanitaire — Gymnase du Collège", "desc": "Purge le Gymnase — personne ne profane cette piste impunément. Aldric : « Encore ? »", "type": "kills", "target": 173, "need": {"act": 4}, "gold": 225, "etapes": [{"t": "compte", "sur": "kills", "n": 173, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte au Vieux Outlaw"}]}, {"id": "s64", "act": 4, "name": "Ratissage — Gymnase du Collège", "desc": "Ratisse les tribunes rangée par rangée. Les supporters ont changé. « Je fais ça les yeux fermés. »", "type": "kills", "target": 210, "need": {"act": 4}, "gold": 225, "potion": 1, "etapes": [{"t": "compte", "sur": "kills", "n": 210, "txt": "Éliminer des démons"}, {"t": "parler", "txt": "Rendre compte au Vieux Outlaw"}]}, {"id": "s65", "act": 4, "name": "Contrat de chasse — diablotins", "desc": "Des diablotins jouent avec les palets d'entraînement. Sacrilège. Traque-les en priorité. « Pour l'équipe. »", "type": "kind", "target": 60, "need": {"act": 4}, "kind": "imp", "gold": 225, "frags": 10, "etapes": [{"t": "compte", "sur": "imp", "n": 60, "txt": "Traquer une engeance"}, {"t": "parler", "txt": "Rendre compte au Vieux Outlaw"}]}, {"id": "s66", "act": 4, "name": "Extermination ciblée — spectres bleus", "desc": "Des spectres bleus rejouent la finale maudite en boucle. Traque-les en priorité. « Après, je prends une pause. »", "type": "kind", "target": 75, "need": {"act": 4}, "kind": "wraith", "gold": 225, "etapes": [{"t": "compte", "sur": "wraith", "n": 75, "txt": "Traquer une engeance"}, {"t": "parler", "txt": "Rendre compte au Vieux Outlaw"}]}, {"id": "s67", "act": 4, "name": "Battue — brutes d'os", "desc": "Des brutes d'os défoncent les balustrades de la piste. Traque-les en priorité. « Facile. Enfin, presque. »", "type": "kind", "target": 60, "need": {"act": 4}, "kind": "brute", "gold": 225, "gem": true, "etapes": [{"t": "compte", "sur": "brute", "n": 60, "txt": "Traquer une engeance"}, {"t": "parler", "txt": "Rendre compte au Vieux Outlaw"}]}, {"id": "s68", "act": 4, "name": "Pilleur de coffres — Gymnase du Collège", "desc": "Les casiers du Gymnase gardent les secrets de l'équipe. Force les coffres. Aldric : « Encore ? »", "type": "chests", "target": 22, "need": {"act": 4}, "gold": 245, "potion": 1, "etapes": [{"t": "compte", "sur": "chests", "n": 22, "txt": "Forcer des coffres"}, {"t": "parler", "txt": "Rendre compte au Vieux Outlaw"}]}, {"id": "s69", "act": 4, "name": "Fouille méthodique — Gymnase du Collège", "desc": "Fouille le Gymnase du local matériel à la buvette. « Je fais ça les yeux fermés. »", "type": "chests", "target": 26, "need": {"act": 4}, "gold": 245, "etapes": [{"t": "compte", "sur": "chests", "n": 26, "txt": "Forcer des coffres"}, {"t": "parler", "txt": "Rendre compte au Vieux Outlaw"}]}, {"id": "s70", "act": 4, "name": "Trésors oubliés — Gymnase du Collège", "desc": "Des trésors dorment sous les gradins depuis la finale. Force les coffres de la zone. « Pour l'équipe. »", "type": "chests", "target": 29, "need": {"act": 4}, "gold": 245, "frags": 10, "etapes": [{"t": "compte", "sur": "chests", "n": 29, "txt": "Forcer des coffres"}, {"t": "parler", "txt": "Rendre compte au Vieux Outlaw"}]}, {"id": "s71", "act": 4, "name": "Défi du champion — Gymnase", "desc": "Un champion s'est proclamé capitaine sur MA piste. Abats les champions marqués. « Après, je prends une pause. »", "type": "elites", "target": 17, "need": {"act": 4}, "gold": 245, "etapes": [{"t": "compte", "sur": "elites", "n": 17, "txt": "Abattre des champions"}, {"t": "parler", "txt": "Rendre compte au Vieux Outlaw"}]}, {"id": "s72", "act": 4, "name": "Tueur de champions — Gymnase", "desc": "La garde rapprochée du Falcon patrouille la piste. Abats les champions marqués. « Facile. Enfin, presque. »", "type": "elites", "target": 20, "need": {"act": 4}, "gold": 245, "potion": 1, "etapes": [{"t": "compte", "sur": "elites", "n": 20, "txt": "Abattre des champions"}, {"t": "parler", "txt": "Rendre compte au Vieux Outlaw"}]}, {"id": "s73", "act": 4, "name": "Communion du Collège", "desc": "Les sanctuaires du collège brillent encore sous la poussière. Active-les pour gagner leurs bienfaits. Aldric : « Encore ? »", "type": "shrines", "target": 9, "need": {"act": 4}, "gold": 225, "etapes": [{"t": "compte", "sur": "shrines", "n": 9, "txt": "Activer des sanctuaires"}, {"t": "parler", "txt": "Rendre compte au Vieux Outlaw"}]}, {"id": "s74", "act": 4, "name": "Bénédictions du Collège", "desc": "Une dernière bénédiction avant la mise au jeu finale. Active les sanctuaires pour gagner leurs bienfaits. « Je fais ça les yeux fermés. »", "type": "shrines", "target": 10, "need": {"act": 4}, "gold": 225, "gem": true, "etapes": [{"t": "compte", "sur": "shrines", "n": 10, "txt": "Activer des sanctuaires"}, {"t": "parler", "txt": "Rendre compte au Vieux Outlaw"}]}, {"id": "s75", "act": 4, "name": "Entraînement intensif — Gymnase du Collège", "desc": "Le Falcon t'attend au centre de la piste. Gagne en puissance avant la suite. « Pour l'équipe. »", "type": "level", "target": 22, "need": {"act": 4}, "gold": 225, "frags": 10}, {"id": "b0", "act": 0, "name": "Le Maître-Nageur Noyé", "desc": "Au fond du grand bain, un gardien spectral s'accroche encore à son poste, sifflet au cou et haine au ventre. Terrasse-le pour ouvrir la voie hors de la Piscine.", "type": "bossact", "target": 1, "need": {"act": 0}, "gold": 150, "xp": 80, "potion": 1}, {"id": "b1", "act": 1, "name": "Givre-Cœur, Gardien de Glace", "desc": "Un cœur de gel scelle la sortie de la Glacière et bat pour toute la caverne. Brise Givre-Cœur — le froid ne l'atteint pas, frappe au physique ou au sacré.", "type": "bossact", "target": 1, "need": {"act": 1}, "gold": 250, "xp": 150, "potion": 1}, {"id": "b2", "act": 2, "name": "L'Ancien des Bois", "desc": "Une entité sylvestre monte la garde à la lisière depuis 1918, nourrie de racines et de rancune. Abats l'Ancien des Bois pour rejoindre l'Église.", "type": "bossact", "target": 1, "need": {"act": 2}, "gold": 400, "xp": 260, "potion": 2}, {"id": "b3", "act": 3, "name": "Le Séraphin Corrompu", "desc": "L'ange déchu veille sur le chœur embrasé de feu bleu. Rappelle-lui, crosse en main, que le sacré, ça pique.", "type": "bossact", "target": 1, "need": {"act": 3}, "gold": 600, "xp": 380, "gem": true}, {"id": "a1", "act": 5, "name": "L’Homme qui a dit Non", "desc": "Anselme « la Cage » se tient près du portail de la Fosse, au village. Va l’écouter : il est le seul Outlaw à avoir refusé le pacte de Verdier.", "type": "talkArena", "target": 1, "need": {"act": 0}, "gold": 120, "potion": 1}, {"id": "a2", "act": 5, "name": "La Première Clé", "desc": "Chaque lieutenant du Falcon porte une clé de la Fosse. Arrache-lui.", "type": "key", "target": 1, "need": {"prev": ["a1"]}, "gold": 200, "frags": 3}, {"id": "a3", "act": 5, "name": "Baptême de la Fosse", "desc": "Survis à toutes les vagues d’une arène de bronze — les échos ne pardonnent pas aux prétentieux.", "type": "arenaT", "tier": 1, "target": 1, "need": {"prev": ["a2"]}, "gold": 400, "potion": 2}, {"id": "a4", "act": 5, "name": "L’Écho du Noyé", "desc": "Terrasse un giga-boss : l’écho d’une créature que tu as déjà tuée, rappelée en pire par la Fosse.", "type": "echo", "target": 1, "need": {"prev": ["a2"]}, "gold": 500, "gem": true}, {"id": "a5", "act": 5, "name": "Le Métal Blanc", "desc": "Termine une arène d’argent : dix niveaux au-dessus de toi, sans filet.", "type": "arenaT", "tier": 2, "target": 1, "need": {"prev": ["a3"]}, "gold": 900, "frags": 8}, {"id": "a6", "act": 5, "name": "Les Trois Sceaux", "desc": "Termine les trois paliers de la Fosse : bronze, argent et or.", "type": "arenaAll", "target": 3, "need": {"prev": ["a5"]}, "gold": 2000, "xp": 400}, {"id": "a7", "act": 5, "name": "Le Dernier Rempart", "desc": "Obtiens ta première pièce d’équipement légendaire — seule la Fosse en recrache.", "type": "legendary", "target": 1, "need": {"prev": ["a3"]}, "gold": 800, "frags": 12}, {"id": "a8", "act": 5, "name": "La Dette d’Anselme", "desc": "Termine une arène d’or sans boire la moindre potion. Il en rêve depuis neuf ans.", "type": "noPot", "target": 1, "need": {"prev": ["a6"]}, "gold": 3000, "xp": 600}];
const quests={};

/* CE QUI S'EXÉCUTE AU CHARGEMENT — sorti du premier niveau.

   Le module ne fait plus que DÉCLARER. Ses actions de chargement sont
   appelées par l'entrée, dans l'ordre des préfixes, ce qui rend l'ordre
   d'évaluation des modules INDIFFÉRENT — sans quoi la conversion en
   modules ES les remettrait dans un ordre imprévisible. */
function _demarrer22(){
  (function verrouPaysage(){
    if(!IS_TOUCH)return;
    const essayer=()=>{ try{
        const o=(typeof screen!=='undefined')&&screen.orientation;
        if(o&&o.lock){const p=o.lock('landscape'); if(p&&p.catch)p.catch(()=>{});}
      }catch(e){} };
    essayer();
    /* Le verrouillage exige presque toujours un geste utilisateur : on retente
       au premier contact, puis on se retire. */
    const auContact=()=>{ essayer();
      ['touchend','pointerdown'].forEach(t=>document.removeEventListener(t,auContact,true)); };
    ['touchend','pointerdown'].forEach(t=>document.addEventListener(t,auContact,true));
    document.addEventListener('visibilitychange',()=>{ if(!document.hidden)essayer(); });
  })();
  tAdd('c',0,0,'center',{},'Départ');
  /* Le nombre de branches et d'anneaux se lit dans les données : ajouter une
     branche à T_SPOKES suffit, il n'y a plus de 8 ni de 5 en dur ici. C'est
     ce qui a permis de passer de 49 à 91 nœuds sans toucher à cette boucle
     une seconde fois. */
  (function(){const NB=T_SPOKES.length;
    for(let s=0;s<NB;s++){const sp=T_SPOKES[s];const ang=sp.a*Math.PI/180;let prev='c';
      for(let r=1;r<=T_ANNEAUX;r++){const spec=sp.rings[r-1];const id='s'+s+'r'+r;
        const x=Math.round(Math.cos(ang)*T_RAD[r]),y=Math.round(Math.sin(ang)*T_RAD[r]);
        const kind=spec.skill?'skill':(r>=6?'notable':'minor');
        tAdd(id,x,y,kind,spec,spec.name);tLink(prev,id);prev=id;}
      if(sp.key){const id='s'+s+'k';const x=Math.round(Math.cos(ang)*T_KEYRAD),y=Math.round(Math.sin(ang)*T_KEYRAD);
        tAdd(id,x,y,'key',sp.key,sp.key.name);tLink('s'+s+'r'+T_ANNEAUX,id);}}
    for(const r of T_TRAVERSES)for(let s=0;s<NB;s++)tLink('s'+s+'r'+r,'s'+((s+1)%NB)+'r'+r);
  })();
  (function(){const f=document.getElementById('confirmFond');
    if(f)f.addEventListener('click',e=>{if(e.target===f)fermerConfirmation();});})();
  computeTreeBonus();
  for(const a of AFFIX) if(!AGGLBL[a.t]) AGGLBL[a.t]=a.n.replace(/^\+#%?\s*/,'');
}

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */
function setInvSel(v){invSel=v;}
function setRefreshHud(v){refreshHud=v;}

/* Points de mutation exposés : ces variables sont écrites depuis d'autres
   modules, ce qu'une portée globale unique autorisait en silence. */

/* Aides de TEST, rendues à leur propriétaire.                     (Phase 5)
   Elles vivaient dans un autre module que la variable qu'elles écrivent —
   ce qu'une portée globale unique autorisait sans le dire. */
function setMaxAct(v){maxAct=v;}   /* pour les tests */



