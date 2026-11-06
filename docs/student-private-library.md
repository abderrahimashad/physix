# PhysiX — espace élève privé

## Parcours professeur
1. Connectez-vous à `/admin`, choisissez la classe, créez un chapitre et importez un PDF.
2. Dans **Accès élèves et publication des documents**, entrez l'adresse e-mail autorisée et la classe.
3. Pour chaque PDF, cliquez **Publier** et confirmez. Les états `published` du chapitre et de la ressource/devoir sont fixés à ce moment.
4. Le fichier est alors disponible **uniquement** aux élèves confirmés et autorisés pour cette classe.
5. Cliquez **Masquer** ou **Révoquer** pour retirer l'autorisation immédiatement.
6. Les corrections de devoir nécessitent aussi `correction_state='authorized'` depuis Gestion avancée.

## Parcours élève
- Accédez à `/eleve.html` depuis l'accueil.
- Saisissez l'e-mail autorisé par le professeur, ouvrez le lien de connexion reçu (ou le code, si le template OTP fournit un code).
- La bibliothèque appelle `physix_my_student_library()` (RPC défini avec contrôle strict de l'identité, classe, publication, état et autorisation de correction).
- Les PDF sont récupérés avec le JWT Supabase depuis le bucket `physix-private`; il n'y a **aucun lien public**.
- La session élève est en mémoire uniquement; toute recharge sans lien d'authentification demande une nouvelle connexion.

## Stockage
- L'original Google Drive reste dans le Drive privé de l'enseignant.
- Lors de la **première publication** d'un PDF Google Drive de **50 Mo maximum**, l'enseignant connecté autorise une copie privée dans Supabase Storage afin de rendre le fichier lisible via RLS par les élèves. La copie ne rend pas le Drive public.
- Les PDFs Supabase existants sont publiés par association à leur chemin existant, sans copie.
- Les fichiers Google Drive de plus de 50 Mo ne peuvent pas être diffusés aux élèves avec ce mécanisme; il faudra ultérieurement une passerelle serveur sécurisée ou un stockage privé acceptant de plus gros volumes.
- Une suppression d'une publication masque l'accès; la suppression manuelle d'une copie privée devenue orpheline peut être nécessaire pour libérer l'espace. **Ne jamais supprimer l'original Drive par erreur.**

## Sécurité et tests
- `physix_student_access` contient la liste blanche des adresses, modifiable uniquement par le propriétaire via RLS.
- `physix_student_publications` contient la publication explicite par fichier et classe.
- `private.physix_student_can_see_publication` vérifie une adresse Supabase Auth confirmée via `auth.users`, une invitation activée, la bonne classe, la publication, l'état `published` et les droits de correction.
- `storage.objects` n'autorise la lecture élève que pour les chemins associés à une publication vérifiée et l'opération de téléchargement authentifiée.
- Les tables originales `physix_*` conservent leurs règles d'accès propriétaire.
- Aucun test d'e-mail élève réel ni lecture PDF réelle depuis un compte élève n'est réalisé sans participation d'un compte de test.
- Après la publication Vercel, tester manuellement: professeur → e-mail invité → publication PDF de test → connexion élève → lecture → Masquer → accès refusé, puis Révoquer → accès refusé.
- Si aucun e-mail de connexion n'arrive, vérifier `Authentication > URL Configuration` dans Supabase (`Site URL` et `Redirect URLs`), la configuration du fournisseur email et la capacité du SMTP. Les liens `/eleve.html` doivent être autorisés.

## État initial
La base est verrouillée par défaut. Les invitations et publications sont vides après migration; aucun élève n'obtient automatiquement l'accès.
