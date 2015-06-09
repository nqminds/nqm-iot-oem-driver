"use strict";

module.exports = (function() {
  var console = process.console ? process.console : global.console;
  var serialModule = require("serialport");
  var delimiter = "\r\n";
  var eventEmitter = require("events").EventEmitter;
  var util = require("util");

  var oemDeviceConfiguration = {
    "emonTH": [
      {
        "name": "temperature",
        "scale": 0.1
      },
      { "name": "external temp",
        "scale": 0.1
      },
      { "name": "humidity",
        "scale": 0.1
      },
      { "name": "voltage",
        "scale": 0.1
      }
    ],
    "emonTx": [
      {
        "name": "power",
        "scale": 1
      },
      {
        "name": "power2",
        "scale": 1
      },
      {
        "name": "power3",
        "scale": 1
      },
      {
        "name": "power4",
        "scale": 1
      },
      {
        "name": "voltage",
        "scale": 0.01
      },
      {
        "name": "temperature",
        "scale": 0.1
      }
    ]
  }

  function OEM(config) {
    eventEmitter.call(this);

    this._config = config;
    this._serialPort = null;
    this._cachedData = {};
  }

  util.inherits(OEM, eventEmitter);

  OEM.prototype.start = function() {
    var self = this;

    // For RFM69CW
//    this._serialPort = new serialModule.SerialPort(this._config.port, { parser: serialModule.parsers.readline(delimiter), baudrate: 57600}, false);

    // For RFM12Pi
    this._serialPort = new serialModule.SerialPort(this._config.port, { parser: serialModule.parsers.readline(delimiter), baudrate: 9600}, false);

    this._serialPort.open(function(err) {
      if (typeof err !== "undefined" && err !== null) {
        console.log("OEM - failed to open port " + self._config.port + " - " + JSON.stringify(err));
      } else {
        console.log("OEM - opened port");

        self._serialPort.on("error", function(e) {
          console.log("OEM - port error: " + JSON.stringify(e));
        });

        self._serialPort.on("data", function (data) {
          if (typeof data !== "undefined" && data !== null) {
            console.log("OEM: " + data);
            onDataReceived.call(self, data);
          }
        });

        // Ensure we're in 433Mhz mode.
        setTimeout(function() { self._serialPort.write("4b"); }, 1000);

        // Set the network group.
        setTimeout(function() { self._serialPort.write(config.getLocal("oemNetwork","210") + "g"); }, 2000);
      }
    });
  };

  function isMonitored(deviceCode) {
    var monitored = -1;
    for (var i = 0; i < this._config.sensors.length; i++) {
      if (this._config.sensors[i].nodeId === deviceCode) {
        monitored = i;
        break;
      }
    }
    return monitored;
  }
  
  var onDataReceived = function(data) {

    var split = data.split(' ');
    if (split.length < 2 || (split[0] !== "OK" && split[0] !== "")) {
      console.log("OEM - ignoring frame: " + data);
    } else {
      var nodeId = parseInt(split[1]);
      var monitorIdx = isMonitored.call(this, nodeId);
      if (monitorIdx >= 0) {
        var monitoredDevice = this._config.sensors[monitorIdx];
        if (oemDeviceConfiguration.hasOwnProperty(monitoredDevice.type)) {
          var deviceConfig = oemDeviceConfiguration[monitoredDevice.type];
          var logObj = {};
          var dataIndex = 2;
          for (var i = 0, len = deviceConfig.length; i < len; i++) {
            if (monitoredDevice.log.hasOwnProperty(deviceConfig[i].name)) {
              var dataItem = ((parseInt(split[dataIndex]) + parseInt(split[dataIndex + 1]) * 256) * deviceConfig[i].scale).toFixed(1);
              logObj[deviceConfig[i].name] = dataItem;
            }
            dataIndex += 2;
          }

          // Check if data has changed.
          var jsonData = JSON.stringify(logObj);
          if (jsonData === this._cachedData[nodeId]) {
            console.log("OEM - data not changed for node " + nodeId);
          } else {
            logObj.timestamp = Date.now();
            this.emit("data", monitoredDevice.feedId, logObj);
            this._cachedData[nodeId] = jsonData;
          }
        } else {
          console.log("OEM - no configuration for device type: " + monitoredDevice.type);
        }
      } else {
        console.log("OEM - ignoring data for node " + nodeId);
      }
    }
  };

  module.exports = OEM;
}());
