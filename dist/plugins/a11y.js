const round = (number, digits = 0, base = Math.pow(10, digits)) => {
    return Math.round(base * number) / base + 0;
};
const floor = (number, digits = 0, base = Math.pow(10, digits)) => {
    return Math.floor(base * number) / base + 0;
};

/**
 * Converts an RGB channel [0-255] to its linear light (un-companded) form [0-1].
 * Linearized RGB values are widely used for color space conversions and contrast calculations
 */
const linearizeRgbChannel = (value) => {
    const ratio = value / 255;
    return ratio < 0.04045 ? ratio / 12.92 : Math.pow((ratio + 0.055) / 1.055, 2.4);
};

/**
 * Returns the perceived luminance of a color [0-1] according to WCAG 2.0.
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
const getLuminance = (rgba) => {
    const sRed = linearizeRgbChannel(rgba.r);
    const sGreen = linearizeRgbChannel(rgba.g);
    const sBlue = linearizeRgbChannel(rgba.b);
    return 0.2126 * sRed + 0.7152 * sGreen + 0.0722 * sBlue;
};

/**
 * Returns a contrast ratio for a color pair [1-21].
 * http://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
const getContrast = (rgb1, rgb2) => {
    const l1 = getLuminance(rgb1);
    const l2 = getLuminance(rgb2);
    return l1 > l2 ? (l1 + 0.05) / (l2 + 0.05) : (l2 + 0.05) / (l1 + 0.05);
};

/**
 * A plugin adding accessibility and color contrast utilities.
 * Follows Web Content Accessibility Guidelines 2.0.
 * https://www.w3.org/TR/WCAG20/
 */
const a11yPlugin = (ColordClass) => {
    /**
     * Returns WCAG text color contrast requirement.
     * Read explanation here https://webaim.org/resources/contrastchecker/
     */
    const getMinimalContrast = ({ level = "AA", size = "normal" }) => {
        if (level === "AAA" && size === "normal")
            return 7;
        if (level === "AA" && size === "large")
            return 3;
        return 4.5;
    };
    ColordClass.prototype.luminance = function () {
        return round(getLuminance(this.rgba), 2);
    };
    ColordClass.prototype.contrast = function (color2 = "#FFF") {
        const instance2 = color2 instanceof ColordClass ? color2 : new ColordClass(color2);
        return floor(getContrast(this.rgba, instance2.toRgb()), 2);
    };
    ColordClass.prototype.isReadable = function (color2 = "#FFF", options = {}) {
        return this.contrast(color2) >= getMinimalContrast(options);
    };
};

export { a11yPlugin as default };
