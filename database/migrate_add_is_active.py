"""
One-time migration: Add `is_active` column to the residents table.
Safe to run multiple times — checks if column already exists first.
"""

import os
from dotenv import load_dotenv
import pymysql

load_dotenv()

conn = pymysql.connect(
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", 3306)),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", "password"),
    database=os.getenv("DB_NAME", "apartment_mgmt"),
)
cur = conn.cursor()

# Check if column already exists
cur.execute("SHOW COLUMNS FROM residents LIKE 'is_active'")
result = cur.fetchone()

if result:
    print("Column 'is_active' already exists - no migration needed.")
else:
    cur.execute(
        "ALTER TABLE residents ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER is_verified"
    )
    conn.commit()
    print("Column 'is_active' added successfully (default=1 for all existing rows).")

cur.close()
conn.close()
