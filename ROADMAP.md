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

## Accueil officiel — maquette validée

La maquette claire fournie par le propriétaire remplace la direction sombre de la phase 1 pour l’accueil public. Implémentation sur `feat/physix-approved-home` : signature Abderrahim Ashad, navigation À propos, titre Physique-Chimie Autrement, illustration scientifique ordinateur/atome/laboratoire, cartes Élève/Invité, démo, quatre atouts, Pourquoi PhysiX et footer. Aucun aperçu de chapitre ni faux témoignage. L’illustration est un asset généré à partir de la référence, pas une capture interactive de vrais comptes.

Le suivi pédagogique dans assets/app.js, admin.html et la configuration Vercel ne sont pas modifiés. home.css et home.js sont réservés à l’accueil. Contact/WhatsApp/mentions légales/demande personnalisée affichent leur disponibilité réelle. La démo élève et les ressources invitées demeurent fictives.

Vérifications : tests/smoke.py et tests/visual.py passent, sans erreur JavaScript ; contrôles responsive à 320/390/768/1200/1440px, fenêtres au clavier, actions du footer, démo, chargement de l’illustration et mouvement réduit. Captures actuelles : docs/screenshots/accueil-officiel-1200.png et accueil-officiel-390.png. Les anciennes captures illustrent le lot précédent. Le déploiement Vercel distant reste non vérifié ; aucune production ni fusion autorisée par ce lot.

## Phase 2 — lot démonstration du catalogue (branche feat/physix-pedagogie-demo)

Une bibliothèque fictive est disponible dans les espaces Élève et Invité via « Chapitres & devoirs » : filtre de niveau (1BAC/2BAC PC), matière, recherche de titres, fiches de chapitre à rubriques pédagogiques et liste de devoirs surveillés par semestre. Les exemples n'hébergent aucun document et n'incluent aucune donnée personnelle réelle. Il n'y a ni authentification ni véritable publication ou contrôle d'accès côté serveur : toutes les fiches sont expressément étiquetées « démonstration ». Les corrections ne sont pas accessibles. Les vrais contenus, le calendrier, les PDF et l'administration éditoriale resteront à développer après validation du lot.

## Phase 2 — Prototype de gestion éditoriale (branche feat/physix-admin-content-demo)

L'URL `/admin-demo` héberge un **outil de démonstration public et non sécurisé**, identifié visiblement comme tel. L'enseignant peut créer, modifier et supprimer des chapitres, des fiches de ressources (titre, type, visibilité prévue, statut) et des fiches de devoirs surveillés (niveau, matière, semestre, durée et disponibilité indicative du corrigé). Données fictives en localStorage, isolées de la bibliothèque publique. Aucun fichier réel n'est accepté, aucune donnée privée n'est protégée par ce prototype, aucun véritable élève ne doit y figurer. La vraie gestion privée sera migrée derrière Supabase Auth avec RLS et stockage privé.

## Phase 2 — liaison locale Admin / bibliothèque (branche feat/physix-catalogue-admin-sync-demo)

Le prototype `/admin-demo` permet maintenant de sélectionner un PDF (10 Mo max) pour une **prévisualisation éphémère locale** : le fichier reste uniquement en mémoire de l'onglet, n'est jamais envoyé au serveur, disparaît au rechargement, et n'est pas téléchargeable par les élèves. La fiche de contenu (titre, chapitre, type, statut, visibilité, nom du fichier) est conservée en localStorage. Les chapitres n'apparaissent dans la bibliothèque fictive que lorsqu'ils possèdent au moins une ressource non-« Correction » marquée `public` ET `publie`; seules ces fiches apparaissent. Les devoirs fictifs marqués `publie` sont montrés sans fichiers ni corrigé. La synchronisation fonctionne seulement dans le même navigateur et la même origine Vercel, pas entre appareils. Ces drapeaux **ne sont pas un système d'autorisations réel** et ne protègent aucun contenu sensible. L'ajout de documents persistants partagés exige Supabase Storage privé, auth et règles de sécurité côté serveur.

## Phase 2 — ordre pédagogique dans les chapitres (branche feat/physix-resource-ordering-demo)

Le prototype local de gestion des ressources prend en charge l'ordre d'affichage au sein de chaque chapitre, modifiable au formulaire et par les boutons Monter/Descendre. L'ordre des fiches publiques publiées est respecté dans le catalogue de démonstration, indépendamment des fiches privées et brouillons, qui demeurent invisibles dans cette vue. La prévisualisation PDF locale est accessible depuis la fiche ressource tant que l'onglet conserve son fichier en mémoire. Les anciennes fiches sans champ ordre restent compatibles. Vérifications : syntaxe JavaScript et test ciblé de tri et de filtrage du catalogue. Les fichiers ne sont toujours pas diffusés et toute authentification reste à implémenter.
