<?php
/**
 * NerdzFactory portal — media upload for Updates (announcements).
 *
 * Deploy on cPanel:
 *   1. Create folder: public_html/portal-media/
 *   2. Create uploads subfolder writable by PHP: public_html/portal-media/files/
 *   3. Place this file as upload.php next to /files.
 *   4. Set $PUBLIC_BASE to the HTTPS URL of the files directory (no trailing slash).
 *
 * CORS: add your portal origin(s) to $ALLOWED_ORIGINS.
 *
 * Response: JSON { "ok": true, "url": "https://...", "kind": "image"|"video" }
 */

header('Content-Type: application/json; charset=utf-8');

$ALLOWED_ORIGINS = [
    'https://www.nerdzfactory.co',
    'https://nerdzfactory.co',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

/** @var string Public URL of the /files directory */
$PUBLIC_BASE = 'https://www.nerdzfactory.co/portal-media/files';

$MAX_BYTES = 80 * 1024 * 1024;

$allowedMime = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
    'video/mp4' => 'mp4',
    'video/webm' => 'webm',
];

if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'No file']);
    exit;
}

$f = $_FILES['file'];
if ($f['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Upload error ' . (string) $f['error']]);
    exit;
}

if ($f['size'] > $MAX_BYTES) {
    http_response_code(413);
    echo json_encode(['ok' => false, 'error' => 'File too large']);
    exit;
}

$tmp = $f['tmp_name'];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($tmp) ?: '';
if (!isset($allowedMime[$mime])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Unsupported type: ' . $mime]);
    exit;
}

$ext = $allowedMime[$mime];
$basename = date('Ymd') . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
$dir = __DIR__ . '/files';
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

$dest = $dir . '/' . $basename;
if (!move_uploaded_file($tmp, $dest)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Could not save file']);
    exit;
}

$url = $PUBLIC_BASE . '/' . $basename;
$kind = str_starts_with($mime, 'video/') ? 'video' : 'image';

echo json_encode(['ok' => true, 'url' => $url, 'kind' => $kind]);
