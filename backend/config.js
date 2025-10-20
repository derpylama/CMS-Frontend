const { app } = require('electron');
const path = require('path');
const fs = require('fs');

class ConfigManager {
    // This class only writes to file if one exists, autoPersist ensures the file exists, i.e ensures persistence
    constructor(autoPersist = false) {
        this.file = 'config.json';
        this.config = {
            "api": "https://elias.ntigskovde.se/"
        };

        // If config file exists, load it
        this.loadConfigFile();

        // If autoPersist is true and config file does not exist, create it
        if (autoPersist && !this.configFileExists()) {
            this.writeConfigFile();
        }
    }

    getBasePath() {
        if (app.isPackaged) {
            return path.dirname(app.getPath('exe'));
        } else {
            return path.resolve(__dirname, '..');
        }
    }

    getConfigPath() {
        return path.join(this.getBasePath(), this.file);
    }

    configFileExists() {
        return fs.existsSync(this.getConfigPath());
    }

    readConfigFile() {
        if (this.configFileExists()) {
            const json = fs.readFileSync(this.getConfigPath(), 'utf-8');
            try {
                return JSON.parse(json);
            } catch (e) {
                console.error("Error parsing config file:", e);
                return {};
            }

        }
        return {};
    }

    writeConfigFile() {
        if (!this.configFileExists()) {
            fs.writeFileSync(this.getConfigPath(), JSON.stringify(this.config, null, 4), 'utf-8');
        }
    }

    loadConfigFile() {
        this.config = { ...this.config, ...this.readConfigFile() };
    }

    get(key) {
        return this.config[key];
    }

    set(key, value) {
        this.config[key] = value;
        this.writeConfigFile(); // Only writes if file exist
    }

    getAll() {
        return this.config;
    }

    has(key) {
        return key in this.config;
    }
}

module.exports = { ConfigManager };