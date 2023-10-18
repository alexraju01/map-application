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

// let air = updateAirportMarkers();
// console.log(air);

let isVisible = true;
// This is used to store user current location
let userMarker;
// Array to store all the markerr #NOTE# (markers and marker) are 2 different variables
let markers = [];

function displayMapAndControls(lat, lng, zoom) {
  map = L.map("map", {
    layers: [streets],
  }).setView([lat, lng], zoom);
  let layerControl = L.control.layers(basemaps).addTo(map);

  // adding easy button
  L.easyButton("fa-crosshairs fa-lg", (btn, map) => {
    if (isVisible) {
      // storing the variable with user location using predefined
      userMarker = L.marker([lat, lng]).addTo(map).bindPopup("You are here").openPopup();
      map.setView([lat, lng], 14);
    } else {
      // Remove the marker from the map
      map.removeLayer(userMarker);
    }
    isVisible = !isVisible; // Toggle the marker's visibility state(true to false)
  }).addTo(map);

  // Function to check if the location exists in the markers array
  function locationExists(latlng) {
    // array.some checks the first instance of this element that matches the marker
    return markers.some((marker) => {
      // this returns the lat and lng value of the marker and checks if it equals to value of latlng
      return marker.getLatLng().equals(latlng);
    });
  }

  // Function to handle left-click
  map.on("click", (e) => {
    //  0 = left mouse button
    if (e.originalEvent.button === 0) {
      // Left-click: Check if a marker already exists at the clicked location
      if (locationExists(e.latlng)) {
        return; // Do nothing if the location exists
      }
      // Create a new marker and add it to the map and the markers array
      var customLabel = prompt("Enter a label for the marker:");
      if (customLabel) {
        let marker = L.marker(e.latlng)
          .addTo(map)
          .bindPopup(customLabel + " Right click to remove");
        markers.push(marker);
      }
    }
  });

  // Function to handle right-click
  // ###### NEED TO KNOW WHAT "CONTEXTMENU" ######
  map.on("contextmenu", (e) => {
    // Right-click: Remove the last marker from the map and the markers array
    if (markers.length > 0) {
      let lastMarker = markers.pop();
      map.removeLayer(lastMarker);
    }
  });
  // ########## Cluster Markers ##########
  L.easyButton("fa-map-marker-alt fa-lg", function (btn, map) {
    $("#markerModal").modal("show");
  }).addTo(map);

  // ########## Country Info ##########
  L.easyButton("fa-info fa-lg", function (btn, map) {
    $("#countryInfoModal").modal("show");
  }).addTo(map);

  L.easyButton("fa-info fa-lg", function (btn, map) {
    $("#currencyExchange").modal("show");
  }).addTo(map);
}

let selectedCountryLayer; // Declare a variable to keep track of the selected country layer
let selectedCountry;
document.getElementById("countrySelect").addEventListener("change", function () {
  selectCountryDropDown();
});

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
    // Adding option element to dropdown
    dropdown.appendChild(option);
  });
}

function selectCountryDropDown() {
  // getUserCountry();
  countryOption = document.getElementById("countrySelect");
  let selectedCountry = countryOption.value; // Get the selected country
  // Find the GeoJSON data based on the selected country
  let filteredCountry = country.features.find((feature) => {
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
  if ($("#airportMarkerCheckbox").is(":checked")) {
    updateAirportMarkers(selectedCountry);
  } else {
    // If the checkbox is unchecked, remove the airport markers
    clearAirportMarkers();
  }

  if ($("#nationalMarkerCheckbox").is(":checked")) {
    updateNationalMarkers(selectedCountry);
  } else {
    // If the checkbox is unchecked, remove the airport markers
    clearNationalMarkers();
  }
  console.log(selectedCountry);
  getCountryInfo(selectedCountry);
}

// // Function to handle geolocation
function getUserLocation() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        let lat = position.coords.latitude;
        let lng = position.coords.longitude;
        // View the location of the current user on zoom level 14 # NOTE # maxZoom = 16
        displayMapAndControls(lat, lng, 14);
        // You can also use the user's location (lat and lng) for other purposes here
      },
      function (error) {
        alert("Error: " + error.message);
      }
    );
  } else {
    alert("Geolocation is not available in your browser.");
  }
}
let airports = [];
let airportMarkerCluster; // Declare a variable to store the airport marker cluster
// updates the airport marker
function updateAirportMarkers(selectedCountry) {
  // Clear existing airport markers on the map, if there is any
  clearAirportMarkers();
  // fetch data from php file
  $.ajax({
    url: "libs/php/getCountries.php", //  HTTP request is sent to this location
    type: "POST", // POST meaning that data is sent the php file(countryInfoApi.php)
    dataType: "json",
    data: {
      // sends data about the two data parameter(country and language)
      // the value of these data parmeter is determened by the value from
      // the element id
      airport: $("#airportMarkerCheckbox").val(),
      country: selectedCountry,
    },
    success: function (result) {
      if (airportMarkerCluster) {
        airportMarkerCluster.clearLayers();
      }
      $.each(result.data, function (index, airport) {
        const airportName = airport["asciiName"];
        const airportLat = airport["lat"];
        const airportLng = airport["lng"];

        // Add the airport data to the 'airports' object with 'airportName' as the key
        airports.push({
          name: airportName,
          lat: airportLat,
          lng: airportLng,
        });
      });
      // Create markers for each airport and add them to the markers array
      const markers = airports.map((airport) => {
        const marker = L.marker([airport.lat, airport.lng]).bindPopup(airport.name);
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
  if (airportMarkerCluster) {
    // clears the airport marker cluster layer
    airportMarkerCluster.clearLayers();
    //This emptys the string.
    airports.length = 0;
    // map.removeLayer(airportMarkerCluster);
  }
}
$("#airportMarkerCheckbox").change(function () {
  const isChecked = $(this).is(":checked");
  if (isChecked) {
    let selectedCountry = $("#countrySelect").val();
    updateAirportMarkers(selectedCountry);
  } else {
    clearAirportMarkers();
    // clears the airport array
    airports.length = 0;
  }
});

// ############################### Capital City #############################################
let nationalPark = [];
let nationalMarkerCluster; // Declare a variable to store the capital city marker cluster

// updates the airport marker
function updateNationalMarkers(selectedCountry) {
  // Clear existing airport markers on the map, if there is any
  clearNationalMarkers();
  // fetch data from php file
  $.ajax({
    url: "libs/php/getNational.php", //  HTTP request is sent to this location
    type: "POST", // POST meaning that data is sent the php file(countryInfoApi.php)
    dataType: "json",
    data: {
      // sends data about the two data parameter(country and language)
      // the value of these data parmeter is determened by the value from
      // the element id
      national: $("#nationalMarkerCheckbox").val(),
      country: selectedCountry,
    },
    success: function (result) {
      if (nationalMarkerCluster) {
        nationalMarkerCluster.clearLayers();
      }
      $.each(result.data, function (index, national) {
        const nationalName = national["asciiName"];
        const nationalLat = national["lat"];
        const nationalLng = national["lng"];

        // Add the airport data to the 'airports' object with 'airportName' as the key
        nationalPark.push({
          name: nationalName,
          lat: nationalLat,
          lng: nationalLng,
        });
      });
      // Create markers for each airport and add them to the markers array
      const markers = nationalPark.map((national) => {
        const marker = L.marker([national.lat, national.lng]).bindPopup(national.name);
        return marker;
      });

      // Create a marker cluster group for the airport markers
      nationalMarkerCluster = L.markerClusterGroup();
      nationalMarkerCluster.addLayers(markers);

      // Add the airportMarkercluster to the map
      map.addLayer(nationalMarkerCluster);
    },
    error: function (jqXHR, textStatus, errorThrown) {
      // your error code
      console.log("fail");
      console.log(textStatus);
      console.log(errorThrown);
    },
  });
}

function clearNationalMarkers() {
  if (nationalMarkerCluster) {
    // clears the airport marker cluster layer
    nationalMarkerCluster.clearLayers();
    //This emptys the string.
    nationalPark.length = 0;
    // map.removeLayer(airportMarkerCluster);
  }
}
$("#nationalMarkerCheckbox").change(function () {
  const isChecked = $(this).is(":checked");
  if (isChecked) {
    let selectedCountry = $("#countrySelect").val();
    updateNationalMarkers(selectedCountry);
  } else {
    clearNationalMarkers();
    // clears the airport array
    nationalPark.length = 0;
  }
});

//  ####### Get Country Info #########
function getCountryInfo(selectedCountry) {
  $.ajax({
    url: "libs/php/getCountryInfo.php", //  HTTP request is sent to this location
    type: "POST", // POST meaning that data is sent the php file(countryInfoApi.php)
    dataType: "json",
    data: {
      // sends data about the two data parameter(country and language)
      // the value of these data parmeter is determened by the value from
      // the element id
      country: selectedCountry,
    },
    success: function (result) {
      // console.log(result);

      // console.log(JSON.stringify(result));

      console.log(result["data"][0]["countryName"]);
      console.log(result["data"][0]["languages"]);
      console.log(result["data"][0]["capital"]);
      console.log(result["data"][0]["continent"]);

      console.log($("#displayCountryName").html(result["data"][0]["countryName"]));
      console.log($("#displayLang").html(result["data"][0]["languages"]));
      console.log($("#displayCapital").html(result["data"][0]["capital"]));
      console.log($("#displayContinet").html(result["data"][0]["continentName"]));
      console.log($("#displayPopulation").html(result["data"][0]["population"]));
    },
    error: function (jqXHR, textStatus, errorThrown) {
      // your error code
      console.log("fail");
      console.log(textStatus);
      console.log(errorThrown);
    },
  });
}

// Ignore this function for now not main functionailty
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

window.onload = function () {
  populateCountryDropdown();
  getUserLocation();
  selectCountryDropDown();
};
