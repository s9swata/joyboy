# Joyboy

A terminal user interface for streaming anime — an Ink TUI wrapper around the ani-cli API ecosystem.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/s9swata/joyboy/master/install.sh | bash
```

On macOS this installs Homebrew (if missing), IINA (the default player), and joyboy. On Linux it installs joyboy and tells you how to get `mpv`.

### Requirements

- **Node.js 18+** (installed automatically on macOS via Homebrew)
- **A video player:** [IINA](https://iina.io) (macOS, default) or [mpv](https://mpv.io) (Linux/macOS)

## Usage

```bash
joyboy
```

Navigate with arrow keys. Search for anime, browse results, view details and episodes, and stream directly to your player.

| Key | Action |
|---|---|
| `↑`/`↓` | Navigate list |
| `Enter` | Select / confirm |
| `Esc` | Go back |
| `q` | Quit |

## Environment

| Variable | Default | Description |
|---|---|---|
| `ANIME_PLAYER` | `iina` (macOS), `mpv` (Linux) | Video player binary |
| `ANIME_PLAYER_ARGS` | — | Additional player arguments (space-delimited) |

## Features

- Search across multiple anime providers (AllAnime, HiAnime)
- Episode list with watched indicators
- Per-anime watch history tracking
- Continue-watching screen for resuming
- Simultaneous provider fetching for faster results
- yt-dlp stream extraction
- External player integration (IINA / mpv)

## How it works

joyboy is a TUI frontend that queries anime streaming APIs (AllAnime, HiAnime, Gogoanime, Zoro), extracts stream URLs via yt-dlp, and launches your preferred video player — all from the terminal.
