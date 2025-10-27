from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime

app = Flask(__name__)
CORS(app)

DATABASE = 'afirmatii.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    db = get_db()
    db.execute('''
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            first_name TEXT,
            last_name TEXT,
            email TEXT,
            pin TEXT,
            affirmation TEXT,
            total_repetitions INTEGER DEFAULT 0
        )
    ''')
    db.commit()
    db.close()

@app.route('/api/users', methods=['GET'])
def get_users():
    db = get_db()
    users = db.execute('SELECT username, total_repetitions FROM users').fetchall()
    db.close()
    return jsonify([dict(u) for u in users])

@app.route('/api/users/<username>', methods=['POST'])
def create_user(username):
    data = request.json
    db = get_db()
    db.execute('''
        INSERT INTO users (username, first_name, last_name, email, pin, affirmation)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (username, data['firstName'], data['lastName'], data['email'], data['pin'], data['affirmation']))
    db.commit()
    db.close()
    return jsonify({'success': True})

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=3000, debug=True)
