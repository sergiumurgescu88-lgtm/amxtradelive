import { GoogleGenAI, Type } from "@google/genai";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

router.post("/analyze-bot", async (req, res) => {
  const { botData, recentTrades, accountData, marketSentiment } = req.body;

  if (!botData) {
    return res.status(400).json({ error: "Missing bot data" });
  }

  try {
    const prompt = `
      You are SRE-STRATEGIST, a senior algorithmic trading analyst.
      Analyze the performance of this trading bot:
      
      Bot Name: ${botData.name}
      Asset: ${botData.asset}
      Strategy: ${botData.strategyName} - ${botData.strategyDescription}
      
      Performance Metrics:
      - Win Rate: ${botData.winRate}%
      - Profit Factor: ${botData.profitFactor}
      - Total Profit: $${botData.totalProfit}
      - Max Drawdown: ${botData.maxDrawdown}%
      - Current Live P/L: $${botData.livePl}
      
      Account Context:
      - Total Equity: $${accountData.equity}
      - Daily P/L: $${accountData.dailyPnl} (${accountData.dailyPnlPct}%)
      
      Market Context:
      - VIX: ${marketSentiment.vix} (${marketSentiment.label})
      - Market Status: ${marketSentiment.marketStatus}
      
      Recent Trades:
      ${JSON.stringify(recentTrades.slice(0, 5))}
      
      Provide a concise strategic analysis in Romanian.
      Focus on:
      1. Overall efficiency given the current market volatility (VIX).
      2. Specific risk-adjusted recommendations (Lot size, SL/TP adjustments).
      3. A "SRE-STRATEGIC-SCORE" (0-100) based on performance vs risk.
      
      Format the output as a JSON object.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Executive summary in Romanian" },
            efficiency_rating: { type: Type.STRING, description: "Rating from Highly Efficient to High Risk" },
            strategic_recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of actionable steps in Romanian"
            },
            strategic_score: { type: Type.NUMBER, description: "Score from 0 to 100" },
            risk_assessment: { type: Type.STRING, description: "Detailed risk notes" }
          },
          required: ["summary", "efficiency_rating", "strategic_recommendations", "strategic_score", "risk_assessment"]
        }
      }
    });

    const responseText = result.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini");
    }

    res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    res.status(500).json({ error: "Failed to generate analysis", details: error.message });
  }
});

router.post("/fleet-report", async (req, res) => {
  const { bots, account, sentiment, domains } = req.body;

  try {
    const prompt = `
      You are SRE-STRATEGIST, a lead quant strategist.
      Analyze the current state of the Trinity Trading Fleet:
      
      Fleet Composition: ${bots.length} active bots across 4 domains.
      Domains: ${domains.map((d: any) => `${d.name} (${d.niche})`).join(', ')}
      
      Performance:
      - Total Equity: $${account.equity}
      - Daily P/L: $${account.dailyPnl}
      - Market VIX: ${sentiment.vix} (${sentiment.label})
      
      Top Performing Bots:
      ${JSON.stringify(bots.sort((a: any, b: any) => b.totalProfit - a.totalProfit).slice(0, 3))}
      
      Underperforming Bots:
      ${JSON.stringify(bots.sort((a: any, b: any) => a.totalProfit - b.totalProfit).slice(0, 3))}
      
      Provide a "Fleet Strategic Directive" in Romanian.
      Focus on:
      1. Exposure rebalancing between domains.
      2. Systematic risks detected in the current configuration.
      3. A "TRINITY-STABILITY-INDEX" (0-100).
      
      Format the output as a JSON object.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            directive_summary: { type: Type.STRING },
            stability_index: { type: Type.NUMBER },
            domain_allocations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  domain: { type: Type.STRING },
                  recommendation: { type: Type.STRING }
                }
              }
            },
            critical_alerts: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["directive_summary", "stability_index", "domain_allocations", "critical_alerts"]
        }
      }
    });

    const responseText = result.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini");
    }

    res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.error("Gemini Fleet Error:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

export default router;
