# Les cinématiques

Pose les `.mp4` **ici**, dans `src/videos/`. Le build les emporte tout seul
vers les trois cibles — PC, Android et iOS. Ne les pose jamais directement
dans un paquet livré : `construire.js` efface `LeDernierOutlaw-PC/` à chaque
passage, et le fichier disparaîtrait sans un mot.

| cinématique | fichier | quand elle se joue |
|---|---|---|
| la bascule | `bascule.mp4` ✅ **livrée** | fin du mode Normal, juste après le Green Falcon |

## Le format, et il n'y a pas d'alternative

**H.264 / AAC en MP4.** iOS ne lit ni WebM, ni VP9, ni AV1 — une cinématique
dans un autre format ne s'affichera nulle part sur iPhone, **sans message**.

```sh
ffmpeg -i source.mp4 -map 0:v:0 -map 0:a:0 \
  -c:v libx264 -profile:v high -level 4.0 -preset slow \
  -b:v 2500k -maxrate 2500k -bufsize 5000k -pix_fmt yuv420p \
  -c:a aac -b:a 128k -ac 2 -movflags +faststart sortie.mp4
```

Chaque morceau de cette ligne paie sa place :

- `-map 0:v:0 -map 0:a:0` — **ne garde que la vidéo et le son.** Le
  `fin-normal.mp4` d'origine portait un **troisième flux mjpeg**, une vignette
  embarquée : poids mort, et certains décodeurs du socle butent sur un flux
  vidéo supplémentaire ;
- `-pix_fmt yuv420p` — sans lui, un rendu en 4:2:2 ou 4:4:4 reste **noir** sur
  le socle ;
- `+faststart` — place l'index en tête, sinon la lecture ne démarre qu'une fois
  le fichier entièrement lu ;
- `-b:v 2500k -maxrate` — le plafond de débit. Voir juste en dessous.

## Le débit : mesuré, pas choisi

`fin-normal.mp4` arrivait à **26,3 Mo pour 15 s**, soit 14,7 Mbit/s. Réencodé
à trois débits, avec la fidélité à l'original mesurée en SSIM :

| débit | poids | SSIM |
|---|---|---|
| 1500 kbit/s | 2,8 Mo | 0,9893 |
| **2500 kbit/s** | **4,5 Mo** | **0,9930** ← retenu |
| 4000 kbit/s | 7,1 Mo | 0,9953 |

Au-delà de 2500, chaque mégaoctet achète de moins en moins. Un débruitage
préalable ne sert à rien ici : ce n'est pas du grain, c'est du détail réel
(essayé, 13,2 Mo).

`test_video` refuse toute cinématique de plus de **8 Mo**.

## Ce que le jeu garantit

- **Un fichier absent ne casse rien.** La cinématique est sautée et la suite
  s'enchaîne, exactement comme si elle n'existait pas.
- **On peut toujours passer** — au doigt comme au clavier, dès la première
  image.
- **Le son est tenté, puis on recule.** La balise porte `muted` dans le HTML
  (bon défaut si le script ne tourne pas), mais le module tente la lecture
  **avec le son** : la bascule arrive après le coup qui abat le gardien final,
  donc après un geste du joueur — la condition exacte que les navigateurs
  exigent. Si c'est refusé : repli muet, puis abandon propre. Jamais d'écran
  noir.
- **Rien n'est préchargé** : zéro octet lu tant qu'aucune scène ne la demande.

## Vérifier une nouvelle cinématique

```sh
node _outils/essai_video.js
```

Elle est ouverte dans un **vrai Chrome** et on regarde ce qui se passe
vraiment : source résolue, décodage, dimensions, temps qui avance, son
autorisé ou non, saut, et appel unique de la suite.
