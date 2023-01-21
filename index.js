//dependncies
const server = require("./lib/server");
const worker = require("./lib/worker");

//app object - module scaffolding
const app = {};

//testing twilio
// sendTwilioSms("01521436302", "Hello Ovee", (err) => {
//   console.log(`This is the error: `, err);
// });

app.init = () => {
  //start the server
  server.init();

  //start the worker
  worker.init();
};

app.init();

//export
module.exports = app;
