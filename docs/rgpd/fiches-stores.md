# Déclarations de confidentialité des stores — TryCast

> Brouillon à recopier dans les consoles au moment de la soumission. Ces déclarations
> engagent : une réponse fausse est un motif de rejet, et de retrait après publication.
> Elles doivent rester cohérentes avec `web/src/pages/confidentialite.astro` et
> [registre-des-traitements.md](registre-des-traitements.md).

**Dernière mise à jour** : 22 juillet 2026 — état du produit : aucun analytics, aucun
outil de suivi des plantages, aucune publicité.

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
| Photos et vidéos | Photos | Non | Fonctionnalité de l'app (photo de profil) |
| Contenu utilisateur | Autre contenu généré (pronostics) | Oui | Fonctionnalité de l'app |
| Identifiants | Identifiant d'appareil (jeton de push) | Non | Fonctionnalité de l'app (notifications) |
| Activité de l'app | Autres actions dans l'app (points, classements) | Oui | Fonctionnalité de l'app |

⚠️ Ne **pas** cocher « Analytics » ni « Personnalisation » tant qu'Aptabase n'est pas en
service. Le jour où il l'est, ajouter une ligne « Activité de l'app → interactions dans
l'app », finalité **Analytics** — et seulement si les événements sont rattachables à un
appareil, ce qui n'est pas le cas du modèle anonyme d'Aptabase (à revérifier à ce
moment-là).

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

**Données non liées à l'utilisateur** : aucune.
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
- [ ] Si Aptabase / Sentry sont en service : déclarations mises à jour **avant** soumission
