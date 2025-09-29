function addAgeField() {
    const container = document.getElementById('agesContainer');
    const wrapper = document.createElement('div');
    wrapper.className = 'age-input-wrapper';
    wrapper.innerHTML = `
        <input type="number" class="age-input" value="25" min="0" max="120" required>
        <button type="button" class="remove-age" onclick="removeAge(this)">×</button>
    `;
    container.appendChild(wrapper);
}

function removeAge(button) {
    const ageInputs = document.querySelectorAll('.age-input');
    if (ageInputs.length > 1) {
        button.parentElement.remove();
    } else {
        showMessage('You must have at least one guest age', 'error');
    }
}

function showMessage(message, type = 'error') {
    const messageArea = document.getElementById('messageArea');
    const className = type === 'error' ? 'error-message' : 'success-message';
    messageArea.innerHTML = `<div class="${className}">${message}</div>`;
    setTimeout(() => {
        messageArea.innerHTML = '';
    }, 5000);
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function convertToBackendFormat(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function formatCurrency(amount) {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-NA', {
        style: 'currency',
        currency: 'NAD'
    }).format(amount);
}

document.getElementById('bookingForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const unitName = document.getElementById('unitName').value.trim();
    const arrival = document.getElementById('arrival').value;
    const departure = document.getElementById('departure').value;
    const occupants = parseInt(document.getElementById('occupants').value);

    if (!unitName || !arrival || !departure || !occupants) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }

    if (new Date(arrival) >= new Date(departure)) {
        showMessage('Departure date must be after arrival date', 'error');
        return;
    }

    const ageInputs = document.querySelectorAll('.age-input');
    const ages = Array.from(ageInputs).map(input => parseInt(input.value));

    if (ages.length !== occupants) {
        showMessage(`Please add ages for all ${occupants} guests`, 'error');
        return;
    }

    const payload = {
        "Unit Name": unitName,
        "Arrival": convertToBackendFormat(arrival),
        "Departure": convertToBackendFormat(departure),
        "Occupants": occupants,
        "Ages": ages
    };

    document.getElementById('resultsCard').classList.remove('hidden');
    document.getElementById('loading').classList.add('show');
    document.getElementById('resultsContainer').innerHTML = '';

    try {
        const response = await fetch('api/rates.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        document.getElementById('loading').classList.remove('show');

        if (data.success) {
            displayResults(data.data, unitName, arrival, departure);
            showMessage('✓ Rates retrieved successfully!', 'success');
        } else {
            document.getElementById('resultsContainer').innerHTML = `
                <div class="error-message">
                    <strong>Error:</strong> ${data.error}<br>
                    ${data.details ? `<small>${data.details}</small>` : ''}
                </div>
            `;
        }
    } catch (error) {
        document.getElementById('loading').classList.remove('show');
        document.getElementById('resultsContainer').innerHTML = `
            <div class="error-message">
                <strong>Connection Error:</strong> ${error.message}<br>
                <small>Please check if the API is running.</small>
            </div>
        `;
    }
});

function displayResults(data, unitName, arrival, departure) {
    const container = document.getElementById('resultsContainer');
    
    // Handle if data is a response object with nested structure
    let responseData = data;
    if (data.Response) {
        responseData = data.Response;
    }

    let html = '<div class="results-grid">';

    // Check if it's the actual API response structure
    if (responseData['Location ID'] || responseData['Total Charge']) {
        const totalCharge = responseData['Total Charge'] || 0;
        const extrasCharge = responseData['Extras Charge'] || 0;
        const effectiveRate = responseData['Effective Average Daily Rate'] || 0;
        const rooms = responseData['Rooms'] || 0;
        const specialRateDesc = responseData['Special Rate Description'] || 'Standard Rate';
        const guests = responseData['Guests'] || [];
        
        // Count adults and children
        const adultCount = guests.filter(g => g['Age Group'] === 'Adult').length;
        const childCount = guests.filter(g => g['Age Group'] === 'Child').length;

        html += `
            <div class="result-item">
                <h3>${unitName || 'Accommodation'}</h3>
                <div class="result-detail">
                    <span class="result-label">📅 Check-in:</span>
                    <span class="result-value">${formatDateDisplay(arrival)}</span>
                </div>
                <div class="result-detail">
                    <span class="result-label">📅 Check-out:</span>
                    <span class="result-value">${formatDateDisplay(departure)}</span>
                </div>
                <div class="result-detail">
                    <span class="result-label">👥 Guests:</span>
                    <span class="result-value">${adultCount} Adult${adultCount !== 1 ? 's' : ''}${childCount > 0 ? `, ${childCount} Child${childCount !== 1 ? 'ren' : ''}` : ''}</span>
                </div>
                <div class="result-detail">
                    <span class="result-label">🏠 Rooms:</span>
                    <span class="result-value">${rooms}</span>
                </div>
            </div>

            <div class="result-item">
                <h3>Rate Information</h3>
                <div class="result-detail">
                    <span class="result-label">📋 Rate Type:</span>
                    <span class="result-value">${specialRateDesc}</span>
                </div>
                <div class="result-detail">
                    <span class="result-label">💰 Daily Rate:</span>
                    <span class="rate-value">${formatCurrency(effectiveRate)}</span>
                </div>
                <div class="result-detail">
                    <span class="result-label">💵 Total Charge:</span>
                    <span class="rate-value">${formatCurrency(totalCharge)}</span>
                </div>
                ${extrasCharge > 0 ? `
                <div class="result-detail">
                    <span class="result-label">➕ Extras:</span>
                    <span class="result-value">${formatCurrency(extrasCharge)}</span>
                </div>
                ` : ''}
            </div>

            <div class="result-item">
                <h3>Booking Details</h3>
                <div class="result-detail">
                    <span class="result-label">✅ Status:</span>
                    <span class="result-value" style="color: #28a745; font-weight: bold;">Available</span>
                </div>
                ${responseData['Booking Group ID'] ? `
                <div class="result-detail">
                    <span class="result-label">🔖 Booking Group:</span>
                    <span class="result-value">${responseData['Booking Group ID']}</span>
                </div>
                ` : ''}
                ${responseData['Special Rate Code'] ? `
                <div class="result-detail">
                    <span class="result-label">🎫 Rate Code:</span>
                    <span class="result-value">${responseData['Special Rate Code']}</span>
                </div>
                ` : ''}
            </div>
        `;
    } else {
        // Fallback for unexpected response format
        html += `
            <div class="result-item">
                <h3>${unitName}</h3>
                <div class="result-detail">
                    <span class="result-label">📅 Date Range:</span>
                    <span class="result-value">${formatDateDisplay(arrival)} - ${formatDateDisplay(departure)}</span>
                </div>
                <div class="result-detail">
                    <span class="result-label">Response:</span>
                    <span class="result-value" style="font-size: 0.9em; word-break: break-word;">${JSON.stringify(data, null, 2)}</span>
                </div>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}