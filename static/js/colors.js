class SquareColor {
    constructor(color, lightSquare, darkSquare) {
        this.color = color;
        this.lightSquare = lightSquare;
        this.darkSquare = darkSquare;
    }
}

const lightSquareColor = "#f0d9b5";
const darkSquareColor = "#b58863";

const brilliantMoveColor = new SquareColor("#1baca6", "#62BBAB", "#4EA090");
const greatMoveColor = new SquareColor("#5c8bb0", "#8DA5B2", "#7A8A96");
const bestMoveColor = new SquareColor("#95bb4a", "#B3C56E", "#A0AA52");
const inaccuracyColor = new SquareColor("#e8a825", "#EBB855", "#D79D3A");
const mistakeColor = new SquareColor("#e87a25", "#EB9A55", "#D77F3A");
const missColor = new SquareColor("#ee6b55", "#EF9075", "#DB755A");
const blunderColor = new SquareColor("#ca3431", "#D76B5D", "#C35042");
const forcedColor = new SquareColor("#D0D0D0", "#F0F0F0", "#B5B5B5");

const highlightColor = new SquareColor(
    darkSquareColor,
    darkSquareColor,
    darkSquareColor,
);

const Colors = {
    lightSquareColor,
    darkSquareColor,
    brilliantMoveColor,
    greatMoveColor,
    bestMoveColor,
    inaccuracyColor,
    mistakeColor,
    missColor,
    blunderColor,
    forcedColor,
    highlightColor,
};

export default Colors;
