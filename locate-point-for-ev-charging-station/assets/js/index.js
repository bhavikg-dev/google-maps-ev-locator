/* On Load Make the Address Field Clear */
window.onload = function() {
  document.getElementById("address_from").value = '';
  document.getElementById("address_to").value = '';
}

let map = null;
let routePolyLine = '';
let totalDistance = 0;
let totalTime = 0;
let carModelRange = 0;
let directionsResponse;
let stationPolyline = [];
let routeSteps = [];
let directionsService;
let directionsRenderer;
let markers = [];

/**
 * initAutocomplete
 * @description Load Google Map
 */
function initAutocomplete() {
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
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

  /* Create the search box and link it to the UI element. */
  const inputFrom = document.getElementById("address_from");
  const searchBoxFrom = new google.maps.places.SearchBox(inputFrom);
  const inputTo = document.getElementById("address_to");
  const searchBoxTo = new google.maps.places.SearchBox(inputTo);
  
  /* Bias the SearchBox results towards current map's viewport. */
  map.addListener("bounds_changed", () => {
    searchBoxFrom.setBounds(map.getBounds());
  });

  /* Listen for the event fired when the user selects a prediction and retrieve details for that place. */
  searchBoxFrom.addListener("places_changed", () => {
    var carModels =  document.getElementsByName("ev_car");
     for(var i=0, n=carModels.length;i<n;i++) {
      carModels[i].checked = false;
     }
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

  /* Listen for the event fired when the user selects a prediction and retrieve details for that place. */
  searchBoxTo.addListener("places_changed", () => {
     var carModels =  document.getElementsByName("ev_car");
     for(var i=0, n=carModels.length;i<n;i++) {
      carModels[i].checked = false;
     }
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
        directionsResponse = response;
      }
    })
    .catch((e) => {
      //window.alert("Directions request failed due to " + status)
    });
}

/**
 * toggleCarModel
 * @param {number} range
 * @description Toggle Car Model
 */
function toggleCarModel(range) {
  /* Remove Existing Markers */
  deleteMarkers();
  /* Calculate Range */
  const expectedRangeInMeters = +range > 0 ? +range*1000 : 0; 
  const bestGuessRangeInMeters = expectedRangeInMeters*0.85;
  carModelRange = bestGuessRangeInMeters;
  if (totalDistance > bestGuessRangeInMeters) {
    let expectedEVStationsRequired = Math.floor(totalDistance/bestGuessRangeInMeters);
    let distanceRanges = getRangeOfDistanceForCharging(totalDistance, bestGuessRangeInMeters);
    alert('Total charging station required - ' + expectedEVStationsRequired);
    getPolyLineBasedUponChargingRange(distanceRanges);
    calculateAndDisplayRoute(directionsService, directionsRenderer);
    showEVStationsOnMap(false);
  } else {
    console.log('You do not need charging stations');
  }
  
}

/**
 * getPolyLineBasedUponChargingRange
 * @param {array} distanceRanges
 * @description Prepares range of arrays of polyline/boundingBox according to Charging Range
 */
function getPolyLineBasedUponChargingRange(distanceRanges) {
  for (let l=0; l<distanceRanges.length; l++) {
    const stationLatLng = getLatLngOnRoute(directionsResponse, (distanceRanges[l]/1000));
    let stationPoint = getLatLngFromRouteLegItem(stationLatLng);
    stationPolyline.push({ request: stationPoint, type: 'latLng' });
  }
}

/**
 * between
 * @param {number} x
 * @param {number} min
 * @param {number} max
 * @returns returns  true if number is between specified range
 */
function between(x, min, max) {
  return x >= min && x <= max;
}

/**
 * showEVStationsOnMap
 * @description Show Multiple EV Stations on the Map
 */
function showEVStationsOnMap(isChargingStation) {
  setLoader(true);
  for(let j=0; j<stationPolyline.length; j++) {
    showEVStationAsMarker(stationPolyline[j].request, isChargingStation);
  }
  setLoader(false);
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
 * showMarker
 * @param {object} addressInfo 
 * @description Shows Each EV Station as a Marker in the Existing Google Map
 */
function showEVStationAsMarker(addressInfo, chargingStation = false) {
  var latitude = addressInfo.lat;
  var longitude = addressInfo.lng;
  var title = 'EV Station Required';
  var address = 'EV Station Required';

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
      icon: chargingStation ? 'https://mydemoserver.site/map_images/icon.png' : 'http://maps.gstatic.com/mapfiles/ridefinder-images/mm_20_green.png',
      title: title
  });
  markers.push(marker);

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

/**
 * deleteMarkers
 * @description Delete all the existing markers and polyline/boundingBox for the map
 */
function deleteMarkers() {
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
  }
  markers = [];
  stationPolyline = [];
}

/**
 * getLatLngOnRoute
 * @param {object} directionResult 
 * @param {number} distanceInKM 
 * @returns Get Exact Lat Lng after certain km distance on route
 */
function getLatLngOnRoute(directionResult, distanceInKM) {
  var lastPos = directionResult.routes[0].legs[0].steps[0].path[0];
  var currPos;
  var distance=0.0;
  distanceInKM *= 1000;
  for (var j=0; j<directionResult.routes[0].legs.length; j++) {
      for (var k=0; k<directionResult.routes[0].legs[j].steps.length; k++) {
          for (var l=0; l<directionResult.routes[0].legs[j].steps[k].path.length; l++) {
              currPos=directionResult.routes[0].legs[j].steps[k].path[l];
              distance+=google.maps.geometry.spherical.computeDistanceBetween(lastPos, currPos);
              if (distance>distanceInKM) {
                  var heading=google.maps.geometry.spherical.computeHeading(currPos, lastPos);
                  var l= google.maps.geometry.spherical.computeOffset(currPos, distance-distanceInKM, heading);
                  return l;
              }
              lastPos=currPos;
          }
      }
  }
}

/**
 * getRangeOfDistanceForCharging
 * @param {number} distanceToCover 
 * @param {number} modelRange 
 * @returns get array of range on which car needs to be charged
 */
function getRangeOfDistanceForCharging(distanceToCover, modelRange) {
  let array = [];
  for(let i=distanceToCover; i>=0; i=i-modelRange) {
    array.push(distanceToCover-i);
  }
  if (array.length > 0) {
    array.splice(0, 1);
  }
  return array;
}