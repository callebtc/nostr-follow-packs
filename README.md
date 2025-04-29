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

## Nostr Follow List Event Format

Follow lists are published as Nostr events with `kind: 39089`. This is a parameterized replaceable event that allows users to maintain multiple follow lists.

### Event Structure

```json
{
  "kind": 39089,            // The event kind for follow lists
  "pubkey": "...",          // Public key of the list creator
  "created_at": 1234567890, // Unix timestamp when the list was created/updated
  "tags": [
    ["title", "List Title"], // Title of the follow list
    ["d", "uuid"],           // Unique identifier for the list (for replaceability)
    ["image", "https://..."], // Optional: URL to an image for the list
    ["description", "..."],   // Optional: Description of the follow list
    ["p", "pubkey1"],        // Public key of a user in the follow list
    ["p", "pubkey2"],        // Each "p" tag represents a user in the list
    // Additional "p" tags for more users
  ],
  "content": "",            // Usually empty
  "sig": "..."              // Signature of the event
}
```

### Field Descriptions

- **kind**: 39089 - Specific kind for follow lists
- **pubkey**: The public key of the user who created the list
- **created_at**: Unix timestamp when the list was created or last updated
- **tags**: Array of tags with special meanings:
  - `["title", "..."]`: The name/title of the follow list
  - `["d", "..."]`: A unique identifier for the list (usually a UUID), allows for updating the list later
  - `["image", "..."]`: Optional URL to an image representing the list
  - `["description", "..."]`: Optional text description of the follow list
  - `["p", "..."]`: Each "p" tag contains the public key of a user included in the follow list
- **content**: Usually empty
- **sig**: The cryptographic signature proving the event's authenticity

### Implementation Notes

- Follow lists are parameterized replaceable events, identified by the combination of pubkey, kind, and d-tag
- To update a list, publish a new event with the same kind, pubkey, and d-tag values but a newer created_at timestamp
- To follow multiple users in a list, add multiple "p" tags to the event
- Clients should display lists ordered by most recent created_at

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/nostr-follow-list/issues).

## License

This project is licensed under the MIT License - see the LICENSE file for details.
