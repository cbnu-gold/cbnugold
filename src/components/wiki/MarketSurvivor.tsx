"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import {
  marketScenarios,
  type MarketScenario,
} from "@/data/wiki/games/market-survivor";

type Phase = "intro" | "game" | "feedback" | "end";

const START_MONEY = 10_000_000;
const ROUND_COUNT = 10;
const OUTCOME_POOL = [-0.5, -0.3, -0.1, 0.1, 0.3, 0.5, 1.0];

interface RoundRecord {
  scenario: MarketScenario;
  choiceIdx: number;
  delta: number;
  before: number;
  after: number;
}

function pickScenarios(): MarketScenario[] {
  const shuffled = [...marketScenarios].sort(() => Math.random() - 0.5);
  return shuffled
    .slice(0, ROUND_COUNT)
    .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
}

function formatCurrency(n: number): string {
  const rounded = Math.round(n);
  return new Intl.NumberFormat("ko-KR").format(rounded);
}

function judgeChoice(scenario: MarketScenario, choiceIdx: number): number {
  if (choiceIdx === scenario.b) {
    return OUTCOME_POOL[4 + Math.floor(Math.random() * 3)];
  }
  const roll = Math.random();
  if (roll < 0.5) return OUTCOME_POOL[Math.floor(Math.random() * 3)];
  return OUTCOME_POOL[3];
}

export function MarketSurvivor() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [list, setList] = useState<MarketScenario[]>([]);
  const [round, setRound] = useState(0);
  const [money, setMoney] = useState(START_MONEY);
  const [history, setHistory] = useState<RoundRecord[]>([]);
  const [feedback, setFeedback] = useState<RoundRecord | null>(null);

  const current = list[round];
  const progress = useMemo(
    () => ((round) / ROUND_COUNT) * 100,
    [round]
  );

  function startGame() {
    setList(pickScenarios());
    setRound(0);
    setMoney(START_MONEY);
    setHistory([]);
    setFeedback(null);
    setPhase("game");
  }

  function choose(idx: number) {
    if (!current) return;
    const delta = judgeChoice(current, idx);
    const before = money;
    const after = Math.max(0, Math.round(before * (1 + delta)));
    const record: RoundRecord = {
      scenario: current,
      choiceIdx: idx,
      delta,
      before,
      after,
    };
    setMoney(after);
    setHistory((h) => [...h, record]);
    setFeedback(record);
    setPhase("feedback");
  }

  function nextRound() {
    setFeedback(null);
    if (round + 1 >= ROUND_COUNT) {
      setPhase("end");
      return;
    }
    setRound((r) => r + 1);
    setPhase("game");
  }

  const totalReturn = ((money - START_MONEY) / START_MONEY) * 100;
  const isGain = money >= START_MONEY;

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* HUD */}
      <div className="border border-ink/12 bg-white">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-ink/10">
          <span className="font-serif italic text-ink/70 text-[11px] sm:text-xs tracking-[0.22em] uppercase">
            Market Survivor
          </span>
          <span className="font-mono tabular-nums text-[11px] text-ink/50 tracking-wider uppercase">
            {phase === "intro"
              ? "Ready"
              : phase === "end"
              ? "Result"
              : `Round ${Math.min(round + 1, ROUND_COUNT)} / ${ROUND_COUNT}`}
          </span>
        </div>

        {/* Progress */}
        <div className="h-px bg-ink/10 relative overflow-hidden">
          <motion.div
            className="h-full bg-ink"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {/* Portfolio */}
        <div className="grid grid-cols-2 divide-x divide-ink/10">
          <div className="px-5 sm:px-6 py-5">
            <dt className="text-[10px] uppercase tracking-[0.18em] text-ink/50 font-medium mb-2">
              Portfolio
            </dt>
            <dd className="font-mono tabular-nums text-2xl sm:text-3xl font-light text-ink">
              ₩{formatCurrency(money)}
            </dd>
          </div>
          <div className="px-5 sm:px-6 py-5">
            <dt className="text-[10px] uppercase tracking-[0.18em] text-ink/50 font-medium mb-2">
              Return
            </dt>
            <dd
              className={`font-mono tabular-nums text-2xl sm:text-3xl font-light ${
                isGain ? "text-ink" : "text-red-700"
              }`}
            >
              {isGain ? "+" : ""}
              {totalReturn.toFixed(1)}%
            </dd>
          </div>
        </div>

        <div className="border-t border-ink/10" />

        {/* Stage */}
        <div className="px-5 sm:px-6 py-7 sm:py-9 min-h-[340px]">
          <AnimatePresence mode="wait">
            {phase === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-start text-left"
              >
                <p className="font-serif italic text-ink/60 text-xs tracking-[0.22em] uppercase mb-5">
                  1929 — 2024 · Invest &amp; Survive
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl font-light text-ink leading-tight tracking-tight mb-5">
                  Are you ready to
                  <br />
                  <span className="italic">survive the markets?</span>
                </h2>
                <p className="text-sm sm:text-base text-ink/70 leading-relaxed mb-8">
                  금융사의 결정적 순간 10개를 마주합니다. 매 라운드마다 3개의 선택지에서 하나를 고르세요.
                  시작 자금은 <span className="font-mono tabular-nums">₩{formatCurrency(START_MONEY)}</span>, 최종 수익률이 당신의 점수입니다.
                </p>
                <Button size="lg" onClick={startGame}>
                  Start · 게임 시작
                </Button>
              </motion.div>
            )}

            {phase === "game" && current && (
              <motion.div
                key={`game-${round}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono tabular-nums text-[11px] text-ink/50 tracking-wider">
                    {current.d}
                  </span>
                  <span className="font-serif italic text-ink/60 text-[11px] tracking-[0.2em] uppercase">
                    Scenario
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-medium text-ink mb-3 leading-snug">
                  {current.t}
                </h3>
                <p className="text-sm sm:text-base text-ink/70 leading-relaxed mb-7">
                  {current.desc}
                </p>
                <div className="grid gap-2.5">
                  {current.o.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => choose(i)}
                      className="group w-full text-left px-5 py-4 border border-ink/15 hover:border-ink hover:bg-ink/[0.04] active:bg-ink/[0.08] transition-all duration-300 min-h-[44px]"
                    >
                      <span className="flex items-center gap-3">
                        <span className="font-mono tabular-nums text-[11px] text-ink/40 group-hover:text-ink/70 tracking-wider">
                          0{i + 1}
                        </span>
                        <span className="text-sm sm:text-[15px] text-ink">
                          {opt}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {phase === "feedback" && feedback && (
              <motion.div
                key={`fb-${round}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono tabular-nums text-[11px] text-ink/50 tracking-wider">
                    {feedback.scenario.d}
                  </span>
                  <span
                    className={`font-mono tabular-nums text-[11px] tracking-wider uppercase ${
                      feedback.delta >= 0 ? "text-ink" : "text-red-700"
                    }`}
                  >
                    {feedback.delta >= 0 ? "Gain" : "Loss"}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-medium text-ink mb-5 leading-snug">
                  {feedback.scenario.t}
                </h3>

                <div className="border border-ink/10 p-4 sm:p-5 mb-5">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-ink/50 mb-2">
                    Your choice
                  </div>
                  <div className="text-sm sm:text-[15px] text-ink mb-4">
                    {feedback.scenario.o[feedback.choiceIdx]}
                  </div>
                  <div className="h-px bg-ink/10 mb-4" />
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-ink/50 mb-1">
                        Result
                      </div>
                      <div
                        className={`font-mono tabular-nums text-2xl sm:text-3xl font-light ${
                          feedback.delta >= 0 ? "text-ink" : "text-red-700"
                        }`}
                      >
                        {feedback.delta >= 0 ? "+" : ""}
                        {(feedback.delta * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-ink/50 mb-1">
                        Portfolio
                      </div>
                      <div className="font-mono tabular-nums text-base sm:text-lg text-ink">
                        ₩{formatCurrency(feedback.after)}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="font-serif italic text-ink/70 text-sm sm:text-[15px] leading-relaxed mb-6">
                  {feedback.scenario.h}
                </p>

                <Button size="md" onClick={nextRound}>
                  {round + 1 >= ROUND_COUNT ? "Final result" : "Next round"}
                </Button>
              </motion.div>
            )}

            {phase === "end" && (
              <motion.div
                key="end"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="font-serif italic text-ink/60 text-xs tracking-[0.22em] uppercase mb-4">
                  Final Report
                </p>
                <h3 className="font-serif text-3xl sm:text-4xl font-light text-ink leading-tight tracking-tight mb-2">
                  {isGain ? (
                    <>
                      You <span className="italic">survived.</span>
                    </>
                  ) : (
                    <>
                      Market <span className="italic">prevailed.</span>
                    </>
                  )}
                </h3>

                <div className="grid grid-cols-2 gap-4 mt-6 mb-7">
                  <div className="border border-ink/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-ink/50 mb-2">
                      Ending NAV
                    </div>
                    <div className="font-mono tabular-nums text-xl sm:text-2xl font-light text-ink">
                      ₩{formatCurrency(money)}
                    </div>
                  </div>
                  <div className="border border-ink/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-ink/50 mb-2">
                      Total return
                    </div>
                    <div
                      className={`font-mono tabular-nums text-xl sm:text-2xl font-light ${
                        isGain ? "text-ink" : "text-red-700"
                      }`}
                    >
                      {isGain ? "+" : ""}
                      {totalReturn.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="border border-ink/10">
                  <div className="px-4 py-3 border-b border-ink/10 text-[11px] uppercase tracking-[0.18em] text-ink/50">
                    Trade log
                  </div>
                  <ul className="divide-y divide-ink/10">
                    {history.map((h, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between px-4 py-3 gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-mono tabular-nums text-[11px] text-ink/50 tracking-wider">
                            {h.scenario.d}
                          </div>
                          <div className="text-sm text-ink truncate">
                            {h.scenario.t}
                          </div>
                        </div>
                        <span
                          className={`font-mono tabular-nums text-sm ${
                            h.delta >= 0 ? "text-ink" : "text-red-700"
                          }`}
                        >
                          {h.delta >= 0 ? "+" : ""}
                          {(h.delta * 100).toFixed(0)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-7">
                  <Button size="lg" onClick={startGame} className="w-full sm:w-auto">
                    Play again
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="font-serif italic text-ink/50 text-xs tracking-wider text-center mt-6">
        Simulation only · 실제 투자 자문이 아닙니다.
      </p>
    </div>
  );
}
