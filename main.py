from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import os
import json
import pandas as pd
from recommender import RecommenderSystem

app = Flask(__name__)

# Keep your existing CORS configuration

# Add a dictionary to store recommendation systems for different sessions
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
            
        # Read CSV file
        df = pd.read_csv(file)
        
        # Generate a unique session ID (you might want to use a proper session management system)
        session_id = str(hash(str(df.head()) + str(pd.Timestamp.now())))
        
        # Store the dataframe temporarily
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
        session_id = data.get('session_id')
        system_type = data.get('system_type')
        selected_columns = data.get('columns')
        
        if session_id not in recommendation_systems:
            return jsonify({'success': False, 'error': 'Invalid session ID'})
            
        # Get the stored dataframe
        df = recommendation_systems[session_id]['data']
        
        # Create and prepare the recommendation system
        recommender = RecommenderSystem(df, system_type, selected_columns)
        
        if system_type == 'content':
            recommender.prepare_content_based()
        elif system_type == 'collaborative':
            recommender.prepare_collaborative()
        else:
            return jsonify({'success': False, 'error': 'Invalid system type'})
            
        # Store the prepared recommender and selected columns
        recommendation_systems[session_id]['recommender'] = recommender
        recommendation_systems[session_id]['selected_columns'] = selected_columns
        
        return jsonify({
            'success': True,
            'message': 'Model compiled successfully',
            'selected_columns': selected_columns  # Return selected columns for input form generation
        })
        
    except Exception as e:
        print(f"Error in compile_model: {str(e)}")  # Add debugging
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

# Keep your existing main block
if __name__ == '__main__':
    app.run(debug=True, port=5000)