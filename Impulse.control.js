loadAPI(1);

load('Impulse/controller.js');
var impulse25 = new BitwigController();


// Define the device and make it available to Bitwig.
// According to the documentation this needs to be called from the global scope.
host.defineController(
  impulse25.device.vendor,
  impulse25.device.name,
  impulse25.device.version,
  impulse25.device.uuid
);

host.defineMidiPorts(impulse25.device.numMidiOutPorts, impulse25.device.numMidiInPorts);
// TODO Add correct device names to enable auto discovery.
host.addDeviceNameBasedDiscoveryPair(["Impulse", "MIDIIN2 (Impulse)"], ["Impulse"]);

function init() {
  impulse25.init();
}

