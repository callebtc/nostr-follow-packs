import { type Handle } from '@sveltejs/kit';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { generatePreviewImage } from '$lib/services/preview-image.service';
import { getFollowListById, getProfileInfoForEntries } from '$lib/services/follow-list.service';
import { ndk } from '$lib/nostr/ndk';
import type { FollowList } from '$lib/types/follow-list';

// Get the directory name for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a directory for storing generated preview images
const CACHE_DIR = path.join(__dirname, '../static/preview-images');
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export const handle: Handle = async ({ event, resolve }) => {
    const url = new URL(event.request.url);
    const pathname = url.pathname;

    // Only handle paths that match the follow list pattern
    const followListMatch = pathname.match(/^\/e\/([a-zA-Z0-9]+)$/);

    if (followListMatch) {
        const listId = followListMatch[1];
        const userAgent = event.request.headers.get('user-agent') || '';

        // Check if this is a bot or social media crawler
        const isCrawler = /bot|facebook|twitter|slack|discord|telegram|linkedin|whatsapp/i.test(userAgent);

        if (isCrawler) {
            try {
                // Generate a cached image filename
                const cacheFilename = `${listId}.png`;
                const cacheFollowListMetadataFilename = `${listId}.json`;
                const cachePath = path.join(CACHE_DIR, cacheFilename);
                const cacheFollowListMetadataPath = path.join(CACHE_DIR, cacheFollowListMetadataFilename);
                const relativeImagePath = `/preview-images/${cacheFilename}`;


                // Check if we have a cached metadata file that's less than 24 hours old
                let metadataExists = false;
                if (fs.existsSync(cacheFollowListMetadataPath)) {
                    const stats = fs.statSync(cacheFollowListMetadataPath);
                    const fileAge = Date.now() - stats.mtimeMs;
                    metadataExists = fileAge < 24 * 60 * 60 * 1000; // 24 hours in milliseconds
                    console.log('Metadata exists:', metadataExists);
                }
                let followList: FollowList | null = null;
                if (!metadataExists) {
                    // Fetch the follow list data
                    console.log('[!metadataExists] Connecting to relays');
                    // await ndk.connect();
                    followList = await getFollowListById(listId);
                    if (followList) {
                        fs.writeFileSync(cacheFollowListMetadataPath, JSON.stringify(followList));
                    }
                } else {
                    followList = JSON.parse(fs.readFileSync(cacheFollowListMetadataPath, 'utf8'));
                }

                if (!followList) {
                    return new Response('Follow list not found', { status: 404 });
                }

                // Check if we have a cached image that's less than 24 hours old
                let imageExists = false;
                if (fs.existsSync(cachePath)) {
                    const stats = fs.statSync(cachePath);
                    const fileAge = Date.now() - stats.mtimeMs;
                    imageExists = fileAge < 24 * 60 * 60 * 1000; // 24 hours in milliseconds
                    console.log('Image exists:', imageExists);
                }
                if (!imageExists) {
                    // Generate the image if it doesn't exist or is too old
                    // Fetch the follow list data
                    console.log('[!imageExists] Connecting to relays');
                    await ndk.connect();
                    console.log('[!imageExists] Follow list:', followList);
                    console.log('[!imageExists] Generating image');
                    // Load profile information for the first few entries
                    const MAX_PREVIEW_ENTRIES = 5;
                    const listWithProfiles = await getProfileInfoForEntries(followList, MAX_PREVIEW_ENTRIES);
                    await generatePreviewImage(listWithProfiles, cachePath);
                }
                // Modify the response to include meta tags for social media
                const response = await resolve(event);
                const html = await response.text();

                // Create meta tags for social media sharing
                const metaTags = `
            <meta property="og:title" content="${followList.name}" />
            <meta property="og:description" content="${followList.description || `A follow list with ${followList.entries.length} people to follow`}" />
            <meta property="og:image" content="${url.origin}${relativeImagePath}" />
            <meta property="og:url" content="${url.href}" />
            <meta property="og:type" content="website" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="${followList.name}" />
            <meta name="twitter:description" content="${followList.description || `A follow list with ${followList.entries.length} people to follow`}" />
            <meta name="twitter:image" content="${url.origin}${relativeImagePath}" />
          `;

                // Insert meta tags into the HTML head
                const updatedHtml = html.replace('</head>', `${metaTags}</head>`);

                return new Response(updatedHtml, {
                    status: response.status,
                    headers: response.headers
                });
            } catch (error) {
                console.error('Error generating social media preview:', error);
            }
        }
    }

    // For non-matching routes or errors, just use the standard response
    return resolve(event);
}; 