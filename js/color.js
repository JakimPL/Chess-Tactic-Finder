class SquareColor {
    constructor(color, lightSquare, darkSquare) {
        this.color = color
        this.lightSquare = lightSquare
        this.darkSquare = darkSquare
    }
}

var lightSquareColor = '#f0d9b5'
var darkSquareColor = '#b58863'

var brilliantMoveColor = new SquareColor('#1baca6', '#86c3ae', '#689a85')
var greatMoveColor = new SquareColor('#5c8bb0', '#a6b2b3', '#898a8a')
var bestMoveColor = new SquareColor('#95bb4a', '#c3ca80', '#a5a257')
var inaccuracyColor = new SquareColor('#e8a825', '#ecc16d', '#cf9844')
var mistakeColor = new SquareColor('#e87a25', '#ecaa6d', '#cf8144')
var missColor = new SquareColor('#ee6b55', '#efa285', '#d27a5c')
var blunderColor = new SquareColor('#ca3431', '#dd8773', '#c05e4a')

var highlightColor = new SquareColor(darkSquareColor, darkSquareColor, darkSquareColor)
