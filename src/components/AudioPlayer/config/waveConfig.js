export default {
  // If specified, draws the waveform in bar mode.
  barWidth: 2,
  // The optional spacing between bars of the wave, if not provided will be calculated in legacy format.
  barGap: 2,
  // Measured in pixels.
  cursorWidth: 0,
  // The fill color of the cursor indicating the playhead position.
  // cursorColor: '#232526',
  // The fill color of the waveform after the cursor.
  waveColor: '#525353',
  // The fill color of the part of the waveform behind the cursor. 
  // When 'progressColor' and 'waveColor' are the same the progress wave is not rendered at all.
  progressColor: '#232526',
  // Number of seconds to skip with the 'skipForward()' and 'skipBackward()' methods.
  skipLength: 5,
};