/**
 * We used to work with 2 digits after the decimal point, but it wasn't accurate enough,
 * so the library produced colors that were perceived differently.
 */
const ALPHA_PRECISION = 3;
/**
 * Valid CSS <angle> units.
 * https://developer.mozilla.org/en-US/docs/Web/CSS/angle
 */
const ANGLE_UNITS = {
    grad: 360 / 400,
    turn: 360,
    rad: 360 / (Math.PI * 2),
};

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
 * Processes and clamps a degree (angle) value properly.
 * Any `NaN` or `Infinity` will be converted to `0`.
 * Examples: -1 => 359, 361 => 1
 */
const clampHue = (degrees) => {
    degrees = isFinite(degrees) ? degrees % 360 : 0;
    return degrees > 0 ? degrees : degrees + 360;
};
/**
 * Converts a hue value to degrees from 0 to 360 inclusive.
 */
const parseHue = (value, unit = "deg") => {
    return Number(value) * (ANGLE_UNITS[unit] || 1);
};

const rgbaToHsva = ({ r, g, b, a }) => {
    const max = Math.max(r, g, b);
    const delta = max - Math.min(r, g, b);
    const hh = delta
        ? max === r
            ? (g - b) / delta
            : max === g
                ? 2 + (b - r) / delta
                : 4 + (r - g) / delta
        : 0;
    return {
        h: 60 * (hh < 0 ? hh + 6 : hh),
        s: max ? (delta / max) * 100 : 0,
        v: (max / 255) * 100,
        a,
    };
};
const hsvaToRgba = ({ h, s, v, a }) => {
    h = (h / 360) * 6;
    s = s / 100;
    v = v / 100;
    const hh = Math.floor(h), b = v * (1 - s), c = v * (1 - (h - hh) * s), d = v * (1 - (1 - h + hh) * s), module = hh % 6;
    return {
        r: [v, c, b, b, d, v][module] * 255,
        g: [d, v, v, c, b, b][module] * 255,
        b: [b, b, d, v, v, c][module] * 255,
        a: a,
    };
};

const clampHwba = (hwba) => ({
    h: clampHue(hwba.h),
    w: clamp(hwba.w, 0, 100),
    b: clamp(hwba.b, 0, 100),
    a: clamp(hwba.a),
});
const roundHwba = (hwba, digits = 0) => ({
    h: round(hwba.h, digits),
    w: round(hwba.w, digits),
    b: round(hwba.b, digits),
    a: round(hwba.a, ALPHA_PRECISION > digits ? ALPHA_PRECISION : digits),
});
const rgbaToHwba = (rgba) => {
    const { h } = rgbaToHsva(rgba);
    const w = (Math.min(rgba.r, rgba.g, rgba.b) / 255) * 100;
    const b = 100 - (Math.max(rgba.r, rgba.g, rgba.b) / 255) * 100;
    return { h, w, b, a: rgba.a };
};
const hwbaToRgba = (hwba) => {
    return hsvaToRgba({
        h: hwba.h,
        s: hwba.b === 100 ? 0 : 100 - (hwba.w / (100 - hwba.b)) * 100,
        v: 100 - hwba.b,
        a: hwba.a,
    });
};
const parseHwba = ({ h, w, b, a = 1 }) => {
    if (!isPresent(h) || !isPresent(w) || !isPresent(b))
        return null;
    const hwba = clampHwba({
        h: Number(h),
        w: Number(w),
        b: Number(b),
        a: Number(a),
    });
    return hwbaToRgba(hwba);
};

// The only valid HWB syntax
// hwb( <hue> <percentage> <percentage> [ / <alpha-value> ]? )
const hwbaMatcher = /^hwb\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s+([+-]?\d*\.?\d+)%\s+([+-]?\d*\.?\d+)%\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i;
/**
 * Parses a valid HWB[A] CSS color function/string
 * https://www.w3.org/TR/css-color-4/#the-hwb-notation
 */
const parseHwbaString = (input) => {
    const match = hwbaMatcher.exec(input);
    if (!match)
        return null;
    const hwba = clampHwba({
        h: parseHue(match[1], match[2]),
        w: Number(match[3]),
        b: Number(match[4]),
        a: match[5] === undefined ? 1 : Number(match[5]) / (match[6] ? 100 : 1),
    });
    return hwbaToRgba(hwba);
};
const rgbaToHwbaString = (rgba, digits = 0) => {
    const { h, w, b, a } = roundHwba(rgbaToHwba(rgba), digits);
    return a < 1 ? `hwb(${h} ${w}% ${b}% / ${a})` : `hwb(${h} ${w}% ${b}%)`;
};

/**
 * A plugin adding support for HWB (Hue-Whiteness-Blackness) color model.
 * https://en.wikipedia.org/wiki/HWB_color_model
 * https://www.w3.org/TR/css-color-4/#the-hwb-notation
 */
const hwbPlugin = (ColordClass, parsers) => {
    ColordClass.prototype.toHwb = function (digits = 0) {
        return roundHwba(rgbaToHwba(this.rgba), digits);
    };
    ColordClass.prototype.toHwbString = function (digits = 0) {
        return rgbaToHwbaString(this.rgba, digits);
    };
    parsers.string.push([parseHwbaString, "hwb"]);
    parsers.object.push([parseHwba, "hwb"]);
};

export { hwbPlugin as default };
