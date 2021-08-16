window.onload = function() {
  document.getElementById("address_from").value = '';
  document.getElementById("address_to").value = '';
}

let map = null;
let routePolyLine = '';
let totalMarkers = [];
let totalDistance = 0;
let totalTime = 0;
let carModelRange = 0;
let stationPolyline = [];
let routeSteps = [];


function initAutocomplete() {
  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer({
    polylineOptions: {
      strokeWeight: 8,
      strokeOpacity: 0.7,
      strokeColor:  '#666666'
    },
    preserveViewport: false,
    suppressMarkers: false
  });
    
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: -33.8688, lng: 151.2195 },
    zoom: 10,
    mapTypeId: "roadmap",
  });
  directionsRenderer.setMap(map);

  // Create the search box and link it to the UI element.
  const inputFrom = document.getElementById("address_from");
  const searchBoxFrom = new google.maps.places.SearchBox(inputFrom);
  const inputTo = document.getElementById("address_to");
  const searchBoxTo = new google.maps.places.SearchBox(inputTo);
  
  // Bias the SearchBox results towards current map's viewport.
  map.addListener("bounds_changed", () => {
    searchBoxFrom.setBounds(map.getBounds());
  });
  let markers = [];

  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  searchBoxFrom.addListener("places_changed", () => {
    const places = searchBoxFrom.getPlaces();

    if (places.length == 0) {
      return;
    }
    markers.forEach((marker) => {
      marker.setMap(null);
    });
    markers = [];
    const bounds = new google.maps.LatLngBounds();
    places.forEach((place) => {
      if (!place.geometry || !place.geometry.location) {
        console.log("Returned place contains no geometry");
        return;
      }
      if (place.geometry.viewport) {
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    });
    map.fitBounds(bounds);
  });


  searchBoxTo.addListener("places_changed", () => {
    const places = searchBoxTo.getPlaces();

    if (places.length == 0) {
      return;
    }
    markers.forEach((marker) => {
      marker.setMap(null);
    });
    markers = [];
    const bounds = new google.maps.LatLngBounds();
    places.forEach((place) => {
      if (!place.geometry || !place.geometry.location) {
        console.log("Returned place contains no geometry");
        return;
      }
      if (place.geometry.viewport) {
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    });
    map.fitBounds(bounds);
  });

  const onChangeHandler = function () {
    calculateAndDisplayRoute(directionsService, directionsRenderer);
  };
  document.getElementById("address_from").addEventListener("change", onChangeHandler);
  document.getElementById("address_to").addEventListener("change", onChangeHandler);
  
}

/**
 * calculateAndDisplayRoute
 * @param {object} directionsService 
 * @param {object} directionsRenderer 
 * @description Calculate the Starting and End Point and display routes between them
 */
function calculateAndDisplayRoute(directionsService, directionsRenderer) {
  directionsService
    .route({
      origin: {
        query: document.getElementById("address_from").value,
      },
      destination: {
        query: document.getElementById("address_to").value,
      },
      travelMode: google.maps.TravelMode.DRIVING,
      drivingOptions: {
        departureTime: new Date(Date.now()),
        trafficModel: 'optimistic'
      }
    })
    .then((response) => {
      if (response.status === "OK") {
        directionsRenderer.setDirections(response);
        routePolyLine = response.routes[0].overview_polyline;
        routeSteps = response.routes[0].legs[0].steps;
        totalDistance = response.routes[0].legs[0].distance.value;
        totalDuration = response.routes[0].legs[0].duration.value;
        //*********DISTANCE AND DURATION**********************//
        /*
        var service = new google.maps.DistanceMatrixService();
        service.getDistanceMatrix({
            origins: [document.getElementById("address_from").value],
            destinations: [document.getElementById("address_to").value],
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC,
            avoidHighways: false,
            avoidTolls: false
        }, function (response, status) {
            if (status == google.maps.DistanceMatrixStatus.OK && response.rows[0].elements[0].status != "ZERO_RESULTS") {
              console.log(response);
              console.log('Google Matrix APIs');
                var distance = response.rows[0].elements[0].distance.text;
                var duration = response.rows[0].elements[0].duration.text;
                var dvDistance = document.getElementById("dvDistance");
              dvDistance.innerHTML = "";
                dvDistance.innerHTML += "Distance: " + distance + "<br />";
                dvDistance.innerHTML += "Duration:" + duration;
                } else {
                alert("Unable to find the distance via road.");
            }
        });
        */

      }
    })
    .catch((e) => {
      //window.alert("Directions request failed due to " + status)
    });
}

function toggleCarModel(checkboxObj, range) {
  const expectedRangeInMeters = +range > 0 ? +range*1000 : 0; 
  const bestGuessRangeInMeters = expectedRangeInMeters*0.80;
  if (totalDistance > bestGuessRangeInMeters) {
    let expectedEVStationsRequired = Math.floor(totalDistance/bestGuessRangeInMeters);
    let distanceRanges = getRangeOfDistanceForCharging(totalDistance, bestGuessRangeInMeters);
    getPolyLineBasedUponChargingRange(distanceRanges);
    //console.log('You need charging stations - ' + expectedEVStationsRequired);
    //console.log(distanceRanges);
    // showEVStationsOnMap();
  } else {
    //console.log('You do not need charging stations');
  }
  
}

function getPolyLineBasedUponChargingRange(distanceRanges) {
  console.log(routeSteps);
  console.log(distanceRanges);
  let distanceSum = 0;
  for(let j=0; j<routeSteps.length; j++) {
    distanceSum = distanceSum + routeSteps[j].distance.value;
    for (let k=0; k<distanceRanges.length; k++) {
      if (distanceSum > (distanceRanges[k]*0.90) && distanceSum <= (distanceRanges[k]*1.20)) {
        console.log(getLatLngFromRouteLegItem(routeSteps[j].start_point));
        console.log(getLatLngFromRouteLegItem(routeSteps[j].end_point));
        // routeSteps[j].polyline.points
        stationPolyline.push();
        break;
      }
    }
  }
  console.log(distanceSum);
  console.log(stationPolyline);
  console.log('Total distance Sum');
}

function between(x, min, max) {
  return x >= min && x <= max;
}

function getRangeOfDistanceForCharging(distanceToCover, carModelRange) {
  let array = [];
  for(let i=distanceToCover; i>=0; i=i-carModelRange) {
    array.push(distanceToCover-i);
  }
  if (array.length > 0) {
    array.splice(0, 1);
  }
  return array;
}

function showEVStationsOnMap() {
  for(let j=0; j<stationPolyline.length; j++) {
    console.log(j);
    console.log('^^Running^^');
    showMarkersForMyRoutePolyLine(stationPolyline[j]);
  }
}

/**
 * setLoader
 * @param {boolean} status
 * @description Show Map Loader
 */
function setLoader(status) {
  var element = document.getElementById("mapLoader");
  if (status) {
    element.classList.add("show");
  } else {
    element.classList.remove("show");
  }  
}

/**
 * showMarkersForMyRoutePolyLine
 * @param {string} polyline
 * @description Get EV Stations Marker based on Polyline
 */
function showMarkersForMyRoutePolyLine(polyline) {
  var url = 'https://api.openchargemap.io/v3/poi/?output=json&maxresults=100&compact=true&verbose=false&key=a9389179-2aad-4d20-acfb-f4d03f5df3e8&distance=10&distanceunit=KM&polyline=' + polyline;
  setLoader(true);
  getChargeStation(url).then((stations) => {
    stationLength = stations.length;
    for (let i = 0; i < stationLength; i++) {
      showEVStationAsMarker(stations[i].AddressInfo);
    }
    setLoader(false);
  }).catch((error) => {
    console.log(error);
    setLoader(false);
  }).finally(() => {
    console.log('Request Completed');
    setLoader(false);
  });
}

/**
 * getLatLngFromRouteLegItem
 * @param {object} point 
 * @returns latitude and longitude as an object
 */
function getLatLngFromRouteLegItem(point) {
  var lat = point.lat();
  var lng = point.lng();
  return {lat: lat, lng: lng };
}

/**
 * getChargeStation
 * @param {string} url 
 * @returns charging stations with location details
 */
async function getChargeStation(url) {
  const response = await fetch(url);
  var data = await response.json();
  return data;
}

/**
 * showMarker
 * @param {object} addressInfo 
 * @description Shows Each EV Station as a Marker in the Existing Google Map
 */
function showEVStationAsMarker(addressInfo) {
  var latitude = addressInfo.Latitude;
  var longitude = addressInfo.Longitude;
  var title = addressInfo.Title ?? '';
  var address = addressInfo.AddressLine1 ?? '' + ' ' + addressInfo.town ?? '' + ' ' + addressInfo.StateOrProvince ?? '' + ' ' + addressInfo.Postcode ?? '';

  const contentString =
    '<div class="stationWrapper">' +
    '<h4 class="stationTitle">'+ title +'</h4>' +
    '<div class="stationDetails">' +
    "<p>" + address + "</p>" +
    "</div>" +
    "</div>";
  const infoWindow = new google.maps.InfoWindow();

  var myLatlng = new google.maps.LatLng(latitude, longitude);
  var marker = new google.maps.Marker({
      position: myLatlng,
      icon: 'https://mydemoserver.site/map_images/icon.png',
      title: title
  });

  /**
   * Closure for handling Marker Click
   */
  google.maps.event.addListener(marker,'click', (function(marker, content, infoWindow){ 
    return function() {
      infoWindow.setContent(content);
      infoWindow.open(map,marker);
    };
  })(marker, contentString, infoWindow));

  marker.setMap(map);
}
