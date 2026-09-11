// Dictionnaire source du site : le français fait référence, l'anglais (en.ts) est typé
// sur sa forme — une clé manquante ou en trop casse `astro check`, donc la CI.
// Listes en objets à clés plutôt qu'en tableaux : un composant qui garde des données
// non traduites (icônes SVG) s'y rattache par clé, jamais par position.

export const fr = {
    meta: {
        ogImageAlt: 'TryCast — pronostics rugby entre amis',
    },
    nav: {
        concept: 'Le concept',
        competitions: 'Compétitions',
        faq: 'FAQ',
        waitlist: "Liste d'attente",
    },
    switcher: {
        /** Libellé court du lien vers l'autre langue, écrit dans cette autre langue. */
        label: 'EN',
        /** Nom complet de l'autre langue, pour les lecteurs d'écran. */
        title: 'Read in English',
    },
    footer: {
        tagline: 'Tente ton essai.',
        pitch: 'Le jeu de pronos rugby, gratuit et 100% entre amis. Non affilié aux compétitions, clubs ou fédérations cités.',
        product: 'Produit',
        legal: 'Légal',
        contact: 'Contact',
        terms: 'CGU',
        privacy: 'Confidentialité',
        legalNotice: 'Mentions légales',
        deleteAccount: 'Supprimer mon compte',
        madeBy: 'TryCast. Fait entre potes, pour de vrai.',
        noMoney: "Aucun pari d'argent · aucune mise · jeu social gratuit.",
    },
};

export type Dictionary = typeof fr;
