// Initialize the Leaflet map
console.log("hell0");
let streets = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
});

let satellite = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  }
);
let basemaps = {
  Streets: streets,
  Satellite: satellite,
};

let map;
let isVisible = true;
let marker;

function displayMapAndControls(lat, lng, zoom) {
  map = L.map("map", {
    layers: [streets],
  }).setView([lat, lng], zoom);
  let layerControl = L.control.layers(basemaps).addTo(map);

  // adding easy button
  L.easyButton("fa-crosshairs fa-lg", function (btn, map) {
    if (isVisible) {
      marker = L.marker([lat, lng]).addTo(map).bindPopup("You are here").openPopup();
      map.setView([lat, lng], 14);
    } else {
      // Remove the marker from the map
      map.removeLayer(marker);
    }
    isVisible = !isVisible; // Toggle the marker's visibility state(true to false)
  }).addTo(map);

  let markers = []; // Array to store markers
  // Function to check if the location exists in the markers array
  function locationExists(latlng) {
    return markers.some((marker) => {
      return marker.getLatLng().equals(latlng);
    });
  }

  // Function to handle left-click
  map.on("click", function (e) {
    if (e.originalEvent.button === 0) {
      // Left-click: Check if a marker already exists at the clicked location
      if (locationExists(e.latlng)) {
        return; // Do nothing if the location exists
      }
      // Create a new marker and add it to the map and the markers array
      var customLabel = prompt("Enter a label for the marker:");
      if (customLabel) {
        var marker = L.marker(e.latlng)
          .addTo(map)
          .bindPopup(customLabel + " Right click to remove");
        markers.push(marker);
      }
    }
  });

  // Function to handle right-click
  map.on("contextmenu", function (e) {
    // Right-click: Remove the last marker from the map and the markers array
    if (markers.length > 0) {
      var lastMarker = markers.pop();
      map.removeLayer(lastMarker);
    }
  });
  // info easy button to popup a modal
  L.easyButton("fa-info fa-lg", function (btn, map) {
    $("#exampleModal").modal("show");
  }).addTo(map);
}

let selectedCountryLayer; // Declare a variable to keep track of the selected country layer
let airports = [];
let airportMarkerCluster; // Declare a variable to store the airport marker cluster
let selectedCountry;

document.getElementById("countrySelect").addEventListener("change", function () {
  selectCountryDropDown();
});

function getUserCountry() {
  // if ("geolocation" in navigator) {
  //   navigator.geolocation.getCurrentPosition(
  //     function (position) {
  //       const latitude = position.coords.latitude;
  //       const longitude = position.coords.longitude;
  //       // Use a reverse geocoding service to determine the country
  //       const geocodingUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
  //       $.ajax({
  //         url: geocodingUrl,
  //         dataType: "json",
  //         success: function (data) {
  //           console.log("Passsssssss");
  //           const userCountry = data.address.country;
  //           console.log(userCountry);
  //           return userCountry;
  //         },
  //         error: function (error) {
  //           console.error("Error:", error);
  //           $("#countryInfo").text("Could not determine your country.");
  //         },
  //       });
  //     },
  //     function (error) {
  //       console.error("Geolocation error:", error);
  //       $("#countryInfo").text("Could not determine your location.");
  //     }
  //   );
  // } else {
  //   $("#countryInfo").text("Geolocation is not supported by your browser.");
  // }
}

function selectCountryDropDown() {
  // getUserCountry();
  defaultCountryOption = document.getElementById("countrySelect");
  let selectedCountry = defaultCountryOption.value; // Get the selected country
  console.log(selectedCountry);
  // Find the GeoJSON data based on the selected country
  var filteredCountry = country.features.find((feature) => {
    return feature.properties.iso_a2 === selectedCountry;
  });

  // Remove the previously added country layer, if it exists
  if (selectedCountryLayer) {
    map.removeLayer(selectedCountryLayer);
  }

  // Create a GeoJSON layer for the selected country
  selectedCountryLayer = L.geoJSON(filteredCountry).addTo(map);

  // Zoom out to the bounds of the selected country
  map.fitBounds(selectedCountryLayer.getBounds());

  // Check if the checkbox is checked, and if it is, load airport markers
  if ($("#capitalCityCheckbox").is(":checked")) {
    updateAirportMarkers(selectedCountry);
  } else {
    // If the checkbox is unchecked, remove the airport markers
    clearAirportMarkers();
  }
}

function populateCountryDropdown() {
  // Extract country names and ISO Alpha-3 codes from the 'country' object
  const countryDetail = country.features.map((feature) => {
    return {
      name: feature.properties.name,
      iso_a2: feature.properties.iso_a2, // Assuming ISO Alpha-3 code is stored in the 'iso_a3' property
    };
  });
  // Sort the country data by country name had to use localeCompare bacuse array.sort didnt work
  countryDetail.sort((a, b) => a.name.localeCompare(b.name));
  // Get a reference to the dropdown element
  const dropdown = document.getElementById("countrySelect");
  // Loop through the sorted country data and create options
  countryDetail.forEach((countryInfo) => {
    const option = document.createElement("option");
    option.value = countryInfo.iso_a2; // Set the ISO Alpha-3 code as the option value
    option.textContent = countryInfo.name; // Display both name and code
    dropdown.appendChild(option);
  });
}

// // Function to handle geolocation
function getLocation() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        let lat = position.coords.latitude;
        let lng = position.coords.longitude;
        // View the location of the current user on zoom level 14 # NOTE # maxZoom = 16
        displayMapAndControls(lat, lng, 14);
        // You can also use the user's location (lat and lng) for other purposes here
      },
      function (error) {
        alert("Errorssssss: " + error.message);
      }
    );
  } else {
    alert("Geolocation is not available in your browser.");
  }
}

// $(document).ready(function () {
// var airports = [];
function updateAirportMarkers(selectedCountry) {
  // Clear existing airport markers on the map, if any
  clearAirportMarkers();
  $.ajax({
    url: "libs/php/getCountries.php", //  HTTP request is sent to this location
    type: "POST", // POST meaning that data is sent the php file(countryInfoApi.php)
    dataType: "json",
    data: {
      // sends data about the two data parameter(country and language)
      // the value of these data parmeter is determened by the value from
      // the element id
      airport: $("#capitalCityCheckbox").val(),
      country: selectedCountry,
    },
    success: function (result) {
      if (airportMarkerCluster) {
        airportMarkerCluster.clearLayers();
        // map.removeLayer(airportMarkerCluster);
      }
      // console.log(JSON.stringify(result));
      $.each(result.data, function (index, airport) {
        console.log("hello");
        let airportName = airport["asciiName"];
        let airportLat = airport["lat"];
        let airportLng = airport["lng"];

        // Add the airport data to the 'airports' dictionary with 'airportName' as the key
        airports.push({
          name: airportName,
          lat: airportLat,
          lng: airportLng,
        });
      });
      console.log(airports);
      // Create an array to store the airport markers
      // Create markers for each airport and add them to the markers array
      var markers = airports.map(function (airport) {
        var marker = L.marker([airport.lat, airport.lng]).bindPopup(airport.name);
        return marker;
      });

      // Create a marker cluster group for the airport markers
      airportMarkerCluster = L.markerClusterGroup();
      airportMarkerCluster.addLayers(markers);

      // Add the airportMarkercluster to the map
      map.addLayer(airportMarkerCluster);
    },
    error: function (jqXHR, textStatus, errorThrown) {
      // your error code
      console.log("fail");
      console.log(textStatus);
      console.log(errorThrown);
    },
  });
}

function clearAirportMarkers() {
  console.log("should clear");
  if (airportMarkerCluster) {
    airportMarkerCluster.clearLayers();
    airports.length = 0;

    // map.removeLayer(airportMarkerCluster);
  }
}
$("#capitalCityCheckbox").change(function () {
  if ($(this).is(":checked")) {
    var selectedCountry = $("#countrySelect").val();
    updateAirportMarkers(selectedCountry);
  } else {
    clearAirportMarkers();
    airports.length = 0;
  }
});

window.onload = function () {
  populateCountryDropdown();
  getLocation();
  selectCountryDropDown();
};
