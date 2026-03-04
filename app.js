// Global state
let currentStep = 1;
let detectionResult = null;
let selectedTreatmentType = null;

// DOM Elements
const imageInput = document.getElementById('imageInput');
const uploadArea = document.getElementById('uploadArea');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const analyzeBtn = document.getElementById('analyzeBtn');
const loading = document.getElementById('loading');
const resultsSection = document.getElementById('resultsSection');
const treatmentForm = document.getElementById('treatmentForm');
// organicForm removed from HTML
const inorganicForm = document.getElementById('inorganicForm');
const treatmentResults = document.getElementById('treatmentResults');

// ===================================
// STEP 1: UPLOAD & ANALYZE
// ===================================

// Upload area click handler
uploadArea.addEventListener('click', () => {
    imageInput.click();
});

// Drag and drop handlers
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

// File input change handler
imageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

// Handle file selection
function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
        showAlert('Please select an image file', 'error');
        return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;

        // Hide upload area (dashed box)
        uploadArea.style.display = 'none';

        // Show image (Big & Center by default)
        // We DO NOT add 'compact' class here anymore
        imagePreview.classList.add('active');

        // Ensure analyze button is visible
        analyzeBtn.disabled = false;

        // Optional: Scroll to preview
        imagePreview.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    reader.readAsDataURL(file);
}

// Analyze image - STEP 1 → STEP 2
analyzeBtn.addEventListener('click', async () => {
    const file = imageInput.files[0];
    if (!file) {
        showAlert('Please select an image first', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    loading.classList.add('active');
    analyzeBtn.disabled = true;

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            detectionResult = data.detection;
            // Move to Step 2: Show Results
            goToStep2(data.detection);
        } else {
            showAlert(data.error || 'Failed to analyze image', 'error');
        }
    } catch (error) {
        showAlert('Error connecting to server: ' + error.message, 'error');
    } finally {
        loading.classList.remove('active');
        analyzeBtn.disabled = false;
    }
});

// ===================================
// STEP 2: VIEW RESULTS
// ===================================

function goToStep2(detection) {
    currentStep = 2;

    // PURE PAGE TRANSITION: Hide entire Step 1 (Upload Section & Image)
    document.querySelector('.upload-section').style.display = 'none';

    // Also hide image preview element to be safe
    imagePreview.style.display = 'none';

    // No need for compact mode anymore
    // imagePreview.classList.add('compact');

    // Display detection results
    document.getElementById('diseaseName').textContent = detection.disease_name;
    document.getElementById('diseaseDescription').textContent = detection.description;

    const severityBadge = document.getElementById('severityBadge');

    if (detection.disease_id === 'unpredicted') {
        // Handle unpredicted/healthy state
        severityBadge.textContent = 'HEALTHY / UNKNOWN';
        severityBadge.className = 'severity-badge severity-mild'; // Use mild (green) or create new class
        severityBadge.style.background = '#888'; // Grey for unknown
        severityBadge.style.color = 'white';

        // Hide treatment options since none are needed/available
        const treatmentSelection = document.querySelector('.treatment-selection');
        if (treatmentSelection) {
            treatmentSelection.style.display = 'none';
        }

        // Prompt to analyze another or check image
        document.getElementById('confidenceValue').textContent = 'N/A';

        // Add a message about why no treatment is shown
        // We might want to inject a message or just rely on the description

    } else {
        // Standard disease detection
        severityBadge.textContent = detection.severity.toUpperCase();
        severityBadge.className = `severity-badge severity-${detection.severity}`;
        severityBadge.style.background = ''; // Reset style
        severityBadge.style.color = '';

        document.getElementById('confidenceValue').textContent = `${detection.confidence}%`;

        // Show treatment options
        const treatmentSelection = document.querySelector('.treatment-selection');
        if (treatmentSelection) {
            treatmentSelection.style.display = 'block';
        }
    }

    // Show results section with treatment selection (if valid)
    resultsSection.classList.add('active');
    treatmentForm.classList.remove('active');
    treatmentResults.classList.remove('active');

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===================================
// STEP 3: SELECT TREATMENT TYPE
// ===================================

function selectTreatment(type) {
    if (currentStep !== 2) return;

    currentStep = 3;
    selectedTreatmentType = type;

    // Update UI - highlight selected option
    document.querySelectorAll('.treatment-option').forEach(option => {
        option.classList.remove('selected');
    });
    document.getElementById(`${type}Option`).classList.add('selected');

    // Hide treatment selection, prepare for Step 4
    if (type === 'organic') {
        // HIDE EVERYTHING - Show only treatment page
        resultsSection.style.display = 'none';
        imagePreview.style.display = 'none';

        goToStep4Organic();
    } else {
        // HIDE EVERYTHING - Show only treatment page
        resultsSection.style.display = 'none';
        imagePreview.style.display = 'none';

        goToStep4InorganicForm();
    }
}


// ===================================
// STEP 4: VIEW TREATMENT DETAILS
// ===================================

// STEP 4A: Organic Treatment (Direct Display)
async function goToStep4Organic() {
    currentStep = 4;

    if (!detectionResult) return;

    loading.classList.add('active');

    // Hide treatment selection
    document.querySelector('.treatment-selection').style.display = 'none';

    // Ensure results are hidden
    resultsSection.style.display = 'none';
    imagePreview.style.display = 'none';

    try {
        const response = await fetch('/api/treatment/organic', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                disease_id: detectionResult.disease_id
            })
        });

        const data = await response.json();

        if (data.error) {
            showAlert(data.error, 'error');
        } else {
            displayOrganicRecipe(data.recipe);
        }
    } catch (error) {
        showAlert('Error fetching treatment: ' + error.message, 'error');
    } finally {
        loading.classList.remove('active');
    }
}

// STEP 4B: Inorganic Treatment (Show Form First)
function goToStep4InorganicForm() {
    currentStep = 4;

    // Hide treatment selection
    document.querySelector('.treatment-selection').style.display = 'none';

    // Ensure results are hidden
    resultsSection.style.display = 'none';
    imagePreview.style.display = 'none';

    // Show inorganic form
    treatmentForm.classList.add('active');
    // organicForm removed
    inorganicForm.classList.add('active');
    treatmentResults.classList.remove('active'); // HIDE ORGANIC

    // Load chemical options
    loadChemicalOptions();

    // Scroll to form
    treatmentForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Display organic recipe
function displayOrganicRecipe(recipe) {
    // organicForm removed
    // Hide input form
    treatmentForm.classList.remove('active');
    inorganicForm.classList.remove('active');

    // Show results content
    treatmentResults.classList.add('active');

    let html = `
        <div class="recipe-section">
            <h3>📋 ${recipe.name}</h3>
        </div>
        
        <div class="recipe-section">
            <h3>🌿 Ingredients</h3>
            <ul>
                ${recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
            </ul>
        </div>
        
        <div class="recipe-section">
            <h3>🔬 Preparation Steps</h3>
            <ol>
                ${recipe.preparation.map(step => `<li>${step}</li>`).join('')}
            </ol>
        </div>
        
        <div class="recipe-section">
            <h3>💧 Application Instructions</h3>
            <ul>
                <li><strong>Method:</strong> ${recipe.application.method}</li>
                <li><strong>Frequency:</strong> ${recipe.application.frequency}</li>
                <li><strong>Timing:</strong> ${recipe.application.timing}</li>
                <li><strong>Duration:</strong> ${recipe.application.duration}</li>
            </ul>
        </div>
    `;

    document.getElementById('organicRecipe').innerHTML = html;
    treatmentResults.classList.add('active');

    // Scroll to top for clean view
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Back to treatment selection
function backToSelection() {
    currentStep = 3;

    // Hide Treatment Details
    treatmentResults.classList.remove('active');
    treatmentForm.classList.remove('active');

    // Show Results Section (Option Selection)
    resultsSection.style.display = 'block';
    document.querySelector('.treatment-selection').style.display = 'block';

    // Smooth scroll
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Load chemical options
async function loadChemicalOptions() {
    if (!detectionResult) return;

    try {
        const response = await fetch('/api/treatment/inorganic/options', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                disease_id: detectionResult.disease_id
            })
        });

        const data = await response.json();

        if (data.available_chemicals) {
            const select = document.getElementById('chemicalSelect');
            select.innerHTML = '<option value="">Select a chemical...</option>';

            data.available_chemicals.forEach(chemical => {
                const option = document.createElement('option');
                option.value = chemical.name;
                option.textContent = `${chemical.name} (${chemical.concentration})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        showAlert('Error loading chemicals: ' + error.message, 'error');
    }
}

// Calculate inorganic dosage - Final step in inorganic flow
document.getElementById('calculateBtn').addEventListener('click', async () => {
    const chemicalName = document.getElementById('chemicalSelect').value;
    const motorCapacity = document.getElementById('motorCapacity').value;
    const waterAmount = document.getElementById('waterAmount').value;

    if (!chemicalName || !motorCapacity) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    loading.classList.add('active');

    try {
        const response = await fetch('/api/treatment/inorganic/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                disease_id: detectionResult.disease_id,
                chemical_name: chemicalName,
                motor_capacity: parseFloat(motorCapacity),
                water_amount: waterAmount ? parseFloat(waterAmount) : null
            })
        });

        const data = await response.json();

        if (data.error) {
            showAlert(data.error, 'error');
        } else {
            displayInorganicDosage(data);
        }
    } catch (error) {
        showAlert('Error calculating dosage: ' + error.message, 'error');
    } finally {
        loading.classList.remove('active');
    }
});

// Display inorganic dosage
function displayInorganicDosage(data) {
    const mixing = data.mixing_instructions;
    const chemical = data.chemical_details;

    let html = `
        <div class="dosage-info">
            <h3>⚗️ Chemical Details</h3>
            <div class="dosage-row">
                <span class="dosage-label">Chemical Name:</span>
                <span class="dosage-value">${chemical.name}</span>
            </div>
            <div class="dosage-row">
                <span class="dosage-label">Active Ingredient:</span>
                <span class="dosage-value">${chemical.active_ingredient}</span>
            </div>
            <div class="dosage-row">
                <span class="dosage-label">Concentration:</span>
                <span class="dosage-value">${chemical.concentration}</span>
            </div>
        </div>
        
        <div class="dosage-info" style="margin-top: 1rem;">
            <h3>📊 Mixing Instructions</h3>
            <div class="dosage-row">
                <span class="dosage-label">Water Amount:</span>
                <span class="dosage-value">${mixing.water_amount} ${mixing.water_unit}</span>
            </div>
            <div class="dosage-row">
                <span class="dosage-label">Chemical Amount:</span>
                <span class="dosage-value">${mixing.chemical_amount} ${mixing.chemical_unit}</span>
            </div>
            <div class="dosage-row">
                <span class="dosage-label">Mixing Ratio:</span>
                <span class="dosage-value">${mixing.mixing_ratio}</span>
            </div>
            <div class="dosage-row">
                <span class="dosage-label">Motor Capacity:</span>
                <span class="dosage-value">${data.motor_capacity} liters</span>
            </div>
            <div class="dosage-row">
                <span class="dosage-label">Remaining Capacity:</span>
                <span class="dosage-value">${mixing.remaining_capacity} liters</span>
            </div>
        </div>
        
        <div class="recipe-section" style="margin-top: 1rem;">
            <h3>📝 Application Steps</h3>
            <ol>
                ${data.application_steps.map(step => `<li>${step}</li>`).join('')}
            </ol>
        </div>
        
        <div class="recipe-section" style="margin-top: 1rem;">
            <h3>⚠️ Safety Precautions</h3>
            <ul>
                ${data.safety_precautions.map(precaution => `<li>${precaution}</li>`).join('')}
            </ul>
        </div>
        
    `;

    document.getElementById('inorganicDosage').innerHTML = html;

    // Clear organic results to prevent overlap
    document.getElementById('organicRecipe').innerHTML = '';

    // Hide input form and show results
    treatmentForm.classList.remove('active');
    treatmentResults.classList.add('active');

    // Scroll to results
    treatmentResults.scrollIntoView({ behavior: 'smooth' });
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

// Show alert message
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} `;
    alertDiv.textContent = message;

    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Reset application - Back to Step 1
function resetApp() {
    currentStep = 1;
    detectionResult = null;
    selectedTreatmentType = null;

    // Reset form
    imageInput.value = '';
    imagePreview.classList.remove('active');
    imagePreview.classList.remove('compact');
    imagePreview.classList.remove('compact-center');
    imagePreview.style.display = 'block'; // Show it again
    analyzeBtn.disabled = true;

    // Show upload area again
    uploadArea.style.display = 'block';
    const uploadTitle = document.querySelector('.upload-section h2');
    if (uploadTitle) {
        uploadTitle.style.display = 'block';
    }

    // Restore upload section styles
    const uploadSection = document.querySelector('.upload-section');
    uploadSection.style.background = '';
    uploadSection.style.boxShadow = '';
    uploadSection.style.border = '';
    uploadSection.style.padding = '';

    // Show Step 1
    document.querySelector('.upload-section').style.display = 'block';

    // Hide all other steps and restore display
    resultsSection.classList.remove('active');
    resultsSection.style.display = 'block'; // Restore display property
    treatmentForm.classList.remove('active');
    treatmentResults.classList.remove('active');

    // Reset treatment selection visibility
    const treatmentSelection = document.querySelector('.treatment-selection');
    if (treatmentSelection) {
        treatmentSelection.style.display = 'block';
    }

    // Remove selection from treatment options
    document.querySelectorAll('.treatment-option').forEach(option => {
        option.classList.remove('selected');
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
