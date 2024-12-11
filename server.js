require('dotenv').config();
const { execSync } = require('child_process');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const os = require('os');
const fs = require('fs');
const path = require('path');
const app = express();

app.enable('trust proxy');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

/**
 * @type {{"datapacks":[{datapackRepo:string,resourceRepo:string,multiplexer:{type:string,paneName:string},server:{isBukkit:boolean,worldPath:string}}],PORT:number,ratelimit:{limit:number,maxTime:number}}}
 */
const config = JSON.parse(fs.readFileSync('config.json').toString());

(function () {
  if (!config || !config.datapacks || config.datapacks.length === 0) {
    console.error('Could not find datapacks in config');
    process.exit(1);
  }

  for (let i = 0; i < config.datapacks.length; i++) {
    const datapack = config.datapacks[i];
    try {
      new URL(datapack.datapackRepo);
    } catch (e) {
      console.error(`'${datapack.datapackRepo}' is an invalid URL. Closing.`);
      process.exit(1);
    }
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
        execSync('cd ./resourcePack && zip -r pack.zip *');
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
    const body = JSON.parse(req.body.payload);
    for (let i = 0; i < config.datapacks.length; i++) {
      const datapack = config.datapacks[i];
      if (datapack.datapackRepo.trim() === body.repository.clone_url.trim()) {
        if (!fs.existsSync(datapack.server.worldPath)) {
          fs.mkdirSync(datapack.server.worldPath, { recursive: true });
          console.warn('Created directory since it was not found: ' + datapack.server.worldPath);
        } else {
          fs.rmSync(datapack.server.worldPath, { recursive: true });
        }

        execSync(`git clone ${datapack.datapackRepo} ${datapack.server.worldPath}`);

        try {
          switch (datapack.multiplexer.type) {
            case 'tmux':
              execSync(`tmux send-keys -t ${datapack.multiplexer.paneName}:0 "reload${datapack.server.isBukkit ? ' confirm' : ''}" C-m`);
              break;
            case 'screen':
              execSync(`screen -X -S ${datapack.multiplexer.paneName} stuff "reload${datapack.server.isBukkit ? ' confirm' : ''}^M"`);
              break;
            default:
              execSync(`reload${datapack.server.isBukkit ? ' confirm' : ''}`);
              break;
          }
        } catch (e) {
          console.warn(e);
          execSync(`reload${datapack.server.isBukkit ? ' confirm' : ''}`);
        }

        break;
      }
    }

    res.json({ OK: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ OK: false, e });
  }
});

app.post('/upload-resource-pack', async function (req, res) {
  try {
    const body = JSON.parse(req.body.payload);
    for (let i = 0; i < config.datapacks.length; i++) {
      const datapack = config.datapacks[i];
      if (datapack.datapackRepo.trim() === body.payload.repository.clone_url.trim()) {
        if (fs.existsSync('./resourcePack')) fs.rmSync('./resourcePack', { recursive: true });
        execSync(`git clone ${datapack.resourceRepo} ./resourcePack`);
        break;
      }
    }

    res.json({ OK: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ OK: false, e });
  }
});

app.all('*', (req, res) => res.status(404).send());

app.listen(config.PORT || 8080, () => console.log(`Website is enabled on port: ${config.PORT || 8080}`));