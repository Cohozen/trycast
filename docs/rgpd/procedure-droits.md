# Répondre à une demande de droits — TryCast

> Toute demande reçue à `contact@trycast.fr` doit recevoir une réponse **dans le mois**
> (art. 12.3 RGPD), prolongeable de deux mois si elle est complexe — à condition d'en
> informer la personne dans le premier mois.

## Avant tout : vérifier l'identité, sans excès

Il faut s'assurer que le demandeur est bien le titulaire du compte, mais **sans réclamer de
pièce d'identité** : la CNIL considère cette exigence disproportionnée quand des moyens plus
simples existent. Ici, le moyen simple est l'adresse e-mail.

- Si la demande vient de **l'adresse e-mail du compte** → l'identité est suffisamment
  établie, répondre directement.
- Sinon → répondre depuis l'adresse de contact en demandant d'écrire depuis l'adresse
  associée au compte. Ne jamais transmettre de données à une autre adresse.

## Droit d'accès et de portabilité (art. 15 et 20)

L'utilisateur peut s'en occuper seul, immédiatement :
**Réglages → Confidentialité → Exporter mes données**. L'export est produit par l'Edge
Function `export-data` et couvre le compte, le profil, les pronostics, les ligues, les
classements, les préférences de notification et l'historique des consentements. Le jeton de
notification en est volontairement exclu (secret d'appareil) : seules la plateforme et les
dates apparaissent.

**Réponse type** : indiquer le chemin dans l'application. Si la personne n'a plus accès à son
compte, produire l'export côté serveur en appelant `export-data` avec un jeton du compte, ou
à défaut en rejouant ses requêtes filtrées sur l'`user_id`.

## Droit à l'effacement (art. 17)

Là aussi, l'utilisateur est autonome : **Réglages → Supprimer mon compte**. L'Edge Function
`delete-account` supprime le compte `auth.users` — tout le reste part en cascade — et purge
le dossier de la photo de profil dans le bucket Storage (non couvert par la cascade).

**Points à connaître pour répondre :**
- La suppression est **immédiate et définitive**, sans corbeille ni délai de grâce.
- Si la personne possède une ligue, celle-ci **disparaît pour tous ses membres**. Le
  transfert de propriété est possible avant suppression — le proposer si le contexte s'y
  prête.
- Les pronostics supprimés faisaient partie des classements des autres joueurs : ces
  classements sont recalculés sans eux.

## Droit de rectification (art. 16)

Le pseudo, l'adresse e-mail, la photo de profil et la langue se modifient dans **Réglages**.
Aucune intervention n'est nécessaire. Un pronostic passé n'est pas rectifiable après le coup
d'envoi : c'est une règle du jeu appliquée par le serveur, pas une donnée erronée au sens de
l'article 16 — l'expliquer plutôt que de modifier la base.

## Droit d'opposition et retrait du consentement (art. 21 et 7.3)

- **Communications produit** : Réglages → Confidentialité → interrupteur « Communications ».
  Le retrait est enregistré comme une nouvelle ligne dans `consents` (table append-only), ce
  qui conserve la date exacte du retrait.
- **Notifications push** : Réglages → Notifications. Le jeton de l'appareil est supprimé.

## Liste d'attente du site

Les adresses de la liste d'attente ne sont rattachées à aucun compte. Sur demande, supprimer
la ligne correspondante dans `waitlist_signups` (accès `service_role` requis — la table
n'est lisible par aucun client) et le confirmer par retour d'e-mail.

## Ce qu'il faut consigner

Garder une trace de chaque demande de droits pendant **3 ans** : date de réception, nature
de la demande, date et teneur de la réponse. Une simple étiquette dans la boîte e-mail
suffit — c'est ce qui prouve, en cas de contrôle, que le délai d'un mois a été tenu.

## En cas de violation de données

Notifier la CNIL **dans les 72 heures** (art. 33) si la violation présente un risque pour
les personnes, et informer directement les utilisateurs concernés si le risque est élevé
(art. 34). La notification se fait sur le site de la CNIL. Rédiger dans la foulée une note
interne : ce qui s'est passé, quelles données, combien de personnes, mesures prises.
