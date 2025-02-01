from flask import Flask, request, jsonify, render_template
import cv2
import numpy as np
from vosk import Model, KaldiRecognizer
import wave
import os
from io import BytesIO
import subprocess

app = Flask(__name__)

UPLOAD_FOLDER = './uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Route for homepage
@app.route('/')
def index():
    return render_template('index.html')

# Route for results page
@app.route('/results')
def results():
    return render_template('results.html') 

@app.route('/advice')
def advice():
    return render_template('advice.html')

@app.route('/help')
def help():
    return render_template('help.html')

# API route to handle data
@app.route('/api/get-prompt', methods=['GET'])
def get_question():
    prompt = getPrompt()
    data = {
        'prompt' : prompt.text,
        'prepTime' : prompt.prep,
        'answerTime' : prompt.time
    }
    app.logger.info(data['prepTime'])
    return jsonify(data)

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

if __name__ == '__main__':
    app.run(debug=True)
