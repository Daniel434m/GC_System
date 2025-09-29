<?php
/**
 * Helper Functions for GC System
 */

function logMessage($message, $type = 'INFO') {
    if (!ENABLE_LOGGING) return;
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[{$timestamp}] [{$type}] {$message}\n";
    file_put_contents(LOG_FILE, $logMessage, FILE_APPEND);
}

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function validatePayload($data) {
    $required = ['Unit Name', 'Arrival', 'Departure', 'Occupants', 'Ages'];
    
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            return ['valid' => false, 'message' => "Missing required field: {$field}"];
        }
    }
    
    if (!preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $data['Arrival'])) {
        return ['valid' => false, 'message' => "Invalid Arrival date format"];
    }
    
    if (!preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $data['Departure'])) {
        return ['valid' => false, 'message' => "Invalid Departure date format"];
    }
    
    if (!is_int($data['Occupants'])) {
        return ['valid' => false, 'message' => "Occupants must be an integer"];
    }
    
    if (!is_array($data['Ages'])) {
        return ['valid' => false, 'message' => "Ages must be an array"];
    }
    
    return ['valid' => true];
}

function convertDateFormat($date) {
    $parts = explode('/', $date);
    if (count($parts) === 3) {
        return $parts[2] . '-' . $parts[1] . '-' . $parts[0];
    }
    return $date;
}

function transformPayload($incomingData) {
    $unitTypeId = TEST_UNIT_IDS[0];
    $arrival = convertDateFormat($incomingData['Arrival']);
    $departure = convertDateFormat($incomingData['Departure']);
    
    $guests = [];
    foreach ($incomingData['Ages'] as $age) {
        if (is_int($age)) {
            $ageGroup = ($age >= 18) ? 'Adult' : 'Child';
            $guests[] = ['Age Group' => $ageGroup];
        }
    }
    
    return [
        'Unit Type ID' => $unitTypeId,
        'Arrival' => $arrival,
        'Departure' => $departure,
        'Guests' => $guests
    ];
}

function callRemoteApi($payload) {
    $ch = curl_init(REMOTE_API_URL);
    
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json'
        ],
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        logMessage("cURL Error: {$error}", 'ERROR');
        return [
            'success' => false,
            'error' => 'Failed to connect to remote API',
            'details' => $error
        ];
    }
    
    return [
        'success' => true,
        'http_code' => $httpCode,
        'response' => json_decode($response, true),
        'raw_response' => $response
    ];
}

?>