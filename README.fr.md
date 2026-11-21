<p align="center"><img src="custom_components/hydraxoo/brand/icon.png" width="128" alt=""></p>

# hydraXoo

*[English version](README.md)*

Arrosage automatique par zones pour Home Assistant, libre et gratuit, entièrement configurable depuis l'interface — sans YAML.

> **État : début du développement (0.0.x).** Les zones, les cycles, la file d'attente, la pause, l'arrosage manuel, la coupure de sécurité, le contrôle de fermeture et l'ajustement météo fonctionnent. La carte Lovelace arrive.

## Ce que fait hydraXoo

- Chaque **zone** commande une entité `switch` existante (prise Z-Wave, Zigbee, Wi-Fi, relais…).
- Chaque zone a autant de **cycles** que nécessaire, chacun avec son heure, sa durée, ses jours et son interrupteur actif/inactif.
- **Une zone à la fois** (par défaut) ou **zones en parallèle**. En mode une zone à la fois, un arrosage qui tombe pendant qu'une autre zone arrose attend dans une **file d'attente** et démarre dès que la vanne précédente est fermée.
- **Pause** de l'arrosage jusqu'à la reprise ou pendant un nombre de jours. L'arrosage manuel reste possible pendant la pause.
- **Ajustement météo** des zones extérieures : la durée d'arrosage est multipliée par un coefficient recalculé juste avant chaque départ, d'après la pluie prévue, la pluie tombée et la chaleur (détails plus bas).
- **Arroser maintenant** avec la durée de base ou une durée choisie, et **arrêter** à tout moment.
- **Coupure de sécurité** : une vanne est toujours fermée après la durée maximale de la zone, même si elle a été ouverte en dehors de hydraXoo.
- **Contrôle de fermeture** (facultatif, avec un capteur de consommation) : après chaque fermeture, hydraXoo vérifie que la consommation est retombée. Sinon, il rallume puis éteint la vanne, jusqu'à 5 fois ; ensuite la zone passe en défaut, une notification s'affiche et la zone n'arrose plus jusqu'à l'acquittement.
- **Sécurité au redémarrage** : une vanne trouvée ouverte au démarrage de Home Assistant est fermée ; le cycle interrompu n'est pas relancé et un événement le signale.

## Installation

Nécessite Home Assistant 2026.3 ou plus récent.

1. Dans Home Assistant, ouvrez **Paramètres › Marketplace**.
2. Choisissez **Add from link**, saisissez `PhilGG/hydraXoo` puis **Add**.
3. Ouvrez hydraXoo dans le Marketplace, installez-le, puis redémarrez Home Assistant.
4. hydraXoo est en général proposé automatiquement après le redémarrage. Sinon, allez dans **Paramètres › Appareils et services › Ajouter une intégration** et choisissez **hydraXoo**.
5. Utilisez le bouton **Configurer** de l'intégration pour ajouter zones et cycles, et choisir l'enchaînement des zones.

## Entités

Générales (appareil **hydraXoo**) :

| Entité | Type | Rôle |
| --- | --- | --- |
| Pause de l'arrosage | `switch` | Allumé, aucun cycle n'est lancé ; attribut `until` quand la pause se lève seule |
| File d'attente | `sensor` | Nombre d'arrosages en attente, listés dans l'attribut `items` |

Par zone :

| Entité | Type | Rôle |
| --- | --- | --- |
| Zone active | `switch` | Désactivée, la zone ne lance plus ses cycles |
| Arrosage en cours | `binary_sensor` | Allumé tant que hydraXoo garde la vanne ouverte |
| Prochain arrosage | `sensor` (horodatage) | Prochain départ ; durée de base et durée ajustée en attributs |
| Temps restant | `sensor` (durée) | Temps restant de l'arrosage en cours |
| Coefficient météo | `sensor` (%) | Pourcentage appliqué à la durée de base ; raisons (pluie tombée, pluie prévue, température, avertissements) en attributs |
| Défaut de fermeture | `binary_sensor` (problème) | Allumé quand la vanne n'a pas pu être refermée ; détails du dernier contrôle en attributs |

## Services

| Service | Champs |
| --- | --- |
| `hydraxoo.run_zone` | `zone` (appareil), `duration` (minutes, facultatif) |
| `hydraxoo.stop_zone` | `zone` (appareil) |
| `hydraxoo.stop_all` | — (vide aussi la file d'attente) |
| `hydraxoo.pause` | `days` (facultatif ; vide = jusqu'à la reprise) |
| `hydraxoo.resume` | — |
| `hydraxoo.acknowledge_fault` | `zone` (appareil) |

## Événements

| Événement | Données |
| --- | --- |
| `hydraxoo_cycle_started` | `zone_id`, `zone_name`, `source` (`schedule`/`manual`), `duration_min`, `cycle_id`, et pour les cycles `base_duration_min`, `coefficient_pct` |
| `hydraxoo_cycle_skipped` | `zone_id`, `zone_name`, `cycle_id`, `reason` (`paused`, `zone_disabled`, `stopped`, `fault`, `weather`), `weather` (détails) |
| `hydraxoo_safety_retry` | `zone_id`, `zone_name`, `attempt`, `max_attempts`, `power_w` |
| `hydraxoo_safety_failed` | `zone_id`, `zone_name`, `attempts`, `power_w` |
| `hydraxoo_cycle_finished` | `zone_id`, `zone_name`, `reason` (`completed`, `manual_stop`, `max_runtime`, `external`, `restart`, `unload`), … |

## Ajustement météo

Choisissez une entité météo (et éventuellement un pluviomètre cumulatif) dans **Configurer › Réglages généraux**. Chaque zone extérieure a sa propre règle (**Modifier une zone › Réglages de la zone › Règle météo**) :

- **Pluie prévue** sur les 24 prochaines heures (via `weather.get_forecasts`, horaire si disponible, sinon journalière) supérieure ou égale au **seuil d'annulation** (5 mm) : le cycle est sauté.
- Sinon **coefficient = 1 − (pluie tombée pondérée + pluie prévue) ÷ seuil**, borné entre 0 et 100 %. La pluie des dernières 24 h compte entièrement, celle de 24 à 48 h pour moitié.
- **Bonus chaleur** (désactivé par défaut) : +X % quand la température maximale prévue atteint un seuil.
- Le résultat est borné entre le minimum et le maximum de la zone (0 à 150 %), et la durée est arrondie à la minute. 0 % saute le cycle.
- **Pluie tombée** : lue sur le pluviomètre s'il est renseigné ; sinon estimée en enregistrant, chaque heure, la pluie prévue pour cette heure.
- **Météo indisponible** : 100 % et un avertissement.

Testé avec les formats Met.no et Météo-France ; les fournisseurs qui ne donnent que des prévisions journalières, ou aucune quantité de pluie, sont gérés (100 % avec un avertissement dans ce dernier cas). L'arrosage manuel n'est jamais ajusté.

## Contrôle de fermeture : régler sa prise

Le contrôle lit la consommation transmise par la prise (capteur en W). Beaucoup de prises ne transmettent leur consommation **qu'à intervalles réguliers** ou **au-delà d'une variation minimale** (par exemple toutes les 60 s ou ±5 W). Si la mesure lue après la fermeture est plus ancienne que l'ordre de fermeture, hydraXoo attend jusqu'à 60 s une mesure récente.

Pour un contrôle fiable :

1. Dans les réglages de la prise (Z-Wave JS : configuration de l'appareil), réduisez autant que possible l'**intervalle de rapport** de la consommation et la **variation minimale** qui déclenche un rapport.
2. Dans hydraXoo (**Configurer › Modifier une zone › Réglages de la zone › Contrôle de fermeture**), choisissez un **délai de contrôle** un peu plus long que l'intervalle de rapport de la prise.
3. Réglez le **seuil** entre la consommation propre de la prise au repos et celle de la vanne (une électrovanne consomme en général 2 à 8 W).

Si le capteur est indisponible, la fermeture n'est pas contrôlée (pas de relance) et un avertissement est écrit dans le journal.

## Développement

Tout tourne dans Docker ; rien d'autre n'est nécessaire sur votre machine.

```bash
./dev build   # construire l'image de développement
./dev test    # lancer les tests
./dev lint    # vérifier le style du code
```

## Licence

[MIT](LICENSE)
