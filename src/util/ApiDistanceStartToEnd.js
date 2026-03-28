const axios = require("axios");

async function getStartToEndDuration(lng1, lat1, lng2, lat2) {
  const url = `http://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`;

  const response = await axios.get(url);
  const route = response.data.routes[0];

  return {
    distance_km : route.distance / 1000,
    duration_hour: route.duration / 3600,
  };
}

module.exports = { getStartToEndDuration };