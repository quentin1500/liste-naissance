# Notre liste de naissance

Site statique en français pour partager une liste de cadeaux, enregistrer des engagements et administrer la liste. Les engagements sont déclaratifs : aucun paiement n'est effectué par le site.

Ouvrir [index.html](index.html) pour découvrir l'interface avec des données fictives, non sauvegardées. Pour utiliser de vraies données, suivre le [guide de déploiement](docs/deploiement.md). Les photos et polices d'exemple sont chargées depuis des services externes et peuvent être remplacées.

La [documentation fonctionnelle](docs/fonctionnement.md) décrit les parcours et les limites de sécurité. Les [décisions d'architecture](docs/adr/001-architecture.md) encadrent les évolutions du projet.

Tests locaux (Node.js 18 ou plus récent) :

```sh
node --test tests/backend.test.js
```

Les tests simulent les services Google ; ils ne remplacent pas un essai du déploiement Apps Script réel.