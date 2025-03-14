import logging
import os
from typing import List, Optional, Tuple

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import execute_values

from modules.endgame.record import Record

logger = logging.getLogger("uvicorn.error")
load_dotenv()


class EndgameDatabase:
    def __init__(self):
        self.db_params = {
            "host": os.getenv("POSTGRES_HOST", "localhost"),
            "port": os.getenv("POSTGRES_PORT", 5432),
            "database": os.getenv("POSTGRES_DB", "chess"),
            "user": os.getenv("POSTGRES_USER"),
            "password": os.getenv("POSTGRES_PASSWORD"),
        }
        self.layouts = self.get_available_layouts()

    def get_connection(self):
        connection = psycopg2.connect(**self.db_params)
        connection.autocommit = False
        return connection

    def create_table(self, layout: str):
        connection = self.get_connection()
        cursor = connection.cursor()
        cursor.execute(
            f"""
            CREATE TABLE IF NOT EXISTS {layout} (
                fen TEXT PRIMARY KEY,
                dtz INTEGER,
                dtm INTEGER,
                white BOOLEAN,
                white_to_move BOOLEAN,
                result TEXT,
                white_pieces TEXT,
                black_pieces TEXT,
                bishop_color BOOLEAN
            )
        """
        )
        cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_fen_{layout} ON {layout} (fen)")
        cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_dtz_{layout} ON {layout} (dtz)")
        cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_dtm_{layout} ON {layout} (dtm)")
        connection.commit()
        connection.close()

    def clear_table(self, layout: str):
        connection = self.get_connection()
        cursor = connection.cursor()
        cursor.execute(f"TRUNCATE TABLE {layout}")
        connection.commit()
        connection.close()

    def save_batch(self, layout: str, batch: List[Tuple]) -> None:
        connection = self.get_connection()
        cursor = connection.cursor()
        execute_values(cursor, f"INSERT INTO {layout} VALUES %s ON CONFLICT (fen) DO NOTHING", batch)
        connection.commit()
        connection.close()

    def get_available_layouts(self) -> List[str]:
        connection = self.get_connection()
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
        """
        )
        tables = cursor.fetchall()

        non_empty_tables = []
        for (table_name,) in tables:
            cursor.execute(f"SELECT 1 FROM {table_name} LIMIT 1")
            if cursor.fetchone() is not None:
                non_empty_tables.append(table_name.upper().replace("V", "v"))

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
        query = f"SELECT fen FROM {layout} WHERE TRUE"
        params = []

        if dtz is not None:
            dtz_values = [2 * (dtz // 2), 2 * (dtz // 2) + 1]
            query += " AND dtz = ANY(%s)"
            params.append(dtz_values)
        if dtm is not None:
            query += " AND dtm = %s"
            params.append(dtm)
        if white is not None:
            query += " AND white = %s"
            params.append(white)
        if white_to_move is not None:
            query += " AND white_to_move = %s"
            params.append(white_to_move)
        if result is not None:
            query += " AND result = %s"
            params.append(result)
        if white_pieces is not None:
            query += " AND white_pieces = %s"
            params.append(white_pieces)
        if black_pieces is not None:
            query += " AND black_pieces = %s"
            params.append(black_pieces)
        if bishop_color is not None:
            query += " AND bishop_color = %s"
            params.append(bishop_color)

        cursor.execute(query, params)
        result = [row[0] for row in cursor.fetchall()]
        connection.close()
        return result

    def get_record_by_fen(self, layout: str, fen: str) -> Optional[Record]:
        fen = " ".join(fen.split(" ")[:4])

        connection = self.get_connection()
        cursor = connection.cursor()
        cursor.execute(
            f"SELECT dtz, dtm, white, white_to_move, result, bishop_color FROM {layout} WHERE fen LIKE %s", (fen + "%",)
        )
        result = cursor.fetchone()
        connection.close()

        if result:
            return Record(fen, *result)
