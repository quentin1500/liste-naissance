# ADR 001 : Site statique et stockage Google

- Statut : en phase de test, à confirmer avant mise en production.
- Contexte : liste de naissance partagée, administration simple, hébergement GitHub Pages et minimum de dépendances.

## Décisions

1. Utiliser HTML, CSS et JavaScript sans bibliothèque frontend ni étape de compilation. GitHub Pages ne contient aucune donnée secrète. Les polices et photos d'exemple sont externes et facultatives.
2. Utiliser une application Web Google Apps Script et un classeur Google Sheets privé. Le script s'exécute sous le compte propriétaire ; ses propriétés contiennent l'identifiant du classeur, le sel et le hachage du mot de passe. L'URL du service est publique. Le dépôt peut être privé, mais le site publié reste public.
3. Aucun jeton n'est créé. Le mot de passe saisi est gardé en mémoire dans le navigateur jusqu'à la déconnexion ou au rechargement et envoyé par HTTPS à chaque requête administrative. Le backend vérifie à chaque fois un SHA-256 itéré 10 000 fois avec sel. Le hachage peut être conservé comme secret GitHub facultatif pour la gestion hors site, mais n'est jamais publié ni nécessaire au frontend.
4. Les cadeaux ont un prix en centimes. Une participation est un engagement, pas une transaction bancaire. La réservation du cadeau entier est exclusive et seulement possible sans participation précédente ; le lien du vendeur est proposé après confirmation s'il existe. Le cumul ne peut dépasser le prix. Les écritures sont sérialisées par verrou de script ; les suppressions d'engagements sont réservées aux administrateurs. Un cadeau ayant des engagements ne peut pas être supprimé.
5. Seuls les totaux et états des cadeaux sont publics. Les noms des participants ne sont transmis qu'à l'administration. Les données saisies sont validées côté serveur et les cellules de texte potentiellement interprétées comme formules sont neutralisées.
6. Le mode découverte s'active uniquement lorsque l'URL de l'API est vide : il utilise des exemples en mémoire, sans sauvegarde et sans administration fictive.
7. Le titre et le texte d'accueil ainsi que les catégories sont modifiables par l'administrateur et enregistrés dans le classeur. Une catégorie peut être renommée avec mise à jour des cadeaux associés ; sa suppression est bloquée tant qu'un cadeau l'utilise.

## Conséquences et risques

- Le service public peut être appelé directement : sans authentification visiteur, une personne peut créer de faux engagements ou saturer le service. Aucun CAPTCHA, contrôle anti-spam ou limitation de tentatives de connexion robuste n'est fourni. Réserver cette version à un cercle de confiance et prévoir un service dédié avant toute exposition plus large.
- SHA-256 itéré n'est pas un hachage spécialisé tel qu'Argon2 ou scrypt. Un mot de passe long et aléatoire et des droits d'accès Google stricts sont indispensables ; une compromission des propriétés permet les attaques hors ligne. Une authentification gérée est préférable pour des exigences de sécurité élevées.
- Le mot de passe est transmis à chaque opération administrative et reste accessible dans la mémoire de l'onglet pendant la connexion : un script malveillant dans la page, une extension compromise ou une fuite dans les journaux côté client pourrait le récupérer. Ne pas journaliser les corps des requêtes. Après changement du mot de passe, les requêtes utilisant l'ancien sont refusées.
- L'accès au site, aux images et aux URLs de produits peut révéler des informations sur la naissance ; éviter les données sensibles et limiter le partage de l'URL. Une URL difficile à deviner n'est pas un contrôle d'accès. Les noms enregistrés restent des données personnelles.
- Les quotas Google, la disponibilité réseau et le propriétaire du script conditionnent le service. Une sauvegarde du classeur et des tests réels après chaque déploiement sont nécessaires.