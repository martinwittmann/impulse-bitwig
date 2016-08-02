function ImpulseEvents(template, controller) {
  var buttons, faders;
  this.encoderAsButtonStatus = {};

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

    if ('mixer' == controller.state[controller.state.mode].page) {
      target = controller.mainTrack;
    }
    else {
      target = controller.trackBank.getChannel(controller.activeTrack);
    }
    target.getVolume().set(data2, 128);
  };

  this.handleRotaryChange = function(status, data1, data2) {
    switch (controller.state[controller.state.mode].page) {
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

    if ('daw' == controller.state.mode) {
      // If in daw mode we use the encoders as buttons in plugin state because
      // they send up and down CC codes instead of absolute values.

      switch (data1) {
        case 0:
          // Focus different panels of Bitwig.
          this.handleEncoderAsButton(status, data1, data2, function(status, data1, data2) {
            var movedLeft = 0x3F == data2; // 0x3F == left/down, 0x41 == right/up
            var action = 'Focus ' + (movedLeft ? 'previous' : 'next') + ' panel'; 
            controller.application.getAction(action).invoke();
          });
          break;

        case 6:
          // Generic arrow left / right
          this.handleEncoderAsButton(status, data1, data2, function(direction) {
            if (direction < 0) {
              controller.application.arrowKeyLeft();
            }
            else {
              controller.application.arrowKeyRight();
            }
          }, 3);
          break;

        case 7:
          // Generic arrow up /down
          this.handleEncoderAsButton(status, data1, data2, function(direction) {
            if (direction < 0) {
              controller.application.arrowKeyUp();
            }
            else {
              controller.application.arrowKeyDown();
            }
          }, 3);
          break;
      }

    }
    else {
      // The regular plugin state.
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
    }
  };

  this.handleEncoderAsButton = function(status, data1, data2, actionCallback, threshold) {
    threshold = threshold || 4;
    var direction = data2 - 0x40; // Depending on the speed of change this gets us +-1 for regular and up to -+4/5 for fast changes.

    if ('undefined' == typeof this.encoderAsButtonStatus[data1 + '-' + status]) {
      this.encoderAsButtonStatus[data1 + '-' + status] = direction;
    }
    else if (this.encoderAsButtonStatus[data1 + '-' + status] < 0 && direction > 0 || this.encoderAsButtonStatus[data1 + '-' + status] > 0 && direction < 0) {
      // Reset the status if the direction changed.
      this.encoderAsButtonStatus[data1 + '-' + status] = direction;
    }
    else {
      this.encoderAsButtonStatus[data1 + '-' + status] += direction;
    }

    if (Math.abs(this.encoderAsButtonStatus[data1 + '-' + status]) > threshold) {
      delete this.encoderAsButtonStatus[data1 + '-' + status];
      actionCallback.call(this, direction);
    }
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
      host.scheduleTask(function() {
        controller.moveTransport.call(controller, 0.00001);
      }, [], 0);
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
    var text;

    switch (button) {

      case buttons.midiMode:
        // We (ab)use the midi mode as daw/edit mode.
        // Note: We can't use midi mode as performance mode since the impulse will
        //       only show cc# values on its display which is not that useful when
        //       performing. So I decided to use it as a DAW/edit mode.
        controller.setMode('daw');
        break;

      case buttons.mixerMode:
        controller.setMode('performance');
        break;

      case buttons.shift:
        this.handleShiftPress(value);
        break;

      case buttons.plugin:
        controller.setPage('plugin');
        break;

      case buttons.mixer:
        controller.setPage('mixer');
        break;

      case buttons.midi:
        controller.setPage('midi');
        break;

      case buttons.pageUp:
        switch (controller.state[controller.state.mode].page) {
          case 'mixer':
            controller.mixerPage++;
            if (controller.state[controller.state.mode].mixerPage < 0) {
              controller.state[controller.state.mode].mixerPage = controller.state[controller.state.mode].mixerPages.length - 1;
            }
            else if (controller.state[controller.state.mode].mixerPage >= controller.state[controller.state.mode].mixerPages.length) {
              controller.state[controller.state.mode].mixerPage = 0;
            }
            controller.setTextDisplay(controller.mixerPages[controller.state[controller.state.mode].mixerPage], 'text');
            controller.highlightModifyableTracks();
            break;  
        }
        break;

      case buttons.pageDown:
        switch (controller.state[controller.state.mode].page) {
          case 'mixer':
            controller.mixerPage--;
            if (controller.mixerPage < 0) {
              controller.mixerPage = controller.mixerPages.length - 1;
            }
            else if (controller.mixerPage >= controller.mixerPages.length) {
              controller.mixerPage = 0;
            }
            controller.setTextDisplay(controller.mixerPages[controller.mixerPage], 'text');
            controller.highlightModifyableTracks();
            break;  
        }
        break;

      case buttons.rewind:
        controller.rewindPressed = !!value;
        text = controller.shiftPressed ? '<<<' : '<<';

        if (!!value) {
          host.scheduleTask(function() {
            controller.moveTransport.call(controller, controller.shiftPressed ? -0.3 : -0.02);
          }, [], 0);
          controller.setTextDisplay(text, 'text', 1000);
        }
        else {
          controller.setTextDisplay(text, 'text', 100);
        }
        break;

      case buttons.forward:
        controller.forwardPressed = !!value;
        text = controller.shiftPressed ? '>>>' : '>>';

        if (!!value) {
          host.scheduleTask(function() {
            controller.moveTransport.call(controller, controller.shiftPressed ? 0.3 : 0.02);
          }, [], 0);
          controller.setTextDisplay(text, 'text', 1000);
        }
        else {
          controller.setTextDisplay(text, 'text', 100);
        }
        break;

      case buttons.stop:
        text = 'Stop';

        if (!!value) {
          controller.transport.stop();
          controller.setTextDisplay(text, 'text', 1000);
        }
        else {
          controller.setTextDisplay(text, 'text', 1000);
        }
        break;

      case buttons.play:
        text = 'Play';
        if (!!value) {
          controller.transport.togglePlay();
          controller.setTextDisplay(text, 'text', 1000);
        }
        else {
          controller.setTextDisplay(text, 'text', 1000);
        }
        break;

      case buttons.loop:
        if (!!value) {
          controller.transport.toggleLoop();
          controller.setTextDisplay(controller.isLoopActive ? 'Loop off' : 'Loop on', 'text', 1500);
        }
        else {
          controller.setTextDisplay(controller.isLoopActive ? 'Loop on' : 'Loop off', 'text', 1500);
        }
        break;

      case buttons.record:
        if ('daw' == controller.state.mode && controller.shiftPressed) {
          // In daw mode shift + record is a generic add/create something.
          //controller.application.getAction('show_insert_popup_browser').invoke();
          controller.application.getAction('Click button').invoke();

        }
        else if (!!value) {
          controller.transport.record();
          controller.setTextDisplay('Record', 'text', 1000);
        }
        break;

      case buttons.nextTrack:
        //if ('mixer' == controller.state[controller.state.mode].page) {
          //controller.trackBank.scrollTracksPageDown();
        //}
        //else {
          controller.cursorTrack.selectNext();
          controller.highlightModifyableTracks();
        //}

        // See "Regarding shift" at the top
        this.handleShiftPress(false);
        break;

      case buttons.prevTrack:
        //if ('mixer' == controller.state[controller.state.mode].page) {
          //controller.trackBank.scrollTracksPageUp();
        //}
        //else {
          controller.cursorTrack.selectPrevious();
          controller.highlightModifyableTracks();
        //}

        // See "Regarding shift" at the top
        this.handleShiftPress(false);
        break;
    }
  };

  this.handlePadPress = function(status, data1, data2) {

/*
    var inst = controller.cursorTrack.getPrimaryDevice();
    var browser = inst.createDeviceBrowser(5, 5);
    var session = browser.getSampleSession();
    browser.shouldAudition().set(true);
    browser.activateSession(session);
    browser.startBrowsing();
    dump(session.getSettledResult());
    println('press');

    return;
    */

    /*
    println('sdf');
    var browser = controller.cursorDevice.createDeviceBrowser(5,5);
    var session = browser.getSampleSession();
    browser.shouldAudition().set(true);
    browser.activateSession(session);
    browser.startBrowsing();
    dump(session.getSettledResult());
    return;
    */

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


    if (false && !controller.dawMode) {
      // This is the default mode. We simply map the CCs to note on/off messages.
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
    else {
      // We're in daw mode. Here we use the pads as regular buttons.


      // Down is when a pad is pressed or held, when data2 > 0 the pad is down.
      // A press is the first event that is 'down' after the pad was up. So pressing
      // a pad and then changing the pressure is only 1 press but multiple downs.

      // The timestamp of the last press.
      var lastPress = controller.state.pads[padIndex].lastPress;
      // Whether or not this pad was 'down' on its last midi event.
      var wasDown = controller.state.pads[padIndex].down;

      // To be able to distinguish between a down and a press we need to know
      // whether or not the pad was up or down before this event.
      // Only if it was up and is down now we count it as a press.
      var isPress = !wasDown && data2 > 0;

      // This can only be a double press if it's a press and if there was a press
      // before (lastPress defaults to 0 on init) and if the time passed between
      // the last and the current press is less than 400ms.
      var isDoublePress = isPress && lastPress && new Date() - lastPress < 400;

      // We only set lastPress if this is a press and if this is not the second
      // press of a double press.
      // So when double pressing lastPress contains the timestamp of the first
      // of the 2 presses.
      if (isPress && !isDoublePress) {
        controller.state.pads[padIndex].lastPress = new Date();
      }

      // Finally we store whether or not this pad is down. This is only used on
      // a possible next press to determine whether or not this future press is
      // a double press.
      controller.state.pads[padIndex].down = data2 > 0;


      var actionName;

      switch (padIndex) {
        case 1:
          actionName = 'focus_track_header_area';
          break;

        case 2:
          actionName = 'focus_or_toggle_device_panel';
          break;

        case 3:
          actionName = 'focus_or_toggle_mixer';
          break;

        case 4:
          actionName = 'focus_or_toggle_clip_launcher';
          break;

        case 5:
          actionName = 'focus_or_toggle_detail_editor';
          break;

        case 6:
          actionName = 'focus_or_toggle_automation_editor';
          break;

        case 7:
          actionName = 'focus_or_toggle_browser_panel';
          break;

        case 8:
          actionName = 'focus_or_toggle_inspector';
          break;
      }

      if (isKeyDown) {
        controller.application.getAction(actionName).invoke();
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
  };

  this.onMidi = function(status, data1, data2) {
    //printMidi(status, data1, data2);
    
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

    //var layer = controller.cursorDevice.createCursorLayer();
    //dump(layer.getKey());
    dump(controller.cursorDevice.createDrumPadBank(8).scrollToChannel(2));
  };

  this.init(controller);
}