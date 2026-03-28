const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      match: /^[0-9]{9,11}$/,
    },
    password: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      default: null,
      select: false,
    },

    avatar: {
      url: {
        type: String,
        default:
          "https://static.vecteezy.com/system/resources/previews/036/280/651/original/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-illustration-vector.jpg",
      },
      publicId: {
        type: String,
        default: null,
      },
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role", // tên model
      required: true,
    },
    current_stop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stop",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "banned"],
      default: "active",
    },
    otp: {
      type: String,
      select: false,
    },

    otpExpiredAt: {
      type: Date,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
    faceEmbeddings: {
      type: [[Number]],
      default: [],
      select: false,
    },

    faceUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);
const User = mongoose.model("User", userSchema);
module.exports = User;
