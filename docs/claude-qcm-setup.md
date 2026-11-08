# QCM automatique avec Claude

La génération des 10 questions de cours + 5 applications utilise l'API Anthropic (Claude) à la place de Gemini.
La clé reste un **secret serveur Supabase** : elle n'apparaît jamais dans le navigateur ni dans le dépôt.

1. Créer une clé API sur https://console.anthropic.com (compte API distinct de l'abonnement Claude.ai) et ajouter quelques crédits.
2. Enregistrer le secret : `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
3. Optionnel : `supabase secrets set CLAUDE_QCM_MODEL=<modèle>` (défaut : `claude-sonnet-5-5`).
4. Déployer la fonction : `supabase functions deploy physix-qcm-claude`
5. L'ancienne fonction `physix-qcm-gemini` n'est plus utilisée et peut être supprimée du projet Supabase.

Limites : PDF de 12 Mo maximum (100 pages maximum côté Claude), quota interne 10 générations / 24 h et 4 / minute
(`physix_qcm_claim_generation`). Les questions sont créées en brouillon et doivent être relues avant publication.
