# Sous-traitants et destinataires — TryCast

> Article 28 du RGPD : chaque sous-traitant doit être lié par un contrat (DPA) et offrir des
> garanties suffisantes. Cette liste doit rester alignée avec le §4 de
> `web/src/pages/confidentialite.astro` : **toute ligne ajoutée ici doit l'être là aussi**.

**Dernière mise à jour** : 22 juillet 2026.

| Prestataire | Rôle | Données confiées | Localisation | Transfert hors UE |
|---|---|---|---|---|
| **Supabase** | Base de données, authentification, stockage des photos, Edge Functions | L'ensemble des données de compte et de jeu | UE — AWS eu-west-3 (Paris) | Non |
| **Vercel** | Hébergement du site vitrine et du formulaire de liste d'attente | E-mails de la liste d'attente (en transit), journaux d'accès | États-Unis (edge mondial) | Oui — clauses contractuelles types |
| **Resend** | Acheminement des e-mails transactionnels (confirmation, réinitialisation, changement d'adresse) | Adresse e-mail, contenu de l'e-mail | UE — Irlande (`feedback-smtp.eu-west-1`) | Non |
| **Expo** | Passerelle d'envoi des notifications push | Jeton d'appareil, titre et corps de la notification | États-Unis | Oui |
| **Google (Firebase Cloud Messaging)** | Livraison des notifications sur Android | Jeton d'appareil, contenu de la notification | États-Unis | Oui |
| **Apple (APNs)** | Livraison des notifications sur iOS *(pas encore actif — iOS différé)* | Jeton d'appareil, contenu de la notification | États-Unis | Oui |
| **Highlightly** | Fournisseur de calendriers, résultats et cotes | **Aucune donnée personnelle** — les appels ne portent que sur des matchs | — | Sans objet |

## Points de vigilance

- **Expo / FCM / APNs sont incontournables** : sur mobile, aucune notification ne peut
  atteindre un téléphone sans passer par le service de push de la plateforme. C'est la
  raison pour laquelle les notifications reposent sur le **consentement** et restent
  entièrement désactivables.
- **Vercel est le seul transfert hors UE évitable** à terme (un hébergeur européen pour un
  site statique serait un substitut direct). Aujourd'hui, il ne voit passer que les e-mails
  de la liste d'attente et les journaux d'accès du site vitrine.
- **Highlightly n'est pas un sous-traitant** au sens de l'article 28 : aucune donnée
  personnelle ne lui est transmise. Il figure dans cette liste pour mémoire.
- Les **DPA** de Supabase, Vercel, Resend et Expo sont accessibles depuis leurs pages
  légales respectives et sont acceptés à l'ouverture du compte prestataire. À conserver
  hors du dépôt (ils ne contiennent rien de secret, mais n'ont pas leur place ici).

## À faire avant l'ouverture au public

- [ ] Créer la boîte `contact@trycast.fr` et noter ici son fournisseur (il devient
      sous-traitant du traitement « support », cf. registre §7).
- [ ] Si Aptabase et Sentry sont mis en service, les ajouter à ce tableau **et** au §4 de
      la politique de confidentialité **avant** le premier envoi de données.
