/**
 * We used to work with 2 digits after the decimal point, but it wasn't accurate enough,
 * so the library produced colors that were perceived differently.
 */
const ALPHA_PRECISION = 3;

const isPresent = (value) => {
    if (typeof value === "string")
        return value.length > 0;
    if (typeof value === "number")
        return true;
    return false;
};
const round = (number, digits = 0, base = Math.pow(10, digits)) => {
    return Math.round(base * number) / base + 0;
};
/**
 * Clamps a value between an upper and lower bound.
 * We use ternary operators because it makes the minified code
 * is 2 times shorter then `Math.min(Math.max(a,b),c)`
 * NaN is clamped to the lower bound
 */
const clamp = (number, min = 0, max = 1) => {
    return number > max ? max : number > min ? number : min;
};

/**
 * Clamps the CMYK color object values.
 */
const clampCmyka = (cmyka) => ({
    c: clamp(cmyka.c, 0, 100),
    m: clamp(cmyka.m, 0, 100),
    y: clamp(cmyka.y, 0, 100),
    k: clamp(cmyka.k, 0, 100),
    a: clamp(cmyka.a),
});
/**
 * Rounds the CMYK color object values.
 */
const roundCmyka = (cmyka, digits = 2) => ({
    c: round(cmyka.c, digits),
    m: round(cmyka.m, digits),
    y: round(cmyka.y, digits),
    k: round(cmyka.k, digits),
    a: round(cmyka.a, ALPHA_PRECISION > digits ? ALPHA_PRECISION : digits),
});
/**
 * Transforms the CMYK color object to RGB.
 * https://www.rapidtables.com/convert/color/cmyk-to-rgb.html
 */
function cmykaToRgba(cmyka) {
    return {
        r: round(255 * (1 - cmyka.c / 100) * (1 - cmyka.k / 100)),
        g: round(255 * (1 - cmyka.m / 100) * (1 - cmyka.k / 100)),
        b: round(255 * (1 - cmyka.y / 100) * (1 - cmyka.k / 100)),
        a: cmyka.a,
    };
}
/**
 * Convert RGB Color Model object to CMYK.
 * https://www.rapidtables.com/convert/color/rgb-to-cmyk.html
 */
function rgbaToCmyka(rgba) {
    const k = 1 - Math.max(rgba.r / 255, rgba.g / 255, rgba.b / 255);
    const c = (1 - rgba.r / 255 - k) / (1 - k);
    const m = (1 - rgba.g / 255 - k) / (1 - k);
    const y = (1 - rgba.b / 255 - k) / (1 - k);
    return {
        c: isNaN(c) ? 0 : round(c * 100),
        m: isNaN(m) ? 0 : round(m * 100),
        y: isNaN(y) ? 0 : round(y * 100),
        k: round(k * 100),
        a: rgba.a,
    };
}
/**
 * Parses the CMYK color object into RGB.
 */
function parseCmyka({ c, m, y, k, a = 1 }) {
    if (!isPresent(c) || !isPresent(m) || !isPresent(y) || !isPresent(k))
        return null;
    const cmyk = clampCmyka({
        c: Number(c),
        m: Number(m),
        y: Number(y),
        k: Number(k),
        a: Number(a),
    });
    return cmykaToRgba(cmyk);
}

const cmykMatcher = /^device-cmyk\(\s*([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i;
/**
 * Parses a valid CMYK CSS color function/string
 * https://www.w3.org/TR/css-color-4/#device-cmyk
 */
const parseCmykaString = (input) => {
    const match = cmykMatcher.exec(input);
    if (!match)
        return null;
    const cmyka = clampCmyka({
        c: Number(match[1]) * (match[2] ? 1 : 100),
        m: Number(match[3]) * (match[4] ? 1 : 100),
        y: Number(match[5]) * (match[6] ? 1 : 100),
        k: Number(match[7]) * (match[8] ? 1 : 100),
        a: match[9] === undefined ? 1 : Number(match[9]) / (match[10] ? 100 : 1),
    });
    return cmykaToRgba(cmyka);
};
function rgbaToCmykaString(rgb, digits = 2) {
    const { c, m, y, k, a } = roundCmyka(rgbaToCmyka(rgb), digits);
    return a < 1
        ? `device-cmyk(${c}% ${m}% ${y}% ${k}% / ${a})`
        : `device-cmyk(${c}% ${m}% ${y}% ${k}%)`;
}

/**
 * A plugin adding support for CMYK color space.
 * https://lea.verou.me/2009/03/cmyk-colors-in-css-useful-or-useless/
 * https://en.wikipedia.org/wiki/CMYK_color_model
 */
const cmykPlugin = (ColordClass, parsers) => {
    ColordClass.prototype.toCmyk = function (digits = 0) {
        return roundCmyka(rgbaToCmyka(this.rgba), digits);
    };
    ColordClass.prototype.toCmykString = function (digits = 2) {
        return rgbaToCmykaString(this.rgba, digits);
    };
    parsers.object.push([parseCmyka, "cmyk"]);
    parsers.string.push([parseCmykaString, "cmyk"]);
};

export { cmykPlugin as default };
