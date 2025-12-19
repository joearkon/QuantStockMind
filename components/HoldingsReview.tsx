
import React, { useState, useEffect, useRef } from 'react';
import { ModelProvider, AnalysisResult, UserSettings, MarketType, HoldingsSnapshot, HoldingItemDetailed, JournalEntry, PeriodicReviewData, DailyTradingPlan, PlanItem } from '../types';
import { analyzeWithLLM } from '../services/llmAdapter';
import { parseBrokerageScreenshot, fetchPeriodicReview, extractTradingPlan } from '../services/geminiService';
import { analyzeImageWithExternal } from '../services/externalLlmService';
import { Upload, Loader2, Save, Download, UploadCloud, History, Trash2, Camera, Edit2, Check, X, FileJson, TrendingUp, AlertTriangle, PieChart as PieChartIcon, Activity, Target, ClipboardList, BarChart3, Crosshair, GitCompare, Clock, LineChart as LineChartIcon, Calendar, Trophy, AlertOctagon, CheckCircle2, XCircle, ArrowRightCircle, ListTodo, MoreHorizontal, Square, CheckSquare, FileText, FileSpreadsheet } from 'lucide-react';
import { MARKET_OPTIONS } from '../constants';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, LineChart, Line } from 'recharts';

interface HoldingsReviewProps {
  currentModel: ModelProvider;
  currentMarket: MarketType;
  settings: UserSettings;
  onOpenSettings?: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];
const HORIZON_COLORS = {
  'short': '#f59e0b', // Amber
  'medium': '#3b82f6', // Blue
  'long': '#8b5cf6', // Violet
};

export const HoldingsReview: React.FC<HoldingsReviewProps> = ({
  currentModel,
  currentMarket,
  settings,
  onOpenSettings
}) => {
  // --- State ---
  const [snapshot, setSnapshot] = useState<HoldingsSnapshot>({
    totalAssets: 0,
    positionRatio: 0, // Initialize
    date: new Date().toISOString().split('T')[0],
    holdings: []
  });
  
  const [journal, setJournal] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem('qm_journal');
    return saved ? JSON.parse(saved) : [];
  });

  const [tradingPlans, setTradingPlans] = useState<DailyTradingPlan[]>(() => {
    const saved = localStorage.getItem('qm_trading_plans');
    return saved ? JSON.parse(saved) : [];
  });

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string |