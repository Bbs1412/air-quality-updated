import os
import json
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from fbase import login_to_firebase, read_node, is_login_expired
from flask import Flask, jsonify, request, send_from_directory, render_template


# Config:
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, 'Templates')
STATIC_DIR = os.path.join(BASE_DIR, 'static')

# Initialize app and Flask-Limiter (based on IP address)
app = Flask(__name__, template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)
limiter = Limiter(get_remote_address, app=app, default_limits=[])


# Load init file for once to avoid repeated compute:
readings_file = os.path.join(STATIC_DIR, 'initial_readings.json')
print("Loaded data from:", readings_file)
with open(readings_file, 'r') as f:
    DATA = json.load(f)


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


# Route to get saved data, count(int) is the number of readings to get:
# this returns `count` readings at even intervals
# from appx 1500 saved readings in "./static/initial_readings.json"
@app.route('/get_init_data/<int:count>')
def get_init_data(count):
    # Extract lists from the JSON
    keys = ["bs_temp", "bs_hum", "bs_feel", "bs_mq135", "bs_mq4", "bs_keys"]
    total_length = DATA["total_length"]

    # Ensure `count` is not greater than the total readings
    count = min(count, total_length)

    # Compute indices to pick `count` readings evenly
    indices = [round(i * (total_length - 1) / (count - 1))
               for i in range(count)] if count > 1 else [0]

    # Extract `count` evenly spaced readings from each key
    filtered_data = {key: [DATA[key][i] for i in indices] for key in keys}

    # Preserve boolean values
    filtered_data["bs_gas"] = DATA["bs_gas"]
    filtered_data["bs_fire"] = DATA["bs_fire"]
    # Update total_length to match filtered count
    filtered_data["total_length"] = count

    # curl http://127.0.0.1:5454/get_init_data/5
    return jsonify(filtered_data)


# Route to simulate real time data fetch, count(int) is the number of readings to get:
# Unlike the get_init_data route, which picks readings evenly,
# this route will return the next reading in the sequence.
@app.route('/get_serial_data/<int:count>')
def get_serial_data(count):
    # Extract lists from the JSON
    keys = ["bs_temp", "bs_hum", "bs_feel", "bs_mq135", "bs_mq4", "bs_keys"]
    total_length = DATA["total_length"]

    # Ensure `count` is not greater than the total readings
    count = min(count, total_length)

    # Extract `count` readings from each key
    filtered_data = {key: DATA[key][:count] for key in keys}

    # Preserve boolean values
    filtered_data["bs_gas"] = DATA["bs_gas"]
    filtered_data["bs_fire"] = DATA["bs_fire"]
    # Update total_length to match filtered count
    filtered_data["total_length"] = count

    # curl http://localhost:5454/get_serial_data/5
    return jsonify(filtered_data)


# login route
# Allows only 3 login attempts per hour per IP
@app.route('/login', methods=['POST'])
@limiter.limit("3 per hour")
def login():
    # return jsonify({"message": "Success..."}), 200
    # return jsonify({"error": "Login is disabled"}), 403

    # if username == 'admin' and password == 'admin':
    #     return jsonify(status=True, message="Login successful")
    # else:
    #     return jsonify(status=False, message="Invalid Username or Password entered!")

    data = request.json
    username = data.get('username')
    password = data.get('password')

    # Firebase login:
    resp = login_to_firebase(username, password)

    if resp["status"]:
        print("Login successful...")
        return jsonify({"message": resp['message']}), 200
    else:
        print("Login failed...")
        return jsonify({"error": resp["message"]}), 403
    # Otherwise there would be 429 error


# Route to get the data from Firebase:
# Allows only 25 requests per minute per IP
@app.route('/get_live_data')
@limiter.limit("25 per minute")
def get_live_data():
    # return jsonify({"key": "val"}), 200

    # I am not setting any way to auto login for following reasons:
    # If you are asking for fb-data, you should be logged in
    # Get data can somehow still be called without login, so, deserves a 403

    if is_login_expired():
        return jsonify({"error": "Unauthorized to access data"}), 403

    try:
        uid = os.environ.get("FB_LOGIN_UID", None)
        token = os.environ.get("FB_LOGIN_TOKEN", None)

        if not uid or not token:
            return jsonify({"error": "Not logged in"}), 403

        resp = read_node(
            node="new_live_data",
            # node="live_data",
            uid=uid,
            token=token
        )

        if resp["status"]:
            # print("Data fetched successfully...")
            return jsonify({'message': resp["message"]}), 200
        else:
            # print("Failed to fetch data...")
            return jsonify({"error": resp["message"]}), 403
    except Exception as e:
        return jsonify({"error": "An error occurred. Not logged in"}), 403


# Handle the TOO MANY REQUESTS error:
@app.errorhandler(429)
def ratelimit_error(error):
    return jsonify({"error": "Too many requests. You have been BLOCKED!"}), 429


# Entry point:
if __name__ == '__main__':
    ENV = os.getenv("FLASK_ENV", "production")  # Default to production
    DEBUG_MODE = ENV.lower() == "development"

    if DEBUG_MODE:
        print("\n\nRunning in Development mode...\n")
    else:
        print("\n\nRunning in Production mode...\n")

    app.run(
        host='0.0.0.0',
        port=5454,
        debug=DEBUG_MODE,
        # load_dotenv=True,
    )
