const mongoose = require("mongoose");
module.exports.connect = () => {
  try {
    mongoose
      .connect(process.env.MONGODB_URL)
      .then(() => console.log("Connected!"));
  } catch (error) {
    console.log("error:", error);
  }
};
