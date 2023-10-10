from chess.pgn import Headers


def get_headers(dictionary: dict) -> Headers:
    headers = Headers()
    headers._tag_roster = dictionary['_tag_roster']
    headers._others = dictionary['_others']
    return headers
