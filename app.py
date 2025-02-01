from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
import os
import random

app = Flask(__name__)

# Configure database
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///questions.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# Directory to store uploaded videos
UPLOAD_FOLDER = './uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

### 🚀 DATABASE MODEL ###
class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(500), nullable=False)
    prep_time = db.Column(db.Integer, default=30)
    answer_time = db.Column(db.Integer, default=120)

    def to_dict(self):
        return {
            "id": self.id,
            "text": self.text,
            "prepTime": self.prep_time,
            "answerTime": self.answer_time
        }

### 🚀 ROUTES ###
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/results')
def results():
    return render_template('results.html')

@app.route('/advice')
def advice():
    return render_template('advice.html')

@app.route('/help')
def help():
    return render_template('help.html')

@app.route('/questions')
def questions_page():
    return render_template('questions.html')

### 🚀 API ROUTES ###

# ✅ Get a random question
@app.route('/api/get-prompt', methods=['GET'])
def get_question():
    question = Question.query.order_by(db.func.random()).first()
    if question:
        return jsonify(question.to_dict())
    return jsonify({"error": "No questions available"}), 404

# ✅ Get all questions
@app.route('/api/questions', methods=['GET'])
def get_questions():
    questions = Question.query.all()
    return jsonify([q.to_dict() for q in questions])

# Add a new question
@app.route('/api/questions', methods=['POST'])
def add_question():
    data = request.json
    if not data or "text" not in data:
        return jsonify({"error": "Invalid request"}), 400

    try:
        new_question = Question(
            text=data["text"],
            prep_time=data.get("prepTime", 30),
            answer_time=data.get("answerTime", 120)
        )
        db.session.add(new_question)
        db.session.commit()
        return jsonify(new_question.to_dict()), 201
    except Exception as e:
        print(f"Database Error: {e}")  # Log to terminal
        return jsonify({"error": "Database error"}), 500

@app.route('/api/get-next-question', methods=['GET'])
def get_next_question():
    question = Question.query.order_by(db.func.random()).first()  # Get a random question
    if question:
        return jsonify(question.to_dict())
    return jsonify({"error": "No questions available"}), 404

# ✅ Delete a question
@app.route('/api/questions/<int:question_id>', methods=['DELETE'])
def delete_question(question_id):
    question = Question.query.get(question_id)
    if question:
        db.session.delete(question)
        db.session.commit()
        return jsonify({"message": "Question deleted"})
    return jsonify({"error": "Question not found"}), 404

# ✅ Process video upload
@app.route('/api/process-video', methods=['POST'])
def process_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video part'}), 400
    video_file = request.files['video']
    if video_file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    video_path = os.path.join(app.config['UPLOAD_FOLDER'], video_file.filename)
    video_file.save(video_path)
    return jsonify({'message': 'Video uploaded successfully', 'video_path': video_path}), 200

### 🚀 DATABASE SETUP ###
if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Ensure database is created
    app.run(debug=True)
