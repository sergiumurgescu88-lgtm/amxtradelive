import { BotData, AccountData, MarketSentiment, LogEntry, DomainSummary, BotStatus } from '../types/trading';
import { INITIAL_BOTS, INITIAL_ACCOUNT, INITIAL_MARKET_SENTIMENT, INITIAL_DOMAIN_SUMMARIES, INITIAL_LOGS } from '../data/initialData';

export class SimulationEngine {
  private bots: BotData[] = [...INITIAL_BOTS];
  private account: AccountData = { ...INITIAL_ACCOUNT };
  private sentiment: MarketSentiment = { ...INITIAL_MARKET_SENTIMENT };
  private domains: DomainSummary[] = [...INITIAL_DOMAIN_SUMMARIES];
  private logs: LogEntry[] = [...INITIAL_LOGS];
  
  private interval: NodeJS.Timeout | null = null;
  private onUpdate: (data: any) => void;

  constructor(onUpdate: (data: any) => void) {
    this.onUpdate = onUpdate;
  }

  public start() {
    if (this.interval) return;
    
    this.interval = setInterval(() => {
      this.updateSimulation();
      this.onUpdate({
        bots: this.bots,
        account: this.account,
        sentiment: this.sentiment,
        domains: this.domains,
        execution_logs: this.logs.slice(0, 10), // Send only latest logs
      });
    }, 2000);
  }

  private updateSimulation() {
    let livePlSum = 0;

    this.bots = this.bots.map((bot) => {
      if (bot.status === 'PAUSED') return bot;

      let deltaPl = (Math.random() * 60 - 28) * (bot.lotSize / 1.5);
      if (bot.status === 'SCANNING') deltaPl = 0;

      const newLivePl = bot.status === 'ÎN TRADE' ? parseFloat((bot.livePl + deltaPl).toFixed(2)) : 0;
      if (bot.status === 'ÎN TRADE') livePlSum += newLivePl;

      // Random status transitions
      let nextStatus = bot.status;
      const dice = Math.random();
      if (bot.status === 'COOLDOWN' && dice < 0.08) nextStatus = 'SCANNING';
      else if (bot.status === 'SCANNING' && dice < 0.04) {
        nextStatus = 'ÎN TRADE';
        this.addLog(bot.id, bot.name, 'TRADE', `Nou semnal detectat pe ${bot.asset}.`, bot.domain);
      } else if (bot.status === 'ÎN TRADE' && dice < 0.03) {
        nextStatus = 'COOLDOWN';
        this.addLog(bot.id, bot.name, 'INFO', `Închidere automată poziție pe ${bot.asset}.`, bot.domain);
      }

      return {
        ...bot,
        status: nextStatus as BotStatus,
        livePl: newLivePl,
        adx: Math.max(12, Math.min(65, parseFloat((bot.adx + (Math.random() * 1.2 - 0.6)).toFixed(1)))),
        whaleIntensity: Math.max(20, Math.min(100, bot.whaleIntensity + Math.floor(Math.random() * 5 - 2))),
      };
    });

    // Update Account
    this.account = {
      ...this.account,
      equity: parseFloat((this.account.balance + livePlSum).toFixed(2)),
      dailyPnl: parseFloat((this.account.balance + livePlSum - this.account.balance).toFixed(2)),
    };
    this.account.dailyPnlPct = parseFloat(((this.account.dailyPnl / this.account.balance) * 100).toFixed(2));

    // Update Sentiment
    const vixDelta = (Math.random() * 0.4 - 0.2);
    this.sentiment.vix = Math.max(9, Math.min(45, parseFloat((this.sentiment.vix + vixDelta).toFixed(2))));
  }

  private addLog(botId: string, botName: string, level: LogEntry['level'], message: string, domain: DomainSummary['id']) {
    const newLog: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toTimeString().split(' ')[0],
      botId,
      botName,
      level,
      message,
      domain,
    };
    this.logs = [newLog, ...this.logs].slice(0, 100);
  }

  public toggleBot(botId: string) {
    this.bots = this.bots.map(b => {
      if (b.id === botId) {
        const newStatus = b.status === 'PAUSED' ? 'SCANNING' : 'PAUSED';
        return { ...b, status: newStatus as BotStatus };
      }
      return b;
    });
  }

  public triggerKillSwitch() {
    this.bots = this.bots.map(b => ({ ...b, status: 'PAUSED', livePl: 0 }));
  }
}
