require('dotenv').config();
const { execSync } = require('child_process');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const os = require('os');
const fs = require('fs');
const path = require('path');
const app = express();

app.enable('trust proxy');

const config = JSON.parse(fs.readFileSync('config.json').toString());

(function () {
  try {
    new URL(config.datapackRepo);
  } catch (e) {
    console.error(`'${config.datapackRepo}' is an invalid URL. Closing.`);
    process.exit(1);
  }
})();

const MaxRequests = rateLimit({
  windowMs: config.ratelimit.maxTime,
  limit: config.ratelimit.limit,
  message: 'Too many requests were made in a short amount of time. Please try again later.'
});

app.use(MaxRequests);

app.get('/pack.zip', async function (req, res) {
  try {
    if (!fs.existsSync('./resourcePack')) return res.sendStatus(404);
    if (!fs.existsSync('./resourcePack/pack.zip')) {
      // create new .zip pack
      if (os.platform() == 'win32') {
        execSync('cd ./resourcePack && tar.exe -a -c -f pack.zip .');
      } else {
        execSync('cd ./resourcePack && zip pack.zip *');
      }
    }

    res.sendFile(path.join(__dirname, './resourcePack/pack.zip'));
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.post('/upload', async function (req, res) {
  try {
    if (!fs.existsSync(config.server.worldPath)) {
      fs.mkdirSync(config.server.worldPath, { recursive: true });
      console.warn('Created directory since it was not found: ' + config.server.worldPath);
    } else {
      fs.rmSync(config.server.worldPath, { recursive: true });
    }
    execSync(`git clone ${config.datapackRepo} ${config.server.worldPath}`);
    try {
      switch (config.multiplexer.type) {
        case 'tmux':
          execSync(`tmux send-keys -t ${config.multiplexer.paneName}:0 "reload${config.server.isBukkit ? ' confirm' : ''}" C-m`);
          break;
        case 'screen':
          execSync(`screen -X -S ${config.multiplexer.paneName} stuff "reload${config.server.isBukkit ? ' confirm' : ''}^M"`);
          break;
        default:
          execSync(`reload${config.server.isBukkit ? ' confirm' : ''}`);
          break;
      }
    } catch (e) {
      console.warn(e);
      execSync(`reload${config.server.isBukkit ? ' confirm' : ''}`);
    }
    res.json({ OK: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ OK: false, e });
  }
});

app.post('/upload-resource-pack', async function (req, res) {
  try {
    if (fs.existsSync('./resourcePack')) fs.rmSync('./resourcePack', { recursive: true });
    execSync(`git clone ${config.resourceRepo} ./resourcePack`);

    res.json({ OK: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ OK: false, e });
  }
});

app.all('*', (req, res) => res.status(404).send());

app.listen(config.PORT || 8080, () => console.log(`Website is enabled on port: ${config.PORT || 8080}`));