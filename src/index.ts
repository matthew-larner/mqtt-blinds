import * as rollerBlindHandler from "./entities/rollerBlindsHandler";
import rollerBlind from "./entities/rollerBlinds";
import * as udpRollerBlindHandler from "./entities/udpRollerBlindsHandler";
import { BlindRollerClient, IHub, UdpClient } from "./contracts";
import udp from "./entities/udp";
import { startup } from "./homeAssistants/startup";
import mqtt from "./entities/mqtt";
import { homeAssistantCommandsHandler } from "./homeAssistants/homeAssistantHandler";
import { FileParser, hubAvailabilityTopic } from "./utilities/utils";

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

    mqttConfig.availability_topic = mqttConfig.availability_topic || "mqtt-blind/available";
    const mqttClient = await mqtt(mqttConfig, startup({ mqttConfig, hubs }),
      hubs.filter(hub => hub.protocol.toLowerCase() === "tcp")
        .map(hub => hubAvailabilityTopic(mqttConfig, hub)));

    const blindRollerClient: { [key: string]: BlindRollerClient } = {};
    const udpClient: { [key: string]: UdpClient } = {};

    // connect to all hub ip ports
    for (const hub of hubs as IHub[]) {
      const key = `${hub.host}:${hub.port}`;
      if (hub.protocol.toLowerCase() === "udp") {
        udpClient[key] = await udp(hub.host, hub.port);

        // listen for UDP Client
        udpClient[key].onMessage(
          await udpRollerBlindHandler.udpRollerBlindsCommandsHandler({
            mqttClient,
            mqttConfig,
            hubs: [hub],
          })
        );
      } else if (hub.protocol.toLowerCase() === "tcp") {
        blindRollerClient[key] = await rollerBlind(
          hub.host,
          hub.port
        );

        blindRollerClient[key].onStatus(online =>
          mqttClient.setHubAvailability(hubAvailabilityTopic(mqttConfig, hub), online));

        // listen TCP Client
        await blindRollerClient[key].onMessage(
          await rollerBlindHandler.rollerBlindsCommandsHandler({
            mqttClient,
            mqttConfig,
            hubs: [hub],
          })
        );
      } else {
        console.error(`${hub.protocol} Protocol not recognize!.`);
      }
    }

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
