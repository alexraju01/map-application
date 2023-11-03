<?php
$codes_json = file_get_contents("../js/countryBorders.geo.json");
$decoded = json_decode($codes_json);
$features = $decoded->features;

$countries = []; // Array to hold country details

foreach ($features as $feature) {
    $countries[] = [
        'name' => $feature->properties->name, // Country name
        'iso_a2' => $feature->properties->iso_a2, // iso_a2 code
        'iso_a3' => $feature->properties->iso_a3, // iso_a3 code
        'iso_n3' => $feature->properties->iso_n3  // iso_n3 code
    ];
}

header('Content-Type: application/json; charset=UTF-8');
echo json_encode($countries);
?>

