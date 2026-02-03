import React, { useState, useEffect, useMemo, FC } from 'react';
import { 
    UsersIcon, EyeIcon, ThumbsUpIcon, ThumbsDownIcon, BotIcon, 
    HomeIcon, HistoryIcon, WalletIcon, ChevronLeftIcon, CopyIcon,
    CheckIcon, SparklesIcon, ArrowRightIcon, TrashIcon
} from './components/Icons';
import { SERVICES, TON_WALLET, calculatePrice, formatTon, formatRub } from './services/data';
import { verifyPayment, sendOrderToBot } from './services/tonService';
import { getUserData, getUserOrders, saveOrder, calculateStats, saveWalletData, disconnectWalletData, fetchWalletBalance } from './services/userService';
import { SmmService, Order, TelegramUser, UserStats, WalletInfo } from './types';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

// --- Types ---
type ViewState = 'home' | 'order' | 'payment' | 'history' | 'success' | 'profile';

// --- Utils ---
const getIcon = (iconName: string, className: string) => {
    switch(iconName) {
        case 'users': return <UsersIcon className={className} />;
        case 'eye': return <EyeIcon className={className} />;
        case 'thumbs-up': return <ThumbsUpIcon className={className} />;
        case 'thumbs-down': return <ThumbsDownIcon className={className} />;
        case 'bot': return <BotIcon className={className} />;
        default: return <SparklesIcon className={className} />;
    }
};

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    if ((window as any).Telegram?.WebApp?.HapticFeedback) {
        (window as any).Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
};

const shortAddress = (addr: string) => {
    if (!addr) return '';
    return addr.slice(0, 4) + '...' + addr.slice(-4);
};

// --- Components ---

const ServiceCard: FC<{ service: SmmService; onClick: () => void }> = ({ service, onClick }) => (
    <button 
        onClick={onClick}
        className="w-full text-left glass-card rounded-2xl p-4 flex items-center gap-4 group relative overflow-hidden hover:bg-white/5 transition-all active:scale-[0.98]"
    >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-200%] group-hover:animate-shimmer" />
        <div className="w-12 h-12 rounded-xl bg-violet-950/50 flex items-center justify-center text-violet-300 border border-white/10 shadow-lg group-hover:border-accent-pink/50 group-hover:text-accent-pink transition-colors">
            {getIcon(service.icon, "w-6 h-6")}
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-base truncate tracking-tight">{service.name}</h3>
            <p className="text-xs text-violet-300/80 truncate mt-0.5">{service.description}</p>
        </div>
        <div className="flex flex-col items-end">
             <div className="px-2 py-1 rounded-md bg-accent-cyan/10 border border-accent-cyan/20">
                <span className="text-sm font-bold text-accent-cyan">{service.price_per_k} ₽</span>
             </div>
        </div>
    </button>
);

const HistoryItem: FC<{ order: Order }> = ({ order }) => {
    const getStatusText = (status: string) => {
        switch(status) {
            case 'completed': return 'ВЫПОЛНЕН';
            case 'active': return 'АКТИВЕН';
            case 'pending': return 'ОЖИДАНИЕ';
            case 'cancelled': return 'ОТМЕНЕН';
            default: return status;
        }
    };

    return (
        <div className="glass-card rounded-xl p-4 flex justify-between items-center mb-3">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-white">{order.serviceName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border 
                        ${order.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                          order.status === 'active' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                          'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                        {getStatusText(order.status)}
                    </span>
                </div>
                <div className="text-xs text-violet-400 font-mono mb-1 max-w-[150px] truncate">{order.url}</div>
                <div className="text-[10px] text-gray-500">{new Date(order.createdAt).toLocaleString('ru-RU')}</div>
            </div>
            <div className="text-right">
                <div className="text-lg font-bold text-white tracking-tight">{order.amountTon.toFixed(2)} TON</div>
                <div className="text-xs text-violet-400">{order.quantity.toLocaleString()} шт</div>
            </div>
        </div>
    );
};

const StatCard: FC<{ label: string; value: string | number; icon: any; colorClass: string }> = ({ label, value, icon, colorClass }) => (
    <div className="glass-card p-4 rounded-xl flex flex-col justify-between h-24 relative overflow-hidden">
        <div className={`absolute -right-2 -top-2 w-16 h-16 ${colorClass} opacity-10 rounded-full blur-xl`}></div>
        <div className="flex justify-between items-start z-10">
            <span className="text-xs text-violet-300 font-medium">{label}</span>
            <div className={`${colorClass} p-1.5 rounded-lg bg-white/5`}>
                {icon}
            </div>
        </div>
        <span className="text-xl font-bold text-white z-10">{value}</span>
    </div>
);

// --- Main App ---

const App: React.FC = () => {
    // TonConnect Hooks
    const [tonConnectUI] = useTonConnectUI();
    const tonWallet = useTonWallet();

    // State
    const [view, setView] = useState<ViewState>('home');
    const [selectedService, setSelectedService] = useState<SmmService | null>(null);
    
    // User & Data State
    const [user, setUser] = useState<TelegramUser | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
    
    // Order Form State
    const [url, setUrl] = useState('');
    const [quantity, setQuantity] = useState<number>(0);
    const [memo, setMemo] = useState<number>(0);
    
    // Verification State
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState<string | null>(null);

    // Initial load
    useEffect(() => {
        // Initialize Telegram WebApp
        if ((window as any).Telegram?.WebApp) {
            const tg = (window as any).Telegram.WebApp;
            tg.ready();
            tg.expand();
            tg.enableClosingConfirmation();
            tg.setHeaderColor('#05010a');
            tg.setBackgroundColor('#05010a');
        }

        // Load User Data & Stats (Mock Backend Call)
        const currentUser = getUserData();
        setUser(currentUser);

        const savedOrders = getUserOrders();
        setOrders(savedOrders);
        setStats(calculateStats(savedOrders));

    }, []);

    // Watch for TonConnect wallet changes
    useEffect(() => {
        const updateWalletData = async () => {
            if (tonWallet && tonWallet.account) {
                // Wallet connected!
                const rawAddress = tonWallet.account.address;
                const balance = await fetchWalletBalance(rawAddress);
                
                const info: WalletInfo = {
                    address: rawAddress,
                    appName: tonWallet.device.appName || "Ton Wallet",
                    balance: balance,
                    isConnected: true
                };

                setWalletInfo(info);
                saveWalletData(info); // Sync with "Backend"

                if ((window as any).Telegram?.WebApp?.HapticFeedback) {
                     (window as any).Telegram.WebApp.HapticFeedback.notificationOccurred('success');
                }
            } else {
                // Wallet disconnected
                setWalletInfo(null);
                disconnectWalletData();
            }
        };

        updateWalletData();
    }, [tonWallet]);

    // Recalculate stats whenever orders change
    useEffect(() => {
        if (orders.length > 0) {
            setStats(calculateStats(orders));
        }
    }, [orders]);

    const handleServiceSelect = (service: SmmService) => {
        setSelectedService(service);
        setQuantity(service.min);
        setUrl('');
        setView('order');
    };

    const handleCreateOrder = () => {
        if (!selectedService) return;
        const newMemo = Math.floor(100000 + Math.random() * 900000);
        setMemo(newMemo);
        setVerifyError(null);
        setView('payment');
    };

    const handleVerifyPayment = async () => {
        if (!selectedService) return;
        
        setIsVerifying(true);
        setVerifyError(null);

        const { ton, rub } = calculatePrice(quantity, selectedService.price_per_k);

        // Call logic to check blockchain
        const result = await verifyPayment(memo.toString(), ton);

        if (result.verified) {
             const newOrder: Order = {
                id: Date.now().toString(),
                serviceId: selectedService.id,
                serviceName: selectedService.name,
                url: url,
                quantity: quantity,
                amountTon: ton,
                amountRub: rub,
                memo: memo,
                status: 'active', // Confirmed paid
                createdAt: new Date().toISOString()
            };

            // Save via Service (Mock Backend)
            const updatedOrders = saveOrder(newOrder);
            setOrders(updatedOrders);
            
            // Notify Bot
            sendOrderToBot(newOrder);

            setView('success');
        } else {
            setVerifyError(result.message || "Платеж не найден.");
        }
        
        setIsVerifying(false);
    };

    // Trigger TonConnect Modal
    const handleConnectWallet = () => {
        tonConnectUI.openModal();
    };

    // Trigger Disconnect
    const handleDisconnectWallet = () => {
        tonConnectUI.disconnect();
    };

    const priceData = useMemo(() => {
        if (!selectedService) return { rub: 0, ton: 0 };
        return calculatePrice(quantity, selectedService.price_per_k);
    }, [selectedService, quantity]);

    // Construct TON Deep Link for Tonkeeper (Manual Payment)
    const tonDeepLink = useMemo(() => {
        const nanoTons = Math.floor(priceData.ton * 1000000000);
        return `ton://transfer/${TON_WALLET}?amount=${nanoTons}&text=${memo}`;
    }, [priceData.ton, memo]);

    // Views

    const renderHeader = () => (
        <div className="flex items-center justify-between animate-slide-up">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tighter drop-shadow-lg">EasySMM</h1>
                <div className="flex items-center gap-2 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan shadow-[0_0_10px_#22d3ee]"></span>
                    <p className="text-xs text-accent-cyan font-medium tracking-wide">SYSTEM ONLINE</p>
                </div>
            </div>
            
            {/* Profile Button */}
            <button 
                onClick={() => setView('profile')}
                className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full pl-3 pr-1 py-1 backdrop-blur-md hover:bg-white/10 transition-all active:scale-95 group"
            >
                <span className="text-xs font-bold text-violet-200">Профиль</span>
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 bg-violet-900 flex items-center justify-center">
                    {user?.photo_url ? (
                        <img src={user.photo_url} alt="User" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-xs font-bold text-violet-300">
                            {user?.first_name?.charAt(0) || 'U'}
                        </span>
                    )}
                </div>
            </button>
        </div>
    );

    const renderHome = () => (
        <div className="p-5 space-y-6 pb-24">
            {renderHeader()}

            <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-violet-300 uppercase tracking-widest">Услуги</h2>
                    <span className="text-xs text-white/30">{SERVICES.length} доступно</span>
                </div>
                <div className="space-y-3">
                    {SERVICES.map(service => (
                        <ServiceCard 
                            key={service.id} 
                            service={service} 
                            onClick={() => handleServiceSelect(service)} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );

    const renderProfile = () => {
        if (!stats) return null;

        return (
            <div className="flex flex-col h-full animate-slide-up">
                 <div className="p-4 flex items-center gap-4 sticky top-0 z-10 bg-[#05010a]/80 backdrop-blur-xl border-b border-white/5">
                    <button onClick={() => setView('home')} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <ChevronLeftIcon className="w-6 h-6 text-white" />
                    </button>
                    <h2 className="font-bold text-lg text-white">Мой Профиль</h2>
                </div>

                <div className="p-5 space-y-6 overflow-y-auto pb-24">
                    
                    {/* User Info */}
                    <div className="flex flex-col items-center justify-center py-6 glass-panel rounded-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/10 to-transparent"></div>
                        <div className="w-24 h-24 rounded-full border-4 border-white/5 bg-violet-900 overflow-hidden shadow-2xl mb-4 relative z-10">
                            {user?.photo_url ? (
                                <img src={user.photo_url} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-violet-300">
                                    {user?.first_name?.charAt(0)}
                                </div>
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-white relative z-10">{user?.first_name} {user?.last_name}</h2>
                        <p className="text-violet-400 text-sm font-mono mt-1 relative z-10">ID: {user?.id}</p>
                    </div>

                     {/* Wallet Section - REAL TON CONNECT */}
                     <div className="space-y-3">
                        <h3 className="text-xs uppercase font-bold text-violet-500 ml-1">Способ оплаты</h3>
                        {!tonWallet ? (
                            <button 
                                onClick={handleConnectWallet}
                                className="w-full py-4 glass-card border border-[#4592ff]/30 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#4592ff]/10 transition-all group active:scale-[0.98]"
                            >
                                <div className="w-10 h-10 bg-[#4592ff] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <WalletIcon className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-white">Подключить Кошелек</p>
                                    <p className="text-xs text-blue-300">Tonkeeper и другие</p>
                                </div>
                                <ArrowRightIcon className="w-5 h-5 text-blue-400 ml-auto mr-2" />
                            </button>
                        ) : (
                            <div className="glass-card p-5 rounded-2xl border border-accent-cyan/30 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-cyan/10 blur-[40px] rounded-full"></div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[#4592ff] rounded-xl flex items-center justify-center shadow-lg">
                                                <WalletIcon className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 font-bold uppercase">{tonWallet.device.appName}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-white font-mono text-sm">{shortAddress(tonWallet.account.address)}</p>
                                                    <button onClick={() => copyToClipboard(tonWallet.account.address)}><CopyIcon className="w-3 h-3 text-gray-500 hover:text-white" /></button>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={handleDisconnectWallet} className="p-2 bg-white/5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="mt-2">
                                        <p className="text-xs text-violet-300 mb-1">Баланс кошелька</p>
                                        <h3 className="text-2xl font-bold text-white tracking-tight">{walletInfo?.balance.toFixed(2) || '0.00'} <span className="text-lg text-accent-cyan">TON</span></h3>
                                    </div>
                                </div>
                            </div>
                        )}
                     </div>

                    {/* Main Stats */}
                    <div className="space-y-3">
                         <h3 className="text-xs uppercase font-bold text-violet-500 ml-1">Статистика в Боте</h3>
                         <div className="glass-card p-5 rounded-2xl flex items-center justify-between border-t border-accent-cyan/20 bg-accent-cyan/5">
                            <div>
                                <p className="text-violet-300 text-sm mb-1">Всего потрачено</p>
                                <h3 className="text-3xl font-bold text-white tracking-tight">{formatTon(stats.totalSpentTon)} <span className="text-lg text-accent-cyan">TON</span></h3>
                            </div>
                            <div className="w-12 h-12 bg-accent-cyan/10 rounded-full flex items-center justify-center text-accent-cyan">
                                <WalletIcon className="w-6 h-6" />
                            </div>
                         </div>
                    </div>

                    {/* Detailed Stats Grid */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard 
                                label="Подписчики" 
                                value={stats.stats.subscribers.toLocaleString()} 
                                icon={<UsersIcon className="w-4 h-4 text-violet-200" />}
                                colorClass="bg-violet-500"
                            />
                            <StatCard 
                                label="Юзеры в Бот" 
                                value={stats.stats.botUsers.toLocaleString()} 
                                icon={<BotIcon className="w-4 h-4 text-pink-200" />}
                                colorClass="bg-accent-pink"
                            />
                            <StatCard 
                                label="Просмотры" 
                                value={stats.stats.views.toLocaleString()} 
                                icon={<EyeIcon className="w-4 h-4 text-cyan-200" />}
                                colorClass="bg-accent-cyan"
                            />
                             <StatCard 
                                label="Реакции" 
                                value={stats.stats.reactions.toLocaleString()} 
                                icon={<ThumbsUpIcon className="w-4 h-4 text-green-200" />}
                                colorClass="bg-green-500"
                            />
                        </div>
                         {/* Total Orders */}
                         <div className="glass-card p-4 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/5 rounded-lg text-white">
                                    <HistoryIcon className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-bold text-violet-200">Всего заказов</span>
                            </div>
                            <span className="text-xl font-bold text-white">{stats.totalOrders}</span>
                         </div>
                    </div>

                </div>
            </div>
        );
    };

    const renderOrderForm = () => {
        if (!selectedService) return null;
        const isValidUrl = url.length > 5 && url.includes('.');

        return (
            <div className="flex flex-col h-full animate-slide-up">
                <div className="p-4 flex items-center gap-4 sticky top-0 z-10 bg-[#05010a]/80 backdrop-blur-xl border-b border-white/5">
                    <button onClick={() => setView('home')} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <ChevronLeftIcon className="w-6 h-6 text-white" />
                    </button>
                    <h2 className="font-bold text-lg text-white">Параметры заказа</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    <div className="glass-panel p-6 rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-pink/20 blur-[50px] rounded-full"></div>
                        <div className="relative z-10 flex gap-4">
                             <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-accent-pink shadow-lg">
                                {getIcon(selectedService.icon, "w-7 h-7")}
                             </div>
                             <div>
                                <h3 className="font-bold text-xl text-white mb-1">{selectedService.name}</h3>
                                <div className="flex gap-2 text-xs">
                                     <span className="bg-white/10 px-2 py-0.5 rounded text-violet-200">ID: {selectedService.id}</span>
                                     <span className="bg-white/10 px-2 py-0.5 rounded text-violet-200">{selectedService.url_type}</span>
                                </div>
                             </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-violet-400 ml-1 uppercase tracking-wider">Ссылка</label>
                        <input 
                            type="url" 
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder={selectedService.url_example}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/20 focus:outline-none focus:border-accent-pink focus:ring-1 focus:ring-accent-pink/50 transition-all font-mono text-sm shadow-inner"
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <label className="text-xs font-bold text-violet-400 ml-1 uppercase tracking-wider">Количество</label>
                            <span className="text-xs text-white/50">Лимиты: {selectedService.min} - {selectedService.max}</span>
                        </div>
                        
                        <div className="glass-card p-4 rounded-xl border border-white/10">
                             <div className="flex items-center justify-between mb-4">
                                <button 
                                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/20 text-white flex items-center justify-center font-bold transition-colors"
                                    onClick={() => setQuantity(Math.max(selectedService.min, quantity - 100))}
                                >-</button>
                                <input 
                                    type="number" 
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    className="bg-transparent w-24 text-center text-white font-bold text-xl focus:outline-none"
                                />
                                <button 
                                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/20 text-white flex items-center justify-center font-bold transition-colors"
                                    onClick={() => setQuantity(Math.min(selectedService.max, quantity + 100))}
                                >+</button>
                             </div>
                             <input 
                                type="range" 
                                min={selectedService.min} 
                                max={selectedService.max} 
                                step={100}
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="w-full accent-accent-pink h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                             />
                        </div>
                    </div>

                    <div className="mt-8 bg-gradient-to-r from-violet-900/50 to-violet-800/50 p-6 rounded-2xl border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50"></div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-violet-300 text-sm">Цена (RUB)</span>
                            <span className="text-white font-medium">{formatRub(priceData.rub)} ₽</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-white font-bold text-lg">Итого (TON)</span>
                            <span className="text-3xl font-bold text-accent-cyan drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                                {formatTon(priceData.ton)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-[#05010a]/90 backdrop-blur-xl border-t border-white/5">
                    <button 
                        onClick={handleCreateOrder}
                        disabled={!isValidUrl || quantity < selectedService.min || quantity > selectedService.max}
                        className="w-full py-4 bg-white text-black font-bold text-lg rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-[0.98]"
                    >
                        Перейти к оплате
                    </button>
                </div>
            </div>
        );
    };

    const renderPayment = () => {
        if (!selectedService) return null;
        return (
            <div className="flex flex-col h-full animate-slide-up relative">
                 <div className="p-4 flex items-center gap-4 border-b border-white/5">
                    <button onClick={() => setView('order')} className="p-2 rounded-full hover:bg-white/10">
                        <ChevronLeftIcon className="w-6 h-6 text-white" />
                    </button>
                    <h2 className="font-bold text-lg text-white">Оплата</h2>
                </div>

                <div className="flex-1 p-6 flex flex-col items-center space-y-6 overflow-y-auto">
                    
                    {/* Amount Card */}
                    <div className="w-full text-center space-y-2 py-6 relative">
                         <div className="w-24 h-24 mx-auto bg-accent-cyan/10 rounded-full flex items-center justify-center text-accent-cyan mb-4 ring-1 ring-accent-cyan/50 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                            <WalletIcon className="w-10 h-10" />
                        </div>
                        <h3 className="text-4xl font-bold text-white tracking-tight">{formatTon(priceData.ton)} <span className="text-lg text-violet-400">TON</span></h3>
                        <p className="text-violet-300 text-sm">Отправьте точную сумму на адрес ниже</p>
                    </div>

                    {/* Pay Button (Tonkeeper) */}
                    <a
                        href={tonDeepLink}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3.5 bg-[#4592ff] hover:bg-[#3478d6] text-white font-bold text-base rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(69,146,255,0.3)] active:scale-[0.98] group"
                    >
                        <WalletIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Оплатить через Tonkeeper
                    </a>

                    <div className="w-full flex items-center gap-4">
                        <div className="h-[1px] bg-white/10 flex-1"></div>
                        <span className="text-xs text-white/30 uppercase font-bold">Или вручную</span>
                        <div className="h-[1px] bg-white/10 flex-1"></div>
                    </div>

                    {/* Wallet & Memo */}
                    <div className="w-full space-y-4">
                        <div className="space-y-1.5 group">
                            <label className="text-[10px] font-bold text-violet-500 ml-1 uppercase tracking-widest">Адрес кошелька</label>
                            <button 
                                onClick={() => copyToClipboard(TON_WALLET)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-all text-left relative overflow-hidden"
                            >
                                <span className="text-xs font-mono text-violet-200 break-all pr-4">{TON_WALLET}</span>
                                <CopyIcon className="w-4 h-4 text-violet-500 shrink-0" />
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-accent-pink ml-1 uppercase tracking-widest flex items-center gap-2">
                                Комментарий (Memo) <span className="bg-accent-pink text-white px-1 rounded text-[9px]">ОБЯЗАТЕЛЬНО</span>
                            </label>
                            <button 
                                onClick={() => copyToClipboard(memo.toString())}
                                className="w-full bg-accent-pink/5 border border-accent-pink/30 rounded-xl p-4 flex items-center justify-between hover:bg-accent-pink/10 transition-all text-left"
                            >
                                <span className="text-2xl font-mono font-bold text-white tracking-[0.2em]">{memo}</span>
                                <CopyIcon className="w-5 h-5 text-accent-pink" />
                            </button>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex gap-3 items-start w-full">
                        <div className="text-orange-500 mt-0.5">⚠️</div>
                        <p className="text-xs text-orange-200/80 leading-relaxed">
                            При оплате вручную переведите <b>РОВНО {formatTon(priceData.ton)} TON</b> с комментарием <b>{memo}</b>. Без комментария платеж не будет засчитан.
                        </p>
                    </div>

                    {verifyError && (
                        <div className="w-full bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-center animate-pulse">
                            <p className="text-red-400 text-sm font-bold">{verifyError}</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-[#05010a]/90 backdrop-blur-xl border-t border-white/5 relative">
                    {isVerifying && <div className="absolute top-0 left-0 w-full h-[2px] bg-accent-cyan shadow-[0_0_10px_#22d3ee] animate-scan"></div>}
                    
                    <button 
                        onClick={handleVerifyPayment}
                        disabled={isVerifying}
                        className="w-full py-4 bg-accent-cyan text-black font-bold text-lg rounded-xl hover:bg-cyan-300 transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isVerifying ? (
                            <>
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                Проверяю...
                            </>
                        ) : (
                            <>
                                <CheckIcon className="w-5 h-5" />
                                Я оплатил
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    };

    const renderSuccess = () => (
        <div className="flex flex-col h-full items-center justify-center p-8 animate-pop text-center">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 ring-1 ring-green-500/50 shadow-[0_0_40px_rgba(34,197,94,0.4)]">
                <CheckIcon className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Оплата подтверждена!</h2>
            <p className="text-violet-300 mb-8 max-w-[250px]">Ваш заказ добавлен в очередь и скоро будет запущен.</p>
            
            <button 
                onClick={() => {
                     // Close WebApp
                     if ((window as any).Telegram?.WebApp) {
                         (window as any).Telegram.WebApp.close();
                     } else {
                         setView('history');
                     }
                }}
                className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
                Закрыть и вернуться
            </button>
            <button 
                onClick={() => setView('home')}
                className="mt-4 text-violet-400 text-sm hover:text-white"
            >
                Новый заказ
            </button>
        </div>
    );

    const renderHistory = () => (
        <div className="p-5 space-y-6 pb-24 animate-slide-up">
            <div className="flex items-center gap-4 mb-4">
                 <button onClick={() => setView('home')} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                    <ChevronLeftIcon className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-2xl font-bold text-white">История заказов</h1>
            </div>
            
            {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
                    <HistoryIcon className="w-16 h-16 text-violet-700" />
                    <p className="text-violet-500">История пуста</p>
                    <button 
                        onClick={() => setView('home')}
                        className="text-accent-pink text-sm font-bold hover:underline"
                    >
                        Создать первый заказ
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {orders.map(order => (
                        <HistoryItem key={order.id} order={order} />
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen text-white font-outfit overflow-hidden flex flex-col relative z-10">
            {/* View Content */}
            <div className="flex-1 relative z-0 overflow-y-auto no-scrollbar">
                {view === 'home' && renderHome()}
                {view === 'order' && renderOrderForm()}
                {view === 'payment' && renderPayment()}
                {view === 'success' && renderSuccess()}
                {view === 'history' && renderHistory()}
                {view === 'profile' && renderProfile()}
            </div>

            {/* Bottom Nav */}
            {(view === 'home' || view === 'history') && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#05010a] to-transparent z-50">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-1 flex relative shadow-2xl">
                         <div 
                            className={`absolute top-1 bottom-1 w-[48%] bg-white rounded-xl transition-all duration-300 shadow-lg ${view === 'history' ? 'translate-x-[104%]' : 'translate-x-[1%]'}`}
                         />

                        <button 
                            onClick={() => setView('home')}
                            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 relative z-10 transition-colors duration-300 ${view === 'home' ? 'text-black' : 'text-white hover:text-white/80'}`}
                        >
                            <HomeIcon className="w-5 h-5" />
                            <span className="text-xs font-bold">Услуги</span>
                        </button>
                        <button 
                            onClick={() => setView('history')}
                            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 relative z-10 transition-colors duration-300 ${view === 'history' ? 'text-black' : 'text-white hover:text-white/80'}`}
                        >
                            <HistoryIcon className="w-5 h-5" />
                            <span className="text-xs font-bold">История</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;