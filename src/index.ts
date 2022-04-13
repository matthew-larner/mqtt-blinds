import * as YAML from "yaml";
import * as fs from "fs";

import mqtt from "./entities/mqtt";
import rollerBlind from "./entities/rollerBlinds";
import * as homeAssistantHandler from "./entities/homeAssistantHandler";
import * as rollerBlindHandler from "./entities/rollerBlindsHandler";
import { logger } from "./entities/utils";
import { BlindRollerClient, IHub } from "./contracts";

try {
  // Get and parse configuration
  const config = YAML.parse(
    fs.readFileSync("./config/configuration.yml", "utf8")
  );

  const { mqtt: mqttConfig, hubs } = config;
  if (!mqttConfig.discovery) {
    throw new Error("MQTT Discovery is set to false: cannot go any further");
  }
  const mqttClient = mqtt(
    mqttConfig,
    homeAssistantHandler.startup({ mqttConfig, hubs })
  );
  const blindRollerClient: BlindRollerClient[] = [];
  hubs.forEach((hub: IHub, i: number) => {
    blindRollerClient[hub.bridge_address] = rollerBlind(
      hub.host,
      hub.port,
      hub.reconnectTime,
      hub.autoReconnectTime
    );

    blindRollerClient[hub.bridge_address].onMessage(
      rollerBlindHandler.commandsHandler({
        mqttClient,
        blindRollerClient,
        mqttConfig,
        hubs,
      })
    );
  });
  mqttClient.onMessage(
    homeAssistantHandler.commandsHandler({
      mqttClient,
      blindRollerClient,
      hubs,
    })
  );
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
