# Architecture et audit — phases 0 et 1

## Version examinée

Le 5 novembre 2026, Git distant annonce `main` à d5e7e6b et `feat/physix-public-vercel` à d9ccb3d. Cette dernière contient la version la plus complète des deux branches observées ; elle sert de base à `feat/physix-phases-0-1`, sans fusion automatique. Le répertoire de travail était propre. Aucun fichier AGENTS.md n’avait été trouvé lors de l’inspection du dépôt.

L’inspection des Pull Requests par `gh pr list` est bloquée : API GraphQL Forbidden. Impossible d’attester qu’aucune PR n’existe. Git en lecture et en écriture fonctionne. La configuration Vercel est vérifiée localement, mais aucun journal ni compte Vercel n’est accessible : le déploiement distant reste non vérifié.

## Choix immédiat

Conserver HTML/CSS/JavaScript pour les phases visuelles : aucun compilateur ni framework n’est nécessaire à la landing. Préserver les 14 vues fictives existantes et leur enregistrement local. Séparer illustration, styles, comportement et documents. Cette phase ne doit pas ouvrir les comptes ni faire passer localStorage pour une base sécurisée.

L’accueil et ses sections sont du HTML sémantique ; app.js enrichit les interactions et conserve le prototype existant. Une illustration SVG originale remplace les emojis décoratifs publics. Les exemples de chapitre et progression sont des aperçus explicitement fictifs, sans prétendre implémenter la phase 2.

## Architecture cible

À partir de la phase 2, migration incrémentale envisagée vers React avec TypeScript et Vite : composants par domaine (accueil, chapitres, bibliothèque, calendrier, suivi), routes explicites, modèle de données typé, tests métier indépendants de l’interface. Ce choix convient à une interface interactive déployée sur Vercel et évite d’introduire un serveur permanent. Migrer une vue à la fois avec tests de parité ; conserver les fonctionnalités jusqu’à remplacement vérifié.

Phase 3 : Supabase Auth, PostgreSQL avec migrations versionnées et RLS, Storage privé. Fonctions serveur pour invitations atomiques, opérations privilégiées et futures intégrations IA. Aucun secret service_role dans le navigateur. La sécurité repose sur les politiques serveur, pas les routes ni boutons masqués. Tester propriétaire, élève A, élève B, autre classe et invité avec requêtes directes.

Domaines : classes, profils, inscriptions, chapitres, ressources, séances, événements datés/auteur, occasions évaluées, critères et versions de notes, invitations hachées, évaluations, tentatives et échéances. Respecter les règles complètes de SPECIFICATIONS.md : seule la note d’activité validée est affichée aux élèves ; sa part de 25 % n’entraîne aucune publication automatique de moyenne.

## Dette connue et limites

Les gestionnaires inline et styles existants imposent encore unsafe-inline dans la CSP. Les retirer au fil de la migration. Les données du prototype sont toutes publiques au sens technique, même si l’interface filtre les fiches : n’y placer aucune donnée réelle. Pas d’authentification réelle, de fichiers privés, de calcul de note, d’export, de calendrier ou d’IA dans ce lot. Les captures de démonstration ne prouvent pas les permissions backend ni un déploiement Vercel.

## Résultats de validation du lot

`node --check assets/app.js`, `git diff --check`, `python3 tests/smoke.py` et `python3 tests/visual.py` passent. Les tests vérifient les 14 vues fictives, le filtrage invité, le refus de l’ancien paramètre admin, la sélection de classe, l’enregistrement/rechargement/annulation d’une participation, la fenêtre modale au clavier, l’absence d’erreurs JavaScript, quatre largeurs (320, 390, 768, 1440), le chargement SVG, l’apparition au défilement, le parallaxe et le mouvement réduit. Trois captures sont produites et les captures de l’accueil ont été inspectées visuellement.

Non testés car non implémentés ou inaccessibles : authentification/invitations/RLS, calcul des notes, exports, stockage privé et déploiement Vercel distant. Les tests actuels ne remplacent aucun de ces contrôles.
