/**
 * A plugin adding functionality to generate harmony colors.
 * https://en.wikipedia.org/wiki/Harmony_(color)
 */
const harmoniesPlugin = (ColordClass) => {
    /**
     * Harmony colors are colors with particular hue shift of the original color.
     */
    const hueShifts = {
        analogous: [-30, 0, 30],
        complementary: [0, 180],
        "double-split-complementary": [-30, 0, 30, 150, 210],
        rectangle: [0, 60, 180, 240],
        tetradic: [0, 90, 180, 270],
        triadic: [0, 120, 240],
        "split-complementary": [0, 150, 210],
    };
    ColordClass.prototype.harmonies = function (type = "complementary") {
        return hueShifts[type].map((shift) => this.rotate(shift));
    };
};

export { harmoniesPlugin as default };
