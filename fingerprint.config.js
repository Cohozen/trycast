/**
 * Ce qui entre — ou n'entre pas — dans la « version d'exécution » du projet.
 *
 * `runtimeVersion.policy = "fingerprint"` (app.json) calcule une empreinte de
 * tout ce qui touche au natif. Une mise à jour à distance n'est délivrée qu'aux
 * builds portant la MÊME empreinte : c'est ce qui rend une mise à jour
 * incompatible impossible à envoyer par mégarde.
 *
 * Par défaut, le champ `scripts` de `package.json` en fait partie — parce qu'un
 * script `android`/`ios` peut trahir un projet en workflow natif. Ici il n'en
 * est rien : `android` et `ios` appellent `expo run:*`, et les autres scripts
 * (builds EAS, OTA, e-mails, typegen) n'ont aucun effet à l'exécution.
 *
 * Conséquence sans cette exclusion, vécue le 3 septembre 2026 : ajouter des
 * commandes npm a changé l'empreinte et rendu le build déjà distribué incapable
 * de recevoir la moindre mise à jour. Aucune erreur, aucun message — les
 * correctifs n'arrivent simplement jamais. Un piège coûteux, puisqu'on ne le
 * découvre qu'en constatant que rien ne se passe.
 *
 * ⚠️ **`ExpoConfigVersions` n'est délibérément PAS dans cette liste** (décision
 * actée le 10 septembre 2026 — ne pas la reproposer). Sans ce drapeau,
 * `expo.version` fait partie de l'empreinte (`@expo/fingerprint` ne la retire
 * de la source `expoConfig` que sous ce skip), donc **tout bump de version
 * impose un nouveau build**. C'est voulu : l'écran Réglages affiche
 * `nativeApplicationVersion`, gravée dans le binaire, qu'une mise à jour à
 * distance ne peut pas changer. Découpler les deux permettrait de bumper sans
 * builder, et l'app afficherait alors une version fausse. Le couplage est donc
 * un garde-fou, pas une gêne — le corollaire étant qu'un correctif JS se publie
 * **sans bump** (`npm run ota:prod`). `npm run release` annonce le verdict avant
 * d'écrire quoi que ce soit.
 *
 * `ignorePaths` traite un autre cas, vécu le 6 septembre 2026 : le
 * `android/build.gradle` de `@react-native-masked-view/masked-view` **réécrit
 * son propre `AndroidManifest.xml` dans `node_modules`** au moment où Gradle
 * configure le projet (il retire l'attribut `package=`, devenu interdit depuis
 * AGP 7). Un simple `npm run android` suffit donc à faire diverger la machine
 * de développement d'une installation fraîche : EAS calcule l'empreinte AVANT
 * Gradle, sur le paquet publié, la machine locale APRÈS, sur le fichier
 * modifié. Le build de production s'est arrêté sur `Runtime version mismatch`,
 * et une publication OTA lancée dans cet état serait partie avec une empreinte
 * fantôme — donc dans le vide, silencieusement. Ignorer ce fichier rend
 * l'empreinte identique des deux côtés (vérifié : même valeur que le manifeste
 * soit intact ou réécrit par Gradle).
 *
 * ⚠️ Changer la CONFIGURATION ci-dessous change l'empreinte : les builds
 * antérieurs cessent de recevoir les mises à jour. À ne toucher qu'en même
 * temps qu'une release. En revanche, ce commentaire n'en fait pas partie — le
 * fichier lui-même n'est pas haché, seul son effet l'est (vérifié le
 * 10 septembre 2026 : empreinte identique avant et après cette réécriture).
 * Documenter ici est donc sans risque, et c'est le bon endroit pour le faire.
 */
module.exports = {
    sourceSkips: ['PackageJsonScriptsAll'],
    ignorePaths: [
        'node_modules/@react-native-masked-view/masked-view/android/src/main/AndroidManifest.xml',
    ],
};
