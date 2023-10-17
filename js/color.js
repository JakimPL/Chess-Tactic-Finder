class SquareColor {
    constructor(color, lightSquare, darkSquare) {
        this.color = color
        this.lightSquare = lightSquare
        this.darkSquare = darkSquare
    }
}

var lightSquareColor = '#f0d9b5'
var darkSquareColor = '#b58863'

var brilliantMoveColor = new SquareColor('#1baca6', '#62BBAB', '#4EA090')
var greatMoveColor = new SquareColor('#5c8bb0', '#8DA5B2', '#7A8A96')
var bestMoveColor = new SquareColor('#95bb4a', '#B3C56E', '#A0AA52')
var inaccuracyColor = new SquareColor('#e8a825', '#EBB855', '#D79D3A')
var mistakeColor = new SquareColor('#e87a25', '#EB9A55', '#D77F3A')
var missColor = new SquareColor('#ee6b55', '#EF9075', '#DB755A')
var blunderColor = new SquareColor('#ca3431', '#D76B5D', '#C35042')

var highlightColor = new SquareColor(darkSquareColor, darkSquareColor, darkSquareColor)
