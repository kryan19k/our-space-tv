# Notices

Our Space is released under the [MIT License](LICENSE). It is an independent project and is
**not affiliated with, endorsed by, or sponsored by VIZIO, Inc.** or by any streaming service shown
in it. "VIZIO" and "SmartCast" are trademarks of VIZIO, Inc.

## Brand logos

The files in `logos/` and `launcher/public/logos/` are single-colour SVG marks from
[Simple Icons](https://simpleicons.org/) (CC0 1.0). The marks themselves are trademarks of their
respective owners (Netflix, YouTube, Prime Video, Hulu, Plex, Max, Paramount+, Tubi, Crunchyroll,
and others). They are used only to identify the apps a viewer can open. If you fork this project for
anything other than personal use, check each brand's trademark guidelines.

## Media

`videos/fireplace.mp4` is a sample background clip supplied by the repository owner. It is **not**
covered by the MIT License. Replace it with a video you have the right to use if you redistribute
this repository.

## Libraries

| Library                                              | License |
| ---------------------------------------------------- | ------- |
| [React](https://react.dev/) and React DOM            | MIT     |
| [Vite](https://vite.dev/) and its React plugin       | MIT     |
| [Tailwind CSS](https://tailwindcss.com/)             | MIT     |
| [lucide-react](https://lucide.dev/)                  | ISC     |
| [clsx](https://github.com/lukeed/clsx)               | MIT     |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | MIT |

## Online data sources

These are called directly from the viewer's browser. Their terms apply to your use of them.

| Feature        | Source                                                                  |
| -------------- | ----------------------------------------------------------------------- |
| Crypto prices  | [CoinGecko](https://www.coingecko.com/) public API                      |
| National debt  | [U.S. Treasury Fiscal Data](https://fiscaldata.treasury.gov/) "Debt to the Penny" |
| On this day    | [Wikimedia](https://api.wikimedia.org/) feed                            |
| Weather        | [Open-Meteo](https://open-meteo.com/) geocoding and the [National Weather Service](https://www.weather.gov/) |
| News headlines | Google News RSS, fetched by a scheduled GitHub Action (see below)       |

`news.json` republishes **headline titles, source names and links only** (never article text). Google
News feeds are offered for personal, non-commercial use. If you run your own copy, read their terms,
and delete `.github/workflows/news.yml` if you do not want this feature.

## App launch IDs

SmartCast app IDs in the remote were gathered from the community-maintained
[pyvizio](https://github.com/vkorn/pyvizio) app list and from the public app catalogue files that
Vizio serves to its own mobile app. They are listed in [docs/how-it-works.md](docs/how-it-works.md).
