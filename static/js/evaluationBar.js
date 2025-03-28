import Colors from "./colors.js";

export default class EvaluationBar {
    constructor(board) {
        this.board = board;
        this.setEvaluationBar("0.0", 0);
    }

    setEvaluationBar(value, scale) {
        const orientation = this.board.getOrientation() === "black";
        scale = orientation ? -scale : scale;
        const height =
            scale === null ? 50 : Math.max(0, Math.min(100, 50 - scale * 50));
        $("#evaluation_bar")
            .css("height", height + "%")
            .attr("aria-valuenow", height);
        if (scale >= 0) {
            $("#evaluation_value").html(value);
            $("#evaluation_bar").html("");
        } else {
            $("#evaluation_bar").html(value);
            $("#evaluation_value").html("");
        }

        document.getElementById("evaluation").style.backgroundColor = orientation
            ? Colors.darkSquareColor
            : Colors.lightSquareColor;
        document.getElementById("evaluation_bar").style.backgroundColor =
            orientation ? Colors.lightSquareColor : Colors.darkSquareColor;
    }

    evaluationToString(evaluation) {
        let value = 0.0;
        if (evaluation.includes(".")) {
            value = parseFloat(evaluation).toFixed(2);
        } else {
            const string = evaluation.replace("#", "");
            value = `M${parseInt(string)}`;
        }

        return value.toString();
    }

    parseEvaluation(evaluation) {
        let scale = 0;
        let value = 0;
        if (evaluation === null || evaluation === undefined) {
            return null;
        }

        if (!evaluation.includes(".")) {
            const integer = parseInt(evaluation.replace("#", ""));
            if (integer === 0) {
                scale = turn ? 1 : -1;
            } else {
                scale = integer > 0 ? 1 : -1;
            }
            value = "M" + Math.abs(integer);
        } else {
            const scaledEvaluation = 0.4 * evaluation;
            scale = scaledEvaluation / (1 + Math.abs(scaledEvaluation));
            value = Math.abs(parseFloat(evaluation)).toFixed(1);
        }

        return [value, scale];
    }

    setEvaluation(evaluation, turn) {
        const result = this.parseEvaluation(evaluation, turn);
        if (result !== null) {
            const [value, scale] = result;
            this.setEvaluationBar(value, scale);
        }
    }

    reset() {
        this.setEvaluationBar("0.0", 0);
    }
}
