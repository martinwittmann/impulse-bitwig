# Impulse25 Bitwig

An improved control script for the Novation Impulse 25/49/61 allowing Bitwig users to use all features of the Impulse deivces.
Additionally the target of this script is to allow users to access the most important functions of Bitwig directly from the Impulse without using a mouse or comptuer keyboard.

## Basic features

* Working: Midi keyboard 
* Working: Channel aftertouch
* Working: Modwheel
* Working: Pitchbend
* Working: All rotary encoders
* Working: Transport buttons
* Working: Master fader
* Working: Midi/mixer button
* Working: Track select buttons (shift + octave up/down)
* Working: Plugin, midi, mixer, page up, page down buttons
* Working: All drum pads including aftertouch
* Not implemented (yet): Clip launch functions


## Regarding Impulse 49 and 61 versions

Since I don't own these devices for now the 8 faders and fader buttons probably won't work. But while reverse engineering the Impulse's template data I most probably found the relevant midi messages the faders and buttons send. So, as soon I find the time I can add support for these too.


## Advanced features

Since the Impulse device have quite a lot of buttons - and just as important - LEDs and a Display we can send data to, I want to make as many Bitwig features as I can accessible via the Impulse.



## Limitations of the Impulse devices
While reverse engineering and testing all features of the Impulse 25 I came across several things that might not be intutive and owners should know.
Maybe someone from Novation/Focusrite reads this at some point and uses it as inspiration for a firmware update.

* Some, but not all buttons send midi messages both for pressing and releasing them.
* The Midi/mixer button below the master fader sends messages only on button release and sends different CCs depending on the button's state.
* The Octave up/down buttons change the keyboard octave only on button release - this feels slow while performing. (It would be extremely useful if this would send a midi CC message.)
* When changing the octave the display lights up an 'octave' element. But this is only lit directly after pressing an octave button. I'd have expected this to keep being lit as long as the octave is changed.
* (BUG?) When pressing shift + any other button and then releasing them, shift does *not* send a midi message for the button release.
* In midi state (after pressing the midi/page-down button) everytime an ecoder is rotated, the text display is set to 'CC# XX'. So it does not make sense to send a text to display in this case because the Impulse overwrites it immediately. The same goes for the master fader in midi mode.
* The encoders in plugin and mixer state send a CC with the direction of the change while in midi mode they send absolute values. This is a limitation because we can't use the encoders in midi mode for zooming or as buttons since when the absolute value is the minimum or maximum no more midi messages are sent.
* We can change the background color of the drum pads by sending midi messages to the Impulse. BUT only if the device is in clip launch mode. What we can do tough is setting the brightness by sending a midi message.
* In the default template (BascMidi) the rotary encoders 7 and 8 use the same CC values as rewind and fast forward making it impossible to distinguish between them.


## Midi messages the impulse accepts

* Drum pad cc/note on values: Set the brightness of the background led.
* Midi / Plugin / Mixer State
* F0 00 20 29 00 71 0F 5A 00 00 00 06 09 05 F7: Go into boot menu and be ready to receive a firmware update. This is the first part of a firmware update.
* F0 00 20 29 00 70 F7: Get firmware version. Example response: F0 00 20 29 00 70 00 00 06 05 08 00 00 06 09 03 0D F7 == Boot version: 658, Main version: 693
* F0 00 20 29 [sender midi id] 06 01 01 01 F7: Device inquiry + activating the connection to the computer. Example response: F0 00 20 29 67 07 19 F7 == 719 is the device id of the Impulse 25. I can't find the Pdf anymore where I found this but I think 71A is the 49 key version and 71B the Impulse 61.
* F0 00 20 29 00 08 [8 bytes of ascii text] F7: Show the given text on the text display of the Impulse.
* F0 00 20 20 00 09 [3 bytes of ascii text] F7: Display text in the big 3 charachter area of the display.
* F0 00 20 29 43 00 00 [impulse template] F7: Write the given template data into the ram. This is the same as manually changing all settings/mappings and lights up the 'save' element on the display. Meaning that a user can save the current settings as a template.


## Template sysex

At any time when we send the template sysex message we can overwrite the currently selected (or even changed and unsaved) template.

