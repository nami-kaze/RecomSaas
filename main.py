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
            return jsonify({'success': False, 'error': 'No file part'})
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No selected file'})
            
        # Read the CSV file
        df = pd.read_csv(file)
        
        # Generate session ID
        session_id = str(abs(hash(file.filename + str(pd.Timestamp.now()))))
        
        # Store the data
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
        print(f"Error in upload_data: {str(e)}")
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
        
        if not session_id or session_id not in recommendation_systems:
            return jsonify({
                'success': False,
                'error': 'No dataset uploaded. Please upload a dataset first.'
            })
        
        # Get the data from our storage
        session_data = recommendation_systems[session_id]
        if 'data' not in session_data:
            return jsonify({
                'success': False,
                'error': 'Dataset not found. Please upload again.'
            })
        
        df = session_data['data']
        
        # Create and store the recommender system
        recommender = RecommenderSystem(
            data=df,
            system_type=system_type,
            columns=selected_columns
        )
        
        # Store the compiled model
        recommendation_systems[session_id]['recommender'] = recommender
        
        return jsonify({
            'success': True,
            'message': 'Model compilation successful',
            'session_id': session_id
        })
        
    except Exception as e:
        print(f"Error in compile_model: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/get-recommendations', methods=['POST'])
def get_recommendations():
    print("\n=== Starting recommendations request ===")
    try:
        data = request.get_json()
        print("Received data:", data)
        
        session_id = data.get('session_id')
        inputs = data.get('inputs')
        n_recommendations = data.get('n_recommendations', 5)
        
        print(f"Session ID: {session_id}")
        print(f"Inputs: {inputs}")
        print(f"Number of recommendations: {n_recommendations}")
        
        if not session_id or session_id not in recommendation_systems:
            return jsonify({
                'success': False,
                'error': 'Invalid session ID or no model compiled'
            })
        
        recommender = recommendation_systems[session_id].get('recommender')
        if not recommender:
            return jsonify({
                'success': False,
                'error': 'Model not compiled for this session'
            })
        
        recommendations = recommender.generate_recommendations(
            inputs=inputs,
            n_recommendations=n_recommendations
        )
        
        return jsonify({
            'success': True,
            'recommendations': recommendations
        })
        
    except Exception as e:
        print(f"Error in get_recommendations: {str(e)}")
        import traceback
        print(traceback.format_exc())
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