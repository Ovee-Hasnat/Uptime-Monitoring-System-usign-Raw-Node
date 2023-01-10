//dependencies
const environment = require("./environments");
const crypto = require("crypto");

//module scaffolding
const utilities = {};

//parse JSON string to Object
utilities.parseJSON = (jsonString) => {
  let output;
  try {
    output = JSON.parse(jsonString);
  } catch {
    output = {};
  }

  return output;
};

//Hash String
utilities.hash = (str) => {
  if (typeof str === "string" && str.length > 0) {
    let hash = crypto
      .createHmac("sha256", environment.secretKey)
      .update(str)
      .digest("hex");
    return hash;
  } else {
    return false;
  }
};

//create random string
utilities.createRandomString = (strlength) => {
  let length =
    typeof strlength === "number" && strlength > 0 ? strlength : false;

  if (length) {
    possibleCharacters = "abcdefghijklmnopqrstuvwxyz1234567890";
    let output = "";
    for (let i = 0; i < length; i++) {
      let randomCharacter = possibleCharacters.charAt(
        Math.floor(Math.random() * possibleCharacters.length)
      );
      output += randomCharacter;
    }
    return output;
  } else {
    return false;
  }
};

//export module
module.exports = utilities;
