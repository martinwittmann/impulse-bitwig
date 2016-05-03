# Impulse25 Bitwig

An improved control script for the Novation Impulse 25/49/61 allowing Bitwig users to use all features of the Impulse devices.
Additionally the target of this script is to allow users to access the most important functions of Bitwig directly from the Impulse without using a mouse or computer keyboard.

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

Since the Impulse devices have quite a lot of buttons and LEDs and a Display we can send data to, I want to make as many Bitwig features as I can accessible via the Impulse.


## Limitations of the Impulse devices
While reverse engineering and testing all features of the Impulse 25 I came across several things that might not be intutive and owners should know.
Maybe someone from Novation/Focusrite reads this at some point and uses it as inspiration for firmware updates.

* Some, but not all buttons send midi messages both for pressing and releasing them.
* The Midi/mixer button below the master fader sends messages only on button release and sends different CCs depending on the button's state.
* The Octave up/down buttons change the keyboard octave only on button release - this feels slow while performing. (It would be extremely useful if this would send a midi CC message.)
* When changing the octave the display lights up an 'octave' element. But this is only lit directly after pressing an octave button. I'd have expected this to keep being lit as long as the octave is changed.
* (BUG?) When pressing shift + any other button and then releasing them, shift does *not* send a midi message for the button release.
* In midi state (after pressing the midi/page-down button) everytime an ecoder is rotated, the text display is set to 'CC# XX'. It's not possible to send text to the display in this case because it gets overwritten immediately. The same goes for the master fader in midi mode.
* The encoders in plugin and mixer state send a CC with the direction of the change while in midi mode they send absolute values. This is a limitation because we can't use the encoders in midi mode as generic buttons since when the absolute value is the minimum or maximum no more midi messages are sent.
* We can change the background color of the drum pads by sending midi messages to the Impulse. BUT only if the device is in clip launch mode. What we can do tough is setting the brightness by sending a midi message.
* In the default template (BascMidi) the rotary encoders 7 and 8 use the same CC values as rewind and fast forward making it impossible to distinguish between them.
* There's no way of programmatically triggering a dump of the current template. If we could do this it would be possible to programmatically change specific values which would enable us to add many features that are impossible right now.  

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


## Color codes for the dum pads:

When the impulse is in clip launch mode (and only then), we can set the pad's colors by sending CC events: sendNoteOn(0xb0, 60 + [0-7], [color]);
These are the available colors:

<table>
  <tr>
    <td>0</td>
    <td>Off</td>
  </tr>
  <tr>
    <td>1</td>
    <td>Red dark</td>
  </tr>
  <tr>
    <td>2</td>
    <td>Red medium</td>
  </tr>
  <tr>
    <td>3</td>
    <td>Red full</td>
  </tr>
  <tr>
    <td>4</td>
    <td>Off</td>
  </tr>
  <tr>
    <td>5</td>
    <td>same as 1</td>
  </tr>
  <tr>
    <td>6</td>
    <td>same as 2</td>
  </tr>
  <tr>
    <td>7</td>
    <td>same as 3</td>
  </tr>
  <tr>
    <td>8</td>
    <td>Red dark blinking</td>
  </tr>
  <tr>
    <td>9</td>
    <td>Red medium1 blinking</td>
  </tr>
  <tr>
    <td>10</td>
    <td>Red medium2 blinking</td>
  </tr>
  <tr>
    <td>11</td>
    <td>Red full blinking</td>
  </tr>
  <tr>
    <td>12</td>
    <td>same as 8</td>
  </tr>
  <tr>
    <td>13</td>
    <td>same as 9</td>
  </tr>
  <tr>
    <td>14</td>
    <td>same as 10</td>
  </tr>
  <tr>
    <td>15</td>
    <td>same as 11</td>
  </tr>
  <tr>
    <td>16:</td>
    <td>Green</td>
  </tr>
  <tr>
    <td>17</td>
    <td>Yellowish green</td>
  </tr>
  <tr>
    <td>18</td>
    <td>Light orange</td>
  </tr>
  <tr>
    <td>19</td>
    <td>Orange</td>
  </tr>
  <tr>
    <td>20</td>
    <td>same as 16</td>
  </tr>
  <tr>
    <td>21</td>
    <td>same as 17</td>
  </tr>
  <tr>
    <td>22</td>
    <td>same as 18</td>
  </tr>
  <tr>
    <td>23</td>
    <td>same as 19</td>
  </tr>
  <tr>
    <td>24</td>
    <td>Green blinking</td>
  </tr>
  <tr>
    <td>25</td>
    <td>Yellowish green blinking</td>
  </tr>
  <tr>
    <td>26</td>
    <td>Light orange blinking</td>
  </tr>
  <tr>
    <td>27</td>
    <td>Orange blinking</td>
  </tr>
  <tr>
    <td>28</td>
    <td>same as 24</td>
  </tr>
  <tr>
    <td>29</td>
    <td>same as 25</td>
  </tr>
  <tr>
    <td>30</td>
    <td>same as 26</td>
  </tr>
  <tr>
    <td>31</td>
    <td>same as 27</td>
  </tr>
  <tr>
    <td>32</td>
    <td>Green</td>
  </tr>
  <tr>
    <td>33</td>
    <td>Yellowish green</td>
  </tr>
  <tr>
    <td>34</td>
    <td>Greenish yellow</td>
  </tr>
  <tr>
    <td>35</td>
    <td>Yellow</td>
  </tr>
  <tr>
    <td>36</td>
    <td>same as 32</td>
  </tr>
  <tr>
    <td>37</td>
    <td>same as 33</td>
  </tr>
  <tr>
    <td>38</td>
    <td>same as 34</td>
  </tr>
  <tr>
    <td>39</td>
    <td>same as 35</td>
  </tr>
  <tr>
    <td>40</td>
    <td>Green blinking</td>
  </tr>
  <tr>
    <td>41</td>
    <td>Yellowish gree blinking</td>
  </tr>
  <tr>
    <td>42</td>
    <td>Greenish-yellow blinking</td>
  </tr>
  <tr>
    <td>43</td>
    <td>Yellow blinking</td>
  </tr>
  <tr>
    <td>44</td>
    <td>same as 40</td>
  </tr>
  <tr>
    <td>45</td>
    <td>same as 41</td>
  </tr>
  <tr>
    <td>46</td>
    <td>same as 42</td>
  </tr>
  <tr>
    <td>47</td>
    <td>same as 43</td>
  </tr>
  <tr>
    <td>48</td>
    <td>same as 32</td>
  </tr>
  <tr>
    <td>49</td>
    <td>same as 33</td>
  </tr>
  <tr>
    <td>50</td>
    <td>same as 34</td>
  </tr>
  </tr>
  <tr>
    <td>51</td>
    <td>same as 35</td>
  </tr>
  </tr>
  <tr>
    <td>52</td>
    <td>same as 36</td>
  </tr>
  <tr>
    <td>53</td>
    <td>same as 37</td>
  </tr>
  <tr>
    <td>54</td>
    <td>same as 38</td>
  </tr>
  <tr>
    <td>55</td>
    <td>same as 39</td>
  </tr>
  <tr>
    <td>56</td>
    <td>same as 40</td>
  </tr>
  <tr>
    <td>57</td>
    <td>same as 41</td>
  </tr>
  <tr>
    <td>58</td>
    <td>same as 42</td>
  </tr>
  <tr>
    <td>59</td>
    <td>same as 43</td>
  </tr>
  <tr>
    <td>60</td>
    <td>same as 44</td>
  </tr>
  <tr>
    <td>61</td>
    <td>same as 45</td>
  </tr>
  <tr>
    <td>62</td>
    <td>same as 46</td>
  </tr>
  <tr>
    <td>63</td>
    <td>same as 47</td>
  </tr>
  <tr>
    <td>64</td>
    <td>same as 0</td>
  </tr>
  <tr>
    <td>65</td>
    <td>same as 1</td>
  </tr>
  <tr><td colspan="2">&hellip;</td></tr>
</table>

 