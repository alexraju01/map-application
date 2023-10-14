// Initialize the Leaflet map
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

  var markers = []; // Array to store markers
  // Function to check if the location exists in the markers array
  function locationExists(latlng) {
    return markers.some(function (marker) {
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
          .bindPopup(customLabel + " right click to remove akjfhkgfejkefuiwebfliuewgfi");
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

  // var AirportMarkers = L.markerClusterGroup();
  // var marker = L.geoJSON()
  // var airports = [
  //   // Sample airport data (replace with your data)
  //   { name: "Airport 1", lat: 40.7128, lon: -74.006 }, // Example coordinates for New York City
  //   { name: "Airport 2", lat: 34.0522, lon: -118.2437 }, // Example coordinates for Los Angeles
  //   // Add more airport data entries here
  // ];
  function airportMarkers() {}
}

var selectedCountryLayer; // Declare a variable to keep track of the selected country layer

function selectCountryDropDown() {
  document.getElementById("countrySelect").addEventListener("change", function () {
    var selectedCountry = this.value; // Get the selected country
    // Find the GeoJSON data based on the selected country
    var filteredCountry = country.features.find(function (feature) {
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
  });
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

// function populateCountryDropdown() {
//   // Extract country names from the 'country' object
//   const countryNames = country.features.map((feature) => feature.properties.name);
//   // Sort the country names alphabetically
//   countryNames.sort();
//   // Get a reference to the dropdown element
//   const dropdown = document.getElementById("countrySelect");
//   // Loop through the sorted country names and create options
//   countryNames.forEach((countryName, iso_a3) => {
//     console.log(countryName);
//     console.log(iso_a3);
//     const option = document.createElement("option");
//     option.value = countryName;
//     option.textContent = countryName;
//     dropdown.appendChild(option);
//   });
// }

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
var airports = [];

$("#capitalCityCheckbox").change(function () {
  if ($(this).is(":checked")) {
    console.log("Checkbox has been checked!");
    $.ajax({
      url: "libs/php/getCountries.php", //  HTTP request is sent to this location
      type: "POST", // POST meaning that data is sent the php file(countryInfoApi.php)
      dataType: "json",
      data: {
        // sends data about the two data parameter(country and language)
        // the value of these data parmeter is determened by the value from
        // the element id
        airport: $("#capitalCityCheckbox").val(),
      },
      success: function (result) {
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

          // var markers = []; // Create an array to store the airport markers
          // // Create markers for each airport and add them to the markers array
          // airports.forEach(function (airports) {
          //   var marker = L.marker([airports.lat, airports.lng]).bindPopup(airports.name); // Display the airport name when clicked
          //   markers.push(marker);
          // });
          // // Create a marker cluster group
          // var markerCluster = L.markerClusterGroup();
          // // Add the airport markers to the cluster group
          // markerCluster.addLayers(markers);
          // // Add the marker cluster group to the map
          // map.addLayer(markerCluster);

          // console.log(airportName, airportLat, airportLng);
        });
        console.log(airports);
        var markers = []; // Create an array to store the airport markers

        // Create markers for each airport and add them to the markers array
        airports.forEach(function (airport) {
          var marker = L.marker([airport.lat, airport.lng]).bindPopup(airport.name); // Display the airport name when clicked
          markers.push(marker);
        });

        // Create a marker cluster group
        var markerCluster = L.markerClusterGroup();

        // Add the airport markers to the cluster group
        markerCluster.addLayers(markers);

        // Add the marker cluster group to the map
        map.addLayer(markerCluster);
      },
      error: function (jqXHR, textStatus, errorThrown) {
        // your error code
        console.log("fail");
        console.log(textStatus);
        console.log(errorThrown);
      },
    });
  }
});
// });

$("#capitalCityCheckbox").click(function () {
  // $(this).prop("checked", true);
  // ajax is a asynchronous javascript and xml fuction that
  // request to a server(countryInfoApi.php) to fetch data
  // in our case the php file.
});

window.onload = function () {
  populateCountryDropdown();
  getLocation();
  selectCountryDropDown();
};
