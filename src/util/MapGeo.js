const axios = require("axios");

async function geocodeVietnamese(place, address, province) {

const q = [place, address, province, 'Việt Nam']
  .filter(Boolean) 
  .join(', ');

const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=vn`;  
console.log("url là: ", url)

  const res = await axios.get(url, {
    headers: {
      "User-Agent": "bus-system-app"
    }
  });

  if (!res.data.length) {
    return null;
  }

  return {
    lat: parseFloat(res.data[0].lat),
    lng: parseFloat(res.data[0].lon)
  };
}

module.exports = { geocodeVietnamese };