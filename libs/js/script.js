// Initialize the Leaflet map
console.log("h4");
const Streets = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
});

const Satellite = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  }
);

function renderMarkerIcon(iconUrl, iconSize, iconAnchor, popupAnchor) {
  return L.icon({
    iconUrl: iconUrl,
    iconSize, // size of the icon
    // shadowSize:   [50, 64], // size of the shadow
    iconAnchor, // point of the icon which will correspond to marker's location
    // shadowAnchor: [4, 62],  // the same for the shadow
    popupAnchor, // point from which the popup should open relative to the iconAnchor
  });
}

const basemaps = { Streets, Satellite };
let isUserLocationVisible = true; // Used to store user current location
let userMarker; // Array to store all the markers
const markers = [];
let selectedCountryLayer; // Declare a variable to keep track of the selected country layer
let selectedCountry;
let countryCode;

const fetchData = async (url, data = {}) => {
  try {
    const result = await new Promise((resolve, reject) => {
      $.ajax({
        url,
        type: "POST",
        dataType: "json",
        data,
        success: resolve,
        error: (_, __, errorThrown) => reject(errorThrown),
      });
    });
    // Return the result
    return result;
  } catch (error) {
    // Handle errors here
    console.error(error);
    throw error; // Re-throw the error if needed
  }
};

function displayMapAndControls(lat, lng, zoom) {
  map = L.map("map", {
    layers: [Streets],
  }).setView([lat, lng], zoom);
  L.control.layers(basemaps, overlayMaps).addTo(map);

  // adding easy button
  L.easyButton("fa-crosshairs fa-lg", (btn, map) => {
    if (isUserLocationVisible) {
      // storing the variable with user location using predefined
      userMarker = L.marker([lat, lng]).addTo(map).bindPopup("You are here").openPopup();
      map.setView([lat, lng], zoom);
    } else {
      // Remove the marker from the map
      map.removeLayer(userMarker);
    }
    isUserLocationVisible = !isUserLocationVisible; // Toggle the marker's visibility state(true to false)
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

  L.easyButton("fa-regular fa-newspaper fa-lg", function (btn, map) {
    $("#newsModal").modal("show");
  }).addTo(map);

  L.easyButton("fa-brands fa-wikipedia-w fa-lg", function (btn, map) {
    $("#wikiSearchModal").modal("show");
  }).addTo(map);
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
    option.id = countryInfo.name;
    // Adding option element to dropdown
    dropdown.appendChild(option);
  });
}

function selectCountryDropDown() {
  const selectedCountry = document.getElementById("countrySelect").value; // Get the selected country
  // Find the GeoJSON data based on the selected country
  const filteredCountry = country.features.find((feature) => {
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
  // clearAirportMarkers();
  placeAirportMarkers(selectedCountry);
  placeNationalMarkers(selectedCountry);
  getCountryInfo(selectedCountry);
  getWikiCountry(filteredCountry.properties.name);
}
let currentOption;
// // Function to handle geolocation
function getUserCurrentCountry(lat, lng) {
  fetchData("libs/php/getCurrentCountry.php", { lat, lng }).then((result) => {
    const { countryName } = result.data;
    const countrySelect = document.getElementById("countrySelect");
    for (let i = 0; i < countrySelect.options.length; i++) {
      if (countrySelect.options[i].id === countryName) {
        currentOption = i;
        countrySelect.selectedIndex = i;
        selectCountryDropDown();
        populateCityWeatherDropdown(cityWeatherDropdown);
        populateCityWeatherDropdown(cityDropdownForecast);
        getNewsData();
        break;
      }
    }
  });
}

let airportMarkerCluster = L.markerClusterGroup();
function placeAirportMarkers(country) {
  // Clear existing airport markers on the map, if there is any
  airportMarkerCluster.clearLayers();

  fetchData("libs/php/getCountries.php", {
    airport: $("#airportMarkerCheckbox").val(),
    country,
  }).then((result) => {
    $.each(result.data, function (index, airport) {
      const airportName = airport["asciiName"];
      const airportLat = airport["lat"];
      const airportLng = airport["lng"];

      const airportMarker = L.marker([parseFloat(airportLat), parseFloat(airportLng)], {
        icon: renderMarkerIcon("img/airportIcon.png", [50, 50], [20, 0], [4, 3]),
      }).bindPopup(airportName);
      airportMarkerCluster.addLayer(airportMarker);
    });
    map.addLayer(airportMarkerCluster);
  });
}

// ############################### Capital City #############################################
// let nationalPark = [];
let nationalMarkerCluster = L.markerClusterGroup();

// updates the airport marker
function placeNationalMarkers(selectedCountry) {
  // Clear existing airport markers on the map
  nationalMarkerCluster.clearLayers();

  // fetch data from php file
  fetchData("libs/php/getNational.php", {
    national: $("#nationalMarkerCheckbox").val(),
    country: selectedCountry,
  }).then((result) => {
    $.each(result.data, function (index, national) {
      const nationalName = national["asciiName"];
      const nationalLat = national["lat"];
      const nationalLng = national["lng"];

      const nationalParkMarker = L.marker([parseFloat(nationalLat), parseFloat(nationalLng)], {
        icon: renderMarkerIcon("img/nationalIcon.png", [60, 60], [25], [4, 3]),
      }).bindPopup(nationalName);
      nationalMarkerCluster.addLayers(nationalParkMarker);
    });
    map.addLayer(nationalMarkerCluster);
  });
}

var overlayMaps = {
  Airports: airportMarkerCluster,
  NationalPark: nationalMarkerCluster,
};

//  ############### Get Country Info #################
function getCountryInfo(country) {
  fetchData("libs/php/getCountryInfo.php", { country }).then((result) => {
    $("#displayCountryName").html(result["data"][0]["countryName"]);
    $("#displayLang").html(result["data"][0]["languages"]);
    $("#displayCapital").html(result["data"][0]["capital"]);
    $("#displayContinet").html(result["data"][0]["continentName"]);
    $("#displayPopulation").html(result["data"][0]["population"]);
  });
}
// ############# Currency #############
function getCountryCurrencies() {
  fetchData("libs/php/getCurrencies.php").then((result) => {
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
  });
}
function getCurrencyRates() {
  fetchData("libs/js/rates.json").then((result) => {
    $("#convertAmount").on("click", () => {
      const fromCurrency = $("#fromCurrency").val();
      const toCurrency = $("#toCurrency").val();
      const amount = parseFloat($("#inputAmount").val());
      const displayConvertedAmount = $("#displayConvertedAmount");

      if (result.rates[fromCurrency] && result.rates[toCurrency]) {
        const calculateExchangeRate = result.rates[fromCurrency] / result.rates[toCurrency];
        const convertedAmount = amount / calculateExchangeRate;
        displayConvertedAmount.text(
          `${amount} in ${fromCurrency} = ${convertedAmount} in ${toCurrency}`
        );
      } else {
        displayConvertedAmount.text(
          `Exchange rates not found for ${fromCurrency} and ${toCurrency}.`
        );
      }
    });
  });
}

let convertButton = document.getElementById("convertAmount");
// Add a click event listener to the button
convertButton.addEventListener("click", function () {
  getCurrencyRates();
});

let cityName;
const cityWeatherDropdown = document.getElementById("cityWeatherDropdown"); // Replace with the actual element ID
const cityDropdownForecast = document.getElementById("cityDropdownForecast"); // Replace with the actual element ID

function populateCityWeatherDropdown(cityDropdown) {
  fetchData("libs/php/getCountryPlaceLatLng.php", {
    country: $("#countrySelect").val(),
  }).then((result) => {
    const sortedPlaceData = result.data.sort((a, b) => a.toponymName.localeCompare(b.toponymName)); // Sort by place name
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
  });
}

// ########## Convert kelvin value to celsius ##########
function kelvinToCelsius(kelvin) {
  let celsius = kelvin - 273.15;
  celsius = celsius.toFixed(2);
  return `${celsius}°C`;
}

function getWeatherData() {
  fetchData("libs/php/getWeatherData.php", {
    cityName,
    countryCode,
  }).then((result) => {
    const weatherIcon = result.data.weather[0].icon;
    document.getElementById(
      "weatherIcon"
    ).src = `https://openweathermap.org/img/wn/${weatherIcon}@2x.png`;
    $("#displayWeatherText").html(result.data.weather[0].description);
    $("#displayHumidity").html(result.data.main.humidity);
    $("#displayTemperature").html(kelvinToCelsius(result.data.main.temp));
    $("#displayFeelsLike").html(kelvinToCelsius(result.data.main.feels_like));
    $("#displayWindSpeed").html(`${result.data.wind.speed} mph`);
  });
}

// ########## Populating Forecast field
function populateForecastField(forecastList) {
  for (let i = 0; i < forecastList.length; i++) {
    const $tdElementDays = $(`#displayDay${i + 1}`);
    const $tdElementIcon = $(`#D${i + 1}displayStatusIcon`);
    const $tdElementHumidity = $(`#D${i + 1}displayHumidity`);
    const $tdElementTemperature = $(`#D${i + 1}displayTemperature`);
    const $tdElementWindSpeed = $(`#D${i + 1}displayWindSpeed`);

    // converting string base date time to days e.g. 2023-10-25 12:00:00 => wed
    const date = new Date(forecastList[i].date);
    const dayOfWeek = date.toLocaleDateString("en-US", {
      weekday: "short",
    });

    $tdElementDays.text(dayOfWeek);
    $tdElementIcon.attr("src", `https://openweathermap.org/img/wn/${forecastList[i].icon}@2x.png`);
    $tdElementHumidity.text(forecastList[i].humidity);
    $tdElementTemperature.text(kelvinToCelsius(forecastList[i].temperature));
    $tdElementWindSpeed.text(`${forecastList[i].windSpeed} mph`);
  }
}

let forecastList = [];
function getForecastData() {
  fetchData("libs/php/getForecastData.php", {
    cityName,
    countryCode,
  }).then((result) => {
    console.log(result.data);
    // this gets the list of data for 5 days at midday(12:00:00)
    const forecastItems = result.data.list.filter((item) => item.dt_txt.includes("12:00:00"));

    forecastItems.forEach((forecast) => {
      forecastList.push({
        date: forecast.dt_txt,
        icon: forecast.weather[0].icon,
        humidity: forecast.main.humidity,
        temperature: forecast.main.temp,
        windSpeed: forecast.wind.speed,
      });
    });

    populateForecastField(forecastList);
    forecastList.length = 0;
  });
}

let newsArticles = [];
function getNewsData() {
  fetchData("libs/php/getNewsData.php", { countryCode }).then((result) => {
    result.data.articles.forEach(function (article, index) {
      const { title, publishedAt, url } = article;

      newsArticles.push({
        num: index + 1,
        title,
        publishedAt,
        source: article.source.name,
        url,
      });
    });
    displayArticle(newsArticles);
    newsArticles.length = 0;
  });
}

function displayArticle(articles) {
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const index = i + 1;

    // Use template literals to generate element IDs
    const displayNewsNum = document.getElementById(`displayNewsNum${index}`);
    const displayNewsTitle = document.getElementById(`displayNewsTitle${index}`);
    const displayNewsPublishedAt = document.getElementById(`displayNewsPublishedAt${index}`);
    const displayNewsSource = document.getElementById(`displayNewsSource${index}`);
    const displayNewsUrl = document.getElementById(`displayNewsUrl${index}`);

    // Set the content for each element
    displayNewsNum.textContent = `Article: ${article.num}`;
    displayNewsTitle.textContent = `Title: ${article.title}`;
    displayNewsPublishedAt.textContent = `Published: ${article.publishedAt}`;
    displayNewsSource.textContent = `Source: ${article.source}`;
    displayNewsUrl.textContent = `Link: ${article.url.slice(0, 27)}`;
    displayNewsUrl.href = article.url;
  }
}

const wikiInfos = [];
function getWikiCountry(countryName) {
  countryName = countryName.replace(" ", "");
  fetchData("libs/php/getWiki.php", { country: countryName }).then((result) => {
    result.data.forEach((wiki, index) => {
      const { title, summary, wikipediaUrl } = wiki;

      wikiInfos.push({
        title,
        summary,
        wikipediaUrl,
      });
    });
    displayWikiInfo(wikiInfos);
    wikiInfos.length = 0;
  });
}

function displayWikiInfo(wikiInfos) {
  for (let i = 0; i < wikiInfos.length; i++) {
    const elemDisplayWikiTitle = $(`#displayWikiTitle${i + 1}`);
    const elemDisplayWikiSummary = $(`#displayWikiSummary${i + 1}`);
    const elemDisplayWikiUrl = $(`#displayWikiUrl${i + 1}`);

    elemDisplayWikiTitle.text(wikiInfos[i].title);
    elemDisplayWikiSummary.text(wikiInfos[i].summary);
    elemDisplayWikiUrl.attr("href", `https://${wikiInfos[i].wikipediaUrl}`);

    console.log(elemDisplayWikiUrl);
  }
}

function getUserPosition() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        let lat = position.coords.latitude;
        let lng = position.coords.longitude;
        getUserCurrentCountry(lat, lng);
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

window.onload = function () {
  document.getElementById("countrySelect").addEventListener("change", function () {
    selectCountryDropDown();
    populateCityWeatherDropdown(cityWeatherDropdown);
    populateCityWeatherDropdown(cityDropdownForecast);
    getNewsData();
  });
  populateCountryDropdown();
  getUserPosition();
  getCountryCurrencies();
  getCurrencyRates();
};
