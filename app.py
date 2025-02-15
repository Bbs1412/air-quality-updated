import os
import json
from flask import Flask, jsonify, request, send_from_directory, render_template


# Config:
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, 'Templates')
STATIC_DIR = os.path.join(BASE_DIR, 'static')

app = Flask(__name__, template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)

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


# Route to get saved data, parameter count(int) is the number of readings to get:
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


# Route to simulate real time data fetch.
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



# Entry point:
if __name__ == '__main__':
    app.run(
        port=5454,
        debug=True,
        load_dotenv=True,
    )
