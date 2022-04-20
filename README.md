# MQTT Blinds

A containerised app to control Acmeda/Dooya roller blinds via MQTT to be used with home automation like Home Assistant.

## How it works

This docker container communicates with motorised blinds via TCP commands. It supports 2-way communication (MQTT->TCP and TCP->MQTT). It will automatically create blinds/curtains in Home Assistant if you have [MQTT discovery enabled](https://www.home-assistant.io/docs/mqtt/discovery/).

## Setup Steps

1. Create a [MQTT server](https://hub.docker.com/_/eclipse-mosquitto)
2. Setup config file `configuration.yml` in `/config` directory (example below)
3. Setup docker compose file (example below)
4. Enable Home Assistant MQTT discovery if integrating with Home Assistant (optional): https://www.home-assistant.io/docs/mqtt/discovery/
5. Run the app by running `docker-compose up --build`

## Example Docker Compose File

```
version: '3'
services:
  mqtt-blinds:
    container_name: mqtt-blinds
    image: matthewlarner/mqtt-blinds:latest
    volumes:
      - ./config:/usr/src/app/config
    environment:
      - TZ=Australia/Sydney
    restart: always
```

## Example Config

```
# MQTT Settings
mqtt:
  broker: 192.168.1.102
  port: 1884
  username: xxxx
  password: xxxx
  qos: 2
  retain: true
  discovery: true
  discovery_prefix: homeassistant
  topic_prefix: mqtt-blinds
  availability_topic: mqtt-blinds/available

# Global TCP Config for Motorised Blind Hub Communication
tcp:
  async: false
  timeout: 10 # seconds

# Motorised Blind Hubs
hubs:
  - host: 192.168.20.201
    port: 1487
    type: 'dooya'
    bridge_address: '123'
    blinds:
      - name: 'Bed 1 Roller Blind'
        type: 'blind'
        motor_address: 'D001'
      - name: 'Bed 1 Curtain'
        type: 'curtain'
        motor_address: 'D002'
  - host: 192.168.20.202
    port: 1487
    type: 'acmeda'
    bridge_address: '' # Leave blank for Acmeda
    blinds:
      - name: 'Kitchen Roller Blind'
        type: 'blind'
        motor_address: 'L40'
      - name: 'Bed 4 Curtain'
        type: 'curtain'
        motor_address: '53T'
```

**Where:**

- `tcp.async`: if `true`, all TCP commands will be run at the same time. If `false`, commands will be queued up and ran in sequence.
- `tcp.timeout`: how long (seconds) to wait before a TCP command times out without getting a response from the hub.
- `hub.host/port` is the host/port of your blind hub
- `hub.type` is the brand of the blind hub. `acmeda` and `dooya` are supported.
- `hub.bridge_address` is the address of the blind hub. You can get this by polling your motorised blind hub/API.
- `blinds.name`: The name to be displayed in Home Assistant
- `blinds.type` is either: `blind` (a motorised roller blind), `curtain` (a motorised curtain or awning)
- `blinds.motor_address`: The address of the motor. You can get this by polling your motorised blind hub/API
