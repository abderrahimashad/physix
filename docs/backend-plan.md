# PhysiX — prochaine étape sécurisée

Avant toute donnée réelle, créer un projet Supabase et appliquer des migrations revues et testées. Ce document est un plan, pas une base déjà déployée.

- Authentification Supabase Auth ; le rôle propriétaire doit être attribué uniquement côté serveur, jamais par un formulaire, un paramètre URL ou une valeur localStorage. Vérifier session et rôle pour chaque opération privilégiée.
- Tables envisagées : classes, profils, inscriptions, ressources, séances, événements pédagogiques, évaluations, devoirs, tentatives et invitations. Les quatre classes existantes sont conservées.
- Activer RLS sur toutes les tables : propriétaire autorisé à gérer ses classes ; élève limité à son profil et sa classe ; invité limité aux ressources explicitement publiques. Tester les accès avec plusieurs identités et des requêtes directes à l’API, y compris les refus.
- Invitations générées côté serveur avec jetons aléatoires, empreinte stockée, expiration et consommation atomique à usage unique. Limiter les tentatives. Aucune liste publique d’élèves ni clé service_role dans le frontend.
- Stockage privé des fichiers et accès temporaires signés après vérification des droits. Les fiches actuelles ne contiennent aucun PDF joint.
- Statistiques par élève, classe, semaine et semestre fondées sur les événements datés et le calendrier scolaire configuré. Fuseau Africa/Casablanca. Les absences et incidents ne doivent pas devenir arbitrairement des pourcentages de réussite.
- Note proposée sur 20 : critères, occasions évaluées et pondérations explicites, versionnés et configurables ; note manuelle finale avec motif et historique des changements. Ne pas inventer de barème sans décision pédagogique.
- Questions de cours, séries et devoirs : distinguer attribution, remise, tentative et correction. L’IA restera derrière une fonction serveur avec contrôle des droits, quotas et validation du professeur avant publication d’une note. Aucune clé IA côté navigateur.

Les contrôles d’accès côté interface ne protègent pas les données. La mise en service requiert les tests RLS, les parcours d’inscription et de récupération de compte, ainsi qu’une politique de conservation des données adaptée aux élèves mineurs.
