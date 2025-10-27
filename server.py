#!/usr/bin/env python3
"""
Flask Server pentru Afirmații Social
Backend SQLite cu sistem de grupuri
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
from datetime import datetime
import os
import re
import random

app = Flask(__name__)
CORS(app)

DATABASE = 'afirmatii.db'
SUPER_ADMIN_EMAIL = 'jeka7ro@gmail.com'

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            first_name TEXT,
            last_name TEXT,
            email TEXT,
            phone TEXT,
            pin TEXT,
            birth_date TEXT,
            affirmation TEXT,
            avatar TEXT,
            reset_code TEXT,
            reset_code_expiry TEXT,
            role TEXT DEFAULT 'user',
            total_repetitions INTEGER DEFAULT 0,
            current_day INTEGER DEFAULT 0,
            today_repetitions INTEGER DEFAULT 0,
            last_active TEXT,
            created_at TEXT,
            last_date TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            secret_code TEXT,
            created_by TEXT,
            created_at TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS group_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER,
            username TEXT,
            joined_at TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            message TEXT,
            timestamp TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS repetitions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            timestamp TEXT,
            repetition_number INTEGER
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_user TEXT,
            message TEXT,
            timestamp TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

def get_db():
    return get_db_connection()

def is_super_admin(email):
    return email and email.lower() == SUPER_ADMIN_EMAIL

@app.route('/api/users', methods=['GET'])
def get_users():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT username, total_repetitions, last_active FROM users ORDER BY username')
    rows = cursor.fetchall()
    users = [{'username': row[0], 'total_repetitions': row[1], 'lastActive': row[2]} for row in rows]
    conn.close()
    return jsonify(users)

@app.route('/api/users/<username>', methods=['GET'])
def get_user(username):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        return jsonify({'error': 'User not found'}), 404
    
    cursor.execute('SELECT timestamp, repetition_number FROM repetitions WHERE username = ? ORDER BY timestamp DESC LIMIT 100', (username,))
    records = [{'timestamp': row[0], 'repetition': row[1]} for row in cursor.fetchall()]
    conn.close()
    
    return jsonify({
        'username': user['username'],
        'firstName': user['first_name'],
        'lastName': user['last_name'],
        'email': user['email'],
        'phone': user['phone'] if 'phone' in user.keys() else '',
        'pin': user['pin'],  # Include PIN pentru verificare
        'birthDate': user['birth_date'],
        'affirmation': user['affirmation'],
        'avatar': user['avatar'],
        'role': user['role'] if 'role' in user.keys() else 'user',
        'totalRepetitions': user['total_repetitions'],
        'currentDay': user['current_day'],
        'todayRepetitions': user['today_repetitions'],
        'lastActive': user['last_active'],
        'createdAt': user['created_at'],
        'lastDate': user['last_date'],
        'todayRecords': records
    })

@app.route('/api/users/<username>/check', methods=['GET'])
def check_username(username):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT username FROM users WHERE username = ?', (username,))
    exists = cursor.fetchone() is not None
    conn.close()
    return jsonify({'available': not exists})

@app.route('/api/users/<username>', methods=['POST', 'PUT'])
def update_user(username):
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT username, email FROM users WHERE username = ?', (username,))
    row = cursor.fetchone()
    exists = row is not None
    user_email = row[1] if row else None
    
    now = datetime.now().isoformat()
    
    if exists:
        cursor.execute('''
            UPDATE users SET affirmation = ?, total_repetitions = ?, current_day = ?,
            today_repetitions = ?, last_active = ?, last_date = ? WHERE username = ?
        ''', (
            data.get('affirmation'),
            data.get('totalRepetitions', 0),
            data.get('currentDay', 0),
            data.get('todayRepetitions', 0),
            now,
            data.get('lastDate'),
            username
        ))
    else:
        fullName = f"{data.get('firstName', '')} {data.get('lastName', '')}".strip() or username
        email = data.get('email', '')
        
        # Determinați rolul
        if is_super_admin(email):
            role = 'super_admin'
        else:
            cursor.execute('SELECT COUNT(*) FROM users')
            is_first = cursor.fetchone()[0] == 0
            role = 'admin' if is_first else 'user'
        
        cursor.execute('''
            INSERT INTO users (username, first_name, last_name, email, phone, pin, birth_date,
                             affirmation, avatar, role, total_repetitions, current_day,
                             today_repetitions, last_active, created_at, last_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            username, data.get('firstName'), data.get('lastName'), email,
            data.get('phone', ''), data.get('pin'), data.get('birthDate'),
            data.get('affirmation', 'Sunt capabil să realizez tot ce îmi propun.'),
            data.get('avatar', '👤'), role,
            data.get('totalRepetitions', 0), data.get('currentDay', 0),
            data.get('todayRepetitions', 0), now, now,
            data.get('lastDate', datetime.now().strftime('%Y-%m-%d'))
        ))
        
        cursor.execute('INSERT INTO activities (username, message, timestamp) VALUES (?, ?, ?)',
                       (username, f'{fullName} s-a înregistrat în comunitate! 🎉', now))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# Grupuri API
@app.route('/api/groups', methods=['GET'])
def get_groups():
    """Obține toate grupurile"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM groups ORDER BY created_at DESC')
    rows = cursor.fetchall()
    groups = [dict(row) for row in rows]
    conn.close()
    return jsonify(groups)

@app.route('/api/groups', methods=['POST'])
def create_group():
    """Creează un grup (doar super admin)"""
    data = request.json
    admin_email = request.headers.get('X-Admin-Email')
    
    if not is_super_admin(admin_email):
        return jsonify({'error': 'Unauthorized'}), 403
    
    name = data.get('name')
    description = data.get('description', '')
    
    if not name:
        return jsonify({'error': 'Group name required'}), 400
    
    secret_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    
    cursor.execute('''
        INSERT INTO groups (name, description, secret_code, created_by, created_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (name, description, secret_code, admin_email, now))
    
    group_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'group_id': group_id, 'secret_code': secret_code})

@app.route('/api/groups/<group_id>/join', methods=['POST'])
def join_group(group_id):
    """Alătură-te unui grup cu cod secret"""
    data = request.json
    username = data.get('username')
    code = data.get('code')
    
    if not username or not code:
        return jsonify({'error': 'Username and code required'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT secret_code FROM groups WHERE id = ?', (group_id,))
    group = cursor.fetchone()
    
    if not group:
        conn.close()
        return jsonify({'error': 'Group not found'}), 404
    
    if group[0] != code:
        conn.close()
        return jsonify({'error': 'Invalid code'}), 400
    
    # Verifică dacă e deja membru
    cursor.execute('SELECT id FROM group_members WHERE group_id = ? AND username = ?', (group_id, username))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Already member'}), 400
    
    # Adaugă membru
    now = datetime.now().isoformat()
    cursor.execute('INSERT INTO group_members (group_id, username, joined_at) VALUES (?, ?, ?)', (group_id, username, now))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/groups/<group_id>/members', methods=['GET'])
def get_group_members(group_id):
    """Obține membrii unui grup"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT u.username, u.first_name, u.last_name, u.avatar, gm.joined_at
        FROM group_members gm
        JOIN users u ON gm.username = u.username
        WHERE gm.group_id = ?
        ORDER BY gm.joined_at DESC
    ''', (group_id,))
    
    members = []
    for row in cursor.fetchall():
        members.append({
            'username': row[0],
            'name': f"{row[1]} {row[2]}".strip() or row[0],
            'avatar': row[3],
            'joined_at': row[4]
        })
    
    conn.close()
    return jsonify(members)

@app.route('/api/groups/<group_id>/messages', methods=['GET'])
def get_group_messages(group_id):
    """Obține mesajele dintr-un grup"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Obține username-urile membrilor
    cursor.execute('SELECT username FROM group_members WHERE group_id = ?', (group_id,))
    member_usernames = [row[0] for row in cursor.fetchall()]
    
    if not member_usernames:
        conn.close()
        return jsonify([])
    
    # Obține mesajele din ultimele zile
    now = datetime.now()
    today = now.strftime('%Y-%m-%d')
    
    cursor.execute('''
        SELECT from_user, message, timestamp
        FROM messages
        WHERE from_user IN ({})
        AND timestamp >= ?
        ORDER BY timestamp ASC
    '''.format(','.join('?' * len(member_usernames))), (*member_usernames, today))
    
    messages = []
    for row in cursor.fetchall():
        messages.append({
            'from_user': row[0],
            'message': row[1],
            'timestamp': row[2]
        })
    
    conn.close()
    return jsonify(messages)

@app.route('/api/users/<username>/groups', methods=['GET'])
def get_user_groups(username):
    """Obține grupurile unui utilizator"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT g.* FROM groups g
        JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.username = ?
    ''', (username,))
    
    groups = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(groups)

@app.route('/api/repetition', methods=['POST'])
def add_repetition():
    data = request.json
    username = data.get('username')
    repetition_num = data.get('repetition')
    
    if not username:
        return jsonify({'error': 'Username required'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    
    cursor.execute('INSERT INTO repetitions (username, timestamp, repetition_number) VALUES (?, ?, ?)',
                   (username, now, repetition_num))
    
    if repetition_num % 10 == 0:
        cursor.execute('INSERT INTO activities (username, message, timestamp) VALUES (?, ?, ?)',
                       (username, f'{username} a completat {repetition_num}/100 repetări astăzi! 💪', now))
    
    if repetition_num == 100:
        cursor.execute('INSERT INTO activities (username, message, timestamp) VALUES (?, ?, ?)',
                       (username, f'🎉 {username} a completat 100 de repetări astăzi! Provocare finalizată!', now))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/activities', methods=['GET'])
def get_activities():
    limit = request.args.get('limit', 50, type=int)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT username, message, timestamp FROM activities ORDER BY timestamp DESC LIMIT ?', (limit,))
    activities = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(activities)

@app.route('/api/stats', methods=['GET'])
def get_community_stats():
    conn = get_db()
    cursor = conn.cursor()
    
    today = datetime.now().strftime('%Y-%m-%d')
    cursor.execute('SELECT COUNT(*) FROM users WHERE date(last_active) = date(?)', (today,))
    active_users = cursor.fetchone()[0]
    
    cursor.execute('SELECT COALESCE(SUM(total_repetitions), 0) FROM users')
    total_reps = cursor.fetchone()[0]
    
    conn.close()
    return jsonify({'activeUsers': active_users, 'totalRepetitions': total_reps})

@app.route('/api/admin/overview', methods=['GET'])
def admin_overview():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM users')
    total_users = cursor.fetchone()[0]
    
    cursor.execute('SELECT COALESCE(SUM(total_repetitions), 0) FROM users')
    total_reps = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM messages')
    total_messages = cursor.fetchone()[0]
    
    today = datetime.now().strftime('%Y-%m-%d')
    cursor.execute('SELECT COUNT(*) FROM users WHERE date(last_active) = date(?)', (today,))
    active_today = cursor.fetchone()[0]
    
    conn.close()
    return jsonify({
        'totalUsers': total_users,
        'totalRepetitions': total_reps,
        'totalMessages': total_messages,
        'activeToday': active_today
    })

@app.route('/api/admin/users/all', methods=['GET'])
def get_all_users_admin():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT username, first_name, last_name, email, avatar,
               total_repetitions, current_day, last_active, created_at
        FROM users ORDER BY last_active DESC
    ''')
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(users)

@app.route('/api/admin/users/<username>', methods=['DELETE'])
def delete_user(username):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM users WHERE username = ?', (username,))
    cursor.execute('DELETE FROM messages WHERE from_user = ?', (username,))
    cursor.execute('DELETE FROM repetitions WHERE username = ?', (username,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/messages', methods=['GET'])
def get_messages():
    limit = request.args.get('limit', 100, type=int)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id, from_user, message, timestamp FROM messages ORDER BY timestamp DESC LIMIT ?', (limit,))
    messages = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(list(reversed(messages)))

@app.route('/api/messages', methods=['POST'])
def send_message():
    data = request.json
    from_user = data.get('from_user')
    message = data.get('message')
    
    if not from_user or not message:
        return jsonify({'error': 'Username and message required'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    
    cursor.execute('INSERT INTO messages (from_user, message, timestamp) VALUES (?, ?, ?)', (from_user, message, now))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 3000))
    print(f"🚀 Server pornit pe http://0.0.0.0:{port}")
    print("📊 Baza de date SQLite inițializată")
    app.run(debug=False, host='0.0.0.0', port=port)
