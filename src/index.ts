import * as YAML from "yaml";
import * as fs from "fs";

import mqtt from "./entities/mqtt";
import rollerBlind from "./entities/rollerBlinds";
import * as homeAssistantHandler from "./entities/homeAssistantHandler";
import * as rollerBlindHandler from "./entities/rollerBlindsHandler";
import { BlindRollerClient, IHub } from "./contracts";

export async function main() {
  try {
    // Get and parse configuration
    const config = YAML.parse(
      fs.readFileSync("./config/configuration.yml", "utf8")
    );

    const { mqtt: mqttConfig, hubs } = config;

    if (!mqttConfig.discovery) {
      throw new Error("MQTT Discovery is set to false: cannot go any further");
    }

    // connect to mqtt and prepare subscription
    const mqttClient = mqtt(
      mqttConfig,
      homeAssistantHandler.startup({ mqttConfig, hubs })
    );

    const blindRollerClient: BlindRollerClient[] = [];

    // connect to all hub ip ports
    hubs.forEach((hub: IHub) => {
      blindRollerClient[hub.bridge_address] = rollerBlind(
        hub.host,
        hub.port,
        hub.reconnectTime,
        hub.autoReconnectTime
      );

      // listen blindRoller message per hub address
      blindRollerClient[hub.bridge_address].onMessage(
        rollerBlindHandler.rollerBlindsCommandsHandler({
          mqttClient,
          mqttConfig,
          hubs,
        })
      );
    });

    // listen mqtt messages
    mqttClient.onMessage(
      await homeAssistantHandler.homeAssistantCommandsHandler({
        blindRollerClient,
        mqttConfig,
        hubs,
        mqttClient,
      })
    );
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
main();
