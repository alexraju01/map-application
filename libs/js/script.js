// Initialize the Leaflet map
console.log("testing");
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

  L.easyButton("fa-sterling-sign fa-lg", function (btn, map) {
    $("#currencyExchange").modal("show");
  }).addTo(map);
  L.easyButton(" fa-cloud-sun fa-lg", function (btn, map) {
    $("#weatherInfoModal").modal("show");
  }).addTo(map);
}

let selectedCountryLayer; // Declare a variable to keep track of the selected country layer
let selectedCountry;
let countryCode;
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
    countryCode = selectedCountry;
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
      $("#displayCountryName").html(result["data"][0]["countryName"]);
      $("#displayLang").html(result["data"][0]["languages"]);
      $("#displayCapital").html(result["data"][0]["capital"]);
      $("#displayContinet").html(result["data"][0]["continentName"]);
      $("#displayPopulation").html(result["data"][0]["population"]);
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

// Get currencies
//  ####### Get Country Info #########
function getCurrencies() {
  $.ajax({
    url: "libs/php/getCurrencies.php", //  HTTP request is sent to this location
    type: "POST", // POST meaning that data is sent the php file(countryInfoApi.php)
    dataType: "json",

    success: function (result) {
      // Create an array of key-value pairs (country code and country name) from the object
      const countryNameArray = $.map(result.data, function (country, currencyCode) {
        return { currencyCode: currencyCode, country: country };
      });

      // Sort the array by country name
      countryNameArray.sort((a, b) => {
        return a.country.localeCompare(b.country);
      });

      $.each(countryNameArray, function (index, item) {
        // creating option html element for both from and to currency
        const optionFromCurrency = $("<option>", {
          value: item.currencyCode,
          text: `${item.country} (${item.currencyCode})`,
        });
        const optionToCurrency = $("<option>", {
          value: item.currencyCode,
          text: `${item.country} (${item.currencyCode})`,
        });

        // adding the option to the dropdown
        $("#fromCurrency").append(optionFromCurrency);
        $("#toCurrency").append(optionToCurrency);
      });
    },
    error: function (jqXHR, textStatus, errorThrown) {
      // your error code
      console.log("fail");
      console.log(textStatus);
      console.log(errorThrown);
    },
  });
}

function convertCurrency() {
  $.ajax({
    url: "libs/php/convertCurrency.php", //  HTTP request is sent to this location
    type: "POST", // POST meaning that data is sent the php file(countryInfoApi.php)
    dataType: "json",
    data: {
      amount: $("#amount").val(),
      from: $("#fromCurrency").val(),
      to: $("#toCurrency").val(),
    },

    success: function (result) {
      // Create an array of key-value pairs (country code and country name) from the object
    },
    error: function (jqXHR, textStatus, errorThrown) {
      // your error code
      console.log("fail");
      console.log(textStatus);
      console.log(errorThrown);
    },
  });
}

let cityLat;
let cityLng;
let cityName;
const cityWeatherDropdown = document.getElementById("cityWeatherDropdown"); // Replace with the actual element ID
const cityDropdownForecast = document.getElementById("cityDropdownForecast"); // Replace with the actual element ID

function populateCityWeatherDropdown(cityDropdown) {
  $.ajax({
    url: "libs/php/getCountryPlaceLatLng.php", //  HTTP request is sent to this location
    type: "POST", // POST meaning that data is sent the php file(countryInfoApi.php)
    dataType: "json",
    data: {
      country: $("#countrySelect").val(),
    },

    success: function (result) {
      const sortedPlaceData = result.data.sort((a, b) =>
        a.toponymName.localeCompare(b.toponymName)
      ); // Sort by place name

      cityDropdown.innerHTML = "";
      sortedPlaceData.forEach((place) => {
        placeName = place["toponymName"];
        placeLat = place["lat"];
        placeLng = place["lng"];

        const option = document.createElement("option");
        option.value = `${placeLat},${placeLng}`; // Set the value to lat,lng
        option.text = placeName; // Display the city name as the text

        cityDropdown.appendChild(option);
      });

      cityDropdown.addEventListener("change", function () {
        // //  the selected index retrievs the option element
        const selectedOption = this.options[this.selectedIndex];
        cityName = selectedOption.text.replace(" ", "%20");

        // console.log(encodedString);
        if (cityDropdown === cityWeatherDropdown) {
          // console.log("matches");
          console.log(cityDropdown);
          getWeatherData();
        }
        if (cityDropdown === cityDropdownForecast) {
          // console.log("matches");
          console.log(cityDropdownForecast);
          getForecastData();
        }
      });
    },
    error: function (jqXHR, textStatus, errorThrown) {
      // your error code
      console.log(jqXHR);
      console.log(textStatus);
      console.log(errorThrown);
    },
  });
}

// ########## Convert kelvin value to celsius ##########
function kelvinToCelsius(kelvin) {
  let celsius = kelvin - 273.15;
  celsius = celsius.toFixed(2);
  return `${celsius}°C`;
}

function getWeatherData() {
  $.ajax({
    url: "libs/php/getWeatherData.php", //  HTTP request is sent to this location
    type: "POST", // POST meaning that data is sent the php file(countryInfoApi.php)
    dataType: "json",
    data: {
      cityNames: cityName,
      countryCodes: countryCode,
    },

    success: function (result) {
      console.log("testing input");
      console.log(result.data);
      console.log("testing output");

      const weatherIcon = result.data.weather[0].icon;
      document.getElementById(
        "weatherIcon"
      ).src = `https://openweathermap.org/img/wn/${weatherIcon}@2x.png`;
      $("#displayWeatherText").html(result.data.weather[0].description);
      $("#displayHumidity").html(result.data.main.humidity);
      $(".displayTemperature").html(kelvinToCelsius(result.data.main.temp));
      $("#displayFeelsLike").html(kelvinToCelsius(result.data.main.feels_like));
      $("#displayWindSpeed").html(`${result.data.wind.speed} mph`);
    },
    error: function (jqXHR, textStatus, errorThrown) {
      // your error code
      console.log(jqXHR.status);
      console.log(jqXHR.responseText);
      console.log(textStatus);
      console.log(errorThrown);
    },
  });
}

const week = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];
// ########### Populating the field title by days of the week  #############
function populate5DaysByName() {
  for (let i = 1; i <= 5; i++) {
    const tdElementDays = document.getElementById(`displayDay${i}`);
    if (tdElementDays) {
      tdElementDays.textContent = week[i - 1];
    }
  }
}
// ########## Populating humidity field
function populateForecastField(humidity, temperature, windSpeed) {
  for (let i = 1; i <= 5; i++) {
    // D1displayHumidity;
    const tdElementHumidity = document.getElementById(`D${i}displayHumidity`);
    const tdElementTemperature = document.getElementById(`D${i}displayTemperature`);
    const tdElementWindSpeed = document.getElementById(`D${i}displayWindSpeed`);
    // console.log(humidity);
    if (tdElementHumidity) {
      tdElementHumidity.textContent = humidity[i - 1];
    }

    if (tdElementTemperature) {
      tdElementTemperature.textContent = kelvinToCelsius(temperature[i - 1]);
    }
    if (tdElementWindSpeed) {
      tdElementWindSpeed.textContent = `${windSpeed[i - 1]} mph`;
    }
  }
}

let forecastHumidity = [];
let forecastTemp = [];
let forecastWindSpeed = [];
function getForecastData() {
  $.ajax({
    url: "libs/php/getForecastData.php", //  HTTP request is sent to this location
    type: "GET", // POST meaning that data is sent the php file(countryInfoApi.php)
    dataType: "json",
    data: {
      cityNames: cityName,
      countryCodes: countryCode,
    },

    success: function (result) {
      const forecastList = result.data.list.filter((item) => item.dt_txt.includes("12:00:00"));

      forecastList.forEach((forecast) => {
        forecastHumidity.push(forecast.main.humidity);
        forecastTemp.push(forecast.main.temp);
        forecastWindSpeed.push(forecast.wind.speed);
        // $("#D1displayLocation").html(forecast.main.temp);
      });
      populateForecastField(forecastHumidity, forecastTemp, forecastWindSpeed);
      forecastHumidity.length = 0;
      forecastTemp.length = 0;
      forecastWindSpeed.length = 0;
    },
    error: function (jqXHR, textStatus, errorThrown) {
      // your error code
      console.log(jqXHR);
      console.log(textStatus);
      console.log(errorThrown);
    },
  });
}

let convertButton = document.getElementById("convert");
// Add a click event listener to the button
convertButton.addEventListener("click", function () {
  console.log("clicked");
  convertCurrency();
});

getCurrencies();

window.onload = function () {
  document.getElementById("countrySelect").addEventListener("change", function () {
    selectCountryDropDown();
    populateCityWeatherDropdown(cityWeatherDropdown);
    populateCityWeatherDropdown(cityDropdownForecast);
    populate5DaysByName();
  });
  populateCountryDropdown();
  getUserLocation();
  // selectCountryDropDown();
};
