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
 * @param {object} checkboxObj
 * @param {number} range
 * @description Toggle Car Model
 */
function toggleCarModel(checkboxObj, range) {
  /* Remove Existing Markers */
  deleteMarkers();
  /* Calculate Range */
  const expectedRangeInMeters = +range > 0 ? +range*1000 : 0; 
  const bestGuessRangeInMeters = expectedRangeInMeters*1.00;
  carModelRange = bestGuessRangeInMeters;
  if (totalDistance > bestGuessRangeInMeters) {
    let expectedEVStationsRequired = Math.floor(totalDistance/bestGuessRangeInMeters);
    let distanceRanges = getRangeOfDistanceForCharging(totalDistance, bestGuessRangeInMeters);
    getPolyLineBasedUponChargingRange(distanceRanges);
    console.log('Range of my car is - '+ bestGuessRangeInMeters);
    console.log('You need charging stations - ' + expectedEVStationsRequired);
    calculateAndDisplayRoute(directionsService, directionsRenderer);
    showEVStationsOnMap();
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
  let distanceMatrixArray = [];
  let distanceSum = 0;
  for(let j=0; j<routeSteps.length; j++) {
    distanceSum = distanceSum + routeSteps[j].distance.value;
    let startPoint = getLatLngFromRouteLegItem(routeSteps[j].start_location);
    let endPoint = getLatLngFromRouteLegItem(routeSteps[j].end_location);
    let boundingBox = `(${startPoint.lat},${startPoint.lng}),(${endPoint.lat},${endPoint.lng})`;
    let polyLinePoints = routeSteps[j].polyline.points;
    let latLng = startPoint;
    distanceMatrixArray.push({
      individualDistance: routeSteps[j].distance.value,
      distance: distanceSum,
      startPoint: startPoint,
      endPoint: startPoint,
      boundingBox: boundingBox,
      polyline: polyLinePoints,
      polylineLength: polyLinePoints?.length ?? 0,
      latLng: latLng
    });
  }

  /*
  console.log('^^^^^^ SIRI ^^^^^^');
  console.log(routeSteps);
  console.log(distanceMatrixArray);
  console.log(distanceRanges);
  console.log(carModelRange);
  console.log('^^^^^^ SIRI ^^^^^^');
  */

  /* How many times you need to recharge on your route */
  /*
  for (let l=0; l<distanceRanges.length; l++) {
      for (let k=0; k<distanceMatrixArray.length-1; k++) {
      // let distanceDifference = distanceMatrixArray[k+1].distance-distanceMatrixArray[k].distance;
      // if (distanceMatrixArray[k].distance < distanceRanges[l])
    }
  }
  */

  for (let l=0; l<distanceRanges.length; l++) {
    const stationLatLng = getLatLngOnRoute(directionsResponse, (distanceRanges[l]/1000));
    let stationPoint = getLatLngFromRouteLegItem(stationLatLng);
    console.log('Station LatLng');
    console.log(stationLatLng);
    console.log(stationPoint);
    console.log('Station LatLng');
    stationPolyline.push({ request: stationPoint, type: 'latLng' });
  }

  console.log('Station LatLng');
  console.log(stationPolyline);
  console.log('Station LatLng');

  /*
  for (let k=1; k<distanceMatrixArray.length; k++) {
    let distanceDifference = distanceMatrixArray[k-1].distance-distanceMatrixArray[k].distance;
    for (let l=0; l<distanceRanges.length; l++) {
      console.log(distanceRanges[l] + '<< Station Range | Distance Diff >>' + distanceDifference + 'Card Model Range >>' + carModelRange);
      if (distanceDifference > carModelRange) {
      } else if (distanceDifference === carModelRange) {
      } else if (distanceDifference < carModelRange) {
      } else {
      }
      if (between(distanceRanges[l], distanceMatrixArray[k-1].distance, distanceMatrixArray[k].distance)) {
        if (distanceMatrixArray[k].polyline.length > 1500 && distanceMatrixArray[k].individualDistance < 60000) {
          stationPolyline.push({ request: distanceMatrixArray[k].latLng, type: 'latLng' });
        } else if (distanceMatrixArray[k].polyline.length > 1500) {
          stationPolyline.push({ request: distanceMatrixArray[k].boundingBox, type: 'boundingBox' });
        } else {
          stationPolyline.push({ request: distanceMatrixArray[k].polyline, type: 'polyLine' });
        }
        break;
      }
    }
  }
  */
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

/**
 * showEVStationsOnMap
 * @description Show Multiple EV Stations on the Map
 */
function showEVStationsOnMap() {
  for(let j=0; j<stationPolyline.length; j++) {
    showMarkersForMyRoutePolyLine(stationPolyline[j].request, stationPolyline[j].type);
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
function showMarkersForMyRoutePolyLine(request, type) {
  var url = '';
  if (type === 'boundingBox') {
    url = 'https://api.openchargemap.io/v3/poi/?output=json&maxresults=50&compact=true&verbose=false&key=a9389179-2aad-4d20-acfb-f4d03f5df3e8&distance=10&distanceunit=KM&boundingbox=' + request;
  } else if (type === 'latLng') {
    url = 'https://api.openchargemap.io/v3/poi/?output=json&maxresults=50&compact=true&verbose=false&key=a9389179-2aad-4d20-acfb-f4d03f5df3e8&distance=50&distanceunit=KM&latitude=' + request.lat + '&longitude=' + request.lng;
  } else {
    url = 'https://api.openchargemap.io/v3/poi/?output=json&maxresults=50&compact=true&verbose=false&key=a9389179-2aad-4d20-acfb-f4d03f5df3e8&distance=10&distanceunit=KM&polyline=' + request;
  }
 
  console.log(url);
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

function getLatLngOnRoute(directionResult, distanceInKM) {
  var lastPos = directionResult.routes[0].legs[0].steps[0].path[0];
  var currPos;
  var distance=0.0;
  distanceInKM *= 1000;
  //Will not consider alternate routes. 
  for (var j=0; j<directionResult.routes[0].legs.length; j++) {
      //There may be multiple legs, each corresponding to one way point. If there are no way points specified, there will be a single leg
      for (var k=0; k<directionResult.routes[0].legs[j].steps.length; k++) {
          //There will be multiple sub legs or steps
          for (var l=0; l<directionResult.routes[0].legs[j].steps[k].path.length; l++) {
              currPos=directionResult.routes[0].legs[j].steps[k].path[l];
              //Calculate the distance between two lat lng sets. 
              distance+=google.maps.geometry.spherical.computeDistanceBetween(lastPos, currPos);
              if (distance>distanceInKM) {
                  //If the exact point comes between two points, use distance to lat-lng conversion
                  var heading=google.maps.geometry.spherical.computeHeading(currPos, lastPos);
                  var l= google.maps.geometry.spherical.computeOffset(currPos, distance-distanceInKM, heading);
                  return l;
              }
              lastPos=currPos;
          }
      }
  }
}
