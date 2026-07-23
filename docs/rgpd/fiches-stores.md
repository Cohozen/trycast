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
