# PhysiX — PDF privés dans l'administration

## Fonctionnalité préparée

Après connexion réelle du propriétaire dans `/admin` :

1. Créer un chapitre, puis une ressource (Cours, Résumé, Série, Exercices, Correction, etc.) ; ou créer un devoir surveillé.
2. Ouvrir l'onglet **Ressources** ou **Devoirs surveillés**.
3. Dans **Fichiers PDF privés**, sélectionner la ressource / le devoir, la nature du document et un PDF (maximum 20 Mo).
4. Cliquer sur **Importer le PDF privé**. Le fichier est transféré dans le bucket `physix-private` ; ses métadonnées sont enregistrées ensuite dans `physix_resource_files`.
5. Utiliser **Ouvrir PDF** pour consulter le document via une requête authentifiée et un blob URL temporaire, ou **Supprimer** pour enlever le fichier et sa fiche.

**Aucun PDF n'est accessible via les boutons Invité / Élève**. Même pour les ressources marquées « published/public », la lecture du PDF reste limitée au propriétaire. La future publication aux élèves nécessitera des politiques, tests de confidentialité, et autorisations distinctes.

## Sécurité vérifiée / à vérifier

- Bucket `physix-private` : `public = false`, `application/pdf`, taille maximale 20 MiB.
- Storage : politiques `SELECT`, `INSERT`, `DELETE` uniquement pour `authenticated`, sous le dossier de `auth.uid()`, avec vérification de `private.physix_is_owner`. À l'import le fichier doit se trouver dans le sous-dossier `resource/<uuid>` ou `devoir/<uuid>`, avec correspondance d'une fiche que possède le même utilisateur. **Aucune politique UPDATE** : pas de remplacement/upsert.
- Métadonnées : table `physix_resource_files` déjà protégée par RLS propriétaire.
- Client : uniquement clé `sb_publishable_`, JWT en mémoire, aucune clé de service, aucun URL public, aucune donnée élève, signature de début de PDF et limites d'extension/type/taille.
- Si l'enregistrement de la fiche échoue après transfert, le client tente d'effacer le fichier. Si le retrait du fichier échoue, il peut rester un PDF orphelin dans le bucket privé, à nettoyer manuellement.
- Si la suppression des métadonnées échoue après retrait du PDF, une fiche orpheline peut rester. Recharger la page et intervenir administrativement si besoin.

## Étapes de recette avant usage

1. Tester avec le propriétaire réel : importer, ouvrir et supprimer un petit PDF **fictif** lié à une ressource / un devoir de test.
2. Vérifier via navigateur non connecté / clé publishable seule que les chemins PDF privés répondent par un refus, ainsi que la lecture de `physix_resource_files`.
3. Tester un second compte sans rôle propriétaire et vérifier que tous les accès aux objets sont refusés.
4. Vérifier l'absence de documents publics et de fuites dans les outils de développement réseau ; conserver la session utilisateur hors stockage navigateur.
5. Vérifier le comportement en cas d'expiration du JWT et d'erreur réseau.

Cette branche comporte du code prêt à tester et les policies Storage ont été appliquées sur le projet Supabase le 6 novembre 2026 ; **l'interface n'est pas en production tant que la PR n'est pas fusionnée**. La migration distante porte la version Supabase `20261106002110`, distincte du préfixe local `20261106000100` ; réconcilier l'historique des migrations avant d'automatiser `supabase db push`.

Avertissement actif du Security Advisor : « Leaked Password Protection Disabled » ; voir https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
