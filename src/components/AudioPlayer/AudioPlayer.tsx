import React, { Component } from 'react';
import LoadingOverlay from 'react-loading-overlay';
import Tippy from '@tippy.js/react';
import Song from '../../models/song';
import waveConfig from './config/waveConfig';
import WaveSurfer from 'wavesurfer.js';
import cursorConfig from './config/cursorConfig';
import CursorPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.cursor.min.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.regions.min.js';
import './audio-player.css';

type Props = {
  songToPlay: Song;
  fileToPlay: File;
};
type State = {
  /**
   * Is the song currently playing.
   */
  isPlaying: boolean;
  /**
   * Start time of the region to cut.
   */
  cutStart: number;
  /**
   * Original start time of the region (used when user presses 'Cancel')
   */
  originalCutStart: number;
  /**
   * End time of the region to cut.
   */
  cutEnd: number;
  /**
   * Original end time of the region (used when user presses 'Cancel')
   */
  originalCutEnd: number;
  /**
   * The main library for displaying the audio wave.
   */
  waveSurfer?: WaveSurfer;
  /**
   * Marks whether the regions were moved.
   */
  wasRegionChanged: boolean;
};

export default class AudioPlayer extends Component<Props, State> {
  private readonly WAVEFORM_CONTAINER: string = 'waveform';
  private readonly REGION_COLOR: string = 'rgba(0, 123, 255, 0.48)';

  constructor(props: Props) {
    super(props);

    this.state = {
      isPlaying: false,
      originalCutStart: NaN,
      originalCutEnd: NaN,
      cutStart: NaN,
      cutEnd: NaN,
      wasRegionChanged: false,
    };
  }

  /**
   * Generate and show the audio wave.
   */
  componentDidMount() {
    const { fileToPlay } = this.props;

    const waveSurfer = WaveSurfer.create({
      // Get the specific DOM element for storing the wave visualization
      container: document.getElementById(this.WAVEFORM_CONTAINER) as HTMLElement,
      ...waveConfig,
      plugins: [
        // Add a vertical cursor on the wave form when the mouse hovers over it
        CursorPlugin.create({ ...cursorConfig }),
        // Initialize the plugin that adds a dragable region over the waveform
        RegionsPlugin.create(),
      ],
    });
    waveSurfer.on('ready', () => this.onWaveSurferReady(waveSurfer));
    waveSurfer.loadBlob(fileToPlay);
  }

  componentWillUnmount = () => {
    const { waveSurfer } = this.state;
    if (!waveSurfer) return;

    waveSurfer.destroy();
  }

  /**
   * Start listening to region events.
   * Draw the region itself.
   */
  onWaveSurferReady = (waveSurfer: WaveSurfer) => {
    waveSurfer.on('region-created', this.onCropRegionCreated);
    waveSurfer.on('region-updated', this.onCropRegionUpdated);
    waveSurfer.on('region-update-end', this.onCropRegionUpdateEnd);

    let cutStart: number;
    let cutEnd: number;
    const duration = waveSurfer.getDuration();

    if (duration > 40) {
      cutStart = 20;
      cutEnd = duration - 20;
    } else {
      cutStart = 0;
      cutEnd = duration;
    }

    waveSurfer.addRegion({
      start: cutStart,
      end: cutEnd,
      color: this.REGION_COLOR,
    });

    this.setState({
      waveSurfer,
      cutStart,
      cutEnd,
      originalCutStart: cutStart,
      originalCutEnd: cutEnd,
    });
  }

  onCropRegionCreated = (params: any) => {
    // Remove region's 'title' attribute showing the region's duration.
    params.element.attributes.title.value = '';
  }

  /**
   * Called when the draggable area has been moved.
   * Recreate region if starting end overlaps the ending.
   */
  onCropRegionUpdated = (params: any) => {
    const { start, end } = params;
    const { cutStart, cutEnd, waveSurfer, isPlaying } = this.state;

    if (!waveSurfer) return;

    // Remove region's 'title' attribute showing the region's duration.
    params.element.attributes.title.value = '';

    // Check if one end of the region was dragged over the other one
    if (Math.abs(start - end) > 0.25) {
      return;
    }

    // Recreate region from last know valid positions
    const newRegion = this.recreateRegion(waveSurfer, cutStart, cutEnd);

    if (isPlaying) {
      newRegion.play();
    }

    this.setState({
      waveSurfer,
    });
  }

  /**
   * Recreate the region to given time stamps.
   * @returns The newly created region.
   */
  recreateRegion = (waveSurfer: WaveSurfer, startTime: number, endTime: number) : WaveSurfer => {
    waveSurfer.clearRegions();

    return waveSurfer.addRegion({
      start: startTime,
      end: endTime,
      color: this.REGION_COLOR,
    });
  }

  /**
   * Called when the draggable area has finished moving (any dragging stopped).
   * Update the cut's start and end times.
   */
  onCropRegionUpdateEnd = (params: any) => {
    const { start, end } = params;
    const { cutStart, cutEnd, waveSurfer } = this.state;

    if (!waveSurfer) {
      return;
    }

    let playFrom = 0;

    // The ending region was moved
    if (end !== cutEnd) {
      playFrom = end;
      this.setState({
        cutEnd: end,
      });
    }

    // The starting region was moved
    if (start !== cutStart) {
      playFrom = start;
      this.setState({
        cutStart: start,
      });
    }

    waveSurfer.play(playFrom);

    this.setState({
      isPlaying: true,
      wasRegionChanged: playFrom !== 0,
    });
  }

  /**
   * Play or pause the audio playback.
   */
  handleClickTogglePlay = () => {
    const { waveSurfer, isPlaying } = this.state;
    if (!waveSurfer) {
      return;
    }

    if (isPlaying) {
      waveSurfer.pause();
    } else {
      waveSurfer.play();
    }

    this.setState({ isPlaying: !isPlaying });
  }

  /**
   * Skip the playback forwards or backwards by 5 seconds.
   */
  handleClickSkip = (skipForwards: boolean = true) => {
    const { waveSurfer } = this.state;
    if (!waveSurfer) {
      return;
    }

    if (skipForwards) {
      waveSurfer.skipForward();
    } else {
      waveSurfer.skipBackward();
    }
  }

  /**
   * Jump the playback to the beginning/end of the song.
   */
  handleClickJump = (jumpToEnd: boolean = true) => {
    const { isPlaying, waveSurfer } = this.state;
    if (!waveSurfer) {
      return;
    }

    if (jumpToEnd) {
      const duration = waveSurfer.getDuration();
      const current = waveSurfer.getCurrentTime();
      waveSurfer.skip(duration - current - 5);
      waveSurfer.pause();
      waveSurfer.skipForward();
      this.setState({ isPlaying: false });
    } else {
      waveSurfer.stop();
      // If the song isn't playing - don't start it
      if (isPlaying) {
        waveSurfer.play();
      }
    }
  }

  handleClickCut = () => {
    alert('Not yet implemented :(');
  }

  /**
   * Recreate the initial region.
   */
  handleClickCancel = () => {
    const {
      waveSurfer,
      originalCutStart,
      originalCutEnd,
    } = this.state;

    if (!waveSurfer) return;

    this.recreateRegion(waveSurfer, originalCutStart, originalCutEnd);
    waveSurfer.stop();

    this.setState({
      waveSurfer,
      isPlaying: false,
      cutStart: originalCutStart,
      cutEnd: originalCutEnd,
      wasRegionChanged: false,
    });
  }

  render() {
    const {
      waveSurfer,
      isPlaying,
      wasRegionChanged,
    } = this.state;
    const isLoading = waveSurfer ? false : true;
    const toggleIcon = `fas fa-${isPlaying ? 'pause' : 'play'} mzt-btn-actions`;
    const tooltip = isPlaying ? 'Pause' : 'Play';

    return (
      <LoadingOverlay
        className="loading-spinner"
        active={isLoading}
        text="Generating audio wave.."
        spinner={true}
        fadeSpeed={200}
      >
        <div className={`row mzt-row-waveform ${isLoading ? 'mzt-hidden' : ''}`}>
          <div className="col">
            {/* The waveform */}
            <div className="row">
              <div className="col">
                <div id={this.WAVEFORM_CONTAINER}/>
              </div>
            </div>

            {/* [BUTTONS] Playback */}
            <div className="row justify-content-center">
              {/* Cut the song */}
              <div className="col-1" >
                <Tippy content="Cut the song to selected region" arrow={true} placement="bottom" delay={400} >
                  <i
                    className={`fas fa-cut mzt-btn-actions ${wasRegionChanged ? 'success' : 'disabled'}`}
                    {...(wasRegionChanged ? { onClick: this.handleClickCut } : {})}
                  />
                </Tippy>
              </div>

              {/* Jump to the beginning of the song */}
              <div className="col-1" >
                <Tippy content="Jump to start" arrow={true} placement="bottom" delay={400} >
                  <i className="fas fa-step-backward mzt-btn-actions"
                    onClick={() => this.handleClickJump(false)} />
                </Tippy>
              </div>

              {/* Rewind 5 seconds */}
              <div className="col-1">
                <Tippy content="Rewind 5 seconds" arrow={true} placement="bottom" delay={400} >
                  <i className="fas fa-chevron-left mzt-btn-actions"
                    onClick={() => this.handleClickSkip(false)} />
                </Tippy>
              </div>

              {/* Play/pause the song */}
              <div className="col-1">
                <Tippy content={tooltip} arrow={true} placement="bottom" delay={400} >
                  <i className={toggleIcon}
                    onClick={() => this.handleClickTogglePlay()} />
                </Tippy>
              </div>

              {/* Fast forward 5 seconds */}
              <div className="col-1" >
                <Tippy content="Fast forward 5 seconds" arrow={true} placement="bottom" delay={400} >
                  <i className="fas fa-chevron-right mzt-btn-actions"
                    onClick={() => this.handleClickSkip(true)} />
                </Tippy>
              </div>

              {/* Jump to end */}
              <div className="col-1" >
                <Tippy content="Jump to end" arrow={true} placement="bottom" delay={400} >
                  <i className="fas fa-step-forward mzt-btn-actions"
                    onClick={() => this.handleClickJump(true)} />
                </Tippy>
              </div>

              {/* Recreate initial region */}
              <div className="col-1" >
                <Tippy content="Cancel" arrow={true} placement="bottom" delay={400} >
                <i
                  className={`fas fa-ban mzt-btn-actions ${wasRegionChanged ? 'error' : 'disabled'}`}
                  {...(wasRegionChanged ? { onClick: this.handleClickCancel } : {})}
                />
                </Tippy>
              </div>
            </div> {/* END OF [BUTTONS] ROW */}

          </div>
        </div>
      </LoadingOverlay>
    );
  }
}
