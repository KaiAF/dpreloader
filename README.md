# DataPack reloader server

This is a Express.JS server that will listen to a webhook that will then automatically download a public datapack repo and reload the Minecraft server.

## Config

Modify the config.json file and enter the correct details.

`datapackRepo`          The location to where the datapack is located. Can be on GitHub.

`multiplexer.type`      Either screen or tmux. It is what you use to keep the server online when you are not connected to the VPS.

`multiplexer.paneName`  The name of the screen when you created it.

`server.isBukkit`       If the server is a bukkit (or fork of it), then it will need to run reload confirm.

`server.worldPath`      The path of the world where the datapack should be installed.
