import React from 'react';
import Song from '../../models/song';
import SongDetails from '../SongDetails/SongDetails';
import DefaultCover from './cover_350x350.png';

type Props = {
    editable: boolean;
    song: Song;
    onClickClose: Function;
    onClickEdit: Function;
    onClickDownload: Function;
    onSongEdited: Function;
}

function SongSquare(props: Props) {
    const { editable, song, onClickClose,
        onClickEdit, onClickDownload, onSongEdited } = props;

    return (
        <div className='row mzt-row-song'>
            <div className='col'>
                <div className='row align-items-center mzt-row-song-header'>
                    <div className='col-auto'>
                        <img
                            className='img-thumbnail'
                            alt='album cover'
                            src={song.albumCover ? song.albumCover.dataAsTagSrc : DefaultCover} />
                    </div>

                    <div className='col mzt-song-text' onClick={() => onClickEdit()}>
                        <div className='row'>
                            <div className='col'>
                                <h3>
                                    <span className='mzt-song-title'>{song.title}</span>
                                </h3>
                            </div>
                        </div>

                        <div className='row'>
                            <div className='col'>
                                <h4>
                                    <span className='mzt-song-artist'>{song.artist}</span>
                                </h4>
                            </div>
                        </div>
                    </div>

                    <div className='col-1'>
                        {/* Remove song from list */}
                        <div className='row' title='Remove song from list' onClick={() => onClickClose()}>
                            <i className="fas fa-times mzt-btn-actions"></i>
                        </div>

                        {/* Download song */}
                        <div className='row' title='Download song' onClick={() => onClickDownload(song)}>
                            <i className="fas fa-download mzt-btn-actions"></i>
                        </div>
                    </div>
                </div>


                {editable && <SongDetails onEdit={onSongEdited} originalSong={song} />}
            </div>
        </div>
    );
}

export default SongSquare;