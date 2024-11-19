from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import os
import json
import pandas as pd
from recommender import RecommenderSystem

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

recommendation_systems = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload-data', methods=['POST'])
def upload_data():
    try:
        file = request.files['file']
        if not file:
            return jsonify({'success': False, 'error': 'No file uploaded'})
            
        df = pd.read_csv(file)
        session_id = str(hash(str(df.head()) + str(pd.Timestamp.now())))
        
        recommendation_systems[session_id] = {
            'data': df,
            'columns': df.columns.tolist()
        }
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'columns': df.columns.tolist(),
            'message': 'Data uploaded successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/compile-model', methods=['POST'])
def compile_model():
    try:
        data = request.get_json()
        system_type = data.get('system_type')
        selected_columns = data.get('columns')
        
        response_data = {
            'success': True,
            'message': 'Model compilation request received',
            'details': {
                'system_type': system_type,
                'columns': selected_columns
            }
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/get-recommendations', methods=['POST'])
def get_recommendations():
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        input_value = data.get('input_value')
        n_recommendations = data.get('n_recommendations', 5)
        
        if session_id not in recommendation_systems:
            return jsonify({'success': False, 'error': 'Invalid session ID'})
            
        recommender = recommendation_systems[session_id]['recommender']
        
        if recommender.system_type == 'content':
            recommendations = recommender.get_content_recommendations(
                input_value, 
                n_recommendations
            )
        else:
            recommendations = recommender.get_collaborative_recommendations(
                input_value, 
                n_recommendations
            )
            
        return jsonify({
            'success': True,
            'recommendations': recommendations.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)