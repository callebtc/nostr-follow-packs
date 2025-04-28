import { createCanvas, loadImage } from 'canvas';
import type { FollowList } from '$lib/types/follow-list';
import * as fs from 'node:fs';

/**
 * Generates a preview image for social media sharing based on a follow list
 * @param followList The follow list to generate a preview for
 * @param outputPath The path where the generated image will be saved
 */
export async function generatePreviewImage(followList: FollowList, outputPath: string): Promise<void> {
    // Create a canvas for the preview image (1200x630 is recommended for social media)
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Fill background with gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#6366f1');  // indigo-500
    gradient.addColorStop(1, '#8b5cf6');  // purple-500
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add the list name
    ctx.font = 'bold 60px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(followList.name, width / 2, 120, width - 100);

    // Add description if available
    if (followList.description) {
        ctx.font = '30px Arial, sans-serif';
        ctx.fillStyle = '#f0f0f0';

        // Wrap text to multiple lines if needed
        const words = followList.description.split(' ');
        let line = '';
        let y = 180;
        const maxWidth = width - 200;
        const lineHeight = 40;

        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && i > 0) {
                ctx.fillText(line, width / 2, y, maxWidth);
                line = words[i] + ' ';
                y += lineHeight;

                // Limit to 3 lines
                if (y > 180 + 2 * lineHeight) break;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, width / 2, y, maxWidth);
    }

    // Draw profile pictures in a grid
    const maxProfiles = Math.min(5, followList.entries.length);
    const profileSize = 160;
    const spacing = 20;
    const startX = (width - (maxProfiles * (profileSize + spacing) - spacing)) / 2;
    const startY = 320;

    const profiles = followList.entries.slice(0, maxProfiles);
    const defaultImage = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

    try {
        // Load and draw profile images in parallel
        await Promise.all(profiles.map(async (profile, index) => {
            try {
                const imageUrl = profile.picture || defaultImage;
                const profileImg = await loadImage(imageUrl);

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

                // Draw a white border around the profile picture
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 5;
                ctx.stroke();

                ctx.restore();

                // Draw the user's name if available
                if (profile.name) {
                    ctx.font = '24px Arial, sans-serif';
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.fillText(profile.name, x + profileSize / 2, y + profileSize + 30, profileSize);
                }
            } catch (error) {
                console.error(`Error loading profile image for ${profile.pubkey}:`, error);
            }
        }));

        // Add a footer with number of people to follow
        ctx.font = 'bold 30px Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`${followList.entries.length} people to follow`, width / 2, height - 50);

        // Save the canvas to a PNG file
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
    } catch (error) {
        console.error('Error generating preview image:', error);
        throw error;
    }
} 