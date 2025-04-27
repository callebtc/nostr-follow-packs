# Nostr Follow List

A modern and minimalistic Nostr application for creating, sharing, and discovering Nostr follow lists.

## Features

- 🚀 Create and publish follow lists as Nostr events
- 🔍 Discover other users' follow lists
- 🔎 Search for Nostr users by name or npub
- 🔄 Follow users directly from follow lists
- 🔐 Login with NIP-07 compatible browser extensions

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) - Frontend framework
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [NDK](https://github.com/nostr-dev-kit/ndk) - Nostr Development Kit
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools) - Nostr utilities

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- A NIP-07 compatible browser extension (like [Alby](https://getalby.com/) or [nos2x](https://github.com/fiatjaf/nos2x))

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/nostr-follow-list.git
cd nostr-follow-list
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Building for Production

To create a production version of the app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

## How It Works

- Users can log in with a NIP-07 compatible browser extension
- Create follow lists by searching for users and adding them to a list
- Publish follow lists as replaceable events (kind 29089)
- Browse and discover follow lists created by others
- View follow lists and follow users directly from them

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/nostr-follow-list/issues).

## License

This project is licensed under the MIT License - see the LICENSE file for details.
