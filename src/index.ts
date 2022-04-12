import * as YAML from "yaml";
import * as fs from "fs";

import mqtt from "./entities/mqtt";
import rollerBlind from "./entities/rollerBlinds";
import * as homeAssistantHandler from "./entities/homeAssistantHandler";
import * as rollerBlindHandler from "./entities/rollerBlindHandler";

try {
  // Get and parse configuration
  const config = YAML.parse(
    fs.readFileSync("./config/configuration.yml", "utf8")
  );

  const { mqtt: mqttConfig, hubs } = config;

  const mqttClient = mqtt(
    mqttConfig,
    homeAssistantHandler.startup({ mqttConfig, hubs })
  );
  hubs.forEach((hub: any) => {
    const blindRollerClient = rollerBlind(
      hub.host,
      hub.port,
      hub.reconnectTime,
      hub.autoReconnectTime
    );

    mqttClient.onMessage(
      homeAssistantHandler.commandsHandler({
        mqttClient,
        blindRollerClient,
        hubs,
      })
    );
    blindRollerClient.onMessage(
      rollerBlindHandler.commandsHandler({
        mqttClient,
        blindRollerClient,
        hubs,
        mqttConfig,
      })
    );
  });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
