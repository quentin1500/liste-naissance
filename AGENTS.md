# Consignes pour les agents

Avant toute intervention, lire les ADR dans `docs/adr` et la documentation fonctionnelle dans `docs`. Respecter les décisions et les comportements documentés.

Si une demande contredit ou modifie une décision ou la documentation, expliquer la contradiction aux responsables et obtenir leur accord explicite avant d'agir. Après accord, mettre à jour les ADR et les documents fonctionnels concernés avec l'implémentation. Poser des questions lorsque les informations nécessaires ou une décision manquent.

Ne jamais publier de mot de passe, de jeton ou de secret et ne pas traiter le frontend comme une frontière de sécurité. Vérifier les changements au moyen des tests adaptés et signaler les limites non vérifiées.