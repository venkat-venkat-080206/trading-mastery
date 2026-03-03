import { useState, useMemo, useEffect } from 'react';
import { ChevronRight, CheckCircle2, Circle, Clock, AlertCircle, Lightbulb, ChevronLeft, Save, ChevronDown, List, X, Sun, Moon, Download, Trash2, LogOut, Pencil, Copy } from 'lucide-react';
import questionsFile from '../data/questions.json';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import './LearningDashboard.css';

interface Question {
    QID: string;
    STAGE: string;
    stageId: number;
    stageName: string;
    SECTION: string;
    QUESTION: string;
    DIFFICULTY: string;
    READ_TIME: string;
    CORE_ANSWER: string;
    DEEP_DIVE: string;
    KEY_INSIGHT?: string;
    COMMON_MISTAKE?: string;
    REAL_EXAMPLE?: string;
    QUIZ_Q?: string;
    QUIZ_A?: string;
    QUIZ_ANS?: string;
}

export default function LearningDashboard() {
    const { signOut, user } = useAuth();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        if (theme === 'light') {
            document.documentElement.classList.add('light-theme');
        } else {
            document.documentElement.classList.remove('light-theme');
        }
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    useEffect(() => {
        setQuestions(questionsFile as Question[]);
    }, []);

    // Fetch notes from Supabase
    useEffect(() => {
        const fetchNotes = async () => {
            if (!supabase) return;
            try {
                const { data, error } = await supabase.from('notes').select('*');
                if (error) throw error;
                if (data) {
                    const formatted: Record<string, { id: number, text: string, date: string }[]> = {};
                    const newTags: Record<string, string[]> = {};

                    data.forEach(row => {
                        // format notes
                        if (!formatted[row.question_id]) formatted[row.question_id] = [];
                        formatted[row.question_id].push({
                            id: row.id,
                            text: row.note_text,
                            date: new Date(row.created_at).toLocaleString()
                        });

                        // format tags
                        if (row.tags && row.tags.length > 0) {
                            newTags[row.question_id] = Array.from(new Set([...(newTags[row.question_id] || []), ...row.tags]));
                        }
                    });

                    setSavedNotes(formatted);
                    if (Object.keys(newTags).length > 0) {
                        setTags(prev => ({ ...prev, ...newTags }));
                    }
                }
            } catch (err) {
                console.error("Supabase fetch error:", err);
            }
        };
        fetchNotes();
    }, []);

    const currentQ = questions[currentIndex];

    // Group questions by Stage and Section
    const treeData = useMemo(() => {
        const tree: any[] = [];
        questions.forEach((q, idx) => {
            let stage = tree.find(s => s.id === q.stageId);
            if (!stage) {
                stage = { id: q.stageId, name: q.stageName, sections: [], completed: false };
                tree.push(stage);
            }
            let sec = stage.sections.find((s: any) => s.name === q.SECTION);
            if (!sec) {
                sec = { name: q.SECTION, questions: [] };
                stage.sections.push(sec);
            }
            sec.questions.push({ ...q, globalIndex: idx });
        });
        return tree.sort((a, b) => a.id - b.id);
    }, [questions]);

    const [expandedStage, setExpandedStage] = useState<number | null>(0);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [showQuizAns, setShowQuizAns] = useState(false);

    // Mobile UI States
    const [isTreeOpen, setIsTreeOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Notes Data States
    const [draftNote, setDraftNote] = useState<Record<string, string>>({});
    const [savedNotes, setSavedNotes] = useState<Record<string, { id: number, text: string, date: string }[]>>({});
    const [tags, setTags] = useState<Record<string, string[]>>({});
    const [showTagInput, setShowTagInput] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
    const [editingText, setEditingText] = useState('');
    const [notesSearch, setNotesSearch] = useState('');

    const currentDraft = draftNote[currentQ?.QID] || '';
    const currentSavedNotes = savedNotes[currentQ?.QID] || [];
    const currentTags = tags[currentQ?.QID] || ['review', 'psychology'];
    const filteredNotes = notesSearch.trim()
        ? currentSavedNotes.filter(n => n.text.toLowerCase().includes(notesSearch.toLowerCase()))
        : currentSavedNotes;

    const handleSaveNotes = async () => {
        if (!currentDraft.trim()) return;

        const newNoteObj = {
            user_id: user?.id,
            question_id: currentQ.QID,
            note_text: currentDraft.trim(),
            tags: currentTags
        };

        try {
            const { data, error } = await supabase
                .from('notes')
                .insert([newNoteObj])
                .select();

            if (error) throw error;

            if (data && data[0]) {
                const dbNote = data[0];
                const newNote = {
                    id: dbNote.id,
                    text: dbNote.note_text,
                    date: new Date(dbNote.created_at).toLocaleString()
                };

                setSavedNotes(prev => ({
                    ...prev,
                    [currentQ.QID]: [...(prev[currentQ.QID] || []), newNote]
                }));
                setDraftNote(prev => ({ ...prev, [currentQ.QID]: '' }));
            }
        } catch (err) {
            console.error("Supabase insert error:", err);
            alert("Failed to save note to Supabase. Check console for details.");
        }
    };

    const handleDeleteNote = async (qid: string, noteId: number) => {
        try {
            const { error } = await supabase.from('notes').delete().eq('id', noteId);
            if (error) throw error;

            setSavedNotes(prev => ({
                ...prev,
                [qid]: prev[qid].filter(n => n.id !== noteId)
            }));
        } catch (err) {
            console.error("Supabase delete error:", err);
            alert("Failed to delete note.");
        }
    };

    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && newTag.trim() !== '') {
            const cleanTag = newTag.trim().toLowerCase().replace('#', '');
            if (!currentTags.includes(cleanTag)) {
                setTags(prev => ({
                    ...prev,
                    [currentQ.QID]: [...currentTags, cleanTag]
                }));
            }
            setNewTag('');
            setShowTagInput(false);
        } else if (e.key === 'Escape') {
            setShowTagInput(false);
            setNewTag('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(prev => ({
            ...prev,
            [currentQ.QID]: currentTags.filter(t => t !== tag)
        }));
    };

    const handleSaveEdit = async (noteId: number) => {
        if (!editingText.trim()) return;
        try {
            const { error } = await supabase
                .from('notes')
                .update({ note_text: editingText.trim() })
                .eq('id', noteId);
            if (error) throw error;
            setSavedNotes(prev => ({
                ...prev,
                [currentQ.QID]: prev[currentQ.QID].map(n =>
                    n.id === noteId ? { ...n, text: editingText.trim() } : n
                )
            }));
            setEditingNoteId(null);
            setEditingText('');
        } catch (err) {
            console.error('Supabase update error:', err);
            alert('Failed to update note.');
        }
    };

    // Auto-expand the active section tree
    useEffect(() => {
        if (currentQ) {
            setExpandedStage(currentQ.stageId);
            setExpandedSection(currentQ.SECTION);
        }
    }, [currentQ]);

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setShowQuizAns(false);
            setEditingNoteId(null);
            setNotesSearch('');
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setShowQuizAns(false);
            setEditingNoteId(null);
            setNotesSearch('');
        }
    };

    const [timeRange, setTimeRange] = useState('This Week');
    const timeRanges = ['This Week', 'This Month', 'Last 3M', 'Custom Range'];

    const handleDownloadNotes = () => {
        const noteKeys = Object.keys(savedNotes).filter(k => savedNotes[k].length > 0);
        if (noteKeys.length === 0) {
            alert('No notes to download.');
            return;
        }

        let totalNotes = 0;
        let bodyHTML = '';

        noteKeys.forEach(qid => {
            const question = questions.find(q => q.QID === qid);
            const qTitle = question ? question.QUESTION : qid;
            const qStage = question ? `Stage ${question.stageId}: ${question.stageName}` : '';
            const qSection = question ? question.SECTION : '';
            const qNotes = savedNotes[qid];
            const qTags = tags[qid] || [];

            bodyHTML += `
                <div class="question-block">
                    <div class="stage-label">${qStage} &nbsp;&rsaquo;&nbsp; ${qSection}</div>
                    <h2 class="q-title">${qid} &mdash; ${qTitle}</h2>
                    ${qTags.length > 0 ? `<div class="tags">${qTags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>` : ''}
                    ${qNotes.map(note => {
                totalNotes++;
                return `<div class="note-card">
                            <div class="note-text">${note.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
                            <div class="note-meta">&#128197; ${note.date}</div>
                        </div>`;
            }).join('')}
                </div>`;
        });

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Trading Mastery Notes &mdash; ${new Date().toLocaleDateString('en-IN')}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #1e293b; padding: 48px; max-width: 820px; margin: 0 auto; }
  .cover { text-align: center; padding: 60px 0 48px; border-bottom: 2px solid #e2e8f0; margin-bottom: 48px; }
  .cover-icon { font-size: 3rem; margin-bottom: 16px; }
  .cover h1 { font-family: 'Poppins', sans-serif; font-size: 2.2rem; color: #1e40af; margin-bottom: 8px; }
  .cover .subtitle { color: #64748b; font-size: 1rem; }
  .cover .meta { margin-top: 16px; font-size: 0.85rem; color: #94a3b8; }
  .question-block { margin-bottom: 40px; page-break-inside: avoid; }
  .stage-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 6px; }
  .q-title { font-family: 'Poppins', sans-serif; font-size: 1.05rem; color: #1e40af; padding: 10px 16px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 0 6px 6px 0; margin-bottom: 12px; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .tag { background: #dbeafe; color: #1d4ed8; padding: 2px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 500; }
  .note-card { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #3b82f6; border-radius: 6px; padding: 14px 16px; margin-bottom: 10px; }
  .note-text { font-size: 0.9rem; line-height: 1.75; color: #334155; white-space: pre-wrap; }
  .note-meta { font-size: 0.72rem; color: #94a3b8; margin-top: 10px; font-style: italic; }
  .divider { border: none; border-top: 1px solid #e2e8f0; margin: 32px 0; }
  .footer { text-align: center; color: #94a3b8; font-size: 0.8rem; padding-top: 24px; border-top: 1px solid #e2e8f0; margin-top: 48px; }
  @media print {
    body { padding: 24px; }
    .question-block { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="cover">
    <div class="cover-icon">&#128218;</div>
    <h1>Trading Mastery Notes</h1>
    <div class="subtitle">Personal Learning Journal</div>
    <div class="meta">Generated on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })} &nbsp;&bull;&nbsp; ${totalNotes} notes across ${noteKeys.length} questions</div>
  </div>
  ${bodyHTML}
  <div class="footer">Trading Mastery &mdash; Your Personal Learning Vault</div>
</body>
</html>`;

        const printWin = window.open('', '_blank', 'width=900,height=700');
        if (printWin) {
            printWin.document.write(html);
            printWin.document.close();
            printWin.focus();
            setTimeout(() => printWin.print(), 800);
        }
    };

    if (!currentQ) return <div style={{ padding: 24 }}>Loading...</div>;

    return (
        <div className="learning-page-wrapper">
            <div className="learning-top-bar glass-panel flex-between animate-fade-in" style={{ marginBottom: '24px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Learning Activity</h2>
                    <div style={{ padding: '4px 12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', borderRadius: '16px', fontSize: '0.875rem', fontWeight: 500 }}>
                        +120 XP
                    </div>
                    <button
                        onClick={toggleTheme}
                        style={{ background: 'var(--bg-tertiary)', padding: '8px', borderRadius: '50%', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        aria-label="Toggle Theme"
                    >
                        {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px', borderLeft: '1px solid var(--glass-border)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</span>
                        <button
                            onClick={signOut}
                            title="Sign Out"
                            style={{ background: 'var(--bg-tertiary)', padding: '8px', borderRadius: '50%', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            aria-label="Sign Out"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>

                {/* Desktop time filters */}
                <div className="time-range-filters desktop-only" style={{ display: 'flex', gap: '8px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
                    {timeRanges.map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            style={{
                                padding: '6px 16px',
                                border: 'none',
                                background: timeRange === range ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                color: timeRange === range ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                borderRadius: '4px',
                                fontSize: '0.875rem',
                                fontWeight: timeRange === range ? 600 : 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {range}
                        </button>
                    ))}
                </div>

                {/* Mobile time filter dropdown */}
                <div className="mobile-only custom-dropdown-container">
                    <button
                        className="custom-dropdown-btn"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        {timeRange} <ChevronDown size={14} />
                    </button>
                    {isDropdownOpen && (
                        <div className="custom-dropdown-menu glass-panel">
                            {timeRanges.map(range => (
                                <div
                                    className={`dropdown-item ${timeRange === range ? 'active' : ''}`}
                                    key={range}
                                    onClick={() => {
                                        setTimeRange(range);
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    {range}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="learning-container animate-fade-in relative-container">
                {/* Mobile Tree Toggle */}
                <button className="mobile-only tree-toggle-btn glass-panel" onClick={() => setIsTreeOpen(true)}>
                    <List size={18} /> Course Content
                </button>

                {/* Mobile Tree Overlay */}
                {isTreeOpen && <div className="mobile-tree-overlay" onClick={() => setIsTreeOpen(false)} />}

                {/* Stage Navigator */}
                <div className={`glass-panel stage-navigator ${isTreeOpen ? 'mobile-open' : ''}`}>
                    <div className="tree-header flex-between" style={{ alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <h3 className="tree-title">Trading Mastery Tree</h3>
                            <div className="progress-bar-container">
                                <div className="progress-fill" style={{ width: `${(currentIndex / questions.length) * 100}%` }}></div>
                            </div>
                            <div className="progress-text">{currentIndex} / {questions.length} Complete</div>
                        </div>
                        <button className="mobile-only close-tree-btn" onClick={() => setIsTreeOpen(false)}>
                            <X size={20} color="var(--text-secondary)" />
                        </button>
                    </div>

                    <div className="stage-list">
                        {treeData.map((stage) => {
                            const isExpanded = expandedStage === stage.id;

                            return (
                                <div key={stage.id} className="stage-item">
                                    <div
                                        className={`stage-header ${isExpanded ? 'active' : ''}`}
                                        onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                                    >
                                        <div className="stage-title">STAGE {stage.id} - {stage.name}</div>
                                        <div className="stage-status">
                                            {stage.id < currentQ.stageId ? <CheckCircle2 size={14} color="var(--success)" /> : <Circle size={14} color="var(--accent-primary)" />}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="section-list">
                                            {stage.sections.map((sec: any) => {
                                                const isSecExpanded = expandedSection === sec.name;
                                                return (
                                                    <div key={sec.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div
                                                            className={`section-item ${sec.name === currentQ.SECTION ? 'active' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedSection(isSecExpanded ? null : sec.name);
                                                            }}
                                                        >
                                                            {sec.name} ({sec.questions.length})
                                                        </div>
                                                        {isSecExpanded && (
                                                            <div style={{ paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px', marginBottom: '8px', borderLeft: '1px solid var(--glass-border)' }}>
                                                                {sec.questions.map((q: any) => (
                                                                    <div
                                                                        key={q.QID}
                                                                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(q.globalIndex); }}
                                                                        style={{
                                                                            fontSize: '0.75rem',
                                                                            padding: '6px 8px',
                                                                            borderRadius: '4px',
                                                                            cursor: 'pointer',
                                                                            color: currentIndex === q.globalIndex ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                                                            background: currentIndex === q.globalIndex ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                                            whiteSpace: 'nowrap',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis'
                                                                        }}
                                                                        title={q.QUESTION}
                                                                    >
                                                                        {q.QID} - {q.QUESTION}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Main Reading Area */}
                <div className="reading-area">

                    <div className="breadcrumb-nav">
                        <span className="breadcrumb-item">Trading Mastery <ChevronRight size={14} /></span>
                        <span className="breadcrumb-item">Stage {currentQ.stageId}: {currentQ.stageName} <ChevronRight size={14} /></span>
                        <span className="breadcrumb-item breadcrumb-active">{currentQ.SECTION}</span>
                    </div>

                    <div className="reading-split">

                        {/* Question Card */}
                        <div className="glass-panel question-card">

                            <div className="q-header">
                                <div className="q-badge-group">
                                    <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'white' }}>
                                        {currentQ.QID}
                                    </span>
                                    <span className={`q-badge diff-₹{currentQ.DIFFICULTY}`}>
                                        <Circle size={10} fill="currentColor" /> {currentQ.DIFFICULTY}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                    <Clock size={14} /> {currentQ.READ_TIME}
                                </div>
                            </div>

                            <h1 className="q-title">{currentQ.QUESTION}</h1>

                            <div className="q-body">{currentQ.CORE_ANSWER}</div>

                            {currentQ.DEEP_DIVE && (
                                <div className="q-deep-dive">
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '8px', fontWeight: 600 }}>Deep Dive</div>
                                    {currentQ.DEEP_DIVE}
                                </div>
                            )}

                            {currentQ.KEY_INSIGHT && (
                                <div className="insight-box">
                                    <Lightbulb className="insight-icon" size={24} color="var(--success)" />
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: '4px' }}>Key Insight</div>
                                        <div style={{ fontSize: '0.95rem' }}>{currentQ.KEY_INSIGHT}</div>
                                    </div>
                                </div>
                            )}

                            {currentQ.COMMON_MISTAKE && (
                                <div className="insight-box warning">
                                    <AlertCircle className="insight-icon" size={24} color="var(--danger)" />
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: '4px' }}>Common Mistake</div>
                                        <div style={{ fontSize: '0.95rem' }}>{currentQ.COMMON_MISTAKE}</div>
                                    </div>
                                </div>
                            )}

                            {currentQ.QUIZ_Q && (
                                <div className="quiz-box">
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '12px', textTransform: 'uppercase' }}>Knowledge Check</div>
                                    <div style={{ fontSize: '1.05rem', fontWeight: 500, marginBottom: '16px' }}>{currentQ.QUIZ_Q}</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '16px', lineHeight: 1.6 }}>{currentQ.QUIZ_A}</div>

                                    {!showQuizAns ? (
                                        <button className="nav-btn" onClick={() => setShowQuizAns(true)}>Reveal Answer</button>
                                    ) : (
                                        <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderLeft: '3px solid var(--accent-primary)', borderRadius: '4px' }}>
                                            <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--accent-primary)' }}>Answer:</div>
                                            {currentQ.QUIZ_ANS}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="q-footer">
                                <button className="nav-btn" onClick={handlePrev} disabled={currentIndex === 0}>
                                    <ChevronLeft size={18} /> Previous
                                </button>
                                <button className="nav-btn primary" onClick={handleNext} disabled={currentIndex === questions.length - 1}>
                                    Next <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Notes Panel */}
                        <div className="glass-panel notes-panel">

                            {/* Header */}
                            <div className="notes-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <h3 className="section-title">Notes</h3>
                                    {currentSavedNotes.length > 0 && (
                                        <span style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                                            {currentSavedNotes.length}
                                        </span>
                                    )}
                                </div>
                                <button aria-label="Download Notes" title="Download all notes" onClick={handleDownloadNotes} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '8px', padding: '7px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    <Download size={15} />
                                </button>
                            </div>

                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                                Takeaways for <strong style={{ color: 'var(--accent-primary)' }}>{currentQ.QID}</strong>
                            </p>

                            {/* Write area with char count */}
                            <div style={{ position: 'relative', marginBottom: '10px' }}>
                                <textarea
                                    className="notes-area"
                                    placeholder="What did you learn? Press Ctrl+Enter to save..."
                                    value={currentDraft}
                                    maxLength={500}
                                    onChange={(e) => setDraftNote(prev => ({ ...prev, [currentQ.QID]: e.target.value }))}
                                    onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') handleSaveNotes(); }}
                                    style={{ flex: 'none', height: '110px', marginBottom: 0, paddingBottom: '26px', resize: 'none' }}
                                />
                                <span style={{ position: 'absolute', bottom: '8px', right: '10px', fontSize: '0.7rem', color: currentDraft.length > 450 ? 'var(--warning)' : 'var(--text-tertiary)', pointerEvents: 'none' }}>
                                    {currentDraft.length}/500
                                </span>
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={handleSaveNotes}
                                disabled={!currentDraft.trim()}
                                style={{
                                    width: '100%', padding: '9px',
                                    background: currentDraft.trim() ? 'var(--accent-gradient)' : 'var(--bg-tertiary)',
                                    color: currentDraft.trim() ? 'white' : 'var(--text-tertiary)',
                                    border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600,
                                    fontSize: '0.85rem', cursor: currentDraft.trim() ? 'pointer' : 'not-allowed',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                                    marginBottom: '16px', transition: 'all 0.2s',
                                    boxShadow: currentDraft.trim() ? '0 4px 14px rgba(59,130,246,0.25)' : 'none'
                                }}
                            >
                                <Save size={14} />
                                Save Note
                                <span style={{ opacity: 0.55, fontSize: '0.72rem', fontFamily: 'monospace' }}>Ctrl+↵</span>
                            </button>

                            {/* Tags */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Tags</div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {currentTags.map(tag => (
                                        <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderRadius: '12px', padding: '3px 6px 3px 10px', fontSize: '0.75rem', border: '1px solid var(--glass-border)' }}>
                                            #{tag}
                                            <button onClick={() => handleRemoveTag(tag)} style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: '1px', display: 'flex', lineHeight: 1 }} aria-label={`Remove ${tag}`}><X size={10} /></button>
                                        </span>
                                    ))}
                                    {showTagInput ? (
                                        <input
                                            autoFocus type="text" value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            onKeyDown={handleAddTag}
                                            onBlur={() => setShowTagInput(false)}
                                            placeholder="type & enter"
                                            style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', border: '1px solid var(--accent-primary)', background: 'transparent', color: 'var(--text-primary)', width: '90px', outline: 'none' }}
                                        />
                                    ) : (
                                        <button
                                            onClick={() => setShowTagInput(true)}
                                            style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)', border: '1px dashed var(--accent-primary)', borderRadius: '12px', padding: '3px 10px', fontSize: '0.75rem', cursor: 'pointer' }}
                                        >+ Add</button>
                                    )}
                                </div>
                            </div>

                            {/* Saved Notes */}
                            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                {currentSavedNotes.length > 1 && (
                                    <input
                                        type="text"
                                        placeholder="Search notes..."
                                        value={notesSearch}
                                        onChange={e => setNotesSearch(e.target.value)}
                                        style={{ width: '100%', padding: '7px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none', marginBottom: '12px' }}
                                    />
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
                                    {filteredNotes.map(note => (
                                        <div key={note.id} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', borderLeft: '3px solid var(--accent-primary)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {editingNoteId === note.id ? (
                                                <>
                                                    <textarea
                                                        autoFocus
                                                        value={editingText}
                                                        onChange={e => setEditingText(e.target.value)}
                                                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--accent-primary)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.875rem', padding: '8px', fontFamily: 'inherit', resize: 'none', height: '80px', outline: 'none', width: '100%' }}
                                                    />
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button onClick={() => { setEditingNoteId(null); setEditingText(''); }} style={{ padding: '5px 12px', borderRadius: '6px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: 'none', fontSize: '0.8rem', cursor: 'pointer' }}>Cancel</button>
                                                        <button onClick={() => handleSaveEdit(note.id)} style={{ padding: '5px 12px', borderRadius: '6px', background: 'var(--accent-gradient)', color: 'white', border: 'none', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>Save</button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{note.text}</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{note.date}</span>
                                                        <div style={{ display: 'flex', gap: '2px' }}>
                                                            <button onClick={() => navigator.clipboard.writeText(note.text)} title="Copy" aria-label="Copy note" style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex' }}><Copy size={13} /></button>
                                                            <button onClick={() => { setEditingNoteId(note.id); setEditingText(note.text); }} title="Edit" aria-label="Edit note" style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', opacity: 0.8 }}><Pencil size={13} /></button>
                                                            <button onClick={() => handleDeleteNote(currentQ.QID, note.id)} title="Delete" aria-label="Delete note" style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', opacity: 0.7 }}><Trash2 size={13} /></button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    {filteredNotes.length === 0 && currentSavedNotes.length === 0 && (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '28px 0', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '1.8rem' }}>📝</span>
                                            No notes yet. Write your first takeaway!
                                        </div>
                                    )}
                                    {filteredNotes.length === 0 && currentSavedNotes.length > 0 && (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>
                                            No notes match "{notesSearch}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
