# Déclarations de confidentialité des stores — TryCast

> Brouillon à recopier dans les consoles au moment de la soumission. Ces déclarations
> engagent : une réponse fausse est un motif de rejet, et de retrait après publication.
> Elles doivent rester cohérentes avec `web/src/pages/confidentialite.astro` et
> [registre-des-traitements.md](registre-des-traitements.md).

**Dernière mise à jour** : 22 juillet 2026 — état du produit : mesure d'usage anonyme
(Aptabase, UE) et rapports de plantage (Sentry, UE) actifs par défaut et désactivables dans
l'app ; **aucune publicité, aucun suivi publicitaire**.

## URL à fournir aux deux stores

- Politique de confidentialité : `https://trycast.fr/confidentialite`
- Conditions d'utilisation : `https://trycast.fr/cgu`
- Support : `contact@trycast.fr`

---

## Google Play — formulaire « Sécurité des données », écran par écran

> Ajouté le 3 septembre 2026 en remplissant le formulaire pour de vrai : la section
> suivante listait les *types* de données sans répondre aux questions telles que la
> console les pose. Les deux se complètent — celle-ci pour cliquer, celle-là pour
> comprendre.

### Écran 2 — Collecte des données et sécurité

| Question | Réponse |
|---|---|
| L'appli collecte-t-elle ou partage-t-elle un des types requis ? | **Oui** |
| Les données collectées sont-elles **toutes chiffrées lors du transfert** ? | **Oui** — HTTPS/TLS de bout en bout : Supabase (REST, Auth, Storage, Edge Functions), Expo Push puis FCM, Sentry, Aptabase. Aucun appel en clair dans le code |
| Méthodes de création de compte | ☑ **Nom d'utilisateur et mot de passe** · ☑ **OAuth** |
| Fournissez-vous un moyen de demander la suppression des données ? | **Oui** — `https://www.trycast.fr/suppression-compte` |

⚠️ **Ne pas cocher** « Nom d'utilisateur, mot de passe et autres méthodes
d'authentification » : cette ligne vise les comptes à second facteur. L'app n'en propose
aucun — vérifié, il n'existe aucune UI d'enrôlement MFA/TOTP dans `src/`, même si le
projet Supabase a le TOTP activé côté plateforme.

L'e-mail compte comme « nom d'utilisateur » : l'aide de la question le dit
explicitement (« Les noms d'utilisateur incluent les ID utilisateur, les adresses e-mail
et les numéros de téléphone »).

### Écran 3 — Types de données à cocher

| Catégorie | Type |
|---|---|
| Informations personnelles | Adresse e-mail · Nom d'utilisateur · Nom |
| Identifiants | Identifiants utilisateur · Identifiant d'appareil |
| Photos et vidéos | Photos |
| Contenu utilisateur | Autre contenu généré par l'utilisateur |
| Activité dans l'application | Interactions dans l'application · Autres actions |
| Diagnostics de l'application | Journaux de plantage · Autres données de diagnostic |

⚠️ **Comparer avec « Voir les types de données requis »** en haut de l'écran : Google
pré-signale ce qu'il a détecté dans le bundle. S'il annonce un type absent de cette liste
(une position approximative venue d'une dépendance, par exemple), ne pas l'ignorer — il
faut soit le déclarer, soit comprendre d'où il vient.

### Écran 4 — Utilisation et traitement, type par type

Pour chaque type cochée, la console demande quatre choses. Aucune donnée n'est
**partagée** (les prestataires techniques qui traitent pour notre compte — hébergeur,
passerelle de push, mesure — ne comptent pas comme un partage au sens du formulaire) et
aucune n'est **traitée de façon éphémère** (tout est stocké).

| Type | Collectée | Obligatoire ? | Finalités |
|---|---|---|---|
| Adresse e-mail | Oui | **Obligatoire** | Fonctionnalité de l'appli · Gestion du compte |
| Nom d'utilisateur | Oui | **Obligatoire** | Fonctionnalité de l'appli · Gestion du compte |
| Nom | Oui | Facultative | Fonctionnalité de l'appli |
| Identifiants utilisateur | Oui | **Obligatoire** | Fonctionnalité de l'appli · Gestion du compte |
| Identifiant d'appareil | Oui | Facultative | Fonctionnalité de l'appli |
| Photos | Oui | Facultative | Fonctionnalité de l'appli |
| Autre contenu généré (pronostics) | Oui | **Obligatoire** | Fonctionnalité de l'appli |
| Autres actions (points, classements) | Oui | **Obligatoire** | Fonctionnalité de l'appli |
| Interactions dans l'application | Oui | Facultative | **Analyse** |
| Journaux de plantage | Oui | Facultative | **Analyse** |
| Autres données de diagnostic | Oui | Facultative | **Analyse** |

**Comment lire « obligatoire »** : Google demande si l'utilisateur *peut refuser* la
collecte tout en utilisant l'app. E-mail, pseudo, identifiant et pronostics sont
indispensables au service, donc obligatoires. Le nom (transmis par Google), la photo de
profil, le jeton de push et les trois lignes de télémétrie se refusent sans empêcher de
jouer — donc facultatifs. Les trois dernières se coupent dans Réglages → Confidentialité.

**Le nom transmis par Google** n'est jamais affiché par l'app, mais Supabase Auth le
conserve tel que Google l'envoie : il quitte donc l'appareil, et Google demande de
déclarer ce qui est **collecté**, pas ce qui est **utilisé**.

⚠️ **Jamais la finalité « Publicité ou marketing »**, sur aucune ligne. L'app n'a ni
publicité ni traceur publicitaire, et cette déclaration est ce qui le rend opposable.

### Point relevé au passage : le bucket des avatars est public

`storage.buckets.avatars` a `public = true` : une URL d'avatar est lisible par quiconque
la possède, sans authentification. C'est le fonctionnement voulu (les avatars s'affichent
dans les classements) et ce n'est **pas** un « partage » au sens du formulaire. Mais c'est
à savoir : ces images ne sont pas privées, et la politique de confidentialité gagnerait à
le dire plutôt que de le laisser deviner.

---

## Google Play — formulaire « Sécurité des données »

**Questions générales**
- Les données sont-elles chiffrées en transit ? → **Oui** (HTTPS/TLS partout).
- Les utilisateurs peuvent-ils demander la suppression de leurs données ? → **Oui**, depuis
  l'application (Réglages → Supprimer mon compte) — fournir l'URL de la politique.
- L'app partage-t-elle des données avec des tiers ? → **Non** au sens du formulaire : les
  prestataires techniques (hébergeur, passerelle de push) ne comptent pas comme un partage.
- Données collectées à des fins publicitaires ou de suivi ? → **Non**.

**Types de données à déclarer** (collectées, non partagées) :

| Catégorie | Type | Obligatoire ? | Finalité |
|---|---|---|---|
| Informations personnelles | Adresse e-mail | Oui | Fonctionnalité de l'app, gestion du compte |
| Informations personnelles | Nom d'utilisateur (pseudo) | Oui | Fonctionnalité de l'app |
| Informations personnelles | Nom | Non | Fonctionnalité de l'app — transmis par Google avec « Continuer avec Google », jamais affiché |
| Identifiants | Identifiants utilisateur | Non | Fonctionnalité de l'app — identifiant de compte Google, comptes créés via Google uniquement |
| Photos et vidéos | Photos | Non | Fonctionnalité de l'app (photo de profil) |
| Contenu utilisateur | Autre contenu généré (pronostics) | Oui | Fonctionnalité de l'app |
| Identifiants | Identifiant d'appareil (jeton de push) | Non | Fonctionnalité de l'app (notifications) |
| Activité de l'app | Autres actions dans l'app (points, classements) | Oui | Fonctionnalité de l'app |
| Activité de l'app | Interactions dans l'app | Non | **Analytics** |
| Diagnostics de l'app | Journaux de plantage | Non | **Analytics** |
| Diagnostics de l'app | Diagnostics | Non | **Analytics** |

Les deux lignes « transmis par Google » ne concernent que les comptes créés avec « Continuer
avec Google » : Supabase Auth conserve ces métadonnées telles que Google les envoie, elles
sortent donc de l'appareil même si l'app ne les affiche jamais. Google demande de déclarer
ce qui est **collecté**, pas ce qui est **utilisé**.

Les trois dernières lignes correspondent à Aptabase et Sentry. Elles sont déclarées
**collectées mais non partagées**, facultatives (l'utilisateur peut les couper dans
Réglages → Confidentialité), et **jamais** avec la finalité « Publicité ou marketing ».

⚠️ Google demande de déclarer une donnée dès qu'elle **quitte l'appareil**, même anonyme :
c'est pourquoi Aptabase est déclaré malgré l'absence d'identifiant. Ne pas s'en dispenser
au motif que les événements ne sont rattachables à personne — le formulaire ne pose pas
cette question.

---

## App Store — « Confidentialité des données » (Nutrition Labels)

**Aucune donnée n'est utilisée pour le suivi** (« Tracking ») → répondre **Non** à la
question sur l'App Tracking Transparency. L'application n'a donc pas besoin de demander
l'autorisation de suivi.

**Données liées à l'utilisateur** (« Data Linked to You ») :

| Catégorie Apple | Détail | Finalité |
|---|---|---|
| Contact Info | Email Address | App Functionality |
| User Content | Photos or Videos | App Functionality |
| User Content | Other User Content (pronostics) | App Functionality |
| Identifiers | User ID | App Functionality |
| Usage Data | Product Interaction (points, classements) | App Functionality |

**Données non liées à l'utilisateur** (« Data Not Linked to You ») :

| Catégorie Apple | Détail | Finalité |
|---|---|---|
| Usage Data | Product Interaction | Analytics |
| Diagnostics | Crash Data | App Functionality |
| Diagnostics | Other Diagnostic Data | App Functionality |

Ces trois lignes sont bien en **« non liées »** : Aptabase ne pose aucun identifiant, et
Sentry n'attache aucun identifiant de compte (`sendDefaultPii: false`, jamais de
`setUser`). Si cela devait changer un jour, elles basculeraient en « liées ».

**Données utilisées pour le suivi** : aucune.

---

## Privacy manifest iOS (`PrivacyInfo.xcprivacy`)

Obligatoire pour toute soumission à l'App Store. Les paquets Expo embarquent déjà leur
propre manifeste, mais Apple ne parse pas toujours correctement ceux des dépendances
CocoaPods statiques : les « required reason APIs » doivent être redéclarées au niveau de
l'app.

**À appliquer au moment du premier build iOS, pas avant** : iOS est différé (pas de compte
Apple Developer) et toute modification d'`app.json` impose un rebuild du dev client — autant
le faire en une seule passe avec les autres réglages natifs.

Bloc à ajouter sous `expo.ios` dans `app.json` :

```json
"privacyManifests": {
    "NSPrivacyAccessedAPITypes": [
        {
            "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults",
            "NSPrivacyAccessedAPITypeReasons": ["CA92.1"]
        },
        {
            "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryFileTimestamp",
            "NSPrivacyAccessedAPITypeReasons": ["C617.1"]
        },
        {
            "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryDiskSpace",
            "NSPrivacyAccessedAPITypeReasons": ["E174.1"]
        },
        {
            "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategorySystemBootTime",
            "NSPrivacyAccessedAPITypeReasons": ["35F9.1"]
        }
    ]
}
```

**Avant de l'appliquer** : relire https://docs.expo.dev/guides/apple-privacy/ pour la version
du SDK en cours. Les codes de raison évoluent et Apple en refuse de périmés. Si un rejet
mentionne une API non déclarée, le code manquant est indiqué dans le message — l'ajouter à
ce bloc puis rebuilder.

---

## Checklist de soumission

- [ ] Politique de confidentialité en ligne et à jour à la date de soumission
- [ ] Liens légaux accessibles **dans** l'app (fait — section À propos des Réglages)
- [ ] Formulaire Data Safety rempli sur Play Console
- [ ] Nutrition Labels remplies sur App Store Connect
- [ ] `ios.privacyManifests` ajouté à `app.json` et build iOS régénéré
- [ ] Boîte `contact@trycast.fr` opérationnelle (adresse de support déclarée aux deux stores)
- [x] ~~Si Aptabase / Sentry sont en service : déclarations mises à jour~~ → fait le
      22 juillet 2026, avant leur mise en service
- [ ] `SENTRY_AUTH_TOKEN` en secret EAS + `organization`/`project` dans le plugin
      `app.json`, pour l'envoi des source maps au premier build de release
