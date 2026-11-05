# PhysiX — Activation du compte propriétaire et correction de localhost

## État

- Supabase `PhysiX` existe et sa première migration RLS est appliquée.
- Le propriétaire invité a été rattaché à `physix_owners` **par une opération SQL administrative**, jamais par le formulaire web ; l'activation de l'invitation est encore à terminer.
- L'interface `/admin` comporte une connexion propriétaire par email / mot de passe ; après authentification, elle vérifie le rôle via RLS (`physix_owners`). **L'interface CRUD du catalogue n'utilise pas encore le backend** et `/admin-demo` reste une démo publique, sans données réelles.
- `/auth-confirm` reçoit le jeton de l'invitation ou de la récupération dans le fragment URL, efface le fragment de la barre d'adresse, vérifie le rôle et permet de choisir un mot de passe de 12 caractères minimum. Le mot de passe est transmis exclusivement à l'API Auth de Supabase. Aucun secret privilégié n'est dans le dépôt ; seul un `sb_publishable_...` public est utilisé.

## Correction nécessaire dans Supabase Dashboard (aucun accès MCP pour ce réglage Auth)

Après déploiement de `auth-confirm.html` dans une **URL Vercel stable et vérifiée** :

1. Identifier le vrai domaine stable PhysiX dans Vercel (pas l'URL éphémère d'un déploiement de Pull Request).
2. Aller à **Authentication → URL Configuration** du projet PhysiX : https://supabase.com/dashboard/project/auqzfcucpglrnvwhjamo/auth/url-configuration
3. Régler **Site URL** sur `https://VOTRE-DOMAINE-STABLE/auth-confirm` (remplacer par le domaine réel complet). Ne pas laisser `http://localhost:3000`.
4. Ajouter **Redirect URLs** : `https://VOTRE-DOMAINE-STABLE/auth-confirm`. Les URL de prévisualisation peuvent être listées séparément pour les tests, mais ne doivent pas remplacer la Site URL stable.
5. Enregistrer. La configuration ne répare **pas** les anciens liens expirés : il faut en demander un nouveau depuis Supabase Auth. L'interface `/admin` propose également un lien de récupération pour le compte existant après réglage des URL.
6. Ouvrir le message le plus récent et définir le mot de passe via `/auth-confirm`. Ne partager aucun lien d'invitation, jeton ou mot de passe.

## Tests à compléter avant tout usage réel

- Tester le parcours intégral invitation → `/auth-confirm` → nouveau mot de passe → `/admin`.
- Tester refus de connexion d'une identité authentifiée non propriétaire.
- Vérifier sur l'API Supabase que l'identité non propriétaire ne peut lire/modifier les fiches.
- Vérifier que toutes les données sensibles et tous les fichiers restent non accessibles au navigateur invité.
- Le frontend n'envoie ni fichiers PDF ni données d'élèves à Supabase ; aucun accès public aux tables n'a été ajouté.

## Limitations

- Sans modification de la **Site URL** dans le Dashboard, Supabase continue de rediriger vers localhost.
- Le statut d'authentification présenté par l'interface n'ouvre pas automatiquement les fonctions `admin-demo` (non sécurisées).
- Pour l'instant le client ne persiste pas la session de connexion entre les chargements ; la connexion valide la propriété, puis annonce que l'édition privée viendra après tests.
