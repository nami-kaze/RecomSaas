import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from scipy.sparse.linalg import svds

class RecommenderSystem:
    def __init__(self, data, system_type, columns):
        self.data = data
        self.system_type = system_type
        self.columns = columns
        self.model = None
        
    def prepare_content_based(self):
        # Combine all selected columns into a single string for each item
        self.data['combined_features'] = self.data[self.columns].astype(str).apply(lambda x: ' '.join(x), axis=1)
        
        # Create TF-IDF matrix
        tfidf = TfidfVectorizer(stop_words='english')
        tfidf_matrix = tfidf.fit_transform(self.data['combined_features'])
        
        # Calculate cosine similarity
        self.model = cosine_similarity(tfidf_matrix)
        
    def prepare_collaborative(self):
        # Prepare user-item matrix
        if len(self.columns) < 2:
            raise ValueError("Collaborative filtering requires at least 2 columns (user_id, item_id)")
            
        user_col, item_col = self.columns[0:2]
        rating_col = self.columns[2] if len(self.columns) > 2 else None
        
        if rating_col:
            ratings_matrix = self.data.pivot(index=user_col, columns=item_col, values=rating_col).fillna(0)
        else:
            # If no rating column, create binary interaction matrix
            ratings_matrix = pd.crosstab(self.data[user_col], self.data[item_col])
        
        # Perform SVD
        U, sigma, Vt = svds(ratings_matrix.values, k=min(ratings_matrix.shape) - 1)
        sigma = np.diag(sigma)
        self.model = {
            'U': U,
            'sigma': sigma,
            'Vt': Vt,
            'ratings_matrix': ratings_matrix
        }
        
    def get_content_recommendations(self, item_id, n_recommendations=5):
        item_index = self.data.index[self.data.iloc[:, 0] == item_id].tolist()[0]
        sim_scores = list(enumerate(self.model[item_index]))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        sim_scores = sim_scores[1:n_recommendations+1]
        item_indices = [i[0] for i in sim_scores]
        return self.data.iloc[item_indices]
        
    def get_collaborative_recommendations(self, user_id, n_recommendations=5):
        user_ratings_mean = np.mean(self.model['ratings_matrix'].values, axis=1)
        predicted_ratings = np.dot(np.dot(self.model['U'], self.model['sigma']), self.model['Vt']) + user_ratings_mean.reshape(-1, 1)
        
        user_index = self.model['ratings_matrix'].index.get_loc(user_id)
        user_predictions = predicted_ratings[user_index]
        
        # Get items that the user hasn't interacted with
        user_data = self.model['ratings_matrix'].iloc[user_index]
        unrated_items = user_data[user_data == 0].index
        
        # Get top N recommendations
        recommendations = pd.Series(user_predictions, index=self.model['ratings_matrix'].columns)
        recommendations = recommendations[unrated_items].sort_values(ascending=False)[:n_recommendations]
        
        return recommendations 