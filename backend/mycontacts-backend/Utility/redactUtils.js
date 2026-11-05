/**
 * Utility functions for redacting sensitive information in chat messages with Asterisks (*).
 */

const ALLOWED_WORK_DOMAINS = [
    'github.com', 'gitlab.com', 'bitbucket.org',
    'figma.com',
    'drive.google.com', 'docs.google.com', 'sheets.google.com', 'meet.google.com',
    'dropbox.com',
    'loom.com',
    'notion.so', 'notion.site',
    'trello.com', 'miro.com',
    'zoom.us', 'microsoft.com', 'teams.microsoft.com', 'jitsi.org'
];

const redactSensitiveInfo = (text, userRole) => {
    if (!text || typeof text !== 'string') return text;

    const isManagerOrAdmin = userRole === 'Admin' || userRole === 'Manager';
    let redactedText = text;

    // 1. Mask Emails (Standard & Obfuscated like "user[at]domain[dot]com" or "user AT domain DOT com")
    const emailRegex = /[a-zA-Z0-9._%+-]+(?:\s*@\s*|\s*\[?\s*at\s*\]?\s*)[a-zA-Z0-9.-]+(?:\s*\.\s*|\s*\[?\s*dot\s*\]?\s*)[a-zA-Z]{2,}/gi;
    redactedText = redactedText.replace(emailRegex, (match) => '*'.repeat(match.length));

    // 2. Mask Numeric Phone Numbers (Catch ANY sequence with 8 to 15 digits in ANY format e.g. "987654321", "9876543210", "98765 43210", "+91 9876543210", "+91-98765-43210", "09876543210", "98 76 54 32 10")
    const phoneRegex = /(?:\+?\d[\d\s.\-\(\)]{6,}\d)/g;
    redactedText = redactedText.replace(phoneRegex, (match) => {
        const digitCount = (match.match(/\d/g) || []).length;
        if (digitCount >= 8 && digitCount <= 15) {
            return '*'.repeat(match.length);
        }
        return match;
    });

    // 2b. Mask Spelled-Out Digit Sequences with Spaces/Hyphens (e.g. "nine eight seven six five four three two one zero")
    const numberWordsRegex = /\b(?:zero|one|two|three|four|five|six|seven|eight|nine)(?:[\s,.-]+(?:zero|one|two|three|four|five|six|seven|eight|nine)){6,}\b/gi;
    redactedText = redactedText.replace(numberWordsRegex, (match) => '*'.repeat(match.length));

    // 2c. Mask Concatenated Spelled-Out Digit Words without spaces (e.g. "nineeightsevensixfivefourthreetwoone")
    const concatWordsRegex = /\b(?:zero|one|two|three|four|five|six|seven|eight|nine){7,}\b/gi;
    redactedText = redactedText.replace(concatWordsRegex, (match) => '*'.repeat(match.length));

    // 3. Mask URLs (Except Whitelisted Work Tool Domains or Manager/Admin URLs)
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(?:com|org|net|io|app|co|in|us)\/[^\s]*)/gi;
    redactedText = redactedText.replace(urlRegex, (match) => {
        if (isManagerOrAdmin) {
            return match; // Manager / Admin allowed
        }
        const lowerMatch = match.toLowerCase();
        const isWhitelisted = ALLOWED_WORK_DOMAINS.some(domain => lowerMatch.includes(domain));
        if (isWhitelisted) {
            return match; // Whitelisted work domain allowed
        }
        return '*'.repeat(match.length);
    });

    // 4. Mask Physical Address patterns (Explicit prefixes like "h.no:", "house no:", "address:", "flat no:", or keywords like "colony", "nagar", "society", "sector", "road", "street")
    const addressPrefixRegex = /\b(?:h\.?no|house\s*no|flat\s*no|door\s*no|plot\s*no|bldg|building|address|loc|location)\s*[:=-]?\s*[\w\d\s,-.\/]+/gi;
    redactedText = redactedText.replace(addressPrefixRegex, (match) => '*'.repeat(match.length));

    const addressKeywordsRegex = /\b(?:\d+[-/\d]*\s*,?\s*)?[A-Za-z0-9\s.-]+(?:\b(?:colony|nagar|society|sector|block|street|road|avenue|lane|drive|st|rd|ave|dr|blvd|phase|layout|villas|apartment|suite|ste|pin|zip|postal)\b)[A-Za-z0-9\s,.-]*/gi;
    redactedText = redactedText.replace(addressKeywordsRegex, (match) => '*'.repeat(match.length));

    // 5. Mask Social / Messaging Handles (Telegram, WhatsApp, Instagram contact drops)
    const socialRegex = /\b(?:telegram|whatsapp|wa|insta|instagram|discord)\s*[:@-]?\s*[\w+]{3,}\b/gi;
    redactedText = redactedText.replace(socialRegex, (match) => '*'.repeat(match.length));

    // 6. Mask Name Introductions ("i'm <name>", "my name is <name>", "this is <name>", "call me <name>")
    const nameIntroRegex = /\b(?:i'm|im|i am|my name is|my name's|this is|call me)\s+([A-Za-z]{2,}(?:\s+[A-Za-z]{2,})?)\b/gi;
    redactedText = redactedText.replace(nameIntroRegex, (match, p1) => {
        const prefix = match.substring(0, match.length - p1.length);
        return prefix + '*'.repeat(p1.length);
    });

    // 7. Basic Passwords ("password: xxx")
    const passwordRegex = /(?:password|pwd|pass)\s*[:=]\s*[^\s]+/gi;
    redactedText = redactedText.replace(passwordRegex, (match) => {
        const parts = match.split(/[:=]/);
        if (parts.length === 2) {
            return `${parts[0]}: ${'*'.repeat(parts[1].trim().length)}`;
        }
        return '*'.repeat(match.length);
    });

    return redactedText;
};

module.exports = {
    redactSensitiveInfo
};
