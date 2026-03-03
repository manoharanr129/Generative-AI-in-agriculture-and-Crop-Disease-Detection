from flask import Flask, render_template, request, jsonify
import os
from werkzeug.utils import secure_filename
from disease_detector import DiseaseDetector
from treatment_advisor import TreatmentAdvisor

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}

# Initialize modules
detector = DiseaseDetector()
advisor = TreatmentAdvisor()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/')
def index():
    """Render main application page"""
    return render_template('index.html')

@app.route('/api/upload', methods=['POST'])
def upload_image():
    """Handle image upload and disease detection"""
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Please upload an image file.'}), 400
    
    try:
        # Save uploaded file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Detect disease
        result = detector.analyze_image(filepath)
        
        if result is None:
            return jsonify({'error': 'Failed to analyze image'}), 500
        
        return jsonify({
            'success': True,
            'detection': result
        })
    
    except Exception as e:
        return jsonify({'error': f'Error processing image: {str(e)}'}), 500

@app.route('/api/treatment/organic', methods=['POST'])
def get_organic_treatment():
    """Get organic fertilizer recipe for detected disease"""
    data = request.json
    disease_id = data.get('disease_id')
    
    if not disease_id:
        return jsonify({'error': 'Disease ID is required'}), 400
    
    treatment = advisor.get_organic_treatment(disease_id)
    return jsonify(treatment)

@app.route('/api/treatment/inorganic/options', methods=['POST'])
def get_inorganic_options():
    """Get available inorganic chemical options for disease"""
    data = request.json
    disease_id = data.get('disease_id')
    
    if not disease_id:
        return jsonify({'error': 'Disease ID is required'}), 400
    
    options = advisor.get_inorganic_options(disease_id)
    return jsonify(options)

@app.route('/api/treatment/inorganic/calculate', methods=['POST'])
def calculate_inorganic_dosage():
    """Calculate inorganic fertilizer dosage based on motor capacity"""
    data = request.json
    
    disease_id = data.get('disease_id')
    chemical_name = data.get('chemical_name')
    motor_capacity = data.get('motor_capacity')
    water_amount = data.get('water_amount')
    
    if not all([disease_id, chemical_name, motor_capacity]):
        return jsonify({
            'error': 'disease_id, chemical_name, and motor_capacity are required'
        }), 400
    
    try:
        motor_capacity = float(motor_capacity)
        if water_amount:
            water_amount = float(water_amount)
    except ValueError:
        return jsonify({'error': 'Invalid numeric values'}), 400
    
    result = advisor.calculate_inorganic_dosage(
        disease_id,
        chemical_name,
        motor_capacity,
        water_amount
    )
    
    return jsonify(result)

@app.route('/api/disease/<disease_id>')
def get_disease_info(disease_id):
    """Get detailed information about a specific disease"""
    info = detector.get_disease_info(disease_id)
    
    if info is None:
        return jsonify({'error': 'Disease not found'}), 404
    
    return jsonify(info)

if __name__ == '__main__':
    # Create upload folder if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Run the app
    app.run(debug=True, host='0.0.0.0', port=5000)
