from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
import time
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
SUPER_ADMIN_EMAIL = 'jeka7ro@gmail.com'

# Use PostgreSQL if available, otherwise SQLite
DATABASE_URL = os.environ.get('DATABASE_URL')

if DATABASE_URL:
    # PostgreSQL (production)
    def get_db():
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        conn.cursor_factory = RealDictCursor
        return conn
else:
    # SQLite (development)
    DATABASE = '/tmp/afirmatii_db.sqlite'
    def get_db():
        conn = sqlite3.connect(DATABASE)
        conn.row_factory = sqlite3.Row
        return conn

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Admin-Email')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/api/groups', methods=['OPTIONS'])
def groups_options():
    return '', 200

# Use persistent storage - Render's filesystem persists in /tmp across restarts
DATABASE = '/tmp/afirmatii_db.sqlite'

# Backup cron job - salvează baza de date periodic
import schedule
import threading

def backup_database():
    try:
        import shutil
        backup_path = f'/tmp/afirmatii_db_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.sqlite'
        shutil.copy(DATABASE, backup_path)
        print(f"Database backed up to {backup_path}")
    except Exception as e:
        print(f"Backup failed: {e}")

def run_backup_scheduler():
    schedule.every(6).hours.do(backup_database)
    while True:
        schedule.run_pending()
        time.sleep(60)

# Start backup thread
backup_thread = threading.Thread(target=run_backup_scheduler, daemon=True)
backup_thread.start()

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            first_name TEXT,
            last_name TEXT,
            email TEXT UNIQUE,
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
            last_date TEXT,
            repetition_history TEXT,
            completed_days TEXT,
            challenge_start_date TEXT,
            created_at TEXT,
            last_login TEXT
        )
    ''')
    
    # Add completed_days column if not exists
    try:
        cursor.execute('ALTER TABLE users ADD COLUMN completed_days TEXT')
    except:
        pass
    
    # Add challenge_start_date column if not exists
    try:
        cursor.execute('ALTER TABLE users ADD COLUMN challenge_start_date TEXT')
    except:
        pass
    
    # Add start_date column if not exists
    try:
        cursor.execute('ALTER TABLE groups ADD COLUMN start_date TEXT')
    except:
        pass
    
    # Add member_count column if not exists
    try:
        cursor.execute('ALTER TABLE groups ADD COLUMN member_count INTEGER DEFAULT 0')
    except:
        pass
    
    # Add expiry_date column if not exists
    try:
        cursor.execute('ALTER TABLE groups ADD COLUMN expiry_date TEXT')
    except:
        pass
    
    # Groups table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS groups (
            id TEXT PRIMARY KEY,
            name TEXT,
            description TEXT,
            secret_code TEXT,
            created_by TEXT,
            created_at TEXT,
            member_count INTEGER DEFAULT 0,
            start_date TEXT,
            expiry_date TEXT,
            FOREIGN KEY(created_by) REFERENCES users(username)
        )
    ''')
    
    # Group members table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS group_members (
            group_id TEXT,
            username TEXT,
            joined_at TEXT,
            PRIMARY KEY(group_id, username),
            FOREIGN KEY(username) REFERENCES users(username),
            FOREIGN KEY(group_id) REFERENCES groups(id)
        )
    ''')
    
    # Messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT,
            recipient TEXT,
            group_id TEXT,
            message TEXT,
            timestamp TEXT,
            type TEXT DEFAULT 'direct',
            FOREIGN KEY(sender) REFERENCES users(username),
            FOREIGN KEY(group_id) REFERENCES groups(id)
        )
    ''')
    
    # Activities table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            activity_type TEXT,
            description TEXT,
            timestamp TEXT,
            FOREIGN KEY(username) REFERENCES users(username)
        )
    ''')
    
    conn.commit()
    conn.close()

@app.route('/')
def home():
    return jsonify({'service': 'afirmatii-backend', 'status': 'ok', 'version': '1.0'})

@app.route('/api/users', methods=['GET'])
def get_users():
    db = get_db()
    users = db.execute('SELECT username, total_repetitions, role, email, first_name, last_name FROM users').fetchall()
    db.close()
    return jsonify([dict(u) for u in users])

@app.route('/api/repetition', methods=['POST', 'OPTIONS'])
def add_repetition():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    data = request.json
    username = data.get('username')
    repetition = data.get('repetition')
    
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    
    if user:
        db.execute('UPDATE users SET total_repetitions = ?, today_repetitions = ? WHERE username = ?', 
                   (user['total_repetitions'] + 1, user['today_repetitions'] + 1, username))
        db.commit()
    
    db.close()
    return jsonify({'success': True})

@app.route('/api/users/<username>/check', methods=['GET'])
def check_username(username):
    db = get_db()
    user = db.execute('SELECT username FROM users WHERE username = ?', (username,)).fetchone()
    db.close()
    
    if user:
        return jsonify({'available': False})
    return jsonify({'available': True})

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
    
    db = get_db()
    
    # Check if username exists
    existing = db.execute('SELECT username FROM users WHERE username = ?', (username,)).fetchone()
    if existing:
        db.close()
        return jsonify({'error': 'Username already exists'}), 400
    
    # Check if email exists
    existing_email = db.execute('SELECT email FROM users WHERE email = ?', (data['email'],)).fetchone()
    if existing_email:
        db.close()
        return jsonify({'error': 'Email already exists'}), 400
    
    # Check if super_admin already exists
    existing_admin = db.execute('SELECT role FROM users WHERE role = ?', ('super_admin',)).fetchone()
    is_first_admin = data['email'] == SUPER_ADMIN_EMAIL and not existing_admin
    
    role = 'super_admin' if is_first_admin else 'user'
    
    db.execute('''
        INSERT INTO users (username, first_name, last_name, email, phone, pin, birth_date, affirmation, avatar, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        username, 
        data['firstName'], 
        data['lastName'], 
        data['email'], 
        data.get('phone'), 
        data['pin'], 
        data.get('birthDate'), 
        data.get('affirmation'), 
        data.get('avatar'),
        role,
        datetime.now().isoformat()
    ))
    db.commit()
    db.close()
    return jsonify({'success': True, 'role': role})

@app.route('/api/users/<username>', methods=['PUT'])
def update_user(username):
    data = request.json
    db = get_db()
    
    # Check if user exists
    user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    if not user:
        db.close()
        return jsonify({'error': 'User not found'}), 404
    
    # Update fields
    update_fields = []
    values = []
    
    for field in ['first_name', 'last_name', 'email', 'phone', 'pin', 'birth_date', 'affirmation', 'avatar', 
                  'total_repetitions', 'current_day', 'today_repetitions', 'last_date', 'repetition_history']:
        # Convert camelCase to snake_case for database fields
        field_mapping = {
            'firstName': 'first_name',
            'lastName': 'last_name',
            'birthDate': 'birth_date',
            'totalRepetitions': 'total_repetitions',
            'currentDay': 'current_day',
            'todayRepetitions': 'today_repetitions',
            'lastDate': 'last_date',
            'repetitionHistory': 'repetition_history'
        }
        
        # Check if field exists in data
        if field in data or any(key in data for key in field_mapping.values()):
            # Find the correct mapping
            db_field = field
            for key, value in field_mapping.items():
                if key in data:
                    db_field = value
                    update_fields.append(f'{value} = ?')
                    values.append(data[key])
                    break
            else:
                if field in data:
                    update_fields.append(f'{field} = ?')
                    values.append(data[field])
    
    if update_fields:
        values.append(username)
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE username = ?"
        db.execute(query, tuple(values))
        db.commit()
    
    db.close()
    return jsonify({'success': True})

@app.route('/api/users/<username>/stats', methods=['GET'])
def get_user_stats(username):
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    db.close()
    
    if user:
        stats = {
            'challenge': {
                'totalRepetitions': user['total_repetitions'] or 0,
                'currentDay': user['current_day'] or 0,
                'todayRepetitions': user['today_repetitions'] or 0,
                'lastDate': user['last_date'],
                'repetitionHistory': user['repetition_history'] or '[]'
            }
        }
        return jsonify(stats)
    return jsonify({'error': 'User not found'}), 404

@app.route('/api/users/<username>/stats', methods=['PUT'])
def update_user_stats(username):
    data = request.json
    db = get_db()
    
    challenge = data.get('challenge', {})
    db.execute('''
        UPDATE users 
        SET total_repetitions = ?, current_day = ?, today_repetitions = ?, last_date = ?, repetition_history = ?
        WHERE username = ?
    ''', (
        challenge.get('totalRepetitions', 0),
        challenge.get('currentDay', 0),
        challenge.get('todayRepetitions', 0),
        challenge.get('lastDate'),
        challenge.get('repetitionHistory', '[]'),
        username
    ))
    db.commit()
    db.close()
    return jsonify({'success': True})

@app.route('/api/groups', methods=['GET'])
def get_groups():
    admin_email = request.headers.get('X-Admin-Email')
    db = get_db()
    
    if admin_email:
        # Admin sees all groups
        groups = db.execute('SELECT * FROM groups').fetchall()
    else:
        # Regular users see only public groups
        groups = db.execute('SELECT * FROM groups').fetchall()
    
    db.close()
    return jsonify([dict(g) for g in groups])

@app.route('/api/groups', methods=['POST'])
def create_group():
    try:
        data = request.json
        admin_email = data.get('adminEmail')
        
        # Verify admin
        db = get_db()
        admin = db.execute('SELECT role FROM users WHERE email = ?', (admin_email,)).fetchone()
        if not admin or admin['role'] not in ['admin', 'super_admin']:
            db.close()
            return jsonify({'error': 'Unauthorized'}), 403
        
        import uuid
        import random
        import string
        group_id = str(uuid.uuid4())
        
        # Generate random secret code
        secret_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        
        # Get start and end dates
        start_date = data.get('startDate')
        end_date = data.get('endDate')
        
        db.execute('''
            INSERT INTO groups (id, name, description, secret_code, created_by, created_at, member_count, start_date, expiry_date)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        ''', (
            group_id,
            data['name'],
            data.get('description', ''),
            secret_code,
            data['username'],
            datetime.now().isoformat(),
            start_date,
            end_date
        ))
        
        # Add creator as member
        db.execute('''
            INSERT INTO group_members (group_id, username, joined_at)
            VALUES (?, ?, ?)
        ''', (group_id, data['username'], datetime.now().isoformat()))
        
        db.commit()
        db.close()
        return jsonify({'success': True, 'groupId': group_id, 'secret_code': secret_code})
    except Exception as e:
        print(f"ERROR creating group: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/groups/<group_id>/join', methods=['POST'])
def join_group(group_id):
    data = request.json
    username = data.get('username')
    secret_code = data.get('secretCode')
    
    db = get_db()
    
    # Verify secret code
    group = db.execute('SELECT * FROM groups WHERE id = ?', (group_id,)).fetchone()
    if not group or group['secret_code'] != secret_code:
        db.close()
        return jsonify({'error': 'Invalid secret code'}), 400
    
    # Check if already a member
    member = db.execute('SELECT * FROM group_members WHERE group_id = ? AND username = ?', (group_id, username)).fetchone()
    if member:
        db.close()
        return jsonify({'error': 'Already a member'}), 400
    
    # Add member
    db.execute('''
        INSERT INTO group_members (group_id, username, joined_at)
        VALUES (?, ?, ?)
    ''', (group_id, username, datetime.now().isoformat()))
    
    # Update member count
    db.execute('UPDATE groups SET member_count = member_count + 1 WHERE id = ?', (group_id,))
    
    db.commit()
    db.close()
    return jsonify({'success': True})

@app.route('/api/groups/<group_id>/members', methods=['GET'])
def get_group_members(group_id):
    db = get_db()
    members = db.execute('''
        SELECT gm.username, u.first_name, u.last_name, gm.joined_at
        FROM group_members gm
        JOIN users u ON gm.username = u.username
        WHERE gm.group_id = ?
    ''', (group_id,)).fetchall()
    db.close()
    return jsonify([dict(m) for m in members])

@app.route('/api/messages', methods=['POST'])
def send_message():
    data = request.json
    db = get_db()
    
    db.execute('''
        INSERT INTO messages (sender, recipient, group_id, message, timestamp, type)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        data.get('sender'),
        data.get('recipient'),
        data.get('groupId'),
        data['message'],
        datetime.now().isoformat(),
        data.get('type', 'direct')
    ))
    
    # Log activity
    db.execute('''
        INSERT INTO activities (username, activity_type, description, timestamp)
        VALUES (?, ?, ?, ?)
    ''', (
        data.get('sender'),
        'message_sent',
        f"Sent message to {data.get('recipient', 'group')}",
        datetime.now().isoformat()
    ))
    
    db.commit()
    db.close()
    return jsonify({'success': True})

@app.route('/api/messages/<group_id>/group', methods=['GET'])
def get_group_messages(group_id):
    db = get_db()
    messages = db.execute('''
        SELECT m.*, u.first_name, u.last_name
        FROM messages m
        JOIN users u ON m.sender = u.username
        WHERE m.group_id = ?
        ORDER BY m.timestamp DESC
        LIMIT 100
    ''', (group_id,)).fetchall()
    db.close()
    return jsonify([dict(m) for m in messages])

@app.route('/api/messages/<username>/direct', methods=['GET'])
def get_direct_messages(username):
    db = get_db()
    messages = db.execute('''
        SELECT m.*, u.first_name, u.last_name
        FROM messages m
        JOIN users u ON m.sender = u.username
        WHERE (m.sender = ? OR m.recipient = ?) AND m.type = 'direct'
        ORDER BY m.timestamp DESC
        LIMIT 100
    ''', (username, username)).fetchall()
    db.close()
    return jsonify([dict(m) for m in messages])

@app.route('/api/activities', methods=['GET'])
def get_activities():
    db = get_db()
    activities = db.execute('SELECT * FROM activities ORDER BY timestamp DESC LIMIT 100').fetchall()
    db.close()
    return jsonify([dict(a) for a in activities])

@app.route('/api/stats', methods=['GET'])
def get_stats():
    db = get_db()
    
    # Total users
    total_users = db.execute('SELECT COUNT(*) as count FROM users').fetchone()['count']
    
    # Total repetitions
    total_reps = db.execute('SELECT SUM(total_repetitions) as total FROM users').fetchone()['total'] or 0
    
    # Active users (users with recent activity)
    from datetime import timedelta
    cutoff = (datetime.now() - timedelta(days=1)).isoformat()
    active_users = db.execute('''
        SELECT COUNT(DISTINCT username) as count 
        FROM activities 
        WHERE timestamp > ?
    ''', (cutoff,)).fetchone()['count']
    
    db.close()
    return jsonify({
        'activeUsers': active_users if active_users > 0 else 1,  # At least 1 (current user)
        'totalUsers': total_users,
        'totalRepetitions': total_reps
    })

@app.route('/api/users/<username>/groups', methods=['GET'])
def get_user_groups(username):
    db = get_db()
    groups = db.execute('''
        SELECT g.* FROM groups g
        JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.username = ?
    ''', (username,)).fetchall()
    db.close()
    return jsonify([dict(g) for g in groups])

@app.route('/api/admin/overview', methods=['GET'])
def get_admin_overview():
    db = get_db()
    
    total_users = db.execute('SELECT COUNT(*) as count FROM users').fetchone()['count']
    total_reps = db.execute('SELECT SUM(total_repetitions) as total FROM users').fetchone()['total'] or 0
    total_messages = db.execute('SELECT COUNT(*) as count FROM messages').fetchone()['count']
    total_groups = db.execute('SELECT COUNT(*) as count FROM groups').fetchone()['count']
    
    db.close()
    return jsonify({
        'totalUsers': total_users,
        'totalRepetitions': total_reps,
        'totalMessages': total_messages,
        'totalGroups': total_groups
    })

@app.route('/api/admin/users/all', methods=['GET'])
def get_all_users_admin():
    db = get_db()
    users = db.execute('SELECT username, email, total_repetitions, role FROM users').fetchall()
    db.close()
    return jsonify([dict(u) for u in users])

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 10000))
    print(f"Starting server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
