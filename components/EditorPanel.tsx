import React, { useState, useRef } from 'react';
import { AppState, LinkItem, UserProfile, AppTheme } from '../types';
import { 
  SparklesIcon, TrashIcon, PlusIcon, 
  ArrowUpIcon, ArrowDownIcon, GithubIcon, 
  TwitterIcon, InstagramIcon, LinkedinIcon, 
  GlobeIcon, YoutubeIcon, MailIcon, TiktokIcon, DiscordIcon, UploadIcon
} from './Icons';
import { generateBio } from '../services/geminiService';

interface EditorPanelProps {
  state: AppState;
  updateProfile: (p: Partial<UserProfile>) => void;
  updateTheme: (t: Partial<AppTheme>) => void;
  addLink: () => void;
  updateLink: (id: string, l: Partial<LinkItem>) => void;
  removeLink: (id: string) => void;
  moveLink: (id: string, direction: 'up' | 'down') => void;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ 
  state, updateProfile, updateTheme, addLink, updateLink, removeLink, moveLink 
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'appearance'>('content');
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [bioKeywords, setBioKeywords] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateBio = async () => {
    if (!bioKeywords.trim()) return;
    setIsGeneratingBio(true);
    const bio = await generateBio(bioKeywords);
    updateProfile({ bio });
    setIsGeneratingBio(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateProfile({ avatarUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const getIconComponent = (iconName: string) => {
    const props = { className: "w-4 h-4" };
    switch (iconName) {
      case 'github': return <GithubIcon {...props} />;
      case 'twitter': return <TwitterIcon {...props} />;
      case 'instagram': return <InstagramIcon {...props} />;
      case 'linkedin': return <LinkedinIcon {...props} />;
      case 'youtube': return <YoutubeIcon {...props} />;
      case 'mail': return <MailIcon {...props} />;
      case 'tiktok': return <TiktokIcon {...props} />;
      case 'discord': return <DiscordIcon {...props} />;
      default: return <GlobeIcon {...props} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-violet-950/40 backdrop-blur-xl border-r border-violet-800/30 overflow-hidden shadow-2xl">
      {/* Tab Navigation */}
      <div className="flex border-b border-violet-800/50 bg-violet-950/50">
        <button
          onClick={() => setActiveTab('content')}
          className={`flex-1 py-4 text-sm font-bold tracking-wide transition-all ${
            activeTab === 'content' 
              ? 'text-white border-b-2 border-accent-pink bg-violet-900/40' 
              : 'text-violet-400 hover:text-white hover:bg-violet-900/20'
          }`}
        >
          CONTENT
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex-1 py-4 text-sm font-bold tracking-wide transition-all ${
            activeTab === 'appearance' 
              ? 'text-white border-b-2 border-accent-pink bg-violet-900/40' 
              : 'text-violet-400 hover:text-white hover:bg-violet-900/20'
          }`}
        >
          APPEARANCE
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        
        {activeTab === 'content' && (
          <>
            {/* Profile Section */}
            <section className="space-y-4 animate-slide-up">
              <h3 className="text-sm uppercase tracking-wider font-bold text-violet-300 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent-pink rounded-full"></span>
                Profile Details
              </h3>
              
              <div className="glass-panel p-5 rounded-2xl space-y-6 transition-all hover:border-violet-600/50">
                <div className="flex gap-5 items-start">
                  <div className="relative group shrink-0">
                    <div className="w-24 h-24 rounded-full bg-violet-900 border-2 border-violet-600/50 overflow-hidden shadow-xl group-hover:border-accent-pink transition-colors">
                      <img src={state.profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 p-2 bg-accent-pink text-white rounded-full shadow-lg hover:bg-pink-400 transition-transform hover:scale-110 active:scale-95"
                    >
                        <UploadIcon className="w-4 h-4" />
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageUpload}
                    />
                  </div>
                   <div className="flex-1 space-y-4">
                     <div>
                        <label className="block text-xs font-semibold text-violet-400 mb-1.5">Display Name</label>
                        <input 
                            type="text" 
                            value={state.profile.name}
                            onChange={(e) => updateProfile({ name: e.target.value })}
                            className="w-full bg-black/30 border border-violet-700/50 rounded-lg px-3 py-2 text-white placeholder-violet-600 focus:outline-none focus:border-accent-pink focus:ring-1 focus:ring-accent-pink/50 transition-all font-medium"
                            placeholder="John Doe"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-semibold text-violet-400 mb-1.5">Title / Role</label>
                        <input 
                            type="text" 
                            value={state.profile.title}
                            onChange={(e) => updateProfile({ title: e.target.value })}
                            className="w-full bg-black/30 border border-violet-700/50 rounded-lg px-3 py-2 text-white placeholder-violet-600 focus:outline-none focus:border-accent-pink focus:ring-1 focus:ring-accent-pink/50 transition-all"
                            placeholder="Creator & Developer"
                        />
                     </div>
                   </div>
                </div>

                {/* AI Bio Generator */}
                <div className="relative overflow-hidden bg-gradient-to-br from-violet-900/60 to-violet-800/40 border border-violet-600/30 rounded-xl p-4 space-y-3 group">
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-200%] group-hover:animate-shimmer pointer-events-none"></div>
                  
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-violet-300">Bio</label>
                    <div className="flex items-center gap-1.5 text-xs text-accent-cyan font-bold bg-accent-cyan/10 px-2 py-1 rounded-full border border-accent-cyan/20">
                        <SparklesIcon className="w-3 h-3" />
                        AI ASSISTANT
                    </div>
                  </div>
                  
                  <textarea 
                    value={state.profile.bio}
                    onChange={(e) => updateProfile({ bio: e.target.value })}
                    className="w-full bg-black/40 border border-violet-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-pink min-h-[80px] resize-none"
                    placeholder="Tell the world about yourself..."
                  />

                  <div className="flex gap-2 pt-1">
                    <input 
                        type="text"
                        value={bioKeywords}
                        onChange={(e) => setBioKeywords(e.target.value)}
                        placeholder="Keywords (e.g., designer, coffee, minimal)"
                        className="flex-1 bg-black/40 border border-violet-700/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-cyan placeholder-violet-600"
                    />
                    <button 
                        onClick={handleGenerateBio}
                        disabled={isGeneratingBio}
                        className="bg-accent-cyan hover:bg-cyan-300 text-violet-950 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] active:scale-95"
                    >
                        {isGeneratingBio ? (
                            <span className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-violet-900 border-t-transparent rounded-full animate-spin"></div> Generating...</span>
                        ) : 'Generate'}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Links Section */}
            <section className="space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex justify-between items-center mb-2">
                 <h3 className="text-sm uppercase tracking-wider font-bold text-violet-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-accent-pink rounded-full"></span>
                    Links
                 </h3>
                 <button 
                    onClick={addLink}
                    className="flex items-center gap-2 px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-full transition-all shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 transform hover:-translate-y-0.5 active:translate-y-0"
                 >
                    <PlusIcon className="w-4 h-4" /> ADD LINK
                 </button>
              </div>

              <div className="space-y-3">
                {state.links.map((link, index) => (
                    <div key={link.id} className="group glass-panel rounded-xl p-4 transition-all hover:border-violet-500/50 hover:bg-violet-900/40">
                        <div className="flex items-start gap-3">
                            <div className="flex flex-col gap-1 mt-1 text-violet-500">
                                <button onClick={() => moveLink(link.id, 'up')} disabled={index === 0} className="hover:text-white disabled:opacity-30 transition-colors p-1 hover:bg-white/5 rounded"><ArrowUpIcon className="w-3.5 h-3.5"/></button>
                                <button onClick={() => moveLink(link.id, 'down')} disabled={index === state.links.length - 1} className="hover:text-white disabled:opacity-30 transition-colors p-1 hover:bg-white/5 rounded"><ArrowDownIcon className="w-3.5 h-3.5"/></button>
                            </div>
                            
                            <div className="flex-1 space-y-3">
                                <div className="flex gap-2 items-center">
                                    <input 
                                        type="text"
                                        value={link.title}
                                        onChange={(e) => updateLink(link.id, { title: e.target.value })}
                                        placeholder="Link Title"
                                        className="flex-1 bg-transparent border-b border-violet-700/50 py-1 text-sm text-white font-medium focus:outline-none focus:border-accent-pink placeholder-violet-600 transition-colors"
                                    />
                                    <button onClick={() => removeLink(link.id)} className="text-violet-600 hover:text-red-400 transition-colors p-1.5 hover:bg-red-400/10 rounded-lg">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <div>
                                    <input 
                                        type="text"
                                        value={link.url}
                                        onChange={(e) => updateLink(link.id, { url: e.target.value })}
                                        placeholder="https://..."
                                        className="w-full bg-transparent border-b border-violet-700/50 py-1 text-xs text-violet-300 focus:outline-none focus:border-accent-pink placeholder-violet-600 transition-colors font-mono"
                                    />
                                </div>
                                {/* Icon Selector */}
                                <div className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar mask-gradient">
                                    {['globe', 'twitter', 'instagram', 'github', 'linkedin', 'youtube', 'tiktok', 'discord', 'mail'].map((icon) => (
                                        <button
                                            key={icon}
                                            onClick={() => updateLink(link.id, { icon: icon as any })}
                                            className={`p-2 rounded-lg transition-all transform hover:scale-110 ${link.icon === icon ? 'bg-accent-pink text-white shadow-lg shadow-pink-500/30 ring-2 ring-pink-500/50' : 'bg-black/20 text-violet-400 hover:bg-violet-800/50 hover:text-white'}`}
                                            title={icon}
                                        >
                                            {getIconComponent(icon)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {state.links.length === 0 && (
                    <div className="text-center py-10 text-violet-400 text-sm border-2 border-dashed border-violet-800/50 rounded-xl bg-violet-900/10 animate-pulse-slow">
                        <p className="mb-2">Your link list is empty.</p>
                        <p className="text-xs text-violet-600">Add some links to share with your audience!</p>
                    </div>
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === 'appearance' && (
          <section className="space-y-8 animate-slide-up">
             {/* Background */}
            <div className="space-y-3">
                <h3 className="text-sm uppercase tracking-wider font-bold text-violet-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-accent-pink rounded-full"></span>
                    Background
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {['solid', 'gradient', 'animated', 'mesh'].map((type) => (
                        <button
                            key={type}
                            onClick={() => updateTheme({ backgroundType: type as any })}
                            className={`py-4 px-4 rounded-xl text-xs font-bold capitalize border transition-all duration-300 relative overflow-hidden group hover:scale-[1.02] active:scale-95 ${
                                state.theme.backgroundType === type 
                                ? 'border-accent-pink text-white shadow-[0_0_15px_rgba(236,72,153,0.3)] bg-violet-800' 
                                : 'bg-violet-900/40 border-violet-700/50 text-violet-400 hover:border-violet-500 hover:text-white'
                            }`}
                        >
                            <span className="relative z-10">{type}</span>
                            {state.theme.backgroundType === type && <div className="absolute inset-0 bg-accent-pink/10 animate-pulse"></div>}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Colors */}
            <div className="space-y-4">
                 <h3 className="text-sm uppercase tracking-wider font-bold text-violet-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-accent-pink rounded-full"></span>
                    Palette
                 </h3>
                 <div className="glass-panel p-4 rounded-xl grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-violet-500 block">Primary</span>
                        <div className="relative group transition-transform hover:scale-105">
                            <input 
                                type="color" 
                                value={state.theme.primaryColor}
                                onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                                className="w-full h-10 rounded-lg cursor-pointer bg-transparent border border-violet-600/50 overflow-hidden"
                            />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-violet-500 block">Secondary</span>
                         <div className="relative group transition-transform hover:scale-105">
                            <input 
                                type="color" 
                                value={state.theme.secondaryColor}
                                onChange={(e) => updateTheme({ secondaryColor: e.target.value })}
                                className="w-full h-10 rounded-lg cursor-pointer bg-transparent border border-violet-600/50 overflow-hidden"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-violet-500 block">Accent</span>
                         <div className="relative group transition-transform hover:scale-105">
                            <input 
                                type="color" 
                                value={state.theme.accentColor}
                                onChange={(e) => updateTheme({ accentColor: e.target.value })}
                                className="w-full h-10 rounded-lg cursor-pointer bg-transparent border border-violet-600/50 overflow-hidden"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Typography */}
            <div className="space-y-3">
                <h3 className="text-sm uppercase tracking-wider font-bold text-violet-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-accent-pink rounded-full"></span>
                    Typography
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { id: 'Inter', label: 'Inter (Modern)' },
                        { id: 'Outfit', label: 'Outfit (Clean)' },
                        { id: 'Playfair Display', label: 'Playfair (Serif)' },
                        { id: 'Montserrat', label: 'Montserrat (Bold)' }
                    ].map((font) => (
                        <button
                            key={font.id}
                            onClick={() => updateTheme({ fontFamily: font.id as any })}
                            className={`py-3 px-3 rounded-lg text-xs transition-all border hover:-translate-y-0.5 ${
                                state.theme.fontFamily === font.id
                                ? 'bg-violet-600 text-white border-violet-500 shadow-lg'
                                : 'bg-black/20 text-violet-400 border-transparent hover:bg-violet-800/30 hover:text-white'
                            }`}
                            style={{ fontFamily: font.id }}
                        >
                            {font.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Button Style */}
            <div className="space-y-3">
                <h3 className="text-sm uppercase tracking-wider font-bold text-violet-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-accent-pink rounded-full"></span>
                    Button Style
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    {['rounded', 'square', 'outline', 'glass', 'shadow', 'minimal'].map((style) => (
                        <button
                            key={style}
                            onClick={() => updateTheme({ buttonStyle: style as any })}
                            className={`py-3 px-3 rounded-lg text-xs font-medium capitalize border transition-all hover:-translate-y-0.5 ${
                                state.theme.buttonStyle === style 
                                ? 'bg-violet-600 border-violet-500 text-white shadow-lg' 
                                : 'bg-violet-900/30 border-violet-800 text-violet-400 hover:border-violet-600 hover:text-white'
                            }`}
                        >
                            {style}
                        </button>
                    ))}
                </div>
            </div>

             {/* Avatar Shape */}
             <div className="space-y-3">
                <h3 className="text-sm uppercase tracking-wider font-bold text-violet-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-accent-pink rounded-full"></span>
                    Avatar Shape
                </h3>
                <div className="flex gap-4 p-4 glass-panel rounded-xl justify-center">
                    {(['circle', 'rounded', 'square'] as const).map((shape) => (
                        <button
                            key={shape}
                            onClick={() => updateTheme({ avatarShape: shape })}
                            className={`w-14 h-14 bg-violet-500/20 border-2 transition-all hover:bg-violet-500/40 hover:scale-105 ${
                                state.theme.avatarShape === shape ? 'border-accent-pink shadow-[0_0_10px_rgba(236,72,153,0.4)]' : 'border-violet-700/50'
                            } ${shape === 'circle' ? 'rounded-full' : shape === 'rounded' ? 'rounded-xl' : 'rounded-none'}`}
                        />
                    ))}
                </div>
            </div>

          </section>
        )}
      </div>
    </div>
  );
};

export default EditorPanel;