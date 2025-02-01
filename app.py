from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

# Route for homepage
@app.route('/')
def index():
    return render_template('index.html')

# API route to handle data
@app.route('/api/data', methods=['POST'])
def process_data():
    data = request.json
    return jsonify({"message": f"Received: {data}"})

if __name__ == '__main__':
    app.run(debug=True)
