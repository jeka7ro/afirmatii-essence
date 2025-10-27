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
            role TEXT DEFAULT 'user',
            total_repetitions INTEGER DEFAULT 0
        )
    ''')
    db.commit()
    db.close()

@app.route('/api/users', methods=['GET'])
def get_users():
    db = get_db()
    users = db.execute('SELECT username, total_repetitions, role, email FROM users').fetchall()
    db.close()
    return jsonify([dict(u) for u in users])

@app.route('/api/users/<username>', methods=['GET'])
def get_user(username):
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    db.close()
    if user:
        return jsonify(dict(user))
    return jsonify({'error': 'User not found'}), 404

@app.route('/api/users/<username>', methods=['POST'])
def create_user(username):
    data = request.json
    
    # Setează super_admin dacă email este jeka7ro@gmail.com
    role = 'super_admin' if data['email'] == 'jeka7ro@gmail.com' else 'user'
    
    db = get_db()
    db.execute('''
        INSERT INTO users (username, first_name, last_name, email, pin, affirmation, role)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (username, data['firstName'], data['lastName'], data['email'], data['pin'], data['affirmation'], role))
    db.commit()
    db.close()
    return jsonify({'success': True, 'role': role})

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=3000, debug=True)
