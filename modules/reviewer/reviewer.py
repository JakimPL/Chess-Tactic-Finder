import os

import chess
from chess import Board
from stockfish import Stockfish

from modules.configuration import load_configuration
from modules.json import json_save
from modules.processor import Processor
from modules.reviewer.auxiliary import win
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

BEST_MOVE_TOLERANCE = 0.02
GOOD_MOVE_TOLERANCE = 0.02
INACCURACY_TOLERANCE = 0.05
MISTAKE_TOLERANCE = 0.10
BLUNDER_TOLERANCE = 0.20
MATE_DISTANCE_THRESHOLD = 5




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
                board.turn, move, evaluation, best_moves, evaluations
            )

            review.add_move(ReviewedMove(
                move=move,
                turn=white,
                evaluation=evaluation,
                best_moves=list(zip(best_moves, evaluations)),
                move_classification=move_classification
            ))

            board_move = chess.Move.from_uci(move)
            board_move = board.san(board_move)
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
            evaluation: Evaluation,
            evaluations: list[Evaluation],
            best_evaluation: Evaluation,
            best_moves: list[str]
    ) -> MoveClassification:
        if len(evaluations) == 1:
            return MoveClassification('forced', best_evaluation.mate)
        else:
            if best_evaluation.mate:
                if best_evaluation.value > 0:
                    if evaluation.mate:
                        if evaluation.value >= 0:
                            if evaluation.value < best_evaluation.value:
                                return MoveClassification('best', True)
                            elif evaluation.value > best_evaluation.value + MATE_DISTANCE_THRESHOLD:
                                return MoveClassification('mistake', True)
                            elif evaluation.value >= best_evaluation.value:
                                return MoveClassification('inaccuracy', True)
                        else:
                            return MoveClassification('blunder', True, 'stepped into a mate')
                    else:
                        if evaluation.value > 3:
                            return MoveClassification('miss', True, 'missed mate')
                        else:
                            return MoveClassification('blunder', True, 'missed mate')
                else:
                    if evaluation.value < best_evaluation.value - MATE_DISTANCE_THRESHOLD:
                        return MoveClassification('mistake', True)
                    elif evaluation.value < best_evaluation.value:
                        return MoveClassification('inaccuracy', True)
                    elif evaluation.value >= best_evaluation.value:
                        return MoveClassification('best', True)
            else:
                if move in best_moves:
                    return MoveClassification('best', False)
                elif evaluation.mate:
                    if evaluation.value >= 0:
                        raise ValueError('invalid evaluation')
                    else:
                        if best_evaluation.value > -5:
                            return MoveClassification('blunder', True, 'stepped into a mate')
                        else:
                            return MoveClassification('mistake', True, 'stepped into a mate')
                else:
                    win_difference = win(best_evaluation.value) - win(evaluation.value)
                    # great/brilliant/miss logic
                    if win_difference > BLUNDER_TOLERANCE and evaluation.value < 7.5:
                        return MoveClassification('blunder', False)
                    elif win_difference > MISTAKE_TOLERANCE and evaluation.value < 5.0:
                        return MoveClassification('mistake', False)
                    elif win_difference > INACCURACY_TOLERANCE:
                        return MoveClassification('inaccuracy', False)
                    elif win_difference > GOOD_MOVE_TOLERANCE:
                        return MoveClassification('good', False)
                    else:
                        return MoveClassification('excellent', False)

    @staticmethod
    def review_move(
            turn: bool,
            move, evaluation: Evaluation,
            best_moves: list[str],
            evaluations: list[Evaluation]
    ) -> MoveClassification:
        evaluation = -evaluation if not turn else evaluation
        evaluations = [-evaluation if not turn else evaluation for evaluation in evaluations]
        best_evaluation = evaluations[0]

        best_choices = []
        for best_move, move_evaluation in zip(best_moves, evaluations):
            if any([
                best_evaluation.mate and move_evaluation.mate and move_evaluation.value <= best_evaluation.value,
                not best_evaluation.mate and not move_evaluation.mate and move_evaluation.value >= best_evaluation.value - BEST_MOVE_TOLERANCE
            ]):
                best_choices.append(best_move)

        if not evaluation.mate and not best_evaluation.mate and evaluation.value >= best_evaluation.value:
            best_choices.append(move)

        move_classification = Reviewer.classify_move(move, evaluation, evaluations, best_evaluation, best_choices)
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
