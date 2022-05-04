import { OnMessageCallback } from "mqtt";

export interface IBlind {
  name: string;
  type: string;
  motor_address: string;
  reverse_direction: boolean;
}

export interface IHub {
  host: string;
  port: number;
  type: string;
  protocol: string;
  bridge_address: string;
  blinds: IBlind[];
}

export interface mqttAttributes {
  broker: string;
  port: number;
  username: string;
  password: string;
  qos: number;
  retain: boolean;
  discovery: boolean;
  discovery_prefix: string;
  topic_prefix: string;
  availability_topic: string;
}

export interface Blinds {
  name: string;
  type: string;
  motor_address: string;
  reverse_direction: boolean;
}

interface Hubs {
  host: string;
  port: number;
  type: string;
  protocol: string;
  bridge_address: string;
  blinds: Blinds[];
}

export interface MqttConnection {
  mqttConfig: mqttAttributes;
  hubs: Hubs;
}

export interface DevicesConnection {
  hubs: Hubs[];
  allowedProtocols: string[];
}

export interface MqttClient {
  onMessage: (callback: OnMessageCallback) => void;
  onPublish: (topic: string, payload: string) => void;
}

export interface BlindRollerClient {
  onMessage: (callback: (data: Buffer) => void) => void;
  write: (data: any, cb?: (error?: Error) => void) => void;
}

export interface UdpClient {
  onMessage: (callback: (data: Buffer) => void) => void;
  send: (data: any, cb?: (error?: Error) => void) => void;
}

export interface IHubCommunication {
  async: boolean;
  timeout: number;
}

export interface Handler {
  blindRollerClient: BlindRollerClient[];
  mqttConfig: any;
  hubs: any;
  mqttClient: MqttClient;
  udpClient: UdpClient[];
  hub_communication: IHubCommunication;
}

export interface RollerBlindHandler {
  mqttClient: MqttClient;
  hubs: any;
  mqttConfig: any;
}

export enum LogType {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}
