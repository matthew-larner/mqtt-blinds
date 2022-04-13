import { logger } from "./utils";

const mqtt = require("mqtt");
const fs = require("fs");
const YAML = require("yaml");

const config = YAML.parse(
  fs.readFileSync("./config/configuration.yml", "utf8")
);
const { mqtt: mqttBroker } = config;
let availability_topic: string;
if (!config.availability_topic) {
  availability_topic = "mqtt-blinds/available";
  console.warn("availability_topic is set to 'mqtt-blinds/available'");
} else {
  availability_topic = config.availability_topic;
}

const client = mqtt.connect(
  `mqtt://${mqttBroker.username}:${mqttBroker.password}@${mqttBroker.broker}:${mqttBroker.port}`,
  {
    will: {
      topic: availability_topic,
      payload: "offline",
      qos: 1,
      retain: true,
    },
  }
);

client.on("connect", function () {
  setInterval(function () {
    const random = Math.random() * 50;

    if (random < 30) {
      client.onPublish("home/light/on", `simple mqtt: ${random.toString()}`);
    }
  }, 3000);
});

client.on("connect", function () {
  client.subscribe("home/light/isOn");
  logger.info("Client has subscribe successfully");
});

client.on("message", function (topic, message) {
  console.log("MESSAGE", message.toString());
});
