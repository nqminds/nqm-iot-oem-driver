const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const _ = require("lodash");
const OEMDriver = require("../lib/oem-driver");

chai.should();
chai.use(chaiAsPromised);

const testConfig = {
  "type": "OEM",
  "port": "/dev/ttyAMA0",
  "oemNetwork": 210,
  "sensors": [
    {
      "id": "power",
      "feedId": "test1",
      "type": "emonTx",
      "nodeId": 10,
      "log": {"power": true},
    },
    {
      "id": "t/h",
      "feedId": "test2",
      "type": "emonTH",
      "nodeId": 19,
      "log": {"temperature": true, "humidity": true},
    },
  ],
};

const oemDriver = new OEMDriver(testConfig);

describe("Start", function() {
  this.timeout(10000);
  it("Should start", function() {
    return oemDriver.start().should.eventually.be.fulfilled;
  });
});

describe("Emit", function() {
  this.timeout(10000);
  it("Should emit data", function() {
    return new Promise((resolve, reject) => {
      oemDriver.on("data", (feedId, data) => {
        if (_.find(testConfig.sensors, (sensor) => sensor.feedId === feedId)) {
          resolve();
        } else {
          reject();
        }
      });
    }).should.eventually.be.fulfilled;
  });
});

describe("Stop", function() {
  it("Should stop", function() {
    return oemDriver.stop().should.eventually.be.fulfilled;
  });
});
