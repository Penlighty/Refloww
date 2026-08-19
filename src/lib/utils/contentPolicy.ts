/**
 * Refloww Platform Content Safety & Policy Enforcer
 * Strictly prohibits listing illicit/controlled substances, alcoholic beverages,
 * adult toys, or sexually explicit materials across storefronts and product catalogs.
 */

export const PROHIBITED_KEYWORDS = [
    // Alcoholic Beverages & Spirits
    'alcohol', 'alcoholic', 'beer', 'beers', 'wine', 'wines', 'spirits', 'vodka', 
    'whiskey', 'whisky', 'gin', 'rum', 'brandy', 'tequila', 'liquor', 'champagne', 
    'cider', 'cocktail', 'brewery', 'homebrew', 'distillery', 'booze',

    // Illicit & Controlled Substances / Paraphernalia
    'illicit', 'narcotic', 'narcotics', 'weed', 'cannabis', 'marijuana', 'cbd', 
    'thc', 'hemp', 'vape', 'vaping', 'e-cigarette', 'tobacco', 'cigarette', 
    'cigarettes', 'cigar', 'cigars', 'shisha', 'hookah', 'psychedelic', 'shrooms', 
    'magic mushroom', 'cocaine', 'heroin', 'meth', 'ecstasy', 'opioid',

    // Adult Toys, Erotica & Explicit Materials
    'adult toy', 'adult toys', 'sex toy', 'sex toys', 'vibrator', 'dildo', 'erotica', 
    'erotic', 'porn', 'pornography', 'nsfw', 'sensual toy', 'fetish', 'intimate toy', 
    'adult novelties', 'sexual wellness'
];

export interface PolicyValidationResult {
    isValid: boolean;
    violationReason?: string;
    detectedTerm?: string;
}

/**
 * Validates text inputs against the platform's prohibited content policy
 */
export function validateContentPolicy(content: string | Record<string, any>): PolicyValidationResult {
    if (!content) return { isValid: true };

    let combinedText = '';
    if (typeof content === 'string') {
        combinedText = content.toLowerCase();
    } else if (typeof content === 'object') {
        combinedText = Object.values(content)
            .filter(val => typeof val === 'string')
            .join(' ')
            .toLowerCase();
    }

    for (const term of PROHIBITED_KEYWORDS) {
        // Regex word boundary matching to prevent false positives (e.g. "wine" in "twin")
        const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(combinedText)) {
            return {
                isValid: false,
                detectedTerm: term,
                violationReason: `Listing prohibited content ("${term}") violates Refloww's Safety Policy. Alcoholic beverages, controlled/illicit substances, and adult toys or explicit materials are strictly forbidden.`,
            };
        }
    }

    return { isValid: true };
}
