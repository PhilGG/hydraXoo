<p align="center"><img src="custom_components/hydraxoo/brand/icon.png" width="128" alt=""></p>

# hydraXoo

*[English version](README.md)*

Arrosage automatique par zones pour Home Assistant, libre et gratuit, entièrement configurable depuis l'interface — sans YAML.

> **État : début du développement (0.0.x).** L'arrosage manuel, un cycle programmé par zone et la coupure de sécurité fonctionnent. Les cycles multiples, l'ajustement météo, le contrôle de fermeture des vannes et la carte Lovelace arrivent.

## Ce que fait hydraXoo

- Chaque **zone** commande une entité `switch` existante (prise Z-Wave, Zigbee, Wi-Fi, relais…).
- Chaque zone a un **cycle** : heure de départ, durée, jours de la semaine.
- **Arroser maintenant** avec la durée de base ou une durée choisie, et **arrêter** à tout moment.
- **Coupure de sécurité** : une vanne est toujours fermée après la durée maximale de la zone, même si elle a été ouverte en dehors de hydraXoo.
- **Sécurité au redémarrage** : une vanne trouvée ouverte au démarrage de Home Assistant est fermée ; le cycle interrompu n'est pas relancé et un événement le signale.

## Installation

Nécessite Home Assistant 2026.3 ou plus récent.

1. Dans Home Assistant, ouvrez **Paramètres › Marketplace**.
2. Choisissez **Add from link**, saisissez `PhilGG/hydraXoo` puis **Add**.
3. Ouvrez hydraXoo dans le Marketplace, installez-le, puis redémarrez Home Assistant.
4. Allez dans **Paramètres › Appareils et services › Ajouter une intégration** et choisissez **hydraXoo**.
5. Utilisez le bouton **Configurer** de l'intégration pour ajouter des zones.

## Entités (par zone)

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
| `hydraxoo.stop_all` | — |

## Événements

| Événement | Données |
| --- | --- |
| `hydraxoo_cycle_started` | `zone_id`, `zone_name`, `source` (`schedule`/`manual`), `duration_min`, `cycle_id` |
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
