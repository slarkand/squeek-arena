<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$telemetry = [
    'rpm' => round(175 + sin(time() * 0.5) * 55),
    'total_revolutions' => 14258 + (time() % 10000),
    'power_watts' => 14.8,
    'miner_status' => 'Mining',
    'timestamp' => round(microtime(true) * 1000)
];

echo json_encode($telemetry);
