from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import os
import json
import pandas as pd
from recommender import RecommenderSystem
import threading

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Add thread lock for visualization generation
visualization_lock = threading.Lock()

recommendation_systems = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload-data', methods=['POST'])
def upload_data():
    try:
        print("\n=== Starting file upload process ===")
        
        if 'file' not in request.files:
            print("No file part in request")
            return jsonify({'success': False, 'error': 'No file part'}), 400
            
        file = request.files['file']
        if file.filename == '':
            print("No selected file")
            return jsonify({'success': False, 'error': 'No selected file'}), 400
            
        print(f"File received: {file.filename}")
        
        try:
            df = pd.read_csv(file)
            print(f"DataFrame created successfully with shape: {df.shape}")
            print(f"Column names: {df.columns.tolist()}")
            print(f"Data types: {df.dtypes.to_dict()}")
            print(f"First few rows:\n{df.head()}")
        except Exception as e:
            print(f"Error reading CSV: {str(e)}")
            return jsonify({'success': False, 'error': f'Error reading CSV: {str(e)}'}), 400
        
        session_id = str(abs(hash(file.filename + str(pd.Timestamp.now()))))
        print(f"Generated session ID: {session_id}")
        
        recommendation_systems[session_id] = {
            'data': df,
            'columns': df.columns.tolist()
        }
        print(f"Data stored in recommendation_systems dictionary. Keys: {recommendation_systems.keys()}")
        
        response_data = {
            'success': True,
            'session_id': session_id,
            'columns': df.columns.tolist(),
            'message': 'Data uploaded successfully'
        }
        print(f"Sending response: {response_data}")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error in upload_data: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    try:
        print("\n=== Starting file upload process ===")
        file = request.files['file']
        if not file:
            print("Error: No file received in request")
            return jsonify({'success': False, 'error': 'No file uploaded'})
        
        print(f"File received: {file.filename}")
        df = pd.read_csv(file)
        print(f"DataFrame created with shape: {df.shape}")
        print(f"Columns: {df.columns.tolist()}")
        
        session_id = str(hash(str(df.head()) + str(pd.Timestamp.now())))
        print(f"Generated session ID: {session_id}")
        
        recommendation_systems[session_id] = {
            'data': df,
            'columns': df.columns.tolist()
        }
        print("Data stored in recommendation_systems dictionary")
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'columns': df.columns.tolist(),
            'message': 'Data uploaded successfully'
        })
        
    except Exception as e:
        print(f"Error in upload_data: {str(e)}")
        import traceback
        print(traceback.format_exc())
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
        inputs = data.get('inputs')
        n_recommendations = data.get('n_recommendations', 5)
        
        if session_id not in recommendation_systems:
            return jsonify({'success': False, 'error': 'Invalid session ID'})
        
        system = recommendation_systems[session_id].get('recommender')
        if not system:
            return jsonify({'success': False, 'error': 'Model not compiled'})
            
        recommendations = system.generate_recommendations(inputs, n_recommendations)
        
        return jsonify({
            'success': True,
            'recommendations': recommendations
        })
        
    except Exception as e:
        print(f"Error in get_recommendations: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/get-visualizations', methods=['POST'])
def get_visualizations():
    try:
        print("\n=== Starting visualization process ===")
        data = request.get_json()
        session_id = data.get('session_id')
        print(f"Received request for session_id: {session_id}")
        
        if not session_id:
            print("Error: No session_id provided")
            return jsonify({'success': False, 'error': 'No session ID provided'})
        
        print(f"Active sessions: {list(recommendation_systems.keys())}")
        
        if session_id not in recommendation_systems:
            print(f"Error: Session {session_id} not found")
            return jsonify({'success': False, 'error': 'Invalid session ID'})
        
        session_data = recommendation_systems[session_id]
        print(f"Session data keys: {session_data.keys()}")
        
        df = session_data['data']
        print(f"Retrieved DataFrame with shape: {df.shape}")
        
        # Use thread lock for visualization generation
        with visualization_lock:
            print("Creating RecommenderSystem instance...")
            system = RecommenderSystem(df, 'content', df.columns.tolist())
            
            print("Generating visualizations...")
            visualizations = system.generate_visualizations()
            print("Visualizations generated successfully")
            
            # Verify visualization data
            for viz_name, viz_data in visualizations.items():
                print(f"Visualization '{viz_name}' data length: {len(viz_data) if viz_data else 0}")
        
        return jsonify({
            'success': True,
            'visualizations': visualizations
        })
        
    except Exception as e:
        print(f"Error in get_visualizations: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Disable threading in development
    app.run(debug=True, port=5000, threaded=False)