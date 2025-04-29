import { createCanvas, loadImage, registerFont } from 'canvas';
import type { FollowList } from '$lib/types/follow-list';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fillTextWithTwemoji } from 'node-canvas-with-twemoji-and-discord-emoji';
import { getProfileInfoForEntries } from './follow-list.service';
import { getProfileByPubkey } from '$lib/stores/user';
import { Image } from 'canvas';

export const MAX_PREVIEW_ENTRIES = 6;

/**
 * Generates a preview image for social media sharing based on a follow list
 * @param followList The follow list to generate a preview for
 * @param outputPath The path where the generated image will be saved
 */
export async function generatePreviewImage(followList: FollowList, outputPath: string): Promise<void> {
    console.log('[generatePreviewImage] Generating image for', followList.name);
    registerFont('static/fonts/Manrope-Regular.ttf', { family: 'Manrope' });
    registerFont('static/fonts/Manrope-Bold.ttf', { family: 'Manrope', weight: 'bold' });

    // Create a canvas for the preview image (1200x630 is recommended for social media)
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Load profile images first for background tiling
    const profiles = followList.entries.slice(0, MAX_PREVIEW_ENTRIES);

    // create a new array profilesWithPictures
    const defaultImage = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
    const profileImages: Image[] = [];
    const profilesWithPictures = [];
    for (const profile of followList.entries) {
        console.log('[generatePreviewImage] Loading profile image for', profile.pubkey);
        const profileWithPicture = await getProfileByPubkey(profile.pubkey);
        if (profileWithPicture.picture) {
            try {
                const imageUrl = profileWithPicture.picture;
                const profileImg = await loadImage(imageUrl);
                profileImages.push(profileImg);
                profilesWithPictures.push(profileWithPicture);
            } catch (error) {
                console.error(`Error loading profile image for ${profile.pubkey}:`, error);
            }
        }
        if (profilesWithPictures.length >= MAX_PREVIEW_ENTRIES) {
            break;
        }
    }



    try {
        // If no images loaded, use default
        if (profileImages.length === 0) {
            const defaultImg = await loadImage(defaultImage);
            profileImages.push(defaultImg);
        }

        // Draw tiled background with low opacity
        const tileSize = 120;
        ctx.save();
        ctx.globalAlpha = 0.35; // Very light alpha

        // Calculate number of tiles needed to cover the canvas
        const tilesX = Math.ceil(width / tileSize);
        const tilesY = Math.ceil(height / tileSize);

        for (let y = 0; y < tilesY; y++) {
            for (let x = 0; x < tilesX; x++) {
                const img = profileImages[Math.floor(Math.random() * profileImages.length)];
                // Create circular clipping path for each tile
                ctx.save();
                ctx.beginPath();
                const centerX = x * tileSize + tileSize / 2;
                const centerY = y * tileSize + tileSize / 2;
                ctx.arc(centerX, centerY, tileSize / 2, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();

                // Draw the profile image
                ctx.drawImage(img, x * tileSize, y * tileSize, tileSize, tileSize);
                ctx.restore();
            }
        }
        ctx.restore();

        // Fill background with gradient on top of the tiled images
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#6366f1');  // indigo-500
        gradient.addColorStop(1, '#8b5cf6');  // purple-500
        ctx.globalAlpha = 0.9; // Slightly transparent to let background show through
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1.0; // Reset alpha for subsequent drawing operations

        // top text
        ctx.font = 'bold 40px Manrope, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        // Using fillTextWithTwemoji instead of fillText for emoji support
        await fillTextWithTwemoji(ctx, 'NOSTR FOLLOW PACK', width / 2, 90, { maxWidth: width - 100 });

        // Add the list name
        ctx.font = 'bold 80px Manrope, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';

        // Text wrapping logic for the follow list name
        const maxNameWidth = width - 100;
        const nameWords = followList.name.split(' ');
        let nameLine1 = '';
        let nameLine2 = '';
        let nameY = 450; // Default Y position for single line
        let fontSize = 80; // Default font size

        // Check if text is too wide and needs wrapping
        ctx.font = `bold ${fontSize}px Manrope, sans-serif`;
        if (ctx.measureText(followList.name).width > maxNameWidth) {
            // Try to split into two roughly equal lines
            let line = '';
            let halfway = Math.ceil(nameWords.length / 2);

            // Find a good split point near the halfway mark
            for (let i = 0; i < nameWords.length; i++) {
                const word = nameWords[i];
                if (i < halfway) {
                    nameLine1 += word + ' ';
                } else {
                    nameLine2 += word + ' ';
                }
            }

            nameLine1 = nameLine1.trim();
            nameLine2 = nameLine2.trim();

            // If the lines are still too long, reduce the font size
            const line1Width = ctx.measureText(nameLine1).width;
            const line2Width = ctx.measureText(nameLine2).width;

            if (Math.max(line1Width, line2Width) > maxNameWidth) {
                fontSize = 70; // Reduce font size
                ctx.font = `bold ${fontSize}px Manrope, sans-serif`;
            }

            // Adjust Y position for two lines (move up a bit)
            nameY = 400;

            // Draw the two lines
            await fillTextWithTwemoji(ctx, nameLine1, width / 2, nameY, { maxWidth: maxNameWidth });
            await fillTextWithTwemoji(ctx, nameLine2, width / 2, nameY + fontSize, { maxWidth: maxNameWidth });
        } else {
            // Single line, draw as normal
            await fillTextWithTwemoji(ctx, followList.name, width / 2, nameY, { maxWidth: maxNameWidth });
        }

        // Add description if available
        if (followList.description && false) {
            ctx.font = '30px Manrope, sans-serif';
            ctx.fillStyle = '#f0f0f0';

            // Wrap text to multiple lines if needed
            const words = followList.description?.split(' ') || [];
            let line = '';
            let y = 460;
            const maxWidth = width - 200;
            const lineHeight = 40;

            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = ctx.measureText(testLine);

                if (metrics.width > maxWidth && i > 0) {
                    await fillTextWithTwemoji(ctx, line, width / 2, y, { maxWidth });
                    line = words[i] + ' ';
                    y += lineHeight;

                    // Limit to 3 lines
                    if (y > 460 + 2 * lineHeight) break;
                } else {
                    line = testLine;
                }
            }
            await fillTextWithTwemoji(ctx, line, width / 2, y, { maxWidth });
        }

        // Draw profile pictures in a grid
        const maxProfiles = Math.min(6, followList.entries.length);
        const profileSize = 180;
        const spacing = -10;
        const startX = (width - (maxProfiles * (profileSize + spacing) - spacing)) / 2;
        const startY = 140;

        // Load and draw profile images in parallel
        await Promise.all(profilesWithPictures.map(async (profile, index) => {
            const profileImg = profileImages[index];
            const x = startX + index * (profileSize + spacing);
            const y = startY;

            // Create circular clipping path
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + profileSize / 2, y + profileSize / 2, profileSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();

            // Draw the profile image
            ctx.drawImage(profileImg, x, y, profileSize, profileSize);

            // Draw a purple border around the profile picture
            ctx.strokeStyle = '#7740f7';
            ctx.lineWidth = 25;
            ctx.stroke();

            ctx.restore();

        }));

        // Load Nostr logo
        const nostrLogoPath = path.join(process.cwd(), 'static/nostr_white.png');
        const nostrLogo = await loadImage(nostrLogoPath);

        // Add a footer with number of people to follow
        ctx.font = 'bold 40px Manrope, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        // Using fillTextWithTwemoji for emoji support
        // await fillTextWithTwemoji(ctx, `${followList.entries.length} people to follow`, width / 2, height - 160);

        // Draw "on Nostr" with the logo
        ctx.font = 'bold 50px Manrope, sans-serif';
        const logoSize = 120; // Size for the small Nostr logo
        const textMetrics = ctx.measureText("on Nostr");
        const totalWidth = textMetrics.width + logoSize + 10; // Text width + logo + spacing

        // Draw "on" text
        await fillTextWithTwemoji(ctx, "on", width / 2 - totalWidth / 2 + 58, height - 80);

        // Draw the Nostr logo
        const logoX = width / 2 - totalWidth / 2 + 65; // Position after "on" text
        const logoY = height - logoSize - 35; // Align vertically with text
        ctx.drawImage(nostrLogo, logoX, logoY, logoSize, logoSize);

        // Draw "Nostr" text
        await fillTextWithTwemoji(ctx, "Nostr", width / 2 + 65, height - 80);

        // Save the canvas to a PNG file
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
    } catch (error) {
        console.error('Error generating preview image:', error);
        throw error;
    }
} 