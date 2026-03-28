const axios = require("axios");

async function getRouteDistanceAndDuration(coords) {
  // coords = ["lng,lat","lng,lat","lng,lat"]

  const url = `http://router.project-osrm.org/route/v1/driving/${coords.join(";")}?overview=false&steps=true`;

  const response = await axios.get(url);

  const route = response.data.routes[0];

  return {
    total_distance_km: route.distance / 1000,
    total_duration_hour: route.duration / 3600,
    legs: route.legs
  };
}

module.exports = { getRouteDistanceAndDuration };