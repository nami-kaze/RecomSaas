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
        self.columns = columns
        self.model = None
        
        # Set style for plots - using a simpler style setting
        plt.style.use('default')  # Changed from seaborn to default
        sns.set_theme(style="whitegrid")  # Updated seaborn style setting
    
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
            # Convert inputs to appropriate format
            input_data = pd.DataFrame([inputs])
            
            if self.system_type == 'collaborative':
                # Collaborative filtering logic
                similarities = cosine_similarity(input_data, self.data)
                similar_indices = similarities[0].argsort()[-n_recommendations:][::-1]
                
            else:  # Content-based
                # Content-based filtering logic
                tfidf = TfidfVectorizer()
                tfidf_matrix = tfidf.fit_transform(self.data['text_column'])  # Adjust column name
                similarities = cosine_similarity(tfidf_matrix[-1:], tfidf_matrix[:-1])[0]
                similar_indices = similarities.argsort()[-n_recommendations:][::-1]
            
            # Format recommendations
            recommendations = []
            for idx in similar_indices:
                recommendations.append({
                    'name': self.data.iloc[idx]['name'],  # Adjust column name
                    'score': float(similarities[idx]),
                    'details': self._get_item_details(idx)  # Helper method to get additional details
                })
            
            return recommendations
            
        except Exception as e:
            print(f"Error generating recommendations: {str(e)}")
            raise

    def _get_item_details(self, idx):
        """Helper method to get formatted item details"""
        try:
            item = self.data.iloc[idx]
            details = []
            for col in self.columns:
                if col != 'name':  # Adjust based on your columns
                    details.append(f"{col}: {item[col]}")
            return ' | '.join(details)
        except Exception as e:
            return "Details not available"