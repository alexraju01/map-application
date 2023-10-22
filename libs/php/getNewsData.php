<?php
ini_set('display_errors', 'On');
error_reporting(E_ALL);

// Initialize a timer to measure the execution time of the script:
$executionStartTime = microtime(true);

$userAgent = "mapApp/1.0"; // Replace with your application name and version

// Initialize CURL:
$api = 'https://newsapi.org/v2/top-headlines?pageSize=2&country='. $_REQUEST['country'].'&apiKey=a2263bc13916435698b966fe246e2f00';
// Initialize a CURL session and set options to make the HTTP request
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $api);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array("User-Agent: $userAgent"));


// Execute the CURL session and store the result in the $result variable
$result = curl_exec($ch);

// Closing the CURL session
curl_close($ch);

// Decode the JSON response into an associative array
$decode = json_decode($result, true);

// Construct an output array with status information and the GeoNames data:
$output['status']['code'] = "200";
$output['status']['name'] = "ok";
$output['status']['description'] = "success";
$output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
$output['data'] = $decode;

// Set the response header to indicate that the response is in JSON format
header('Content-Type: application/json; charset=UTF-8');

// Finally, encode the output array as JSON and echo it as the script's response
echo json_encode($output);
?>