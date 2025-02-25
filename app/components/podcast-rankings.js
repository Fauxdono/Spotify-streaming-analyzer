import React, { useState, useMemo, useEffect } from 'react';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

const PodcastRankings = ({ rawPlayData = [], formatDuration, initialShows = [] }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [topN, setTopN] = useState(50);
  const [sortBy, setSortBy] = useState('totalPlayed');
  const [selectedShows, setSelectedShows] = useState(initialShows);
  const [showSearch, setShowSearch] = useState('');
  
  const addShowFromEpisode = (show) => {
    if (!selectedShows.includes(show)) {
      setSelectedShows(prev => [...prev, show]);
    }
  };

  // Initialize with the data range
  useEffect(() => {
    if (!startDate && !endDate && rawPlayData.length > 0) {
      let earliest = new Date(rawPlayData[0].ts);
      let latest = new Date(rawPlayData[0].ts);
      
      for (const entry of rawPlayData) {
        const date = new Date(entry.ts);
        if (date < earliest) earliest = date;
        if (date > latest) latest = date;
      }
      
      setStartDate(format(earliest, 'yyyy-MM-dd'));
      setEndDate(format(latest, 'yyyy-MM-dd'));
    }
  }, [rawPlayData, startDate, endDate]);

  // Get unique shows from raw play data
  const allShows = useMemo(() => {
    const shows = new Set(
      rawPlayData
        .filter(entry => entry.episode_show_name)
        .map(entry => entry.episode_show_name)
    );
    return Array.from(shows).sort();
  }, [rawPlayData]);

  const filteredShows = useMemo(() => {
    return allShows
      .filter(show => 
        show.toLowerCase().includes(showSearch.toLowerCase()) &&
        !selectedShows.includes(show)
      )
      .slice(0, 10);
  }, [allShows, showSearch, selectedShows]);

  const filteredEpisodes = useMemo(() => {
    if (!rawPlayData?.length) return [];
    
    const start = startDate ? startOfDay(new Date(startDate)) : new Date(0);
    const end = endDate ? endOfDay(new Date(endDate)) : new Date();
    
    const episodeStats = {};
    const showAverages = {};
    
    // First pass: collect total duration of each episode and build show statistics
    rawPlayData.forEach(entry => {
      const timestamp = new Date(entry.ts);
      if (
        timestamp >= start && 
        timestamp <= end && 
        entry.episode_show_name &&
        entry.episode_name &&
        (selectedShows.length === 0 || selectedShows.includes(entry.episode_show_name))
      ) {
        const key = `${entry.episode_name}-${entry.episode_show_name}`;
        const showName = entry.episode_show_name;
        
        // Track show statistics to establish typical episode lengths
        if (!showAverages[showName]) {
          showAverages[showName] = {
            totalDuration: 0,
            episodeCount: 0,
            knownDurations: []
          };
        }
        
        // If we have actual duration, track it
        if (entry.duration_ms && entry.duration_ms > 0) {
          showAverages[showName].knownDurations.push(entry.duration_ms);
        

  // Improved date range functions
  const setQuickRange = (days) => {
    // For most cases, set end date to today and start date to (today - days)
    if (days > 0) {
      const today = new Date();
      const start = subDays(today, days);
      setEndDate(format(today, 'yyyy-MM-dd'));
      setStartDate(format(start, 'yyyy-MM-dd'));
    } 
    // Special case for "Day" button (days=0)
    else if (days === 0) {
      const today = new Date();
      setStartDate(format(today, 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    }
  };

  // Set date to start at beginning of current month
  const setCurrentMonth = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(format(firstDayOfMonth, 'yyyy-MM-dd'));
    setEndDate(format(today, 'yyyy-MM-dd'));
  };

  // Set date to start at beginning of previous month, end at end of previous month
  const setPreviousMonth = () => {
    const today = new Date();
    const firstDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    setStartDate(format(firstDayOfPrevMonth, 'yyyy-MM-dd'));
    setEndDate(format(lastDayOfPrevMonth, 'yyyy-MM-dd'));
  };

  // Set date to current calendar year
  const setCurrentYear = () => {
    const today = new Date();
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
    setStartDate(format(firstDayOfYear, 'yyyy-MM-dd'));
    setEndDate(format(today, 'yyyy-MM-dd'));
  };

  // Set date to last calendar year
  const setPreviousYear = () => {
    const prevYear = new Date().getFullYear() - 1;
    const firstDayOfYear = new Date(prevYear, 0, 1);
    const lastDayOfYear = new Date(prevYear, 11, 31);
    setStartDate(format(firstDayOfYear, 'yyyy-MM-dd'));
    setEndDate(format(lastDayOfYear, 'yyyy-MM-dd'));
  };

  // Set date to all time
  const setAllTime = () => {
    if (rawPlayData.length > 0) {
      let earliest = new Date(rawPlayData[0].ts);
      let latest = new Date(rawPlayData[0].ts);
      
      for (const entry of rawPlayData) {
        const date = new Date(entry.ts);
        if (date < earliest) earliest = date;
        if (date > latest) latest = date;
      }
      
      setStartDate(format(earliest, 'yyyy-MM-dd'));
      setEndDate(format(latest, 'yyyy-MM-dd'));
    }
  };

  const addShow = (show) => {
    setSelectedShows(prev => [...prev, show]);
    setShowSearch('');
  };

  const removeShow = (show) => {
    setSelectedShows(prev => prev.filter(s => s !== show));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-indigo-700">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-2 py-1 text-indigo-700 focus:border-indigo-400 focus:ring-indigo-400"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-2 py-1 text-indigo-700 focus:border-indigo-400 focus:ring-indigo-400"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setQuickRange(0)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
              Today
            </button>
            <button onClick={() => setQuickRange(7)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
              Last 7 days
            </button>
            <button onClick={() => setQuickRange(30)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
              Last 30 days
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button onClick={setCurrentMonth} className="px-3 py-1 bg-indigo-200 text-indigo-700 rounded hover:bg-indigo-300">
              This month
            </button>
            <button onClick={setPreviousMonth} className="px-3 py-1 bg-indigo-200 text-indigo-700 rounded hover:bg-indigo-300">
              Last month
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button onClick={setCurrentYear} className="px-3 py-1 bg-indigo-300 text-indigo-700 rounded hover:bg-indigo-400">
              This year
            </button>
            <button onClick={setPreviousYear} className="px-3 py-1 bg-indigo-300 text-indigo-700 rounded hover:bg-indigo-400">
              Last year
            </button>
            <button onClick={setAllTime} className="px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600">
              All time
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-indigo-700">
          <label>Top</label>
          <input
            type="number"
            min="1"
            max="999"
            value={topN}
            onChange={(e) => setTopN(Math.min(999, Math.max(1, parseInt(e.target.value))))}
            className="border rounded w-16 px-2 py-1 text-indigo-700 focus:border-indigo-400 focus:ring-indigo-400"
          />
          <label>episodes</label>
        </div>
      </div>

      {/* Show Selection */}
      <div className="relative">
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedShows.map(show => (
            <div 
              key={show} 
              className="flex items-center bg-indigo-600 text-white px-2 py-1 rounded text-sm"
            >
              {show}
              <button 
                onClick={() => removeShow(show)}
                className="ml-2 text-white hover:text-indigo-200"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            value={showSearch}
            onChange={(e) => setShowSearch(e.target.value)}
            placeholder="Search shows..."
            className="w-full border rounded px-2 py-1 text-indigo-700 focus:border-indigo-400 focus:ring-indigo-400"
          />
          {showSearch && filteredShows.length > 0 && (
            <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1">
              {filteredShows.map(show => (
                <div
                  key={show}
                  onClick={() => addShow(show)}
                  className="px-2 py-1 hover:bg-indigo-100 cursor-pointer"
                >
                  {show}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {filteredEpisodes.length > 0 ? (
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="min-w-[640px]">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left text-indigo-700">Rank</th>
                  <th className="p-2 text-left text-indigo-700">Episode</th>
                  <th className="p-2 text-left text-indigo-700">Show</th>
                  <th 
                    className={`p-2 text-right text-indigo-700 cursor-pointer hover:bg-indigo-100 ${sortBy === 'totalPlayed' ? 'font-bold' : ''}`}
                    onClick={() => setSortBy('totalPlayed')}
                  >
                    Total Time {sortBy === 'totalPlayed' && '▼'}
                  </th>
                  <th 
                    className={`p-2 text-right text-indigo-700 cursor-pointer hover:bg-indigo-100 ${sortBy === 'segmentCount' ? 'font-bold' : ''}`}
                    onClick={() => setSortBy('segmentCount')}
                  >
                    Sessions {sortBy === 'segmentCount' && '▼'}
                  </th>
                  <th 
                    className={`p-2 text-right text-indigo-700 cursor-pointer hover:bg-indigo-100 ${sortBy === 'completedPlays' ? 'font-bold' : ''}`}
                    onClick={() => setSortBy('completedPlays')}
                  >
                    Completed {sortBy === 'completedPlays' && '▼'}
                  </th>
                  <th className="p-2 text-right text-indigo-700">End Reasons</th>
                </tr>
              </thead>
              <tbody>
                {filteredEpisodes.map((episode, index) => (
                  <tr key={episode.key} className="border-b hover:bg-indigo-50">
                    <td className="p-2 text-indigo-700">{index + 1}</td>
                    <td className="p-2 text-indigo-700">{episode.episodeName}</td>
                    <td className="p-2 text-indigo-700 cursor-pointer hover:underline" 
                        onClick={() => addShowFromEpisode(episode.showName)}
                    >
                      {episode.showName}
                    </td>
                    <td className="p-2 text-right text-indigo-700">
                      {formatDuration(episode.totalPlayed)}
                    </td>
                    <td className="p-2 text-right text-indigo-700">
                      {episode.segmentCount}
                    </td>
                    <td className="p-2 text-right text-indigo-700">
                      {episode.completedPlays}
                    </td>
                    <td className="p-2 text-right text-indigo-700 text-xs">
                      {/* Show the most common reason ends, limited to keep UI clean */}
                      {Object.entries(episode.reasonEnds)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([reason, count]) => (
                          <div key={reason} title={`${reason}: ${count}`}>
                            {reason}: {count}
                          </div>
                        ))
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-indigo-500">
          {startDate || endDate || selectedShows.length > 0 
            ? 'No episodes found matching your filters' 
            : 'Select filters to view episodes'}
        </div>
      )}
    </div>
  );
};

export default PodcastRankings;