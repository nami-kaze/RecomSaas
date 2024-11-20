import matplotlib
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
from surprise import Dataset, Reader, SVD, KNNBasic

class RecommenderSystem:
    def __init__(self, data, system_type, columns, algorithm='svd'):
        print(f"Initializing RecommenderSystem with:")
        print(f"- Data shape: {data.shape}")
        print(f"- System type: {system_type}")
        print(f"- Columns: {columns}")
        print(f"- Algorithm: {algorithm}")
        
        self.data = data
        self.system_type = system_type
        self.algorithm = algorithm
        
        if system_type == 'collaborative':
            # For collaborative filtering, expect [user_id, item_id, rating]
            self.user_col = columns[0]
            self.item_col = columns[1]
            self.rating_col = columns[2]
            self._init_collaborative_model()
        else:
            # Existing content-based initialization
            self.input_columns = columns[:-1]
            self.output_column = columns[-1]
            self._preprocess_data()

    def _init_collaborative_model(self):
        """Initialize collaborative filtering model"""
        try:
            print("Initializing collaborative filtering model...")
            
            # Create a copy of the data to avoid modifying the original
            self.processed_data = self.data.copy()
            
            # Ensure user_id and item_id are strings (to handle both numerical and string IDs)
            self.processed_data[self.user_col] = self.processed_data[self.user_col].astype(str)
            self.processed_data[self.item_col] = self.processed_data[self.item_col].astype(str)
            
            # Ensure rating column is numeric
            try:
                self.processed_data[self.rating_col] = pd.to_numeric(self.processed_data[self.rating_col])
            except Exception as e:
                raise ValueError(f"Rating column '{self.rating_col}' must contain numeric values only")
            
            # Create ID mappings for users and items
            self.user_to_idx = {user: idx for idx, user in enumerate(self.processed_data[self.user_col].unique())}
            self.idx_to_user = {idx: user for user, idx in self.user_to_idx.items()}
            
            self.item_to_idx = {item: idx for idx, item in enumerate(self.processed_data[self.item_col].unique())}
            self.idx_to_item = {idx: item for item, idx in self.item_to_idx.items()}
            
            # Map IDs to indices
            self.processed_data['user_idx'] = self.processed_data[self.user_col].map(self.user_to_idx)
            self.processed_data['item_idx'] = self.processed_data[self.item_col].map(self.item_to_idx)
            
            print("Data preprocessing completed")
            print(f"Number of users: {len(self.user_to_idx)}")
            print(f"Number of items: {len(self.item_to_idx)}")
            
            # Create Surprise reader object
            reader = Reader(rating_scale=(
                self.processed_data[self.rating_col].min(),
                self.processed_data[self.rating_col].max()
            ))
            
            # Load data into Surprise format using mapped indices
            data = Dataset.load_from_df(
                self.processed_data[['user_idx', 'item_idx', self.rating_col]],
                reader
            )
            
            # Build training set
            trainset = data.build_full_trainset()
            
            # Initialize and train model based on algorithm choice
            if self.algorithm.lower() == 'svd':
                self.model = SVD(n_factors=100, n_epochs=20, lr_all=0.005, reg_all=0.02)
            else:  # item-knn
                self.model = KNNBasic(sim_options={'name': 'cosine', 'user_based': False})
            
            print(f"Training {self.algorithm} model...")
            self.model.fit(trainset)
            print("Model training completed")
            
        except Exception as e:
            print(f"Error in _init_collaborative_model: {str(e)}")
            raise

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
                ngram_range=(1, 2),  # Use both unigrams and bigrams
                max_features=5000,    # Limit features to most important ones
                strip_accents='unicode',
                analyzer='word'
            )
            
            # Combine all input columns for feature creation
            self.text_features = self.data[self.input_columns].astype(str).agg(' '.join, axis=1)
            self.tfidf_matrix = self.tfidf.fit_transform(self.text_features)
            
            print("Data preprocessing completed")
            print(f"TF-IDF matrix shape: {self.tfidf_matrix.shape}")
            
        except Exception as e:
            print(f"Error in preprocessing: {str(e)}")
            raise

    def generate_visualizations(self):
        """Generate a set of visualizations for the dataset"""
        print("\nStarting visualization generation...")
        try:
            visualizations = {}
            
            # Generate each plot with error handling
            try:
                print("Generating distribution plot...")
                visualizations['distribution'] = self._generate_distribution_plot()
                print("Distribution plot generated successfully")
            except Exception as e:
                print(f"Error generating distribution plot: {str(e)}")
                visualizations['distribution'] = self._generate_empty_plot("Error generating distribution plot")

            try:
                print("Generating correlation plot...")
                visualizations['correlation'] = self._generate_correlation_plot()
                print("Correlation plot generated successfully")
            except Exception as e:
                print(f"Error generating correlation plot: {str(e)}")
                visualizations['correlation'] = self._generate_empty_plot("Error generating correlation plot")

            try:
                print("Generating missing data plot...")
                visualizations['missing_data'] = self._generate_missing_data_plot()
                print("Missing data plot generated successfully")
            except Exception as e:
                print(f"Error generating missing data plot: {str(e)}")
                visualizations['missing_data'] = self._generate_empty_plot("Error generating missing data plot")

            try:
                print("Generating trends plot...")
                visualizations['trends'] = self._generate_trends_plot()
                print("Trends plot generated successfully")
            except Exception as e:
                print(f"Error generating trends plot: {str(e)}")
                visualizations['trends'] = self._generate_empty_plot("Error generating trends plot")

            return visualizations

        except Exception as e:
            print(f"Error in generate_visualizations: {str(e)}")
            raise

    def _generate_distribution_plot(self):
        """Generate distribution plots for numerical columns"""
        try:
            numerical_cols = self.data.select_dtypes(include=['int64', 'float64']).columns
            print(f"Found numerical columns: {numerical_cols.tolist()}")

            if len(numerical_cols) == 0:
                return self._generate_empty_plot("No numerical columns available")

            plt.figure(figsize=(6, 4))
            for col in numerical_cols[:3]:  # Plot first 3 numerical columns
                sns.histplot(data=self.data, x=col, kde=True, label=col)

            plt.title('Distribution of Numerical Features')
            plt.xlabel('Value')
            plt.ylabel('Count')
            plt.legend(fontsize='small')
            plt.tight_layout()
            return self._convert_plot_to_base64()

        except Exception as e:
            print(f"Error in _generate_distribution_plot: {str(e)}")
            raise

    def _generate_correlation_plot(self):
        """Generate correlation heatmap"""
        try:
            numerical_data = self.data.select_dtypes(include=['int64', 'float64'])
            
            if numerical_data.empty:
                return self._generate_empty_plot("No numerical data available")

            # Larger figure size specifically for correlation plot
            plt.figure(figsize=(8, 6))  # Larger size for heatmap
            correlation_matrix = numerical_data.corr()
            
            # Adjust font sizes for better readability
            sns.heatmap(correlation_matrix, 
                       annot=True, 
                       cmap='coolwarm', 
                       center=0,
                       fmt='.2f',
                       square=True,
                       annot_kws={'size': 8},  # Smaller font size for annotations
                       cbar_kws={'shrink': .8})  # Smaller colorbar
            
            plt.title('Correlation Heatmap', pad=10)
            
            # Rotate x-axis labels for better fit
            plt.xticks(rotation=45, ha='right')
            plt.yticks(rotation=0)
            
            # Adjust layout to fit everything
            plt.tight_layout()
            return self._convert_plot_to_base64()

        except Exception as e:
            print(f"Error in _generate_correlation_plot: {str(e)}")
            raise

    def _generate_missing_data_plot(self):
        """Generate missing data visualization"""
        try:
            plt.figure(figsize=(6, 4))
            missing_data = (self.data.isnull().sum() / len(self.data)) * 100
            
            plt.bar(range(len(missing_data)), missing_data)
            plt.title('Missing Data Percentage by Column')
            plt.xlabel('Columns')
            plt.ylabel('Missing Data (%)')
            plt.xticks(range(len(missing_data)), missing_data.index, rotation=45, ha='right')
            plt.tight_layout()
            return self._convert_plot_to_base64()

        except Exception as e:
            print(f"Error in _generate_missing_data_plot: {str(e)}")
            raise

    def _generate_trends_plot(self):
        """Generate trends or patterns in the data"""
        try:
            numerical_cols = self.data.select_dtypes(include=['int64', 'float64']).columns
            
            if len(numerical_cols) < 2:
                return self._generate_empty_plot("Insufficient numerical columns")

            plt.figure(figsize=(6, 4))
            plt.scatter(
                self.data[numerical_cols[0]],
                self.data[numerical_cols[1]],
                alpha=0.5
            )
            plt.xlabel(numerical_cols[0])
            plt.ylabel(numerical_cols[1])
            plt.title(f'{numerical_cols[0]} vs {numerical_cols[1]} Scatter Plot')
            plt.tight_layout()
            return self._convert_plot_to_base64()

        except Exception as e:
            print(f"Error in _generate_trends_plot: {str(e)}")
            raise

    def _generate_empty_plot(self, message):
        """Generate an empty plot with a message"""
        plt.figure(figsize=(8, 5))
        plt.text(0.5, 0.5, message, ha='center', va='center')
        plt.axis('off')
        return self._convert_plot_to_base64()

    def _convert_plot_to_base64(self):
        """Convert matplotlib plot to base64 string"""
        try:
            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', bbox_inches='tight', dpi=300)
            buffer.seek(0)
            image_png = buffer.getvalue()
            buffer.close()
            plt.close()  # Close the figure to free memory
            
            encoded = base64.b64encode(image_png).decode()
            print("Plot successfully converted to base64")
            return encoded

        except Exception as e:
            print(f"Error in _convert_plot_to_base64: {str(e)}")
            raise

    def generate_recommendations(self, inputs, n_recommendations=5):
        """Generate recommendations based on input values"""
        try:
            if self.system_type == 'collaborative':
                return self._generate_collaborative_recommendations(inputs, n_recommendations)
            else:
                return self._generate_content_recommendations(inputs, n_recommendations)
                
        except Exception as e:
            print(f"Error in generate_recommendations: {str(e)}")
            raise

    def _generate_collaborative_recommendations(self, inputs, n_recommendations=5):
        """Generate collaborative filtering recommendations"""
        try:
            print(f"\nGenerating collaborative recommendations for: {inputs}")
            
            # Get the user ID from inputs using the correct column name
            user_id = str(inputs.get(self.user_col))
            
            if not user_id:
                raise ValueError(f"Please provide a valid {self.user_col}")
            
            if user_id not in self.user_to_idx:
                raise ValueError(f"User ID '{user_id}' not found in training data")
            
            user_idx = self.user_to_idx[user_id]
            
            # Get all items the user hasn't interacted with
            user_items = set(self.processed_data[
                self.processed_data['user_idx'] == user_idx
            ]['item_idx'])
            
            items_to_predict = [
                idx for idx in range(len(self.item_to_idx)) 
                if idx not in user_items
            ]
            
            # Generate predictions
            predictions = []
            for item_idx in items_to_predict:
                pred = self.model.predict(user_idx, item_idx)
                
                # Get the original item ID/name
                item_id = self.idx_to_item[item_idx]
                
                # If you have item details (e.g., movie titles), get them
                item_details = self.data[self.data[self.item_col] == item_id].iloc[0]
                item_name = item_details.get('title', item_id)  # Use title if available, else use ID
                
                predictions.append({
                    'item_id': item_id,
                    'item_name': item_name,
                    'predicted_rating': pred.est
                })
            
            # Sort predictions and get top N
            predictions.sort(key=lambda x: x['predicted_rating'], reverse=True)
            top_predictions = predictions[:n_recommendations]
            
            # Format recommendations
            recommendations = []
            for pred in top_predictions:
                recommendations.append({
                    'output_value': str(pred['item_name']),  # Use item name instead of ID
                    'score': float(pred['predicted_rating'])
                })
            
            print(f"Generated {len(recommendations)} recommendations")
            return recommendations
            
        except Exception as e:
            print(f"Error in _generate_collaborative_recommendations: {str(e)}")
            raise

    def _generate_content_recommendations(self, inputs, n_recommendations):
        """Existing content-based recommendation method"""
        # Your existing content-based recommendation code here
        pass