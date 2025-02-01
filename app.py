from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

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
@app.route('/api/getPrompt', methods=['GET'])
def get_question():
    prompt = getPrompt()
    data = {
        'prompt' : prompt.text,
        'prepTime' : prompt.prep,
        'answerTime' : prompt.time
    }
    app.logger.info(data['prepTime'])
    return jsonify(data)

def getPrompt():
    return Prompt()

class Prompt():
    text = "Sample question"
    prep = 10
    time = 10

if __name__ == '__main__':
    app.run(debug=True)
