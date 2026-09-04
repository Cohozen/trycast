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
 * ⚠️ Modifier ce fichier change l'empreinte : les builds antérieurs cessent de
 * recevoir les mises à jour. À ne toucher qu'en même temps qu'une release.
 */
module.exports = {
    sourceSkips: ['PackageJsonScriptsAll'],
};
