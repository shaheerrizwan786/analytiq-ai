import sqlite3
conn = sqlite3.connect('data/reviews_sync.sqlite3')
tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print('Tables:', [t[0] for t in tables])
for t in tables:
    cnt = conn.execute(f'SELECT COUNT(*) FROM {t[0]}').fetchone()
    print(f'  {t[0]}: {cnt[0]} rows')
    if cnt[0] > 0:
        rows = conn.execute(f'SELECT * FROM {t[0]} LIMIT 5').fetchall()
        for r in rows:
            print('   ', r[:6])
conn.close()
