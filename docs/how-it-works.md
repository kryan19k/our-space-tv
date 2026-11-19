# How it works

Notes on the Vizio SmartCast local API as used by this project, gathered from the community
[pyvizio](https://github.com/vkorn/pyvizio) library and from experiments on one TV. This is
unofficial and can differ between models and firmware.

## Connecting

- The TV serves an HTTPS API on **port 7345** (older firmware: 9000) with a **self-signed
  certificate**. Visit `https://<tv-ip>:7345/` once in the browser and accept the warning, otherwise
  `fetch` is blocked.
- Plain page loads return `500 Unhandled Exception` because the TV rejects requests that accept
  `text/html`. Seeing that page means the certificate was accepted. Script requests work fine.
- CORS is open (`*`) and allows the `AUTH` header, so a web page can talk to the TV directly.

## Pairing

1. `PUT /pairing/start` with `{ "DEVICE_ID": "...", "DEVICE_NAME": "..." }`. The TV shows a PIN and
   returns `ITEM.PAIRING_REQ_TOKEN`.
2. `PUT /pairing/pair` with the PIN as `RESPONSE_VALUE`, plus `CHALLENGE_TYPE`, `DEVICE_ID` and the
   token. The reply contains `ITEM.AUTH_TOKEN`.
3. Send `AUTH: <token>` on later requests.

## Endpoints used

| Purpose            | Request                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------- |
| Power state        | `GET /state/device/power_mode` (`1` is on)                                                |
| Key press          | `PUT /key_command/` `{ "KEYLIST": [{ "CODESET": n, "CODE": n, "ACTION": "KEYPRESS" }] }` |
| Launch an app      | `PUT /app/launch` `{ "VALUE": { "APP_ID": "...", "NAME_SPACE": n, "MESSAGE": null } }`   |
| Current app        | `GET /app/current` (not available on every firmware)                                      |
| Volume             | `GET /menu_native/dynamic/tv_settings/audio/volume`                                       |
| Input list         | `GET /menu_native/dynamic/tv_settings/devices/name_input`                                 |
| Switch input       | `PUT /menu_native/dynamic/tv_settings/devices/current_input` with the current `HASHVAL`   |

Several keys can be sent in one `KEYLIST`, which is how the volume slider sets an exact level.

### Key codes

| Key               | Codeset / code | Key        | Codeset / code |
| ----------------- | -------------- | ---------- | -------------- |
| Up                | 3 / 8          | Volume up  | 5 / 1          |
| Down              | 3 / 0          | Volume down| 5 / 0          |
| Left              | 3 / 1          | Mute       | 5 / 4          |
| Right             | 3 / 7          | Power off  | 11 / 0         |
| OK                | 3 / 2          | Power on   | 11 / 1         |
| Back              | 4 / 0          | Input      | 7 / 1          |
| Home              | 4 / 15         | Menu       | 4 / 8          |
| Info              | 4 / 6          |            |                |

## Opening a web page on the TV

SmartCast has a built-in web app launcher: `APP_ID "17"`, `NAME_SPACE 4`, and the address in
`MESSAGE`. Our Space uses it to load the launcher page. The remote appends the phone's settings and
pairing as a URL fragment: `…/tv/?tv=1#ip=…&t=<token>&d=<device id>&cfg=<base64url JSON>`. The TV page
reads the fragment, saves it to local storage, and removes it from the address bar. The fragment is
never sent to a web server.

The TV's browser can reach the TV's own API only through its LAN address (not `127.0.0.1`).

## Native app launch values

`NAME_SPACE` / `APP_ID` pairs used by the remote. `MESSAGE` is `null` for all of them.

| App          | NAME_SPACE | APP_ID | Source                                   |
| ------------ | ---------- | ------ | ---------------------------------------- |
| YouTube      | 5          | 1      | pyvizio                                  |
| Netflix      | 3          | 1      | pyvizio                                  |
| Prime Video  | 2          | 4      | pyvizio                                  |
| Hulu         | 2          | 3      | pyvizio                                  |
| Disney+      | 2          | 75     | pyvizio                                  |
| Max          | 2          | 128    | pyvizio                                  |
| Peacock      | 2          | 88     | pyvizio                                  |
| Paramount+   | 2          | 37     | pyvizio                                  |
| Tubi         | 2          | 61     | pyvizio                                  |
| Plex         | 2          | 9      | pyvizio                                  |
| Crunchyroll  | 2          | 481    | Vizio's public `app_availability_prod.json` (catalogue id 2481) |

Vizio's own catalogue lives at `https://scfs.vizio.com/appservice/vizio_apps_prod.json` (names and
ids) and `…/app_availability_prod.json` (launch payload per id). To add an app: find its id in the
first file, then read its `app_type_payload` in the second.

## Power on

The TV only answers network requests in standby if **Quick Start** is enabled. Without it, no phone
or web page can wake the TV.

## Troubleshooting

| Symptom                                   | Likely cause                                                          |
| ----------------------------------------- | --------------------------------------------------------------------- |
| "Can't reach the TV"                      | Different Wi-Fi network, TV off in deep standby, or certificate not accepted |
| "Unhandled Exception" in the browser      | Normal. It means the certificate is accepted                          |
| Pairing keeps asking for a PIN            | Site data was cleared or the TV was reset; pair once more             |
| The launcher shows no video               | The TV's browser rejects the file; use H.264 MP4, 1080p or lower      |
| Headlines say "Loading…"                  | `news.json` has not been generated yet; run the **Refresh news** workflow |
| App tile does nothing                     | The app is not installed, or its id differs on your firmware          |
