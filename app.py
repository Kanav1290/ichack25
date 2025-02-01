from flask import Flask, request, jsonify, render_template
import os

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
    video_path = os.path.join(app.config['UPLOAD_FOLDER'], video_file.filename)
    video_file.save(video_path)
    app.logger.info("Saved video")
    return jsonify({'message': 'Video uploaded successfully', 'video_path': video_path}), 200

def getPrompt():
    return Prompt()

class Prompt():
    text = "Sample question"
    prep = 1
    time = 5

if __name__ == '__main__':
    app.run(debug=True)
