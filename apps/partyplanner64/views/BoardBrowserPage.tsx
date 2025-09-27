import * as React from "react";
import { addBoard } from "../boards";
import { showMessage, changeView } from "../appControl";
import { View } from "../../../packages/lib/types";
import "../css/boardbrowser.scss";

const gameNames: Record<number, string> = {
  1: "Mario Party 1",
  2: "Mario Party 2",
  3: "Mario Party 3",
};

const spinner = (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80 }}>
    <div style={{ width: 32, height: 32, border: '4px solid #bfa07a', borderTop: '4px solid #d2b8a3', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}

function shortDescription(desc: string) {
  if (!desc) return "";
  return desc.replace(/\s+/g, " ").slice(0, 120) + (desc.length > 120 ? "..." : "");
}

// Helper to render star rating as stars
function renderStars(starRank: any) {
  const n = Math.max(0, Math.min(5, Number(starRank)));
  if (isNaN(n) || n === 0) return '0/5';
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

const BoardBrowserPage: React.FC = () => {
  const [boards, setBoards] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<any[] | null>(null);
  const [selectedBoard, setSelectedBoard] = React.useState<any | null>(null);
  const [details, setDetails] = React.useState<Record<string, any>>({});
  const searchTimeout = React.useRef<number | null>(null);
  const searchAbort = React.useRef<AbortController | null>(null);
  const topAbort = React.useRef<AbortController | null>(null);
  const [latestFileDates, setLatestFileDates] = React.useState<Record<string, string>>({});
  const [descExpanded, setDescExpanded] = React.useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = React.useState(15);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isBatchLoading, setIsBatchLoading] = React.useState(false);

  // Add a function to priority load details and files for a board
  const priorityLoadBoardDetails = async (id: string) => {
    if (!id) return;
    // Fetch details if missing
    if (!details[id]) {
      try {
        const res = await fetch(`https://partyplannerapi.tabithahanegan.com/project/${id}`);
        const detailsData = await res.json();
        setDetails(prev => ({ ...prev, [id]: detailsData }));
      } catch {
        setDetails(prev => ({ ...prev, [id]: { error: true } }));
      }
    }
    // Fetch files/lastUpdated if missing
    if (!latestFileDates[id]) {
      try {
        const res = await fetch(`https://partyplannerapi.tabithahanegan.com/project/${id}/files`);
        const data = await res.json();
        const versions = data.versions || [];
        if (versions.length > 0) {
          const latest = versions.reduce((a: any, b: any) => {
            if (!a.release_date) return b;
            if (!b.release_date) return a;
            return a.release_date > b.release_date ? a : b;
          });
          setLatestFileDates(prev => ({ ...prev, [id]: latest.release_date }));
        }
      } catch {}
    }
  };

  // Fetch boards with increasing max as user scrolls (only if not searching)
  React.useEffect(() => {
    if (searchTerm.trim()) return; // Don't fetch top if searching
    setLoading(true);
    if (topAbort.current) topAbort.current.abort();
    const controller = new AbortController();
    topAbort.current = controller;
    fetch(`https://partyplannerapi.tabithahanegan.com/project/top?max=${visibleCount}`, { signal: controller.signal })
      .then(res => res.json())
      .then(async boards => {
        setBoards(boards);
        // Fetch details for each board using its id
        for (const b of boards) {
          const id = b.id || b.projectId;
          if (!id) continue;
          try {
            const res = await fetch(`https://partyplannerapi.tabithahanegan.com/project/${id}`);
            const details = await res.json();
            setDetails(prev => ({ ...prev, [id]: details }));
          } catch {
            setDetails(prev => ({ ...prev, [id]: { error: true } }));
          }
        }
        setLoading(false);
        setIsLoadingMore(false);
      })
      .catch(e => {
        if (e.name === 'AbortError') return;
        setError("Failed to fetch boards");
        setLoading(false);
        setIsLoadingMore(false);
      });
    return () => {
      controller.abort();
    };
  }, [visibleCount, searchTerm]);

  // Search fetch with debounce and cancellation
  React.useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (searchAbort.current) searchAbort.current.abort();
    const controller = new AbortController();
    searchAbort.current = controller;
    searchTimeout.current = window.setTimeout(() => {
      fetch(`https://partyplannerapi.tabithahanegan.com/project/search?searchTerm=${encodeURIComponent(searchTerm.trim())}`, { signal: controller.signal })
        .then(res => res.json())
        .then(async boards => {
          setSearchResults(boards);
          // Fetch details for each board using its id
          for (const b of boards) {
            const id = b.id || b.projectId;
            if (!id) continue;
            try {
              const res = await fetch(`https://partyplannerapi.tabithahanegan.com/project/${id}`);
              const details = await res.json();
              setDetails(prev => ({ ...prev, [id]: details }));
            } catch {
              setDetails(prev => ({ ...prev, [id]: { error: true } }));
            }
          }
          setSearching(false);
        })
        .catch(e => {
          if (e.name === 'AbortError') return;
          setError("Failed to fetch search results");
          setSearching(false);
        });
    }, 300);
    return () => {
      clearTimeout(searchTimeout.current!);
      controller.abort();
    };
  }, [searchTerm]);

  const boardsToShow = (searchTerm.trim() ? searchResults : boards) || [];
  const visibleBoards = boardsToShow;

  // Sequential loader effect as a named function for clarity
  React.useEffect(() => {
    if (!boardsToShow || boardsToShow.length === 0) return;
    let cancelled = false;
    setIsBatchLoading(true);
    const loadBoardDetailsSequentially = async () => {
      for (let index = 0; index < boardsToShow.length; index++) {
        if (cancelled) break;
        const b = boardsToShow[index];
        const id = b.id || b.projectId;
        if (!id) continue;
        // Skip if already loaded
        if (details[id] && latestFileDates[id]) continue;
        try {
          if (!details[id]) {
            const res = await fetch(`https://partyplannerapi.tabithahanegan.com/project/${id}`);
            const detailsData = await res.json();
            if (cancelled) break;
            await new Promise<void>(resolve => setDetails(prev => { resolve(); return { ...prev, [id]: detailsData }; }));
          }
          if (!latestFileDates[id]) {
            const res = await fetch(`https://partyplannerapi.tabithahanegan.com/project/${id}/files`);
            const data = await res.json();
            if (cancelled) break;
            const versions = data.versions || [];
            if (versions.length > 0) {
              const latest = versions.reduce((a: any, b: any) => {
                if (!a.release_date) return b;
                if (!b.release_date) return a;
                return a.release_date > b.release_date ? a : b;
              });
              await new Promise<void>(resolve => setLatestFileDates(prev => { resolve(); return { ...prev, [id]: latest.release_date }; }));
            }
          }
        } catch {
          setDetails(prev => ({ ...prev, [id]: { error: true } }));
        }
      }
      setIsBatchLoading(false);
    };
    loadBoardDetailsSequentially();
    return () => { cancelled = true; };
  }, [boardsToShow, details, latestFileDates]);

  // Infinite scroll: load more boards when scrolling near the bottom
  React.useEffect(() => {
    const handleScroll = () => {
      const el = listRef.current;
      if (!el) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100 && !isLoadingMore && !isBatchLoading) {
        setIsLoadingMore(true);
        setVisibleCount(count => count + 15);
      }
    };
    const el = listRef.current;
    if (el) el.addEventListener('scroll', handleScroll);
    return () => {
      if (el) el.removeEventListener('scroll', handleScroll);
    };
  }, [isLoadingMore, isBatchLoading]);

  // Hide loading animation after a short delay when visibleCount increases
  React.useEffect(() => {
    if (!isLoadingMore) return;
    const timeout = setTimeout(() => setIsLoadingMore(false), 600);
    return () => clearTimeout(timeout);
  }, [visibleCount]);

  const isLoading = searchTerm.trim() ? searching : loading;

  return (
    <div className="boardBrowserPage">
      {/* Top Bar */}
      <div className="boardBrowserTopBar">
        <div className="boardBrowserTitle">Search</div>
        <div className="boardBrowserSearch">
          <input
            type="text"
            placeholder="Search boards..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>
        {error && <div className="boardBrowserError">{error}</div>}
      </div>
      {/* Main Content */}
      <div className="boardBrowserContent">
        {/* Board List */}
        {!selectedBoard && (
          <div className="boardBrowserList" ref={listRef} style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
            {visibleBoards && visibleBoards.length > 0 && (
              <>
                {visibleBoards.map((b: any) => {
                  const id = b.id || b.projectId;
                  const d = details[id] || {};
                  const image = d.icon || b.icon;
                  const starRank = d.hasOwnProperty('difficulty') ? d.difficulty : (b.hasOwnProperty('difficulty') ? b.difficulty : undefined);
                  const author = d.hasOwnProperty('author') ? d.author : (b.hasOwnProperty('author') ? b.author : undefined);
                  const desc = d.hasOwnProperty('description') ? d.description : b.description;
                  const lastUpdated = latestFileDates[id];
                  const isExpanded = descExpanded[id];
                  const descLimit = 120;
                  const isLongDesc = desc && desc.length > descLimit;
                  const descToShow = isExpanded || !isLongDesc ? desc : desc.slice(0, descLimit) + '...';
                  return (
                    <div
                      key={id}
                      className="boardBrowserCard"
                      onClick={() => { setSelectedBoard({ ...b, id }); priorityLoadBoardDetails(id); }}
                    >
                      <div className="boardBrowserCardImageWrap">
                        {image ? (
                          <img src={image} alt="Board preview" className="boardBrowserCardImage" />
                        ) : (
                          <div className="boardBrowserCardPlaceholder">?</div>
                        )}
                      </div>
                      <div className="boardBrowserCardContent">
                        <div>
                          <span className="boardBrowserCardTitle">{d.hasOwnProperty('name') ? d.name : (b.hasOwnProperty('name') ? b.name : (b.id || b.projectId))}</span>
                          <span className="boardBrowserCardAuthor">by {author !== undefined ? author : <span style={{color:'#aaa'}}><em>Loading...</em></span>}</span>
                        </div>
                        <div className="boardBrowserCardDesc">
                          {descToShow}
                        </div>
                        <div className="boardBrowserCardStats">
                          <span title="Star Rank">{starRank !== undefined ? renderStars(starRank) : <span style={{color:'#aaa'}}><em>Loading...</em></span>}</span>
                          <span title="Recommended Turns">🕙 {d.hasOwnProperty('recommended_turns') ? d.recommended_turns : (b.hasOwnProperty('recommended_turns') ? b.recommended_turns : <span style={{color:'#aaa'}}><em>Loading...</em></span>)}</span>
                          <span title="Created">📅 {lastUpdated ? formatDate(lastUpdated) : <span style={{color:'#aaa'}}><em>Loading...</em></span>}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Show spinner at bottom if any visible board is missing details or last updated, or if loading more or searching */}
                {(
                  visibleBoards.some((b: any) => {
                    const id = b.id || b.projectId;
                    return !details[id] || !latestFileDates[id];
                  }) || isLoadingMore || searching
                ) ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                    {spinner}
                  </div>
                ) : null}
              </>
            )}
            {(!visibleBoards || visibleBoards.length === 0) && !isLoadingMore && !searching && !isLoading && (
              <div className="boardBrowserNoBoards">No boards found.</div>
            )}
          </div>
        )}
        {/* Full Page Details Panel as Modal */}
        {selectedBoard && (
          <div className="modlist-modal-overlay" onClick={() => setSelectedBoard(null)}>
            <div className="modlist-modal-card" onClick={e => e.stopPropagation()}>
              <BoardDetailsPanel
                board={selectedBoard}
                details={selectedBoard ? details[selectedBoard.id] : null}
                lastUpdated={latestFileDates[selectedBoard.id]}
                onClose={() => setSelectedBoard(null)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const BoardDetailsPanel: React.FC<{
  board: any;
  details: any;
  lastUpdated: string | undefined;
  onClose: () => void;
}> = ({ board, details, lastUpdated, onClose }) => {
  const [files, setFiles] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [importing, setImporting] = React.useState<string | null>(null);
  const [descExpanded, setDescExpanded] = React.useState(false);
  const [descFullWidth, setDescFullWidth] = React.useState(false);

  // Show loading if details or lastUpdated are missing
  const isPanelLoading = !details || !lastUpdated;

  React.useEffect(() => {
    if (!board) return;
    setLoading(true);
    setError(null);
    const id = board.id || board.projectId;
    if (!id) return;
    fetch(`https://partyplannerapi.tabithahanegan.com/project/${id}/files`)
      .then(res => res.json())
      .then(data => {
        setFiles(data.versions || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch board info");
        setLoading(false);
      });
  }, [board]);

  // Restore handleImport for import button
  const handleImport = async (downloadLink: string, boardName: string) => {
    setImporting(downloadLink);
    setError(null);
    try {
      const proxyUrl = `https://partyplannerapi.tabithahanegan.com/cors_bypass?url=${encodeURIComponent(downloadLink)}`;
      const res = await fetch(proxyUrl);
      const board = await res.json();
      addBoard(board);
      showMessage(`Imported board: ${boardName}`);
      changeView(View.EDITOR);
    } catch (e) {
      setError("Failed to import board");
    }
    setImporting(null);
  };

  const description = details?.description || board.description || 'No description.';
  const descLimit = 220;
  const isLongDesc = description.length > descLimit;
  const showFull = descExpanded;
  const descToShow = showFull ? description : description.slice(0, descLimit) + (isLongDesc ? '...' : '');

  return (
    <div className="modlist-style">
      {isPanelLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          {spinner}
        </div>
      ) : board && (
        <div className="boardBrowserDetailsPanelInner">
          {/* Banner Header Section */}
          <div className="boardBrowserHeaderBanner">
            {details?.icon || board.icon ? (
              <img src={details?.icon || board.icon} alt="Board preview" className="boardBrowserHeaderImage" />
            ) : (
              <div className="boardBrowserHeaderImage boardBrowserHeaderPlaceholder">?</div>
            )}
            <div className="boardBrowserHeaderOverlay"></div>
            <div className="boardBrowserHeaderText">
              <div className="boardBrowserHeaderTitle">{details?.name || board.name || board.id}</div>
              <div className="boardBrowserHeaderAuthor">by {details?.author || board.author || 'Unknown'}</div>
            </div>
            <button className="modlist-close" onClick={onClose} title="Close">×</button>
          </div>
          {/* Stats Row */}
          <div className="modlist-stats-row">
            <div className="modlist-stat" title="Star Rank"><span className="modlist-stat-icon">Star Rank⭐: </span> {renderStars(details?.difficulty ?? board.difficulty ?? 0)}</div>
            <div className="modlist-stat" title="Custom Events"><span className="modlist-stat-icon">Events 🎫: </span> {(details?.custom_events ?? board.custom_events ?? 0) > 0 ? '✓' : (details?.custom_events ?? board.custom_events ?? 0) === 0 ? '✗' : (details?.custom_events ?? board.custom_events ?? 0)}</div>
            <div className="modlist-stat" title="Custom Music"><span className="modlist-stat-icon">Music 🎵: </span> {(details?.custom_music ?? board.custom_music ?? 0) > 0 ? '✓' : (details?.custom_music ?? board.custom_music ?? 0) === 0 ? '✗' : (details?.custom_music ?? board.custom_music ?? 0)}</div>
            <div className="modlist-stat" title="Recommended Turns"><span className="modlist-stat-icon">Recommended Turns 🕙: </span> {details?.recommended_turns ?? board.recommended_turns ?? '?'}</div>
            <div className="modlist-stat" title="Created"><span className="modlist-stat-icon">Creation Date 📅:</span> {formatDate(details?.creation_date || board.creation_date)}</div>
            <div className="modlist-stat" title="Last Updated"><span className="modlist-stat-icon">📝 Last Updated:</span> {formatDate(lastUpdated || "")}</div>
          </div>
          {/* Description Section */}
          <div className="boardBrowserSection">
            <div className="boardBrowserSectionTitle">Description</div>
            <div className={`boardBrowserDescriptionCard${descFullWidth ? ' boardBrowserDescriptionFullWidth' : ''}`}
                 style={descFullWidth ? { position: 'absolute', left: 0, right: 0, top: '100px', zIndex: 10, background: 'var(--modal-bg, #fff)', boxShadow: '0 2px 16px rgba(0,0,0,0.15)', padding: 24, borderRadius: 8, margin: 16, maxWidth: 'none', width: 'calc(100% - 32px)' } : {}}>
              {descFullWidth && files.length > 0 && (
                <span style={{ position: 'absolute', top: 16, right: 32, fontWeight: 600, background: 'rgba(0,0,0,0.07)', borderRadius: 6, padding: '2px 10px', fontSize: '1em', color: '#333' }}>v{files[0].file_version}</span>
              )}
              {descToShow}
              {isLongDesc && !descExpanded && (
                <button className="boardBrowserDescShowmore" style={{ fontSize: '1.08em', fontWeight: 700, background: 'var(--accent-color, #2196f3)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', marginTop: 12, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }} onClick={() => setDescExpanded(true)}>Show more... (may include</button>
              )}
            </div>
          </div>
          <div className="boardBrowserSectionDivider"></div>
          {/* Versions Section */}
          <div className="boardBrowserSection">
            <div className="boardBrowserSectionTitle">Versions</div>
            {loading ? spinner : error ? (
              <div className="boardBrowserErrorCard">{error}</div>
            ) : (
              <ul className="boardBrowserVersionList">
                {files.map((v: any) => (
                  <li key={v.file_id} className="boardBrowserVersionItem" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="boardBrowserVersionTagBlue" style={{ fontWeight: 600, border: '2px solid #2196f3', background: 'rgba(33,150,243,0.08)', color: '#1976d2', borderRadius: 6, padding: '2px 12px', fontSize: '1em', minWidth: 56, textAlign: 'center' }}>v{v.file_version}</span>
                      {v.release_date && <span className="boardBrowserVersionDate" style={{ marginLeft: 8 }}>{v.release_date}</span>}
                    </div>
                    <div style={{ flex: 1 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="boardBrowserVersionDownloads">⬇️ {v.download_count}</span>
                      <button
                        className="boardBrowserDownloadBtn"
                        style={{ background: '#ffe082', color: '#795548', fontWeight: 600, border: '1.5px solid #ffd54f', borderRadius: 6, padding: '6px 18px', fontSize: '1em', cursor: 'pointer' }}
                        onClick={() => window.open(v.download_link, '_blank')}
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleImport(v.download_link, details?.name || board.name)}
                        disabled={importing === v.download_link}
                        className="boardBrowserImportBtn"
                      >
                        {importing === v.download_link ? 'Importing...' : 'Import'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardBrowserPage; 