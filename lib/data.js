//dependencies
const fs = require("fs");
const path = require("path");

//module scaffolding
const lib = {};

//base dir of the data folder
lib.basedir = path.join(__dirname, "../.data/");

//write data to file
lib.create = (dir, file, data, callback) => {
  //open file
  fs.open(
    lib.basedir + dir + "/" + file + ".json",
    "wx",
    (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        // convert data to string
        const stringData = JSON.stringify(data);

        //write data to file
        fs.writeFile(fileDescriptor, stringData, (err) => {
          if (!err) {
            fs.close(fileDescriptor, (err) => {
              if (!err) {
                callback(false);
              } else {
                callback("error closing file");
              }
            });
          } else {
            callback("Error writing to file!");
          }
        });
      } else {
        callback("Could not create new file, it may already exists!");
      }
    }
  );
};

//read data from file
lib.read = (dir, file, callback) => {
  fs.readFile(lib.basedir + dir + "/" + file + ".json", "utf8", (err, data) => {
    callback(err, data);
  });
};

//update existing file
lib.update = (dir, file, data, callback) => {
  fs.open(
    lib.basedir + dir + "/" + file + ".json",
    "r+",
    (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        const stringData = JSON.stringify(data);

        fs.ftruncate(fileDescriptor, (err) => {
          if (!err) {
            fs.writeFile(fileDescriptor, stringData, (err) => {
              if (!err) {
                fs.close(fileDescriptor, (err) => {
                  if (!err) {
                    callback(false);
                  } else {
                    callback("error closing file");
                  }
                });
              } else {
                callback("Error writing to file!");
              }
            });
          } else {
            console.log("Error in truncating file");
          }
        });
      } else {
        console.log(`Error updating, file may not exist`);
      }
    }
  );
};

//Delete file
lib.delete = (dir, file, callback) => {
  fs.unlink(lib.basedir + dir + "/" + file + ".json", (err) => {
    if (!err) {
      callback(false);
    } else {
      callback("Error deleting file");
    }
  });
};

module.exports = lib;
