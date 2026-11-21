<p align="center"><img src="custom_components/hydraxoo/brand/icon.png" width="128" alt=""></p>

# hydraXoo

*[English version](README.md)*

Arrosage automatique par zones pour Home Assistant, libre et gratuit, entièrement configurable depuis l'interface — sans YAML.

> **État : début du développement (0.0.x).** Les zones, les cycles, la file d'attente, la pause, l'arrosage manuel, la coupure de sécurité et le contrôle de fermeture fonctionnent. L'ajustement météo et la carte Lovelace arrivent.

## Ce que fait hydraXoo

- Chaque **zone** commande une entité `switch` existante (prise Z-Wave, Zigbee, Wi-Fi, relais…).
- Chaque zone a autant de **cycles** que nécessaire, chacun avec son heure, sa durée, ses jours et son interrupteur actif/inactif.
- **Une zone à la fois** (par défaut) ou **zones en parallèle**. En mode une zone à la fois, un arrosage qui tombe pendant qu'une autre zone arrose attend dans une **file d'attente** et démarre dès que la vanne précédente est fermée.
- **Pause** de l'arrosage jusqu'à la reprise ou pendant un nombre de jours. L'arrosage manuel reste possible pendant la pause.
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
| Prochain arrosage | `sensor` (horodatage) | Prochain départ, durée prévue en attribut |
| Temps restant | `sensor` (durée) | Temps restant de l'arrosage en cours |
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
| `hydraxoo_cycle_started` | `zone_id`, `zone_name`, `source` (`schedule`/`manual`), `duration_min`, `cycle_id` |
| `hydraxoo_cycle_skipped` | `zone_id`, `zone_name`, `cycle_id`, `reason` (`paused`, `zone_disabled`, `stopped`, `fault`) |
| `hydraxoo_safety_retry` | `zone_id`, `zone_name`, `attempt`, `max_attempts`, `power_w` |
| `hydraxoo_safety_failed` | `zone_id`, `zone_name`, `attempts`, `power_w` |
| `hydraxoo_cycle_finished` | `zone_id`, `zone_name`, `reason` (`completed`, `manual_stop`, `max_runtime`, `external`, `restart`, `unload`), … |

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
