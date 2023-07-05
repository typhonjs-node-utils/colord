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

const clampRgba = (rgba) => ({
    r: clamp(rgba.r, 0, 255),
    g: clamp(rgba.g, 0, 255),
    b: clamp(rgba.b, 0, 255),
    a: clamp(rgba.a),
});
/**
 * Converts an RGB channel [0-255] to its linear light (un-companded) form [0-1].
 * Linearized RGB values are widely used for color space conversions and contrast calculations
 */
const linearizeRgbChannel = (value) => {
    const ratio = value / 255;
    return ratio < 0.04045 ? ratio / 12.92 : Math.pow((ratio + 0.055) / 1.055, 2.4);
};
/**
 * Converts an linear-light sRGB channel [0-1] back to its gamma corrected form [0-255]
 */
const unlinearizeRgbChannel = (ratio) => {
    const value = ratio > 0.0031308 ? 1.055 * Math.pow(ratio, 1 / 2.4) - 0.055 : 12.92 * ratio;
    return value * 255;
};

// Theoretical light source that approximates "warm daylight" and follows the CIE standard.
// https://en.wikipedia.org/wiki/Standard_illuminant
const D50 = {
    x: 96.422,
    y: 100,
    z: 82.521,
};
/**
 * Limits XYZ axis values assuming XYZ is relative to D50.
 */
const clampXyza = (xyza) => ({
    x: clamp(xyza.x, 0, D50.x),
    y: clamp(xyza.y, 0, D50.y),
    z: clamp(xyza.z, 0, D50.z),
    a: clamp(xyza.a),
});
/**
 * Performs Bradford chromatic adaptation from D65 to D50
 */
const adaptXyzaToD50 = (xyza) => ({
    x: xyza.x * 1.0478112 + xyza.y * 0.0228866 + xyza.z * -0.050127,
    y: xyza.x * 0.0295424 + xyza.y * 0.9904844 + xyza.z * -0.0170491,
    z: xyza.x * -0.0092345 + xyza.y * 0.0150436 + xyza.z * 0.7521316,
    a: xyza.a,
});
/**
 * Performs Bradford chromatic adaptation from D50 to D65
 */
const adaptXyzToD65 = (xyza) => ({
    x: xyza.x * 0.9555766 + xyza.y * -0.0230393 + xyza.z * 0.0631636,
    y: xyza.x * -0.0282895 + xyza.y * 1.0099416 + xyza.z * 0.0210077,
    z: xyza.x * 0.0122982 + xyza.y * -0.020483 + xyza.z * 1.3299098,
});
/**
 * Converts an CIE XYZ color (D50) to RGBA color space (D65)
 * https://www.w3.org/TR/css-color-4/#color-conversion-code
 */
const xyzaToRgba = (sourceXyza) => {
    const xyz = adaptXyzToD65(sourceXyza);
    return clampRgba({
        r: unlinearizeRgbChannel(0.032404542 * xyz.x - 0.015371385 * xyz.y - 0.004985314 * xyz.z),
        g: unlinearizeRgbChannel(-0.00969266 * xyz.x + 0.018760108 * xyz.y + 0.00041556 * xyz.z),
        b: unlinearizeRgbChannel(0.000556434 * xyz.x - 0.002040259 * xyz.y + 0.010572252 * xyz.z),
        a: sourceXyza.a,
    });
};
/**
 * Converts an RGB color (D65) to CIE XYZ (D50)
 * https://image-engineering.de/library/technotes/958-how-to-convert-between-srgb-and-ciexyz
 */
const rgbaToXyza = (rgba) => {
    const sRed = linearizeRgbChannel(rgba.r);
    const sGreen = linearizeRgbChannel(rgba.g);
    const sBlue = linearizeRgbChannel(rgba.b);
    // Convert an array of linear-light sRGB values to CIE XYZ
    // using sRGB own white (D65 no chromatic adaptation)
    const xyza = {
        x: (sRed * 0.4124564 + sGreen * 0.3575761 + sBlue * 0.1804375) * 100,
        y: (sRed * 0.2126729 + sGreen * 0.7151522 + sBlue * 0.072175) * 100,
        z: (sRed * 0.0193339 + sGreen * 0.119192 + sBlue * 0.9503041) * 100,
        a: rgba.a,
    };
    return clampXyza(adaptXyzaToD50(xyza));
};

// Conversion factors from https://en.wikipedia.org/wiki/CIELAB_color_space
const e = 216 / 24389;
const k = 24389 / 27;
/**
 * Performs RGB → CIEXYZ → LAB color conversion
 * https://www.w3.org/TR/css-color-4/#color-conversion-code
 */
const rgbaToLaba = (rgba) => {
    // Compute XYZ scaled relative to D50 reference white
    const xyza = rgbaToXyza(rgba);
    let x = xyza.x / D50.x;
    let y = xyza.y / D50.y;
    let z = xyza.z / D50.z;
    x = x > e ? Math.cbrt(x) : (k * x + 16) / 116;
    y = y > e ? Math.cbrt(y) : (k * y + 16) / 116;
    z = z > e ? Math.cbrt(z) : (k * z + 16) / 116;
    return {
        l: 116 * y - 16,
        a: 500 * (x - y),
        b: 200 * (y - z),
        alpha: xyza.a,
    };
};
/**
 * Performs LAB → CIEXYZ → RGB color conversion
 * https://www.w3.org/TR/css-color-4/#color-conversion-code
 */
const labaToRgba = (laba) => {
    const y = (laba.l + 16) / 116;
    const x = laba.a / 500 + y;
    const z = y - laba.b / 200;
    return xyzaToRgba({
        x: (Math.pow(x, 3) > e ? Math.pow(x, 3) : (116 * x - 16) / k) * D50.x,
        y: (laba.l > k * e ? Math.pow((laba.l + 16) / 116, 3) : laba.l / k) * D50.y,
        z: (Math.pow(z, 3) > e ? Math.pow(z, 3) : (116 * z - 16) / k) * D50.z,
        a: laba.alpha,
    });
};

/**
 * Limits LCH axis values.
 * https://www.w3.org/TR/css-color-4/#specifying-lab-lch
 * https://lea.verou.me/2020/04/lch-colors-in-css-what-why-and-how/#how-does-lch-work
 */
const clampLcha = (laba) => ({
    l: clamp(laba.l, 0, 100),
    c: laba.c,
    h: clampHue(laba.h),
    a: laba.a,
});
const roundLcha = (laba, digits = 2) => ({
    l: round(laba.l, digits),
    c: round(laba.c, digits),
    h: round(laba.h, digits),
    a: round(laba.a, ALPHA_PRECISION > digits ? ALPHA_PRECISION : digits),
});
const parseLcha = ({ l, c, h, a = 1 }) => {
    if (!isPresent(l) || !isPresent(c) || !isPresent(h))
        return null;
    const lcha = clampLcha({
        l: Number(l),
        c: Number(c),
        h: Number(h),
        a: Number(a),
    });
    return lchaToRgba(lcha);
};
/**
 * Performs RGB → CIEXYZ → CIELAB → CIELCH color conversion
 * https://www.w3.org/TR/css-color-4/#color-conversion-code
 */
const rgbaToLcha = (rgba) => {
    const laba = rgbaToLaba(rgba);
    // Round axis values to get proper values for grayscale colors
    const a = round(laba.a, 3);
    const b = round(laba.b, 3);
    const hue = 180 * (Math.atan2(b, a) / Math.PI);
    return {
        l: laba.l,
        c: Math.sqrt(a * a + b * b),
        h: hue < 0 ? hue + 360 : hue,
        a: laba.alpha,
    };
};
/**
 * Performs CIELCH → CIELAB → CIEXYZ → RGB color conversion
 * https://www.w3.org/TR/css-color-4/#color-conversion-code
 */
const lchaToRgba = (lcha) => {
    return labaToRgba({
        l: lcha.l,
        a: lcha.c * Math.cos((lcha.h * Math.PI) / 180),
        b: lcha.c * Math.sin((lcha.h * Math.PI) / 180),
        alpha: lcha.a,
    });
};

// The only valid LCH syntax
// lch() = lch( <percentage> <number> <hue> [ / <alpha-value> ]? )
const lchaMatcher = /^lch\(\s*([+-]?\d*\.?\d+)%\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i;
/**
 * Parses a valid LCH CSS color function/string
 * https://www.w3.org/TR/css-color-4/#specifying-lab-lch
 */
const parseLchaString = (input) => {
    const match = lchaMatcher.exec(input);
    if (!match)
        return null;
    const lcha = clampLcha({
        l: Number(match[1]),
        c: Number(match[2]),
        h: parseHue(match[3], match[4]),
        a: match[5] === undefined ? 1 : Number(match[5]) / (match[6] ? 100 : 1),
    });
    return lchaToRgba(lcha);
};
const rgbaToLchaString = (rgba, digits = 2) => {
    const { l, c, h, a } = roundLcha(rgbaToLcha(rgba), digits);
    return a < 1 ? `lch(${l}% ${c} ${h} / ${a})` : `lch(${l}% ${c} ${h})`;
};

/**
 * A plugin adding support for CIELCH color space.
 * https://lea.verou.me/2020/04/lch-colors-in-css-what-why-and-how/
 * https://en.wikipedia.org/wiki/CIELAB_color_space#Cylindrical_model
 */
const lchPlugin = (ColordClass, parsers) => {
    ColordClass.prototype.toLch = function (digits = 2) {
        return roundLcha(rgbaToLcha(this.rgba), digits);
    };
    ColordClass.prototype.toLchString = function (digits = 2) {
        return rgbaToLchaString(this.rgba, digits);
    };
    parsers.string.push([parseLchaString, "lch"]);
    parsers.object.push([parseLcha, "lch"]);
};

export { lchPlugin as default };
