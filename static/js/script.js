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
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    if (!dropZone || !fileInput) return;

    // Remove existing event listeners
    dropZone.removeEventListener('drop', handleDrop);
    dropZone.removeEventListener('click', handleDropZoneClick);

    // Add click event listener
    dropZone.addEventListener('click', handleDropZoneClick);

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Handle drag and drop events
    dropZone.addEventListener('dragenter', highlight, false);
    dropZone.addEventListener('dragover', highlight, false);
    dropZone.addEventListener('dragleave', unhighlight, false);
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

function populateCheckboxes(columns) {
    console.log('Populating checkboxes with columns:', columns);
    
    const inputContainer = document.getElementById('input-checkbox-container');
    const outputContainer = document.getElementById('output-checkbox-container');
    const modelSelect = document.getElementById('file-model-select');
    const selectedModel = modelSelect.value.toLowerCase().split(' ')[0];
    
    if (!inputContainer || !outputContainer) {
        console.error('Containers not found');
        return;
    }
    
    // Clear existing checkboxes
    inputContainer.innerHTML = '';
    outputContainer.innerHTML = '';
    
    try {
        if (selectedModel === 'collaborative') {
            // For collaborative filtering, create three sections:
            // 1. User ID selection
            // 2. Item ID selection
            // 3. Rating selection (must be numeric)
            
            inputContainer.innerHTML = `
                <div class="column-section">
                    <h4>Select User ID Column:</h4>
                    <div class="checkbox-group user-id"></div>
                </div>
                <div class="column-section">
                    <h4>Select Item ID Column:</h4>
                    <div class="checkbox-group item-id"></div>
                </div>
            `;
            
            outputContainer.innerHTML = `
                <div class="column-section">
                    <h4>Select Rating Column (must be numeric):</h4>
                    <div class="checkbox-group rating"></div>
                </div>
            `;
            
            // Helper function to identify likely numeric columns
            const isLikelyNumeric = (columnName) => {
                const numericPatterns = ['rating', 'score', 'rank', 'stars', 'value'];
                return numericPatterns.some(pattern => 
                    columnName.toLowerCase().includes(pattern)
                );
            };
            
            // Helper function to identify likely ID columns
            const isLikelyId = (columnName) => {
                const idPatterns = ['id', 'code', 'key', 'number'];
                return idPatterns.some(pattern => 
                    columnName.toLowerCase().includes(pattern)
                );
            };
            
            Object.entries(columns).forEach(([filename, fileColumns]) => {
                fileColumns.forEach(column => {
                    // Create checkbox/radio elements
                    const userIdElement = document.createElement('div');
                    const itemIdElement = document.createElement('div');
                    const ratingElement = document.createElement('div');
                    
                    userIdElement.className = 'checkbox-wrapper';
                    itemIdElement.className = 'checkbox-wrapper';
                    ratingElement.className = 'checkbox-wrapper';
                    
                    // Add checkboxes/radios with appropriate checked state based on column name
                    userIdElement.innerHTML = `
                        <input type="radio" 
                               name="user-id-column" 
                               value="${column}" 
                               data-file="${filename}"
                               ${isLikelyId(column) && column.toLowerCase().includes('user') ? 'checked' : ''}>
                        <label>${column} (${filename})</label>
                    `;
                    
                    itemIdElement.innerHTML = `
                        <input type="radio" 
                               name="item-id-column" 
                               value="${column}" 
                               data-file="${filename}"
                               ${isLikelyId(column) && column.toLowerCase().includes('item') ? 'checked' : ''}>
                        <label>${column} (${filename})</label>
                    `;
                    
                    ratingElement.innerHTML = `
                        <input type="radio" 
                               name="rating-column" 
                               value="${column}" 
                               data-file="${filename}"
                               ${isLikelyNumeric(column) ? 'checked' : ''}>
                        <label>${column} (${filename})</label>
                    `;
                    
                    // Add to appropriate container
                    inputContainer.querySelector('.user-id').appendChild(userIdElement);
                    inputContainer.querySelector('.item-id').appendChild(itemIdElement);
                    outputContainer.querySelector('.rating').appendChild(ratingElement);
                });
            });
        } else {
            // Existing content-based checkbox population code
            // ... your existing code for content-based ...
        }
    } catch (error) {
        console.error('Error while populating checkboxes:', error);
    }
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
    const sessionId = window.currentSessionId || localStorage.getItem('currentSessionId');
    const modelSelect = document.getElementById('file-model-select');
    const selectedModel = modelSelect.value.toLowerCase().split(' ')[0];
    const selectedAlgorithm = document.querySelector('input[name="algorithm"]:checked')?.value;

    if (!sessionId) {
        alert('Please upload your datasets first');
        return;
    }

    let selectedInputs = [];
    let selectedOutput = null;

    if (selectedModel === 'collaborative') {
        // Get User ID and Item ID selections
        const userIdElement = document.querySelector('input[name="user-id-column"]:checked');
        const itemIdElement = document.querySelector('input[name="item-id-column"]:checked');
        const ratingElement = document.querySelector('input[name="rating-column"]:checked');

        if (!userIdElement || !itemIdElement || !ratingElement) {
            alert('Please select User ID, Item ID, and Rating columns');
            return;
        }

        selectedInputs = [
            {
                column: userIdElement.value,
                file: userIdElement.dataset.file
            },
            {
                column: itemIdElement.value,
                file: itemIdElement.dataset.file
            }
        ];

        selectedOutput = {
            column: ratingElement.value,
            file: ratingElement.dataset.file
        };
    } else {
        // Existing content-based selection code
        const inputCheckboxes = document.querySelectorAll('#input-checkbox-container input[type="checkbox"]:checked');
        selectedInputs = Array.from(inputCheckboxes).map(checkbox => ({
            column: checkbox.value,
            file: checkbox.dataset.file
        }));

        const selectedOutputElement = document.querySelector('#output-checkbox-container input[type="radio"]:checked');
        selectedOutput = selectedOutputElement ? {
            column: selectedOutputElement.value,
            file: selectedOutputElement.dataset.file
        } : null;
    }

    if (!selectedModel || selectedInputs.length === 0 || !selectedOutput || !selectedAlgorithm) {
        alert('Please select model type, algorithm, input variables, and output variable');
        return;
    }

    const data = {
        session_id: sessionId,
        system_type: selectedModel,
        algorithm: selectedAlgorithm,
        inputs: selectedInputs,
        output: selectedOutput
    };

    console.log('Sending compilation request:', data);

    fetch('http://127.0.0.1:5000/compile-model', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Model compiled successfully!');
        } else {
            throw new Error(data.error || 'Compilation failed');
        }
    })
    .catch(error => {
        console.error('Compilation error:', error);
        alert(`Compilation failed: ${error.message}`);
    });
}

function updateAdvancedSearchForm(selectedInputs) {
    const searchContainer = document.querySelector('.advanced-search');
    const modelSelect = document.getElementById('file-model-select');
    const selectedModel = modelSelect.value.toLowerCase().split(' ')[0];

    if (!searchContainer) return;

    let formHTML = '';
    
    if (selectedModel === 'collaborative') {
        // For collaborative, we only need user ID input
        const userIdColumn = document.querySelector('input[name="user-id-column"]:checked')?.value || 'userId';
        formHTML = `
            <div class="search-form">
                <div class="input-group">
                    <label>Enter User ID:</label>
                    <input type="text" id="search-${userIdColumn}" placeholder="Enter user ID">
                </div>
                <button class="search-btn">Get Recommendations</button>
            </div>
            <div class="search-results"></div>
        `;
    } else {
        // Existing content-based search form
        formHTML = `
            <div class="search-form">
                ${selectedInputs.map(column => `
                    <div class="input-group">
                        <label>${column}:</label>
                        <input type="text" id="search-${column}" placeholder="Enter ${column}">
                    </div>
                `).join('')}
                <button class="search-btn">Get Recommendations</button>
            </div>
            <div class="search-results"></div>
        `;
    }

    searchContainer.innerHTML = formHTML;

    // Add event listener to search button
    const searchBtn = searchContainer.querySelector('.search-btn');
    searchBtn.addEventListener('click', function() {
        const inputs = {};
        
        if (selectedModel === 'collaborative') {
            // For collaborative, get only user ID
            const userIdColumn = document.querySelector('input[name="user-id-column"]:checked')?.value || 'userId';
            inputs[userIdColumn] = document.getElementById(`search-${userIdColumn}`).value;
        } else {
            // For content-based, get all inputs
            selectedInputs.forEach(column => {
                inputs[column] = document.getElementById(`search-${column}`).value;
            });
        }

        handleAdvancedSearch(inputs);
    });
}

function handleAdvancedSearch(inputs) {
    const sessionId = window.currentSessionId || localStorage.getItem('currentSessionId');
    const searchResults = document.querySelector('.search-results');
    
    if (!sessionId) {
        alert('Please upload datasets and compile model first');
        return;
    }

    searchResults.innerHTML = '<div class="loading">Getting recommendations...</div>';

    fetch('http://127.0.0.1:5000/get-recommendations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            session_id: sessionId,
            inputs: inputs
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Display recommendations
            const recommendations = data.recommendations;
            let resultsHTML = '<h3>Top Recommendations</h3>';
            
            if (recommendations.length === 0) {
                resultsHTML += '<p>No recommendations found.</p>';
            } else {
                resultsHTML += '<div class="recommendations-list">';
                recommendations.forEach((rec, index) => {
                    resultsHTML += `
                        <div class="recommendation-item">
                            <span class="rank">#${index + 1}</span>
                            <span class="item">${rec.output_value}</span>
                            <span class="score">Score: ${rec.score.toFixed(2)}</span>
                        </div>
                    `;
                });
                resultsHTML += '</div>';
            }
            
            searchResults.innerHTML = resultsHTML;
        } else {
            throw new Error(data.error || 'Failed to get recommendations');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        searchResults.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    });
}

// Add these styles to your CSS
const style = document.createElement('style');
style.textContent = `
    .recommendations-list {
        margin-top: 15px;
    }

    .recommendation-item {
        display: flex;
        align-items: center;
        padding: 10px;
        margin: 5px 0;
        background: var(--secondary-bg);
        border-radius: 5px;
    }

    .recommendation-item .rank {
        font-weight: bold;
        margin-right: 15px;
        color: var(--primary-color);
    }

    .recommendation-item .item {
        flex-grow: 1;
    }

    .recommendation-item .score {
        color: var(--text-secondary);
        margin-left: 15px;
    }

    .loading {
        text-align: center;
        padding: 20px;
        color: var(--text-secondary);
    }

    .error {
        color: #ff4444;
        padding: 10px;
        background: rgba(255, 68, 68, 0.1);
        border-radius: 5px;
    }
`;

document.head.appendChild(style);

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

// Add this function to handle model selection change
function handleModelSelectionChange() {
    const modelSelect = document.getElementById('file-model-select');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const inputContainer = document.getElementById('input-checkbox-container');
    const outputContainer = document.getElementById('output-checkbox-container');
    const compileButton = document.getElementById('file-compile-btn');
    const exportButton = document.getElementById('export-model-btn');
    
    // Clear any existing data
    if (inputContainer) inputContainer.innerHTML = '';
    if (outputContainer) outputContainer.innerHTML = '';
    if (compileButton) compileButton.disabled = false;
    if (exportButton) exportButton.style.display = 'none';
    
    // Reset file input
    if (fileInput) fileInput.value = '';
    
    if (!modelSelect.value) {
        dropZone.classList.add('disabled');
        fileInput.disabled = true;
        dropZone.innerHTML = `
            <input type="file" id="file-input" accept=".csv" style="display: none;" onchange="handleFileSelect(event)" disabled>
            <div class="icon">📁</div>
            <p>Please select a model type first</p>
        `;
        return;
    }

    dropZone.classList.remove('disabled');
    fileInput.disabled = false;

    const selectedModel = modelSelect.value.toLowerCase().split(' ')[0];
    
    if (selectedModel === 'content-based') {
        fileInput.removeAttribute('multiple');
        dropZone.innerHTML = `
            <input type="file" id="file-input" accept=".csv" style="display: none;" onchange="handleFileSelect(event)">
            <div class="icon">📁</div>
            <p>Drag and drop your CSV file here or click to browse</p>
        `;
    } else {
        fileInput.setAttribute('multiple', 'multiple');
        dropZone.innerHTML = `
            <input type="file" id="file-input" accept=".csv" multiple style="display: none;" onchange="handleMultipleFileSelect(event)">
            <div class="icon">📁</div>
            <p>Upload your CSV files:</p>
            <p class="sub-text">1. User-Item Interactions Dataset</p>
            <p class="sub-text">2. Item Features Dataset (Optional)</p>
            <p class="sub-text">3. User Features Dataset (Optional)</p>
        `;
    }
    
    // Clear any stored session data
    window.currentSessionId = null;
    localStorage.removeItem('currentSessionId');
    
    // Reinitialize file upload handlers
    initializeFileUpload();
}

// Add event listener for model selection
document.addEventListener('DOMContentLoaded', () => {
    const modelSelect = document.getElementById('file-model-select');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    
    if (modelSelect) {
        // Initially disable drop zone
        dropZone.classList.add('disabled');
        fileInput.disabled = true;
        
        modelSelect.addEventListener('change', handleModelSelectionChange);
    }
});

// Handle multiple file selection
function handleMultipleFileSelect(event) {
    const files = event.target.files;
    if (!files || files.length < 2) {
        alert('Please select at least 2 CSV files');
        return;
    }

    const formData = new FormData();
    Array.from(files).forEach((file, index) => {
        formData.append(`file${index}`, file);
    });

    fetch('http://127.0.0.1:5000/upload-multiple', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Store session ID both in window and localStorage
            window.currentSessionId = data.session_id;
            localStorage.setItem('currentSessionId', data.session_id);
            
            console.log('Files uploaded successfully. Session ID:', data.session_id);
            
            // Update UI to show success
            updateDropZoneUI(Array.from(files).map(f => f.name).join(', '));
            
            // Populate checkboxes with columns from all files
            if (data.columns) {
                populateCheckboxes(data.columns);
            }
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    })
    .catch(error => {
        console.error('Upload error:', error);
        alert(`Upload failed: ${error.message}`);
    });
}

// Add this function to handle multiple file upload
function uploadMultipleFiles(formData) {
    fetch('http://127.0.0.1:5000/upload-multiple', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.currentSessionId = data.session_id;
            localStorage.setItem('currentSessionId', data.session_id);
            
            // Update checkboxes for all datasets
            if (data.columns) {
                populateMultipleDatasetCheckboxes(data.columns);
            }
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert(`Upload failed: ${error.message}`);
    });
}

// Add helper functions
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    const dropZone = document.getElementById('drop-zone');
    if (dropZone.classList.contains('active')) {
        dropZone.classList.add('drag-over');
    }
}

function unhighlight(e) {
    const dropZone = document.getElementById('drop-zone');
    dropZone.classList.remove('drag-over');
}

function handleDropZoneClick(e) {
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    
    // Only proceed if drop zone is not disabled
    if (!dropZone.classList.contains('disabled') && fileInput) {
        fileInput.click();
    }
}

function handleDrop(e) {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    
    if (!dropZone.classList.contains('active')) {
        return;
    }

    const dt = e.dataTransfer;
    const files = dt.files;

    if (fileInput.multiple) {
        handleMultipleFileSelect({ target: { files: files } });
    } else {
        handleFileSelect({ target: { files: [files[0]] } });
    }
}

function populateMultipleDatasetCheckboxes(columnsData) {
    const inputContainer = document.getElementById('input-checkbox-container');
    const outputContainer = document.getElementById('output-checkbox-container');
    
    if (!inputContainer || !outputContainer) {
        console.error('Checkbox containers not found');
        return;
    }
    
    // Clear existing checkboxes
    inputContainer.innerHTML = '';
    outputContainer.innerHTML = '';
    
    // Combine all columns from all files
    let allColumns = [];
    Object.entries(columnsData).forEach(([filename, columns]) => {
        columns.forEach(column => {
            // Add filename prefix to avoid duplicate column names
            allColumns.push({
                name: column,
                file: filename
            });
        });
    });
    
    // Create input checkboxes
    allColumns.forEach(column => {
        const wrapper = document.createElement('div');
        wrapper.className = 'checkbox-wrapper';
        wrapper.innerHTML = `
            <input type="checkbox" 
                   id="input-${column.file}-${column.name}" 
                   name="input-columns" 
                   value="${column.name}"
                   data-file="${column.file}">
            <label for="input-${column.file}-${column.name}">
                ${column.name} (${column.file})
            </label>
        `;
        inputContainer.appendChild(wrapper);
    });
    
    // Create output radio buttons
    allColumns.forEach(column => {
        const wrapper = document.createElement('div');
        wrapper.className = 'checkbox-wrapper';
        wrapper.innerHTML = `
            <input type="radio" 
                   id="output-${column.file}-${column.name}" 
                   name="output-column" 
                   value="${column.name}"
                   data-file="${column.file}">
            <label for="output-${column.file}-${column.name}">
                ${column.name} (${column.file})
            </label>
        `;
        outputContainer.appendChild(wrapper);
    });
}

// Add this to your existing JavaScript
const algorithmOptions = {
    'Content-based Model': ['TF-IDF', 'Word Embedding', 'Topic Modelling'],
    'Hybrid Model': ['SVD', 'Item-KNN', 'Neural CF'],
    'Collaborative Model': ['SVD', 'Item-KNN', 'Neural CF']
};

function updateAlgorithmOptions(modelType) {
    const algorithmSection = document.getElementById('algorithm-selection');
    const radioOptions = algorithmSection.querySelector('.radio-options');
    
    if (!modelType || modelType === "") {
        algorithmSection.style.display = 'none';
        return;
    }

    // Clear existing options
    radioOptions.innerHTML = '';
    
    // Get the appropriate options for the selected model
    const options = algorithmOptions[modelType] || [];
    
    // Create radio buttons for each option
    options.forEach((option, index) => {
        const radioOption = document.createElement('div');
        radioOption.className = 'radio-option';
        radioOption.innerHTML = `
            <input type="radio" 
                   id="algorithm-${index}" 
                   name="algorithm" 
                   value="${option}"
                   ${index === 0 ? 'checked' : ''}>
            <label for="algorithm-${index}">${option}</label>
        `;
        radioOptions.appendChild(radioOption);
    });

    // Show the algorithm selection section
    algorithmSection.style.display = 'block';
}

// Add event listeners for both file and kaggle model selects
document.getElementById('file-model-select').addEventListener('change', (e) => {
    updateAlgorithmOptions(e.target.value);
});

document.getElementById('kaggle-model-select').addEventListener('change', (e) => {
    updateAlgorithmOptions(e.target.value);
});