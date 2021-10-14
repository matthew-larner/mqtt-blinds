# MQTT Blinds
A containerised app to control Acmeda/Dooya roller blinds via MQTT to be used with home automation like Home Assistant.

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

Refer to https://github.com/matthew-larner/mqtt-blinds/blob/main/configuration.yml.example

## How it works
This docker container communicates with motorised blinds via TCP commands. It supports 2-way communication (MQTT->TCP and TCP->MQTT). It will automatically create the following items in Home Assistant if you have [MQTT discovery enabled](https://www.home-assistant.io/docs/mqtt/discovery/). 

