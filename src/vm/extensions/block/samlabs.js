import BlockType from '../../extension-support/block-type';
import ArgumentType from '../../extension-support/argument-type';
import translations from './translations.json';
import {SamLabsBLE, SAMDevice} from './device';

// eslint-disable-next-line no-unused-vars
class LEDArg {
    num = '';
    red = 0;
    green = 0;
    blue = 0;
}

/**
 * Formatter which is used for translation.
 * This will be replaced which is used in the runtime.
 * @param {object} messageData - format-message object
 * @returns {string} - message for the locale
 */
let formatMessage = messageData => messageData.default;

/**
 * Setup format-message for this extension.
 */
const setupTranslations = () => {
    const localeSetup = formatMessage.setup();
    if (localeSetup && localeSetup.translations[localeSetup.locale]) {
        Object.assign(
            localeSetup.translations[localeSetup.locale],
            translations[localeSetup.locale]
        );
    }
};

const EXTENSION_ID = 'samlabs';

/**
 * URL to get this extension as a module.
 * When it was loaded as a module, 'extensionURL' will be replaced a URL which is retrieved from.
 * @type {string}
 */
let extensionURL = 'https://Rbel12b.github.io/Scratch/dist/samlabs.mjs';

/**
 * Scratch 3.0 blocks for example of Xcratch.
 */
class ExtensionBlocks {
    /**
     * A translation object which is used in this class.
     * @param {FormatObject} formatter - translation object
     */
    static set formatMessage (formatter) {
        formatMessage = formatter;
        if (formatMessage) setupTranslations();
    }

    /**
     * @return {string} - the name of this extension.
     */
    static get EXTENSION_NAME () {
        return formatMessage({
            id: 'samlabs.name',
            default: 'SAM Labs'
        });
    }

    /**
     * @return {string} - the ID of this extension.
     */
    static get EXTENSION_ID () {
        return EXTENSION_ID;
    }

    /**
     * URL to get this extension.
     * @type {string}
     */
    static get extensionURL () {
        return extensionURL;
    }

    /**
     * Set URL to get this extension.
     * The extensionURL will be changed to the URL of the loading server.
     * @param {string} url - URL
     */
    static set extensionURL (url) {
        extensionURL = url;
    }

    /**
     * Construct a set of blocks for SAM Labs.
     * @param {Runtime} runtime - the Scratch 3.0 runtime.
     */
    constructor (runtime) {
        /**
         * The Scratch 3.0 runtime.
         * @type {Runtime}
         */
        this.runtime = runtime;

        if (runtime.formatMessage) {
            // Replace 'formatMessage' to a formatter which is used in the runtime.
            formatMessage = runtime.formatMessage;
        }
        this.deviceMap = new Map(); // Store multiple devices
        this.numberOfConnectedDevices = 0;
        this.extensionId = 'samlabs';
        this._stopAll = this.stopAll.bind(this);
        this.runtime.on('PROJECT_STOP_ALL', this._stopAll);
        this.runtime.on('PROJECT_RUN_STOP', this._stopAll);
        this.deviceMenu = [];
        this.buttonMenu = [];
        this.motorMenu = [];
        this.servoMenu = [];
        this.rgbMenu = [];
        this.sensorMenu = [];
        this.blocks = [
            {
                opcode: 'connectToDevice',
                blockType: BlockType.COMMAND,
                text: formatMessage({
                    id: 'samlabs.connectToDevice',
                    default: 'Connect a device'
                })
            },
            {
                opcode: 'setLEDColor',
                blockType: BlockType.COMMAND,
                text: formatMessage({
                    id: 'samlabs.setLEDColor',
                    default: 'Set [num] Status Led Color: R[red], G[green], B[blue]'
                }),
                terminal: false,
                arguments: {
                    num: {menu: 'deviceMenu', type: ArgumentType.NUMBER},
                    red: {defaultValue: 0, type: ArgumentType.NUMBER},
                    green: {defaultValue: 0, type: ArgumentType.NUMBER},
                    blue: {defaultValue: 0, type: ArgumentType.NUMBER}
                }
            },
            {
                opcode: 'setLEDRGBColor',
                blockType: BlockType.COMMAND,
                text: formatMessage({
                    id: 'samlabs.setLEDRGBColor',
                    default: 'Set rgb led [num] color: R[red], G[green], B[blue]'
                }),
                terminal: false,
                arguments: {
                    num: {menu: 'rgbMenu', type: ArgumentType.NUMBER},
                    red: {defaultValue: 0, type: ArgumentType.NUMBER},
                    green: {defaultValue: 0, type: ArgumentType.NUMBER},
                    blue: {defaultValue: 0, type: ArgumentType.NUMBER}
                }
            },
            {
                opcode: 'setBlockMotorSpeed',
                blockType: BlockType.COMMAND,
                text: formatMessage({
                    id: 'samlabs.setBlockMotorSpeed',
                    default: 'Set motor [num] speed [val]'
                }),
                terminal: false,
                arguments: {
                    num: {menu: 'motorMenu', type: ArgumentType.NUMBER},
                    val: {defaultValue: 0, type: ArgumentType.NUMBER}
                }
            },
            {
                opcode: 'setBlockServo',
                blockType: BlockType.COMMAND,
                text: formatMessage({
                    id: 'samlabs.setBlockServo',
                    default: 'Set servo [num] angle [val]°'
                }),
                terminal: false,
                arguments: {
                    num: {menu: 'servoMenu', type: ArgumentType.NUMBER},
                    val: {defaultValue: 0, type: ArgumentType.NUMBER}
                }
            },
            {
                opcode: 'getSensorValue',
                blockType: BlockType.REPORTER,
                text: formatMessage({
                    id: 'samlabs.getSensorValue',
                    default: 'Block [num] sensor value'
                }),
                terminal: false,
                arguments: {
                    num: {menu: 'sensorMenu', type: ArgumentType.NUMBER}
                }
            },
            {
                opcode: 'getButton',
                blockType: BlockType.BOOLEAN,
                text: formatMessage({
                    id: 'samlabs.getButton',
                    default: 'Is button [num] pressed'
                }),
                terminal: false,
                arguments: {
                    num: {menu: 'buttonMenu', type: ArgumentType.NUMBER}
                }
            },
            // {
            //     opcode: 'getCelsius',
            //     blockType: BlockType.REPORTER,
            //     text: 'Temperature [num] (°C)',
            //     terminal: false,
            //     arguments: {
            //         num: {menu: 'deviceMenu', type: ArgumentType.NUMBER}
            //     }
            // },
            {
                opcode: 'getBattery',
                blockType: BlockType.REPORTER,
                text: formatMessage({
                    id: 'samlabs.getBattery',
                    default: '[num] battery percentage'
                }),
                terminal: false,
                arguments: {
                    num: {menu: 'deviceMenu', type: ArgumentType.NUMBER}
                }
            }
        ];
        this.DeviceMapping = new Map();
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        setupTranslations();
        return {
            id: ExtensionBlocks.EXTENSION_ID,
            name: ExtensionBlocks.EXTENSION_NAME,
            extensionURL: ExtensionBlocks.extensionURL,
            showStatusButton: false,
            color1: '#0FBD8C',
            color2: '#0DA57A',
            blocks: this.blocks,
            menus: {
                deviceMenu: 'getDeviceMenu',
                buttonMenu: 'getButtonMenu',
                motorMenu: 'getMotorMenu',
                servoMenu: 'getServoMenu',
                rgbMenu: 'getRGBMenu',
                sensorMenu: 'getSensorMenu'
            }
        };
    }
    
    updateDeviceMenu () {
        this.deviceMenu = [];
        this.buttonMenu = [];
        this.motorMenu = [];
        this.servoMenu = [];
        this.rgbMenu = [];
        this.sensorMenu = [];
        this.deviceMap.forEach(device => {
            switch (device.menuId) {
            case 0:
                this.buttonMenu.push({text: device.menuName, value: device.id});
                break;
            case 1:
                this.motorMenu.push({text: device.menuName, value: device.id});
                break;
            case 2:
                this.servoMenu.push({text: device.menuName, value: device.id});
                break;
            case 3:
                this.rgbMenu.push({text: device.menuName, value: device.id});
                break;
            case 4:
                this.sensorMenu.push({text: device.menuName, value: device.id});
                break;
            default:
                break;
            }
            this.deviceMenu.push({text: device.displayName, value: device.id});
        });
        // this.runtime.requestBlocksUpdate(); - messes up the create variable button
    }

    getDeviceMenu () {
        return this.deviceMenu.length ? this.deviceMenu : [{text: '-', value: '-'}];
    }

    getButtonMenu () {
        return this.buttonMenu.length ? this.buttonMenu : [{text: '-', value: '-'}];
    }

    getMotorMenu () {
        return this.motorMenu.length ? this.motorMenu : [{text: '-', value: '-'}];
    }

    getSensorMenu () {
        return this.sensorMenu.length ? this.sensorMenu : [{text: '-', value: '-'}];
    }

    getServoMenu () {
        return this.servoMenu.length ? this.servoMenu : [{text: '-', value: '-'}];
    }

    getRGBMenu () {
        return this.rgbMenu.length ? this.rgbMenu : [{text: '-', value: '-'}];
    }

    /**
     * get the device with the given id
     * @param {string} id the device id
     * @returns {SAMDevice} the device
     */
    getDeviceFromId (id) {
        if (this.DeviceMapping.get(id)) {
            return this.deviceMap.get(this.DeviceMapping.get(id));
        }
        return this.deviceMap.get(id);
    }

    addBlock (newBlock) {
        this.blocks.push(newBlock);
        this.runtime._refreshExtensions(); // Force a refresh of the extension
    }

    stopAll () {
        this.deviceMap.forEach(this.stopDevice.bind(this));
    }

    stopDevice (device) {
        device.writeActor(new Uint8Array([0, 0, 0]), false);
    }

    async connectToDevice () {
        const device = new SAMDevice(this.runtime, this.extensionId);
        const connected = await device.connectToDevice(this.deviceMap, {
            filters: [{
                namePrefix: 'SAM'
            }],
            optionalServices: [SamLabsBLE.battServ, SamLabsBLE.SAMServ]
        });
        if (connected) {
            this.deviceMap.set(device.id, device);
            this.updateDeviceMenu();
        }
    }

    /**
     * set the status led color
     * @param {LEDArg} args color
     * @returns {void}
     */
    async setLEDColor (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return;
        }
        await this.setBlockLedColor(block, {r: args.red, g: args.green, b: args.blue});
    }

    /**
     * set a blocks status led color
     * @param {SAMDevice} block the device
     * @param {Uint8Array} color color in RGB format
     */
    async setBlockLedColor (block, color) {
        const message = new Uint8Array([
            color.r,
            color.g,
            color.b
        ]);
        await block.writeStatusLed(message);
    }

    /**
     * set the RGB (actor) led color
     * @param {LEDArg} args color
     * @returns {void}
     */
    async setLEDRGBColor (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block || !block.ActorAvailable) {
            return;
        }

        const message = new Uint8Array([
            args.red,
            args.green,
            args.blue
        ]);
        await block.writeActor(message);
    }

    async setBlockMotorSpeed (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block || !block.ActorAvailable) {
            return;
        }
        let speed = Number(args.val);
        if (speed < 0) {
            if (speed < -100) {
                speed = -100;
            }
            speed = (Math.abs(speed) * 1.27) + 128;
        } else {
            if (speed > 100) {
                speed = 100;
            }
            speed = speed * 1.27;
        }
        const message = new Uint8Array([speed, 0, 0]);
        await block.writeActor(message);
    }

    async setBlockServo (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block || !block.ActorAvailable) {
            return;
        }
        const angle = Number(args.val);
        const message = new Uint8Array([angle, 0, 0]);
        await block.writeActor(message);
    }

    getSensorValue (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return 0;
        }
        return block.value;
    }

    getButton (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return 0;
        }
        return block.value === 100;
    }

    getCelsius (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return 0;
        }
        return block.value;
    }

    getBattery (args) {
        const block = this.getDeviceFromId(args.num);
        if (!block) {
            return 0;
        }
        return block.battery;
    }
}

export {ExtensionBlocks as default, ExtensionBlocks as blockClass};
