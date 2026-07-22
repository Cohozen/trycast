# Conformité RGPD — TryCast

Documentation de conformité, tenue à jour au fil du produit. Rien ici n'est secret : ces
fichiers sont versionnés et ne contiennent **ni nom réel, ni adresse personnelle** —
l'éditeur y est toujours désigné par `contact@trycast.fr`, conformément au statut d'éditeur
non professionnel (LCEN 6-III-2).

| Fichier | À quoi ça sert |
|---|---|
| [registre-des-traitements.md](registre-des-traitements.md) | Registre de l'article 30 : chaque traitement, sa finalité, sa base légale, sa durée de conservation. À présenter à la CNIL sur demande |
| [sous-traitants.md](sous-traitants.md) | Qui touche aux données, où, et sous quelles garanties de transfert |
| [procedure-droits.md](procedure-droits.md) | Comment répondre à une demande reçue à `contact@trycast.fr`, dans le délai d'un mois |
| [fiches-stores.md](fiches-stores.md) | Brouillon des déclarations Play Data Safety et App Store Nutrition Labels, plus le bloc `ios.privacyManifests` à appliquer au premier build iOS |

## La règle qui compte

**Un traitement se déclare avant sa mise en service, jamais après.** Concrètement, dès qu'on
branche un nouvel outil qui voit des données d'utilisateurs (mesure d'audience, suivi des
plantages, e-mailing, hébergeur), il faut mettre à jour **dans le même lot** :

1. `docs/rgpd/registre-des-traitements.md`
2. `docs/rgpd/sous-traitants.md`
3. `web/src/pages/confidentialite.astro` (la version publique)
4. Les déclarations des stores si l'app est déjà publiée

## Ce qui est déjà en place côté code

- **Portabilité** : Edge Function `export-data`, branchée sur Réglages → Confidentialité
- **Effacement** : Edge Function `delete-account` (cascade SQL + purge du bucket avatars)
- **Consentements historisés** : table `consents`, append-only, avec date de recueil
- **Cloisonnement** : RLS PostgreSQL sur toutes les tables — le client n'est qu'une UX
- **Minimisation** : IP de l'anti-spam hachées et salées au jour, purgées à 24 h ; jeton de
  push exclu de l'export
- **Vérification** : `bash scripts/e2e-privacy.sh` et `scripts/e2e-waitlist.sql`
