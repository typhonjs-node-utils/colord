import { CmykaColor } from "../types";
import { Plugin } from "../extend";
import { parseCmyka, roundCmyka, rgbaToCmyka } from "../colorModels/cmyk";
import { parseCmykaString, rgbaToCmykaString } from "../colorModels/cmykString";

declare module "../colord" {
  interface Colord {
    /**
     * Converts a color to CMYK color space and returns an object.
     * https://drafts.csswg.org/css-color/#cmyk-colors
     * https://lea.verou.me/2009/03/cmyk-colors-in-css-useful-or-useless/
     */
    toCmyk(digits?: number): CmykaColor;
    /**
     * Converts a color to CMYK color space and returns a string.
     * https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/device-cmyk()
     */
    toCmykString(digits?: number): string;
  }
}

/**
 * A plugin adding support for CMYK color space.
 * https://lea.verou.me/2009/03/cmyk-colors-in-css-useful-or-useless/
 * https://en.wikipedia.org/wiki/CMYK_color_model
 */
const cmykPlugin: Plugin = (ColordClass, parsers): void => {
  ColordClass.prototype.toCmyk = function (digits = 0) {
    return roundCmyka(rgbaToCmyka(this.rgba), digits);
  };

  ColordClass.prototype.toCmykString = function (digits = 2) {
    return rgbaToCmykaString(this.rgba, digits);
  };

  parsers.object.push([parseCmyka, "cmyk"]);
  parsers.string.push([parseCmykaString, "cmyk"]);
};

export default cmykPlugin;
