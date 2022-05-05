import * as rollerBlindHandler from "./entities/rollerBlindsHandler";
import rollerBlind from "./entities/rollerBlinds";
import * as udpRollerBlindHandler from "./entities/udpRollerBlindsHandler";
import { BlindRollerClient, IHub } from "./contracts";
import udp from "./entities/udp";
import { startup } from "./homeAssistants/startup";
import mqtt from "./entities/mqtt";
import { homeAssistantCommandsHandler } from "./homeAssistants/homeAssistantHandler";
import { FileParser } from "./utilities/utils";

export async function main() {
  try {
    // Get and parse configuration

    const devicesConfig: any = (
      await FileParser("./config/configuration.yml")
    ).readFile();
    const { mqtt: mqttConfig, hubs, hub_communication } = devicesConfig;

    if (!mqttConfig.discovery) {
      throw new Error("MQTT Discovery is set to false: cannot go any further");
    }

    const mqttClient = await mqtt(mqttConfig, startup({ mqttConfig, hubs }));

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
      await homeAssistantCommandsHandler({
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
