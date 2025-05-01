import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Menu, X, LogOut } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5001';

function App() {
  const [notes, setNotes] = useState(() => {
    if (typeof window !== "undefined") {
      const savedNotes = localStorage.getItem("notes");
      return savedNotes ? JSON.parse(savedNotes) : [];
    }
    return [];
  });

  const [activeTab, setActiveTab] = useState(null);
  const [hoveredNote, setHoveredNote] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('googleToken');
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem("notes", JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  const handleAuthCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokens = urlParams.get('tokens');
    const error = urlParams.get('error');
    
    if (error) {
      console.error('Auth error:', error);
      return;
    }
    
    if (tokens) {
      try {
        const parsedTokens = JSON.parse(decodeURIComponent(tokens));
        localStorage.setItem('googleToken', JSON.stringify(parsedTokens));
        setIsAuthenticated(true);
        const newId = `note-${Date.now()}`;
        setNotes([{ id: newId, content: "" }]);
        setActiveTab(newId);
        window.history.replaceState({}, document.title, '/');
      } catch (error) {
        console.error('Error parsing tokens:', error);
      }
    }
  };

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleGoogleLogin = async () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleContentChange = (content) => {
    setNotes(notes.map((note) => (note.id === activeTab ? { ...note, content } : note)));
    setSidebarOpen(false);
  };

  const addNewTab = () => {
    const newId = `note-${Date.now()}`;
    setNotes([...notes, { id: newId, content: "" }]);
    setActiveTab(newId);
  };

  const closeTab = (id, e) => {
    e.stopPropagation();

    if (notes.length === 1) {
      setNotes([{ id: notes[0].id, content: "" }]);
      return;
    }

    const newNotes = notes.filter((note) => note.id !== id);
    setNotes(newNotes);

    if (activeTab === id) {
      setActiveTab(newNotes[0].id);
    }
  };

  const deleteNote = () => {
    if (notes.length === 1) {
      setNotes([{ id: notes[0].id, content: "" }]);
    } else {
      const newNotes = notes.filter((note) => note.id !== activeTab);
      setNotes(newNotes);
      setActiveTab(newNotes[0].id);
    }
  };

  const getTabTitle = (content) => {
    const firstLine = content.split("\n")[0].trim();
    if (!firstLine) return "Untitled";

    const maxLength = Math.max(10, 30 - notes.length * 2);
    return firstLine.length > maxLength ? firstLine.substring(0, maxLength) + "..." : firstLine;
  };

  const handleKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.target;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const activeNoteContent = notes.find((note) => note.id === activeTab)?.content || "";
      const newContent = activeNoteContent.substring(0, start) + "    " + activeNoteContent.substring(end);
      handleContentChange(newContent);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('googleToken');
    setIsAuthenticated(false);
    setNotes([]);
    setActiveTab(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            duration: 0.6,
          }}
          className="animate-float"
        >
          <div className="relative">
            <h1 className="text-6xl font-bold text-white">
              Clea<span className="text-purple-500 animate-pulse-glow">Note</span>
            </h1>
            <div className="absolute -inset-2 bg-purple-500/20 blur-xl rounded-full -z-10"></div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black p-4">
        <div className="w-full max-w-md mx-auto flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              duration: 0.6,
            }}
            className="mb-8 animate-float"
          >
            <div className="relative">
              <h1 className="text-6xl font-bold text-white">
                Clea<span className="text-purple-500 animate-pulse-glow">Note</span>
              </h1>
              <div className="absolute -inset-2 bg-purple-500/20 blur-xl rounded-full -z-10"></div>
            </div>
            <p className="text-purple-300 text-center mt-2 animate-fade-in">Minimal. Beautiful. Focused.</p>
          </motion.div>

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="w-full animate-slide-in"
          >
            <div className="bg-zinc-900/70 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-purple-500/20 relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 -z-10 animate-pulse-glow"></div>

              <h2 className="text-2xl font-bold text-white mb-6 text-center animate-fade-in">Welcome Back</h2>

              <div className="space-y-6">
                <button
                  onClick={handleGoogleLogin}
                  className="w-full relative overflow-hidden group border border-purple-500/30 hover:border-purple-500 bg-zinc-900/50 text-white hover:text-white hover:bg-zinc-800 rounded-lg px-4 py-2 flex items-center justify-center gap-3 transition-all duration-300 ease-bounce-in"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </button>
              </div>

              <div className="mt-8 text-center text-xs text-zinc-400 animate-fade-in">
                By continuing, you agree to CleaNote's
                <br />
                Terms of Service and Privacy Policy
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-purple-300/50 text-sm text-center animate-fade-in"
          >
            The simplest way to capture your thoughts.
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-amber-50">
      <header className="flex justify-between items-center p-2 border-b bg-amber-50">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-amber-100 rounded-lg transition-colors mr-2"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-2 overflow-x-auto">
              {notes.map(note => (
                <button
                  key={note.id}
                  onClick={() => setActiveTab(note.id)}
                  className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center ${
                    activeTab === note.id
                      ? 'bg-amber-100 text-gray-900'
                      : 'text-gray-600 hover:bg-amber-50'
                  }`}
                >
                  <span>{getTabTitle(note.content)}</span>
                  <button
                    onClick={(e) => closeTab(note.id, e)}
                    className="ml-2 p-1 hover:bg-amber-200 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </button>
              ))}
              <button
                onClick={addNewTab}
                className="px-4 py-2 text-gray-600 hover:bg-amber-50 rounded-lg transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={deleteNote}
              className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
            >
              <Trash2 className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              className="absolute left-0 top-0 bottom-0 w-64 border-r bg-amber-50 p-4 z-10"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.1, duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">All Notes</h2>
              </div>
              <div className="space-y-2">
                {notes.map((note, index) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onMouseEnter={() => setHoveredNote(note.id)}
                    onMouseLeave={() => setHoveredNote(null)}
                  >
                    <button
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                        activeTab === note.id
                          ? 'bg-amber-100'
                          : hoveredNote === note.id
                          ? 'bg-amber-50 shadow-md transform -translate-y-0.5'
                          : 'hover:bg-amber-50'
                      }`}
                      onClick={() => {
                        setActiveTab(note.id);
                        setSidebarOpen(false);
                      }}
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {getTabTitle(note.content)}
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>
              <button
                onClick={() => {
                  addNewTab();
                  setSidebarOpen(false);
                }}
                className="w-full mt-4 p-2 text-gray-600 hover:bg-amber-50 rounded-lg transition-colors"
              >
                + New Note
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div 
          className="flex-1 relative h-full bg-amber-50"
          onClick={() => setSidebarOpen(false)}
        >
          {activeTab ? (
            <div className="w-full h-full">
              <textarea
                ref={textareaRef}
                value={notes.find(note => note.id === activeTab)?.content || ''}
                onChange={(e) => handleContentChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-full p-6 bg-transparent border-none resize-none focus:ring-0 focus:outline-none"
                placeholder="Start typing..."
                style={{ 
                  caretColor: "#000",
                  fontFamily: "inherit",
                  lineHeight: "1.5",
                  fontSize: "1rem"
                }}
              />
              <style>
                {`
                  textarea {
                    white-space: pre-wrap;
                  }
                  textarea::first-line {
                    font-weight: bold;
                    font-size: 1.25rem;
                  }
                `}
              </style>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <p className="text-xl mb-4">Welcome to CleaNote</p>
              <p className="text-sm">Click the + button to create a new note</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App; 