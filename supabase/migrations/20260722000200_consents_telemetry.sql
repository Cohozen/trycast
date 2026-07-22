-- Lot B (mesure) : deux nouveaux types de consentement, 'analytics' (mesure
-- d'usage via Aptabase) et 'diagnostics' (rapports de plantage via Sentry).
--
-- Le modèle append-only de 20260719000100_consents.sql avait été conçu pour
-- ça : son en-tête annonçait déjà l'extension à 'analytics' sans migration de
-- données. Seul le check évolue, aucune ligne n'est touchée.
--
-- ⚠️ Cette table est une **trace horodatée**, pas le garde-fou runtime. Les
-- deux SDK démarrent avant toute session, or les policies de `consents` sont
-- indexées sur auth.uid() : un plantage sur l'écran de connexion ne pourrait
-- pas être filtré ici. Le garde-fou est une préférence locale à l'appareil
-- (src/features/privacy/telemetry-preference.ts) ; cette table sert à prouver
-- quand et dans quel sens l'utilisateur a exprimé son choix.

alter table public.consents drop constraint consents_type_check;

alter table public.consents
    add constraint consents_type_check
    check (type in ('communications', 'analytics', 'diagnostics'));
