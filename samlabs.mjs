class SamLabsExtension {
    constructor(runtime) {
        this.runtime = runtime;
        this.device = null; // BLE eszköz
    }

    // Bluetooth eszköz csatlakoztatása
    async connect() {
        try {
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true, // Esetleg szűrhetsz név vagy szolgáltatás alapján
                optionalServices: ['battery_service'] // Ide kell majd a SAM Labs szolgáltatás UUID-je
            });

            this.device = await device.gatt.connect();
            console.log('Csatlakoztatva:', this.device);
        } catch (error) {
            console.error('Hiba a csatlakozásnál:', error);
        }
    }

    // LED vezérlése (példa)
    async setLED(color) {
        if (!this.device) return;

        // Meg kell határozni a megfelelő BLE szolgáltatás és karakterisztika UUID-jét
        const service = await this.device.gatt.getPrimaryService('custom_service_uuid');
        const characteristic = await service.getCharacteristic('custom_characteristic_uuid');

        // Küldjük az adatokat az eszköznek
        const data = new Uint8Array([color]); // Pl. 0x01 = piros, 0x02 = kék
        await characteristic.writeValue(data);
        console.log('LED színe beállítva:', color);
    }

    getInfo() {
        return {
            id: 'samlabs',
            name: 'SAM Labs',
            blocks: [
                {
                    opcode: 'connect',
                    blockType: Scratch.BlockType.COMMAND,
                    text: 'Csatlakozás a SAM Labs eszközhöz',
                    func: 'connect'
                },
                {
                    opcode: 'setLED',
                    blockType: Scratch.BlockType.COMMAND,
                    text: 'Állítsd be az LED-et [COLOR]',
                    arguments: {
                        COLOR: {
                            type: Scratch.ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    func: 'setLED'
                }
            ]
        };
    }
}

Scratch.extensions.register(new SamLabsExtension());
