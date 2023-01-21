//dependencies

//module scaffolding
const environments = {};

environments.staging = {
  port: 3000,
  envName: "staging",
  secretKey: "sdajfjkhskdjf",
  maxChecks: 5,
  twilio: {
    fromPhone: "+13856441021",
    accountSid: "ACf0473079d01e116befb3e5bab5445987",
    authToken: "c13536c64c83e61aa44a9917d10d1400",
  },
};

environments.production = {
  port: 5000,
  envName: "production",
  secretKey: "aaabbbsdajfjkhskdjf",
  maxChecks: 5,
  twilio: {
    fromPhone: "+13856441021",
    accountSid: "ACf0473079d01e116befb3e5bab5445987",
    authToken: "c13536c64c83e61aa44a9917d10d1400",
  },
};

//determine which environment was passed
const currentEnvironment =
  typeof process.env.NODE_ENV === "string" ? process.env.NODE_ENV : "staging";

//export corresponding environment
const environmentToExport =
  typeof environments[currentEnvironment] === "object"
    ? environments[currentEnvironment]
    : environments.staging;

module.exports = environmentToExport;
