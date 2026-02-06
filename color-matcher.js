/**
 * Color Matching Utilities
 * Handles color space conversions (RGB, LAB, XYZ, CMYK) and color matching algorithms
 */

/**
 * Convert RGB to XYZ color space
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {Object} XYZ color {x, y, z}
 */
function rgbToXyz(r, g, b) {
    // Normalize RGB to 0-1
    r = r / 255;
    g = g / 255;
    b = b / 255;

    // Apply gamma correction (sRGB)
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    // Convert to XYZ using sRGB matrix
    const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100;
    const y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) * 100;
    const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) * 100;

    return { x, y, z };
}

/**
 * Convert XYZ to LAB color space
 * @param {number} x - X component
 * @param {number} y - Y component
 * @param {number} z - Z component
 * @returns {Object} LAB color {l, a, b}
 */
function xyzToLab(x, y, z) {
    // D65 illuminant (standard daylight)
    const xn = 95.047;
    const yn = 100.000;
    const zn = 108.883;

    // Normalize by illuminant
    x = x / xn;
    y = y / yn;
    z = z / zn;

    // Apply f function
    const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
    const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
    const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);

    const l = (116 * fy) - 16;
    const a = 500 * (fx - fy);
    const b = 200 * (fy - fz);

    return { l, a, b };
}

/**
 * Convert RGB to LAB color space
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {Object} LAB color {l, a, b}
 */
function rgbToLab(r, g, b) {
    const xyz = rgbToXyz(r, g, b);
    return xyzToLab(xyz.x, xyz.y, xyz.z);
}

/**
 * Convert LAB to XYZ color space
 * @param {number} l - L component
 * @param {number} a - A component
 * @param {number} b - B component
 * @returns {Object} XYZ color {x, y, z}
 */
function labToXyz(l, a, b) {
    const yn = 100.000;
    const fy = (l + 16) / 116;
    const fx = a / 500 + fy;
    const fz = fy - b / 200;

    const xr = fx > 0.206897 ? Math.pow(fx, 3) : (fx - 16/116) / 7.787;
    const yr = fy > 0.206897 ? Math.pow(fy, 3) : (fy - 16/116) / 7.787;
    const zr = fz > 0.206897 ? Math.pow(fz, 3) : (fz - 16/116) / 7.787;

    // D65 illuminant
    const xn = 95.047;
    const zn = 108.883;

    return {
        x: xr * xn,
        y: yr * yn,
        z: zr * zn
    };
}

/**
 * Convert XYZ to RGB color space
 * @param {number} x - X component
 * @param {number} y - Y component
 * @param {number} z - Z component
 * @returns {Object} RGB color {r, g, b} (0-255)
 */
function xyzToRgb(x, y, z) {
    // Normalize
    x = x / 100;
    y = y / 100;
    z = z / 100;

    // Convert to linear RGB using sRGB matrix
    let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
    let g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
    let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

    // Apply gamma correction (sRGB)
    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1/2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1/2.4) - 0.055 : 12.92 * g;
    b = b > 0.0031308 ? 1.055 * Math.pow(b, 1/2.4) - 0.055 : 12.92 * b;

    // Clamp and convert to 0-255
    r = Math.max(0, Math.min(255, Math.round(r * 255)));
    g = Math.max(0, Math.min(255, Math.round(g * 255)));
    b = Math.max(0, Math.min(255, Math.round(b * 255)));

    return { r, g, b };
}

/**
 * Convert LAB to RGB color space
 * @param {number} l - L component
 * @param {number} a - A component
 * @param {number} b - B component
 * @returns {Object} RGB color {r, g, b} (0-255)
 */
function labToRgb(l, a, b) {
    const xyz = labToXyz(l, a, b);
    return xyzToRgb(xyz.x, xyz.y, xyz.z);
}

/**
 * Convert RGB to CMYK color space
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {Object} CMYK color {c, m, y, k} (0-100)
 */
function rgbToCmyk(r, g, b) {
    // Normalize to 0-1
    r = r / 255;
    g = g / 255;
    b = b / 255;

    // Calculate K (black)
    const k = 1 - Math.max(r, g, b);
    
    if (k === 1) {
        return { c: 0, m: 0, y: 0, k: 100 };
    }

    const c = ((1 - r - k) / (1 - k)) * 100;
    const m = ((1 - g - k) / (1 - k)) * 100;
    const y = ((1 - b - k) / (1 - k)) * 100;
    const kPercent = k * 100;

    return {
        c: Math.round(c),
        m: Math.round(m),
        y: Math.round(y),
        k: Math.round(kPercent)
    };
}

/**
 * Convert CMYK to RGB color space
 * @param {number} c - Cyan component (0-100)
 * @param {number} m - Magenta component (0-100)
 * @param {number} y - Yellow component (0-100)
 * @param {number} k - Black component (0-100)
 * @returns {Object} RGB color {r, g, b} (0-255)
 */
function cmykToRgb(c, m, y, k) {
    // Normalize to 0-1
    c = c / 100;
    m = m / 100;
    y = y / 100;
    k = k / 100;

    const r = (1 - c) * (1 - k) * 255;
    const g = (1 - m) * (1 - k) * 255;
    const b = (1 - y) * (1 - k) * 255;

    return {
        r: Math.round(Math.max(0, Math.min(255, r))),
        g: Math.round(Math.max(0, Math.min(255, g))),
        b: Math.round(Math.max(0, Math.min(255, b)))
    };
}

/**
 * Calculate Delta E 2000 color difference
 * This is a perceptually uniform color difference formula
 * @param {Object} lab1 - First LAB color {l, a, b}
 * @param {Object} lab2 - Second LAB color {l, a, b}
 * @returns {number} Delta E value (lower = more similar)
 */
function deltaE2000(lab1, lab2) {
    const l1 = lab1.l;
    const a1 = lab1.a;
    const b1 = lab1.b;
    const l2 = lab2.l;
    const a2 = lab2.a;
    const b2 = lab2.b;

    // Calculate chroma and hue
    const c1 = Math.sqrt(a1 * a1 + b1 * b1);
    const c2 = Math.sqrt(a2 * a2 + b2 * b2);
    const cMean = (c1 + c2) / 2;

    const g = 0.5 * (1 - Math.sqrt(Math.pow(cMean, 7) / (Math.pow(cMean, 7) + Math.pow(25, 7))));
    const a1p = (1 + g) * a1;
    const a2p = (1 + g) * a2;

    const c1p = Math.sqrt(a1p * a1p + b1 * b1);
    const c2p = Math.sqrt(a2p * a2p + b2 * b2);

    let h1p = Math.atan2(b1, a1p) * 180 / Math.PI;
    let h2p = Math.atan2(b2, a2p) * 180 / Math.PI;

    if (h1p < 0) h1p += 360;
    if (h2p < 0) h2p += 360;

    const dlp = l2 - l1;
    const dcp = c2p - c1p;
    let dhp = h2p - h1p;

    if (dhp > 180) dhp -= 360;
    if (dhp < -180) dhp += 360;

    const dHp = 2 * Math.sqrt(c1p * c2p) * Math.sin(dhp * Math.PI / 360);

    const lpMean = (l1 + l2) / 2;
    const cpMean = (c1p + c2p) / 2;
    let hpMean = (h1p + h2p) / 2;

    if (Math.abs(h1p - h2p) > 180) {
        hpMean += 180;
        if (hpMean > 360) hpMean -= 360;
    }

    const t = 1 - 0.17 * Math.cos((hpMean - 30) * Math.PI / 180) +
              0.24 * Math.cos(2 * hpMean * Math.PI / 180) +
              0.32 * Math.cos((3 * hpMean + 6) * Math.PI / 180) -
              0.20 * Math.cos((4 * hpMean - 63) * Math.PI / 180);

    const deltaTheta = 30 * Math.exp(-Math.pow((hpMean - 275) / 25, 2));

    const rc = 2 * Math.sqrt(Math.pow(cpMean, 7) / (Math.pow(cpMean, 7) + Math.pow(25, 7)));

    const sl = 1 + (0.015 * Math.pow(lpMean - 50, 2)) / Math.sqrt(20 + Math.pow(lpMean - 50, 2));
    const sc = 1 + 0.045 * cpMean;
    const sh = 1 + 0.015 * cpMean * t;

    const rt = -Math.sin(2 * deltaTheta * Math.PI / 180) * rc;

    const kl = 1;
    const kc = 1;
    const kh = 1;

    const deltaE = Math.sqrt(
        Math.pow(dlp / (kl * sl), 2) +
        Math.pow(dcp / (kc * sc), 2) +
        Math.pow(dHp / (kh * sh), 2) +
        rt * (dcp / (kc * sc)) * (dHp / (kh * sh))
    );

    return deltaE;
}

/**
 * Calculate simple Delta E (CIE76) - faster but less accurate
 * @param {Object} lab1 - First LAB color {l, a, b}
 * @param {Object} lab2 - Second LAB color {l, a, b}
 * @returns {number} Delta E value
 */
function deltaE(lab1, lab2) {
    const dl = lab1.l - lab2.l;
    const da = lab1.a - lab2.a;
    const db = lab1.b - lab2.b;
    return Math.sqrt(dl * dl + da * da + db * db);
}

/**
 * Clamp RGB values to valid range
 * @param {number} r - Red component
 * @param {number} g - Green component
 * @param {number} b - Blue component
 * @returns {Object} Clamped RGB {r, g, b} (0-255)
 */
function clampRgb(r, g, b) {
    return {
        r: Math.max(0, Math.min(255, Math.round(r))),
        g: Math.max(0, Math.min(255, Math.round(g))),
        b: Math.max(0, Math.min(255, Math.round(b)))
    };
}

/**
 * Format RGB as hex string
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {string} Hex color string (e.g., "#FF0000")
 */
function rgbToHex(r, g, b) {
    const toHex = (n) => {
        const hex = Math.round(n).toString(16).padStart(2, '0');
        return hex.toUpperCase();
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Parse hex string to RGB
 * @param {string} hex - Hex color string (e.g., "#FF0000" or "FF0000")
 * @returns {Object} RGB color {r, g, b} (0-255)
 */
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
}

/**
 * Color Matcher Class
 * Generates candidate colors and finds best matches using LAB space
 */
class ColorMatcher {
    constructor(targetRgb) {
        this.targetRgb = targetRgb;
        this.targetLab = rgbToLab(targetRgb.r, targetRgb.g, targetRgb.b);
        this.candidates = [];
        this.currentIndex = 0;
        this.bestMatch = null;
        this.bestDeltaE = Infinity;
    }

    /**
     * Generate initial candidate colors using smart search
     * Uses LAB space to find perceptually similar colors
     */
    generateInitialCandidates(count = 50) {
        this.candidates = [];
        
        // Start with the target color itself
        this.candidates.push({
            rgb: { ...this.targetRgb },
            lab: { ...this.targetLab },
            deltaE: 0
        });

        // Generate candidates using various strategies
        const strategies = [
            () => this.generateGridCandidates(count / 4),
            () => this.generateRandomCandidates(count / 4),
            () => this.generateLabSpaceCandidates(count / 4),
            () => this.generateGradientCandidates(count / 4)
        ];

        strategies.forEach(strategy => {
            const newCandidates = strategy();
            this.candidates.push(...newCandidates);
        });

        // Calculate Delta E for all candidates and sort
        this.candidates.forEach(candidate => {
            candidate.deltaE = deltaE2000(this.targetLab, candidate.lab);
        });

        this.candidates.sort((a, b) => a.deltaE - b.deltaE);

        // Remove duplicates (same RGB values)
        this.candidates = this.candidates.filter((candidate, index, self) => {
            return index === self.findIndex(c => 
                c.rgb.r === candidate.rgb.r &&
                c.rgb.g === candidate.rgb.g &&
                c.rgb.b === candidate.rgb.b
            );
        });

        // Limit to best candidates
        this.candidates = this.candidates.slice(0, count);
    }

    /**
     * Generate candidates using grid search around target RGB
     */
    generateGridCandidates(count) {
        const candidates = [];
        const step = 20; // Step size in RGB space
        const range = Math.floor(Math.sqrt(count)) * step;

        for (let r = Math.max(0, this.targetRgb.r - range); 
             r <= Math.min(255, this.targetRgb.r + range); 
             r += step) {
            for (let g = Math.max(0, this.targetRgb.g - range); 
                 g <= Math.min(255, this.targetRgb.g + range); 
                 g += step) {
                for (let b = Math.max(0, this.targetRgb.b - range); 
                     b <= Math.min(255, this.targetRgb.b + range); 
                     b += step) {
                    if (candidates.length >= count) break;
                    
                    const rgb = { r, g, b };
                    const lab = rgbToLab(r, g, b);
                    candidates.push({ rgb, lab });
                }
                if (candidates.length >= count) break;
            }
            if (candidates.length >= count) break;
        }

        return candidates;
    }

    /**
     * Generate random candidates in RGB space
     */
    generateRandomCandidates(count) {
        const candidates = [];
        for (let i = 0; i < count; i++) {
            const r = Math.floor(Math.random() * 256);
            const g = Math.floor(Math.random() * 256);
            const b = Math.floor(Math.random() * 256);
            const rgb = { r, g, b };
            const lab = rgbToLab(r, g, b);
            candidates.push({ rgb, lab });
        }
        return candidates;
    }

    /**
     * Generate candidates in LAB space (more perceptually uniform)
     */
    generateLabSpaceCandidates(count) {
        const candidates = [];
        const lRange = 30;
        const aRange = 50;
        const bRange = 50;

        for (let i = 0; i < count; i++) {
            // Generate in LAB space around target
            const l = Math.max(0, Math.min(100, 
                this.targetLab.l + (Math.random() - 0.5) * lRange));
            const a = this.targetLab.a + (Math.random() - 0.5) * aRange;
            const b = this.targetLab.b + (Math.random() - 0.5) * bRange;

            // Convert back to RGB
            const rgb = labToRgb(l, a, b);
            const lab = { l, a, b };
            candidates.push({ rgb, lab });
        }

        return candidates;
    }

    /**
     * Generate candidates along gradients from target
     */
    generateGradientCandidates(count) {
        const candidates = [];
        const directions = [
            { r: 1, g: 0, b: 0 },   // Red direction
            { r: 0, g: 1, b: 0 },   // Green direction
            { r: 0, g: 0, b: 1 },   // Blue direction
            { r: 1, g: 1, b: 0 },   // Yellow direction
            { r: 1, g: 0, b: 1 },   // Magenta direction
            { r: 0, g: 1, b: 1 }    // Cyan direction
        ];

        const stepsPerDirection = Math.floor(count / directions.length);

        directions.forEach(dir => {
            for (let i = 1; i <= stepsPerDirection; i++) {
                const factor = i / stepsPerDirection * 50; // Max 50 RGB units
                const r = clampRgb(
                    this.targetRgb.r + dir.r * factor,
                    this.targetRgb.g + dir.g * factor,
                    this.targetRgb.b + dir.b * factor
                );
                const lab = rgbToLab(r.r, r.g, r.b);
                candidates.push({ rgb: r, lab });
            }
        });

        return candidates;
    }

    /**
     * Get next candidate color to test
     */
    getNextCandidate() {
        if (this.currentIndex >= this.candidates.length) {
            return null;
        }
        return this.candidates[this.currentIndex++];
    }

    /**
     * Record feedback for current candidate
     * @param {boolean} isMatch - Whether this color matches
     * @param {Object} candidate - The candidate that was tested
     */
    recordFeedback(isMatch, candidate) {
        if (isMatch && candidate.deltaE < this.bestDeltaE) {
            this.bestMatch = candidate;
            this.bestDeltaE = candidate.deltaE;
        }
    }

    /**
     * Refine search around best match so far
     */
    refineSearch(count = 20) {
        if (!this.bestMatch) {
            return;
        }

        const refined = [];
        const center = this.bestMatch.rgb;
        const range = 15; // Smaller range for refinement
        const step = 5;

        for (let r = Math.max(0, center.r - range); 
             r <= Math.min(255, center.r + range); 
             r += step) {
            for (let g = Math.max(0, center.g - range); 
                 g <= Math.min(255, center.g + range); 
                 g += step) {
                for (let b = Math.max(0, center.b - range); 
                     b <= Math.min(255, center.b + range); 
                     b += step) {
                    if (refined.length >= count) break;
                    
                    const rgb = { r, g, b };
                    const lab = rgbToLab(r, g, b);
                    const deltaE = deltaE2000(this.targetLab, lab);
                    refined.push({ rgb, lab, deltaE });
                }
                if (refined.length >= count) break;
            }
            if (refined.length >= count) break;
        }

        refined.sort((a, b) => a.deltaE - b.deltaE);
        this.candidates.push(...refined);
        this.candidates.sort((a, b) => a.deltaE - b.deltaE);
    }

    /**
     * Get best match found so far
     */
    getBestMatch() {
        return this.bestMatch || this.candidates[0] || null;
    }

    /**
     * Reset to start from beginning
     */
    reset() {
        this.currentIndex = 0;
    }
}
