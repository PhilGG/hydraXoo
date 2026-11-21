<p align="center"><img src="custom_components/hydraxoo/brand/icon.png" width="128" alt=""></p>

# hydraXoo

*[English version](README.md)*

Arrosage automatique par zones pour Home Assistant, libre et gratuit, entièrement configurable depuis l'interface — sans YAML.

> **État : début du développement (0.0.x).** Les zones, les cycles, la file d'attente, la pause, l'arrosage manuel et la coupure de sécurité fonctionnent. L'ajustement météo, le contrôle de fermeture des vannes et la carte Lovelace arrivent.

## Ce que fait hydraXoo

- Chaque **zone** commande une entité `switch` existante (prise Z-Wave, Zigbee, Wi-Fi, relais…).
- Chaque zone a autant de **cycles** que nécessaire, chacun avec son heure, sa durée, ses jours et son interrupteur actif/inactif.
- **Une zone à la fois** (par défaut) ou **zones en parallèle**. En mode une zone à la fois, un arrosage qui tombe pendant qu'une autre zone arrose attend dans une **file d'attente** et démarre dès que la vanne précédente est fermée.
- **Pause** de l'arrosage jusqu'à la reprise ou pendant un nombre de jours. L'arrosage manuel reste possible pendant la pause.
- **Arroser maintenant** avec la durée de base ou une durée choisie, et **arrêter** à tout moment.
- **Coupure de sécurité** : une vanne est toujours fermée après la durée maximale de la zone, même si elle a été ouverte en dehors de hydraXoo.
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

## Services

| Service | Champs |
| --- | --- |
| `hydraxoo.run_zone` | `zone` (appareil), `duration` (minutes, facultatif) |
| `hydraxoo.stop_zone` | `zone` (appareil) |
| `hydraxoo.stop_all` | — (vide aussi la file d'attente) |
| `hydraxoo.pause` | `days` (facultatif ; vide = jusqu'à la reprise) |
| `hydraxoo.resume` | — |

## Événements

| Événement | Données |
| --- | --- |
| `hydraxoo_cycle_started` | `zone_id`, `zone_name`, `source` (`schedule`/`manual`), `duration_min`, `cycle_id` |
| `hydraxoo_cycle_skipped` | `zone_id`, `zone_name`, `cycle_id`, `reason` (`paused`, `zone_disabled`, `stopped`) |
| `hydraxoo_cycle_finished` | `zone_id`, `zone_name`, `reason` (`completed`, `manual_stop`, `max_runtime`, `external`, `restart`, `unload`), … |

## Développement

Tout tourne dans Docker ; rien d'autre n'est nécessaire sur votre machine.

```bash
./dev build   # construire l'image de développement
./dev test    # lancer les tests
./dev lint    # vérifier le style du code
```

## Licence

[MIT](LICENSE)
