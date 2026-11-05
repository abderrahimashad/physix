# PHYSIX — CAHIER DES CHARGES ET PROMPT MAÎTRE POUR CODEX

**Projet :** PhysiX  
**Description :** Plateforme intelligente de Physique-Chimie pour les lycéens marocains  
**Langue de l'application :** Français  
**Dépôt GitHub :** `abderrahimashad/physix`  
**Déploiement :** Vercel  
**Backend envisagé :** Supabase  
**Responsable :** Un enseignant de Physique-Chimie, administrateur unique initial

---

# 1. TA MISSION

Tu es l'architecte logiciel, développeur full-stack senior, designer UI/UX et ingénieur qualité responsable du projet PhysiX.

Je ne connais pas la programmation. Je souhaite que tu prennes en charge le développement technique, la structure de l'application, les tests et la préparation du déploiement, tout en m'indiquant clairement les opérations qui nécessitent mon intervention.

**Travaille directement sur mon dépôt GitHub existant. Ne recommence pas le projet à zéro.**

Avant toute modification :
- Inspecte le dépôt, les branches et les Pull Requests existantes.
- Identifie la version la plus récente et la plus complète.
- Préserve les fonctionnalités déjà créées.
- Vérifie la configuration Vercel et les problèmes éventuels.
- Établis une architecture cohérente et évolutive.
- Crée un document `SPECIFICATIONS.md` qui servira de référence permanente.
- Crée un document `ROADMAP.md` contenant les phases et les critères de validation.

Ne fusionne pas automatiquement les branches et ne publie pas de données personnelles réelles.

# 2. IDENTITÉ VISUELLE ET EXPÉRIENCE UTILISATEUR

## 2.1 Marque

Nom officiel : **PhysiX**

Signature : **Votre espace intelligent de Physique-Chimie**

Ne plus utiliser « PhysiqueTrack ».

Sur la page publique, ne pas afficher « BIOF ». Les identifiants administratifs internes des classes peuvent conserver cette mention.

## 2.2 Direction artistique

Je souhaite une interface réellement professionnelle, moderne, immersive et haut de gamme, inspirée de l'univers des meilleures plateformes EdTech et SaaS.

Référence visuelle choisie : le concept de hero 3D éducatif de Musemind sur Dribbble, sans le copier.

https://dribbble.com/shots/26385758-Website-3D-Hero-Section-Animation-for-E-Learning-Experiences

Créer une identité originale PhysiX avec :

- Bleu nuit profond, bleu électrique, cyan lumineux et violet.
- Typographie premium et lisible.
- Composition sophistiquée, équilibrée et aérée.
- Illustration scientifique 3D ou SVG originale.
- Atome animé, orbites, photons, prisme, dispersion lumineuse, molécules.
- Profondeur visuelle, éclairages subtils et glassmorphism maîtrisé.
- Animations d'entrée au scroll.
- Effets hover et micro-interactions élégants.
- Parallax léger au mouvement de la souris.
- Transitions fluides et navigation claire.
- Compatibilité ordinateur, tablette et smartphone.
- Respect de `prefers-reduced-motion`.
- Performances optimisées et navigation accessible au clavier.

Éviter les grands espaces vides, les emojis décoratifs, les cartes génériques et les animations excessives.

## 2.3 Page d'accueil publique

Créer une landing page immersive avec :

1. Header et logo PhysiX.
2. Hero scientifique animé.
3. Présentation concise de la plateforme.
4. Deux accès visibles uniquement :
   - **Espace Élève**
   - **Accès Invité**
5. Présentation des ressources pédagogiques.
6. Aperçu du parcours par chapitre.
7. Présentation du suivi de progression.
8. Section « Pourquoi PhysiX ? ».
9. Footer professionnel.

Ne pas afficher de carte ou bouton « Espace Professeur » sur la page d'accueil.

L'administration sera accessible par un chemin dédié et protégée par une authentification et une autorisation réelles. Le fait de masquer un bouton ne constitue pas une mesure de sécurité.

# 3. UTILISATEURS ET ACCÈS

## 3.1 Administrateur

Je suis l'administrateur unique initial.

Je dispose de droits complets pour :
- Gérer les classes et les élèves.
- Créer les invitations.
- Publier et organiser les ressources.
- Enregistrer les activités.
- Consulter les statistiques.
- Définir les critères de notation.
- Contrôler les notes.
- Organiser les devoirs et évaluations.
- Gérer la visibilité des documents.

## 3.2 Élève

Chaque élève possède un compte individuel lui permettant uniquement d'accéder :
- À son profil.
- À ses ressources autorisées.
- À ses activités.
- À sa note d'activité.
- À sa progression.
- À ses exercices, questions de cours et devoirs.
- À ses échéances.

Un élève ne peut jamais consulter les données privées d'un autre élève.

## 3.3 Invité

Un visiteur sans compte peut consulter exclusivement les cours, résumés et séries explicitement rendus publics par l'administrateur.

Aucun accès aux données d'élèves, notes, corrections privées ou évaluations non publiées.

# 4. INSCRIPTION PRIVÉE DES ÉLÈVES

L'inscription n'est pas ouverte au public.

Workflow requis :

1. L'administrateur crée la fiche d'un élève dans sa classe.
2. Le système génère un code d'invitation unique.
3. L'administrateur remet ce code à l'élève.
4. L'élève ouvre « Première inscription ».
5. Il saisit son code.
6. Il définit son mot de passe et complète son profil.
7. Il peut ajouter une photo personnelle.
8. Le compte est activé immédiatement après validation du code, sans approbation manuelle supplémentaire.

Exigences :
- Un code utilisable une seule fois.
- Code associé à une fiche élève préexistante.
- Expiration, révocation et régénération possibles.
- Validation atomique côté serveur.
- Protection contre les tentatives répétées.
- Authentification sécurisée via Supabase Auth.
- Contrôles d'accès stricts.
- Réinitialisation sécurisée du mot de passe.
- Interdiction de stocker les mots de passe en clair.
- Protection des photos et informations personnelles.

La mise en service avec de vrais élèves doit attendre la validation complète de la sécurité et des obligations applicables à leurs données.

# 5. ORGANISATION DES CLASSES

Les quatre classes initiales sont :

- 2BAC PC BIOF
- 1BAC BIOF G1
- 1BAC BIOF G2
- 1BAC BIOF G3

Conserver les identifiants internes des classes, mais employer des noms d'affichage simplifiés lorsque c'est pertinent.

L'administrateur doit pouvoir créer, renommer, archiver et réorganiser ses classes.

Chaque élève est lié à sa classe. Les ressources peuvent être attribuées à une ou plusieurs classes.

# 6. STRUCTURE PÉDAGOGIQUE

L'organisation principale est :

**Niveau → Matière → Chapitre → Ressources et activités**

Matières :
- Physique
- Chimie

Chaque chapitre possède :
- Numéro et titre.
- Objectifs pédagogiques.
- Cours complet.
- Résumé du cours.
- Exercices d'application.
- Séries d'exercices.
- Corrections.
- Vidéos et animations.
- Questions de cours.
- QCM.
- Ressources complémentaires.
- Progression individuelle de l'élève.

L'élève doit pouvoir ouvrir un chapitre et accéder à son contenu par onglets clairs :

**Cours | Résumé | Exercices | Séries | Corrections | QCM | Ressources**

L'administrateur peut ajouter, modifier, trier, déplacer, archiver et supprimer les chapitres et ressources.

Ne pas inventer des contenus officiels complets : créer des exemples clairement identifiés comme démonstration jusqu'à l'import de mes documents.

# 7. ESPACE ÉLÈVE

Créer un tableau de bord premium contenant :

- Nom et photo de l'élève.
- Classe.
- Message d'accueil.
- Carte de progression globale.
- Chapitre en cours.
- Bouton « Continuer mon apprentissage ».
- Chapitres organisés par matière.
- Exercices et devoirs à réaliser.
- Questions de cours à terminer.
- Dernières ressources publiées.
- Calendrier des échéances.
- Historique d'activité.
- Note d'activité sur 20.
- Graphiques de progression.
- Commentaires pédagogiques autorisés.

**Décision définitive : seule la note d'activité est affichée dans l'espace élève.**

Ne pas afficher automatiquement les notes des devoirs surveillés ni une moyenne générale.

Les résultats d'entraînement et de QCM peuvent être affichés comme feedback pédagogique, sans être confondus avec les notes officielles.

La note d'activité affichée doit être une valeur validée par l'administrateur. Une éventuelle estimation doit être identifiée comme non définitive.

# 8. ESPACE ADMINISTRATEUR

Concevoir une interface professionnelle adaptée à un enseignant qui doit enregistrer rapidement les activités pendant le cours.

## Tableau de bord

- Nombre d'élèves.
- Classes actives.
- Présences et absences.
- Activités enregistrées.
- Questions en attente.
- Devoirs et échéances.
- Alertes pédagogiques.
- Statistiques par période.

## Gestion des élèves

- Liste et fiches élèves avec photos.
- Recherche et filtres.
- Ajout et import de listes.
- Modification et archivage.
- Codes d'invitation.
- Historique des événements.

## Enregistrement rapide

Boutons à une seule action pour :

- Participation.
- Exercice fait.
- Devoir fait.
- Série réalisée.
- Exposé.
- Question de cours.
- Chahut.
- Absence.
- Retard.
- Autre observation.

Chaque événement comporte la date, l'élève, la classe, le type et l'auteur.

Prévoir :
- Annulation immédiate d'une action accidentelle.
- Historique modifiable selon les droits.
- Regroupement des événements par séance.
- Sélection aléatoire d'un élève.
- Option favorisant les élèves rarement interrogés.
- Interface utilisable depuis un téléphone.

# 9. NOTE D'ACTIVITÉ

Créer un moteur de notation transparent et configurable.

Critères possibles :
- Participation.
- Exercices.
- Devoirs.
- Séries.
- Exposés.
- Questions de cours.
- Assiduité.
- Comportement.

Exigences :
- Note d'activité sur 20.
- Pondérations modifiables par l'administrateur.
- Calcul par semaine, semestre et année.
- Distinction entre « non évalué » et « zéro ».
- Absences justifiées non pénalisées automatiquement.
- Éviter les doubles pénalisations.
- Évaluation tenant compte des occasions réelles de participation.
- Historique des modifications.
- Proposition de note calculée.
- Validation ou modification manuelle de la note finale par l'administrateur.

La note d'activité représente **25 % de la note globale**, mais PhysiX ne doit pas imposer ni publier automatiquement une moyenne générale.

# 10. DEVOIRS SURVEILLÉS

Créer un module « Devoirs surveillés ».

Chaque devoir comprend :
- Classe(s) concernée(s).
- Matière.
- Semestre.
- Numéro du devoir.
- Titre.
- Date.
- Durée.
- Barème.
- Sujet PDF.
- Correction PDF.
- Visibilité.
- Date éventuelle de publication du corrigé.

Permettre le classement et la recherche par semestre, matière et niveau.

Distinguer :
- Devoir surveillé officiel.
- Sujet d'entraînement.
- Sujet d'archive.

Les notes officielles de devoirs ne sont pas affichées aux élèves dans cette première version.

Les corrigés privés ne doivent pas être accessibles avant autorisation explicite.

# 11. QUESTIONS DE COURS ET QCM

L'administrateur téléverse un résumé de cours en PDF ou Word.

Dans une phase ultérieure, un module IA pourra :
- Analyser le résumé.
- Générer 15 questions pour une leçon normale.
- Générer 20 questions pour une leçon longue.
- Couvrir l'ensemble du contenu.
- Proposer QCM, Vrai/Faux, définitions et applications.
- Fournir les corrections suggérées.

**La publication nécessite toujours l'approbation de l'administrateur.**

Après publication :
- Délai de 15 jours par défaut.
- Rappels internes 3 jours et 1 jour avant l'échéance.
- Une première tentative complète dans les délais prise en compte dans l'activité.
- Tentatives suivantes autorisées pour l'entraînement.
- Prolongation possible par l'administrateur.
- Aucun retard automatiquement sanctionné sans règle validée.
- Résultats individuels et statistiques par classe.

Avant l'intégration réelle de l'IA, créer seulement les interfaces et les structures nécessaires. Ne pas simuler de véritables corrections automatiques.

# 12. CORRECTION DES EXERCICES MANUSCRITS

Pour les séries publiées :

1. L'élève sélectionne le chapitre, la série et l'exercice.
2. Il téléverse des photos de sa solution manuscrite.
3. Si l'énoncé est déjà dans la plateforme, il n'a pas besoin de le recopier.
4. Dans une version future, l'IA résout l'exercice indépendamment.
5. Elle compare sa solution à celle de l'élève.
6. Elle produit des remarques pédagogiques en français et une note suggérée.
7. L'administrateur peut vérifier ou corriger le résultat.

Première tentative valide : comptabilisation possible dans l'activité après vérification.

Tentatives ultérieures : entraînement.

Prévoir une détection indicative de photos identiques ou très similaires entre soumissions, avec signalement pour vérification humaine, sans accusation automatique de tricherie.

En cas d'écriture illisible, de schéma ambigu ou de faible confiance, demander une révision humaine.

**Ce module IA n'est pas prioritaire et ne doit pas être présenté comme opérationnel avant son intégration et sa validation.**

# 13. BIBLIOTHÈQUE ET PUBLICATION

L'administrateur doit pouvoir téléverser :
- PDF.
- Documents Word.
- Images.
- Vidéos ou liens vidéo.
- Supports de présentation.

Chaque ressource comporte :
- Titre.
- Type.
- Matière.
- Chapitre.
- Classe(s).
- Description.
- Date.
- Visibilité publique ou privée.
- État : brouillon, publié ou archivé.
- Date de publication programmée, si nécessaire.

Respecter les droits d'accès côté serveur et dans le stockage, pas seulement dans l'interface.

# 14. FONCTIONNALITÉS COMPLÉMENTAIRES VALIDÉES

## Calendrier scolaire

- Calendrier des devoirs.
- Échéances des exercices et QCM.
- Dates de publication.
- Vue administrateur et vue élève.
- Filtres par classe et matière.

## Recherche

- Recherche globale dans les ressources autorisées.
- Recherche par titre, matière, chapitre et type.
- Filtres combinables.
- Résultats rapides et lisibles.

## Export PDF et Excel

Pour l'administrateur :
- Listes de classe.
- Activités et statistiques.
- Notes d'activité.
- Bilans individuels.
- Bilans par classe et semestre.

Les exports doivent respecter les permissions et éviter toute exposition publique des informations des élèves.

## Mode présentation

Prévoir un affichage plein écran adapté au vidéoprojecteur :
- Cours.
- Résumés.
- Illustrations et schémas.
- Exercices.
- Supports pédagogiques.

Interface lisible en classe, avec commandes simples et mode de sortie clair.

## Contact enseignant

Un bouton WhatsApp ouvre une conversation avec un message prérempli, après configuration du numéro par l'administrateur.

Aucune messagerie intégrée. Aucun rappel automatique par WhatsApp.

# 15. ARCHITECTURE TECHNIQUE

Tu dois proposer et implémenter une architecture adaptée à une plateforme éducative sécurisée et maintenable.

Infrastructure souhaitée :
- GitHub pour le code et les versions.
- Vercel pour le frontend et les éventuelles fonctions serveur compatibles.
- Supabase pour l'authentification, les données et le stockage.

Choisir un framework adapté après examen du dépôt existant. Si une migration du HTML statique est nécessaire, procéder de manière contrôlée, justifier le choix et préserver les fonctionnalités déjà disponibles.

Prévoir :
- Composants réutilisables.
- Routes structurées.
- Schéma relationnel cohérent.
- Migrations versionnées.
- Supabase Row Level Security.
- Autorisations par rôle, classe et propriétaire de données.
- Accès sécurisé aux documents et photos.
- Variables d'environnement séparées.
- Aucun secret dans le dépôt ni dans le JavaScript public.
- Validation des entrées.
- Protection des uploads.
- Journalisation des actions sensibles.
- Sauvegarde et restauration à planifier.
- États de chargement et gestion des erreurs.

Ne pas exposer les données réelles d'élèves avant validation des contrôles d'accès, de la protection des données et des mesures nécessaires pour les mineurs.

Utiliser des données fictives réalistes pour les démonstrations.

# 16. TESTS ET QUALITÉ

Mettre en place des tests pour :
- Navigation.
- Responsivité mobile et desktop.
- Interactions des cartes et boutons.
- Affichage des chapitres.
- Filtres et recherche.
- Permissions élèves.
- Restrictions invités.
- Authentification admin.
- Inscription par invitation.
- Protection des ressources privées.
- Enregistrement des activités.
- Calculs de notes.
- Export des fichiers.
- Absence d'erreurs JavaScript.
- Accessibilité de base.
- Déploiement Vercel.

Tester les opérations sensibles au niveau backend et pas uniquement par des tests visuels.

Un test manquant doit être signalé : ne jamais prétendre qu'un module a été entièrement vérifié sans preuve.

# 17. PLAN D'EXÉCUTION

Le cahier des charges est unique, mais la réalisation se fait par phases avec validation à chaque étape.

## PHASE 0 — AUDIT ET STABILISATION

- Examiner le dépôt existant.
- Vérifier les branches et Pull Requests.
- Vérifier Vercel et le build.
- Identifier les problèmes existants.
- Créer `SPECIFICATIONS.md` et `ROADMAP.md`.
- Définir l'architecture cible.

**Livrable :** projet stabilisé et plan technique documenté.

## PHASE 1 — REFONTE VISUELLE

- Nouvelle landing page premium 3D.
- Navigation responsive.
- Espace Élève et Accès Invité.
- Prévisualisations de l'espace élève.
- Animations et interactions optimisées.
- Tests desktop/mobile.

**Livrable :** démonstration visuelle complète avec captures d'écran.

## PHASE 2 — ARCHITECTURE PÉDAGOGIQUE

- Niveaux et classes.
- Matières.
- Chapitres.
- Cours, résumés, exercices et séries.
- Devoirs surveillés.
- Recherche.
- Calendrier.
- Mode présentation.

**Livrable :** parcours pédagogique démontrable de bout en bout, avec données fictives.

## PHASE 3 — AUTHENTIFICATION ET BASE DE DONNÉES

- Intégration Supabase.
- Authentification administrateur.
- Comptes élèves.
- Invitation unique.
- Permissions et RLS.
- Stockage privé des documents et photos.
- Tests de sécurité.

**Livrable :** comptes et données sécurisés en environnement de test.

## PHASE 4 — ADMINISTRATION ET SUIVI

- Gestion des élèves.
- Actions rapides en classe.
- Calcul de l'activité.
- Statistiques.
- Validation des notes.
- Historique et annulation.
- Rapports PDF/Excel.

**Livrable :** tableau de bord administrateur opérationnel, avec données de test.

## PHASE 5 — ÉVALUATIONS ET PROGRESSION

- Publication des questions de cours.
- QCM manuels.
- Suivi des tentatives.
- Délais et rappels internes.
- Progression individuelle.
- Exploitation pédagogique des résultats.

**Livrable :** système d'évaluations manuelles et de suivi fonctionnel.

## PHASE 6 — MODULES IA (ULTÉRIEUREMENT)

- Génération de questions à partir des résumés.
- Correction assistée de solutions manuscrites.
- Contrôles et validation humaine.
- Gestion des coûts, quotas et erreurs.

**Livrable :** modules IA intégrés uniquement après configuration des services et vérification de leur fiabilité.

## PHASE 7 — VALIDATION ET MISE EN SERVICE

- Vérification de sécurité.
- Contrôles fonctionnels.
- Vérification mobile.
- Contrôle des exports et permissions.
- Vérification du stockage et des sauvegardes.
- Tests avec comptes fictifs.
- Documentation d'utilisation en français.
- Déploiement contrôlé.

**Livrable :** version prête pour un usage réel seulement si les exigences de sécurité et de protection des données sont satisfaites.

# 18. RÈGLES DE COLLABORATION AVEC MOI

Je suis enseignant et je ne programme pas.

Pour chaque phase :
1. Explique brièvement en français ce que tu vas réaliser.
2. Modifie réellement le code.
3. Exécute les tests possibles.
4. Fournis les résultats, captures d'écran et liens accessibles.
5. Crée une branche et une Pull Request.
6. Liste ce qui fonctionne et ce qui reste à faire.
7. Indique précisément les manipulations nécessaires de ma part, notamment pour les comptes, secrets ou autorisations.
8. Ne fusionne pas la Pull Request et ne déploie pas en production sans validation.
9. Mets à jour `ROADMAP.md` après chaque phase.
10. Continue en respectant toutes les décisions prises dans ce cahier des charges.

Ne bloque pas le travail pour des choix mineurs : utilise des valeurs par défaut professionnelles. Demande mon intervention uniquement pour les accès, secrets, coûts, décisions pédagogiques importantes ou validations sensibles.

**Commence immédiatement par la PHASE 0, puis réalise la PHASE 1. Prépare une Pull Request contenant ces premières améliorations et fournis une démonstration vérifiable avant de poursuivre vers le backend.**

**Objectif final : faire de PhysiX une véritable plateforme éducative de Physique-Chimie, professionnelle, dynamique, organisée, sécurisée et agréable à utiliser quotidiennement.**