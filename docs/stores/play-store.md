# Fiche Google Play — TryCast

> Tout ce qui se recopie dans la Play Console, avec les réponses aux questionnaires
> et l'ordre dans lequel les remplir. Complète `docs/rgpd/fiches-stores.md`, qui
> porte les déclarations de confidentialité (Data Safety / Nutrition Labels).
>
> **Dernière mise à jour** : 3 septembre 2026 — cible : **test interne**, puis test
> fermé calé sur la reprise de la compétition.

## Décisions de fiche

| Champ | Valeur | Pourquoi |
|---|---|---|
| Type | **Application**, pas Jeu | Le cœur est un service autour de matchs réels, pas du gameplay. Classer en Jeu change le questionnaire de classification et la concurrence de la catégorie |
| Catégorie | **Sports** | |
| Contient des annonces | **Non** | |
| Achats intégrés | **Non** | |
| Prix | **Gratuit** | Irréversible : une app gratuite ne peut jamais devenir payante |

⚠️ **Le passage gratuit → payant est définitif chez Google.** Un modèle payant, si jamais
il arrive, se fera par achat intégré, pas par le prix de l'app.

---

## Textes à recopier

Longueurs vérifiées : Play refuse le dépassement sans négocier.

### Titre — 30 caractères max
```
TryCast — Pronos Rugby
```
22 caractères. Version EN (`TryCast — Rugby Predictions`, 27) si tu ajoutes la fiche anglaise.

Pas d'emoji, pas de superlatif, pas de « n°1 » ni de « gratuit » dans le titre : Google
rejette le texte promotionnel dans les métadonnées.

### Description courte — 80 caractères max
```
Pronos rugby entre potes : score exact, essais, bonus. Sans argent réel.
```
72 caractères. C'est la ligne qui s'affiche sous le titre dans les résultats de recherche :
elle doit tenir debout seule.

EN (73) :
```
Rugby predictions with friends: exact score, tries, bonus. No real money.
```

### Description complète — 4000 caractères max

```
Tente ton essai.

TryCast est l'appli de pronostics pensée pour le rugby, à jouer entre amis. Pas de mise, pas d'argent réel : juste la fierté d'avoir vu juste avant tout le monde.

PENSÉ POUR LE RUGBY, PAS DU FOOT RECYCLÉ
Tu ne pronostiques pas un simple vainqueur. Tu annonces le score exact, tu dis qui prendra le bonus offensif, tu tentes le nombre d'essais. Les vraies règles du jeu, celles dont on débat au troisième mi-temps.

DES POINTS QUI RÉCOMPENSENT L'AUDACE
Les cotes sont intégrées au barème : plus ton prono est risqué et juste, plus il rapporte. Annoncer la victoire du favori ne vaudra jamais autant que d'avoir senti l'exploit.

TES LIGUES, TES POTES
Crée ta ligue privée, invite qui tu veux avec un code. Votre classement, votre saison, vos règlements de comptes. Un même pronostic compte dans toutes tes ligues : tu joues une fois, tu concours partout.

TU NE RATES PLUS UN COUP D'ENVOI
Un rappel avant chaque match que tu n'as pas encore pronostiqué, et le résultat dès que les points tombent. Tu choisis ce que tu veux recevoir, ou rien du tout.

LE CLASSEMENT EN DIRECT
Suis ta place au fil des matchs, dans ta ligue et au général. Les points se calculent tout seuls dès la fin de la rencontre.

GRATUIT, ET QUI LE RESTE
Zéro mise. Zéro argent réel. Zéro publicité. Zéro pub déguisée. TryCast est un projet indépendant, fait par un passionné de rugby pour ses potes — et maintenant pour toi.

CE QUE TRYCAST N'EST PAS
Ce n'est pas un site de paris. On n'y dépose pas d'argent, on n'en gagne pas, et il n'y a rien à retirer. Les cotes affichées servent uniquement à pondérer les points du jeu.

RESPECT DE TA VIE PRIVÉE
Pas de publicité, pas de revente de données, pas de traceur publicitaire. La mesure d'usage et les rapports de plantage sont anonymes et se coupent dans les réglages. Tu peux exporter tes données ou supprimer ton compte depuis l'application, en deux touches.

COMPÉTITIONS
Nations Championship, Tournoi des Six Nations, et la route vers la Coupe du Monde 2027.

Des questions, une idée, un bug ? contact@trycast.fr
```

### Nouveautés de cette version — 500 caractères max
```
Première version de test. Merci de la faire tourner !

Tout y est : pronos au score exact avec bonus offensif, ligues privées par code d'invitation, classements en direct, rappels avant les coups d'envoi et connexion avec Google.

Ce qu'on cherche à savoir : est-ce que le parcours est clair sans explication, est-ce que les notifications tombent au bon moment, et est-ce que quelque chose casse sur ton téléphone.

Écris-moi à contact@trycast.fr — même pour dire que tout va bien.
```

---

## Visuels

Formats imposés. Ne pas improviser : un mauvais format bloque la publication.

| Élément | Format | Contrainte |
|---|---|---|
| Icône | **512 × 512** PNG 32 bits | ≤ 1 Mo. Pas de coins arrondis à dessiner soi-même, Play les applique |
| Bannière | **1024 × 500** PNG 24 bits ou JPEG | ≤ 15 Mo, **aucune transparence**. Ni capture d'écran, ni texte en petit — elle est recadrée selon les surfaces |
| Captures téléphone | 2 minimum, **4 à 6 recommandé** | PNG ou JPEG, côté entre 320 et 3840 px, ratio 16:9 ou 9:16, ≤ 8 Mo chacune |

### Captures

**Émulateur disponible depuis le 2026-09-03** : l'AVD `Pixel_10_Pro` d'Android Studio est
piloté par `adb`, écran **1280 × 2856**. Boucle vérifiée de bout en bout — démarrage,
installation de l'APK, Metro, `adb exec-out screencap`. Je peux donc capturer moi-même.

Deux conditions, apprises en essayant :

- **Pas depuis le dev client.** Le menu développeur d'`expo-dev-client` se dessine
  par-dessus l'app (bouton flottant, panneau au lancement) et se retrouverait sur les
  captures du store. Il faut un build **`preview` ou `production`**, où il n'existe pas.
- **Locale de l'émulateur en français.** Il démarre en anglais et l'app suit la langue
  système : les captures sortiraient en anglais pour une fiche française. Soit régler la
  langue du système Android, soit forcer Français dans Réglages → Langue.

Les 5 écrans qui vendent le mieux, dans cet ordre :

1. **Matchs** avec un prono en cours de saisie — c'est le geste central de l'app
2. **Classement d'une ligue** avec plusieurs joueurs — c'est le ressort social
3. **Détail d'un match** avec les points potentiels affichés — c'est ce qui distingue TryCast
4. **Résultats** après une journée jouée — la récompense
5. **Une notification** de rappel sur l'écran verrouillé

Capture en **thème sombre** : c'est là que le design system est le plus flatteur. Le compte
de démonstration créé par `scripts/seed-demo-account.mjs` donne des écrans peuplés — ligue à
trois membres, classement non vide — sans exposer de pseudo réel.

---

## Questionnaire de classification (IARC)

**Réponds à chaque question littéralement.** Le classement obtenu importe moins que la
sincérité : une réponse fausse est un motif de retrait, y compris après publication.

| Question | Réponse |
|---|---|
| Violence, sang, blessures | Non |
| Contenu sexuel, nudité | Non |
| Langage grossier | Non |
| Drogues, alcool, tabac | Non |
| Contenu effrayant | Non |
| **Jeux d'argent réel** | **Non** |
| **Jeu d'argent simulé** | **Non** — voir ci-dessous |
| Interaction entre utilisateurs | **Oui** (pseudos, ligues, classements) |
| Partage de position | Non |
| Partage d'informations personnelles avec des tiers | Non |
| Achats numériques | Non |

### Le point « jeu d'argent simulé » — à comprendre avant de cliquer

C'est la seule question qui demande à réfléchir, parce que TryCast affiche des **cotes** et
emploie le vocabulaire du pronostic.

L'IARC vise par « jeu d'argent simulé » les jeux qui **reproduisent la mécanique du pari** :
une mise, une cagnotte, un gain. TryCast n'en a aucune — pas de solde, pas de mise engagée,
pas de gain à retirer, rien à perdre. Les cotes ne sont pas un pari, ce sont un **coefficient
de barème** : elles servent à donner plus de points à un pronostic improbable et juste.

D'où le **Non**. Mais deux garde-fous :

- Si une question porte précisément sur l'**affichage de cotes de paris**, réponds **oui** :
  c'est factuellement le cas.
- En cas de doute réel sur une formulation, **réponds oui et accepte le classement d'âge
  plus élevé**. Un classement 18+ coûte de la visibilité ; une fausse déclaration coûte l'app.

Garde ce raisonnement écrit : s'il faut un jour le défendre auprès de Google, il est ici.

---

## Public cible et contenu

**Tranché le 3 septembre 2026 : cocher 16-17 et 18+.**

Play demande de cocher des tranches d'âge : moins de 5, 6-8, 9-12, 13-15, 16-17, 18+.
Cocher **13-15** ferait entrer TryCast dans le **programme Familles** de Google — obligations
supplémentaires, revue plus stricte, exigences de conception pour enfants. Ce n'est pas ce que
le produit est.

L'âge minimum est donc passé de 15 à **16 ans** dans la politique de confidentialité (§7) et
les CGU, mises à jour le même jour.

⚠️ **La justification a dû être réécrite, pas seulement le chiffre.** Le texte disait « 15 ans,
âge à partir duquel un mineur peut consentir seul au traitement de ses données en France » —
c'est exact, la France a fixé ce seuil à 15 ans. Écrire « 16 ans » derrière cette phrase
l'aurait rendue fausse. La politique dit maintenant que les 16 ans sont un **choix de
l'éditeur, plus strict que la loi française**, aligné sur le seuil par défaut du RGPD et sur la
tranche déclarée aux stores.

## Accès à l'application

L'app **exige une connexion** : Google demande un compte de démonstration, sans quoi le
relecteur voit un écran de login et rejette pour « impossible d'évaluer ».

À créer **sur la prod**, avec des données présentables (un pseudo neutre, quelques pronos, une
ligue avec deux ou trois membres factices) :

```
Identifiant : demo@trycast.fr
Mot de passe : (à définir, à noter dans ton gestionnaire)
```

Instructions à joindre dans le champ prévu :
> Connexion par e-mail et mot de passe. Le bouton « Continuer avec Google » est une
> alternative et n'est pas nécessaire pour évaluer l'application. Les pronostics se
> saisissent depuis l'onglet Matchs ; le classement est dans l'onglet Classement.

---

## Sécurité des données

Déjà rédigé, à recopier tel quel : [../rgpd/fiches-stores.md](../rgpd/fiches-stores.md).

URL à fournir :
- Politique de confidentialité : `https://www.trycast.fr/confidentialite`
- **Suppression des données : `https://www.trycast.fr/suppression-compte`**

⚠️ La seconde n'existe en ligne **qu'après le déploiement du site**. La renseigner avant
donne une URL en 404 et un rejet.

---

## Pays de distribution

Pour un test fermé, restreindre plutôt qu'ouvrir : **France**, plus Belgique, Suisse,
Luxembourg et Canada si tu as des testeurs francophones ailleurs. Élargir est trivial,
restreindre après coup l'est moins.

---

## Ordre de remplissage

Les écrans se débloquent les uns les autres — cet ordre évite les allers-retours.

1. **Créer l'application** — nom, langue par défaut (français), Application, Gratuit
2. **Fiche principale** — titre, descriptions, icône, bannière, captures
3. **Sécurité des données**
4. **Classification du contenu** (IARC)
5. **Public cible et contenu**
6. **Annonces** → Non · **Accès à l'application** → compte de démo
7. **Coordonnées** — `contact@trycast.fr`, site `https://www.trycast.fr`
8. **Test interne** — créer la liste de testeurs, s'y ajouter
9. **Téléverser le premier AAB** : `eas build -p android --profile production`
10. **Relever la SHA-1 de Play App Signing** → créer le 2ᵉ client OAuth Android

### Deux pièges connus

- **Le premier binaire se téléverse souvent à la main.** `eas submit` échoue tant que
  l'application n'a jamais reçu d'AAB par la console. Ne pas en conclure que la
  configuration est cassée.
- **La SHA-1 de Play App Signing n'existe qu'après** la création de l'app et le premier
  téléversement. Sans le 2ᵉ client OAuth Android portant cette empreinte, « Continuer avec
  Google » échoue en `DEVELOPER_ERROR` **uniquement sur le build distribué** — jamais sur ton
  dev build. C'est le genre de bug qu'on met une soirée à comprendre.

---

## Point ouvert : contenu généré par les utilisateurs

Déclarer « interaction entre utilisateurs » est exact — pseudos, noms de ligues, photos de
profil sont visibles des autres membres. Mais la politique UGC de Google attend en principe
un **moyen de signaler et de bloquer** un contenu ou un utilisateur, et **TryCast n'en a
aucun**.

Peu probable que ce soit bloquant pour un test fermé entre gens qui se connaissent. À traiter
**avant la production** : un signalement par e-mail depuis la fiche d'un joueur suffirait
probablement, mais c'est une fonctionnalité à écrire, donc à planifier — pas à découvrir dans
un refus de publication.
