# Sous-traitants et destinataires — TryCast

> Article 28 du RGPD : chaque sous-traitant doit être lié par un contrat (DPA) et offrir des
> garanties suffisantes. Cette liste doit rester alignée avec le §4 de
> `web/src/pages/confidentialite.astro` : **toute ligne ajoutée ici doit l'être là aussi**.

**Dernière mise à jour** : 23 juillet 2026.

| Prestataire | Rôle | Données confiées | Localisation | Transfert hors UE |
|---|---|---|---|---|
| **Supabase** | Base de données, authentification, stockage des photos, Edge Functions | L'ensemble des données de compte et de jeu | UE — AWS eu-west-3 (Paris) | Non |
| **Vercel** | Hébergement du site vitrine et du formulaire de liste d'attente | E-mails de la liste d'attente (en transit), journaux d'accès | États-Unis (edge mondial) | Oui — clauses contractuelles types |
| **Resend** | Acheminement des e-mails transactionnels (confirmation, réinitialisation, changement d'adresse) | Adresse e-mail, contenu de l'e-mail | UE — Irlande (`feedback-smtp.eu-west-1`) | Non |
| **Expo** | Passerelle d'envoi des notifications push | Jeton d'appareil, titre et corps de la notification | États-Unis | Oui |
| **Google (Firebase Cloud Messaging)** | Livraison des notifications sur Android | Jeton d'appareil, contenu de la notification | États-Unis | Oui |
| **Google (Sign in with Google)** | Fournisseur d'identité, au choix de l'utilisateur | Adresse e-mail, identifiant de compte Google, nom et photo du compte Google. Google sait qu'un de ses comptes se connecte à TryCast | États-Unis | Oui — Data Privacy Framework / clauses contractuelles types |
| **Apple (APNs)** | Livraison des notifications sur iOS *(pas encore actif — iOS différé)* | Jeton d'appareil, contenu de la notification | États-Unis | Oui |
| **Aptabase** | Mesure d'usage de l'application | Événements de parcours nommés, version de l'app, système d'exploitation. **Aucun identifiant** | UE (région encodée dans la clé `A-EU-…`) | Non |
| **Sentry** | Rapports de plantage | Pile d'appel, modèle d'appareil, versions, fil d'Ariane des écrans | UE — Francfort (`ingest.de.sentry.io`) | Non |
| **Highlightly** | Fournisseur de calendriers, résultats et cotes | **Aucune donnée personnelle** — les appels ne portent que sur des matchs | — | Sans objet |

## Points de vigilance

- **Expo / FCM / APNs sont incontournables** : sur mobile, aucune notification ne peut
  atteindre un téléphone sans passer par le service de push de la plateforme. C'est la
  raison pour laquelle les notifications reposent sur le **consentement** et restent
  entièrement désactivables.
- **Sign in with Google n'est pas un sous-traitant** au sens de l'article 28 : Google agit
  ici comme **responsable de traitement distinct** (il authentifie ses propres utilisateurs
  selon sa propre politique). Il figure dans ce tableau comme destinataire. Deux
  conséquences pratiques : le transfert est **entièrement évitable par l'utilisateur** — la
  création de compte par e-mail + mot de passe reste offerte et de premier plan —, et
  aucune donnée de jeu (pronostics, ligues, classements) ne lui est transmise.
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
- [x] ~~Ajouter Aptabase et Sentry~~ → fait le 22 juillet 2026, avant leur mise en service.

## Le cas d'Aptabase et de Sentry

Les deux ont été retenus **pour leur région** : Aptabase encode l'UE dans la clé
d'application, Sentry impose de choisir la résidence des données à la création de
l'organisation — **ce choix est définitif**, il ne se change pas après coup. Recréer
l'organisation ailleurs invaliderait les deux lignes ci-dessus.

Aptabase ne pose pas d'identifiant d'appareil et fait tourner son sel chaque jour : ses
événements ne sont rattachables à personne, ce qui le sort du champ des traceurs soumis à
consentement. Sentry, lui, voit des piles d'appel : c'est la raison du `sendDefaultPii:
false` et de l'absence totale de `setUser`.
