import logging
import os
import sqlite3
from pathlib import Path
from typing import List, Optional, Tuple, Union

from modules.endgame.record import Record

logger = logging.getLogger("uvicorn.error")


class EndgameDatabase:
    def __init__(self, database_path: Union[str, os.PathLike]):
        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(exist_ok=True)
        self.layouts = self.get_available_layouts()

    def get_connection(self) -> sqlite3.Connection:
        return sqlite3.connect(str(self.database_path), timeout=10.0)

    def create_table(self, layout: str):
        connection = self.get_connection()
        cursor = connection.cursor()
        cursor.execute(
            f"""
            CREATE TABLE IF NOT EXISTS {layout} (
                fen TEXT,
                dtz INTEGER,
                dtm INTEGER,
                white BOOLEAN,
                white_to_move BOOLEAN,
                result TEXT,
                white_pieces TEXT,
                black_pieces TEXT,
                bishop_color BOOLEAN,
                PRIMARY KEY (fen)
            )
        """
        )
        cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_fen ON {layout} (fen)")
        cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_dtz ON {layout} (dtz)")
        cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_dtm ON {layout} (dtm)")
        connection.commit()
        connection.close()

    def clear_table(self, layout: str):
        connection = self.get_connection()
        cursor = connection.cursor()
        cursor.execute(f"DELETE FROM {layout}")
        connection.commit()
        connection.close()

    def save_batch(self, layout: str, batch: List[Tuple]) -> None:
        connection = self.get_connection()
        cursor = connection.cursor()
        cursor.execute("BEGIN TRANSACTION")
        cursor.executemany(f"INSERT OR IGNORE INTO {layout} VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", batch)
        connection.commit()
        connection.close()

    def get_available_layouts(self) -> List[str]:
        connection = self.get_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()

        non_empty_tables = []
        for (table_name,) in tables:
            cursor.execute(f"SELECT 1 FROM {table_name} LIMIT 1")
            if cursor.fetchone() is not None:
                non_empty_tables.append(table_name)

        connection.close()
        return non_empty_tables

    def find_positions(
        self,
        layout: str,
        dtz: Optional[int] = None,
        dtm: Optional[int] = None,
        white: Optional[bool] = None,
        white_to_move: Optional[bool] = None,
        result: Optional[str] = None,
        white_pieces: Optional[str] = None,
        black_pieces: Optional[str] = None,
        bishop_color: Optional[bool] = None,
    ) -> List[str]:
        connection = self.get_connection()
        cursor = connection.cursor()
        query = f"SELECT fen FROM {layout} WHERE 1=1"
        params = []

        if dtz is not None:
            dtz_values = [2 * (dtz // 2), 2 * (dtz // 2) + 1]
            query += " AND dtz IN (?, ?)"
            params.extend(dtz_values)
        if dtm is not None:
            query += " AND dtm = ?"
            params.append(dtm)
        if white is not None:
            query += " AND white = ?"
            params.append(white)
        if white_to_move is not None:
            query += " AND white_to_move = ?"
            params.append(white_to_move)
        if result is not None:
            query += " AND result = ?"
            params.append(result)
        if white_pieces is not None:
            query += " AND white_pieces = ?"
            params.append(white_pieces)
        if black_pieces is not None:
            query += " AND black_pieces = ?"
            params.append(black_pieces)
        if bishop_color is not None:
            query += " AND bishop_color = ?"
            params.append(bishop_color)

        logger.debug(f"Executing query: {query} with parameters: {params}")

        cursor.execute(query, params)
        result = [row[0] for row in cursor.fetchall()]
        connection.close()
        return result

    def get_record_by_fen(self, layout: str, fen: str) -> Optional[Record]:
        fen = " ".join(fen.split(" ")[:4])

        connection = self.get_connection()
        cursor = connection.cursor()
        cursor.execute(
            f"SELECT dtz, dtm, white, white_to_move, result, bishop_color FROM {layout} WHERE fen LIKE ?",
            (fen + "%",),
        )
        result = cursor.fetchone()
        connection.close()

        if result:
            return Record(fen, *result)
