# PhysiX — feuille de route

Référence : SPECIFICATIONS.md. Aucune fusion ni mise en production sans validation du propriétaire.

| Phase | État | Critères de validation |
|---|---|---|
| 0 — Audit et stabilisation | Audit local réalisé ; accès externes partiels | Branches distantes examinées, version complète conservée, architecture documentée et configuration Vercel inspectée. Inspection PR bloquée par API Forbidden ; validation Vercel distante à faire. |
| 1 — Refonte visuelle | Implémentée et vérifiée localement | Accueil original SVG, seulement deux accès, signature officielle, aucune mention BIOF visible sur l’accueil, sections ressources/chapitre/progression/pourquoi, clavier/mobile/mouvement réduit, captures et tests. Validation visuelle du propriétaire et aperçu Vercel restent à obtenir. |
| 2 — Architecture pédagogique | À développer après validation de ce lot | Niveaux/matières/chapitres, onglets, bibliothèque/recherche, devoirs surveillés, calendrier et présentation ; parcours démontrable avec données fictives. |
| 3 — Authentification et données | À développer | Supabase Auth et migrations/RLS, propriétaire, invitations atomiques, stockage privé ; tests API d’isolation interélèves et invités. |
| 4 — Administration et suivi | Prototype partiel conservé | Gestion élèves/classes, événements/séances, occasions évaluées, barème configurable, proposition puis validation des notes, statistiques et exports testés. |
| 5 — Évaluations et progression | À développer | QCM manuels, tentatives, échéances et rappels internes ; seule la note d’activité validée apparaît aux élèves. |
| 6 — IA | Ultérieure | Services et coûts configurés, génération/correction avec validation humaine, quotas et erreurs testés ; aucune correction fictive présentée comme réelle. |
| 7 — Mise en service | Non autorisée dans ce lot | Tests de sécurité/fonctionnement, sauvegarde-restauration, comptes fictifs, obligations relatives aux mineurs et validation explicite du propriétaire. |

## Démonstration du lot 0–1

Serveur statique local et `python3 tests/smoke.py`. Captures dans `docs/screenshots/` (desktop, mobile et espace élève fictif). Consulter docs/architecture.md pour les limites d’accès GitHub/Vercel. Aucun compte réel ni secret requis pour ce lot.
