//dependencies
const data = require("../../lib/data");
const { parseJSON, createRandomString } = require("../../helpers/utilities");
const tokenHandler = require("./tokenHandler");
const { maxChecks } = require("../../helpers/environments");

//module scaffolding
const handler = {};

handler.checkHandler = (requestProperties, callback) => {
  const acceptedMethods = ["get", "post", "put", "delete"];
  if (acceptedMethods.indexOf(requestProperties.method) > -1) {
    handler._check[requestProperties.method](requestProperties, callback);
  } else {
    callback(405);
  }
};

handler._check = {};

handler._check.post = (requestProperties, callback) => {
  // validate inputs
  let protocol =
    typeof requestProperties.body.protocol === "string" &&
    ["http", "https"].indexOf(requestProperties.body.protocol) > -1
      ? requestProperties.body.protocol
      : false;

  let url =
    typeof requestProperties.body.url === "string" &&
    requestProperties.body.url.trim().length > 0
      ? requestProperties.body.url
      : false;

  let method =
    typeof requestProperties.body.method === "string" &&
    ["GET", "POST", "PUT", "DELETE"].indexOf(requestProperties.body.method) > -1
      ? requestProperties.body.method
      : false;

  let successCodes =
    typeof requestProperties.body.successCodes === "object" &&
    requestProperties.body.successCodes instanceof Array
      ? requestProperties.body.successCodes
      : false;

  let timeoutSeconds =
    typeof requestProperties.body.timeoutSeconds === "number" &&
    requestProperties.body.timeoutSeconds % 1 === 0 &&
    requestProperties.body.timeoutSeconds >= 1 &&
    requestProperties.body.timeoutSeconds <= 5
      ? requestProperties.body.timeoutSeconds
      : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {
    let token =
      typeof requestProperties.headersObject.token === "string"
        ? requestProperties.headersObject.token
        : false;

    // lookup the user phone by reading the token
    data.read("tokens", token, (err, tokenData) => {
      if (!err && tokenData) {
        let userPhone = parseJSON(tokenData).phone;

        //lookup the user data
        data.read("users", userPhone, (err, userData) => {
          if (!err && userData) {
            tokenHandler._token.verify(token, userPhone, (tokenIsValid) => {
              if (tokenIsValid) {
                let userObject = parseJSON(userData);
                let userChecks =
                  typeof userObject.checks === "object" &&
                  userObject.checks instanceof Array
                    ? userObject.checks
                    : [];

                if (userChecks.length < maxChecks) {
                  let checkId = createRandomString(20);
                  let checkObject = {
                    id: checkId,
                    userPhone,
                    protocol,
                    url,
                    method,
                    successCodes,
                    timeoutSeconds,
                  };

                  //save the object
                  data.create("checks", checkId, checkObject, (err) => {
                    if (!err) {
                      // add checkId to user object
                      userObject.checks = userChecks;
                      userObject.checks.push(checkId);

                      //update the user data
                      data.update("users", userPhone, userObject, (err) => {
                        if (!err) {
                          callback(200, checkObject);
                        } else {
                          callback(500, {
                            error: "There is a server side error.",
                          });
                        }
                      });
                    } else {
                      callback(500, {
                        error: "There is a problem in server side.",
                      });
                    }
                  });
                } else {
                  callback(401, { error: "User has already max check limit." });
                }
              } else {
                callback(403, { error: "Authenticatoion error." });
              }
            });
          } else {
            callback(403, { error: "User not found." });
          }
        });
      } else {
        callback(403, { error: "Authentication error!" });
      }
    });
  } else {
    callback(400, { error: "You have a problem in your request." });
  }
};

handler._check.get = (requestProperties, callback) => {
  const id =
    typeof requestProperties.queryStringObject.id === "string" &&
    requestProperties.queryStringObject.id.trim().length === 20
      ? requestProperties.queryStringObject.id
      : false;

  if (id) {
    data.read("checks", id, (err, checkData) => {
      if (!err && checkData) {
        let token =
          typeof requestProperties.headersObject.token === "string"
            ? requestProperties.headersObject.token
            : false;

        tokenHandler._token.verify(
          token,
          parseJSON(checkData).userPhone,
          (tokenIsValid) => {
            if (tokenIsValid) {
              callback(200, parseJSON(checkData));
            } else {
              callback(403, { error: "Authentication error." });
            }
          }
        );
      } else {
        callback(500, { error: "There is a server side error." });
      }
    });
  } else {
    callback(400, { error: "There is a error in your request." });
  }
};

handler._check.put = (requestProperties, callback) => {
  const id =
    typeof requestProperties.body.id === "string" &&
    requestProperties.body.id.trim().length === 20
      ? requestProperties.body.id
      : false;

  if (id) {
    let protocol =
      typeof requestProperties.body.protocol === "string" &&
      ["http", "https"].indexOf(requestProperties.body.protocol) > -1
        ? requestProperties.body.protocol
        : false;

    let url =
      typeof requestProperties.body.url === "string" &&
      requestProperties.body.url.trim().length > 0
        ? requestProperties.body.url
        : false;

    let method =
      typeof requestProperties.body.method === "string" &&
      ["GET", "POST", "PUT", "DELETE"].indexOf(requestProperties.body.method) >
        -1
        ? requestProperties.body.method
        : false;

    let successCodes =
      typeof requestProperties.body.successCodes === "object" &&
      requestProperties.body.successCodes instanceof Array
        ? requestProperties.body.successCodes
        : false;

    let timeoutSeconds =
      typeof requestProperties.body.timeoutSeconds === "number" &&
      requestProperties.body.timeoutSeconds % 1 === 0 &&
      requestProperties.body.timeoutSeconds >= 1 &&
      requestProperties.body.timeoutSeconds <= 5
        ? requestProperties.body.timeoutSeconds
        : false;

    if (protocol || url || method || successCodes || timeoutSeconds) {
      data.read("checks", id, (err, checkData) => {
        if (!err && checkData) {
          let checkObject = parseJSON(checkData);
          let token =
            typeof requestProperties.headersObject.token === "string"
              ? requestProperties.headersObject.token
              : false;

          tokenHandler._token.verify(
            token,
            checkObject.userPhone,
            (tokenIsValid) => {
              if (tokenIsValid) {
                if (protocol) {
                  checkObject.protocol = protocol;
                }
                if (url) {
                  checkObject.url = url;
                }
                if (method) {
                  checkObject.method = method;
                }
                if (successCodes) {
                  checkObject.successCodes = successCodes;
                }
                if (timeoutSeconds) {
                  checkObject.timeoutSeconds = timeoutSeconds;
                }

                //store the checkObject
                data.update("checks", id, checkObject, (err) => {
                  if (!err) {
                    callback(200, { message: "Check updated!" });
                  } else {
                    callback(500, { error: "There was a server side error." });
                  }
                });
              } else {
                callback(403, { error: "Authentication error." });
              }
            }
          );
        } else {
          callback(500, { error: "There was a problem in the server side." });
        }
      });
    } else {
      callback(400, { error: "You must put at least one item to update." });
    }
  } else {
    callback(400, { error: "Your ID is not valid." });
  }
};

handler._check.delete = (requestProperties, callback) => {
  const id =
    typeof requestProperties.queryStringObject.id === "string" &&
    requestProperties.queryStringObject.id.trim().length === 20
      ? requestProperties.queryStringObject.id
      : false;

  if (id) {
    data.read("checks", id, (err, checkData) => {
      if (!err && checkData) {
        let token =
          typeof requestProperties.headersObject.token === "string"
            ? requestProperties.headersObject.token
            : false;

        tokenHandler._token.verify(
          token,
          parseJSON(checkData).userPhone,
          (tokenIsValid) => {
            if (tokenIsValid) {
              //Delete check
              data.delete("checks", id, (err) => {
                if (!err) {
                  data.read(
                    "users",
                    parseJSON(checkData).userPhone,
                    (err, userData) => {
                      if (!err && userData) {
                        let userObject = parseJSON(userData);
                        let userChecks =
                          typeof userObject.checks === "object" &&
                          userObject.checks instanceof Array
                            ? userObject.checks
                            : [];

                        //remove the deleted check id from user's list of checks
                        let checkPosition = userChecks.indexOf(id);
                        if (checkPosition > -1) {
                          userChecks.splice(checkPosition, 1);

                          //resave the user data
                          userObject.checks = userChecks;
                          data.update(
                            "users",
                            userObject.phone,
                            userObject,
                            (err) => {
                              if (!err) {
                                callback(200, {
                                  message: "Check deleted successfully.",
                                });
                              } else {
                                callback(500, {
                                  error: "there was a server side error.",
                                });
                              }
                            }
                          );
                        } else {
                          callback(500, {
                            error:
                              "The check id you are trying to delete is not found in user data.",
                          });
                        }
                      } else {
                        callback(500, {
                          error: "There was a server side error.",
                        });
                      }
                    }
                  );
                } else {
                  callback(500, { error: "There was a server side error." });
                }
              });
            } else {
              callback(403, { error: "Authentication error." });
            }
          }
        );
      } else {
        callback(500, { error: "There is a server side error." });
      }
    });
  } else {
    callback(400, { error: "There is a error in your request." });
  }
};

module.exports = handler;
