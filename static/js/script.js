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