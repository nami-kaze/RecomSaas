from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import os
import json

app = Flask(__name__)

# Remove all other CORS configurations and just use this one
CORS(app, resources={
    r"/*": {
        "origins": ["http://127.0.0.1:5000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/kaggle-import', methods=['POST', 'OPTIONS'])
def kaggle_import():
    try:
        print("Received request:", request.method)  # Debug print
        
        # Handle preflight request
        if request.method == 'OPTIONS':
            return '', 204
            
        data = request.get_json()
        print("Received data:", data)  # Debug print
        
        # Your mock response
        return jsonify({
            'success': True,
            'headers': ['column1', 'column2', 'column3'],
            'message': 'Dataset imported successfully'
        })
        
    except Exception as e:
        print("Error:", str(e))  # Debug print
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)