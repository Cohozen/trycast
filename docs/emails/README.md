# E-mails de la beta (broadcasts Resend)

Ces fichiers sont **générés** par `scripts/build-email-templates.mjs`, comme les templates
d'auth : ne jamais les éditer à la main, modifier le générateur puis `npm run emails:build`.
Ils ne passent pas par Supabase : on importe le HTML dans Resend et on l'envoie en broadcast.

| Fichier | Objet | Quand |
|---|---|---|
| `beta-invite.html` | La beta TryCast est ouverte | À l'ouverture du test fermé, puis à chaque nouvelle vague de testeurs |
| `beta-league.local.html` | La ligue des testeurs t'attend | Quelques jours après, une fois l'app installée |

L'objet et le texte d'aperçu vivent dans le générateur (`BETA_INVITE`, `betaLeague`) : les
recopier dans Resend, qui ne les lit pas dans le HTML.

## L'e-mail de la ligue n'est pas versionné

Le dépôt est public et le code donne accès à la ligue. Le fichier s'écrit à la demande et
reste ignoré par git :

```bash
node scripts/build-email-templates.mjs --league-code ABCD2345
```

## Avant d'envoyer

1. **Lien Play** : comparer `PLAY_TESTING_URL` du générateur au lien d'inscription de la console
   (Tests fermés → Testeurs).
2. **Liste de testeurs Play** : chaque destinataire doit y figurer avec l'adresse de **son compte
   Google**, qui peut différer de celle qui reçoit l'e-mail.
3. **Audience Resend** : importer les adresses depuis un CSV gardé hors du dépôt.
4. **Expéditeur** : `TryCast <contact@trycast.fr>`, pour que les réponses arrivent dans la boîte.
5. **Envoi test** à sa propre adresse : vérifier le bouton, le lien de secours et « Ne plus
   recevoir ces e-mails » (`{{{RESEND_UNSUBSCRIBE_URL}}}`, remplacé par Resend à l'envoi).

À la fin de la beta, **supprimer l'Audience** dans Resend (registre des traitements, §10).
