from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

# Route for homepage
@app.route('/')
def index():
    return render_template('index.html')

# API route to handle data
@app.route('/api/data', methods=['GET'])
def get_question():
    prompt = getPrompt()
    data = {
        'prompt' : prompt.text,
        'prepTime' : prompt.prep,
        'answerTime' : prompt.time
    }
    return jsonify(data)

def getPrompt():
    pass #get from DB questions that haven't been done

if __name__ == '__main__':
    app.run(debug=True)
