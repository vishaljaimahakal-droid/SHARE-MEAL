
import sqlite3

connection = sqlite3.connect("sharemeal.db")

tables = connection.execute(
    "SELECT name FROM sqlite_master WHERE type='table'"
).fetchall()

print("Database tables:", tables)

try:
    donations = connection.execute(
        "SELECT id, food_name, quantity, status FROM donations"
    ).fetchall()
    print("Saved donations:", donations)
except sqlite3.Error as error:
    print("Database error:", error)

connection.close()
