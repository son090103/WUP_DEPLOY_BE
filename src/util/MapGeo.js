const axios = require("axios");

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const cache = new Map();

async function geocodeVietnamese(place, address, province) {
  const q = [place, address, province, 'Việt Nam']
    .filter(Boolean)
    .join(', ');

  // Cache: tránh gọi lại địa chỉ đã có
  if (cache.has(q)) {
    return cache.get(q);
  }

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=vn`;
  console.log("url là: ", url);

  // Delay 1 giây trước mỗi request
  await delay(1000);

  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "bus-system-app/1.0 (contact@youremail.com)" // ✅ thêm email
      }
    });

    if (!res.data.length) {
      cache.set(q, null);
      return null;
    }

    const result = {
      lat: parseFloat(res.data[0].lat),
      lng: parseFloat(res.data[0].lon)
    };

    cache.set(q, result); // ✅ lưu cache
    return result;

  } catch (err) {
    if (err.response?.status === 429) {
      console.warn("Bị rate limit, thử lại sau 3 giây...");
      await delay(3000);
      return geocodeVietnamese(place, address, province); // retry 1 lần
    }
    throw err;
  }
}

module.exports = { geocodeVietnamese };