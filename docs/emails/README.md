# E-mails de la beta (broadcasts Resend)

Ces fichiers sont **générés** par `scripts/build-email-templates.mjs`, comme les templates
d'auth : ne jamais les éditer à la main, modifier le générateur puis `npm run emails:build`.
Ils ne passent pas par Supabase : on importe le HTML dans Resend et on l'envoie en broadcast.

| Fichier | Objet | Quand |
|---|---|---|
| `beta-invite.local.html` | La beta TryCast est ouverte | À l'ouverture du test fermé, puis à chaque nouvelle vague de testeurs |
| `beta-league.local.html` | La ligue des testeurs t'attend | Quelques jours après, une fois l'app installée |

L'objet et le texte d'aperçu vivent dans le générateur (`betaInvite`, `betaLeague`) : les
recopier dans Resend, qui ne les lit pas dans le HTML.

## Aucun des deux n'est versionné

Le dépôt est public. Le lien public TestFlight laisse entrer n'importe qui jusqu'au plafond du
groupe, et le code de la ligue ouvre la ligue à qui le lit. Les fichiers s'écrivent à la demande
et restent ignorés par git (`docs/emails/*.local.html`) ; les deux options se combinent :

```bash
node scripts/build-email-templates.mjs --testflight https://testflight.apple.com/join/XXXXXXXX --league-code ABCD2345
```

## Un seul e-mail pour iPhone et Android

L'invitation porte deux boutons côte à côte (« Sur iPhone », « Sur Android ») et les étapes de
chaque téléphone : une seule Audience, pas de liste à couper en deux. Le lien Play ne sert
qu'aux comptes Google de la liste des testeurs ; un iPhoniste qui l'ouvre ne casse rien. Les
testeurs iPhone ne comptent pas dans les 12 exigés par Google.

## Avant d'envoyer

1. **Lien TestFlight** : App Store Connect → TestFlight → groupe externe → lien public, activé
   avec un **plafond** de testeurs. Il n'existe qu'une fois le premier build accepté par la
   Beta App Review.
2. **Lien Play** : comparer `PLAY_TESTING_URL` du générateur au lien d'inscription de la console
   (Tests fermés → Testeurs).
3. **Liste de testeurs Play** : chaque testeur **Android** doit y figurer avec l'adresse de **son
   compte Google**, qui peut différer de celle qui reçoit l'e-mail. Rien à faire pour iPhone.
4. **Audience Resend** : importer les adresses depuis un CSV gardé hors du dépôt.
5. **Expéditeur** : `TryCast <contact@trycast.fr>`, pour que les réponses arrivent dans la boîte.
6. **Envoi test** à sa propre adresse : vérifier les deux boutons, les liens de secours et « Ne
   plus recevoir ces e-mails » (`{{{RESEND_UNSUBSCRIBE_URL}}}`, remplacé par Resend à l'envoi).

À la fin de la beta, **supprimer l'Audience** dans Resend et **désactiver le lien public**
TestFlight (registre des traitements, §10).

## TestFlight : les « Informations de test »

C'est ce que le testeur lit dans l'app TestFlight. À coller en français dans App Store Connect →
TestFlight → Informations de test (et « Ce qu'il faut tester » de chaque build).

**Description de la beta**

> TryCast, c'est l'app de pronostics rugby entre potes : tu pronostiques le score exact et le
> bonus offensif de chaque match, tu marques des points selon ta précision, et tu te mesures à
> tes amis dans des ligues privées. Gratuit, sans mise ni gain.

**Ce qu'il faut tester**

> Merci de tester TryCast !
> - Crée ton compte (Apple, Google ou e-mail) et choisis ton pseudo.
> - Pronostique les prochains matchs avant le coup d'envoi.
> - Crée une ligue ou rejoins celle des testeurs, et invite des amis avec le lien.
> - Active les notifications : rappel avant les matchs, résultats.
>
> Un bug, une idée ? Passe par Réglages > Signaler un problème dans l'app, ou réponds à l'e-mail
> d'invitation. Merci de ne pas utiliser le retour TestFlight : on le lit moins vite.
