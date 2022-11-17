import { LchaColor } from "../types";
import { Plugin } from "../extend";
import { parseLcha, roundLcha, rgbaToLcha } from "../colorModels/lch";
import { parseLchaString, rgbaToLchaString } from "../colorModels/lchString";

declare module "../colord" {
  interface Colord {
    /**
     * Converts a color to CIELCH (Lightness-Chroma-Hue) color space and returns an object.
     * https://lea.verou.me/2020/04/lch-colors-in-css-what-why-and-how/
     * https://en.wikipedia.org/wiki/CIELAB_color_space#Cylindrical_model
     */
    toLch(digits?: number): LchaColor;
    /**
     * Converts a color to CIELCH (Lightness-Chroma-Hue) color space and returns a string.
     * https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/lch()
     */
    toLchString(digits?: number): string;
  }
}

/**
 * A plugin adding support for CIELCH color space.
 * https://lea.verou.me/2020/04/lch-colors-in-css-what-why-and-how/
 * https://en.wikipedia.org/wiki/CIELAB_color_space#Cylindrical_model
 */
const lchPlugin: Plugin = (ColordClass, parsers): void => {
  ColordClass.prototype.toLch = function (digits = 2) {
    return roundLcha(rgbaToLcha(this.rgba), digits);
  };

  ColordClass.prototype.toLchString = function (digits = 2) {
    return rgbaToLchaString(this.rgba, digits);
  };

  parsers.string.push([parseLchaString, "lch"]);
  parsers.object.push([parseLcha, "lch"]);
};

export default lchPlugin;
