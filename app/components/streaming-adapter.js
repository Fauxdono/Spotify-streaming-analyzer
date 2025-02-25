import Papa from 'papaparse';
import _ from 'lodash';

// Define a common structure for streaming data
export const STREAMING_TYPES = {
  SPOTIFY: 'spotify',
  APPLE_MUSIC: 'apple_music',
  YOUTUBE_MUSIC: 'youtube_music',
  TIDAL: 'tidal'
};

// Service metadata for UI
export const STREAMING_SERVICES = {
  [STREAMING_TYPES.SPOTIFY]: {
    name: 'Spotify',
    downloadUrl: 'https://www.spotify.com/account/privacy/',
    instructions: 'Request your "Extended streaming history" and wait for the email (can take up to 5 days)',
    acceptedFormats: '.json'
  },
  [STREAMING_TYPES.APPLE_MUSIC]: {
    name: 'Apple Music',
    downloadUrl: 'https://privacy.apple.com/',
    instructions: 'Request a copy of your data and select "Apple Music Activity"',
    acceptedFormats: '.csv'
  },
  [STREAMING_TYPES.YOUTUBE_MUSIC]: {
    name: 'YouTube Music',
    downloadUrl: 'https://takeout.google.com/',
    instructions: 'Select YouTube and YouTube Music data in Google Takeout',
    acceptedFormats: '.json,.csv'
  }
};

function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/\(feat\..*?\)/g, '') // Remove featuring artists
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function createMatchKey(trackName, artistName) {
  // Special case for "Just Dropped In"
  if (trackName && artistName && 
      trackName.toLowerCase().includes("just dropped in") && 
      artistName.toLowerCase().includes("kenny rogers")) {
    return "just-dropped-in-kenny-rogers";
  }
  return `${normalizeString(trackName)}-${normalizeString(artistName)}`;
}

function calculatePlayStats(entries) {
  const allSongs = [];
  const artistStats = {};
  const albumStats = {};
  const songPlayHistory = {};
  let totalListeningTime = 0;
  let processedSongs = 0;
  let shortPlays = 0;

  // Simple track map for combining same tracks
  const trackMap = {};

  entries.forEach(entry => {
    const playTime = entry.ms_played;
    
    // Skip invalid entries
    if (!entry.master_metadata_track_name || playTime < 30000) {
      if (playTime < 30000) shortPlays++;
      return;
    }

    processedSongs++;
    totalListeningTime += playTime;

    const trackName = entry.master_metadata_track_name;
    const artistName = entry.master_metadata_album_artist_name || 'Unknown Artist';
    const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
    
    // Create keys for lookups
    const standardKey = `${trackName}-${artistName}`;
    const matchKey = createMatchKey(trackName, artistName);
    
    const timestamp = new Date(entry.ts);

    // Track play history
    if (!songPlayHistory[standardKey]) {
      songPlayHistory[standardKey] = [];
    }
    songPlayHistory[standardKey].push(timestamp.getTime());

    // Artist stats
    if (!artistStats[artistName]) {
      artistStats[artistName] = {
        name: artistName,
        totalPlayed: 0,
        playCount: 0,
        firstListen: timestamp.getTime()
      };
    }
    artistStats[artistName].totalPlayed += playTime;
    artistStats[artistName].playCount++;
    artistStats[artistName].firstListen = Math.min(
      artistStats[artistName].firstListen, 
      timestamp.getTime()
    );

    // Album stats
    if (albumName && artistName) {
      const albumKey = `${albumName}-${artistName}`;
      if (!albumStats[albumKey]) {
        albumStats[albumKey] = {
          name: albumName,
          artist: artistName,
          totalPlayed: 0,
          playCount: 0,
          trackCount: new Set(),
          firstListen: timestamp.getTime()
        };
      }
      albumStats[albumKey].totalPlayed += playTime;
      albumStats[albumKey].playCount++;
      albumStats[albumKey].trackCount.add(trackName);
      albumStats[albumKey].firstListen = Math.min(
        albumStats[albumKey].firstListen, 
        timestamp.getTime()
      );
    }

    // Use simple object instead of Map for better performance
    if (trackMap[matchKey]) {
      // Update existing track
      trackMap[matchKey].totalPlayed += playTime;
      trackMap[matchKey].playCount++;
    } else {
      // Add new track
      trackMap[matchKey] = {
        key: standardKey,
        trackName,
        artist: artistName,
        albumName,
        totalPlayed: playTime,
        playCount: 1
      };
    }
  });

  // Convert track map to array
  for (const key in trackMap) {
    allSongs.push(trackMap[key]);
  }

  return {
    songs: allSongs,
    artists: artistStats,
    albums: albumStats,
    playHistory: songPlayHistory,
    totalListeningTime,
    processedSongs,
    shortPlays
  };
}

function calculateArtistStreaks(timestamps) {
  // Sort timestamps and convert to unique days (YYYY-MM-DD format)
  const days = [...new Set(
    timestamps.map(ts => new Date(ts).toISOString().split('T')[0])
  )].sort();

  let currentStreak = 0;
  let longestStreak = 0;
  let streakStart = null;
  let streakEnd = null;

  for (let i = 0; i < days.length; i++) {
    const currentDate = new Date(days[i]);
    const previousDate = i > 0 ? new Date(days[i - 1]) : null;
    
    if (!previousDate || 
        (currentDate - previousDate) / (1000 * 60 * 60 * 24) === 1) {
      // Continuing streak
      currentStreak++;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        streakEnd = currentDate;
        streakStart = new Date(days[i - currentStreak + 1]);
      }
    } else {
      // Break in streak
      currentStreak = 1;
    }
  }

  // Check if current streak is still active
  const lastPlay = new Date(days[days.length - 1]);
  const now = new Date();
  const daysSinceLastPlay = Math.floor((now - lastPlay) / (1000 * 60 * 60 * 24));
  const activeStreak = daysSinceLastPlay <= 1 ? currentStreak : 0;

  return {
    longestStreak,
    currentStreak: activeStreak,
    streakStart,
    streakEnd
  };
}

function calculateBriefObsessions(songs, songPlayHistory) {
  const briefObsessionsArray = [];
 
  songs.forEach(song => {
    if (song.playCount <= 50) {
      const timestamps = songPlayHistory[song.key] || [];
      if (timestamps.length > 0) {
        timestamps.sort((a, b) => a - b);
        
        let maxPlaysInWeek = 0;
        let bestWeekStart = null;
        
        for (let i = 0; i < timestamps.length; i++) {
          const weekEnd = new Date(timestamps[i]);
          const weekStart = new Date(weekEnd);
          weekStart.setDate(weekStart.getDate() - 7);
          
          const playsInWeek = timestamps.filter(t => t >= weekStart && t <= weekEnd).length;
          
          if (playsInWeek > maxPlaysInWeek) {
            maxPlaysInWeek = playsInWeek;
            bestWeekStart = weekStart;
          }
        }
        
        if (maxPlaysInWeek >= 5) {
          briefObsessionsArray.push({
            ...song,
            intensePeriod: {
              weekStart: bestWeekStart,
              playsInWeek: maxPlaysInWeek
            }
          });
        }
      }
    }
  });

  return _.orderBy(
    briefObsessionsArray,
    ['intensePeriod.playsInWeek', 'intensePeriod.weekStart'],
    ['desc', 'asc']
  ).slice(0, 100);
}

function calculateSongsByYear(songs, songPlayHistory) {
  const songsByYear = {};
  
  songs.forEach(song => {
    const timestamps = songPlayHistory[song.key] || [];
    if (timestamps.length > 0) {
      const playsByYear = _.groupBy(timestamps, ts => new Date(ts).getFullYear());
      
      Object.entries(playsByYear).forEach(([year, yearTimestamps]) => {
        if (!songsByYear[year]) {
          songsByYear[year] = [];
        }
        
        songsByYear[year].push({
          ...song,
          totalPlayed: song.totalPlayed * (yearTimestamps.length / timestamps.length),
          playCount: yearTimestamps.length,
          spotifyScore: Math.pow(yearTimestamps.length, 1.5)
        });
      });
    }
  });

  Object.keys(songsByYear).forEach(year => {
    songsByYear[year] = _.orderBy(songsByYear[year], ['spotifyScore'], ['desc'])
      .slice(0, 100);
  });

  return songsByYear;
}

export const streamingProcessor = {
  async processFiles(files) {
    try {
      let allProcessedData = [];
      
      const processedData = await Promise.all(
        Array.from(files).map(async (file) => {
          const content = await file.text();
          
          // Spotify JSON files
          if (file.name.includes('Streaming_History') && file.name.endsWith('.json')) {
            try {
              const data = JSON.parse(content);
              const dataWithSource = data.map(entry => ({
                ...entry,
                source: 'spotify'
              }));
              allProcessedData = [...allProcessedData, ...dataWithSource];
              return dataWithSource;
            } catch (error) {
              console.error('Error parsing JSON:', error);
              return [];
            }
          }
          
          // Apple Music CSV files
          if (file.name.toLowerCase().includes('apple') && file.name.endsWith('.csv')) {
            return new Promise((resolve) => {
              Papa.parse(content, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                  const transformedData = results.data
                    .filter(row => row['Track Name'] && row['Last Played Date'])
                    .map(row => {
                      // Handle special case for Kenny Rogers
                      if (row['Track Name'] && 
                          row['Track Name'].toLowerCase().includes('just dropped in') && 
                          row['Track Name'].toLowerCase().includes('kenny rogers')) {
                        return {
                          master_metadata_track_name: 'Just Dropped In (To See What Condition My Condition Is In)',
                          ts: new Date(parseInt(row['Last Played Date'])).toISOString(),
                          ms_played: row['Is User Initiated'] ? 240000 : 30000,
                          master_metadata_album_artist_name: 'Kenny Rogers & The First Edition',
                          master_metadata_album_album_name: 'Unknown Album',
                          source: 'apple_music'
                        };
                      }
                  
                      // Parse track name from Apple Music format
                      let trackName = row['Track Name'] || '';
                      let artistName = 'Unknown Artist';
                      
                      // Apple format is often "Artist - Track" or "Artist, Artist - Track"
                      const dashIndex = trackName.indexOf(' - ');
                      if (dashIndex > 0) {
                        artistName = trackName.substring(0, dashIndex).trim();
                        trackName = trackName.substring(dashIndex + 3).trim();
                      }
                      
                      // Convert timestamp from milliseconds to ISO date
                      let timestamp;
                      try {
                        timestamp = new Date(parseInt(row['Last Played Date'])).toISOString();
                      } catch (e) {
                        // Fallback if timestamp parsing fails
                        timestamp = new Date().toISOString();
                      }
                      
                      // Estimate play time (Apple doesn't provide this)
                      // User-initiated plays likely involve full tracks
                      const estimatedPlayTime = row['Is User Initiated'] ? 240000 : 30000;
                      
                      return {
                        master_metadata_track_name: trackName,
                        ts: timestamp,
                        ms_played: estimatedPlayTime,
                        master_metadata_album_artist_name: artistName,
                        master_metadata_album_album_name: 'Unknown Album',
                        source: 'apple_music'
                      };
                    });
                  
                  console.log('Transformed Apple Music Data:', transformedData.length);
                  allProcessedData = [...allProcessedData, ...transformedData];
                  resolve(transformedData);
                },
                error: (error) => {
                  console.error('Error parsing Apple Music CSV:', error);
                  resolve([]);
                }
              });
            });
          }
          
          return [];
        })
      );

      // Calculate comprehensive stats using allProcessedData
      const stats = calculatePlayStats(allProcessedData);

      const sortedArtists = Object.values(stats.artists)
        .map(artist => {
          const artistSongs = stats.songs.filter(song => song.artist === artist.name);
          const mostPlayed = _.maxBy(artistSongs, 'playCount');
          const artistPlays = [];
          artistSongs.forEach(song => {
            if (stats.playHistory[song.key]) {
              artistPlays.push(...stats.playHistory[song.key]);
            }
          });

          const streaks = calculateArtistStreaks(artistPlays);

          return {
            ...artist,
            mostPlayedSong: mostPlayed || { trackName: 'Unknown', playCount: 0 },
            ...streaks
          };
        })
        .sort((a, b) => b.totalPlayed - a.totalPlayed);

      const sortedAlbums = _.orderBy(
        Object.values(stats.albums).map(album => ({
          ...album,
          trackCount: album.trackCount.size
        })),
        ['totalPlayed'],
        ['desc']
      );

      const sortedSongs = _.orderBy(stats.songs, ['totalPlayed'], ['desc']).slice(0, 250);

      return {
        stats: {
          totalFiles: files.length,
          totalEntries: allProcessedData.length,
          processedSongs: stats.processedSongs,
          nullTrackNames: allProcessedData.filter(e => !e.master_metadata_track_name).length,
          skippedEntries: 0,
          shortPlays: stats.shortPlays,
          totalListeningTime: stats.totalListeningTime
        },
        topArtists: sortedArtists,
        topAlbums: sortedAlbums,
        processedTracks: sortedSongs,
        songsByYear: calculateSongsByYear(stats.songs, stats.playHistory),
        briefObsessions: calculateBriefObsessions(stats.songs, stats.playHistory),
        rawPlayData: allProcessedData
      };

    } catch (error) {
      console.error('Error processing files:', error);
      throw error;
    }
  }
};