import psycopg2

conn = psycopg2.connect(dbname='postgres', user='postgres', password='postgres', host='localhost')
conn.autocommit = True
cur = conn.cursor()
cur.execute("SELECT 1 FROM pg_database WHERE datname = 'mullen_analytics_test'")
if not cur.fetchone():
    cur.execute("CREATE DATABASE mullen_analytics_test")
    print("Test DB created")
else:
    print("Test DB already exists")
conn.close()
