import { HwbaColor } from "../types";
import { Plugin } from "../extend";
import { parseHwba, rgbaToHwba, roundHwba } from "../colorModels/hwb";
import { parseHwbaString, rgbaToHwbaString } from "../colorModels/hwbString";

declare module "../colord" {
  interface Colord {
    /**
     * Converts a color to HWB (Hue-Whiteness-Blackness) color space and returns an object.
     * https://en.wikipedia.org/wiki/HWB_color_model
     */
    toHwb(digits?: number): HwbaColor;
    /**
     * Converts a color to HWB (Hue-Whiteness-Blackness) color space and returns a string.
     * https://www.w3.org/TR/css-color-4/#the-hwb-notation
     */
    toHwbString(digits?: number): string;
  }
}

/**
 * A plugin adding support for HWB (Hue-Whiteness-Blackness) color model.
 * https://en.wikipedia.org/wiki/HWB_color_model
 * https://www.w3.org/TR/css-color-4/#the-hwb-notation
 */
const hwbPlugin: Plugin = (ColordClass, parsers): void => {
  ColordClass.prototype.toHwb = function (digits = 0) {
    return roundHwba(rgbaToHwba(this.rgba), digits);
  };

  ColordClass.prototype.toHwbString = function (digits = 0) {
    return rgbaToHwbaString(this.rgba, digits);
  };

  parsers.string.push([parseHwbaString, "hwb"]);
  parsers.object.push([parseHwba, "hwb"]);
};

export default hwbPlugin;
