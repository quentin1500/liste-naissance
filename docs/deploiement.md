# Mise en place

## 1. Classeur et script

1. Créer un classeur Google Sheets privé et relever son identifiant dans son URL, entre `/d/` et `/edit`.
2. Dans ce classeur, ouvrir **Extensions > Apps Script**. Remplacer le contenu du fichier de script par celui de [Code.gs](../backend/Code.gs), puis enregistrer.
3. Dans **Paramètres du projet > Propriétés du script**, créer `SPREADSHEET_ID` avec l'identifiant du classeur.
4. Dans l'éditeur Apps Script, sélectionner `setupSheets`, l'exécuter et accepter les autorisations demandées. Vérifier la création des onglets `Gifts`, `Contributions`, `Categories` et `Settings`. Ne pas partager le classeur publiquement.
5. Sur votre machine, avec Node.js 18 ou plus récent, lancer depuis la racine du projet :

   ```sh
   node tools/setup-auth.js
   ```

   Saisir une phrase secrète longue, unique et aléatoire (16 à 256 caractères). La saisie est masquée. Dans les propriétés du script, créer `ADMIN_SALT` et `ADMIN_HASH` avec les deux valeurs affichées. Ne pas publier ces valeurs ou les placer dans le frontend. Effacer l'affichage du terminal après utilisation. Les éditeurs du projet peuvent lire ces propriétés ; limiter leurs droits.
6. Dans **Déployer > Nouveau déploiement**, choisir **Application Web**. Exécuter en tant que propriétaire et autoriser l'accès à **Tous** afin que les visiteurs puissent lire et participer. Autoriser les accès demandés et copier l'URL HTTPS se terminant par `/exec`. Tester son ouverture : elle doit renvoyer du JSON avec `ok: true` et un tableau `gifts`.
7. Pour chaque changement du code Apps Script, enregistrer puis créer une nouvelle version dans **Déployer > Gérer les déploiements** et mettre à jour le déploiement. Vérifier que l'URL utilisée est celle du déploiement `/exec`, pas l'URL de test `/dev`.

## 2. GitHub Pages

1. Dans [config.js](../config.js), remplacer la chaîne vide `apiUrl` par l'URL HTTPS `/exec` du déploiement. Cette URL est publique, pas un secret.
2. Pousser les fichiers dans un dépôt GitHub. Dans **Settings > Pages**, sélectionner **Deploy from a branch**, la branche voulue et le dossier `/ (root)`, puis enregistrer. L'accès Pages dépend du type de dépôt et de l'offre GitHub ; le site publié est public.
3. Ouvrir l'URL Pages fournie par GitHub. Le bandeau de démonstration doit avoir disparu. Se connecter dans **Espace parents**, créer un cadeau test, puis enregistrer une participation et vérifier son affichage dans le classeur et l'administration. Supprimer ensuite l'engagement et le cadeau test.
4. Dans l'espace parents, utiliser **Personnaliser** pour modifier le titre, le texte d'accueil et les catégories ; créer ensuite les cadeaux et leurs liens d'achat. Les autres textes et la photo de couverture restent dans [index.html](../index.html) et [styles.css](../styles.css). Les images de démonstration et les polices utilisent des services externes : remplacez-les par des ressources autorisées, idéalement hébergées localement. Une image renseignée pour un cadeau doit être accessible publiquement.

Les secrets GitHub Actions sont facultatifs : si vous souhaitez y conserver une copie privée de `ADMIN_HASH`, créez un secret de dépôt sous **Settings > Secrets and variables > Actions**. Ne l'injectez pas dans les fichiers publiés ; le site ne l'utilise pas. Ne stockez aucun mot de passe dans le dépôt ou une variable publique.

## 3. Maintenance et sécurité

- Sauvegarder régulièrement le classeur et vérifier les accès Google. Limiter les éditeurs du script et du classeur : ils ont accès aux données et secrets.
- Pour changer le mot de passe, relancer le générateur et remplacer ensemble `ADMIN_SALT` et `ADMIN_HASH`. Les requêtes utilisant l'ancien mot de passe seront refusées. Vérifier ensuite une connexion et les opérations administratives.
- Partager l'URL uniquement dans un cercle de confiance et ne pas saisir de données sensibles. Le service reste techniquement public : aucun contrôle anti-spam ou limitation de connexion robuste n'est inclus. En cas d'abus, désactiver le déploiement et envisager une solution de protection dédiée.
- Aucun paiement n'est géré. Les parents doivent convenir séparément du règlement et vérifier les engagements avant de supprimer des données.
- Si les appels échouent, vérifier l'URL `/exec`, la version déployée, les autorisations, les propriétés, les quotas et les journaux d'exécution Apps Script. Tester depuis l'URL GitHub Pages, pas seulement depuis l'éditeur Apps Script.