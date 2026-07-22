# Registre des activités de traitement — TryCast

> Article 30 du RGPD. L'exemption « moins de 250 salariés » ne s'applique pas ici : les
> traitements sont réguliers et non occasionnels. Ce registre doit être tenu à jour et
> présenté à la CNIL si elle le demande.

**Responsable du traitement** : l'éditeur de TryCast, joignable à `contact@trycast.fr`.
**Délégué à la protection des données** : aucun (non requis — pas de suivi à grande échelle,
pas de données sensibles).
**Dernière mise à jour** : 22 juillet 2026.

Documents liés : [sous-traitants.md](sous-traitants.md), [procedure-droits.md](procedure-droits.md),
[fiches-stores.md](fiches-stores.md). Version publique : `web/src/pages/confidentialite.astro`.

---

## 1. Gestion des comptes utilisateurs

| | |
|---|---|
| **Finalité** | Créer et gérer un compte, authentifier l'utilisateur, lui permettre de se faire reconnaître par ses amis |
| **Base légale** | Exécution du contrat (CGU) — art. 6.1.b |
| **Personnes concernées** | Utilisateurs de l'application (≥ 15 ans) |
| **Catégories de données** | Adresse e-mail, mot de passe (haché, jamais en clair), pseudo, photo de profil (facultative), langue, dates de création et de dernière connexion |
| **Où** | `auth.users` (Supabase Auth), `public.profiles`, bucket Storage `avatars` |
| **Destinataires** | Supabase (hébergement), Resend (e-mails de compte). Le pseudo et la photo sont visibles des autres membres des ligues rejointes ; l'e-mail ne l'est jamais |
| **Transferts hors UE** | Aucun |
| **Conservation** | Durée de vie du compte ; suppression immédiate et définitive à la demande de l'utilisateur ; suppression automatique après 3 ans d'inactivité (préavis par e-mail) |
| **Sécurité** | RLS PostgreSQL (chaque compte ne lit/écrit que ses lignes), TLS, mot de passe haché par GoTrue, suppression via Edge Function `delete-account` qui purge aussi le dossier avatar |

## 2. Jeu : pronostics, points et classements

| | |
|---|---|
| **Finalité** | Enregistrer les pronostics, calculer les points, établir les classements des ligues |
| **Base légale** | Exécution du contrat — art. 6.1.b |
| **Personnes concernées** | Utilisateurs de l'application |
| **Catégories de données** | Pronostics (scores et bonus prédits), points obtenus et leur détail, appartenance aux ligues, rôle dans la ligue, totaux et statistiques de classement |
| **Où** | `public.predictions`, `public.league_members`, `public.leagues`, `public.standings` |
| **Destinataires** | Supabase. Les pronostics d'un joueur deviennent visibles des autres membres de ses ligues **après le coup d'envoi** du match (règle imposée par RLS, pas par le client) |
| **Transferts hors UE** | Aucun |
| **Conservation** | Durée de vie du compte (cascade à la suppression) |
| **Sécurité** | RLS, deadline au coup d'envoi appliquée côté serveur, écriture des scores par une RPC unique et atomique |

## 3. Notifications push

| | |
|---|---|
| **Finalité** | Envoyer les rappels avant un match et les résultats une fois les points calculés |
| **Base légale** | Consentement — art. 6.1.a (activation explicite dans les réglages, retirable à tout moment) |
| **Personnes concernées** | Utilisateurs ayant activé les notifications |
| **Catégories de données** | Jeton de notification de l'appareil, plateforme (iOS/Android), préférences par type de notification, journal des envois (destinataire, match, type, statut) |
| **Où** | `public.push_tokens`, `public.notification_prefs`, `public.notification_sends` |
| **Destinataires** | Supabase, **Expo Push Service**, puis **Google (FCM)** ou **Apple (APNs)** selon la plateforme — passage imposé par les systèmes d'exploitation mobiles |
| **Transferts hors UE** | Oui, vers Expo, Google et Apple (États-Unis) — encadrés par les clauses contractuelles types et/ou le Data Privacy Framework |
| **Conservation** | Jeton supprimé dès la désactivation des notifications ou la déconnexion ; journal des envois conservé le temps nécessaire à la déduplication et au suivi des accusés de réception |
| **Sécurité** | Le jeton n'est **jamais** inclus dans l'export de données (secret d'appareil) — seules la plateforme et les dates le sont |

## 4. Communications produit

| | |
|---|---|
| **Finalité** | Informer par e-mail des nouveautés et de l'actualité du produit |
| **Base légale** | Consentement — art. 6.1.a |
| **Personnes concernées** | Utilisateurs ayant activé le réglage « Communications » |
| **Catégories de données** | Adresse e-mail, état du consentement et date de recueil |
| **Où** | `public.consents` (table append-only : chaque changement crée une ligne, l'historique est immuable) |
| **Destinataires** | Supabase, Resend |
| **Transferts hors UE** | Aucun (Resend région UE, Irlande) |
| **Conservation** | Durée de vie du compte ; l'historique des consentements est conservé comme preuve tant que le compte existe |
| **Sécurité** | RLS own-rows, aucun droit d'`update`/`delete` côté client |

## 5. Liste d'attente de la beta (site vitrine)

| | |
|---|---|
| **Finalité** | Prévenir les personnes intéressées de l'ouverture de l'application |
| **Base légale** | Consentement — art. 6.1.a |
| **Personnes concernées** | Visiteurs du site trycast.fr |
| **Catégories de données** | Adresse e-mail |
| **Où** | `public.waitlist_signups` (aucune policy RLS : la table n'est lisible par aucun client, seule la RPC `join_waitlist` y écrit) |
| **Destinataires** | Supabase, Vercel (hébergement du formulaire) |
| **Transferts hors UE** | Vercel (États-Unis), encadré par les clauses contractuelles types |
| **Conservation** | Jusqu'au lancement de l'application, puis 6 mois au plus |
| **Sécurité** | Écriture exclusivement par RPC `security definer` ; refus toujours silencieux (aucune énumération d'adresses possible) |

## 6. Protection du formulaire contre les abus

| | |
|---|---|
| **Finalité** | Limiter le nombre d'inscriptions par visiteur et par heure, protéger les quotas d'envoi |
| **Base légale** | Intérêt légitime — art. 6.1.f (sécurité du service ; impact minimal, données non identifiantes) |
| **Personnes concernées** | Visiteurs du site |
| **Catégories de données** | Empreinte SHA-256 de l'adresse IP, salée avec une clé aléatoire tirée chaque jour. **Aucune IP en clair n'est stockée** |
| **Où** | `public.waitlist_attempts`, `public.waitlist_salts` |
| **Destinataires** | Supabase |
| **Transferts hors UE** | Aucun |
| **Conservation** | 24 heures maximum (purge à chaque appel). Le sel est détruit avec les tentatives, ce qui rend l'empreinte non vérifiable a posteriori |
| **Sécurité** | Tables sans policy RLS ni grant : illisibles par tout client. Vérifié par `scripts/e2e-waitlist.sql` et `scripts/e2e-privacy.sh` |

## 7. Support et exercice des droits

| | |
|---|---|
| **Finalité** | Répondre aux demandes reçues à `contact@trycast.fr` (questions, droits RGPD) |
| **Base légale** | Obligation légale (art. 6.1.c) pour les demandes de droits ; intérêt légitime pour le support courant |
| **Personnes concernées** | Toute personne écrivant à l'adresse de contact |
| **Catégories de données** | Adresse e-mail et contenu du message |
| **Où** | Boîte e-mail `contact@trycast.fr` |
| **Destinataires** | Fournisseur de la boîte e-mail |
| **Conservation** | 1 an après la clôture de la demande (3 ans pour les demandes d'exercice de droits, comme preuve de traitement) |

---

## Ce qui n'est pas traité

À la date de ce registre, TryCast **ne met en œuvre aucun** des traitements suivants :
mesure d'audience ou analytics, collecte de rapports de plantage, profilage, décision
automatisée, publicité, géolocalisation, accès au carnet d'adresses, données sensibles au
sens de l'article 9.

L'ajout d'une mesure d'audience (Aptabase, EU) et d'un outil de suivi des plantages
(Sentry, région EU) est prévu : **ce registre et la politique de confidentialité doivent
être mis à jour avant leur mise en service**, pas après.

## Journaux techniques

Supabase et Vercel produisent des journaux d'exploitation (requêtes, erreurs) pouvant
contenir des adresses IP, conservés selon les durées de rétention de ces plateformes. Ces
journaux ne sont pas exploités à des fins d'analyse du comportement des utilisateurs.
