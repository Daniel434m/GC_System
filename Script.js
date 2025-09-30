function addAgeField() {
    const container = document.getElementById('agesContainer');
    const wrapper = document.createElement('div');
    wrapper.className = 'age-input-wrapper';
    wrapper.innerHTML = '<input type="number" class="age-input" value="25" min="0" max="120" required>' +
        '<button type="button" class="remove-age" onclick="removeAge(this)">×</button>';
    container.appendChild(wrapper);
    
    // Update occupants field to match number of age inputs
    const ageInputs = document.querySelectorAll('.age-input');
    document.getElementById('occupants').value = ageInputs.length;
    
    updateGuestCounters();
}

function removeAge(button) {
    const ageInputs = document.querySelectorAll('.age-input');
    if (ageInputs.length > 1) {
        button.parentElement.remove();
        
        // Update occupants field after removal
        const remainingInputs = document.querySelectorAll('.age-input');
        document.getElementById('occupants').value = remainingInputs.length;
        
        updateGuestCounters();
    } else {
        showMessage('You must have at least one guest age', 'error');
    }
}

function updateGuestCounters() {
    const ageInputs = document.querySelectorAll('.age-input');
    const ages = Array.from(ageInputs).map(input => parseInt(input.value) || 0);

    const adults = ages.filter(age => age >= 18).length;
    const minors = ages.filter(age => age < 18 && age > 0).length;

    document.getElementById('adultCounter').textContent = adults;
    document.getElementById('minorCounter').textContent = minors;

    const minorsList = document.getElementById('minorList');
    const minorsSection = document.getElementById('minorsSection');

    if (minors > 0) {
        const minorAges = ages.filter(age => age < 18 && age > 0);
        minorsList.innerHTML = minorAges.map(age => `<li>Age: ${age}</li>`).join('');
        minorsSection.classList.remove('hidden');
    } else {
        minorsSection.classList.add('hidden');
    }
}

document.addEventListener('input', function(e) {
    if (e.target.classList.contains('age-input')) {
        updateGuestCounters();
    }
});

document.addEventListener('input', function(e) {
    if (e.target.id === 'occupants') {
        const occupants = parseInt(e.target.value) || 0;
        const currentAgeInputs = document.querySelectorAll('.age-input').length;

        if (occupants > currentAgeInputs) {
            const toAdd = occupants - currentAgeInputs;
            for (let i = 0; i < toAdd; i++) {
                addAgeField();
            }
        } else if (occupants < currentAgeInputs && occupants > 0) {
            const toRemove = currentAgeInputs - occupants;
            const ageInputWrappers = document.querySelectorAll('.age-input-wrapper');
            for (let j = 0; j < toRemove; j++) {
                if (ageInputWrappers.length > 1) {
                    ageInputWrappers[ageInputWrappers.length - 1 - j].remove();
                }
            }
            updateGuestCounters();
        }
    }
});

function showMessage(message, type) {
    type = type || 'error';
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
    const parts = dateStr.split('-');
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    return `${day}/${month}/${year}`;
}

function formatCurrency(amount) {
    if (!amount || amount === 0) return 'N/A';
    return new Intl.NumberFormat('en-NA', {
        style: 'currency',
        currency: 'NAD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function calculateDailyRate(totalCharge, arrival, departure) {
    const startDate = new Date(arrival);
    const endDate = new Date(departure);
    const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    if (nights > 0 && totalCharge > 0) {
        return totalCharge / nights;
    }
    return 0;
}

document.getElementById('bookingForm').addEventListener('submit', function(e) {
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
        showMessage('Please add ages for all ' + occupants + ' guests', 'error');
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

    fetch('api/rates.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('loading').classList.remove('show');

        if (data.success) {
            displayResults(data.data, unitName, arrival, departure, ages);
            showMessage('✓ Rates retrieved successfully!', 'success');
        } else {
            document.getElementById('resultsContainer').innerHTML =
                `<div class="error-message">
                    <strong>Error:</strong> ${data.error}<br>
                    ${data.details ? `<small>${data.details}</small>` : ''}
                </div>`;
        }
    })
    .catch(error => {
        document.getElementById('loading').classList.remove('show');
        document.getElementById('resultsContainer').innerHTML =
            `<div class="error-message">
                <strong>Connection Error:</strong> ${error.message}<br>
                <small>Please check if the API is running.</small>
            </div>`;
    });
});

function displayResults(data, unitName, arrival, departure, inputAges) {
    const container = document.getElementById('resultsContainer');

    let responseData = data;
    if (data.Response) {
        responseData = data.Response;
    }

    let html = '<div class="results-grid">';

    if (responseData['Location ID'] || responseData['Total Charge']) {
        const totalCharge = responseData['Total Charge'] || 0;
        const extrasCharge = responseData['Extras Charge'] || 0;
        let effectiveRate = responseData['Effective Average Daily Rate'] || 0;
        const rooms = responseData['Rooms'] || 0;
        const specialRateDesc = responseData['Special Rate Description'] || 'Standard Rate';

        const adultCount = inputAges.filter(age => age >= 18).length;
        const childCount = inputAges.filter(age => age < 18).length;
        const childAges = inputAges.filter(age => age < 18);

        let dailyRate = effectiveRate;
        if (!dailyRate || dailyRate === 0) {
            dailyRate = calculateDailyRate(totalCharge, arrival, departure);
        }

        html += `<div class="result-item">
            <h3>${unitName || 'Accommodation'}</h3>
            <div class="result-detail"><span class="result-label">📅 Check-in:</span>
            <span class="result-value">${formatDateDisplay(arrival)}</span></div>
            <div class="result-detail"><span class="result-label">📅 Check-out:</span>
            <span class="result-value">${formatDateDisplay(departure)}</span></div>
            <div class="result-detail"><span class="result-label">👥 Guests:</span>
            <span class="result-value">${adultCount} Adult${adultCount !== 1 ? 's' : ''}${childCount > 0 ? `, ${childCount} Child${childCount !== 1 ? 'ren' : ''}` : ''}</span></div>`;

        if (childCount > 0) {
            html += `<div class="result-detail">
                <span class="result-label">👶 Children Ages:</span>
                <span class="result-value">${childAges.join(', ')}</span>
            </div>`;
        }

        html += `<div class="result-detail"><span class="result-label">🏠 Rooms:</span>
            <span class="result-value">${rooms}</span></div></div>
            <div class="result-item"><h3>Rate Information</h3>
            <div class="result-detail"><span class="result-label">📋 Rate Type:</span>
            <span class="result-value">${specialRateDesc}</span></div>
            <div class="result-detail"><span class="result-label">💰 Daily Rate:</span>
            <span class="rate-value">${formatCurrency(dailyRate)}</span></div>
            <div class="result-detail"><span class="result-label">💵 Total Charge:</span>
            <span class="rate-value">${formatCurrency(totalCharge)}</span></div>`;

        if (extrasCharge > 0) {
            html += `<div class="result-detail">
                <span class="result-label">➕ Extras:</span>
                <span class="result-value">${formatCurrency(extrasCharge)}</span>
            </div>`;
        }

        html += `</div>
            <div class="result-item"><h3>Booking Details</h3>
            <div class="result-detail"><span class="result-label">✅ Status:</span>
            <span class="result-value" style="color: #28a745; font-weight: bold;">Available</span></div>`;

        if (responseData['Booking Group ID']) {
            html += `<div class="result-detail"><span class="result-label">🔖 Booking Group:</span>
                <span class="result-value">${responseData['Booking Group ID']}</span></div>`;
        }

        if (responseData['Special Rate Code']) {
            html += `<div class="result-detail"><span class="result-label">🎫 Rate Code:</span>
                <span class="result-value">${responseData['Special Rate Code']}</span></div>`;
        }

        html += '</div>';
    } else {
        html += `<div class="result-item">
            <h3>${unitName}</h3>
            <div class="result-detail"><span class="result-label">📅 Date Range:</span>
            <span class="result-value">${formatDateDisplay(arrival)} - ${formatDateDisplay(departure)}</span></div>
            <div class="result-detail"><span class="result-label">Response:</span>
            <span class="result-value" style="font-size: 0.9em; word-break: break-word;">${JSON.stringify(data, null, 2)}</span></div>
        </div>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
    updateGuestCounters();
});

// Hero Carousel
(function() {
    const slides = document.querySelectorAll('.hero-slide');
    let currentSlide = 0;
    let slideInterval;

    function nextSlide() {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }

    function startCarousel() {
        slideInterval = setInterval(nextSlide, 5000);
    }

    function stopCarousel() {
        clearInterval(slideInterval);
    }

    // Start carousel
    startCarousel();

    // Pause on hover (optional)
    const carousel = document.getElementById('heroCarousel');
    carousel.addEventListener('mouseenter', stopCarousel);
    carousel.addEventListener('mouseleave', startCarousel);
})();