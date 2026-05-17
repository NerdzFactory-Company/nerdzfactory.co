<?php
/**
 * NerdzFactory — iCal URL → JSON for the portal calendar.
 *
 * Google Calendar: Settings → Integrate calendar → Secret address in iCal format.
 * Put that URL in $ICAL_URL on the server (do not commit real secrets).
 *
 * Output: { "events": [ { "id", "title", "start", "end?", "allDay?", "description?", "location?" } ] }
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

$ICAL_URL = '';

if ($ICAL_URL === '') {
    echo json_encode([
        'events' => [],
        'error' => 'Set $ICAL_URL in ical-json.php on the server to your secret iCal address.',
    ]);
    exit;
}

$ctx = stream_context_create([
    'http' => [
        'timeout' => 20,
        'header' => "User-Agent: NerdzFactory-Portal/1\r\n",
    ],
]);

$raw = @file_get_contents($ICAL_URL, false, $ctx);
if ($raw === false || $raw === '') {
    http_response_code(502);
    echo json_encode(['events' => [], 'error' => 'Could not fetch calendar feed']);
    exit;
}

$raw = preg_replace("/\r\n[ \t]/", '', $raw);

preg_match_all('/BEGIN:VEVENT(.+?)END:VEVENT/s', $raw, $blocks);
$out = [];

foreach ($blocks[1] as $block) {
    $uid = ics_get($block, 'UID') ?: uniqid('ev_', true);
    $summary = ics_get($block, 'SUMMARY') ?: '(No title)';

    $dtStart = ics_get_dt($block, 'DTSTART');
    if ($dtStart === null) {
        continue;
    }
    $dtEnd = ics_get_dt($block, 'DTEND');
    $allDay = $dtStart['dateOnly'];

    $row = [
        'id' => preg_replace('/[^a-zA-Z0-9_-]+/', '_', $uid),
        'title' => ics_unescape($summary),
        'start' => $dtStart['iso'],
        'allDay' => $allDay,
    ];
    if ($dtEnd !== null) {
        $row['end'] = $dtEnd['iso'];
    }

    $desc = ics_get($block, 'DESCRIPTION');
    if ($desc !== null) {
        $row['description'] = ics_unescape($desc);
    }
    $loc = ics_get($block, 'LOCATION');
    if ($loc !== null) {
        $row['location'] = ics_unescape($loc);
    }

    $out[] = $row;
}

echo json_encode(['events' => $out]);

function ics_unescape(string $s): string
{
    return str_replace(["\\n", "\\,", "\\;", "\\\\"], ["\n", ",", ";", "\\"], $s);
}

function ics_get(string $block, string $name): ?string
{
    if (preg_match('/^' . preg_quote($name, '/') . '(?:;[^:]*)?:(.+)$/m', $block, $m)) {
        return trim($m[1]);
    }
    return null;
}

/** @return array{iso:string,dateOnly:bool}|null */
function ics_get_dt(string $block, string $name): ?array
{
    $line = null;
    if (preg_match('/^' . preg_quote($name, '/') . '([^:]*):(.+)$/m', $block, $m)) {
        $line = trim($m[2]);
    }
    if ($line === null || $line === '') {
        return null;
    }

    if (preg_match('/^(\d{8})T(\d{6})Z$/', $line, $p)) {
        $iso = substr($p[1], 0, 4) . '-' . substr($p[1], 4, 2) . '-' . substr($p[1], 6, 2)
            . 'T' . substr($p[2], 0, 2) . ':' . substr($p[2], 2, 2) . ':' . substr($p[2], 4, 2) . 'Z';
        return ['iso' => $iso, 'dateOnly' => false];
    }

    if (preg_match('/^(\d{8})T(\d{6})$/', $line, $p)) {
        $iso = substr($p[1], 0, 4) . '-' . substr($p[1], 4, 2) . '-' . substr($p[1], 6, 2)
            . 'T' . substr($p[2], 0, 2) . ':' . substr($p[2], 2, 2) . ':' . substr($p[2], 4, 2);
        return ['iso' => $iso, 'dateOnly' => false];
    }

    if (preg_match('/^(\d{8})$/', $line, $p)) {
        $d = $p[1];
        $iso = substr($d, 0, 4) . '-' . substr($d, 4, 2) . '-' . substr($d, 6, 2);
        return ['iso' => $iso, 'dateOnly' => true];
    }

    return null;
}
