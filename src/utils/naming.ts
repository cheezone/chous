import type { NamingStyle } from "../types";

/**
 * Parse a regex pattern string (e.g., "/^\\d+\\./" or "/\\.(get|post)$/i")
 * Returns a RegExp object or null if invalid
 */
function parseRegexPattern(pattern: string): RegExp | null {
    // Pattern format: /pattern/flags
    const match = pattern.match(/^\/(.+)\/([gimuy]*)$/);
    if (!match) return null;
    
    try {
        return new RegExp(match[1]!, match[2]);
    } catch {
        return null;
    }
}

/**
 * Get the base name without extension, handling compound extensions like .d.ts
 * Examples:
 * - "index.d.ts" -> "index"
 * - "foo.ts" -> "foo"
 * - "bar.js" -> "bar"
 * - "0.common.ts" -> "0.common"
 */
function getNameWithoutExtension(name: string): string {
    // Handle compound extensions (e.g., .d.ts, .min.js, .test.tsx, .stories.tsx)
    // Common compound extensions that should be treated as a single extension
    const compoundExtensions = [
        ".d.ts", ".min.js", ".min.css",
        ".test.ts", ".test.js", ".test.tsx", ".test.jsx",
        ".spec.ts", ".spec.js", ".spec.tsx", ".spec.jsx",
        ".stories.ts", ".stories.js", ".stories.tsx", ".stories.jsx"
    ];
    
    for (const ext of compoundExtensions) {
        if (name.endsWith(ext)) {
            return name.slice(0, -ext.length);
        }
    }
    
    // For regular extensions, strip everything after the last dot
    const lastDotIndex = name.lastIndexOf(".");
    return lastDotIndex >= 0 ? name.slice(0, lastDotIndex) : name;
}

/**
 * Check if a regex pattern is optional (contains a top-level optional group)
 * Examples:
 * - /(\.(client|server))?$/i -> true (optional)
 * - /\.(client|server)$/i -> false (required)
 * - /(\d+)?/ -> true (optional)
 * - /^\d+\./ -> false (required)
 * 
 * We check if the pattern ends with `)?` (optional group) or starts with `(...)?`
 */
function isOptionalPattern(pattern: string): boolean {
    // Remove the regex delimiters and flags
    const match = pattern.match(/^\/(.+)\/([gimuy]*)$/);
    if (!match) return false;
    
    const regexBody = match[1]!;
    
    // Check if pattern ends with `)?` which indicates an optional group
    // This handles cases like: /(\.(client|server))?$/i
    if (regexBody.endsWith(')?')) {
        return true;
    }
    
    // Check if pattern starts with an optional group: ^(...)?
    // This handles cases like: /(\d+)?/
    if (/^\([^)]+\)\?/.test(regexBody)) {
        return true;
    }
    
    return false;
}

export type NamingCheckResult = 
    | { valid: true }
    | { valid: false; reason: "prefix"; pattern: string }
    | { valid: false; reason: "suffix"; pattern: string }
    | { valid: false; reason: "style"; style: NamingStyle };

export function checkNamingStyle(
    name: string, 
    style: NamingStyle,
    prefix?: string,
    suffix?: string
): NamingCheckResult {
    // Get base name without extension (handles compound extensions like .d.ts)
    // For files like router.json.get.ts, this removes .ts and gives us router.json.get
    // We'll then match suffix against this (e.g., /\.(get|post)$/i will match .get)
    let nameWithoutExt = getNameWithoutExtension(name);

    // Only check naming style for filenames that contain only \w, _, -, .
    // This allows special characters like [slug], Chinese characters, etc. to pass through
    if (!/^[\w._-]+$/.test(nameWithoutExt)) {
        // If filename contains other characters (e.g., [slug], Chinese, etc.), skip validation
        return { valid: true };
    }

    // Check and remove suffix if configured
    // Suffix must match if it's not optional (marked with ? in regex)
    // Examples:
    // - /\.(client|server)$/i -> required, must match .client or .server
    // - /(\.(client|server))?$/i -> optional, can match or not
    if (suffix) {
        const suffixRegex = parseRegexPattern(suffix);
        if (suffixRegex) {
            const isOptional = isOptionalPattern(suffix);
            const matched = suffixRegex.test(nameWithoutExt);
            
            if (!matched && !isOptional) {
                // Suffix is required but doesn't match - fail validation
                return { valid: false, reason: "suffix", pattern: suffix };
            }
            
            if (matched) {
                // Remove the matched suffix
                nameWithoutExt = nameWithoutExt.replace(suffixRegex, "");
            }
        }
    }

    // Check and remove prefix if configured
    // Prefix must match if it's not optional (marked with ? in regex)
    // Examples:
    // - /^\d+\./ -> required, must match numeric prefix like "0."
    // - /(\d+)?/ -> optional, can match or not
    if (prefix) {
        const prefixRegex = parseRegexPattern(prefix);
        if (prefixRegex) {
            const isOptional = isOptionalPattern(prefix);
            const matched = prefixRegex.test(nameWithoutExt);
            
            if (!matched && !isOptional) {
                // Prefix is required but doesn't match - fail validation
                return { valid: false, reason: "prefix", pattern: prefix };
            }
            
            if (matched) {
                // Remove the matched prefix
                nameWithoutExt = nameWithoutExt.replace(prefixRegex, "");
            }
        }
    }

    // Allow pure numeric names (e.g., "403", "404") to pass all naming style checks
    // This is common for HTTP status code directories or numeric identifiers
    if (/^\d+$/.test(nameWithoutExt)) {
        return { valid: true };
    }

    const styleValid = checkStem(nameWithoutExt, style);
    if (!styleValid) {
        return { valid: false, reason: "style", style };
    }

    return { valid: true };
}

function checkStem(stem: string, style: NamingStyle): boolean {
    switch (style) {
        case "PascalCase":
            return /^[A-Z][a-zA-Z0-9]*$/.test(stem);
        case "camelCase":
            return /^[a-z][a-zA-Z0-9]*$/.test(stem);
        case "kebab-case":
            // For kebab-case, split by dots and check each part
            // This allows filenames like "navigation.json.get.ts" where each part is kebab-case
            // Each part must be: starts with lowercase letter or digit, followed by lowercase letters/digits/hyphens
            // Examples: "navigation", "json", "get", "ts", "my-component", "api-v2", "01-kebab", "01-core-to-parts"
            const parts = stem.split(".");
            // Updated pattern: allow starting with digit or lowercase letter
            const kebabCasePattern = /^[a-z0-9][a-z0-9]*(-[a-z0-9]+)*$/;
            return parts.every(part => {
                // Allow single lowercase letter or digit (e.g., "a", "1")
                if (part.length === 1 && /^[a-z0-9]$/.test(part)) {
                    return true;
                }
                // For longer parts, use the full kebab-case pattern (now allows digit start)
                return kebabCasePattern.test(part);
            });
        case "snake_case":
            // PEP 8 compliant snake_case: allows leading/trailing underscores and multiple consecutive underscores
            // Examples: foo_bar, _foo_bar, foo_bar_, __init__, _private_var_, __dunder__
            // Must contain at least one letter or digit (not pure underscores)
            // Pattern breakdown:
            // - Optional leading underscores: _*
            // - At least one letter/digit followed by optional letters/digits/underscores: [a-z0-9]+[a-z0-9_]*
            // - OR pure dunder name (two or more underscores): _{2,}  (handled separately)
            if (/^_{2,}$/.test(stem)) {
                // Pure underscores (e.g., __, ___) are valid but uncommon, allow them
                return true;
            }
            // Standard snake_case: optional leading underscores, must have at least one letter/digit
            return /^_*[a-z0-9]+[a-z0-9_]*$/.test(stem);
        case "SCREAMING_SNAKE_CASE":
            return /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/.test(stem);
        case "flatcase":
            return /^[a-z0-9]+$/.test(stem);
        default:
            return false;
    }
}
