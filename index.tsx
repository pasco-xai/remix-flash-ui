/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

//Vibe coded by pasco@brain

import { GoogleGenAI } from '@google/genai';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    onAuthStateChanged, 
    signInWithPopup, 
    signOut, 
    User 
} from 'firebase/auth';
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs, 
    Timestamp,
    serverTimestamp 
} from 'firebase/firestore';

import { 
    auth, 
    db, 
    googleProvider, 
    handleFirestoreError, 
    OperationType 
} from './src/lib/firebase';
import { 
    Artifact, 
    Session, 
    ComponentVariation, 
    LayoutOption,
    SavedArtifact,
    PromptHistoryItem
} from './types';
import { INITIAL_PLACEHOLDERS } from './constants';
import { generateId } from './utils';

import DottedGlowBackground from './components/DottedGlowBackground';
import ArtifactCard from './components/ArtifactCard';
import SideDrawer from './components/SideDrawer';
import ChatScreen from './components/ChatScreen';
import SlashMenu from './components/SlashMenu';
import HelpModal from './components/HelpModal';
import { 
    ThinkingIcon, 
    CodeIcon, 
    SparklesIcon, 
    ArrowLeftIcon, 
    ArrowRightIcon, 
    ArrowUpIcon, 
    GridIcon,
    MessageCircleIcon,
    CopyIcon,
    DownloadIcon,
    CheckIcon
} from './components/Icons';

import { 
    BookmarkIcon,
    HistoryIcon,
    UserIcon,
    LogOutIcon,
    PlusIcon
} from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [savedArtifacts, setSavedArtifacts] = useState<SavedArtifact[]>([]);
  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number>(-1);
  const [focusedArtifactIndex, setFocusedArtifactIndex] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  
  const [inputValue, setInputValue] = useState<string>('');
  const [isSlashMenuVisible, setIsSlashMenuVisible] = useState<boolean>(false);
  const [slashQuery, setSlashQuery] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholders, setPlaceholders] = useState<string[]>(INITIAL_PLACEHOLDERS);
  
  const [drawerState, setDrawerState] = useState<{
      isOpen: boolean;
      mode: 'code' | 'variations' | null;
      title: string;
      data: any; 
  }>({ isOpen: false, mode: null, title: '', data: null });

  const [copyingHtml, setCopyingHtml] = useState<boolean>(false);
  const [copyingCss, setCopyingCss] = useState<boolean>(false);

  const [componentVariations, setComponentVariations] = useState<ComponentVariation[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        if (u) {
            fetchLibrary(u.uid);
            fetchPromptHistory(u.uid);
        } else {
            setSavedArtifacts([]);
            setPromptHistory([]);
        }
    });
    return () => unsubscribe();
  }, []);

  const fetchLibrary = async (uid: string) => {
      try {
          const q = query(
              collection(db, 'saved_artifacts'),
              where('userId', '==', uid),
              orderBy('timestamp', 'desc')
          );
          const querySnapshot = await getDocs(q);
          const artifacts = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
          })) as SavedArtifact[];
          setSavedArtifacts(artifacts);
      } catch (e) {
          console.error("Error fetching library:", e);
      }
  };

  const fetchPromptHistory = async (uid: string) => {
      try {
          const q = query(
              collection(db, 'prompt_history'),
              where('userId', '==', uid),
              orderBy('timestamp', 'desc'),
              limit(10)
          );
          const querySnapshot = await getDocs(q);
          const history = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
          })) as PromptHistoryItem[];
          setPromptHistory(history);
      } catch (e) {
          console.error("Error fetching history:", e);
      }
  };

  const handleLogin = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (e) {
        console.error("Login failed:", e);
    }
  };

  const handleLogout = async () => {
    try {
        await signOut(auth);
    } catch (e) {
        console.error("Logout failed:", e);
    }
  };

  const saveToLibrary = async (artifact: Artifact, prompt: string) => {
      if (!user) {
          handleLogin();
          return;
      }
      try {
          const docRef = await addDoc(collection(db, 'saved_artifacts'), {
              userId: user.uid,
              prompt: prompt,
              html: artifact.html,
              styleName: artifact.styleName,
              timestamp: serverTimestamp()
          });
          setSavedArtifacts(prev => [{
              id: docRef.id,
              userId: user.uid,
              prompt,
              html: artifact.html,
              styleName: artifact.styleName,
              timestamp: new Date().toISOString()
          }, ...prev]);
          alert("Saved to library!");
      } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, 'saved_artifacts');
      }
  };

  const savePromptToHistory = async (prompt: string) => {
      if (!user) return;
      try {
          await addDoc(collection(db, 'prompt_history'), {
              userId: user.uid,
              prompt,
              timestamp: serverTimestamp()
          });
          fetchPromptHistory(user.uid);
      } catch (e) {
          console.error("Error saving prompt history:", e);
      }
  };
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (e.key === '/' && document.activeElement !== inputRef.current) {
            e.preventDefault();
            inputRef.current?.focus();
            setInputValue('/');
            setIsSlashMenuVisible(true);
            setSlashQuery('');
        }
        if (e.key === '?' && document.activeElement !== inputRef.current) {
            e.preventDefault();
            setIsHelpOpen(true);
        }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
      inputRef.current?.focus();
  }, []);

  // Fix for mobile: reset scroll when focusing an item to prevent "overscroll" state
  useEffect(() => {
    if (focusedArtifactIndex !== null && window.innerWidth <= 1024) {
        if (gridScrollRef.current) {
            gridScrollRef.current.scrollTop = 0;
        }
        window.scrollTo(0, 0);
    }
  }, [focusedArtifactIndex]);

  // Cycle placeholders
  useEffect(() => {
      const interval = setInterval(() => {
          setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
      }, 3000);
      return () => clearInterval(interval);
  }, [placeholders.length]);

  // Dynamic placeholder generation on load
  useEffect(() => {
      const fetchDynamicPlaceholders = async () => {
          try {
              const apiKey = process.env.API_KEY;
              if (!apiKey) return;
              const ai = new GoogleGenAI({ apiKey });
              const response = await ai.models.generateContent({
                  model: 'gemini-3-flash-preview',
                  contents: { 
                      role: 'user', 
                      parts: [{ 
                          text: 'Generate 20 creative, short, diverse UI component prompts (e.g. "bioluminescent task list"). Return ONLY a raw JSON array of strings. IP SAFEGUARD: Avoid referencing specific famous artists, movies, or brands.' 
                      }] 
                  }
              });
              const text = response.text || '[]';
              const jsonMatch = text.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                  const newPlaceholders = JSON.parse(jsonMatch[0]);
                  if (Array.isArray(newPlaceholders) && newPlaceholders.length > 0) {
                      const shuffled = newPlaceholders.sort(() => 0.5 - Math.random()).slice(0, 10);
                      setPlaceholders(prev => [...prev, ...shuffled]);
                  }
              }
          } catch (e) {
              console.warn("Silently failed to fetch dynamic placeholders", e);
          }
      };
      setTimeout(fetchDynamicPlaceholders, 1000);
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);

    if (value.startsWith('/')) {
        setIsSlashMenuVisible(true);
        setSlashQuery(value.substring(1));
    } else {
        setIsSlashMenuVisible(false);
    }
  };

  const executeCommand = (command: string) => {
    setIsSlashMenuVisible(false);
    setInputValue('');

    const [cmd, ...args] = command.split(' ');
    
    switch (cmd.toLowerCase()) {
        case '/next':
            nextItem();
            break;
        case '/prev':
            prevItem();
            break;
        case '/focus':
            if (args.length > 0) {
                const idx = parseInt(args[0]);
                if (!isNaN(idx) && idx >= 1 && idx <= 3) {
                    setFocusedArtifactIndex(idx - 1);
                }
            } else {
                setInputValue('/focus ');
                setIsSlashMenuVisible(false);
                return;
            }
            break;
        case '/unfocus':
            setFocusedArtifactIndex(null);
            break;
        case '/variations':
            handleGenerateVariations();
            break;
        case '/export':
            handleDownloadCode();
            break;
        case '/chat':
            setIsChatOpen(true);
            break;
        case '/help':
            setIsHelpOpen(true);
            break;
        default:
            console.warn("Unknown command:", cmd);
    }
  };

  const parseJsonStream = async function* (responseStream: AsyncGenerator<{ text: string }>) {
      let buffer = '';
      for await (const chunk of responseStream) {
          const text = chunk.text;
          if (typeof text !== 'string') continue;
          buffer += text;
          let braceCount = 0;
          let start = buffer.indexOf('{');
          while (start !== -1) {
              braceCount = 0;
              let end = -1;
              for (let i = start; i < buffer.length; i++) {
                  if (buffer[i] === '{') braceCount++;
                  else if (buffer[i] === '}') braceCount--;
                  if (braceCount === 0 && i > start) {
                      end = i;
                      break;
                  }
              }
              if (end !== -1) {
                  const jsonString = buffer.substring(start, end + 1);
                  try {
                      yield JSON.parse(jsonString);
                      buffer = buffer.substring(end + 1);
                      start = buffer.indexOf('{');
                  } catch (e) {
                      start = buffer.indexOf('{', start + 1);
                  }
              } else {
                  break; 
              }
          }
      }
  };

  const handleGenerateVariations = useCallback(async () => {
    const currentSession = sessions[currentSessionIndex];
    if (!currentSession || focusedArtifactIndex === null) return;
    const currentArtifact = currentSession.artifacts[focusedArtifactIndex];

    setIsLoading(true);
    setComponentVariations([]);
    setDrawerState({ isOpen: true, mode: 'variations', title: 'Variations', data: currentArtifact.id });

    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("API_KEY is not configured.");
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
You are a master UI/UX designer. Generate 3 RADICAL CONCEPTUAL VARIATIONS of: "${currentSession.prompt}".

**CREATIVE GUIDANCE (Use these as EXAMPLES of how to describe style, but INVENT YOUR OWN):**
1. Example: "Asymmetrical Primary Grid" (Heavy black strokes, rectilinear structure, flat primary pigments, high-contrast white space).
2. Example: "Suspended Kinetic Mobile" (Delicate wire-thin connections, floating organic primary shapes, slow-motion balance, white-void background).
3. Example: "Grainy Risograph Press" (Overprinted translucent inks, dithered grain textures, monochromatic color depth, raw paper substrate).
4. Example: "Volumetric Spectral Fluid" (Generative morphing gradients, soft-focus diffusion, bioluminescent light sources, spectral chromatic aberration).

**YOUR TASK:**
For EACH variation:
- Invent a unique design persona name based on a NEW physical metaphor.
- Rewrite the prompt to fully adopt that metaphor's visual language.
- Generate high-fidelity HTML/CSS.

Required JSON Output Format (stream ONE object per line):
\`{ "name": "Persona Name", "html": "..." }\`
        `.trim();

        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-3-flash-preview',
             contents: [{ parts: [{ text: prompt }], role: 'user' }],
             config: { temperature: 1.2 }
        });

        for await (const variation of parseJsonStream(responseStream)) {
            if (variation.name && variation.html) {
                setComponentVariations(prev => [...prev, variation]);
            }
        }
    } catch (e: any) {
        console.error("Error generating variations:", e);
    } finally {
        setIsLoading(false);
    }
  }, [sessions, currentSessionIndex, focusedArtifactIndex]);

  const applyVariation = (html: string) => {
      if (focusedArtifactIndex === null) return;
      setSessions(prev => prev.map((sess, i) => 
          i === currentSessionIndex ? {
              ...sess,
              artifacts: sess.artifacts.map((art, j) => 
                j === focusedArtifactIndex ? { ...art, html, status: 'complete' } : art
              )
          } : sess
      ));
      setDrawerState(s => ({ ...s, isOpen: false }));
  };

  const handleShowCode = () => {
      const currentSession = sessions[currentSessionIndex];
      if (currentSession && focusedArtifactIndex !== null) {
          const artifact = currentSession.artifacts[focusedArtifactIndex];
          setDrawerState({ isOpen: true, mode: 'code', title: 'Code Editor', data: artifact.html });
      }
  };

  const handleUpdateCode = (newHtml: string) => {
      if (focusedArtifactIndex === null) return;
      setSessions(prev => prev.map((sess, i) => 
          i === currentSessionIndex ? {
              ...sess,
              artifacts: sess.artifacts.map((art, j) => 
                j === focusedArtifactIndex ? { ...art, html: newHtml } : art
              )
          } : sess
      ));
      setDrawerState(s => ({ ...s, data: newHtml }));
  };

  const handleCopyHtml = async () => {
    const currentSession = sessions[currentSessionIndex];
    if (currentSession && focusedArtifactIndex !== null) {
        const artifact = currentSession.artifacts[focusedArtifactIndex];
        // Strip style tags if we want just HTML, but usually users want the whole thing
        // Let's provide "Copy Full HTML"
        try {
            await navigator.clipboard.writeText(artifact.html);
            setCopyingHtml(true);
            setTimeout(() => setCopyingHtml(false), 2000);
        } catch (err) {
            console.error("Failed to copy HTML:", err);
        }
    }
  };

  const handleCopyCss = async () => {
    const currentSession = sessions[currentSessionIndex];
    if (currentSession && focusedArtifactIndex !== null) {
        const artifact = currentSession.artifacts[focusedArtifactIndex];
        const styleMatch = artifact.html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        const css = styleMatch ? styleMatch[1].trim() : "/* No CSS found in artifact */";
        
        try {
            await navigator.clipboard.writeText(css);
            setCopyingCss(true);
            setTimeout(() => setCopyingCss(false), 2000);
        } catch (err) {
            console.error("Failed to copy CSS:", err);
        }
    }
  };

  const handleDownloadCode = () => {
    const currentSession = sessions[currentSessionIndex];
    if (currentSession && focusedArtifactIndex !== null) {
        const artifact = currentSession.artifacts[focusedArtifactIndex];
        const blob = new Blob([artifact.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flash-ui-artifact-${artifact.id}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
  };

  const handleSendMessage = useCallback(async (manualPrompt?: string) => {
    const promptToUse = manualPrompt || inputValue;
    const trimmedInput = promptToUse.trim();
    
    if (!trimmedInput || isLoading) return;
    if (!manualPrompt) setInputValue('');

    // Save to history
    savePromptToHistory(trimmedInput);

    setIsLoading(true);
    const baseTime = Date.now();
    const sessionId = generateId();

    const placeholderArtifacts: Artifact[] = Array(3).fill(null).map((_, i) => ({
        id: `${sessionId}_${i}`,
        styleName: 'Designing...',
        html: '',
        status: 'streaming',
    }));

    const newSession: Session = {
        id: sessionId,
        prompt: trimmedInput,
        timestamp: baseTime,
        artifacts: placeholderArtifacts
    };

    setSessions(prev => [...prev, newSession]);
    setCurrentSessionIndex(sessions.length); 
    setFocusedArtifactIndex(null); 

    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("API_KEY is not configured.");
        const ai = new GoogleGenAI({ apiKey });

        const stylePrompt = `
Generate 3 distinct, highly evocative design directions for: "${trimmedInput}".

**CREATIVE EXAMPLES (Do not simply copy these, use them as a guide for tone):**
- Example A: "Asymmetrical Rectilinear Blockwork" (Grid-heavy, primary pigments, thick structural strokes, Bauhaus-functionalism vibe).
- Example B: "Grainy Risograph Layering" (Tactile paper texture, overprinted translucent inks, dithered gradients).
- Example C: "Kinetic Wireframe Suspension" (Floating silhouettes, thin balancing lines, organic primary shapes).
- Example D: "Spectral Prismatic Diffusion" (Glassmorphism, caustic refraction, soft-focus morphing gradients).

**GOAL:**
Return ONLY a raw JSON array of 3 *NEW*, creative names for these directions (e.g. ["Tactile Risograph Press", "Kinetic Silhouette Balance", "Primary Pigment Gridwork"]).
        `.trim();

        const styleResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { role: 'user', parts: [{ text: stylePrompt }] }
        });

        let generatedStyles: string[] = [];
        const styleText = styleResponse.text || '[]';
        const jsonMatch = styleText.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
            try {
                generatedStyles = JSON.parse(jsonMatch[0]);
            } catch (e) {
                console.warn("Failed to parse styles, using fallbacks");
            }
        }

        if (!generatedStyles || generatedStyles.length < 3) {
            generatedStyles = [
                "Primary Pigment Gridwork",
                "Tactile Risograph Layering",
                "Kinetic Silhouette Balance"
            ];
        }
        
        generatedStyles = generatedStyles.slice(0, 3);

        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            return {
                ...s,
                artifacts: s.artifacts.map((art, i) => ({
                    ...art,
                    styleName: generatedStyles[i]
                }))
            };
        }));

        const generateArtifact = async (artifact: Artifact, styleInstruction: string) => {
            try {
                const prompt = `
You are Flash UI. Create a stunning, high-fidelity UI component for: "${trimmedInput}".

**CONCEPTUAL DIRECTION: ${styleInstruction}**

**VISUAL EXECUTION RULES:**
1. **Materiality**: Use the specified metaphor to drive every CSS choice. (e.g. if Risograph, use \`feTurbulence\` for grain and \`mix-blend-mode: multiply\` for ink layering).
2. **Typography**: Use high-quality web fonts. Pair a bold sans-serif with a refined monospace for data.
3. **Motion**: Include subtle, high-performance CSS/JS animations (hover transitions, entry reveals).
4. **Layout**: Be bold with negative space and hierarchy. Avoid generic cards.

Return ONLY RAW HTML. No markdown fences.
          `.trim();
          
                const responseStream = await ai.models.generateContentStream({
                    model: 'gemini-3-flash-preview',
                    contents: [{ parts: [{ text: prompt }], role: "user" }],
                });

                let accumulatedHtml = '';
                for await (const chunk of responseStream) {
                    const text = chunk.text;
                    if (typeof text === 'string') {
                        accumulatedHtml += text;
                        setSessions(prev => prev.map(sess => 
                            sess.id === sessionId ? {
                                ...sess,
                                artifacts: sess.artifacts.map(art => 
                                    art.id === artifact.id ? { ...art, html: accumulatedHtml } : art
                                )
                            } : sess
                        ));
                    }
                }
                
                let finalHtml = accumulatedHtml.trim();
                if (finalHtml.startsWith('```html')) finalHtml = finalHtml.substring(7).trimStart();
                if (finalHtml.startsWith('```')) finalHtml = finalHtml.substring(3).trimStart();
                if (finalHtml.endsWith('```')) finalHtml = finalHtml.substring(0, finalHtml.length - 3).trimEnd();

                setSessions(prev => prev.map(sess => 
                    sess.id === sessionId ? {
                        ...sess,
                        artifacts: sess.artifacts.map(art => 
                            art.id === artifact.id ? { ...art, html: finalHtml, status: finalHtml ? 'complete' : 'error' } : art
                        )
                    } : sess
                ));

            } catch (e: any) {
                console.error('Error generating artifact:', e);
                setSessions(prev => prev.map(sess => 
                    sess.id === sessionId ? {
                        ...sess,
                        artifacts: sess.artifacts.map(art => 
                            art.id === artifact.id ? { ...art, html: `<div style="color: #ff6b6b; padding: 20px;">Error: ${e.message}</div>`, status: 'error' } : art
                        )
                    } : sess
                ));
            }
        };

        await Promise.all(placeholderArtifacts.map((art, i) => generateArtifact(art, generatedStyles[i])));

    } catch (e) {
        console.error("Fatal error in generation process", e);
    } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [inputValue, isLoading, sessions.length]);

  const handleSurpriseMe = () => {
      const currentPrompt = placeholders[placeholderIndex];
      setInputValue(currentPrompt);
      handleSendMessage(currentPrompt);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
        if (isSlashMenuVisible) {
            setIsSlashMenuVisible(false);
            setInputValue('');
        } else if (focusedArtifactIndex !== null) {
            setFocusedArtifactIndex(null);
        } else if (drawerState.isOpen) {
            setDrawerState(s => ({...s, isOpen: false}));
        }
    } else if (event.key === 'Enter' && !isLoading) {
      if (isSlashMenuVisible) {
          return;
      }
      event.preventDefault();
      handleSendMessage();
    } else if (event.key === 'Tab' && !inputValue && !isLoading) {
        event.preventDefault();
        setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
    }
  };

  const nextItem = useCallback(() => {
      if (focusedArtifactIndex !== null) {
          if (focusedArtifactIndex < 2) setFocusedArtifactIndex(focusedArtifactIndex + 1);
      } else {
          if (currentSessionIndex < sessions.length - 1) setCurrentSessionIndex(currentSessionIndex + 1);
      }
  }, [currentSessionIndex, sessions.length, focusedArtifactIndex]);

  const prevItem = useCallback(() => {
      if (focusedArtifactIndex !== null) {
          if (focusedArtifactIndex > 0) setFocusedArtifactIndex(focusedArtifactIndex - 1);
      } else {
           if (currentSessionIndex > 0) setCurrentSessionIndex(currentSessionIndex - 1);
      }
  }, [currentSessionIndex, focusedArtifactIndex]);

  const isLoadingDrawer = isLoading && drawerState.mode === 'variations' && componentVariations.length === 0;

  const hasStarted = sessions.length > 0 || isLoading;
  const currentSession = sessions[currentSessionIndex];

  let canGoBack = false;
  let canGoForward = false;

  if (hasStarted) {
      if (focusedArtifactIndex !== null) {
          canGoBack = focusedArtifactIndex > 0;
          canGoForward = focusedArtifactIndex < (currentSession?.artifacts.length || 0) - 1;
      } else {
          canGoBack = currentSessionIndex > 0;
          canGoForward = currentSessionIndex < sessions.length - 1;
      }
  }

  return (
    <>
        <a href="https://x.com/pascoxAI" target="_blank" rel="noreferrer" className={`creator-credit ${hasStarted ? 'hide-on-mobile' : ''}`}>
            created by @pascoxAI
        </a>

        <button className="chat-toggle-btn" onClick={() => setIsChatOpen(true)}>
            <GridIcon />
            <span>Blueprint Co-planning</span>
        </button>

        <button 
            className="chat-toggle-btn" 
            style={{ left: 'auto', right: '24px', top: '24px' }} 
            onClick={() => setIsHelpOpen(true)}
            title="Help (Shift + ?)"
        >
            <SparklesIcon />
            <span>Shortcuts</span>
        </button>

        <ChatScreen 
            isOpen={isChatOpen} 
            onClose={() => setIsChatOpen(false)} 
        />
        
        <button className="library-btn" onClick={() => setIsLibraryOpen(true)}>
            <BookmarkIcon size={20} />
            <span>My Library</span>
        </button>

        {user ? (
            <div className="user-profile-widget" style={{ position: 'fixed', top: '24px', right: '160px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{user.displayName}</span>
                <button className="auth-btn" onClick={handleLogout}><LogOutIcon size={14} /></button>
            </div>
        ) : (
            <button className="library-btn" style={{ left: 'auto', right: '160px' }} onClick={handleLogin}>
                <UserIcon size={20} />
                <span>Login</span>
            </button>
        )}

        <SideDrawer 
            isOpen={isLibraryOpen} 
            onClose={() => setIsLibraryOpen(false)} 
            title="My Library"
        >
            <div className="library-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {savedArtifacts.map((art) => (
                    <div key={art.id} className="sexy-card" onClick={() => {
                        setSessions([{
                            id: generateId(),
                            prompt: art.prompt,
                            timestamp: Date.now(),
                            artifacts: [{
                                id: art.id,
                                styleName: art.styleName,
                                html: art.html,
                                status: 'complete'
                            }, ...Array(2).fill(null).map((_, i) => ({
                                id: generateId(),
                                styleName: 'Placeholder',
                                html: art.html, // Just for preview
                                status: 'complete'
                            }))]
                        }]);
                        setCurrentSessionIndex(0);
                        setIsLibraryOpen(false);
                    }}>
                        <div className="sexy-preview" style={{ height: '160px' }}>
                            <iframe srcDoc={art.html} title={art.prompt} sandbox="allow-scripts allow-same-origin" />
                        </div>
                        <div className="sexy-label">
                            <div style={{ fontWeight: 600 }}>{art.prompt}</div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{art.styleName}</div>
                        </div>
                    </div>
                ))}
                {savedArtifacts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        Nothing saved yet.
                    </div>
                )}
            </div>
        </SideDrawer>

        <HelpModal 
            isOpen={isHelpOpen} 
            onClose={() => setIsHelpOpen(false)} 
        />

        <SideDrawer 
            isOpen={drawerState.isOpen} 
            onClose={() => setDrawerState(s => ({...s, isOpen: false}))} 
            title={drawerState.title}
        >
            {isLoadingDrawer && (
                 <div className="loading-state">
                     <ThinkingIcon /> 
                     Designing variations...
                 </div>
            )}

            {drawerState.mode === 'code' && (
                <div className="code-view-container">
                    <div className="code-actions">
                        <button onClick={handleCopyHtml} className="code-action-btn">
                            {copyingHtml ? <CheckIcon /> : <CopyIcon />}
                            <span>{copyingHtml ? 'Copied' : 'Copy HTML'}</span>
                        </button>
                        <button onClick={handleCopyCss} className="code-action-btn">
                            {copyingCss ? <CheckIcon /> : <CodeIcon />}
                            <span>{copyingCss ? 'Copied' : 'Copy CSS'}</span>
                        </button>
                        <button onClick={handleDownloadCode} className="code-action-btn">
                            <DownloadIcon />
                            <span>Download</span>
                        </button>
                    </div>
                    <textarea 
                        className="code-editor"
                        value={drawerState.data}
                        onChange={(e) => handleUpdateCode(e.target.value)}
                        spellCheck={false}
                    />
                </div>
            )}
            
            {drawerState.mode === 'variations' && (
                <div className="sexy-grid">
                    {componentVariations.map((v, i) => (
                         <div key={i} className="sexy-card" onClick={() => applyVariation(v.html)}>
                             <div className="sexy-preview">
                                 <iframe srcDoc={v.html} title={v.name} sandbox="allow-scripts allow-same-origin" />
                             </div>
                             <div className="sexy-label">{v.name}</div>
                         </div>
                    ))}
                </div>
            )}
        </SideDrawer>

        <div className="immersive-app">
            <DottedGlowBackground 
                gap={24} 
                radius={1.5} 
                color="rgba(255, 255, 255, 0.02)" 
                glowColor="rgba(255, 255, 255, 0.15)" 
                speedScale={0.5} 
            />

            <div className={`stage-container ${focusedArtifactIndex !== null ? 'mode-focus' : 'mode-split'}`}>
                 <div className={`empty-state ${hasStarted ? 'fade-out' : ''}`}>
                     <div className="empty-content">
                         <h1>Flash UI</h1>
                         <p>Creative UI generation in a flash</p>
                         <button className="surprise-button" onClick={handleSurpriseMe} disabled={isLoading}>
                             <SparklesIcon /> Surprise Me
                         </button>
                     </div>
                 </div>

                {sessions.map((session, sIndex) => {
                    let positionClass = 'hidden';
                    if (sIndex === currentSessionIndex) positionClass = 'active-session';
                    else if (sIndex < currentSessionIndex) positionClass = 'past-session';
                    else if (sIndex > currentSessionIndex) positionClass = 'future-session';
                    
                    return (
                        <div key={session.id} className={`session-group ${positionClass}`}>
                            <div className="artifact-grid" ref={sIndex === currentSessionIndex ? gridScrollRef : null}>
                                {session.artifacts.map((artifact, aIndex) => {
                                    const isFocused = focusedArtifactIndex === aIndex;
                                    
                                    return (
                                        <ArtifactCard 
                                            key={artifact.id}
                                            artifact={artifact}
                                            isFocused={isFocused}
                                            onClick={() => setFocusedArtifactIndex(aIndex)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

             {canGoBack && (
                <button className="nav-handle left" onClick={prevItem} aria-label="Previous">
                    <ArrowLeftIcon />
                </button>
             )}
             {canGoForward && (
                <button className="nav-handle right" onClick={nextItem} aria-label="Next">
                    <ArrowRightIcon />
                </button>
             )}

            <div className={`action-bar ${focusedArtifactIndex !== null ? 'visible' : ''}`}>
                 <div className="active-prompt-label">
                    {currentSession?.prompt}
                 </div>
                 <div className="action-buttons">
                    <button onClick={() => setFocusedArtifactIndex(null)}>
                        <GridIcon /> Grid View
                    </button>
                    <button onClick={handleGenerateVariations} disabled={isLoading}>
                        <SparklesIcon /> Variations
                    </button>
                    <button onClick={handleCopyHtml} title="Copy Full HTML">
                        {copyingHtml ? <CheckIcon /> : <CopyIcon />} {copyingHtml ? 'HTML Copied' : 'Copy HTML'}
                    </button>
                    <button onClick={handleCopyCss} title="Copy CSS only">
                        {copyingCss ? <CheckIcon /> : <CodeIcon />} {copyingCss ? 'CSS Copied' : 'Copy CSS'}
                    </button>
                    <button onClick={handleDownloadCode} title="Download HTML File">
                        <DownloadIcon /> Export
                    </button>
                    <button onClick={handleShowCode}>
                        <CodeIcon /> Source
                    </button>
                    <button onClick={() => saveToLibrary(currentSession.artifacts[focusedArtifactIndex!], currentSession.prompt)} disabled={isLoading || currentSession.artifacts[focusedArtifactIndex!].status === 'streaming'}>
                        <BookmarkIcon size={18} /> Save to Library
                    </button>
                 </div>
            </div>

            <div className="floating-input-container">
                {isHistoryOpen && promptHistory.length > 0 && (
                    <div className="history-dropdown">
                        {promptHistory.map((item, i) => (
                            <div 
                                key={item.id} 
                                className="history-item" 
                                onClick={() => {
                                    setInputValue(item.prompt);
                                    setIsHistoryOpen(false);
                                }}
                            >
                                {item.prompt}
                            </div>
                        ))}
                    </div>
                )}
                <SlashMenu 
                    query={slashQuery} 
                    isVisible={isSlashMenuVisible} 
                    onSelect={executeCommand} 
                />
                <div className={`input-wrapper ${isLoading ? 'loading' : ''}`}>
                    <button 
                        className="history-toggle-btn" 
                        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', marginLeft: '12px', cursor: 'pointer' }}
                    >
                        <HistoryIcon size={18} />
                    </button>
                    {(!inputValue && !isLoading) && (
                        <div className="animated-placeholder" key={placeholderIndex}>
                            <span className="placeholder-text">{placeholders[placeholderIndex]}</span>
                            <span className="tab-hint">Tab</span>
                        </div>
                    )}
                    {!isLoading ? (
                        <input 
                            ref={inputRef}
                            type="text" 
                            value={inputValue} 
                            onChange={handleInputChange} 
                            onKeyDown={handleKeyDown} 
                            disabled={isLoading} 
                        />
                    ) : (
                        <div className="input-generating-label">
                            <span className="generating-prompt-text">{currentSession?.prompt}</span>
                            <ThinkingIcon />
                        </div>
                    )}
                    <button className="send-button" onClick={() => handleSendMessage()} disabled={isLoading || !inputValue.trim()}>
                        <ArrowUpIcon />
                    </button>
                </div>
            </div>
        </div>
    </>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<React.StrictMode><App /></React.StrictMode>);
}