<?php
/**
 * GC System - Rates API Endpoint
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit;
}

require_once __DIR__ . '/../config/settings.php';
require_once __DIR__ . '/../includes/functions.php';

logMessage('New API request received', 'INFO');

try {
    $rawInput = file_get_contents('php://input');
    logMessage("Raw input: {$rawInput}", 'DEBUG');
    
    $incomingData = json_decode($rawInput, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        logMessage('Invalid JSON: ' . json_last_error_msg(), 'ERROR');
        sendJsonResponse([
            'success' => false,
            'error' => 'Invalid JSON format',
            'details' => json_last_error_msg()
        ], 400);
    }
    
    $validation = validatePayload($incomingData);
    if (!$validation['valid']) {
        logMessage('Validation failed: ' . $validation['message'], 'ERROR');
        sendJsonResponse([
            'success' => false,
            'error' => 'Validation failed',
            'details' => $validation['message']
        ], 400);
    }
    
    logMessage('Payload validated successfully', 'INFO');
    
    $transformedPayload = transformPayload($incomingData);
    logMessage('Payload transformed: ' . json_encode($transformedPayload), 'DEBUG');
    
    logMessage('Calling remote API...', 'INFO');
    $apiResponse = callRemoteApi($transformedPayload);
    
    if (!$apiResponse['success']) {
        logMessage('Remote API call failed', 'ERROR');
        sendJsonResponse([
            'success' => false,
            'error' => 'Failed to get rates from remote API',
            'details' => $apiResponse['error']
        ], 500);
    }
    
    logMessage('Remote API responded with HTTP ' . $apiResponse['http_code'], 'INFO');
    
    sendJsonResponse([
        'success' => true,
        'data' => $apiResponse['response'],
        'http_code' => $apiResponse['http_code']
    ], 200);
    
} catch (Exception $e) {
    logMessage('Exception: ' . $e->getMessage(), 'ERROR');
    sendJsonResponse([
        'success' => false,
        'error' => 'Internal server error',
        'details' => $e->getMessage()
    ], 500);
}
?>