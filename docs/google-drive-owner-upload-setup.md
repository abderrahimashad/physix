# PhysiX — Activer les PDF privés sur Google Drive personnel

## État et frontières de sécurité

Le propriétaire a confirmé le compte `dahim78@gmail.com` pour le dossier Drive `PhysiX` :

- Dossier racine privé (Drive ID) : `1yMgX32A4in4MqJaOlWkhcQek-3Z_Lcf_`
- Sous-dossiers privés constatés : `1BAC BIOF G1`, `1BAC BIOF G2`, `1BAC BIOF G3`, `2BAC PC BIOF`
- Les données privées ne sont pas publiées ; le connecteur ChatGPT a confirmé que le dossier principal n'est partagé avec personne.

L'intégration préparée ici doit **rester en PR** jusqu'à ce que les identifiants publics Google Cloud soient configurés et qu'un PDF **fictif** ait été importé puis ouvert/supprimé avec le compte propriétaire.

## Configuration manuelle Google Cloud (nécessaire une seule fois)

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/) en utilisant le Google `dahim78@gmail.com`. Créer un nouveau projet (par ex. `PhysiX-Drive`).
2. Activer dans **APIs & Services → Library** les API **Google Drive API** et **Google Picker API**.
3. Dans **Google Auth Platform / OAuth consent screen**, configurer l'application pour un usage de test, ajouter l'adresse `dahim78@gmail.com` comme utilisateur de test et demander uniquement le scope `https://www.googleapis.com/auth/drive.file`. Ne pas utiliser le scope complet `drive`.
4. Créer un **OAuth Client ID → Web application**, ajouter l'**origine JavaScript autorisée** : `https://physix-rho.vercel.app` (sans chemin). Pour tester une URL preview, il faut également autoriser son origine exacte.
5. Créer une **API key Google Picker** ; appliquer des restrictions HTTP referrer `https://physix-rho.vercel.app/*`, et une restriction API **Google Picker API**. Vérifier les restrictions requises par la console Google pour l'environnement de prévisualisation.
6. Relever **trois identifiants publics** : `OAuth Client ID`, `API key restreinte`, `Project number` (numéro numérique du projet, utilisé comme `appId`). **Ne jamais fournir de client secret, refresh token, service-account JSON ou mot de passe.**
7. Remplir les trois champs publics dans `assets/drive-config.js` :
   - `clientId`
   - `pickerApiKey`
   - `appId`

Le fichier `drive-config.js` est explicitement désactivé tant que ces champs sont vides. **Le fait que Google Drive soit connecté à ChatGPT n'autorise pas automatiquement PhysiX** ; PhysiX doit obtenir son consentement OAuth distinct.

## Parcours utilisateur prévu

1. Se connecter à `/admin` avec le compte **propriétaire Supabase** comme aujourd'hui.
2. Sélectionner la classe, le type de document puis le fichier PDF.
3. Cliquer sur **« Autoriser mon Google Drive »**, choisir `dahim78@gmail.com` et accepter uniquement l'accès de l'application aux fichiers qu'elle ouvre/crée.
4. Au premier import de chaque classe, **sélectionner son dossier exact** via Google Picker. Les nouveaux groupes non mappés utilisent le dossier racine PhysiX et peuvent être mappés ensuite après création de leur dossier dans Drive.
5. L'import est direct navigateur → Drive avec une session d'envoi reprenable par blocs de 8 MiB ; **le corps du fichier ne transite pas par une fonction Vercel**, évitant sa limite de requête.
6. Une fois le fichier confirmé, `physix_resource_files` stocke son identifiant opaque `drive_file_id`, son fournisseur `storage_provider='google_drive'`, son nom et sa taille. La fiche et les classes restent sécurisées par le RLS de Supabase.
7. L'ouverture du document Google utilise une page Drive privée réservée au compte Google autorisé. La suppression exige une connexion Drive et ne rend jamais le fichier public.

## Coexistence et limites

- Les PDF déjà présents dans **Supabase Storage** sont conservés et restent lisibles/supprimables avec l'ancien connecteur.
- Les nouveaux PDF iront dans **Google Drive uniquement lorsque OAuth sera configuré**. Sans cette configuration, le formulaire existant reste en mode Supabase (limité à 50 MiB) ; ne pas fusionner le PR prématurément si cela peut surprendre l'enseignant.
- La taille maximale de la fiche Google Drive est fixée en SQL à 5 TiB, à distinguer du quota réel du compte Google et des restrictions Google par fichier. L'utilisateur a déclaré disposer de 5 To, mais nous n'avons pas mesuré ce quota.
- Cette **première étape est réservée au propriétaire** : aucun accès aux élèves par la Drive API n'est activé. Ne pas envoyer les liens Drive privés aux élèves ; l'autorisation côté serveur pour lecture élève devra faire l'objet d'une implémentation séparée.
- Le pont navigateur conserve le jeton OAuth **uniquement en mémoire** ; il ne place pas le jeton dans localStorage ni Supabase. La connexion Google doit être répétée à la prochaine session.
- Les gros fichiers utilisent la méthode résumable Google Drive ; la reprise automatique après **fermeture complète du navigateur** n'est pas encore implémentée. Les erreurs de réseau lors du dernier bloc, les reprises partielles et la cohérence de la base doivent être testées sur vrais fichiers fictifs.
- Il faut vérifier que les appels Drive CORS, l'en-tête `Location` de la session résumable et le Google Picker fonctionnent effectivement depuis le domaine Vercel après configuration. Aucun test OAuth de bout en bout n'a été effectué.
- Un fichier téléversé dans Drive puis refusé par Supabase est supprimé si l'API autorise le nettoyage ; un échec du nettoyage nécessite une intervention manuelle, sans exposer le fichier publiquement.
- Pour ajouter des groupes de classe au-delà des quatre dossiers initiaux, la sélection d'un autre dossier dans la console Drive n'est pas automatique. Il faut créer ou mapper les dossiers supplémentaires avec l'ID exact.

## Références

- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.google.com/workspace/drive/picker/guides/overview
- https://developers.google.com/workspace/drive/api/guides/manage-uploads
- https://developers.google.com/identity/gsi/web/guides/use-token-model
