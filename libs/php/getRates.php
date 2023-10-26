<?php
$codes_json = file_get_contents("../js/rates.json");
$decoded = json_decode($codes_json);

if ($decoded) {
    $rates = $decoded->rates;
    
    if ($rates) {
        // Create a new JSON structure to store the rates
        $output = ['rates' => $rates];
        
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($output);
    } else {
        echo "No 'rates' data found in the JSON.";
    }
} else {
    echo "Invalid JSON data.";
}
?>
