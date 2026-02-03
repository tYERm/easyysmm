import React, { useRef, useState } from 'react';
import { AppState, LinkItem } from '../types';
import { 
  SparklesIcon,
  GithubIcon, TwitterIcon, InstagramIcon, 
  LinkedinIcon, GlobeIcon, YoutubeIcon, MailIcon, TiktokIcon, DiscordIcon 
} from './Icons';

interface MobilePreviewProps {
  state: AppState;
  fullScreen?: boolean;
}

const MobilePreview: React.FC<MobilePreviewProps> = ({ state, fullScreen = false }) => {
  const { profile, links, theme } = state;
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || fullScreen) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate rotation based on cursor position relative to center
    // Max rotation 15 degrees
    const xPct = x / rect.width;
    const yPct = y / rect.height;
    
    const xRotation = (0.5 - yPct) * 20; 
    const yRotation = (xPct - 0.5) * 20;

    setRotation({ x: xRotation, y: yRotation });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  const getIconComponent = (iconName: string) => {
    const props = { className: "w-5 h-5" };
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

  // Styles generation based on state
  const getBackgroundStyle = () => {
    if (theme.backgroundType === 'solid') return { backgroundColor: theme.primaryColor };
    if (theme.backgroundType === 'gradient') return { 
        background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%)` 
    };
    if (theme.backgroundType === 'animated') return { 
        background: `linear-gradient(-45deg, ${theme.primaryColor}, ${theme.secondaryColor}, ${theme.primaryColor})`,
        backgroundSize: '400% 400%',
        animation: 'gradient-x 15s ease infinite'
    };
    if (theme.backgroundType === 'mesh') return {
        backgroundImage: `
            radial-gradient(at 0% 0%, ${theme.secondaryColor} 0px, transparent 50%),
            radial-gradient(at 100% 0%, ${theme.accentColor} 0px, transparent 50%),
            radial-gradient(at 100% 100%, ${theme.primaryColor} 0px, transparent 50%),
            radial-gradient(at 0% 100%, ${theme.secondaryColor} 0px, transparent 50%)
        `,
        backgroundColor: '#000',
    };
    return {};
  };

  const getAvatarStyle = () => {
    if (theme.avatarShape === 'square') return 'rounded-none';
    if (theme.avatarShape === 'rounded') return 'rounded-2xl';
    return 'rounded-full';
  }

  const getButtonStyle = () => {
    const base = "w-full py-4 px-6 flex items-center justify-between transition-all duration-300 active:scale-[0.98] mb-4 group relative overflow-hidden backdrop-blur-sm";
    let shape = "rounded-xl";
    let look = "";

    if (theme.buttonStyle === 'square') shape = "rounded-none";
    if (theme.buttonStyle === 'rounded') shape = "rounded-full";
    
    switch (theme.buttonStyle) {
        case 'outline':
            look = "bg-transparent border-2 border-white/40 text-white hover:bg-white/10 hover:border-white";
            break;
        case 'glass':
            look = "bg-white/10 border border-white/20 text-white shadow-lg hover:bg-white/20 hover:border-white/40";
            break;
        case 'shadow':
            look = `bg-white text-[${theme.primaryColor}] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]`;
            break;
        case 'minimal':
             look = "bg-transparent hover:bg-white/5 text-white border-b border-white/20 rounded-none px-0";
             break;
        default: // rounded/square default
             look = "bg-white text-black hover:bg-gray-100 shadow-md";
             if(theme.backgroundType === 'animated' || theme.backgroundType === 'mesh') {
                 look = "bg-white/90 text-black hover:bg-white";
             }
             break;
    }
    
    // Override text color if custom style
    if (theme.buttonStyle === 'shadow') {
        return `${base} ${shape} ${look} text-gray-900`;
    }

    return `${base} ${shape} ${look}`;
  };

  // Preview Content Component
  const PreviewContent = () => (
      <div 
        className={`relative z-10 w-full h-full overflow-y-auto custom-scrollbar pt-12 px-6 pb-12 flex flex-col items-center font-sans transition-all duration-500`}
        style={{ fontFamily: theme.fontFamily }}
      >
            {/* Profile Header */}
            <div className="flex flex-col items-center text-center space-y-4 mb-10 w-full animate-float">
                <div className={`w-28 h-28 p-1 bg-white/10 backdrop-blur-md ${getAvatarStyle()} shadow-2xl ring-1 ring-white/20 transform hover:scale-105 transition-transform duration-500`}>
                    <img 
                        src={profile.avatarUrl} 
                        alt="Profile" 
                        className={`w-full h-full object-cover ${getAvatarStyle()}`}
                    />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-lg">{profile.name}</h1>
                    <p className="text-sm text-white/80 font-medium tracking-wide bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm inline-block shadow-sm">{profile.title}</p>
                </div>
                {profile.bio && (
                    <p className="text-sm text-white/90 leading-relaxed max-w-[280px] drop-shadow-md font-light">{profile.bio}</p>
                )}
            </div>

            {/* Links List */}
            <div className="w-full max-w-md flex-1 space-y-4">
                {links.map((link, idx) => (
                    <a 
                        key={link.id} 
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={getButtonStyle()}
                        style={{ 
                          animation: 'pop 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards', 
                          animationDelay: `${150 + idx * 100}ms` 
                        }}
                    >   
                        {/* Hover Gradient Effect */}
                        <span 
                            className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                            style={{ background: `linear-gradient(to right, transparent, ${theme.accentColor}, transparent)` }}
                        ></span>
                        
                        <div className="flex items-center gap-4 relative z-10 w-full">
                             {/* Icon */}
                            {theme.buttonStyle !== 'minimal' && (
                                <div className={`text-inherit opacity-90 transition-transform group-hover:scale-110 duration-300`}>
                                    {getIconComponent(link.icon)}
                                </div>
                            )}
                            <span className="font-semibold tracking-wide text-center flex-1">{link.title}</span>
                             {/* Spacer to balance icon */}
                            {theme.buttonStyle !== 'minimal' && <div className="w-5" />} 
                        </div>
                    </a>
                ))}
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 w-full flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                <SparklesIcon className="w-5 h-5 text-white/50 animate-pulse" />
                <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-bold">NebulaBio</span>
            </div>
      </div>
  );

  // If full screen (mobile view mode), render without phone frame
  if (fullScreen) {
      return (
          <div className="w-full h-full relative overflow-hidden bg-black">
               <div 
                className={`absolute inset-0 z-0 transition-all duration-1000`}
                style={getBackgroundStyle()}
               />
               {/* Noise Overlay */}
               <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none mix-blend-overlay"></div>
               <PreviewContent />
          </div>
      )
  }

  // Desktop View: Phone Frame with Tilt
  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="h-full w-full flex items-center justify-center p-8 perspective-1000"
    >
      {/* Phone Case */}
      <div 
        className="relative w-[340px] h-[680px] bg-[#121212] rounded-[3.5rem] border-[8px] border-[#1f1f1f] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden ring-1 ring-white/10 transition-all duration-200 ease-out hover:shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
        style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transformStyle: 'preserve-3d'
        }}
      >
        {/* Reflection Glare */}
        <div className="absolute inset-0 z-50 pointer-events-none bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 hover:opacity-100 transition-opacity duration-500 rounded-[3rem]"></div>

        {/* Dynamic Background */}
        <div 
            className={`absolute inset-0 z-0 transition-all duration-1000`}
            style={getBackgroundStyle()}
        />

        {/* Noise Texture */}
        <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none mix-blend-overlay"></div>

        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-[#1f1f1f] rounded-b-2xl z-30 flex justify-center items-center shadow-md">
            <div className="w-20 h-4 bg-black/60 rounded-full flex items-center justify-center gap-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-900/50"></div>
                 <div className="w-8 h-1.5 rounded-full bg-gray-800/80"></div>
            </div>
        </div>

        {/* Screen Content */}
        <PreviewContent />
      </div>
    </div>
  );
};

export default MobilePreview;