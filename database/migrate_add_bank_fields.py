"""
migrate_add_bank_fields.py
--------------------------
Add structured bank detail columns to the admins table.
Run once:  python migrate_add_bank_fields.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import app
from models import db

COLUMNS = [
    ("bank_name",            "VARCHAR(150) DEFAULT NULL"),
    ("account_holder_name",  "VARCHAR(150) DEFAULT NULL"),
    ("account_number",       "VARCHAR(50)  DEFAULT NULL"),
    ("ifsc_code",            "VARCHAR(20)  DEFAULT NULL"),
    ("branch_name",          "VARCHAR(150) DEFAULT NULL"),
]


def migrate():
    with app.app_context():
        conn = db.engine.connect()

        for col_name, col_def in COLUMNS:
            # Check if column already exists
            result = conn.execute(db.text(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() "
                "AND TABLE_NAME = 'admins' "
                f"AND COLUMN_NAME = '{col_name}'"
            ))
            exists = result.scalar()

            if exists:
                print(f"  [OK]  Column '{col_name}' already exists -- skipping")
            else:
                conn.execute(db.text(
                    f"ALTER TABLE admins ADD COLUMN {col_name} {col_def}"
                ))
                conn.commit()
                print(f"  [ADDED]  Added column '{col_name}' to admins table")

        conn.close()
        print("\n[DONE] Migration complete!")


if __name__ == "__main__":
    migrate()
