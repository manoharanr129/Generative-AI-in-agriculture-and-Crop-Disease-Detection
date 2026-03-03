import cv2
import numpy as np
import json
from pathlib import Path

class DiseaseDetector:
    def __init__(self):
        # Load disease database
        base_dir = Path(__file__).parent
        with open(base_dir / 'data/diseases.json', 'r') as f:
            self.disease_data = json.load(f)
    
    def analyze_image(self, image_path):
        """
        Analyze crop image using OpenCV to detect disease
        Returns: disease_id, severity, confidence
        """
        # Read image
        img = cv2.imread(image_path)
        if img is None:
            return None, None, 0
        
        # Convert to different color spaces for analysis
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        
        # Extract features
        features = self._extract_features(img, hsv, lab)
        
        # Detect disease based on features
        disease_result = self._classify_disease(features)
        
        return disease_result
    
    def _extract_features(self, img, hsv, lab):
        """Extract color and texture features from image"""
        features = {}
        
        # Color analysis in HSV
        h, s, v = cv2.split(hsv)
        features['avg_hue'] = np.mean(h)
        features['avg_saturation'] = np.mean(s)
        features['avg_value'] = np.mean(v)
        
        # Detect brown/yellow spots (common in diseases)
        # Brown: Hue 10-20, moderate saturation
        brown_mask = cv2.inRange(hsv, np.array([5, 50, 50]), np.array([25, 255, 255]))
        features['brown_percentage'] = (np.sum(brown_mask > 0) / brown_mask.size) * 100
        
        # Yellow: Hue 20-40
        yellow_mask = cv2.inRange(hsv, np.array([20, 50, 50]), np.array([40, 255, 255]))
        features['yellow_percentage'] = (np.sum(yellow_mask > 0) / yellow_mask.size) * 100
        
        # White (powdery): High value, low saturation
        white_mask = cv2.inRange(hsv, np.array([0, 0, 200]), np.array([180, 50, 255]))
        features['white_percentage'] = (np.sum(white_mask > 0) / white_mask.size) * 100
        
        # Dark spots: Low value
        dark_mask = cv2.inRange(hsv, np.array([0, 0, 0]), np.array([180, 255, 80]))
        features['dark_percentage'] = (np.sum(dark_mask > 0) / dark_mask.size) * 100
        
        # Orange/rust color: Hue 5-15, high saturation
        rust_mask = cv2.inRange(hsv, np.array([5, 100, 100]), np.array([15, 255, 255]))
        features['rust_percentage'] = (np.sum(rust_mask > 0) / rust_mask.size) * 100
        
        # Texture analysis using edge detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        features['edge_density'] = (np.sum(edges > 0) / edges.size) * 100
        
        # Calculate variance (indicates mottled patterns)
        features['color_variance'] = np.var(gray)
        
        return features
    
    def _classify_disease(self, features):
        """
        Classify disease based on extracted features
        Returns: (disease_id, severity, confidence)
        """
        # Rule-based classification
        disease_scores = {}
        
        # Leaf Blight: High brown percentage, moderate edge density
        disease_scores['leaf_blight'] = (
            features['brown_percentage'] * 0.4 +
            features['yellow_percentage'] * 0.2 +
            features['edge_density'] * 0.3 +
            (features['dark_percentage'] * 0.1)
        )
        
        # Powdery Mildew: High white percentage, low edge density
        disease_scores['powdery_mildew'] = (
            features['white_percentage'] * 0.6 +
            (100 - features['edge_density']) * 0.2 +
            features['yellow_percentage'] * 0.2
        )
        
        # Bacterial Spot: High dark percentage, high edge density
        disease_scores['bacterial_spot'] = (
            features['dark_percentage'] * 0.5 +
            features['edge_density'] * 0.3 +
            features['brown_percentage'] * 0.2
        )
        
        # Rust: High rust/orange percentage
        disease_scores['rust'] = (
            features['rust_percentage'] * 0.6 +
            features['brown_percentage'] * 0.2 +
            features['yellow_percentage'] * 0.2
        )
        
        # Mosaic Virus: High color variance (mottled pattern)
        disease_scores['mosaic_virus'] = (
            (features['color_variance'] / 100) * 0.5 +
            features['yellow_percentage'] * 0.3 +
            features['edge_density'] * 0.2
        )
        
        # Anthracnose: Dark sunken spots
        disease_scores['anthracnose'] = (
            features['dark_percentage'] * 0.4 +
            features['brown_percentage'] * 0.3 +
            features['edge_density'] * 0.3
        )
        
        # Find disease with highest score
        if not disease_scores:
            return None, None, 0
        
        detected_disease = max(disease_scores, key=disease_scores.get)
        confidence = min(disease_scores[detected_disease], 100)
        
        # Determine severity based on affected area
        total_affected = (features['brown_percentage'] + features['yellow_percentage'] + 
                         features['white_percentage'] + features['dark_percentage'])
        
        if total_affected < 15:
            severity = 'mild'
        elif total_affected < 35:
            severity = 'moderate'
        else:
            severity = 'severe'
            
        # Check for unpredicted/healthy state
        # If total affected area is very low or confidence is too low
        if total_affected < 2 or confidence < 10:
            return {
                'disease_id': 'unpredicted',
                'disease_name': 'Unpredicted Disease / Healthy',
                'description': 'No significant disease symptoms detected. The crop appears healthy or the disease involves symptoms not currently trained in the system.',
                'severity': 'none',
                'confidence': round(confidence, 2),
                'features': features
            }
        
        # Get disease details
        disease_info = next(
            (d for d in self.disease_data['diseases'] if d['id'] == detected_disease),
            None
        )
        
        return {
            'disease_id': detected_disease,
            'disease_name': disease_info['name'] if disease_info else 'Unknown',
            'description': disease_info['description'] if disease_info else '',
            'severity': severity,
            'confidence': round(confidence, 2),
            'features': features
        }
    
    def get_disease_info(self, disease_id):
        """Get detailed information about a specific disease"""
        disease = next(
            (d for d in self.disease_data['diseases'] if d['id'] == disease_id),
            None
        )
        return disease
