# PhysiX — Installation Supabase (fondation sécurisée, NON activée)

Ce lot **prépare** le backend : il ne connecte pas encore le site public, n'active pas de comptes d'élèves et ne permet pas de téléverser des fichiers réels. La démo locale existante reste indépendante.

## Avant d'exécuter quoi que ce soit

1. Créer vous-même un projet de **test** Supabase depuis votre propre compte.
2. Activer Supabase Auth et créer **uniquement votre utilisateur propriétaire de test**. Désactiver la création de comptes publics pour l'instant dans la configuration Auth. Aucun utilisateur élève réel.
3. Dans **SQL Editor**, lire puis exécuter `supabase/migrations/20261105000100_physix_owner_content.sql` dans le projet de test.
4. Depuis **Authentication → Users**, relever l'UUID du compte propriétaire ; ne jamais publier son email, son mot de passe, sa session ou le secret `service_role`.
5. Dans **SQL Editor uniquement**, après avoir vérifié l'UUID du compte :
   ```sql
   -- Remplacer ce placeholder UNIQUEMENT dans le SQL Editor du projet Supabase.
   insert into public.physix_owners(user_id)
   values ('00000000-0000-0000-0000-000000000000'::uuid);
   ```
   **Ne pas exécuter cet exemple avec l'UUID fictif.** Utiliser son propre UUID réel, ne pas le coller dans ChatGPT ni GitHub. Ce bootstrap ne doit jamais être fait par formulaire web, API client ou lien public.
6. Contrôler dans Supabase Table Editor que les quatre tables pédagogiques possèdent RLS **ON** et les politiques `physix_*_owner`. Vérifier que le bucket `physix-private` est **PRIVATE**.
7. Exécuter le protocole de tests ci-dessous avec le vrai JWT d'un propriétaire et d'un utilisateur test non propriétaire. **Aucun secret dans les captures, conversations ou commits.**

## Cas indispensables à tester avant de connecter le frontend

| Identité / action | Résultat requis |
|---|---|
| Anonyme SELECT / INSERT / UPDATE / DELETE chapitres | Refus |
| Utilisateur Auth non propriétaire SELECT / INSERT / UPDATE / DELETE | Refus |
| Propriétaire : écrire et lire son propre chapitre | Autorisé |
| Propriétaire : modifier `owner_id` vers un autre utilisateur | Refus |
| Propriétaire : lier une ressource à un chapitre d'un autre owner | Refus par clé étrangère composite |
| Anonyme et utilisateur non propriétaire : métadonnées de fichiers | Refus |
| Utilisateur authentifié : upload direct dans `physix-private` | Refus |
| Tous les rôles publics : lecture de PDF depuis `physix-private` | Refus tant qu'aucun mécanisme signé n'est implémenté |

**Attention** : le propriétaire est autorisé à consulter les métadonnées SQL, mais ne peut pas encore uploader ni télécharger un document du bucket privé. C'est volontaire : pas de politique Storage permissive et pas de liens signés exposés. Le prochain lot doit créer des fonctions serveur qui contrôlent la session, le propriétaire, la taille et le MIME de chaque fichier avant upload et avant signature temporaire.

## Séparation des secrets

- `SUPABASE_URL` : URL du projet, à mettre en variable d'environnement plus tard.
- `SUPABASE_ANON_KEY` / publishable key : utilisable par client, **mais n'accorde aucun droit à elle seule**.
- `SUPABASE_SERVICE_ROLE_KEY` ou secret key à privilèges élevés : **serveur uniquement**. Ne jamais la coller dans une page HTML, GitHub, Vercel preview client ou ce chat.
- Les uploads doivent vérifier les octets du PDF, et pas seulement l'extension ou le type navigateur.

## Limites de la migration

- Aucune table d'élèves, d'inscriptions ou de notes réelles.
- Aucune exposition `anon` même pour les ressources marquées `public` : ouverture des ressources publiques à concevoir via endpoint serveur strictement filtré.
- Pas de synchronisation des maquettes `admin-demo` / `catalogue` vers Supabase.
- Pas de test d'intégration exécuté contre une base Supabase réelle.
- Ne pas merger les PR de la chaîne séparément. Cette branche dérive de #7, puis #6/#5/#4/#3.
