// Traduction anglaise, typée sur le dictionnaire source (fr.ts). Voix : tutoiement
// familier, vocabulaire rugby britannique aligné sur les ressources EN de l'app
// (src/locales/en/ : mates, kick-off, table, attacking bonus…).
import type { Dictionary } from './fr';

export const en: Dictionary = {
    meta: {
        ogImageAlt: 'TryCast — rugby predictions with your mates',
    },
    nav: {
        concept: 'How it works',
        competitions: 'Competitions',
        faq: 'FAQ',
        waitlist: 'Waitlist',
    },
    switcher: {
        label: 'FR',
        title: 'Lire en français',
    },
    footer: {
        tagline: 'Go for the try.',
        pitch: 'The rugby predictions game, free and 100% between mates. Not affiliated with any competition, club or union mentioned.',
        product: 'Product',
        legal: 'Legal',
        contact: 'Contact',
        terms: 'Terms',
        privacy: 'Privacy',
        legalNotice: 'Legal notice',
        deleteAccount: 'Delete my account',
        madeBy: 'TryCast. Made between mates, for real.',
        noMoney: 'No real-money betting · no stakes · a free social game.',
    },
    landing: {
        title: 'TryCast — Your rugby. Your mates. Your calls.',
        description:
            'The free rugby predictions app to play with your mates: exact score, tries, attacking bonus, points weighted by the odds. No real money. Launching February 2027.',
        ogImage: '/og-default-en.png',
    },
    hero: {
        overline: 'Rugby predictions with your mates · Road to 2027',
        title: { line1: 'Your rugby.', line2: 'Your mates.', spark: 'Your calls.' },
        lede: {
            before: 'The free predictions app built ',
            strong: 'for rugby',
            after: ' — exact score, tries, attacking bonus, points weighted by the odds. No real money. 100% between mates.',
        },
        ctaPrimary: 'Join the waitlist',
        ctaSecondary: 'See how it works',
        assurances: { free: 'Free', noMoney: 'No real money', release: 'Out Feb 2027' },
        mockup: {
            privateLeague: 'Private league',
            leagueName: 'The Mates',
            you: 'You',
            youInitials: 'YO',
            round: 'Six Nations 2027 · R2',
            myMatches: 'My matches',
            kickoff: '21:00',
            saved: 'Saved',
            home: 'France',
            away: 'Ireland',
            bonus: 'Att. bonus FRA',
            pointsUnit: 'pts',
            matchesTab: 'Matches',
        },
    },
    marquee: {
        label: 'TryCast in four promises',
        items: {
            free: 'Free, for real',
            noMoney: 'No real money',
            friends: '100% between mates',
            rugby: 'Built for rugby',
        },
    },
    steps: {
        kicker: '01 — 03',
        title: 'How it works',
        items: {
            predict: {
                title: 'Make your call',
                body: 'Exact score, tries and attacking bonus. One prediction per match, and it saves itself. No button to hunt for.',
            },
            points: {
                title: 'Score smart points',
                body: 'Your points are weighted by the odds: backing the right underdog pays big. The easy call, less so.',
            },
            league: {
                title: 'Rule your league',
                body: "Climb your private league's table and the overall leaderboard. The banter between mates does the rest.",
            },
        },
    },
    features: {
        kicker: 'The kit',
        title: 'Everything you need',
        items: {
            rugby: {
                title: 'Built for rugby',
                body: 'Exact score, tries, attacking bonus, odds. The real rules of the game, not recycled football.',
            },
            leagues: {
                title: 'Private leagues',
                body: 'Create your league and invite your mates with a simple link. Your season, your table.',
            },
            points: {
                title: 'Smart points',
                body: 'The odds are built in: the bolder and more accurate the call, the more points it earns.',
            },
            live: {
                title: 'Live leaderboards',
                body: 'Follow your position in real time — in your league and overall — as the matches unfold.',
            },
            competitions: {
                title: 'Multi-competition',
                body: 'Six Nations, Champions Cup and the 2027 Rugby World Cup, all in one app.',
            },
            social: {
                title: 'Free & social',
                body: 'No real money, no stakes, no disguised ads. Just you, your mates and the game.',
            },
        },
    },
    difference: {
        overline: 'The difference',
        title: 'Built for rugby, not patched together from football.',
        body: 'Rugby has its own rules: exact score, tries, attacking bonus, odds. We put them at the heart of the game — not bolted on afterwards.',
        them: 'Generic apps',
        rows: {
            rugby: {
                bad: 'A football app with rugby stuck on top',
                good: 'Built for rugby from the first line of code',
            },
            scores: {
                bad: 'Bare result: 1 · X · 2',
                good: 'Exact score, tries and attacking bonus',
            },
            odds: {
                bad: 'Every prediction is worth the same',
                good: "Points weighted by the bookmakers' odds",
            },
            money: {
                bad: 'Real money, stakes and ads',
                good: '100% free, no stakes, no real money',
            },
            friends: {
                bad: "Anonymous players you don't know",
                good: 'Private leagues, just between mates',
            },
        },
    },
    roadmap: {
        kicker: 'The season',
        title: 'On the road to 2027',
        launch: {
            badge: 'Stage 1',
            date: 'February 2027',
            body: 'Launching for the kick-off of the Six Nations. Create your league and predict the opening round.',
            sixNations: 'Six Nations',
            championsCup: 'Champions Cup',
        },
        worldCup: {
            badge: 'The big one',
            date: 'Autumn 2027',
            body: "The 2027 Rugby World Cup. The whole tournament, your mates, one leaderboard. That's where it all happens.",
            chip: '2027 Rugby World Cup',
        },
    },
    faq: {
        kicker: 'Your questions',
        title: 'Our answers',
        items: {
            free: {
                q: 'Is it really free?',
                a: 'Yes, completely. No purchases, no stakes, no disguised ads. You play, you wind up your mates, that’s it. That’s our promise from day one.',
            },
            money: {
                q: 'Is it gambling?',
                a: 'No, never. No real money, no stakes. TryCast is a social game between mates: you bet your pride on the leaderboard, not your wallet.',
            },
            when: {
                q: 'When does it launch?',
                a: 'February 2027, in time for the kick-off of the Six Nations, followed by the Rugby World Cup in autumn 2027. Sign up to hear about it on day one.',
            },
            competitions: {
                q: 'Which competitions?',
                a: 'Six Nations, Champions Cup and the 2027 Rugby World Cup from launch. More competitions will follow, season after season.',
            },
            friends: {
                q: 'How do I play with my mates?',
                a: 'Create a private league, share the invite link, and battle it out on the leaderboard all season long. Simple as a pass.',
            },
        },
    },
    waitlist: {
        overline: 'Pre-launch · limited spots at first',
        title: { line1: 'Be there for', line2: 'kick-off.' },
        lede: 'Leave your email and we’ll let you know the moment we open, in February 2027. No spam, promise.',
        successTitle: 'Thanks, we’ll keep you posted.',
        successBody: 'Your try is scored. See you in February 2027 for kick-off.',
        placeholder: 'you@email.com',
        emailLabel: 'Email address',
        trap: 'Do not fill in this field',
        submit: 'Sign me up',
        errorEmail: 'Oops — check your email address.',
        errorNetwork: 'Oops — that didn’t go through. Try again in a moment.',
        reassurance: 'Free, no strings attached. We never share your email.',
    },
};
