# PhysiX — Migration envisagée du stockage PDF vers Google Drive

## Décision en attente de vérification

Le propriétaire préfère exploiter son offre Google Drive (annoncée 5 To) pour les PDF, plutôt que le bucket Supabase Storage. **Ne pas encore migrer, retirer ni rendre publics les fichiers actuels.** Le compte Google Drive connecté à ChatGPT peut différer du compte porteur des 5 To : obtenir confirmation du propriétaire avant toute création de dossier ou liaison OAuth. Lier un compte Google Drive dans ChatGPT ne fournit **pas** à la web app PhysiX les jetons OAuth requis.

## Architecture cible

- **Supabase** : authentification des enseignants/élèves, liste des classes, chapitres, ressources, affectations, permissions métier avec RLS. Une ligne de métadonnées par fichier contient `provider='google_drive'`, un `drive_file_id` opaque, le nom, le MIME, la taille et l'ID de la ressource.
- **Google Drive personnel contrôlé par le propriétaire** : dossiers privés dans un dossier racine `PhysiX` ; aucune option « Toute personne disposant du lien ».
- **Backend Vercel / serverless** : vérifie le JWT Supabase **côté serveur**, vérifie le rôle propriétaire pour importer, supprimer et modifier et l'autorisation de l'élève pour télécharger. Le backend détient le jeton OAuth de renouvellement Google chiffré ou stocké dans le coffre/secret de plateforme et utilise le scope limité `https://www.googleapis.com/auth/drive.file`. Ne jamais exposer de refresh token Google aux navigateurs ou au dépôt.
- **Import** : client PhysiX → backend autorisé → Drive API, session de téléversement reprenable lorsque nécessaire. Pour de grands fichiers, vérifier les plafonds de taille des fonctions Vercel ; préférer un mécanisme qui évite de faire passer le corps entier par une fonction limitée. Aucune mise en ligne directe possible avec le seul connecteur ChatGPT.
- **Accès élèves** : backend vérifie leur classe/permissions ; il sert ensuite le PDF via une voie authentifiée limitée dans le temps. Les permissions Drive elles-mêmes restent **privées**. Ne pas afficher un lien public Drive.
- **Suppression** : d'abord marquer la ressource dans une transaction métier et coordonner suppression Drive / métadonnées de manière réessayable. Journaliser les échecs d'une des deux étapes.

## Déroulement sans perte

1. Confirmer l'identité du compte Google Drive disposant de 5 To et l'autorisation de le relier à PhysiX.
2. Créer un dossier privé dédié `PhysiX` sous ce bon compte, vérifier les permissions.
3. Ajouter un flux OAuth Google Drive spécifique à l'application (client ID et secret gérés hors du code).
4. Développer l'adaptateur backend, vérifier la persistance des sessions et le téléchargement par rôles.
5. Tester import, lecture, liste, déconnexion, suppression et refus à un compte non autorisé.
6. Migrer les éventuels PDF Supabase existants par lots après inventaire, comparaison des tailles et checksum ; ne supprimer les objets source qu'après vérification et accord du propriétaire.
7. Surveiller quotas Drive API, stockage et éventuels coûts de transfert/serveur.

## Références officielles

- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.google.com/workspace/drive/api/guides/manage-uploads
- https://developers.google.com/workspace/drive/api/guides/manage-downloads
- https://developers.google.com/identity/protocols/oauth2/web-server

## État technique au 6 novembre 2026

Le site actuel continue d'utiliser le bucket privé `physix-private` et l'interface d'upload correspondante ; **aucun changement de backend ou de routage du stockage n'est inclus dans cette documentation**. Le build gratuit Vercel a par ailleurs atteint sa limite quotidienne dans la session précédente. Ce plan n'autorise ni publication publique de Drive ni copie automatique vers un compte non confirmé.
