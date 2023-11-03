// Initialize the Leaflet map
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
let markers = [];
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
    throw error; // Re-throw the error if needed
  }
};
// ########### Rending map, buttons, control layers, and markers
function displayMapAndControls(lat, lng, zoom) {
  map = L.map("map", {
    layers: [Streets],
  }).setView([lat, lng], zoom);
  L.control.layers(basemaps, overlayMarker).addTo(map);

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

// ################### Renders The Map Near User Location ##############################
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

// ############### Auto selects the country box #####################
let currentOption;
function getUserCurrentCountry(lat, lng) {
  fetchData("libs/php/getCurrentCountry.php", { lat, lng }).then((result) => {
    const { countryName } = result.data;
    const countrySelect = document.getElementById("countrySelect");
    for (let i = 0; i < countrySelect.options.length; i++) {
      if (countrySelect.options[i].textContent === countryName) {
        currentOption = i;
        countrySelect.selectedIndex = i;
        selectCountryDropDown();
        break;
      }
    }
  });
}

// ################# Populate dropdown using json file ############################3
function populateCountryDropdown() {
  fetchData("libs/php/getCountryNameAndCode.php").then((result) => {
    let countries = result;

    const countryDetail = countries.map((country) => {
      return {
        name: country.name,
        iso_a2: country.iso_a2, // Assuming ISO Alpha-3 code is stored in the 'iso_a3' property
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
  });
}

// ############### Selecting country and updating the modals of that country ###########################
function selectCountryDropDown() {
  fetchData("libs/php/getCountryBorders.php").then((result) => {
    const selectedCountry = document.getElementById("countrySelect").value; // Get the selected country
    // Find the GeoJSON data based on the selected country
    const filteredCountry = result.features.find((feature) => {
      countryCode = selectedCountry;
      return feature.properties.iso_a2 === selectedCountry;
    });

    // Remove the previously added country layer, if it exists
    if (selectedCountryLayer) {
      map.removeLayer(selectedCountryLayer);
    }

    // Create a GeoJSON layer for the selected country
    selectedCountryLayer = L.geoJSON(filteredCountry, {
      style: {
        color: "#15D21F", // Blue color for other countries (or any default styling you want)
        weight: 2,
      },
    }).addTo(map);

    // Zoom out to the bounds of the selected country
    map.fitBounds(selectedCountryLayer.getBounds());
    placeAirportMarkers(selectedCountry);
    placeNationalMarkers(selectedCountry);
    getCountryInfo(selectedCountry);
    getWikiCountry(filteredCountry.properties.name);
    getCurrencyCode(selectedCountry);
    getNewsData(selectedCountry);
    getWeatherData();
    // getWeatherData();
    function getCurrencyCode(country) {
      fetchData("libs/php/getCountryInfo.php", { country }).then((result) => {
        countryCurrencyCode = result["data"][0]["currencyCode"];
        populateCurrencyCodeDropdown(countryCurrencyCode);
      });
    }
  });
}

//  ############### Get Country Info #################
function getCountryInfo(country) {
  fetchData("libs/php/getCountryInfo.php", { country }).then((result) => {
    let stringToNumber = Number(result["data"][0]["population"]);
    let number = numeral(stringToNumber).format("0,0");

    $("#displayCountryName").html(result["data"][0]["countryName"]);
    $("#displayLang").html(result["data"][0]["languages"]);
    $("#displayCapital").html(result["data"][0]["capital"]);
    $("#displayContinet").html(result["data"][0]["continentName"]);
    $("#displayPopulation").html(number);
  });
}

// ############################### Creating Airport Markers #############################################
let airportMarkerCluster = L.markerClusterGroup({
  polygonOptions: {
    fillColor: "#add3db",
    color: "#02a2e9",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.5,
  },
});

// var airportIcon = L.ExtraMarkers.icon({
//   prefix: "fa",
//   icon: "fa-plane",
//   iconColor: "black",
//   markerColor: "white",
//   shape: "square"
// });
function placeAirportMarkers(country) {
  // Clear existing airport markers on the map, if there is any
  airportMarkerCluster.clearLayers();

  fetchData("libs/php/getCountries.php", {
    airport: $("#airportMarkerCheckbox").val(),
    country,
  }).then((result) => {
    $.each(result.data, function (index, airport) {
      const airportName = airport["asciiName"];
      const airportLat = parseFloat(airport["lat"]);
      const airportLng = parseFloat(airport["lng"]);

      const airportMarker = L.marker([airportLat, airportLng], {
        icon: renderMarkerIcon("img/airportIcon.png", [50, 50], [20, 0], [4, 3]),
      }).bindTooltip(airportName, { direction: "top", sticky: true });
      airportMarkerCluster.addLayer(airportMarker);
    });
    map.addLayer(airportMarkerCluster);
  });
}

// ############################### Creating National Park Markers #############################################
let nationalMarkerCluster = L.markerClusterGroup({
  polygonOptions: {
    fillColor: "	#50C878",
    color: "#097969",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.5,
  },
});

// updates the airport marker
function placeNationalMarkers(selectedCountry) {
  // Clear existing airport markers on the map
  nationalMarkerCluster.clearLayers();

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
//  Creating the overlayMarker
const overlayMarker = {
  Airports: airportMarkerCluster,
  NationalPark: nationalMarkerCluster,
};

// ################# Populating Country Currency Code Dropdown ##################
function populateCurrencyCodeDropdown(countryCurrencyCode) {
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
    const fromCurrencyDropdown = document.getElementById("fromCurrency");
    for (let i = 0; i < fromCurrencyDropdown.options.length; i++) {
      if (fromCurrencyDropdown.options[i].value === countryCurrencyCode) {
        fromCurrencyDropdown.selectedIndex = i;
        break;
      }
    }
  });
}
// ################ Converting Currency And Fetching Rates Data ###########################
function ConvertingCurrencyRates() {
  fetchData("libs/php/getRates.php").then((result) => {
    const fromCurrency = $("#fromCurrency").val();
    const toCurrency = $("#toCurrency").val();
    const amount = parseFloat($("#inputAmount").val());
    const displayConvertedAmount = $("#displayConvertedAmount");

    if (result.rates[fromCurrency] && result.rates[toCurrency]) {
      const calculateExchangeRate = result.rates[fromCurrency] / result.rates[toCurrency];
      const convertedAmount = amount / calculateExchangeRate;

      displayConvertedAmount.text(
        `${amount} in ${fromCurrency} = ${numeral(convertedAmount).format(
          "0,0.00"
        )} in ${toCurrency}`
      );
    } else {
      displayConvertedAmount.text("Enter amount ot calculate");
    }
  });
}

// ########## To Call Function ConvertingCurrencyRates() #############################
// Add a click event listener to the button
$("#inputAmount, #fromCurrency, #toCurrency").on("change keyup", function () {
  ConvertingCurrencyRates();
});

// ########## Convert kelvin value to celsius ##########
function kelvinToCelsius(kelvin) {
  let celsius = kelvin - 273.15;
  celsius = Math.round(celsius);
  return `${celsius}°C`;
}

function dateInUk(dateTimeString) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const date = new Date(dateTimeString);
  const dayName = days[date.getDay()];

  const dateParts = dateTimeString.split(" ")[0].split("-");
  return `${dayName} ${dateParts[2]}`;
}

// ###################### Fetching Current/forecast Weather Data and Rendering #################
function getWeatherData() {
  fetchData("libs/php/getCountryInfo.php", {
    country: $("#countrySelect").val(),
  }).then((result) => {
    let cityName = result.data[0].capital;
    let countryName = $("#countrySelect option:selected").text();

    fetchData("libs/php/getWeatherData.php", {
      cityName,
      countryCode,
    }).then((result) => {
      $("#weatherModalLabel").html(cityName + ", " + countryName);

      const weatherIcon = result.data.weather[0].icon;
      document.getElementById(
        "todayIcon"
      ).src = `https://openweathermap.org/img/wn/${weatherIcon}@2x.png`;
      $("#todayConditions").html(result.data.weather[0].description);
      $("#todayMaxTemp").html(kelvinToCelsius(result.data.main.temp_max));
      $("#todayMinTemp").html(kelvinToCelsius(result.data.main.temp_min));
      $("#displayWindSpeed").html(`${result.data.wind.speed} mph`);
    });

    fetchData("libs/php/getForecastData.php", {
      cityName,
      countryCode,
    }).then((result) => {
      // this gets the list of data for 5 days at midday(12:00:00)
      const forecastItems = result.data.list
        .filter((item) => item.dt_txt.includes("12:00:00"))
        .slice(0, 2);

      $("#day1Date").text(dateInUk(forecastItems[0].dt_txt));
      document.getElementById(
        "day1Icon"
      ).src = `https://openweathermap.org/img/wn/${forecastItems[0].weather[0].icon}@2x.png`;
      $("#day1MaxTemp").text(kelvinToCelsius(forecastItems[0].main.temp_max));
      $("#day1MinTemp").text(kelvinToCelsius(forecastItems[0].main.temp_min));

      $("#day2Date").text(dateInUk(forecastItems[1].dt_txt));
      document.getElementById(
        "day2Icon"
      ).src = `https://openweathermap.org/img/wn/${forecastItems[1].weather[0].icon}@2x.png`;
      $("#day2MaxTemp").text(kelvinToCelsius(forecastItems[1].main.temp_max));
      $("#day2MinTemp").text(kelvinToCelsius(forecastItems[1].main.temp_min));
    });
  });
}

// ##################  Fetching News Data Through PHP Routine  #################
let newsArticles = [];
function getNewsData() {
  fetchData("libs/php/getNewsData.php", { countryCode }).then((result) => {
    console.log(result.data.results);
    result.data.results.forEach(function (article) {
      const { title, image_url, pubDate, source_id, link } = article;

      newsArticles.push({
        title,
        image_url,
        pubDate,
        source_id,
        link,
      });
    });

    displayArticle(newsArticles);
    newsArticles.length = 0;
  });
}
// ################# Rendering News Data As Article On Modal #######################
let altMessage;
function displayArticle(newsList) {
  const $newsContainer = $("#newsContainer"); // Using jQuery to select the newsContainer
  $newsContainer.empty();

  newsList.forEach((news) => {
    if (news.image_url === null) {
      news.image_url = "";
      altMessage = "Image unavailable";
    }
    const newsTemplate = `
      <table class="table table-borderless"> 
        <tr>
          <td rowspan="2" width="50%">
            <img class="img-fluid rounded" src="${news.image_url}" alt="${altMessage}" title="">
          </td>
          <td>
            <a href="${news.link}" class="fw-bold fs-6 text-black" target="_blank">${news.title}</a>
          </td>
        </tr>
        <tr>        
          <td class="align-bottom pb-0">
            <p class="fw-light fs-6 mb-1">${news.source_id}</p>
          </td>            
        </tr>
      </table>
      <hr>
    `;

    $newsContainer.append(newsTemplate); // Using jQuery's append method
  });
}

// ############## Fetching Wiki data Through PHP Routine calls #####################
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

// ####################### Rendering wikiInfo data To The Modal ########################
function displayWikiInfo(wikiInfos) {
  for (let i = 0; i < wikiInfos.length; i++) {
    const elemDisplayWikiTitle = $(`#displayWikiTitle${i + 1}`);
    const elemDisplayWikiSummary = $(`#displayWikiSummary${i + 1}`);
    const elemDisplayWikiUrl = $(`#displayWikiUrl${i + 1}`);

    elemDisplayWikiTitle.text(wikiInfos[i].title);
    elemDisplayWikiSummary.text(wikiInfos[i].summary);
    elemDisplayWikiUrl.attr("href", `https://${wikiInfos[i].wikipediaUrl}`);
  }
}

window.onload = function () {
  document.getElementById("countrySelect").addEventListener("change", function () {
    selectCountryDropDown();
    // TestingBorder();
  });

  populateCountryDropdown();
  getUserPosition();
  ConvertingCurrencyRates();
};
