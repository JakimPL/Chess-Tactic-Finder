import os

from chess import Board
from stockfish import Stockfish

from modules.configuration import load_configuration
from modules.converter import uci_to_san
from modules.json import json_save
from modules.processor import Processor
from modules.reviewer.auxiliary import get_win_difference, get_accuracy
from modules.structures.evaluation import Evaluation
from modules.structures.move_classification import MoveClassification
from modules.structures.review import Review
from modules.structures.reviewed_move import ReviewedMove

configuration = load_configuration()

INPUT_DIRECTORY = configuration['paths']['processed']
OUTPUT_DIRECTORY = configuration['paths']['reviews']
STOCKFISH_PATH = configuration['paths']['stockfish']

STOCKFISH_DEPTH = configuration['stockfish']['depth']
STOCKFISH_PARAMETERS = configuration['stockfish']['parameters']
STOCKFISH_TOP_MOVES = configuration['stockfish']['top_moves']

BEST_MOVE_PAWN_TOLERANCE = configuration['review']['best_move_centipawn_tolerance'] / 100
SIGNIFICANT_DIFFERENCE_THRESHOLD = configuration['review']['significant_difference_threshold']
GOOD_MOVE_THRESHOLD = configuration['review']['good_move_threshold']
INACCURACY_THRESHOLD = configuration['review']['inaccuracy_threshold']
MISTAKE_THRESHOLD = configuration['review']['mistake_threshold']
BLUNDER_THRESHOLD = configuration['review']['blunder_threshold']


BLUNDER_PAWN_THRESHOLD = configuration['review']['blunder_centipawn_threshold'] / 100
MISS_PAWN_THRESHOLD = configuration['review']['miss_centipawn_threshold'] / 100
MISTAKE_PAWN_THRESHOLD = configuration['review']['mistake_centipawn_threshold'] / 100
MISSED_MATE_BLUNDER_PAWN_THRESHOLD = configuration['review']['missed_mate_blunder_centipawn_threshold'] / 100
MATE_STEPPED_BLUNDER_PAWN_THRESHOLD = configuration['review']['mate_stepped_blunder_centipawn_threshold'] / 100
MATE_STEPPED_MISTAKE_PAWN_THRESHOLD = configuration['review']['mate_stepped_mistake_centipawn_threshold'] / 100

MATE_DISTANCE_THRESHOLD = configuration['review']['mate_distance_threshold']
ONE_WAY_TO_MATE_DISTANCE_MIN = configuration['review']['one_way_to_mate_distance_min']
ONE_WAY_TO_MATE_DISTANCE_MAX = configuration['review']['one_way_to_mate_distance_max']

FOUND_THE_MATE = 'Found the mate.'
MISSED_A_MATE = 'Missed a mate.'
DELAYED_A_MATE = 'Delayed a mate.'
STEPPED_INTO_A_MATE = 'Stepped into a mate.'
MISSED_THE_ONLY_ONE_GOOD_MOVE = 'Missed the only one good move.'


class Reviewer(Processor):
    def review_game(
            self,
            moves,
            starting_position,
            headers,
            output_filename,
            stockfish_depth: int = STOCKFISH_DEPTH,
    ) -> Review:
        stockfish = Stockfish(
            path=STOCKFISH_PATH,
            depth=stockfish_depth,
            parameters=STOCKFISH_PARAMETERS
        )

        if starting_position:
            board = Board(starting_position)
            stockfish.set_fen_position(starting_position)
        else:
            board = Board()

        review = Review(headers=headers)
        for idx, move in enumerate(moves):
            move_number = (idx + 1 - int(board.turn)) // 2 + 1
            white = board.turn

            top_moves = stockfish.get_top_moves(STOCKFISH_TOP_MOVES)
            best_moves = [move['Move'] for move in top_moves]
            evaluations = [Evaluation.from_stockfish(move) for move in top_moves]
            stockfish.make_moves_from_current_position([move])
            evaluation = Evaluation.from_evaluation(stockfish.get_evaluation())

            move_classification = self.review_move(
                board.turn, move, evaluation, best_moves, evaluations, review.moves
            )

            best_san_moves = [uci_to_san(board, best_move) for best_move in best_moves]
            review.add_move(ReviewedMove(
                move=move,
                turn=white,
                evaluation=evaluation,
                best_moves=list(zip(best_san_moves, evaluations)),
                move_classification=move_classification
            ))

            board_move = uci_to_san(board, move)
            board.push_san(move)

            move_string = f'{move_number}{"." if white else "..."} {board_move} {"   " if white else " "}'
            print(f'{move_string}\t{evaluation}')

            self.message_sender(
                filename=output_filename,
                fen=board.fen(),
                move_string=move_string,
                evaluation=Evaluation.from_evaluation(stockfish.get_evaluation())
            )

        return review

    @staticmethod
    def classify_move(
            move: str,
            turn: bool,
            evaluation: Evaluation,
            evaluations: list[Evaluation],
            best_evaluation: Evaluation,
            best_moves: list[str],
            history: list[ReviewedMove] = None
    ) -> MoveClassification:
        win_difference = get_win_difference(evaluation, best_evaluation, turn)
        accuracy = get_accuracy(win_difference)
        if len(evaluations) == 1:
            return MoveClassification('forced', best_evaluation.mate, accuracy, 'Forced.')
        else:
            if best_evaluation.mate:
                if best_evaluation.value > 0:
                    if evaluation.mate:
                        if evaluation.value >= 0:
                            only_one_way_to_mate = ONE_WAY_TO_MATE_DISTANCE_MIN <= best_evaluation.value <= ONE_WAY_TO_MATE_DISTANCE_MAX and not (evaluations[1].mate and evaluations[1].value > 0)
                            if evaluation.value < best_evaluation.value:
                                if only_one_way_to_mate:
                                    return MoveClassification('great', True, accuracy, FOUND_THE_MATE)
                                else:
                                    return MoveClassification('best', True, accuracy)
                            elif evaluation.value > best_evaluation.value + MATE_DISTANCE_THRESHOLD:
                                return MoveClassification('mistake', True, accuracy, DELAYED_A_MATE)
                            elif evaluation.value >= best_evaluation.value:
                                return MoveClassification('inaccuracy', True, accuracy, DELAYED_A_MATE)
                            else:
                                raise ValueError('invalid evaluation')
                        else:
                            return MoveClassification('blunder', True, accuracy, STEPPED_INTO_A_MATE)
                    else:
                        if evaluation.value > MISSED_MATE_BLUNDER_PAWN_THRESHOLD:
                            return MoveClassification('miss', True, accuracy, MISSED_A_MATE)
                        else:
                            return MoveClassification('blunder', True, accuracy, MISSED_A_MATE)
                else:
                    if evaluation.value < best_evaluation.value - MATE_DISTANCE_THRESHOLD:
                        return MoveClassification('mistake', True, accuracy)
                    elif evaluation.value < best_evaluation.value:
                        return MoveClassification('inaccuracy', True, accuracy)
                    elif evaluation.value >= best_evaluation.value:
                        return MoveClassification('best', True, accuracy)
            else:
                second_best_win_difference = get_win_difference(evaluations[1], best_evaluation, turn)
                significant_difference = second_best_win_difference > SIGNIFICANT_DIFFERENCE_THRESHOLD
                if move in best_moves:
                    if significant_difference:
                        # TODO: check if this is not trivial recapture/promotion or escaping an attacked piece
                        return MoveClassification('great', False, accuracy)
                    else:
                        return MoveClassification('best', False, accuracy)
                elif evaluation.mate:
                    if evaluation.value >= 0:
                        raise ValueError('invalid evaluation')
                    else:
                        if best_evaluation.value > MATE_STEPPED_BLUNDER_PAWN_THRESHOLD:
                            return MoveClassification('blunder', True, accuracy, STEPPED_INTO_A_MATE)
                        elif best_evaluation.value > MATE_STEPPED_MISTAKE_PAWN_THRESHOLD:
                            return MoveClassification('mistake', True, accuracy, STEPPED_INTO_A_MATE)
                        else:
                            return MoveClassification('excellent', True, accuracy, STEPPED_INTO_A_MATE)
                else:
                    if win_difference > BLUNDER_THRESHOLD and evaluation.value < BLUNDER_PAWN_THRESHOLD:
                        return MoveClassification('blunder', False, accuracy)
                    elif significant_difference and abs(evaluation.value) < MISS_PAWN_THRESHOLD:
                        move_type = 'miss' if history and history[-1].move_classification.type in ['inaccuracy', 'mistake', 'blunder'] else 'mistake'
                        return MoveClassification(move_type, False, accuracy, MISSED_THE_ONLY_ONE_GOOD_MOVE)
                    elif win_difference > MISTAKE_THRESHOLD and evaluation.value < MISTAKE_PAWN_THRESHOLD:
                        return MoveClassification('mistake', False, accuracy)
                    elif win_difference > INACCURACY_THRESHOLD:
                        return MoveClassification('inaccuracy', False, accuracy)
                    elif win_difference > GOOD_MOVE_THRESHOLD:
                        return MoveClassification('good', False, accuracy)
                    else:
                        return MoveClassification('excellent', False, accuracy)

    @staticmethod
    def review_move(
            turn: bool,
            move, evaluation: Evaluation,
            best_moves: list[str],
            evaluations: list[Evaluation],
            history: list[ReviewedMove] = None
    ) -> MoveClassification:
        evaluation = -evaluation if not turn else evaluation
        evaluations = [-evaluation if not turn else evaluation for evaluation in evaluations]
        best_evaluation = evaluations[0]

        best_choices = []
        for best_move, move_evaluation in zip(best_moves, evaluations):
            if any([
                best_evaluation.mate and move_evaluation.mate and move_evaluation.value <= best_evaluation.value,
                not best_evaluation.mate and not move_evaluation.mate and move_evaluation.value >= best_evaluation.value - BEST_MOVE_PAWN_TOLERANCE
            ]):
                best_choices.append(best_move)

        if not evaluation.mate and not best_evaluation.mate and evaluation.value >= best_evaluation.value:
            best_choices.append(move)

        move_classification = Reviewer.classify_move(
            move, turn, evaluation, evaluations, best_evaluation, best_choices, history
        )

        assert isinstance(move_classification, MoveClassification), 'expected a move classification'

        return move_classification

    @staticmethod
    def save_review(review: Review, directory: str):
        review_path = os.path.join(directory, 'review.json')
        review.to_file(review_path.replace('.json', '.rev'))
        json_save(review.to_json(), review_path)

    def __call__(self, *args, **kwargs):
        game_path = os.path.join(INPUT_DIRECTORY, self.filename)
        data = self.preprocess(game_path, OUTPUT_DIRECTORY)

        if data is None:
            return

        moves, headers, starting_position, output_filename, directory, in_progress_file = data
        print(f'Reviewing games to: {output_filename}')

        review = None
        try:
            review = self.review_game(
                moves=moves,
                starting_position=starting_position,
                headers=headers,
                output_filename=output_filename
            )

        except ValueError as error:
            print(f'Stockfish error: {error}')
        except KeyboardInterrupt:
            raise KeyboardInterrupt('interrupted')

        if review is not None and review.moves:
            self.save_review(review, directory)
            print(f'Saved the review.')
        else:
            print(f'No tactics found.')

        os.remove(in_progress_file)
