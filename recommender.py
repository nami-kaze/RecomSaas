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

class RecommenderSystem:
    def __init__(self, data, system_type, columns):
        print(f"Initializing RecommenderSystem with:")
        print(f"- Data shape: {data.shape}")
        print(f"- System type: {system_type}")
        print(f"- Columns: {columns}")
        self.data = data
        self.system_type = system_type
        self.input_columns = columns[:-1]  # All columns except the last one
        self.output_column = columns[-1]   # Last column is the output
        print(f"- Input columns: {self.input_columns}")
        print(f"- Output column: {self.output_column}")
        
        # Preprocess the data
        self._preprocess_data()
        
        # Set style for plots - using a simpler style setting
        plt.style.use('default')  # Changed from seaborn to default
        sns.set_theme(style="whitegrid")  # Updated seaborn style setting
    
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
        print("\n=== Generating recommendations ===")
        try:
            print(f"Generating recommendations for input: {inputs}")
            
            # Preprocess input
            input_text = ' '.join(str(v).lower() for v in inputs.values())
            print(f"Processed input text: {input_text}")
            
            # Transform input using the same TF-IDF vectorizer
            input_vector = self.tfidf.transform([input_text])
            
            # Calculate cosine similarities
            similarities = cosine_similarity(input_vector, self.tfidf_matrix)[0]
            
            # Get indices of top N similar items, excluding exact matches
            similar_indices = []
            sorted_indices = similarities.argsort()[::-1]
            
            # Filter recommendations
            seen_outputs = set()
            for idx in sorted_indices:
                output_value = str(self.data.iloc[idx][self.output_column]).lower()
                similarity = similarities[idx]
                
                # Skip if similarity is too low or we've seen this output
                if similarity < 0.1:  # Minimum similarity threshold
                    continue
                if output_value in seen_outputs:
                    continue
                    
                similar_indices.append(idx)
                seen_outputs.add(output_value)
                
                if len(similar_indices) >= n_recommendations:
                    break
            
            print(f"Found {len(similar_indices)} recommendations")
            
            # Format recommendations
            recommendations = []
            for idx in similar_indices:
                output_value = self.data.iloc[idx][self.output_column]
                similarity = similarities[idx]
                
                print(f"Recommendation: {output_value} (similarity: {similarity:.3f})")
                
                recommendations.append({
                    'output_value': str(output_value),
                    'score': float(similarity)
                })
            
            return recommendations
            
        except Exception as e:
            print(f"Error generating recommendations: {str(e)}")
            import traceback
            print(traceback.format_exc())
            raise