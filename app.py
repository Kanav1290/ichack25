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
    
    video_data = video_file.read()
    video_stream = BytesIO(video_data)
    audio_data = extract_audio(video_data)
    with open('audio_test.wav', 'wb') as f:
        f.write(audio_data)
    audio_stream = wave.open(BytesIO(audio_data), "rb")

    video_np = np.frombuffer(video_data, np.uint8)

    app.logger.info(video_np.size)
    video = cv2.imdecode(video_np, cv2.IMREAD_COLOR)

    if video is None:
        app.logger.info("Failed to decode")
        return jsonify({'error': 'Failed to decode video'}), 400
    
    frames = []
    cap = cv2.VideoCapture(video_data)
    frame_count = 0
    while cap.isOpened():
        ret, frame = cap.read()  # Read a frame
        if not ret:
            break  # End of video stream
        
        # Only save every 15th frame
        if frame_count % 15 == 0:
            frames.append(frame)  # Store the frame (OpenCV image)
        
        frame_count += 1
    cap.release()

    model = Model("model")  # Path to vosk model
    recognizer = KaldiRecognizer(model, 16000)  # Assuming audio is 16 kHz
    
    # Transcribe audio from the video stream
    transcription = ""
    while True:
        data = audio_stream.readframes(4000)
        if len(data) == 0:
            break
        if recognizer.AcceptWaveform(data):
            result = recognizer.Result()
            transcription += result
    
    for i, frame in enumerate(frames):
        cv2.imwrite(os.path.join(app.confid['UPLOAD_FOLDER'], f"frame${i}.jpg"), frame)
    app.logger.info(f"Transcription: ${transcription}")
    app.logger.info(f"Num frames: ${len(frames)}")
    # Combine frames and transcription into the response
    return jsonify({
        'message': 'Video processed successfully',
        'frame_count': len(frames),
        'transcription': transcription
    }), 200

def extract_audio(video_stream):
    import ffmpeg
    command = [
        'ffmpeg',
        '-i', 'pipe:0',    # Input from stdin (video stream)
        '-vn',              # No video, just audio
        '-acodec', 'pcm_s16le',  # Audio codec: PCM 16-bit little-endian (WAV)
        '-f', 'wav',        # Output format: WAV
        'pipe:1'            # Output to stdout (pipe)
    ]
    
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    # Write the video stream data to FFmpeg's stdin
    wav_data, _ = process.communicate(input=video_stream)
    # Return the WAV data as an in-memory stream (BytesIO)
    return wav_data

def getPrompt():
    return Prompt()

class Prompt():
    text = "Sample question"
    prep = 1
    time = 5

    video_path = os.path.join(app.config['UPLOAD_FOLDER'], video_file.filename)
    video_file.save(video_path)
    return jsonify({'message': 'Video uploaded successfully', 'video_path': video_path}), 200

### 🚀 DATABASE SETUP ###
if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Ensure database is created
    app.run(debug=True)
