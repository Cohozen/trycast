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
    landing: {
        title: 'TryCast — Ton rugby. Tes potes. Tes pronos.',
        description:
            "L'appli gratuite de pronostics rugby entre amis : score exact, essais, bonus offensif, points pondérés par les cotes. Sans argent réel. Lancement février 2027.",
        /** Vignette d'aperçu : l'accroche y est écrite (scripts/build-og-images.sh). */
        ogImage: '/og-default.png',
    },
    hero: {
        overline: 'Pronostics rugby entre potes · Route vers 2027',
        title: { line1: 'Ton rugby.', line2: 'Tes potes.', spark: 'Tes pronos.' },
        // Texte enrichi découpé autour de la balise plutôt que servi en set:html.
        lede: {
            before: "L'appli gratuite de pronos pensée ",
            strong: 'pour le rugby',
            after: ' — score exact, essais, bonus offensif, points pondérés par les cotes. Sans argent réel. 100% entre amis.',
        },
        ctaPrimary: "Rejoindre la liste d'attente",
        ctaSecondary: 'Voir le concept',
        assurances: { free: 'Gratuit', noMoney: 'Zéro argent réel', release: 'Sortie fév. 2027' },
        // Maquettes d'écrans de l'app : ce qu'afficherait l'app dans cette langue.
        mockup: {
            privateLeague: 'Ligue privée',
            leagueName: 'Les Potes',
            you: 'Toi',
            youInitials: 'TO',
            round: '6 Nations 2027 · J2',
            myMatches: 'Mes matchs',
            kickoff: '21h00',
            saved: 'Enregistré',
            home: 'France',
            away: 'Irlande',
            bonus: 'Bonus off. FRA',
            pointsUnit: 'pts',
            matchesTab: 'Matchs',
        },
    },
    marquee: {
        label: 'TryCast en quatre promesses',
        items: {
            free: 'Gratuit, pour de vrai',
            noMoney: 'Zéro argent réel',
            friends: '100% entre amis',
            rugby: 'Pensé pour le rugby',
        },
    },
    steps: {
        kicker: '01 — 03',
        title: 'Comment ça marche',
        items: {
            predict: {
                title: 'Fais ton prono',
                body: "Score exact, essais et bonus offensif. Un prono par match, ça s'enregistre tout seul. Aucun bouton à chercher.",
            },
            points: {
                title: 'Marque des points malins',
                body: 'Tes points sont pondérés par les cotes : oser le bon outsider rapporte gros. Le prono facile, moins.',
            },
            league: {
                title: 'Domine ta ligue',
                body: 'Grimpe au classement de ta ligue privée et au général. Le chambrage entre potes fait le reste.',
            },
        },
    },
    features: {
        kicker: 'Le kit',
        title: "Tout ce qu'il te faut",
        items: {
            rugby: {
                title: 'Pensé pour le rugby',
                body: 'Score exact, essais, bonus offensif, cotes. Les vraies règles du jeu, pas du foot recyclé.',
            },
            leagues: {
                title: 'Ligues privées',
                body: 'Crée ta ligue, invite tes potes avec un simple lien. Votre saison, votre classement.',
            },
            points: {
                title: 'Points malins',
                body: 'Les cotes sont intégrées : plus le pari est audacieux et juste, plus il rapporte de points.',
            },
            live: {
                title: 'Classements live',
                body: 'Suis ta place en temps réel — dans ta ligue et au général — au fil des matchs.',
            },
            competitions: {
                title: 'Multi-compétitions',
                body: '6 Nations, Champions Cup et Coupe du Monde 2027, réunies dans une seule appli.',
            },
            social: {
                title: 'Gratuit & social',
                body: 'Zéro argent réel, zéro mise, zéro pub déguisée. Juste toi, tes potes et le jeu.',
            },
        },
    },
    difference: {
        overline: 'La différence',
        title: 'Pensé pour le rugby, pas bricolé depuis le foot.',
        body: 'Le rugby a ses propres règles : score exact, essais, bonus offensif, cotes. On les a mises au cœur du jeu — pas collées après coup.',
        them: 'Les apps génériques',
        rows: {
            rugby: {
                bad: 'Une appli de foot avec du rugby collé dessus',
                good: 'Pensée pour le rugby dès la première ligne de code',
            },
            scores: {
                bad: 'Résultat sec : 1 · N · 2',
                good: 'Score exact, essais et bonus offensif',
            },
            odds: {
                bad: 'Tous les pronos valent pareil',
                good: 'Points pondérés par les cotes des bookmakers',
            },
            money: {
                bad: 'Argent réel, mises et publicités',
                good: '100% gratuit, zéro mise, zéro argent réel',
            },
            friends: {
                bad: 'Des joueurs anonymes que tu ne connais pas',
                good: 'Des ligues privées, seulement entre potes',
            },
        },
    },
    roadmap: {
        kicker: 'La saison',
        title: 'Sur la route de 2027',
        launch: {
            badge: 'Étape 1',
            date: 'Février 2027',
            body: "Lancement pour le coup d'envoi du Tournoi des 6 Nations. Crée ta ligue, pronostique la première journée.",
            sixNations: '6 Nations',
            championsCup: 'Champions Cup',
        },
        worldCup: {
            badge: 'Le grand rendez-vous',
            date: 'Automne 2027',
            body: "La Coupe du Monde 2027. Toute la compétition, tes potes, un seul classement. C'est là que ça se joue.",
            chip: 'Coupe du Monde 2027',
        },
    },
    faq: {
        kicker: 'Les questions',
        title: 'On te répond',
        items: {
            free: {
                q: 'C’est vraiment gratuit ?',
                a: 'Oui, totalement. Aucun achat, aucune mise, aucune pub déguisée. Tu joues, tu chambres tes potes, point. C’est notre promesse de départ.',
            },
            money: {
                q: 'C’est du pari d’argent ?',
                a: 'Non, jamais. Zéro argent réel, zéro mise. TryCast est un jeu social entre amis : on parie sa fierté au classement, pas son portefeuille.',
            },
            when: {
                q: 'Ça sort quand ?',
                a: 'Lancement en février 2027 pour le coup d’envoi du Tournoi des 6 Nations, puis la Coupe du Monde à l’automne 2027. Inscris-toi pour être prévenu le jour J.',
            },
            competitions: {
                q: 'Quelles compétitions ?',
                a: '6 Nations, Champions Cup et Coupe du Monde 2027 dès le lancement. D’autres compétitions suivront au fil des saisons.',
            },
            friends: {
                q: 'Comment je joue avec mes potes ?',
                a: 'Tu crées une ligue privée, tu partages le lien d’invitation, et vous vous affrontez au classement toute la saison. Simple comme une passe.',
            },
        },
    },
    waitlist: {
        overline: 'Pré-lancement · places limitées au départ',
        title: { line1: 'Sois là au', line2: "coup d'envoi." },
        lede: "Laisse ton e-mail : on te prévient dès l'ouverture, en février 2027. Pas de spam, promis.",
        successTitle: 'Merci, on te tient au courant.',
        successBody: "Ton essai est marqué. Rendez-vous en février 2027 pour le coup d'envoi.",
        placeholder: 'ton@email.fr',
        emailLabel: 'Adresse e-mail',
        trap: 'Ne pas remplir ce champ',
        submit: "Je m'inscris",
        errorEmail: 'Oups — vérifie ton adresse e-mail.',
        errorNetwork: "Oups — ça n'a pas voulu passer. Réessaie dans un instant.",
        reassurance: 'Gratuit, sans engagement. On ne partage jamais ton e-mail.',
    },
    legal: {
        updatedAt: 'Dernière mise à jour :',
        // Encart des traductions : n'apparaît que hors du français, qui fait foi.
        translationNotice: {
            before: 'Cette traduction est fournie pour information ; seule ',
            link: 'la version française',
            after: ' fait foi.',
        },
    },
};

export type Dictionary = typeof fr;
