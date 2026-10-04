import { useState, useEffect, useRef, useCallback } from 'react';
import { BotData, AccountData, MarketSentiment, RiskOverview, LogEntry, DomainSummary, BotStatus, DomainId, EquityHistoryPoint } from '../types/trading';
import { INITIAL_BOTS, INITIAL_ACCOUNT, INITIAL_MARKET_SENTIMENT, INITIAL_RISK_OVERVIEW, INITIAL_LOGS, INITIAL_DOMAIN_SUMMARIES, generateEquityHistory } from '../data/initialData';

export type ConnectionStatus = 'CONNECTED' | 'RECONNECTING' | 'SIMULATED';

interface WebSocketHookProps {
  onNewToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onTradeSound?: () => void;
  onAlertSound?: () => void;
  onKillSound?: () => void;
}

export function getAccountFromDomain(): string {
  if (typeof window === 'undefined') return 'amteam';
  const hostname = window.location.hostname;
  if (hostname.includes('amx.today')) return 'amx';
  if (hostname.includes('aditrade.online')) return 'aditrade';
  if (hostname.includes('g4trade.online')) return 'g4trade';
  return 'amteam'; // default fallback
}

/**
 * 1. Detectează automat domeniul curent din hostname sau query params
 * (amteam.live, amx.today, aditrade.online, g4trade.online)
 */
export function detectCurrentDomain(): DomainId {
  if (typeof window === 'undefined') return 'amteam.live';
  
  const searchParams = new URLSearchParams(window.location.search);
  const accountParam = searchParams.get('account') as DomainId | null;
  const validDomains: DomainId[] = ['amteam.live', 'amx.today', 'aditrade.online', 'g4trade.online'];
  
  if (accountParam && validDomains.includes(accountParam)) {
    return accountParam;
  }

  const hostname = window.location.hostname.toLowerCase();
  if (hostname.includes('amx.today')) return 'amx.today';
  if (hostname.includes('aditrade.online')) return 'aditrade.online';
  if (hostname.includes('g4trade.online')) return 'g4trade.online';
  if (hostname.includes('amteam.live')) return 'amteam.live';

  return 'amteam.live';
}

/**
 * Helper pentru calcul backoff exponențial: 3s → 6s → 12s → 24s → max 30s
 */
function calculateBackoffDelay(attempt: number): number {
  const base = 3000; // 3 secunde inițial
  const delay = base * Math.pow(2, attempt);
  return Math.min(30000, delay); // maxim 30 secunde
}

export function useWebSocket({ onNewToast, onTradeSound, onAlertSound, onKillSound }: WebSocketHookProps = {}) {
  const currentDomain = useRef<DomainId>(detectCurrentDomain()).current;
  const [status, setStatus] = useState<ConnectionStatus>('RECONNECTING');
  const [retryAttempt, setRetryAttempt] = useState<number>(0);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  const [bots, setBots] = useState<BotData[]>(() => {
    try {
      const saved = localStorage.getItem('am_trinity_bots_settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        return INITIAL_BOTS.map((b) => ({
          ...b,
          settings: parsedSettings[b.id] || b.settings,
        }));
      }
    } catch {
      // Ignoră
    }
    return INITIAL_BOTS;
  });

  const [account, setAccount] = useState<AccountData>(INITIAL_ACCOUNT);
  const [equityHistory, setEquityHistory] = useState<EquityHistoryPoint[]>(() => generateEquityHistory(90));
  const [domains, setDomains] = useState<DomainSummary[]>(INITIAL_DOMAIN_SUMMARIES);
  const [sentiment, setSentiment] = useState<MarketSentiment>(INITIAL_MARKET_SENTIMENT);
  const [risk, setRisk] = useState<RiskOverview>(INITIAL_RISK_OVERVIEW);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Heartbeat refs (Ping la 30s, Pong timeout la 10s)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Failure tracking pentru reconectare
  const failureCountRef = useRef<number>(0);

  // Dispatch custom event pentru UI
  const notifyStatusChange = useCallback((newStatus: ConnectionStatus, retryCount: number, nextDelayMs: number) => {
    setStatus(newStatus);
    setRetryAttempt(retryCount);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ws-status-change', {
          detail: {
            status: newStatus,
            domain: currentDomain,
            retryCount,
            nextDelayMs,
            timestamp: Date.now(),
          },
        })
      );
    }
  }, [currentDomain]);

  // Helper pentru adăugare log în flux
  const addLog = useCallback((botId: string, botName: string, level: LogEntry['level'], message: string, domain: DomainSummary['id']) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const newLog: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: timeStr,
      botId,
      botName,
      level,
      message,
      domain,
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 99)]); // Păstrează ultimele 100 de evenimente
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Curățare timere de heartbeat
  const clearHeartbeatTimers = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }
  }, []);

  // Actualizare setări bot și salvare în localStorage
  const updateBotSettings = useCallback((botId: string, newSettings: BotData['settings']) => {
    setBots((prev) => {
      const updated = prev.map((bot) => (bot.id === botId ? { ...bot, settings: newSettings } : bot));
      try {
        const settingsMap: Record<string, BotData['settings']> = {};
        updated.forEach((b) => {
          settingsMap[b.id] = b.settings;
        });
        localStorage.setItem('am_trinity_bots_settings', JSON.stringify(settingsMap));
      } catch {
        // Ignoră
      }
      return updated;
    });
    if (onNewToast) {
      onNewToast('success', 'Setări Salvate', `Parametrii de risc pentru botul selectat au fost actualizați.`);
    }
  }, [onNewToast]);

  // Schimbare stare bot (PAUSE / RESUME)
  const toggleBotStatus = useCallback((botId: string) => {
    setBots((prev) =>
      prev.map((b) => {
        if (b.id !== botId) return b;
        const newStatus: BotStatus = b.status === 'PAUSED' ? 'SCANNING' : 'PAUSED';
        const msg = newStatus === 'PAUSED'
          ? `Botul [${b.name}] a fost pus pe PAUZĂ prin comandă operator.`
          : `Botul [${b.name}] a fost RELUAT și a început scanarea pieței.`;

        addLog(b.id, b.name, newStatus === 'PAUSED' ? 'WARN' : 'INFO', msg, b.domain);

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'BOT_COMMAND',
            botId: b.id,
            command: newStatus === 'PAUSED' ? 'PAUSE' : 'RESUME',
            domain: b.domain,
          }));
        }

        if (onNewToast) {
          onNewToast(newStatus === 'PAUSED' ? 'warning' : 'info', b.name, msg);
        }

        return { ...b, status: newStatus };
      })
    );
  }, [addLog, onNewToast]);

  // Trimite manual trade prin WS
  const sendManualTrade = useCallback((side: 'BUY' | 'SELL', symbol: string, lot: number, sl?: number, tp?: number) => {
    const payload = {
      type: 'MANUAL_TRADE',
      side,
      symbol,
      lot,
      sl,
      tp,
      account: currentDomain,
      timestamp: Date.now(),
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }

    const matchingDomain = domains.find((d) => d.assets.includes(symbol)) || domains[0];
    const logMsg = `Ordin manual ${side} ${lot} loturi pe ${symbol} plasat la piață. SL: ${sl || 'N/A'}, TP: ${tp || 'N/A'}`;

    addLog('manual-operator', 'Operator Core', 'TRADE', logMsg, matchingDomain.id);

    if (onTradeSound) onTradeSound();
    if (onNewToast) {
      onNewToast('success', 'Ordin Executat', `${side} ${lot} lot(uri) ${symbol} transmis la broker.`);
    }

    setAccount((prev) => ({
      ...prev,
      marginUsed: prev.marginUsed + lot * 800,
      freeMargin: prev.freeMargin - lot * 800,
    }));
  }, [domains, addLog, onTradeSound, onNewToast, currentDomain]);

  // EMERGENCY KILL SWITCH
  const triggerEmergencyKill = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'BOT_COMMAND',
        botId: 'ALL',
        command: 'PAUSE',
        action: 'EMERGENCY_KILL_SWITCH_ACTIVE',
        account: currentDomain,
      }));
    }

    setBots((prev) =>
      prev.map((b) => ({
        ...b,
        status: 'PAUSED',
        livePl: 0,
      }))
    );

    addLog('KILL_SWITCH', 'EMERGENCY CORE', 'ERROR', '!!! EMERGENCY KILL SWITCH ACTIVAT !!! Toate pozițiile deschise au fost lichidate. Toți cei 20 de boți au fost puși pe PAUSED.', currentDomain);

    if (onKillSound) onKillSound();
    if (onNewToast) {
      onNewToast('error', 'EMERGENCY KILL SWITCH ACTIVAT', 'Toate operațiunile algoritmice au fost oprite imediat.');
    }
  }, [addLog, onKillSound, onNewToast, currentDomain]);

  // Inițializare și gestionare conexiune WebSocket cu Reconnection Logic & Heartbeat
  useEffect(() => {
    let isComponentMounted = true;

    // 1. Construire URL WebSocket cu detecție inteligentă de mediu (Sandbox AI Studio vs Local Dev)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const currentPort = window.location.port;

    let host = window.location.host;
    if (isLocalhost) {
      if (currentPort === '3000' || !currentPort) {
        host = 'localhost:3000'; // Sandbox AI Studio
      } else {
        host = 'localhost:8000'; // Dev local cu Python separat (FastAPI)
      }
    }

    const account = getAccountFromDomain();
    const wsUrl = `${protocol}//${host}/ws/feed?account=${account || 'amteam'}`;

    console.log('🔌 Connecting to WebSocket:', wsUrl);

    function connectWebSocket() {
      if (!isComponentMounted) return;

      clearHeartbeatTimers();

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        // ON OPEN
        ws.onopen = () => {
          if (!isComponentMounted) return;
          
          failureCountRef.current = 0;
          notifyStatusChange('CONNECTED', 0, 0);
          // Removed stopSimulation() as it's not needed if we don't start it

          addLog('system', 'WebSocket Core', 'INFO', `Conexiune stabilită cu succes pe ${wsUrl}`, currentDomain);

          if (onNewToast) {
            onNewToast('success', 'WebSocket Conectat', `Flux live sincronizat de pe backend.`);
          }

          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
                pongTimeoutRef.current = setTimeout(() => {
                  if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                  }
                }, 10000);
              } catch { }
            }
          }, 30000);
        };

        // ON MESSAGE
        ws.onmessage = (event) => {
          try {
            // Heartbeat: Orice mesaj primit de la server anulează timeout-ul de pong
            if (pongTimeoutRef.current) {
              clearTimeout(pongTimeoutRef.current);
              pongTimeoutRef.current = null;
            }

            const data = JSON.parse(event.data);
            setIsInitialLoading(false);

            // Răspuns direct la PING
            if (data.type === 'PONG') {
              return;
            }

            if (data.account) setAccount((prev) => ({ ...prev, ...data.account }));
            if (data.equity_history && Array.isArray(data.equity_history)) {
              setEquityHistory(data.equity_history);
            }
            if (data.sentiment) setSentiment((prev) => ({ ...prev, ...data.sentiment }));
            if (data.risk) setRisk((prev) => ({ ...prev, ...data.risk }));
            if (data.execution_logs && Array.isArray(data.execution_logs)) {
              const mappedLogs: LogEntry[] = data.execution_logs.map((l: Record<string, unknown>, idx: number) => ({
                id: (l.id as string) || `log-ws-${Date.now()}-${idx}`,
                timestamp: (l.timestamp as string) || new Date().toTimeString().split(' ')[0],
                botId: (l.bot_id as string) || (l.botId as string) || 'system',
                botName: (l.bot_name as string) || (l.botName as string) || (l.bot_id as string) || 'AM Core',
                level: (l.level as LogEntry['level']) || 'INFO',
                message: (l.message as string) || '',
                domain: (l.domain as DomainSummary['id']) || currentDomain,
              }));

              setLogs((prev) => {
                // Îmbină logurile noi cu cele vechi și elimină duplicatele după ID
                const allLogs = [...mappedLogs, ...prev];
                const uniqueLogsMap = new Map();
                allLogs.forEach(log => {
                  if (!uniqueLogsMap.has(log.id)) {
                    uniqueLogsMap.set(log.id, log);
                  }
                });
                return Array.from(uniqueLogsMap.values()).slice(0, 150);
              });
            }
            if (data.bots && Array.isArray(data.bots)) {
              setBots((prev) =>
                prev.map((b) => {
                  const incoming = data.bots.find((ib: { id: string }) => ib.id === b.id);
                  if (incoming) {
                    return {
                      ...b,
                      status: incoming.status || b.status,
                      adx: incoming.adx ?? b.adx,
                      whaleIntensity: incoming.whale ?? b.whaleIntensity,
                      lotSize: incoming.lot ?? b.lotSize,
                      bias: incoming.bias || b.bias,
                      livePl: incoming.live_pl ?? b.livePl,
                      domain: incoming.domain || b.domain, // Asigură prezența 'domain'
                    };
                  }
                  return b;
                })
              );
            }
          } catch {
            // Ignoră erorile de parsare dacă mesajul este text simplu
          }
        };

        // ON ERROR & ON CLOSE
        const handleDisconnection = () => {
          if (!isComponentMounted) return;
          clearHeartbeatTimers();

          failureCountRef.current += 1;
          const currentFailures = failureCountRef.current;
          const nextDelay = calculateBackoffDelay(currentFailures - 1);

          // 2. Fallback logic: Dacă eșuează de 3 ori, rămâne pe RECONNECTING
          if (currentFailures >= 3) {
            notifyStatusChange('RECONNECTING', currentFailures, nextDelay);
            if (currentFailures === 3) {
              addLog(
                'system',
                'Connection Hub',
                'WARN',
                `WebSocket real eșuat după 3 încercări. Se reîncearcă automat peste ${nextDelay/1000}s.`,
                currentDomain
              );
            }
          } else {
            notifyStatusChange('RECONNECTING', currentFailures, nextDelay);
          }

          // 3. Reconnection cu exponential backoff (3s → 6s → 12s → 24s → max 30s)
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            if (isComponentMounted) {
              connectWebSocket();
            }
          }, nextDelay);
        };

        ws.onerror = handleDisconnection;
        ws.onclose = handleDisconnection;
      } catch (err) {
        if (!isComponentMounted) return;
        failureCountRef.current += 1;
        const currentFailures = failureCountRef.current;
        const nextDelay = calculateBackoffDelay(currentFailures - 1);

        notifyStatusChange('RECONNECTING', currentFailures, nextDelay);

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isComponentMounted) connectWebSocket();
        }, nextDelay);
      }
    }

    // Lansare conexiune inițială
    connectWebSocket();

    return () => {
      isComponentMounted = false;
      clearHeartbeatTimers();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [currentDomain, notifyStatusChange, clearHeartbeatTimers, addLog, onNewToast]);

  return {
    status,
    retryAttempt,
    currentDomain,
    bots,
    account,
    equityHistory,
    domains,
    sentiment,
    risk,
    logs,
    toggleBotStatus,
    updateBotSettings,
    sendManualTrade,
    triggerEmergencyKill,
    addLog,
    clearLogs,
    isInitialLoading,
  };
}
