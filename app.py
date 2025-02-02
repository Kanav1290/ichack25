from flask import Flask, request, jsonify, render_template, render_template_string, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
import os
import random
from io import BytesIO
import numpy as np
import subprocess
from vosk import Model, KaldiRecognizer
import cv2
import wave
import ffmpeg
import moviepy as mp
import speech_recognition as sr
from pydub import AudioSegment
import openai
import os

app = Flask(__name__)

with open("api.key", "r+") as f:
    key = f.read()
    if len(key) == 0:
        raise Exception("Mising OpenAI key")
    else:
        openai.api_key = key
        app.secret_key = key

try:
    import tensorflow as tf
    TF = True
except:
    TF = False
    app.logger.warning("Could not import TF")
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
    '''question = Question.query.order_by(db.func.random()).first()
    if question:
        return jsonify(question.to_dict())'''
    prompt = Prompt()
    data = {
        'prompt' : prompt.text,
        'prepTime' : prompt.prep,
        'answerTime' : prompt.time
    }
    return jsonify(data), 200
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

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], video_file.filename)
    video_file.save(file_path)
    frames = video_to_frames(file_path)
    transcript = get_transcript(file_path)
    question = request.form.get('question', "Err getting question")
    (scores, verbal_response) = analyze_response(transcript, question)
    (drowsy, alert) = drowsiness(frames)
    scores.append(alert)
    # Render an HTML page with a form that auto-submits via POST
    session['scores'] = scores
    session['verbal_response'] = verbal_response
    session['question'] = question
    return redirect(url_for('show_results'))

@app.route('/result', methods=['POST'])
def show_results():
    # Extract values from the form request
    scores = session.get('scores', [])
    verbal_response = session.get('verbal_response', "Err generating response")
    question = session.get('question', "Err getting question")

    # Render the HTML page and pass variables to it
    return render_template('results.html', 
                           relevance=scores[0], 
                           conciseness=scores[1], 
                           pacing=scores[2], 
                           completeness=scores[3], 
                           focusv=scores[4],
                           question=question,
                           vresponse=verbal_response)

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

def video_to_frames(video_file, interval=10):
    video_capture = cv2.VideoCapture(video_file)

    if not video_capture.isOpened():
        return

    frame_count = 0
    frames = []
    while True:
        ret, frame = video_capture.read()
        
        if not ret:
            break

        if frame_count % interval == 0:          
            frames.append(frame)
        
        frame_count += 1

    video_capture.release()
    return frames

def drowsiness(frames):
    if not TF:
        return (50, 50)
    drowse = 0
    alert = 0
    path = "warmup_model.keras"
    model = tf.keras.models.load_model(path)
    for frame in frames:
        image_resized = cv2.resize(frame, (224, 224)) 
        image_resized = image_resized / 255.0  # Rescale
        image_resized = np.expand_dims(image_resized, axis=0)
        if frame is None:
            continue
        predict = model(image_resized)
        if predict > 0.5 :
            drowse +=1
        else:
            alert +=1
    s = drowse + alert
    drowse, alert = drowse * 100 / s, alert * 100 / s
    return (drowse, alert)

def get_transcript(filepathofvideo):
    try:
        app.logger.info("1")
        vid = mp.VideoFileClip(filepathofvideo)
        app.logger.info("2")
        audiofile_path = "temp_audio.wav"
        app.logger.info("3")
        vid.audio.write_audiofile(audiofile_path)
        app.logger.info("4")
        
        vid.close()
        app.logger.info("5")
        audio = AudioSegment.from_wav(audiofile_path)
        app.logger.info("6")
        recognizer = sr.Recognizer()
        app.logger.info("7")
        text = ""
        
        for start_ms in range(0, len(audio), 10000):
            chunk = audio[start_ms:start_ms + 10000]
            chunk_path = "chunk.wav"
            chunk.export(chunk_path, format="wav")
            
            with sr.AudioFile(chunk_path) as source:
                audio_data = recognizer.record(source)
                try:
                    text += recognizer.recognize_google(audio_data) + " "
                except sr.UnknownValueError:
                    text += "\n section of audio wasn't present\n"
                except sr.RequestError as e:
                    print(f"Could not request results; {e}")
        
        os.remove(audiofile_path)
        os.remove(chunk_path)
        
        return text.strip()
    
    except Exception as e:
        print(f"An error occurred: {e}")
        return ""

def analyze_response(transcription, question, time=2):
    """Analyzes the transcribed response based on predefined criteria."""
    prompt = f"""
    You are an AI interview assistant. A candidate has answered an interview question with a "{time}-minute" recording.
    Be harsh but fair.

    Question: "{question}"
    Candidate's response: "{transcription}"

    Scoring Rubric:
    - Relevance to the question (0-100)
    - Clarity and structure (0-100)
    - Pacing (0-100)
    - Use of examples and detail (0-100)

    Provide:
    1. Scores for each criterion.
    2. Constructive feedback with specific examples of how to improve.

    Provide in the following format (without the square brackets, these indicate where the data should be):
    [score for Relevance to question]
    [score for clariry and structure]
    [score for confidence and tone]
    [score for use of examples and detail]

    [feedback]
    """

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",  # Use "gpt-4" if needed
            messages=[
                {"role": "system", "content": "You are an expert interview evaluator."},
                {"role": "user", "content": prompt}
            ]
        )
        raw = response['choices'][0]['message']['content']
        lines = raw.strip().split("\n")

        # Extract the first four integers from the first four lines
        first_four_integers = [int(lines[i]) for i in range(4)]

        # Extract the text after the empty line
        empty_line_index = lines.index("") if "" in lines else 4
        remaining_text = "\n".join(lines[empty_line_index + 1:])
        return (first_four_integers, remaining_text)
    
    except Exception as e:
        app.logger.info(f"Error with OpenAI request: {e}")
        return ([0,0,0,0], "Error generating OpenAI request")

def getPrompt():
    return Prompt()

class Prompt():
    text = "Sample question"
    prep = 1
    time = 5

### 🚀 DATABASE SETUP ###
if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Ensure database is created
    app.run(debug=True)
