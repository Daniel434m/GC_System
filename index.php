<?php
$file = "index.html";

if (file_exists($file)) {
    readfile($file);
} else {
    http_response_code(404);
    echo "<h1>404 - File Not Found</h1>";
    echo "<p>The expected file ($file) is missing.</p>";
}
?>

