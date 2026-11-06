# PhysiX — PDF privés dans l'administration

## Fonctionnalité préparée

Après connexion réelle du propriétaire dans `/admin` :

1. Créer un chapitre, puis une ressource (Cours, Résumé, Série, Exercices, Correction, etc.) ; ou créer un devoir surveillé.
2. Ouvrir l'onglet **Ressources** ou **Devoirs surveillés**.
3. Dans **Fichiers PDF privés**, sélectionner la ressource / le devoir, la nature du document et un PDF (maximum 50 Mo).
4. Cliquer sur **Importer le PDF privé**. Le fichier est transféré dans le bucket `physix-private` ; ses métadonnées sont enregistrées ensuite dans `physix_resource_files`.
5. Utiliser **Ouvrir PDF** pour consulter le document via une requête authentifiée et un blob URL temporaire, ou **Supprimer** pour enlever le fichier et sa fiche.

**Aucun PDF n'est accessible via les boutons Invité / Élève**. Même pour les ressources marquées « published/public », la lecture du PDF reste limitée au propriétaire. La future publication aux élèves nécessitera des politiques, tests de confidentialité, et autorisations distinctes.

## Sécurité vérifiée / à vérifier

- Bucket `physix-private` : `public = false`, `application/pdf`, taille maximale 50 MiB.
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


## Affectation aux classes (nouveau)

Dans « Ajouter un PDF », sélectionner d'abord un **Chapitre**, puis cocher les classes destinataires :

- Chapitre niveau `1BAC` : `1BAC BIOF G1`, `1BAC BIOF G2`, `1BAC BIOF G3` ; choix multiple possible.
- Chapitre niveau `2BAC PC` : `2BAC PC BIOF` ; case cochée par défaut.
- La sélection est obligatoire à l'import et enregistrée comme tableau `physix_resources.target_classes` avec la fiche privée.
- Les PDF préexistants sans classe restent `target_classes = '{}'`, donc **non attribués** ; aucune classe n'est devinée automatiquement.
- Ces classes sont de simples **métadonnées d'affectation** ; elles n'ouvrent **aucune lecture aux élèves**. Le contrôle effectif d'accès par élève reste à construire, vérifier et tester avant publication des documents.
- Migration appliquée au projet Supabase sous `physix_resource_target_classes` ; fichier source `supabase/migrations/20261106000200_physix_resource_target_classes.sql`.


## Nouveau parcours : classe → type → PDF

- L'enseignant choisit **d'abord la classe**, puis **Cours / Série / Devoir surveillé / Résumé / Exercices / Correction / ...**, puis le PDF. Le titre vient du nom de fichier.
- La matière (Physique par défaut), un chapitre existant, et le titre manuel sont des **options facultatives** ; sinon le système crée / réutilise le chapitre technique « Documents généraux » du bon niveau et de la bonne matière.
- Le bouton « Ajouter / retirer une classe » ouvre la gestion des classes. Les classes ajoutées sont enregistrées dans `physix_classes` et protégées par RLS propriétaire. « Retirer » désactive le choix pour de nouveaux documents, mais ne supprime pas les anciens PDF.
- Les classes initiales sont G1, G2, G3 de 1BAC et 2BAC PC BIOF. La liste n'est plus codée en dur. Chaque PDF possède une classe destinataire enregistrée dans `target_classes`, contrôlée en base par trigger.
- « Devoir surveillé » dans ce formulaire est **une catégorie de ressource PDF**, distincte du module structuré `physix_devoirs` ; aucune distribution de corrigé aux élèves n'est activée.
- La limite est passée de 20 MiB à **50 MiB** pour le bucket, la validation navigateur et les métadonnées. Vérifier aussi que la configuration globale Supabase autorise ce plafond. En projet Free, Supabase n'autorise pas plus de 50 MB : https://supabase.com/docs/guides/storage/uploads/file-limits
- Pour les documents au-delà de 50 MB : réduire le poids du PDF ou choisir plus tard une offre/solution de stockage plus adaptée, avec approbation du titulaire. Le frontend ne contourne pas la limite du fournisseur.
- Les imports >6 MB utilisent pour l'instant un transfert standard, techniquement possible mais moins robuste qu'un téléchargement TUS réessayable : https://supabase.com/docs/guides/storage/uploads/resumable-uploads . Tester avec un PDF fictif de 25-40 Mo avant usage réel.
- Le frontend reste en revue jusqu'à un déploiement Vercel réussi : le compte Vercel Free a affiché `build-rate-limit` pendant la série de commits. Ne jamais confondre succès de migration avec publication du site.
