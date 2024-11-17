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
    const file = event.target.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const csvData = e.target.result;
            const headers = getCSVHeaders(csvData);
            populateCheckboxes(headers);
            
            updateDropZoneUI(file.name);
        };
        reader.readAsText(file);
    } else if (file) {
        alert("Please upload a valid CSV file.");
        fileInput.value = '';
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
    checkboxContainer.innerHTML = '';
    headers.forEach(header => {
        if (header) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = header;
            checkbox.id = `checkbox-${header}`;

            const label = document.createElement('label');
            label.htmlFor = `checkbox-${header}`;
            label.textContent = header;

            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(label);
        }
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
    initializeTheme();
    initializeFileUpload();
    initializeTabs();
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