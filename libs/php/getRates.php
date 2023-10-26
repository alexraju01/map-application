<?php
$codes_json = file_get_contents("../js/countryBorders.geo.json");
$decoded = json_decode($codes_json);
$rates = $decoded->rates;
$geojson = ['type' => 'FeatureCollection', 'features' => []];

foreach ($features as $feature) {
    $geojson['rates'][] = $rates; // Add the entire feature to the output
}

header('Content-Type: application/json; charset=UTF-8');
echo json_encode($geojson);
?>
