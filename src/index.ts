import * as YAML from "yaml";
import * as fs from "fs";
import udp from "./entities/udp";
import mqtt from "./entities/mqtt";
import rollerBlind from "./entities/rollerBlinds";
import * as homeAssistantHandler from "./entities/homeAssistant/homeAssistantHandler";
import * as rollerBlindHandler from "./entities/rollerBlindsHandler";
import * as udpRollerBlindHandler from "./entities/udpRollerBlindsHandler";
import { BlindRollerClient, IHub } from "./contracts";

export async function main() {
  try {
    // Get and parse configuration
    const config = YAML.parse(
      fs.readFileSync("./config/configuration.yml", "utf8")
    );

    const { mqtt: mqttConfig, hubs, hub_communication } = config;

    if (!mqttConfig.discovery) {
      throw new Error("MQTT Discovery is set to false: cannot go any further");
    }

    // connect to mqtt and prepare subscription
    const mqttClient = mqtt(
      mqttConfig,
      homeAssistantHandler.startup({ mqttConfig, hubs })
    );

    const blindRollerClient: BlindRollerClient[] = [];
    const udpClient: [] = [];

    // connect to all hub ip ports
    hubs.forEach(async (hub: IHub, i) => {
      if (hub.protocol.toLowerCase() === "udp") {
        udpClient[hub.bridge_address] = await udp(hub.host, hub.port);

        // listen for UDP Client
        udpClient[hub.bridge_address].onMessage(
          udpRollerBlindHandler.udpRollerBlindsCommandsHandler({
            mqttClient,
            mqttConfig,
            hubs,
          })
        );
      } else if (hub.protocol.toLowerCase() === "tcp") {
        blindRollerClient[hub.bridge_address] = await rollerBlind(
          hub.host,
          hub.port
        );

        // listen TCP Client
        await blindRollerClient[hub.bridge_address].onMessage(
          await rollerBlindHandler.rollerBlindsCommandsHandler({
            mqttClient,
            mqttConfig,
            hubs,
          })
        );
      } else {
        console.error(`${hub.protocol} Protocol not recognize!.`);
      }
    });

    mqttClient.onMessage(
      await homeAssistantHandler.homeAssistantCommandsHandler({
        blindRollerClient,
        mqttConfig,
        hubs,
        mqttClient,
        udpClient,
        hub_communication,
      })
    );
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
main();
