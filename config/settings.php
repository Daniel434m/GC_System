<?php
/**
 * GC System - Configuration Settings
 */

// Remote API Configuration
define('REMOTE_API_URL', 'https://dev.gondwana-collection.com/Web-Store/Rates/Rates.php');

// Test Unit Type IDs
define('TEST_UNIT_IDS', [-2147483637, -2147483456]);

// Logging Configuration
define('ENABLE_LOGGING', true);
define('LOG_FILE', __DIR__ . '/../logs/api.log');

// Create logs directory if it doesn't exist
if (!file_exists(__DIR__ . '/../logs')) {
    mkdir(__DIR__ . '/../logs', 0755, true);
}
?>