# google-maps-ev-locator
Google Maps Electric Vehicle Charging Station Locator

******************************************************
******************************************************
https://maps.googleapis.com/maps/api/directions/json?
origin=place_id:ChIJ685WIFYViEgRHlHvBbiD5nE
&destination=place_id:ChIJA01I-8YVhkgRGJb0fW4UX7Y
&key=YOUR_API_KEY
******************************************************
https://api.openchargemap.io/v3/poi/?output=json&countrycode=AU&maxresults=10&compact=true&verbose=false&key=a9389179-2aad-4d20-acfb-f4d03f5df3e8&boundingbox=(-33.099927469818766,150.90728125),(-38.2374132170852,144.842828125)
^^^^^^^^^^^^ By Bounding Box From Starting Point to Ending Point
******************************************************
https://api.openchargemap.io/v3/poi/?output=json&countrycode=AU&maxresults=500&compact=true&verbose=false&key=a9389179-2aad-4d20-acfb-f4d03f5df3e8&polyline=
^^^^^^^^^^^^ By Polyline From Starting Point to Ending Point
response.routes[0].overview_polyline
******************************************************

# BIG THANKS TO BELOW LINKS
https://openchargemap.org/site/develop/api#referencedata
https://openchargemap.org/site/develop/api
https://stackoverflow.com/questions/2637023/how-to-calculate-the-latlng-of-a-point-a-certain-distance-away-from-another
https://stackoverflow.com/questions/8832071/how-can-i-get-the-distance-between-two-point-by-latlng
https://stackoverflow.com/questions/10976425/google-maps-directions-api-marking-a-point-x-km-from-starting-point
https://stackoverflow.com/questions/8707473/draw-route-x-kilometers-from-origin