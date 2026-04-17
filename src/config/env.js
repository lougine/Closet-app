const dotenv = require('dotenv');

if (!global.__DIGITAL_WARDROBE_ENV_LOADED__) {
  dotenv.config({ override: false });
  global.__DIGITAL_WARDROBE_ENV_LOADED__ = true;
}
