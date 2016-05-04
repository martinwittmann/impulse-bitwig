function ImpulseEvents(template, controller) {
  var buttons, faders;

  this.getEventType = function(status, data1, data2) {
    if (0xb1 == status && data1 >= 0 && data1 <= 7) {
      // In plugin or mixer mode.
      return 'rotary';
    }
    else if (isChannelController(status)) {
      // TODO: Add fader codes for 49 and 61 key versions.
      if (0 === MIDIChannel(status) && (data1 == faders.channel || data1 == faders.master)) {
        return 'fader';
      }
      else if (
        data1 == buttons.play ||
        data1 == buttons.stop ||
        data1 == buttons.record ||
        data1 == buttons.rewind ||
        data1 == buttons.forward ||
        data1 == buttons.loop ||
        data1 == buttons.pageUp ||
        data1 == buttons.pageDown ||
        data1 == buttons.mixer ||
        data1 == buttons.plugin ||
        data1 == buttons.midi ||
        data1 == buttons.nextTrack ||
        data1 == buttons.prevTrack ||
        data1 == buttons.midiMode ||
        data1 == buttons.mixerMode ||
        data1 == buttons.shift) {
        return 'button';
      }
      else if (
        // TODO: Update event type detection to be able to handle all possible
        //       template settings for rotaries.
        data1 == template.data.rotary1Note.hexByteAt(0) ||
        data1 == template.data.rotary2Note.hexByteAt(0) ||
        data1 == template.data.rotary3Note.hexByteAt(0) ||
        data1 == template.data.rotary4Note.hexByteAt(0) ||
        data1 == template.data.rotary5Note.hexByteAt(0) ||
        data1 == template.data.rotary6Note.hexByteAt(0) ||
        data1 == template.data.rotary7Note.hexByteAt(0) ||
        data1 == template.data.rotary8Note.hexByteAt(0)) {
          return 'rotary';
      }
      else if (
        // TODO: Update event type detection to be able to handle all possible
        //       template settings for rotaries.
        data1 == template.data.pad1Note.hexByteAt(0) ||
        data1 == template.data.pad2Note.hexByteAt(0) ||
        data1 == template.data.pad3Note.hexByteAt(0) ||
        data1 == template.data.pad4Note.hexByteAt(0) ||
        data1 == template.data.pad5Note.hexByteAt(0) ||
        data1 == template.data.pad6Note.hexByteAt(0) ||
        data1 == template.data.pad7Note.hexByteAt(0) ||
        data1 == template.data.pad8Note.hexByteAt(0)) {
          return 'pad';
      }
    } 

    return 'unknown';
  };

  this.handleFaderChange = function(status, data1, data2) {
    var target;
    switch (controller.rotaryState) {

      case 'mixer':
      case 'midi':
        target = controller.mainTrack;
        break;

      default:
        //  Note: We default to setting the channel volume even though the impulse
        // is in mixer mode, because initializing it in midi mode creates an
        // error everytime you want to go to the mixer page.
        // So I simply swapped the meaning of the button below the fader.
        if (faders.channel == data1) {
          target = controller.mainTrack;
          controller.displayText('Master');
        }
        else {
          target = controller.trackBank.getChannel(this.activeTrack);
        }
        break;
    }

    target.getVolume().set(data2, 128);
  };

  this.handleRotaryChange = function(status, data1, data2) {
    switch (controller.rotaryState) {
      case 'plugin':
        this.handlePluginRotaryChange(status, data1, data2);
        break;

      case 'mixer':
        this.handleMixerRotaryChange(status, data1, data2);
        break;

      case 'midi':
        this.handleMidiRotarychange(status, data1, data2);
        break;
    }
  };

  this.handlePluginRotaryChange = function(status, data1, data2) {
    // Data1 is 0-7, so we can use it directly as index.
    var target;

    if (controller.shiftPressed) {
      // We default to modifying macro values, and only modify plugin values
      // directly if shift is pressed.
      target = controller.cursorDevice.getParameter(data1);
    }
    else {
      target = controller.cursorTrack.getPrimaryInstrument().getMacro(data1).getAmount();
    }

    var delta = data2 - 64; // +/- 1 depending on direction
    target.inc(delta, 100); // The second parameter is the full range.
  };

  this.handleMixerRotaryChange = function(status, data1, data2) {
    // Data1 is 0-7, so we can use it as index in combination with the mixer page.
    var track = controller.trackBank.getChannel(data1), target, delta;
    if (!track || !track.exists()) {
      return;
    }
    delta = data2 - 64;

    switch (controller.mixerPage) {
      case 0:
        track.getVolume().inc(delta, 100);
        break;

      case 1:
        track.getPan().inc(delta, 100);
        break;

      case 2:
        target = track.getSend(0);
        if (target) {
          target.inc(delta, 100);
        }
        break;

      case 3:
        track.arm.set(delta > 0);
        break;

      case 4:
        track.solo.set(delta > 0);
        break;

      case 5:
        track.mute.set(delta > 0);
        break;
    }
  };

  this.handleMidiRotarychange = function (status, data1, data2) {

    var target, delta;
    var parameterIndex = data1 - 50;
    // Data1 is 71-78, so we subtract 71 to get 0-7.

    if (7 == parameterIndex) {
      // The last rotary does zooming.
      delta = data2 - controller.midiRotary8Value;
      controller.midiRotary8Value += delta;
      if (delta > 0) {
        controller.application.zoomIn();
      }
      else {
        controller.application.zoomOut();
      }
      host.scheduleTask(controller.moveTransport, [0.00001], 10);
    }
    else if (6 == parameterIndex) {
      delta = data2 - controller.midiRotary7Value;
      controller.midiRotary7Value += delta;
      if (delta > 0) {
        controller.application.arrowKeyRight();
      }
      else {
        controller.application.arrowKeyLeft();
      }
    }

    // For plugin mode data1 is 0-7, but when in rotary state midi it's 21-28.
    // So we need to subtract 21 to get the correct index.
    // !!! NOTE: Suddenly this is not 21 but 71 and I don't know yet what caused the change

    // When in rotary state midi, data2 is an absolute midi value, so we
    // need to set it instead of incresing.
    // The set method (like the inc method) expects a range parameter.
    // This must be 128 because data2 is an absolute midi value (0-127) so it has 128 values.
    //target.set(data2, 128);
  };

  this.handleButtonPress = function(status, button, value) {

    switch (button) {

      case buttons.midiMode:
        // We (ab)use the midi mode as daw/edit mode.
        this.dawMode = true;
        break;

      case buttons.mixerMode:
        controller.dawMode = false;
        break;

      case buttons.shift:
        this.handleShiftPress(value);
        break;

      case buttons.plugin:
        controller.rotaryState = 'plugin';
        controller.displayText(controller.templateTitle);
        host.showPopupNotification(controller.templateTitle);
        controller.highlightModifyableTracks();
        controller.setPluginIndications(true);
        break;

      case buttons.mixer:
        controller.rotaryState = 'mixer';
        controller.displayText(controller.mixerPages[0]);
        host.showPopupNotification(controller.mixerPages[0]);
        // Scroll to the current trackBankPage (in case the active track was changed after leaving mixer mode).
        controller.scrollToTrackBankPage();
        controller.highlightModifyableTracks();
        controller.setPluginIndications(false);
        break;

      case buttons.midi:
        controller.displayText(controller.defaultTemplateTitle);
        host.showPopupNotification(controller.defaultTemplateTitle);
        controller.rotaryState = 'midi';
        controller.highlightModifyableTracks();
        controller.setPluginIndications(false);
        break;

      case buttons.pageUp:
        switch (controller.rotaryState) {
          case 'mixer':
            controller.mixerPage++;
            if (controller.mixerPage < 0) {
              controller.mixerPage = controller.mixerPages.length - 1;
            }
            else if (controller.mixerPage >= controller.mixerPages.length) {
              controller.mixerPage = 0;
            }
            controller.displayText(controller.mixerPages[controller.mixerPage]);
            controller.highlightModifyableTracks();
            break;  
        }
        break;

      case buttons.pageDown:
        switch (controller.rotaryState) {
          case 'mixer':
            controller.mixerPage--;
            if (controller.mixerPage < 0) {
              controller.mixerPage = controller.mixerPages.length - 1;
            }
            else if (controller.mixerPage >= controller.mixerPages.length) {
              controller.mixerPage = 0;
            }
            controller.displayText(controller.mixerPages[controller.mixerPage]);
            controller.highlightModifyableTracks();
            break;  
        }
        break;

      case buttons.rewind:
        controller.rewindPressed = !!value;

        if (!!value) {
          host.scheduleTask(controller.moveTransport, [controller.shiftPressed ? -0.3 : -0.02], 0);
        }
        break;

      case buttons.forward:
        controller.forwardPressed = !!value;

        if (!!value) {
          host.scheduleTask(controller.moveTransport, [controller.shiftPressed ? 0.3 : 0.02], 0);
        }
        break;

      case buttons.stop:
        if (!!value) {
          controller.transport.stop();
        }
        break;

      case buttons.play:
        if (!!value) {
          controller.transport.togglePlay();
        }
        break;

      case buttons.loop:
        if (!!value) {
          controller.transport.toggleLoop();
        }
        break;

      case buttons.record:
        if (!!value) {
          controller.transport.record();
        }
        break;

      case buttons.nextTrack:
        if ('mixer' == controller.rotaryState) {
          controller.trackBank.scrollTracksPageDown();
        }
        else {
          controller.cursorTrack.selectNext();
          controller.highlightModifyableTracks();
        }

        // See "Regarding shift" at the top
        this.handleShiftPress(0);
        break;

      case buttons.prevTrack:
        if ('mixer' == controller.rotaryState) {
          controller.trackBank.scrollTracksPageUp();
        }
        else {
          controller.cursorTrack.selectPrevious();
          controller.highlightModifyableTracks();
        }
        break;
    }
  };

  this.handlePadPress = function(status, data1, data2) {
    var padIndex, midiChannel, padPressed;

    switch (data1) {
      case template.data.pad1Note.hexByteAt(0):
        padIndex = 1;
        break;

      case template.data.pad2Note.hexByteAt(0):
        padIndex = 2;
        break;

      case template.data.pad3Note.hexByteAt(0):
        padIndex = 3;
        break;

      case template.data.pad4Note.hexByteAt(0):
        padIndex = 4;
        break;

      case template.data.pad5Note.hexByteAt(0):
        padIndex = 5;
        break;
        
      case template.data.pad6Note.hexByteAt(0):
        padIndex = 6;
        break;
        
      case template.data.pad7Note.hexByteAt(0):
        padIndex = 7;
        break;
        
      case template.data.pad8Note.hexByteAt(0):
        padIndex = 8;
        break;

      default:
        // This is not a pad press. If we get here, we have a bug somehwere.
        println('handlePadPress(): Could not determine which pad was pressed. data1 == ' + data1);
        return;
    }



    midiChannel = MIDIChannel(status);
    padPressed = controller['pad' + padIndex + 'Pressed'];

    if (controller.shiftPressed) {
      var isKeyDown = !padPressed && data2 > 0;
      if (isKeyDown) {
        controller.application.getAction('show_insert_popup_browser').invoke();
        controller.application.getAction('focus_or_toggle_browser_panel').invoke();
      }
    }
    else {
      if (false === padPressed) {
        if (data2 > 0) {
          // We have a audible velocity value and the note is not playing, so we
          // send note on.
          controller['pad' + padIndex + 'Pressed'] = true;
          controller.sendMidiToBitwig(0x90 | midiChannel, data1, data2);
        }
        else {
          // The note is already playing so we could send channel aftertouch.
          // But aftertouch on the pads ist sent independent from the note/cc settings.
          // So we dont need to to send it manually.
        }
      }
      else if (0 === data2) {
        // The note is already playing and the velocity is 0. So we send note off.
        controller['pad' + padIndex + 'Pressed'] = false;
        controller.sendMidiToBitwig(0x80 | midiChannel, data1, 0x00);
      }
    }
  };

  this.handleShiftPress = function(value) {
    value = !!value; // Convert to boolean
    controller.shiftPressed = value;

    if (value) {
      controller.setSilentVelocityTranslationTable();      
    }
    else {
      controller.setDefaultVelocityTranslationTable();      
    }

    switch (controller.rotaryState) {
      case 'plugin':
        for (var i=0;i<8;i++) {
          controller.cursorTrack.getPrimaryInstrument().getMacro(i).getAmount().setIndication(!value);
          controller.cursorDevice.getParameter(i).setIndication(value);
        }
        break;
    }
  };

  this.onMidi = function(status, data1, data2) {
    printMidi(status, data1, data2);
    var eventType = this.getEventType(status, data1, data2);

    if (isChannelController(status)) {
      switch (eventType) {
        case 'fader':
          this.handleFaderChange(status, data1, data2);
          sendMidi(status, data1, data2);
          break;

        case 'rotary':
          this.handleRotaryChange(status, data1, data2);
          break;

        case 'button':
          this.handleButtonPress(status, data1, data2);
          break;

        case 'pad':
          this.handlePadPress(status, data1, data2);
          break;

        default:
          //println('unknown event type for midi msg: ' + status + ' ' + data1 + ' ' + data2);
      }
    }
  };

  this.onSysex = function(data) {
    printSysex(data);
  };

  this.init = function(controller) {
    buttons = controller.buttons;
    faders = controller.faders;
  };

  this.init(controller);
}