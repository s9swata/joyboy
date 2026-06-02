# Joyboy - Agent Guidelines

An Ink TUI (Terminal User Interface) client for anime streaming via AllAnime/AllManga API.

## Project Structure

```
joyboy/
├── src/
│   ├── index.tsx          # Entry point
│   ├── tui/App.tsx        # Main TUI app component
│   ├── api/               # API clients
│   │   ├── types.ts       # TypeScript types
│   │   ├── constants.ts   # API constants
│   │   ├── allanimeClient.ts
│   │   └── hianimeClient.ts
│   ├── services/          # Business logic
│   │   ├── animeService.ts
│   │   ├── searchService.ts
│   │   ├── anilistService.ts
│   │   ├── jikanService.ts
│   │   ├── hianimeScraper.ts
│   │   └── assets.ts
│   └── player/            # Video player integration
│       ├── ytdlp.ts       # yt-dlp integration
│       └── launchPlayer.ts
└── dist/                  # Compiled output
```

## Tech Stack

- **Ink** - React for CLI/TUI
- **React 19** - UI framework
- **TypeScript** - Type safety
- **tsx** - TypeScript executor for dev

## Commands

```bash
npm run dev    # Run in development mode
npm run build  # Compile TypeScript
npm run start  # Run compiled JavaScript
npm run check  # TypeScript type checking
```

## Environment Variables

- `ANIME_PLAYER` - Video player binary (default: `iina`)
- `ANIME_PLAYER_ARGS` - Additional player arguments (space-delimited)

## Key Implementation Details

### API Clients
- Uses persisted-query API with required headers
- Search service handles cover URL normalization
- Supports multiple anime sources (AllAnime, HiAnime)

### Player Integration
- Uses yt-dlp for stream extraction
- Launches external player (mpv by default)
- Configurable via environment variables

### TUI Navigation
- Search input → Results list → Detail view
- Arrow key navigation
- ESC to go back

## TypeScript Conventions

- Use explicit types over `any`
- Prefer interfaces over type aliases for object shapes
- Follow existing patterns in `src/api/types.ts`