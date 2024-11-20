function updateChatInterface(columns) {
    // Get the chat input container
    const chatContainer = document.querySelector('.right');
    
    // Remove the existing chat input
    const existingInput = chatContainer.querySelector('.input');
    if (existingInput) {
        existingInput.remove();
    }
    
    // Create input fields for each selected column
    const inputsHTML = columns.map(column => `
        <div class="input-group">
            <label>${column}:</label>
            <input type="text" id="input-${column}" placeholder="Enter value for ${column}">
        </div>
    `).join('');
    
    // Create a container for the inputs and get recommendations button
    const formHTML = `
        <div class="recommendation-form">
            <h3>Enter Values for Recommendations</h3>
            ${inputsHTML}
            <button class="get-recommendations-btn">Get Recommendations</button>
            <div class="recommendations-result"></div>
        </div>
    `;
    
    // Add the form to the chat container
    chatContainer.innerHTML = `
        <div class="section-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Get Recommendations</span>
            <div class="auth-container">
                <div id="g_id_onload"
                     data-client_id="747388287702-skk8sfj2t5n7f8nma5qokgvqgslt3igt.apps.googleusercontent.com"
                     data-callback="handleCredentialResponse">
                </div>
                <div class="g_id_signin" data-type="standard"></div>
                <img src="/static/images/logo.png" alt="Logo" class="logo" id="userAvatar" style="display: none;">
            </div>
        </div>
        ${formHTML}
    `;
    
    // Add event listener to the new Get Recommendations button
    const getRecommendationsBtn = chatContainer.querySelector('.get-recommendations-btn');
    getRecommendationsBtn.addEventListener('click', function() {
        const inputs = {};
        columns.forEach(column => {
            inputs[column] = document.getElementById(`input-${column}`).value;
        });
        
        getRecommendations(inputs);
    });
}

function updateDropZoneUI(fileName) {
    const dropZone = document.getElementById('drop-zone');
    dropZone.innerHTML = `
        <div class="drop-zone-content">
            <div class="icon">📁</div>
            <p class="file-name">${fileName}</p>
            <p class="reupload-hint">Click to upload a different file</p>
        </div>
    `;

    // Add click event listener to the drop zone after updating its content
    dropZone.addEventListener('click', () => {
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.click();
        }
    });
}



//UI Elements
// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const checkboxContainer = document.getElementById('checkbox-container');
const themeToggle = document.querySelector('.theme-toggle');

// Theme Management
document.addEventListener('DOMContentLoaded', initializeTheme);

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const svg = themeToggle.querySelector('svg');
    if (theme === 'dark') {
        svg.innerHTML = `
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        `;
    } else {
        svg.innerHTML = `
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        `;
    }
}

// File Upload Handling
function initializeFileUpload() {
    // Ensure fileInput exists and add event listener
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);
}

function handleFileSelect(event) {
    handleFileUpload(event);
}

function handleFileUpload(event) {
    console.log('File upload started'); // Debug
    const file = event.target.files[0];
    
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
        console.log('Valid CSV file detected:', file.name); // Debug
        
        // Show loading state in visualization container
        const vizContainer = document.querySelector('.visualization-container');
        if (vizContainer) {
            vizContainer.innerHTML = '<div class="loading">Loading visualizations...</div>';
        }

        const formData = new FormData();
        formData.append('file', file);
        
        fetch('http://127.0.0.1:5000/upload-data', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('Upload response status:', response.status); // Debug
            return response.json();
        })
        .then(data => {
            console.log('Upload response data:', data); // Debug
            
            if (data.success) {
                console.log('File uploaded successfully, session ID:', data.session_id);
                updateDropZoneUI(file.name);
                
                // Store session ID in both window and localStorage
                window.currentSessionId = data.session_id;
                localStorage.setItem('currentSessionId', data.session_id);
                
                // Immediately request visualizations
                console.log('Requesting visualizations for session:', data.session_id); // Debug
                displayVisualizations(data.session_id);
                
                // Update column checkboxes
                if (data.columns) {
                    populateCheckboxes(data.columns);
                }
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        })
        .catch(error => {
            console.error('Error during file upload:', error);
            if (vizContainer) {
                vizContainer.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            }
        });
    } else {
        console.error('Invalid file type');
        alert('Please upload a valid CSV file');
    }
}

function updateDropZoneUI(fileName) {
    dropZone.innerHTML = `
        <div class="drop-zone-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="csv-icon">
                <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM9 14v2h6v-2H9zM9 10v2h6V10H9z"></path>
            </svg>
            <p class="file-name">${fileName}</p>
            <p class="reupload-hint"></p>
        </div>
    `;

    // Add click event listener to the drop zone after updating its content
    const dropZoneContent = dropZone.querySelector('.drop-zone-content');
    dropZoneContent.style.cursor = 'pointer';
    
    dropZoneContent.addEventListener('click', () => {
        if (fileInput) {
            fileInput.click();
        }
    });
}

// CSV Processing
function getCSVHeaders(csvData) {
    const lines = csvData.split('\n');
    if (lines.length > 0) {
        return lines[0].split(',').map(header => header.trim());
    }
    return [];
}

function populateCheckboxes(headers) {
    // Clear both input and output containers
    const inputCheckboxContainer = document.getElementById('input-checkbox-container');
    const outputCheckboxContainer = document.getElementById('output-checkbox-container');
    inputCheckboxContainer.innerHTML = '';
    outputCheckboxContainer.innerHTML = '';

    headers.forEach(header => {
        if (header) {
            // Create checkbox for input variables
            const inputCheckbox = document.createElement('input');
            inputCheckbox.type = 'checkbox';
            inputCheckbox.value = header;
            inputCheckbox.id = `input-checkbox-${header}`;

            const inputLabel = document.createElement('label');
            inputLabel.htmlFor = `input-checkbox-${header}`;
            inputLabel.textContent = header;

            const inputWrapper = document.createElement('div');
            inputWrapper.className = 'checkbox-wrapper';
            inputWrapper.appendChild(inputCheckbox);
            inputWrapper.appendChild(inputLabel);
            inputCheckboxContainer.appendChild(inputWrapper);

            // Create radio button for output variables
            const outputRadio = document.createElement('input');
            outputRadio.type = 'radio';
            outputRadio.name = 'output-variable'; // Same name makes them mutually exclusive
            outputRadio.value = header;
            outputRadio.id = `output-radio-${header}`;

            const outputLabel = document.createElement('label');
            outputLabel.htmlFor = `output-radio-${header}`;
            outputLabel.textContent = header;

            const outputWrapper = document.createElement('div');
            outputWrapper.className = 'radio-wrapper';
            outputWrapper.appendChild(outputRadio);
            outputWrapper.appendChild(outputLabel);
            outputCheckboxContainer.appendChild(outputWrapper);
        }
    });

    // Add event listener to prevent selecting same variable as both input and output
    const allInputCheckboxes = inputCheckboxContainer.querySelectorAll('input[type="checkbox"]');
    const allOutputRadios = outputCheckboxContainer.querySelectorAll('input[type="radio"]');

    allInputCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const correspondingRadio = document.querySelector(`#output-radio-${this.value}`);
            if (this.checked && correspondingRadio.checked) {
                correspondingRadio.checked = false;
            }
        });
    });

    allOutputRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                const correspondingCheckbox = document.querySelector(`#input-checkbox-${this.value}`);
                if (correspondingCheckbox.checked) {
                    correspondingCheckbox.checked = false;
                }
            }
        });
    });
}

// Drag and Drop Utilities
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    dropZone.classList.add('highlight');
}

function unhighlight(e) {
    dropZone.classList.remove('highlight');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFileUpload({ target: { files } });
}

// Tab Switching
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const uploadSections = document.querySelectorAll('.upload-section');

    // Hide all sections except the first one
    uploadSections.forEach((section, index) => {
        if (index !== 0) {
            section.style.display = 'none';
        }
    });
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Hide all sections
            uploadSections.forEach(section => {
                section.style.display = 'none';
            });
            
            // Show the selected section
            const tabName = button.getAttribute('data-tab');
            const targetSection = document.getElementById(`${tabName}-upload`);
            if (targetSection) {
                targetSection.style.display = 'block';
            }
            
            console.log(`Switching to tab: ${tabName}`); // Debug log
        });
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing application...'); // Debug log
    
    initializeTheme();
    initializeFileUpload();
    initializeTabs();
    
    // Add compile button event listener
    const compileButton = document.getElementById('file-compile-btn');
    if (compileButton) {
        console.log('Found compile button, adding event listener...'); // Debug log
        compileButton.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent any default behavior
            console.log('Compile button clicked!'); // Debug log
            handleCompileModel();
        });
    } else {
        console.error('Compile button not found!');
    }
});

function handleKaggleImport() {
    const username = document.querySelector('.kaggle-input[placeholder="Enter your Kaggle username"]').value.trim();
    const apiKey = document.querySelector('.kaggle-input[placeholder="Enter your Kaggle API key"]').value.trim();
    const datasetPath = document.querySelector('.kaggle-input[placeholder="username/dataset-name"]').value.trim();

    // Validate inputs
    if (!username || !apiKey || !datasetPath) {
        alert('Please fill in all fields');
        return;
    }

    // Validate dataset path format
    if (!datasetPath.includes('/')) {
        alert('Dataset path should be in format: username/dataset-name');
        return;
    }

    // Show loading state
    const submitButton = document.querySelector('.kaggle-submit');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Importing...';
    submitButton.disabled = true;

    // Update UI to show processing state
    const form = document.querySelector('.kaggle-form');
    form.classList.add('processing');

    fetch('http://127.0.0.1:5000/kaggle-import', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            kaggleJson: {
                username: username,
                key: apiKey
            },
            datasetPath: datasetPath
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Update UI with success state
            alert(data.message);
            
            // Populate checkboxes with dataset columns
            if (data.headers) {
                populateCheckboxes(data.headers);
            }

            // Update the file upload zone to show the imported dataset
            updateDropZoneUI(data.filename || datasetPath.split('/')[1]);
            
            // Switch back to file view
            const fileTab = document.querySelector('[data-tab="file"]');
            if (fileTab) {
                fileTab.click();
            }
        } else {
            throw new Error(data.error || 'Failed to import dataset');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert(`Failed to import dataset: ${error.message}`);
    })
    .finally(() => {
        // Reset UI state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        form.classList.remove('processing');
    });
}

// Add these functions at the top of your file
function handleCredentialResponse(response) {
    // Decode the JWT token
    const responsePayload = decodeJwtResponse(response.credential);
    
    // Hide sign-in button and show user avatar
    document.querySelector('.g_id_signin').style.display = 'none';
    const userAvatar = document.getElementById('userAvatar');
    userAvatar.src = responsePayload.picture;
    userAvatar.style.display = 'block';
    
    // You can store the user info or send it to your backend
    console.log("ID: " + responsePayload.sub);
    console.log('Full Name: ' + responsePayload.name);
    console.log('Email: ' + responsePayload.email);
}

function decodeJwtResponse(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Add this function to handle model compilation
function handleCompileModel() {
    // Add immediate feedback
    const compileButton = document.getElementById('file-compile-btn');
    const originalText = compileButton.textContent;
    compileButton.textContent = 'Compiling...';
    compileButton.disabled = true;

    console.log('handleCompileModel function called');

    // Get the session ID from window or localStorage
    const sessionId = window.currentSessionId || localStorage.getItem('currentSessionId');
    console.log('Current session ID:', sessionId);

    if (!sessionId) {
        console.error('No session ID found');
        alert('Please upload a dataset first');
        compileButton.textContent = originalText;
        compileButton.disabled = false;
        return;
    }

    // Get selected model type
    const modelSelect = document.getElementById('file-model-select');
    if (!modelSelect) {
        console.error('Model select element not found!');
        return;
    }

    const selectedModel = modelSelect.value.toLowerCase().split(' ')[0];
    console.log('Selected model:', selectedModel);

    // Get selected input columns
    const inputCheckboxes = document.querySelectorAll('#input-checkbox-container input[type="checkbox"]:checked');
    const selectedInputs = Array.from(inputCheckboxes).map(checkbox => checkbox.value);
    
    // Get selected output column
    const selectedOutputElement = document.querySelector('#output-checkbox-container input[type="radio"]:checked');
    const selectedOutput = selectedOutputElement?.value;

    // Validation
    if (!selectedModel || selectedInputs.length === 0 || !selectedOutput) {
        alert('Please select model type, input variables, and output variable');
        compileButton.textContent = originalText;
        compileButton.disabled = false;
        return;
    }

    // Prepare data for backend
    const data = {
        session_id: sessionId,  // Include the session ID
        system_type: selectedModel,
        columns: [...selectedInputs, selectedOutput]
    };
    
    console.log('Sending compilation request with data:', data);

    fetch('http://127.0.0.1:5000/compile-model', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        console.log('Received response:', response);
        return response.json();
    })
    .then(data => {
        console.log('Parsed response data:', data);
        if (data.success) {
            console.log('Model compiled successfully:', data);
            
            // Show export button after successful compilation
            const exportButton = document.getElementById('export-model-btn');
            if (exportButton) {
                exportButton.style.display = 'block';
            }
            
            // Store model configuration for export
            window.modelConfig = {
                system_type: selectedModel,
                input_columns: selectedInputs,
                output_column: selectedOutput
            };
            
            // Store session ID in both window and localStorage
            window.currentSessionId = data.session_id;
            localStorage.setItem('currentSessionId', data.session_id);
            
            alert('Model compiled successfully!');
            
            // Update the advanced search form with selected input variables
            updateAdvancedSearchForm(selectedInputs);
        } else {
            console.error('Compilation failed:', data.error);
            alert(`Compilation failed: ${data.error}`);
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
        alert('Error during compilation. Check console for details.');
    })
    .finally(() => {
        compileButton.textContent = originalText;
        compileButton.disabled = false;
    });
}

function updateAdvancedSearchForm(selectedInputs) {
    const variableInputs = document.querySelector('#advanced-search .variable-inputs');
    
    // Clear existing inputs
    variableInputs.innerHTML = '';
    
    // Create input fields for each selected input variable
    selectedInputs.forEach(variable => {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group';
        inputGroup.innerHTML = `
            <label>${variable}</label>
            <input type="text" placeholder="Enter value for ${variable}">
        `;
        variableInputs.appendChild(inputGroup);
    });
    
    // Add the Get Advanced Recommendations button
    const button = document.createElement('button');
    button.className = 'get-recommendations-btn';
    button.textContent = 'Get Advanced Recommendations';
    variableInputs.appendChild(button);
}

// Add event listener with debugging
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded'); // Debug Step 13
    
    const compileButton = document.getElementById('file-compile-btn');
    console.log('Compile button element:', compileButton); // Debug Step 14
    
    if (compileButton) {
        console.log('Adding click event listener to compile button'); // Debug Step 15
        compileButton.addEventListener('click', () => {
            console.log('Compile button clicked'); // Debug Step 16
            handleCompileModel();
        });
    } else {
        console.error('Compile button not found in DOM');
    }
});

// Add this to your script.js file
document.addEventListener('DOMContentLoaded', function() {
    // Recommendation tabs
    const recommendationTabs = document.querySelectorAll('.recommendation-form .tab-btn');
    recommendationTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            recommendationTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Show corresponding content
            const tabType = tab.getAttribute('data-tab');
            document.getElementById('direct-search').style.display = 
                tabType === 'direct' ? 'block' : 'none';
            document.getElementById('advanced-search').style.display = 
                tabType === 'advanced' ? 'block' : 'none';
        });
    });

    // Visualization tabs
    const vizTabs = document.querySelectorAll('.viz-tab');
    vizTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            vizTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            // Add logic to switch between different visualizations
        });
    });
});

function displayVisualizations(sessionId) {
    console.log('Attempting to display visualizations for session:', sessionId);

    const graphsGrid = document.querySelector('.graphs-grid');
    if (!graphsGrid) {
        console.error('Graphs grid container not found!');
        return;
    }

    // Show loading state
    graphsGrid.innerHTML = `
        <div class="graph-container">
            <div class="graph-loading">
                <div class="graph-loading-spinner"></div>
                <p>Generating visualizations...</p>
            </div>
        </div>
    `;

    fetch('http://127.0.0.1:5000/get-visualizations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Create tab content
            const distributionTab = `
                <div class="graph-container" id="distribution-content">
              
                    <img src="data:image/png;base64,${data.visualizations.distribution}" alt="Distribution Plot" class="graph-image">
                </div>
            `;

            const correlationTab = `
                <div class="graph-container" id="correlation-content">
                    
                    <img src="data:image/png;base64,${data.visualizations.correlation}" alt="Correlation Plot" class="graph-image">
                </div>
            `;

            const featuresTab = `
                <div class="graph-container" id="features-content">
                    <img src="data:image/png;base64,${data.visualizations.missing_data}" alt="Missing Data Plot" class="graph-image">
                    <img src="data:image/png;base64,${data.visualizations.trends}" alt="Trends Plot" class="graph-image">
                </div>
            `;

            // Store tab contents
            window.tabContents = {
                'distribution': distributionTab,
                'correlation': correlationTab,
                'features': featuresTab
            };

            // Show initial tab (distribution)
            graphsGrid.innerHTML = distributionTab;

            // Add click handlers to tab buttons
            document.querySelectorAll('.viz-tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    // Remove active class from all tabs
                    document.querySelectorAll('.viz-tab').forEach(t => t.classList.remove('active'));
                    // Add active class to clicked tab
                    this.classList.add('active');
                    // Show corresponding content
                    graphsGrid.innerHTML = window.tabContents[this.dataset.viz];
                });
            });
        }
    })
    .catch(error => {
        graphsGrid.innerHTML = `
            <div class="graph-container">
                <div class="error-message">Error: ${error.message}</div>
            </div>
        `;
    });
}

function getRecommendations(inputValue) {
    console.log('Starting getRecommendations function');
    
    const sessionId = localStorage.getItem('currentSessionId');
    if (!sessionId) {
        alert('Please upload a dataset and compile the model first');
        return;
    }

    const recommendationsContainer = document.querySelector('.recommendations-container');
    const recommendationsList = document.querySelector('.recommendations-list');
    
    recommendationsContainer.style.display = 'block';
    recommendationsList.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Generating recommendations...</p>
        </div>
    `;

    // Get all input values from the form
    const inputs = {};
    const inputFields = document.querySelectorAll('.direct-search-input');
    inputFields.forEach(field => {
        inputs[field.getAttribute('data-column')] = field.value;
    });

    console.log('Sending inputs:', inputs);

    fetch('http://127.0.0.1:5000/get-recommendations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            session_id: sessionId,
            inputs: inputs,
            n_recommendations: 5
        })
    })
    .then(response => {
        console.log('Received response:', response);
        return response.json();
    })
    .then(data => {
        console.log('Received data:', data);
        if (data.success) {
            displayRecommendations(data.recommendations);
        } else {
            recommendationsList.innerHTML = `
                <div class="error-message">
                    ${data.error || 'Failed to get recommendations'}
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
        recommendationsList.innerHTML = `
            <div class="error-message">
                Error: ${error.message}
            </div>
        `;
    });
}

function displayRecommendations(recommendations) {
    const recommendationsList = document.querySelector('.recommendations-list');
    
    if (!recommendations || recommendations.length === 0) {
        recommendationsList.innerHTML = `
            <div class="no-recommendations">
                No recommendations found
            </div>
        `;
        return;
    }

    const recommendationsHTML = recommendations.map((rec, index) => `
        <div class="recommendation-item">
            <div class="recommendation-rank">${index + 1}</div>
            <div class="recommendation-content">
                <div class="recommendation-name">${rec.output_value}</div>
            </div>
        </div>
    `).join('');

    recommendationsList.innerHTML = recommendationsHTML;
}

// Add this event listener for the recommendations button
document.addEventListener('DOMContentLoaded', function() {
    const getRecommendationsBtn = document.querySelector('.get-recommendations-btn');
    if (getRecommendationsBtn) {
        getRecommendationsBtn.addEventListener('click', function() {
            console.log('Get Recommendations button clicked');
            
            // Get input value
            const inputValue = document.querySelector('.direct-search-input').value;
            console.log('Input value:', inputValue);
            
            // Get session ID
            const sessionId = localStorage.getItem('currentSessionId');
            console.log('Session ID:', sessionId);
            
            if (!sessionId) {
                console.error('No session ID found');
                alert('Please upload a dataset and compile the model first');
                return;
            }
            
            if (!inputValue) {
                console.error('No input value provided');
                alert('Please enter a search term');
                return;
            }
            
            getRecommendations(inputValue);
        });
    } else {
        console.error('Recommendations button not found');
    }
});

function compileModel() {
    console.log('Starting model compilation');
    
    const compileButton = document.querySelector('.compile-button');
    const originalText = compileButton.textContent;
    compileButton.textContent = 'Compiling...';
    compileButton.disabled = true;

    // Get selected model type and columns
    const modelType = document.querySelector('#model-type').value;
    const selectedInputs = getSelectedInputs(); // Your function to get selected inputs

    const data = {
        system_type: modelType,
        columns: selectedInputs
    };

    console.log('Compilation data:', data);

    fetch('http://127.0.0.1:5000/compile-model', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        console.log('Received response:', response);
        return response.json();
    })
    .then(data => {
        console.log('Parsed response data:', data);
        if (data.success) {
            console.log('Model compiled successfully');
            console.log('Session ID:', data.session_id);
            
            // Store the session ID
            localStorage.setItem('currentSessionId', data.session_id);
            
            // Verify storage
            const storedId = localStorage.getItem('currentSessionId');
            console.log('Verified stored session ID:', storedId);
            
            alert('Model compiled successfully!');
        } else {
            console.error('Compilation failed:', data.error);
            alert(`Compilation failed: ${data.error}`);
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
        alert('Error during compilation. Check console for details.');
    })
    .finally(() => {
        compileButton.textContent = originalText;
        compileButton.disabled = false;
    });
}

// Add this function to check if model is compiled before allowing recommendations
function checkModelCompiled() {
    const sessionId = localStorage.getItem('currentSessionId');
    if (!sessionId) {
        alert('Please upload a dataset and compile the model first');
        return false;
    }
    return true;
}

// Update the recommendations click handler
document.addEventListener('DOMContentLoaded', function() {
    const getRecommendationsBtn = document.querySelector('.get-recommendations-btn');
    if (getRecommendationsBtn) {
        getRecommendationsBtn.addEventListener('click', function() {
            console.log('Get Recommendations button clicked');
            
            if (!checkModelCompiled()) {
                return;
            }
            
            const inputValue = document.querySelector('.direct-search-input').value;
            console.log('Input value:', inputValue);
            
            if (!inputValue) {
                alert('Please enter a search term');
                return;
            }
            
            getRecommendations(inputValue);
        });
    }
});

// Add this new function for handling export
function exportModelCode() {
    const config = window.modelConfig;
    if (!config) {
        alert('Please compile the model first');
        return;
    }

    fetch('http://127.0.0.1:5000/export-model', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
    })
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'recommender_model.py';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    })
    .catch(error => {
        console.error('Export error:', error);
        alert('Error exporting model code');
    });
}

// Add event listener for export button
document.addEventListener('DOMContentLoaded', () => {
    const exportButton = document.getElementById('export-model-btn');
    if (exportButton) {
        exportButton.addEventListener('click', exportModelCode);
    }
});