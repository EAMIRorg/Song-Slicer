import signal
import sys
import os
from flask import Flask, request, jsonify
from waitress import serve
from librosaMusicSeg import runSegmentation

app = Flask(__name__)
SERVER_PORT = int(os.environ.get("PY_SERVER_PORT", "5001"))

# Create an endpoint
@app.route('/call-python', methods=['POST'])
def call_python():
    # Get data from the request
    # input_data = request.json.get('name', 'Guest')

    # get arguments from algopy
    data = request.get_json()
    song_path = data['song']
    algorithm = data['algorithm']
    clusters = data['clusters']
    print(f"Algorithm: {algorithm}")

    # Call the Python function
    if(algorithm == 1):
        result = runSegmentation(song_path, "CQT", "Agglomerative", clusters)
    elif(algorithm == 2):
        result = runSegmentation(song_path, "Mel", "KMeans", clusters)
    elif(algorithm == 3):
        result = runSegmentation(song_path, "CQT", "GMM", clusters)
    elif(algorithm == 4):
        result = runSegmentation(song_path, "STFT", "KMeans", clusters)
    else:
        result = []
    # Return the result as a JSON response
    return jsonify([[int(a), float(b), float(c), int(d)] for a, b, c, d in result])

# Handle server shutdown
@app.route('/shutdown', methods=['POST'])
def shutdown():
    if request.method == 'POST':
        os.kill(os.getpid(), signal.SIGINT)
        return 'Server shutting down...'


# Handle termination signals
def handle_exit_signal(signum, frame):
    print("Shutting down Flask server...")
    sys.exit(0)

signal.signal(signal.SIGINT, handle_exit_signal)
signal.signal(signal.SIGTERM, handle_exit_signal)

if __name__ == '__main__':
    print("Starting Flask server with Waitress...")
    serve(app, host='0.0.0.0', port=SERVER_PORT)
