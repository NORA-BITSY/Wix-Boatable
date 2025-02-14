$w.onReady(function () {
  // Wait for the page to load before executing script

  // Check if Geolocation is available in the browser
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(initMap, handleError);
  } else {
    console.log("Geolocation is not supported by this browser.");
  }
});

// Function to initialize the map with user's position
function initMap(position) {
  let latitude = position.coords.latitude;
  let longitude = position.coords.longitude;

  // Add Google Maps script dynamically to the page
  let script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCXZ1Phymf877eV095EXD3JlslNqGzJA-0&callback=initializeMap`;
  document.body.appendChild(script);

  // Initialize map function
  window.initializeMap = function () {
    let mapContainer = $w('#googleMap'); // Assuming an element with the ID 'googleMap'
    let mapOptions = {
      center: { lat: latitude, lng: longitude },
      zoom: 15
    };

    let map = new google.maps.Map(mapContainer, mapOptions);

    // Add a marker to show user's location
    let marker = new google.maps.Marker({
      position: { lat: latitude, lng: longitude },
      map: map,
      title: "Your Location"
    });
  };
}

// Handle errors for Geolocation API
function handleError(error) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      console.log("User denied the request for Geolocation.");
      break;
    case error.POSITION_UNAVAILABLE:
      console.log("Location information is unavailable.");
      break;
    case error.TIMEOUT:
      console.log("The request to get user location timed out.");
      break;
    case error.UNKNOWN_ERROR:
      console.log("An unknown error occurred.");
      break;
  }
}