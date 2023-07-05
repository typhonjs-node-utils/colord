/**
 * Clamps a value between an upper and lower bound.
 * We use ternary operators because it makes the minified code
 * is 2 times shorter then `Math.min(Math.max(a,b),c)`
 * NaN is clamped to the lower bound
 */
const clamp = (number, min = 0, max = 1) => {
    return number > max ? max : number > min ? number : min;
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
 * Clamps LAB axis values as defined in CSS Color Level 4 specs.
 * https://www.w3.org/TR/css-color-4/#specifying-lab-lch
 */
const clampLaba = (laba) => ({
    // CIE Lightness values less than 0% must be clamped to 0%.
    // Values greater than 100% are permitted for forwards compatibility with HDR.
    l: clamp(laba.l, 0, 400),
    // A and B axis values are signed (allow both positive and negative values)
    // and theoretically unbounded (but in practice do not exceed ±160).
    a: laba.a,
    b: laba.b,
    alpha: clamp(laba.alpha),
});
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

const mix = (rgba1, rgba2, ratio) => {
    const laba1 = rgbaToLaba(rgba1);
    const laba2 = rgbaToLaba(rgba2);
    const mixture = clampLaba({
        l: laba1.l * (1 - ratio) + laba2.l * ratio,
        a: laba1.a * (1 - ratio) + laba2.a * ratio,
        b: laba1.b * (1 - ratio) + laba2.b * ratio,
        alpha: laba1.alpha * (1 - ratio) + laba2.alpha * ratio,
    });
    return labaToRgba(mixture);
};

/**
 * A plugin adding a color mixing utilities.
 */
const mixPlugin = (ColordClass) => {
    ColordClass.prototype.mix = function (color2, ratio = 0.5) {
        const instance2 = color2 instanceof ColordClass ? color2 : new ColordClass(color2);
        const mixture = mix(this.toRgb(), instance2.toRgb(), ratio);
        return new ColordClass(mixture);
    };
    /**
     * Generate a palette from mixing a source color with another.
     */
    function mixPalette(source, hex, count = 5) {
        const palette = [];
        const step = 1 / (count - 1);
        for (let i = 0; i <= count - 1; i++) {
            palette.push(source.mix(hex, step * i));
        }
        return palette;
    }
    ColordClass.prototype.tints = function (count) {
        return mixPalette(this, "#fff", count);
    };
    ColordClass.prototype.shades = function (count) {
        return mixPalette(this, "#000", count);
    };
    ColordClass.prototype.tones = function (count) {
        return mixPalette(this, "#808080", count);
    };
};

export { mixPlugin as default };
