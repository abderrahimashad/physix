# PhysiX

Plateforme de Physique-Chimie BIOF pour le lycée au Maroc. Ce premier lot prépare le déploiement statique et les accès publics. Il ne constitue pas encore une plateforme avec comptes réels.

## Développement

Python 3 suffit ; aucune installation npm ni compilation n’est nécessaire.

```sh
cd /workspace/physix
python3 -m http.server 8000 --bind 0.0.0.0
```

`index.html` contient la structure ; `assets/styles.css` et `assets/app.js` contiennent les styles et le comportement. Les données fictives sont stockées uniquement dans le navigateur. Le tableau de bord professeur et ses outils restent dans le code pour la prochaine étape, mais ne sont plus proposés aux visiteurs. Ne pas y enregistrer de données personnelles : le code côté navigateur n’est pas une frontière de sécurité.

## Déploiement Vercel

Importer `abderrahimashad/physix`, choisir la racine du dépôt, preset **Other**, sans commande d’installation ni de build. Le fichier `vercel.json` déclare explicitement la sortie statique, les URL propres et les en-têtes de sécurité. Aucun dossier `dist` n’est produit. Si le projet existant possède des surcharges de build ou de répertoire racine, les aligner sur ces paramètres.

L’accueil propose seulement **Espace Élève** (démonstration) et **Accès Invité** (fiches publiques). `/admin` présente un écran d’attente ; ce chemin public n’est pas une authentification. `?demo-admin=1` n’ouvre plus l’administration. Le serveur Python local utilise `/admin.html`, Vercel expose aussi `/admin` avec `cleanUrls`.

Les en-têtes CSP conservent provisoirement `unsafe-inline` pour les gestionnaires d’événements et les styles existants. Les retirer nécessite une migration séparée ; aucune clé Supabase privilégiée ne doit être ajoutée au navigateur.

## Validation

Avec Playwright Python et Chromium installés, démarrer le serveur puis lancer :

```sh
python3 tests/smoke.py
```

Le test vérifie les accès publics, l’ancien paramètre administrateur, les filtres invités, le clavier, le mobile et les outils fictifs conservés. Il active ces derniers uniquement dans le contexte de test par JavaScript ; ce n’est pas un mécanisme d’accès sécurisé.

## Étapes suivantes

Voir `docs/backend-plan.md` pour Supabase, invitations, confidentialité et progression pédagogique. Les comptes, notes persistantes, invitations et corrections IA ne sont pas opérationnels. Aucun déploiement Vercel n’est affirmé sans résultat du service.

## Lot phases 0 et 1

Le cahier des charges complet est conservé dans `SPECIFICATIONS.md`. L’état et les critères par phase sont dans `ROADMAP.md`, l’audit et les choix techniques dans `docs/architecture.md`.

Pour régénérer les captures desktop/mobile et l’aperçu élève, lancer `python3 tests/visual.py` avec le serveur local démarré. Les images sont dans `docs/screenshots/`. Les sections chapitre et progression de l’accueil sont des aperçus fictifs ; elles ne constituent pas encore les modules pédagogiques de phase 2.

## Accueil officiel validé

L’accueil actuel suit la maquette claire validée par le propriétaire. Ses fichiers sont `assets/home.css`, `assets/home.js` et `assets/hero-science.png` ; ils laissent le suivi pédagogique existant intact. Les captures à consulter sont `docs/screenshots/accueil-officiel-1200.png` et `docs/screenshots/accueil-officiel-390.png`. Les captures plus anciennes correspondent à l’ancienne direction visuelle. Les boutons d’information affichent leur statut non disponible lorsque les coordonnées ou services ne sont pas configurés.
