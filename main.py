from flask import Flask, render_template, jsonify, request, send_file
from flask_cors import CORS
import os
import json
import pandas as pd
from recommender import RecommenderSystem
import threading
import io
import uuid

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
        algorithm = data.get('algorithm', 'svd')
        inputs = data.get('inputs', [])
        output = data.get('output')
        
        print(f"Received compile request for session: {session_id}")
        
        if not session_id or session_id not in recommendation_systems:
            return jsonify({
                'success': False,
                'error': 'No dataset uploaded. Please upload datasets first.'
            })
        
        session_data = recommendation_systems[session_id]
        df = session_data['data']
        
        if system_type == 'collaborative':
            try:
                # Validate required columns
                if len(inputs) < 2 or not output:
                    return jsonify({
                        'success': False,
                        'error': 'Collaborative filtering requires user_id, item_id, and rating columns'
                    })
                
                # Create column list in correct order [user_id, item_id, rating]
                selected_columns = [
                    inputs[0]['column'],  # user_id
                    inputs[1]['column'],  # item_id
                    output['column']      # rating
                ]
                
                # Validate rating column is numeric
                try:
                    pd.to_numeric(df[output['column']])
                except Exception as e:
                    return jsonify({
                        'success': False,
                        'error': f"Rating column '{output['column']}' must contain numeric values only"
                    })
                
                print(f"Selected columns for collaborative filtering: {selected_columns}")
                
                # Initialize recommender system
                recommender = RecommenderSystem(
                    data=df,
                    system_type='collaborative',
                    columns=selected_columns,
                    algorithm=algorithm
                )
                
                # Store the compiled model
                recommendation_systems[session_id]['recommender'] = recommender
                recommendation_systems[session_id]['columns'] = selected_columns
                recommendation_systems[session_id]['algorithm'] = algorithm
                
                print(f"Collaborative model ({algorithm}) compiled successfully")
                
            except Exception as e:
                print(f"Error in collaborative model compilation: {str(e)}")
                return jsonify({
                    'success': False,
                    'error': f'Error in collaborative model compilation: {str(e)}'
                })
        else:
            # Content-based compilation
            selected_columns = [col['column'] for col in inputs] + [output['column']]
            recommender = RecommenderSystem(
                data=df,
                system_type=system_type,
                columns=selected_columns
            )
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

@app.route('/export-model', methods=['POST'])
def export_model():
    try:
        data = request.get_json()
        system_type = data.get('system_type')
        input_columns = data.get('input_columns')
        output_column = data.get('output_column')
        
        # Create the complete model code with user configurations
        model_code = f'''import matplotlib
matplotlib.use('Agg')  # Set the backend to Agg before importing pyplot
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from scipy.sparse.linalg import svds
import io
import base64

class RecommenderSystem:
    def __init__(self, data):
        self.data = data
        self.system_type = "{system_type}"
        self.input_columns = {input_columns}
        self.output_column = "{output_column}"
        self._preprocess_data()
        
        # Set style for plots
        plt.style.use('default')
        sns.set_theme(style="whitegrid")
    
    def _preprocess_data(self):
        """Preprocess the data for better recommendations"""
        try:
            # Convert all text to lowercase for better matching
            for col in self.input_columns:
                if self.data[col].dtype == 'object':
                    self.data[col] = self.data[col].str.lower()
            
            # Create TF-IDF vectorizer for text columns
            self.tfidf = TfidfVectorizer(
                stop_words='english',
                ngram_range=(1, 2),
                max_features=5000,
                strip_accents='unicode',
                analyzer='word'
            )
            
            # Combine all input columns for feature creation
            self.text_features = self.data[self.input_columns].astype(str).agg(' '.join, axis=1)
            self.tfidf_matrix = self.tfidf.fit_transform(self.text_features)
            
        except Exception as e:
            print(f"Error in preprocessing: {{str(e)}}")
            raise

    def generate_recommendations(self, inputs, n_recommendations=5):
        """Generate recommendations based on input values"""
        try:
            # Preprocess input
            input_text = ' '.join(str(v).lower() for v in inputs.values())
            
            # Transform input using the same TF-IDF vectorizer
            input_vector = self.tfidf.transform([input_text])
            
            # Calculate cosine similarities
            similarities = cosine_similarity(input_vector, self.tfidf_matrix)[0]
            
            # Get indices of top N similar items
            similar_indices = []
            sorted_indices = similarities.argsort()[::-1]
            
            # Filter recommendations
            seen_outputs = set()
            for idx in sorted_indices:
                output_value = str(self.data.iloc[idx][self.output_column]).lower()
                similarity = similarities[idx]
                
                # Skip if similarity is too low or we've seen this output
                if similarity < 0.1:
                    continue
                if output_value in seen_outputs:
                    continue
                    
                similar_indices.append(idx)
                seen_outputs.add(output_value)
                
                if len(similar_indices) >= n_recommendations:
                    break
            
            # Format recommendations
            recommendations = []
            for idx in similar_indices:
                output_value = self.data.iloc[idx][self.output_column]
                similarity = similarities[idx]
                
                recommendations.append({{
                    'output_value': str(output_value),
                    'score': float(similarity)
                }})
            
            return recommendations
            
        except Exception as e:
            print(f"Error generating recommendations: {{str(e)}}")
            raise
'''
        
        # Create a BytesIO object to hold the file
        buffer = io.BytesIO()
        buffer.write(model_code.encode())
        buffer.seek(0)
        
        return send_file(
            buffer,
            mimetype='text/x-python',
            as_attachment=True,
            download_name='recommender_model.py'
        )
        
    except Exception as e:
        print(f"Error in export_model: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/upload-multiple', methods=['POST'])
def upload_multiple():
    try:
        print("\n=== Starting multiple file upload process ===")
        files = request.files
        
        if not files:
            return jsonify({'success': False, 'error': 'No files uploaded'})
        
        # Generate a new session ID
        session_id = str(uuid.uuid4())
        print(f"Generated new session ID: {session_id}")
        
        # Store dataframes for this session
        dataframes = {}
        
        # Process each uploaded file
        for file_key in files:
            file = files[file_key]
            if file.filename.endswith('.csv'):
                print(f"Processing file: {file.filename}")
                df = pd.read_csv(file)
                dataframes[file.filename] = df
                print(f"Loaded dataframe with shape: {df.shape}")
        
        if len(dataframes) < 2:
            return jsonify({
                'success': False,
                'error': 'Please upload at least 2 CSV files'
            })
        
        # Find common columns between dataframes
        all_columns = [set(df.columns) for df in dataframes.values()]
        common_columns = set.intersection(*all_columns)
        
        if not common_columns:
            return jsonify({
                'success': False,
                'error': 'No common columns found between datasets'
            })
        
        # Merge dataframes on first common column
        merge_column = list(common_columns)[0]
        print(f"Merging datasets on column: {merge_column}")
        
        merged_df = None
        for df in dataframes.values():
            if merged_df is None:
                merged_df = df
            else:
                merged_df = pd.merge(merged_df, df, on=merge_column, how='inner')
        
        # Store everything in the session
        recommendation_systems[session_id] = {
            'data': merged_df,
            'original_dataframes': dataframes,
            'merge_column': merge_column,
            'columns': {
                filename: df.columns.tolist() 
                for filename, df in dataframes.items()
            }
        }
        
        print(f"Session data stored successfully. Available columns: {merged_df.columns.tolist()}")
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'columns': {
                filename: df.columns.tolist() 
                for filename, df in dataframes.items()
            },
            'merge_column': merge_column,
            'message': 'Files uploaded and merged successfully'
        })
        
    except Exception as e:
        print(f"Error in upload_multiple: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Disable threading in development
    app.run(debug=True, port=5000, threaded=False)