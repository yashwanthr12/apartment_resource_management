"""
migrate_add_expenditures.py
---------------------------
Migration script to add the 'expenditures' table and
'expenditure_id' + 'maintenance' category to the existing 'expenses' table.

Run once:
    python migrate_add_expenditures.py
"""

import os
import sys

# ── Ensure the project root is importable ──
sys.path.insert(0, os.path.dirname(__file__))

from app import app, db
from sqlalchemy import text


def migrate():
    with app.app_context():
        conn = db.engine.connect()

        # ── 1. Create expenditures table if it doesn't exist ──
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS expenditures (
                id              INT AUTO_INCREMENT PRIMARY KEY,
                apartment_name  VARCHAR(150)  NOT NULL,
                from_date       DATE          NOT NULL,
                to_date         DATE          NOT NULL,
                total_amount    DECIMAL(10,2) NOT NULL,
                total_houses    INT           NOT NULL,
                per_person_amount DECIMAL(10,2) NOT NULL,
                created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (apartment_name) REFERENCES admins(apartment_name)
                    ON UPDATE CASCADE ON DELETE CASCADE
            ) ENGINE=InnoDB;
        """))
        print("[OK] 'expenditures' table created (or already exists).")

        # ── 2. Add expenditure_id column to expenses if missing ──
        result = conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.columns "
            "WHERE table_schema = DATABASE() "
            "AND table_name = 'expenses' "
            "AND column_name = 'expenditure_id'"
        ))
        if result.scalar() == 0:
            conn.execute(text(
                "ALTER TABLE expenses "
                "ADD COLUMN expenditure_id INT DEFAULT NULL"
            ))
            conn.execute(text(
                "ALTER TABLE expenses "
                "ADD CONSTRAINT fk_expense_expenditure "
                "FOREIGN KEY (expenditure_id) REFERENCES expenditures(id) "
                "ON UPDATE CASCADE ON DELETE SET NULL"
            ))
            print("[OK] 'expenditure_id' column added to 'expenses' table.")
        else:
            print("[INFO] 'expenditure_id' column already exists in 'expenses'.")

        # ── 3. Add 'maintenance' to category enum if missing ──
        result = conn.execute(text(
            "SELECT COLUMN_TYPE FROM information_schema.columns "
            "WHERE table_schema = DATABASE() "
            "AND table_name = 'expenses' "
            "AND column_name = 'category'"
        ))
        col_type = result.scalar()
        if col_type and 'maintenance' not in col_type:
            conn.execute(text(
                "ALTER TABLE expenses MODIFY COLUMN category "
                "ENUM('electricity','water','maintenance','security','elevator','other') NOT NULL"
            ))
            print("[OK] 'maintenance' added to category enum.")
        else:
            print("[INFO] 'maintenance' already in category enum (or column not found).")

        conn.commit()
        conn.close()
        print("\n[DONE] Migration complete!")


if __name__ == "__main__":
    migrate()
