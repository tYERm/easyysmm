import React, { useState, useEffect, useMemo, FC } from 'react';
import { 
    UsersIcon, EyeIcon, ThumbsUpIcon, ThumbsDownIcon, BotIcon, 
    HomeIcon, HistoryIcon, WalletIcon, ChevronLeftIcon, CopyIcon,
    CheckIcon, SparklesIcon, ArrowRightIcon, TrashIcon, ShieldIcon
} from './components/Icons';
import { SERVICES, TON_WALLET, calculatePrice, formatTon, formatRub, ADMIN_ID } from './services/data';
import { verifyPayment } from './services/tonService';
import { notifyAdminNewOrder, notifyAdminNewUser } from './services/telegramNotifier';
import { 
    getUserData, getOrders, saveOrder, calculateStats, saveWalletData, 
    disconnectWalletData, fetchWalletBalance, updateOrderStatus, 
    getAllUsers, getBannedUsers, banUser, unbanUser, syncUserWithDb,
    INITIAL_STATS
} from './services/userService';
import { SmmService, Order, TelegramUser, UserStats, WalletInfo } from './types';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

// --- Types ---
type ViewState = 'home' | 'order' | 'payment' | 'history' | 'success' | 'profile' | 'admin' | 'banned';

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
        <div className="w-12 h-12 rounded-xl bg-violet-950/50 flex items-center justify-center text-violet-300 border border-white/10 shadow-lg group-hover:border-accent-pink/50 group-hover:text-accent-pink transition-colors shrink-0">
            {getIcon(service.icon, "w-6 h-6")}
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-base truncate tracking-tight">{service.name}</h3>
            <p className="text-xs text-violet-300/80 truncate mt-0.5">{service.description}</p>
        </div>
        <div className="flex flex-col items-end shrink-0">
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
                          order.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
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

const AdminOrderItem: FC<{ order: Order; onUpdate: (id: string, status: 'completed' | 'cancelled') => void }> = ({ order, onUpdate }) => {
    return (
        <div className="glass-card rounded-xl p-4 mb-3 border border-white/10">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="text-xs text-gray-400 font-mono">ID: {order.memo}</div>
                    <div className="font-bold text-white text-sm mt-1">{order.serviceName}</div>
                    <div className="text-[10px] text-gray-500">User ID: {order.userId || 'Unknown'}</div>
                </div>
                <div className="text-right">
                    <div className="text-accent-cyan font-bold">{order.amountTon.toFixed(2)} TON</div>
                </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-2 text-xs font-mono text-violet-300 break-all mb-3">
                {order.url}
            </div>

            <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                     {new Date(order.createdAt).toLocaleString('ru-RU')}
                </div>
                
                {order.status === 'active' ? (
                    <div className="flex gap-2">
                         <button 
                            onClick={() => onUpdate(order.id, 'cancelled')}
                            className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-colors"
                         >
                            Отменить
                         </button>
                         <button 
                            onClick={() => onUpdate(order.id, 'completed')}
                            className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/30 transition-colors"
                         >
                            Выполнено
                         </button>
                    </div>
                ) : (
                    <span className={`text-xs px-2 py-1 rounded font-bold uppercase
                        ${order.status === 'completed' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                        {order.status === 'completed' ? 'Выполнен' : 'Отменен'}
                    </span>
                )}
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
    const [adminTab, setAdminTab] = useState<'orders' | 'users'>('orders');
    
    // User & Data State
    const [user, setUser] = useState<TelegramUser | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [adminOrders, setAdminOrders] = useState<Order[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [bannedUserIds, setBannedUserIds] = useState<number[]>([]);
    
    // Fix: Initialize stats with 0 so profile renders immediately
    const [stats, setStats] = useState<UserStats>(INITIAL_STATS);
    
    const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
    
    // Order Form State
    const [url, setUrl] = useState('');
    const [quantity, setQuantity] = useState<number>(0);
    const [memo, setMemo] = useState<number>(0);
    
    // Verification State
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState<string | null>(null);

    const isAdmin = user?.id === ADMIN_ID;

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

        const init = async () => {
            // Load User Data from Telegram Context
            const currentUser = getUserData();
            setUser(currentUser);

            if (currentUser) {
                // Sync with DB (Async)
                try {
                    const { isBanned, isNew } = await syncUserWithDb(currentUser);
                    
                    if (isBanned) {
                        setView('banned');
                        return;
                    }

                    if (isNew) {
                        notifyAdminNewUser(currentUser);
                    }

                    // Fetch Orders (Async)
                    const myOrders = await getOrders(currentUser.id, false);
                    setOrders(myOrders);
                    setStats(calculateStats(myOrders));
                } catch (e) {
                    console.error("Initialization failed:", e);
                }
            }
        };

        init();
    }, []);

    // Watch for TonConnect wallet changes
    useEffect(() => {
        const updateWalletData = async () => {
            if (tonWallet && tonWallet.account) {
                const rawAddress = tonWallet.account.address;
                const balance = await fetchWalletBalance(rawAddress);
                const info: WalletInfo = {
                    address: rawAddress,
                    appName: tonWallet.device.appName || "Ton Wallet",
                    balance: balance,
                    isConnected: true
                };
                setWalletInfo(info);
                saveWalletData(info); // Sync wallet to DB
            } else {
                setWalletInfo(null);
                disconnectWalletData();
            }
        };
        updateWalletData();
    }, [tonWallet]);

    // Admin Data Fetcher
    useEffect(() => {
        const fetchAdminData = async () => {
            if (isAdmin && view === 'admin') {
                if (adminTab === 'orders') {
                    const allOrders = await getOrders(undefined, true);
                    setAdminOrders(allOrders);
                } else if (adminTab === 'users') {
                    const users = await getAllUsers();
                    setAllUsers(users);
                    // Also update banned list from full user list
                    const banned = users.filter((u: any) => u.is_banned).map((u: any) => Number(u.id));
                    setBannedUserIds(banned);
                }
            }
        };
        fetchAdminData();
    }, [view, isAdmin, adminTab]);

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
        if (!selectedService || !user) return;
        
        setIsVerifying(true);
        setVerifyError(null);

        const { ton, rub } = calculatePrice(quantity, selectedService.price_per_k);

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
                status: 'active',
                createdAt: new Date().toISOString()
            };

            const updatedOrders = await saveOrder(newOrder, user.id);
            setOrders(updatedOrders);
            setStats(calculateStats(updatedOrders));
            
            await notifyAdminNewOrder(newOrder, user);
            
            setView('success');
            
            if ((window as any).Telegram?.WebApp?.HapticFeedback) {
                (window as any).Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }
        } else {
            setVerifyError(result.message || "Платеж не найден.");
            if ((window as any).Telegram?.WebApp?.HapticFeedback) {
                (window as any).Telegram.WebApp.HapticFeedback.notificationOccurred('error');
            }
        }
        
        setIsVerifying(false);
    };

    const handleAdminUpdateStatus = async (orderId: string, status: 'completed' | 'cancelled') => {
        const updated = await updateOrderStatus(orderId, status);
        setAdminOrders(updated);
        
        if (user) {
            const myOrders = await getOrders(user.id, false);
            setOrders(myOrders);
        }

        if ((window as any).Telegram?.WebApp?.HapticFeedback) {
            (window as any).Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
    };

    const handleBanToggle = async (userId: number) => {
        const isBanned = bannedUserIds.includes(userId);
        // Optimistic UI update
        if (isBanned) {
            setBannedUserIds(prev => prev.filter(id => id !== userId));
            await unbanUser(userId);
        } else {
            setBannedUserIds(prev => [...prev, userId]);
            await banUser(userId);
        }
        // Refresh list to be sure
        const users = await getAllUsers();
        setAllUsers(users);
    };

    const handleConnectWallet = () => tonConnectUI.openModal();
    const handleDisconnectWallet = () => tonConnectUI.disconnect();

    const priceData = useMemo(() => {
        if (!selectedService) return { rub: 0, ton: 0 };
        return calculatePrice(quantity, selectedService.price_per_k);
    }, [selectedService, quantity]);

    // Use Universal Link instead of ton:// protocol
    const tonDeepLink = useMemo(() => {
        const nanoTons = Math.floor(priceData.ton * 1000000000);
        // Universal link format is more reliable in Telegram WebApp
        return `https://app.tonkeeper.com/transfer/${TON_WALLET}?amount=${nanoTons}&text=${memo}`;
    }, [priceData.ton, memo]);

    // --- Views Render Functions ---

    const renderHeader = () => (
        <div className="flex items-center justify-between animate-slide-up">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tighter drop-shadow-lg">EasySMM</h1>
                <div className="flex items-center gap-2 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan shadow-[0_0_10px_#22d3ee]"></span>
                    <p className="text-xs text-accent-cyan font-medium tracking-wide">SYSTEM ONLINE</p>
                </div>
            </div>
            {/* Top Profile button removed */}
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
                        <ServiceCard key={service.id} service={service} onClick={() => handleServiceSelect(service)} />
                    ))}
                </div>
            </div>
        </div>
    );

    const renderAdminPanel = () => {
        return (
            <div className="p-5 pb-24 h-full flex flex-col">
                <div className="flex justify-between items-center mb-4 animate-slide-up">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShieldIcon className="w-6 h-6 text-accent-cyan" />
                        Админ Панель
                    </h2>
                </div>

                <div className="flex p-1 bg-white/5 rounded-xl mb-4">
                    <button 
                        onClick={() => setAdminTab('orders')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${adminTab === 'orders' ? 'bg-violet-600 text-white shadow-lg' : 'text-gray-400'}`}
                    >
                        Заказы
                    </button>
                    <button 
                        onClick={() => setAdminTab('users')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${adminTab === 'users' ? 'bg-violet-600 text-white shadow-lg' : 'text-gray-400'}`}
                    >
                        Пользователи
                    </button>
                </div>
                
                <div className="space-y-3 pb-4 overflow-y-auto">
                    {adminTab === 'orders' ? (
                        adminOrders.length === 0 ? (
                            <div className="text-center mt-10">
                                <p className="text-gray-500">Нет активных заказов</p>
                            </div>
                        ) : (
                            adminOrders.map((order) => (
                                <AdminOrderItem key={order.id} order={order} onUpdate={handleAdminUpdateStatus} />
                            ))
                        )
                    ) : (
                        // Users Tab
                        <div className="space-y-2">
                            {allUsers.length === 0 ? (
                                <div className="text-center mt-10">
                                    <p className="text-gray-500">Пользователи не найдены</p>
                                </div>
                            ) : (
                                allUsers.map((u) => {
                                    const isBanned = bannedUserIds.includes(Number(u.id));
                                    return (
                                        <div key={u.id} className="glass-card p-4 rounded-xl flex justify-between items-center">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white text-sm">{u.first_name} {u.last_name}</span>
                                                    {u.username && <span className="text-xs text-accent-cyan">@{u.username}</span>}
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                                                    ID: {u.id} • Lang: {u.language_code || '?'}
                                                </div>
                                                <div className="text-[10px] text-gray-600">
                                                    Login: {new Date(u.last_login).toLocaleString()}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleBanToggle(Number(u.id))}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isBanned ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                                            >
                                                {isBanned ? 'Разбанить' : 'Забанить'}
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderHistory = () => (
        <div className="p-5 pb-24 h-full flex flex-col">
            <h2 className="text-xl font-bold text-white mb-4 animate-slide-up flex items-center gap-2">
                <HistoryIcon className="w-6 h-6 text-violet-400" />
                История
            </h2>
             <div className="space-y-3 pb-4">
                {orders.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <HistoryIcon className="w-8 h-8 text-gray-600" />
                        </div>
                        <p className="text-gray-400">История заказов пуста</p>
                    </div>
                ) : (
                    orders.map((order) => <HistoryItem key={order.id} order={order} />)
                )}
            </div>
        </div>
    );

    const renderOrderForm = () => {
        if (!selectedService) return null;
        return (
            <div className="flex flex-col h-full animate-slide-up">
                <div className="p-4 flex items-center gap-4 border-b border-white/5 bg-[#05010a]/50 backdrop-blur-md sticky top-0 z-10">
                    <button onClick={() => setView('home')} className="p-2 -ml-2 rounded-full hover:bg-white/10 active:scale-90 transition-all">
                        <ChevronLeftIcon className="w-6 h-6 text-white" />
                    </button>
                    <h2 className="font-bold text-lg text-white">Оформление</h2>
                </div>

                <div className="p-5 space-y-6 flex-1 overflow-y-auto pb-24">
                    <div className="glass-card p-4 rounded-xl flex items-start gap-4">
                         <div className="w-12 h-12 rounded-xl bg-violet-950/50 flex items-center justify-center text-violet-300 border border-white/10 shadow-lg shrink-0">
                            {getIcon(selectedService.icon, "w-6 h-6")}
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">{selectedService.name}</h3>
                            <p className="text-sm text-gray-400 mt-1">{selectedService.description}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-violet-300 uppercase ml-1">{selectedService.url_prompt}</label>
                            <input 
                                type="text" 
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder={selectedService.url_example}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/20 focus:outline-none focus:border-accent-cyan/50 focus:bg-white/10 transition-all font-mono text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-violet-300 uppercase ml-1">Количество</label>
                            <input 
                                type="range" 
                                min={selectedService.min}
                                max={selectedService.max}
                                step={10}
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="w-full accent-accent-cyan h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between items-center bg-white/5 rounded-xl p-3 border border-white/10">
                                <span className="text-sm text-gray-400">Кол-во:</span>
                                <input 
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(selectedService.min, Math.min(selectedService.max, Number(e.target.value))))}
                                    className="bg-transparent text-right font-bold text-white focus:outline-none w-32"
                                />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 px-1">
                                <span>Min: {selectedService.min}</span>
                                <span>Max: {selectedService.max.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-4 rounded-xl mt-auto">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-gray-400 text-sm">Итого к оплате:</span>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-white">{priceData.ton.toFixed(3)} TON</div>
                                <div className="text-xs text-gray-500">≈ {priceData.rub.toFixed(2)} RUB</div>
                            </div>
                        </div>
                        <button 
                            onClick={handleCreateOrder}
                            disabled={!url || quantity < selectedService.min}
                            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-violet-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <span>Перейти к оплате</span>
                            <ArrowRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderPayment = () => {
        if (!selectedService) return null;
        return (
            <div className="flex flex-col h-full animate-slide-up">
                <div className="p-4 flex items-center gap-4 border-b border-white/5">
                    <button onClick={() => setView('order')} className="p-2 -ml-2 rounded-full hover:bg-white/10">
                        <ChevronLeftIcon className="w-6 h-6 text-white" />
                    </button>
                    <h2 className="font-bold text-lg text-white">Оплата</h2>
                </div>

                <div className="p-5 space-y-6 flex-1 overflow-y-auto pb-24 text-center">
                    <div className="w-20 h-20 bg-accent-cyan/10 rounded-full flex items-center justify-center mx-auto animate-pulse-slow">
                        <WalletIcon className="w-10 h-10 text-accent-cyan" />
                    </div>
                    
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-2">Ожидание оплаты</h3>
                        <p className="text-gray-400 text-sm">Переведите точную сумму на указанный кошелек, обязательно добавив комментарий (Memo).</p>
                    </div>

                    <div className="space-y-3">
                        <div className="glass-card p-4 rounded-xl text-left relative group">
                            <p className="text-xs text-gray-500 mb-1">Кошелек получателя</p>
                            <p className="font-mono text-xs text-white break-all pr-8">{TON_WALLET}</p>
                            <button onClick={() => copyToClipboard(TON_WALLET)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg text-violet-300">
                                <CopyIcon className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="flex gap-3">
                            <div className="glass-card p-4 rounded-xl text-left flex-1 relative">
                                <p className="text-xs text-gray-500 mb-1">Сумма</p>
                                <p className="font-bold text-xl text-accent-cyan">{priceData.ton.toFixed(3)} TON</p>
                                <button onClick={() => copyToClipboard(priceData.ton.toFixed(3))} className="absolute right-2 top-2 p-2 hover:bg-white/10 rounded-lg text-violet-300">
                                    <CopyIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="glass-card p-4 rounded-xl text-left flex-1 relative">
                                <p className="text-xs text-gray-500 mb-1">Memo (Комментарий)</p>
                                <p className="font-bold text-xl text-accent-pink">{memo}</p>
                                <button onClick={() => copyToClipboard(memo.toString())} className="absolute right-2 top-2 p-2 hover:bg-white/10 rounded-lg text-violet-300">
                                    <CopyIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <a 
                        href={tonDeepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-[#0098EA] hover:bg-[#0098EA]/90 text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all"
                    >
                        Оплатить через Tonkeeper
                    </a>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                        <div className="relative flex justify-center"><span className="bg-[#05010a] px-4 text-xs text-gray-500 uppercase">Или вручную</span></div>
                    </div>

                    <button 
                        onClick={handleVerifyPayment}
                        disabled={isVerifying}
                        className="w-full glass-card border-accent-cyan/30 text-accent-cyan font-bold py-4 rounded-xl hover:bg-accent-cyan/10 transition-all flex items-center justify-center gap-2"
                    >
                        {isVerifying ? (
                            <div className="w-5 h-5 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <CheckIcon className="w-5 h-5" />
                        )}
                        <span>Я оплатил, проверить</span>
                    </button>

                    {verifyError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-pop">
                            {verifyError}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderSuccess = () => (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-pop">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
                <CheckIcon className="w-12 h-12 text-green-400 relative z-10" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Успешно!</h2>
            <p className="text-gray-400 mb-8">Ваш заказ принят в работу. Статус можно отслеживать в истории.</p>
            <button 
                onClick={() => setView('history')}
                className="w-full max-w-xs bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors"
            >
                Перейти в историю
            </button>
        </div>
    );

    const renderProfile = () => {
        // Safe check for stats existence, though now initialized with INITIAL_STATS
        if (!stats) return null;
        
        return (
            <div className="flex flex-col h-full animate-slide-up">
                 <div className="p-4 flex items-center gap-4 sticky top-0 z-10 bg-[#05010a]/80 backdrop-blur-xl border-b border-white/5">
                    <button onClick={() => setView('home')} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
                        <ChevronLeftIcon className="w-6 h-6 text-white" />
                    </button>
                    <h2 className="font-bold text-lg text-white">Мой Профиль</h2>
                </div>
                <div className="p-5 space-y-6 overflow-y-auto pb-24">
                    <div className="flex flex-col items-center justify-center py-8 glass-panel rounded-3xl relative overflow-hidden border-t border-white/10">
                        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/20 to-transparent"></div>
                        <div className="w-24 h-24 rounded-full border-4 border-white/5 bg-violet-900 overflow-hidden shadow-2xl mb-4 relative z-10 ring-2 ring-violet-500/30">
                            {user?.photo_url ? (
                                <img src={user.photo_url} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-violet-300">
                                    {user?.first_name?.charAt(0)}
                                </div>
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-white relative z-10">{user?.first_name} {user?.last_name}</h2>
                        {user?.username && <p className="text-violet-400 text-sm font-medium relative z-10">@{user.username}</p>}
                        <div className="mt-4 flex gap-4 relative z-10">
                            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400">
                                ID: {user?.id}
                            </div>
                             <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400">
                                {user?.language_code?.toUpperCase() || 'EN'}
                            </div>
                        </div>
                    </div>

                     <div className="space-y-3">
                        <h3 className="text-xs uppercase font-bold text-violet-500 ml-1 tracking-wider">Финансы</h3>
                        {!walletInfo?.isConnected ? (
                            <button onClick={handleConnectWallet} className="w-full py-4 glass-card border border-[#4592ff]/30 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#4592ff]/10 transition-all group active:scale-[0.98]">
                                <div className="w-10 h-10 bg-[#4592ff] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><WalletIcon className="w-5 h-5 text-white" /></div>
                                <div className="text-left"><p className="font-bold text-white">Подключить Кошелек</p><p className="text-xs text-blue-300">Tonkeeper и другие</p></div>
                                <ArrowRightIcon className="w-5 h-5 text-blue-400 ml-auto mr-2" />
                            </button>
                        ) : (
                            <div className="glass-card p-5 rounded-2xl border border-accent-cyan/30 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-accent-cyan/10 blur-xl rounded-full -mr-10 -mt-10"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-gray-400 text-xs mb-1">Активный кошелек</p>
                                        <p className="font-mono text-white text-sm bg-black/20 px-2 py-1 rounded-lg inline-block">{shortAddress(walletInfo.address)}</p>
                                    </div>
                                    <button onClick={handleDisconnectWallet} className="p-2 bg-red-500/10 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-bold text-white">{walletInfo.balance.toFixed(2)}</span>
                                    <span className="text-sm font-bold text-accent-cyan mb-2">TON</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <StatCard label="Всего потрачено" value={`${formatTon(stats.totalSpentTon)} TON`} icon={<WalletIcon className="w-5 h-5 text-white" />} colorClass="bg-violet-500" />
                        <StatCard label="Всего заказов" value={stats.totalOrders} icon={<HistoryIcon className="w-5 h-5 text-white" />} colorClass="bg-blue-500" />
                    </div>

                    <h3 className="text-xs uppercase font-bold text-violet-500 ml-1 tracking-wider mb-2">Статистика активности</h3>
                    <div className="grid grid-cols-2 gap-3">
                         <StatCard label="Подписчики" value={stats.stats.subscribers.toLocaleString()} icon={<UsersIcon className="w-5 h-5 text-white" />} colorClass="bg-fuchsia-500" />
                         <StatCard label="Просмотры" value={stats.stats.views.toLocaleString()} icon={<EyeIcon className="w-5 h-5 text-white" />} colorClass="bg-emerald-500" />
                         <StatCard label="Реакции" value={stats.stats.reactions.toLocaleString()} icon={<ThumbsUpIcon className="w-5 h-5 text-white" />} colorClass="bg-amber-500" />
                         <StatCard label="Боты" value={stats.stats.botUsers.toLocaleString()} icon={<BotIcon className="w-5 h-5 text-white" />} colorClass="bg-indigo-500" />
                    </div>
                </div>
            </div>
        );
    };

    const renderBanned = () => (
        <div className="flex flex-col items-center justify-center h-screen p-8 text-center bg-black/90 z-50 fixed inset-0">
            <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                <ShieldIcon className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Доступ ограничен</h2>
            <p className="text-gray-400">Ваш аккаунт был заблокирован администратором за нарушение правил сервиса.</p>
            <div className="mt-8 text-xs text-gray-600">ID: {user?.id}</div>
        </div>
    );

    return (
        <div className="min-h-screen text-white font-sans selection:bg-violet-500/30 overflow-hidden relative">
            {view === 'banned' && renderBanned()}
            
            {view === 'home' && renderHome()}
            {view === 'order' && renderOrderForm()}
            {view === 'payment' && renderPayment()}
            {view === 'success' && renderSuccess()}
            {view === 'history' && renderHistory()}
            {view === 'profile' && renderProfile()}
            {view === 'admin' && renderAdminPanel()}

            {/* Bottom Navigation */}
            {['home', 'history', 'profile', 'admin'].includes(view) && (
                <div className="fixed bottom-0 left-0 right-0 p-4 z-50">
                    <div className="glass-panel rounded-2xl p-1 flex justify-between items-center shadow-2xl backdrop-blur-xl border border-white/10 bg-[#05010a]/80">
                        <button 
                            onClick={() => setView('home')}
                            className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all active:scale-95 ${view === 'home' ? 'bg-white/10 text-white shadow-inner' : 'text-gray-400 hover:text-white'}`}
                        >
                            <HomeIcon className={`w-5 h-5 transition-colors ${view === 'home' ? 'text-accent-cyan' : ''}`} />
                            <span className="text-[10px] font-medium">Главная</span>
                        </button>
                        <button 
                            onClick={() => setView('history')}
                            className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all active:scale-95 ${view === 'history' ? 'bg-white/10 text-white shadow-inner' : 'text-gray-400 hover:text-white'}`}
                        >
                            <HistoryIcon className={`w-5 h-5 transition-colors ${view === 'history' ? 'text-accent-cyan' : ''}`} />
                            <span className="text-[10px] font-medium">История</span>
                        </button>
                         {isAdmin && (
                            <button 
                                onClick={() => setView('admin')}
                                className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all active:scale-95 ${view === 'admin' ? 'bg-white/10 text-white shadow-inner' : 'text-gray-400 hover:text-white'}`}
                            >
                                <ShieldIcon className={`w-5 h-5 transition-colors ${view === 'admin' ? 'text-red-400' : ''}`} />
                                <span className="text-[10px] font-medium">Админ</span>
                            </button>
                        )}
                        <button 
                            onClick={() => setView('profile')}
                            className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all active:scale-95 ${view === 'profile' ? 'bg-white/10 text-white shadow-inner' : 'text-gray-400 hover:text-white'}`}
                        >
                            <div className={`w-5 h-5 rounded-full overflow-hidden border-2 transition-colors ${view === 'profile' ? 'border-accent-cyan' : 'border-transparent'}`}>
                                {user?.photo_url ? (
                                    <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-violet-800 flex items-center justify-center text-[8px] font-bold">
                                        {user?.first_name?.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] font-medium">Профиль</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;