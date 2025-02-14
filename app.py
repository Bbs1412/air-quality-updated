import os
from flask import Flask, jsonify, request, send_from_directory, render_template


# Config:
# get this code files absolute path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, 'Templates')
STATIC_DIR = os.path.join(BASE_DIR, 'static')

app = Flask(__name__, template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)


# Test route:
@app.route('/test')
def test():
    return jsonify(status=True, message="Server is live")


# Main route:
@app.route('/')
def index():
    return render_template('index.html')


# Serve the static files:
@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory(STATIC_DIR, path)


# Entry point:
if __name__ == '__main__':
    app.run(
        port=5454,
        debug=True,
        load_dotenv=True,
    )
